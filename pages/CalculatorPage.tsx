import React, { useState, useEffect, useRef } from 'react';
import { ProcessedData, Semester, Course, ServerStatus, RawCourseData } from '../types';
import { BED_COURSES } from '../constants';
import { calculateQualityPoints, determineGrade, getSemesterSortKey, filterSemesters, recalculateGPA, processSemesterName } from '../utils/calculator';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CalculatorPage: React.FC = () => {
  // --- State ---
  const [agNo, setAgNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'fetch' | 'profiles'>('fetch');
  const [profiles, setProfiles] = useState<Record<string, ProcessedData>>({});
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedData | null>(null);
  const [bedTab, setBedTab] = useState<'bed' | 'other'>('bed');
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ lms: 'checking', ats: 'checking' });
  const [logs, setLogs] = useState<string[]>([]);
  const [showChart, setShowChart] = useState(false);
  
  // Drag & Drop
  const [draggedCourse, setDraggedCourse] = useState<{from: string, idx: number, course: Course} | null>(null);

  // --- Helpers ---
  const addLog = (msg: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  // --- Effects ---
  useEffect(() => {
    // Load Profiles
    const saved = localStorage.getItem('uafCalculatorProfiles_v2');
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) { console.error("Profile load error", e); }
    }
    // Check Status
    fetch('/api/result-scraper?action=check_status')
      .then(r => r.json())
      .then(d => setServerStatus({ lms: d.lms_status, ats: d.attnd_status }))
      .catch(() => setServerStatus({ lms: 'error', ats: 'error' }));
  }, []);

  useEffect(() => {
    if (Object.keys(profiles).length > 0) {
      localStorage.setItem('uafCalculatorProfiles_v2', JSON.stringify(profiles));
    }
  }, [profiles]);

  // --- Core Logic: Fetch LMS ---
  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agNo) return;
    setLoading(true);
    addLog(`Fetching results for ${agNo}...`);

    try {
      const res = await fetch(`/api/result-scraper?action=scrape_single&registrationNumber=${encodeURIComponent(agNo)}`);
      const json = await res.json();
      
      if (!json.success || !json.resultData) throw new Error(json.message || "Fetch failed");

      // Process Data
      const newSemesters: Record<string, Semester> = {};
      let hasBed = false;

      json.resultData.forEach((item: RawCourseData) => {
        const semName = processSemesterName(item.Semester);
        if (!newSemesters[semName]) {
          newSemesters[semName] = {
            originalName: item.Semester,
            sortKey: getSemesterSortKey(semName),
            courses: [],
            gpa: 0, percentage: 0, totalQualityPoints: 0, totalCreditHours: 0, totalMarksObtained: 0, totalMaxMarks: 0
          };
        }

        const code = item.CourseCode.trim();
        if (BED_COURSES.has(code)) hasBed = true;

        const ch = parseInt(item.CreditHours.match(/(\d+)/)?.[1] || '0');
        const marks = parseFloat(item.Total) || 0;
        const qp = calculateQualityPoints(marks, ch, item.Grade); // Use robust QP logic

        newSemesters[semName].courses.push({
          code,
          title: item.CourseTitle || code,
          creditHours: ch,
          creditHoursDisplay: item.CreditHours,
          marks,
          qualityPoints: qp,
          grade: item.Grade,
          isExtraEnrolled: false, isRepeated: false, isDeleted: false, isCustom: false,
          source: 'lms',
          originalSemester: semName
        });
      });

      const calculated = recalculateGPA(newSemesters);
      
      const newProfile: ProcessedData = {
        id: `profile_${Date.now()}`,
        studentInfo: { name: json.resultData[0].StudentName, registration: json.resultData[0].RegistrationNo },
        semesters: calculated.semesters,
        courseHistory: {}, 
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        bedMode: hasBed
      };

      const updated = { ...profiles, [newProfile.id]: newProfile };
      setProfiles(updated);
      setData(newProfile);
      setActiveProfileId(newProfile.id);
      setActiveTab('profiles');
      addLog("Fetch successful.");

    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Core Logic: Fetch Attendance (With Deduplication & Caching) ---
  const handleFetchAttendance = async () => {
    if (!data) return;
    setLoading(true);
    addLog("Checking Attendance System...");

    // 1. Cache Check
    const cacheKey = `att_cache_${data.studentInfo.registration}`;
    const cached = localStorage.getItem(cacheKey);
    let resultData = null;

    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < 10 * 60 * 1000) { // 10 min cache
        resultData = parsed.data;
        addLog("Using cached attendance data.");
      }
    }

    try {
      if (!resultData) {
        const res = await fetch(`/api/result-scraper?action=scrape_attendance&registrationNumber=${encodeURIComponent(data.studentInfo.registration)}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        resultData = json.resultData;
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: resultData }));
      }

      // 2. Global LMS Map for Deduplication
      const existingMap = new Set<string>();
      Object.values(data.semesters).forEach(s => {
        s.courses.forEach(c => {
           if (!c.isDeleted) existingMap.add(`${c.code}|${c.marks}`); // Unique Key: Code + Marks
        });
      });

      let added = 0;
      const newSemesters = { ...data.semesters };

      resultData.forEach((item: any) => {
         const code = item.CourseCode.trim();
         const marks = parseFloat(item.Totalmark || item.Total); // Attendance API varies
         const uniqueKey = `${code}|${marks}`;

         if (existingMap.has(uniqueKey)) return; // Skip duplicates

         const semName = processSemesterName(item.Semester);
         if (!newSemesters[semName]) {
             newSemesters[semName] = {
                 originalName: item.Semester,
                 sortKey: getSemesterSortKey(semName),
                 courses: [],
                 gpa: 0, percentage: 0, totalQualityPoints: 0, totalCreditHours: 0, totalMarksObtained: 0, totalMaxMarks: 0
             };
         }

         const ch = 3; // Default for attendance
         const qp = calculateQualityPoints(marks, ch); // Calculate QP based on marks
         const grade = determineGrade(marks, ch);

         newSemesters[semName].courses.push({
             code,
             title: item.CourseName || code,
             creditHours: ch,
             creditHoursDisplay: "3(3-0)*",
             marks,
             qualityPoints: qp,
             grade,
             isExtraEnrolled: false, isRepeated: false, isDeleted: false, isCustom: true,
             source: 'attendance',
             originalSemester: semName
         });
         added++;
      });

      if (added > 0) {
          const recalc = recalculateGPA(newSemesters);
          updateProfile({ ...data, semesters: recalc.semesters });
          addLog(`Imported ${added} new courses from Attendance.`);
      } else {
          addLog("No new courses found in Attendance.");
      }

    } catch (e: any) {
        addLog(`Attendance Error: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  const updateProfile = (newData: ProcessedData) => {
    newData.lastModified = new Date().toISOString();
    setData(newData);
    setProfiles({ ...profiles, [newData.id]: newData });
  };

  // --- Display Logic ---
  const displayData = data ? (data.bedMode ? filterSemesters(data.semesters, bedTab === 'bed') : data.semesters) : {};
  const stats = recalculateGPA(displayData);

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, from: string, idx: number, course: Course) => {
      setDraggedCourse({ from, idx, course });
  };

  const handleDrop = (e: React.DragEvent, toSemester: string) => {
      e.preventDefault();
      if (!draggedCourse || !data) return;
      if (draggedCourse.from === toSemester) return;

      const newSemesters = { ...data.semesters };
      newSemesters[draggedCourse.from].courses.splice(draggedCourse.idx, 1);
      newSemesters[toSemester].courses.push(draggedCourse.course);

      const recalc = recalculateGPA(newSemesters);
      updateProfile({ ...data, semesters: recalc.semesters });
      setDraggedCourse(null);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-white pb-20 font-sans transition-colors duration-300">
      
      {/* Navbar / Header would go here */}

      <div className="max-w-7xl mx-auto px-4 pt-10">
        
        {/* Server Status */}
        <div className="flex justify-center mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full px-6 py-2 shadow border border-slate-200 dark:border-gray-700 flex gap-6 text-xs font-bold">
                <span className={`flex items-center gap-2 ${serverStatus.lms === 'online' ? 'text-green-600' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${serverStatus.lms === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span> LMS
                </span>
                <span className={`flex items-center gap-2 ${serverStatus.ats === 'online' ? 'text-green-600' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${serverStatus.ats === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span> ATS
                </span>
            </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-700 p-6 md:p-10 min-h-[600px]">
          
          {/* Tabs */}
          {!data && (
            <div className="flex justify-center mb-12">
               <div className="bg-slate-100 dark:bg-gray-900 p-1 rounded-full flex">
                   <button onClick={() => setActiveTab('fetch')} className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'fetch' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Search</button>
                   <button onClick={() => setActiveTab('profiles')} className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'profiles' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Profiles</button>
               </div>
            </div>
          )}

          {/* FETCH FORM */}
          {activeTab === 'fetch' && !data && (
             <div className="max-w-md mx-auto text-center py-10">
                 <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">UAF CGPA</h1>
                 <p className="text-slate-500 mb-8">Enter your Registration Number to fetch results.</p>
                 <form onSubmit={handleFetch} className="relative">
                     <input 
                       value={agNo} onChange={e => setAgNo(e.target.value)}
                       placeholder="2020-ag-1234" 
                       className="w-full bg-slate-100 dark:bg-gray-900 border-none rounded-2xl py-4 pl-6 pr-32 font-mono text-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                     />
                     <button disabled={loading} className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50">
                        {loading ? '...' : 'Fetch'}
                     </button>
                 </form>
             </div>
          )}

          {/* PROFILE LIST */}
          {activeTab === 'profiles' && !data && (
            <div className="max-w-2xl mx-auto space-y-4">
                {Object.values(profiles).map(p => (
                    <div key={p.id} onClick={() => { setData(p); setActiveProfileId(p.id); }} className="cursor-pointer group bg-white dark:bg-gray-900 p-4 rounded-2xl border border-transparent hover:border-indigo-500 transition-all flex justify-between items-center shadow-sm">
                        <div>
                            <h3 className="font-bold text-lg">{p.studentInfo.name}</h3>
                            <p className="text-xs text-slate-500 font-mono">{p.studentInfo.registration}</p>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-indigo-600">{calculateCGPA(p.semesters).overall.cgpa.toFixed(4)}</div>
                             <div className="text-[10px] text-slate-400">CGPA</div>
                        </div>
                    </div>
                ))}
                {Object.keys(profiles).length === 0 && <p className="text-center text-slate-400">No profiles found.</p>}
            </div>
          )}

          {/* RESULT VIEW */}
          {data && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header Actions */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <button onClick={() => setData(null)} className="text-xs font-bold text-slate-400 hover:text-indigo-500 mb-2">← Back</button>
                        <h2 className="text-3xl font-black">{data.studentInfo.name}</h2>
                        <p className="font-mono text-slate-500">{data.studentInfo.registration}</p>
                    </div>
                    {data.bedMode && (
                        <div className="bg-slate-100 dark:bg-gray-900 p-1 rounded-lg flex text-xs font-bold">
                            <button onClick={() => setBedTab('bed')} className={`px-4 py-1.5 rounded-md ${bedTab === 'bed' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-slate-500'}`}>B.Ed</button>
                            <button onClick={() => setBedTab('other')} className={`px-4 py-1.5 rounded-md ${bedTab === 'other' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-slate-500'}`}>Other</button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-500/30">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">CGPA</p>
                        <h3 className="text-5xl font-black tracking-tighter">{stats.overall.cgpa.toFixed(4)}</h3>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Percentage</p>
                        <h3 className="text-2xl font-bold">{stats.overall.percentage.toFixed(2)}%</h3>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700">
                         <p className="text-slate-400 text-xs font-bold uppercase mb-1">Credit Hours</p>
                         <h3 className="text-2xl font-bold">{stats.overall.totalCreditHours}</h3>
                    </div>
                     <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 flex flex-col justify-center gap-2">
                         <button onClick={handleFetchAttendance} className="w-full py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors">
                             Sync Attendance
                         </button>
                         {/* PDF Button placeholder */}
                         <button className="w-full py-2 bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">
                             Download PDF
                         </button>
                    </div>
                </div>

                {/* Semesters Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(displayData).sort((a,b) => a[1].sortKey.localeCompare(b[1].sortKey)).map(([name, sem]) => (
                        <div 
                          key={name}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleDrop(e, name)}
                          className="bg-white/50 dark:bg-gray-900/50 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 hover:border-indigo-300 transition-all"
                        >
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-gray-800">
                                <h4 className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>{name}</h4>
                                <span className="text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded">GPA: {sem.gpa.toFixed(3)}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-slate-400 uppercase">
                                            <th className="pb-2">Course</th>
                                            <th className="pb-2 text-center">CH</th>
                                            <th className="pb-2 text-center">Mrk</th>
                                            <th className="pb-2 text-right">Grd</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium">
                                        {sem.courses.map((c, idx) => (
                                            <tr 
                                              key={idx}
                                              draggable={!c.isDeleted}
                                              onDragStart={e => handleDragStart(e, name, idx, c)}
                                              className={`border-b border-slate-50 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors cursor-move ${c.isDeleted ? 'opacity-40 line-through' : ''}`}
                                            >
                                                <td className="py-2 pr-2">
                                                    {c.code}
                                                    {c.isRepeated && <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1 rounded">Rep</span>}
                                                    {c.source === 'attendance' && <span className="ml-1 text-[9px] bg-purple-100 text-purple-600 px-1 rounded">Att</span>}
                                                </td>
                                                <td className="py-2 text-center text-slate-500">{c.creditHours}</td>
                                                <td className="py-2 text-center text-slate-500">{c.marks}</td>
                                                <td className="py-2 text-right"><span className={`px-1.5 rounded ${c.grade === 'F' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{c.grade}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

             </div>
          )}

        </div>
        
        {/* Logs */}
        {logs.length > 0 && (
            <div className="mt-8 max-w-2xl mx-auto text-[10px] font-mono text-slate-400 bg-black/5 p-4 rounded-xl h-32 overflow-y-auto">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        )}

      </div>
    </div>
  );
};

export default CalculatorPage;
