import React, { useState, useEffect, useRef } from 'react';
import { ProcessedData, Semester, Course, ServerStatus, RawCourseData } from '../types';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BED_COURSES } from '../constants';
import { calculateQualityPoints, determineGrade, getSemesterSortKey, filterSemesters, recalculateGPA, processSemesterName } from '../utils/calculator';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const loadingStages = [
  { title: 'Connecting to UAF LMS', sub: 'Establishing secure connection...' },
  { title: 'Fetching Academic Records', sub: 'Retrieving courses and grades...' },
  { title: 'Calculating CGPA', sub: 'Processing quality points & percentages...' },
  { title: 'Finalizing', sub: 'Your result is ready.' }
];

const CalculatorPage: React.FC = () => {
  // --- State ---
  const [agNo, setAgNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [activeTab, setActiveTab] = useState<'fetch' | 'profiles'>('fetch');
  const [profiles, setProfiles] = useState<Record<string, ProcessedData>>({});
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedData | null>(null);
  const [bedMode, setBedMode] = useState(false);
  const [bedTab, setBedTab] = useState<'bed' | 'other'>('bed');
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ lms: 'checking', ats: 'checking' });
  const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);
  const [showChart, setShowChart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Undo State
  const [deletedSemester, setDeletedSemester] = useState<{ name: string, data: Semester } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<number | null>(null);

  // Drag & Drop State
  const [draggedCourse, setDraggedCourse] = useState<{ course: Course, fromSemester: string, index: number } | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Load Profiles with Safety Check
    const saved = localStorage.getItem('uafCalculatorProfiles_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validProfiles: Record<string, ProcessedData> = {};
        Object.entries(parsed).forEach(([key, val]: [string, any]) => {
          if (val && val.studentInfo && val.studentInfo.name) {
            validProfiles[key] = val;
          }
        });
        setProfiles(validProfiles);
      } catch (e) {
        console.error("Failed to parse saved profiles:", e);
      }
    }

    // Check Server Status
    fetch('/api/result-scraper?action=check_status')
      .then(r => r.json())
      .then(d => d.success && setServerStatus({ lms: d.lms_status, ats: d.attnd_status }))
      .catch(() => setServerStatus({ lms: 'error', ats: 'error' }));
  }, []);

  useEffect(() => {
    if (Object.keys(profiles).length > 0) {
      localStorage.setItem('uafCalculatorProfiles_v2', JSON.stringify(profiles));
    }
  }, [profiles]);

  // --- Actions ---
  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(p => [{ msg, type, time: new Date().toLocaleTimeString() }, ...p]);
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agNo) return;
    setLoading(true);
    setLoadingStage(0);
    addLog(`Initiating fetch for ${agNo}...`);

    const stageTimer = setInterval(() => {
        setLoadingStage(prev => (prev < 2 ? prev + 1 : prev));
    }, 1500);

    try {
      const res = await fetch(`/api/result-scraper?action=scrape_single&registrationNumber=${encodeURIComponent(agNo)}`);
      const resData = await res.json();
      
      clearInterval(stageTimer);
      
      if (!resData.success) throw new Error(resData.message);

      setLoadingStage(2); 

      const newSemesters: Record<string, Semester> = {};
      let hasBed = false;

      if (!resData.resultData || resData.resultData.length === 0) {
        throw new Error("No course data found for this registration number.");
      }

      resData.resultData.forEach((item: RawCourseData) => {
        // Use ROBUST parsing logic
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
        
        newSemesters[semName].courses.push({
          code,
          title: item.CourseTitle || code,
          creditHours: ch,
          creditHoursDisplay: item.CreditHours,
          marks,
          qualityPoints: calculateQualityPoints(marks, ch),
          grade: item.Grade || determineGrade(marks, ch),
          isExtraEnrolled: false, isRepeated: false, isDeleted: false, isCustom: false,
          source: 'lms',
          teacher: item.TeacherName,
          originalSemester: semName
        });
      });

      const calculated = recalculateGPA(newSemesters);
      
      const newProfile: ProcessedData = {
        id: `profile_${Date.now()}`,
        studentInfo: { name: resData.resultData[0].StudentName, registration: resData.resultData[0].RegistrationNo },
        semesters: calculated.semesters,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        bedMode: hasBed
      };

      const updatedProfiles = { ...profiles, [newProfile.id]: newProfile };
      setProfiles(updatedProfiles);
      setActiveProfileId(newProfile.id);
      setData(newProfile);
      setBedMode(hasBed);
      
      setLoadingStage(3);
      setTimeout(() => {
          setLoading(false);
          addLog(`Profile created for ${newProfile.studentInfo.name}`, 'success');
          setActiveTab('profiles');
      }, 800);

    } catch (e: any) {
      clearInterval(stageTimer);
      addLog(e.message, 'error');
      setLoading(false);
    }
  };

  const handleFetchAttendance = async () => {
    if (!data || !agNo) {
        addLog("No active profile or missing Ag No.", "error");
        return;
    }
    setLoading(true);
    setLoadingStage(1);
    addLog("Checking Attendance System...");

    // 1. Check Cache (10 minutes expiry)
    const CACHE_KEY = `att_cache_${agNo}`;
    const CACHE_DURATION = 10 * 60 * 1000;
    const cached = localStorage.getItem(CACHE_KEY);
    let resultData = null;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          resultData = parsed.data;
          addLog("Loaded attendance from cache.", "info");
        }
      } catch(e) {}
    }

    try {
        if (!resultData) {
          const res = await fetch(`/api/result-scraper?action=scrape_attendance&registrationNumber=${encodeURIComponent(agNo)}`);
          const resJson = await res.json();
          if (!resJson.success) throw new Error(resJson.message || "Failed to fetch attendance");
          resultData = resJson.resultData;
          // Save to cache
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: resultData }));
          addLog("Fetched fresh attendance data.", "success");
        }

        let addedCount = 0;
        const newSemesters = { ...data.semesters };

        // 2. Robust Merging Logic
        resultData.forEach((item: RawCourseData) => {
            const semName = processSemesterName(item.Semester); // Use standard parsing
            const code = item.CourseCode.trim();
            const marks = parseFloat(item.Total) || 0;
            const grade = item.Grade || determineGrade(marks, 3); // Attendance data might lack grade

            // Check if this EXACT course exists (Code + Marks + Grade)
            // If the code exists but marks/grade are different, it's likely a repeat/improvement -> Add it!
            const alreadyExists = Object.values(newSemesters).some(sem => 
                sem.courses.some(c => 
                    c.code === code && 
                    Math.abs(c.marks - marks) < 0.1 && // Float comparison
                    c.grade === grade
                )
            );
            
            if (!alreadyExists) {
                if (!newSemesters[semName]) {
                    newSemesters[semName] = {
                        originalName: item.Semester,
                        sortKey: getSemesterSortKey(semName),
                        courses: [],
                        gpa: 0, percentage: 0, totalQualityPoints: 0, totalCreditHours: 0, totalMarksObtained: 0, totalMaxMarks: 0
                    };
                }

                const ch = 3; // Attendance usually doesn't show CH, default to 3
                
                newSemesters[semName].courses.push({
                    code,
                    title: item.CourseTitle || code,
                    creditHours: ch,
                    creditHoursDisplay: "3(3-0)*",
                    marks,
                    qualityPoints: calculateQualityPoints(marks, ch),
                    grade: grade,
                    isExtraEnrolled: false, isRepeated: false, isDeleted: false, isCustom: false,
                    source: 'attendance',
                    originalSemester: semName
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            const calculated = recalculateGPA(newSemesters);
            updateData({ ...data, semesters: calculated.semesters });
            addLog(`Merged ${addedCount} courses from Attendance System.`, "success");
        } else {
            addLog("No new unique courses found in Attendance system.", "info");
        }

    } catch (e: any) {
        addLog(e.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!data || !data.studentInfo) return;
    const doc = new jsPDF();
    
    // Modern Header
    doc.setFillColor(122, 106, 216);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Academic Transcript", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("University of Agriculture Faisalabad (Unofficial)", 105, 30, { align: "center" });
    
    // Student Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 55, 182, 35, 3, 3, 'FD');
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text("Student Name:", 20, 68);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentInfo.name, 60, 68);
    
    doc.setFont("helvetica", "normal");
    doc.text("Registration No:", 20, 78);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentInfo.registration, 60, 78);
    
    const stats = bedMode ? recalculateGPA(filterSemesters(data.semesters, bedTab === 'bed')) : recalculateGPA(data.semesters);
    
    // Stats in Box
    doc.setFont("helvetica", "normal");
    doc.text("CGPA:", 120, 68);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(122, 106, 216); // Brand Color
    doc.setFontSize(14);
    doc.text(stats.overall.cgpa.toFixed(4), 150, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text("Percentage:", 120, 78);
    doc.setFont("helvetica", "bold");
    doc.text(`${stats.overall.pct.toFixed(2)}%`, 150, 78);

    let finalY = 100;

    const semestersToPrint = bedMode ? filterSemesters(data.semesters, bedTab === 'bed') : data.semesters;
    const sortedKeys = Object.keys(semestersToPrint).sort((a,b) => semestersToPrint[a].sortKey.localeCompare(semestersToPrint[b].sortKey));

    for(const key of sortedKeys) {
        if (finalY > 260) { doc.addPage(); finalY = 20; }
        
        const sem = semestersToPrint[key];
        
        // Semester Header
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(220, 220, 220);
        doc.rect(14, finalY, 182, 10, 'FD');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(70, 70, 70);
        doc.text(key.toUpperCase(), 18, finalY + 7);
        
        doc.setFont("helvetica", "normal");
        doc.text(`GPA: ${sem.gpa.toFixed(3)}`, 170, finalY + 7, { align: "right" });
        
        const body = sem.courses.map(c => [
            c.code,
            c.title.substring(0, 35),
            c.creditHours.toString(),
            c.marks.toFixed(0),
            c.grade,
            c.qualityPoints.toFixed(2),
            c.isRepeated ? 'Repeat' : (c.source === 'attendance' ? 'Manual' : '')
        ]);

        (doc as any).autoTable({
            startY: finalY + 12,
            head: [['Code', 'Course Title', 'CH', 'Marks', 'Grd', 'QP', 'Status']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [122, 106, 216], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3, textColor: 80 },
            columnStyles: { 
              0: { fontStyle: 'bold', cellWidth: 25 },
              1: { cellWidth: 'auto' },
              2: { halign: 'center' },
              3: { halign: 'center' },
              4: { halign: 'center' },
              6: { fontSize: 7, textColor: 150 }
            },
            alternateRowStyles: { fillColor: [250, 250, 255] }
        });

        finalY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated by UAF CGPA Calculator (M Saqlain) - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`UAF_Result_${data.studentInfo.registration}.pdf`);
    addLog("PDF Transcript downloaded successfully.", "success");
  };

  const exportProfiles = () => {
    const blob = new Blob([JSON.stringify(profiles)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uaf_profiles_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addLog("Profiles exported to file.", "success");
  }

  const importProfiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target?.result as string);
            setProfiles(prev => ({ ...prev, ...parsed }));
            addLog("Profiles imported successfully.", "success");
        } catch (err) {
            addLog("Failed to parse profile file.", "error");
        }
    };
    reader.readAsText(file);
  }

  const deleteProfile = (id: string) => {
    const newP = { ...profiles };
    delete newP[id];
    setProfiles(newP);
    if (activeProfileId === id) {
      setData(null);
      setActiveProfileId(null);
      setAgNo('');
    }
    addLog('Profile deleted.', 'info');
  };

  const loadProfile = (id: string) => {
    if (profiles[id]) {
      // Robust check before loading
      if (!profiles[id].studentInfo) {
          addLog("Error: Invalid profile data found. Please delete and fetch again.", "error");
          return;
      }
      setData(profiles[id]);
      setActiveProfileId(id);
      setBedMode(profiles[id].bedMode || false);
      setAgNo(profiles[id].studentInfo.registration || '');
      addLog(`Loaded profile: ${profiles[id].studentInfo.name}`, 'success');
    }
  };

  const updateData = (newData: ProcessedData) => {
    newData.lastModified = new Date().toISOString();
    setData(newData);
    setProfiles({ ...profiles, [newData.id]: newData });
  };

  const deleteSemester = (semName: string) => {
    if (!data) return;
    const sem = data.semesters[semName];
    setDeletedSemester({ name: semName, data: JSON.parse(JSON.stringify(sem)) });
    
    const newSemesters = { ...data.semesters };
    delete newSemesters[semName];
    const recalc = recalculateGPA(newSemesters);
    updateData({ ...data, semesters: recalc.semesters });

    if (undoTimeout) clearTimeout(undoTimeout);
    setUndoTimeout(window.setTimeout(() => setDeletedSemester(null), 5000));
  };

  const restoreSemester = () => {
    if (!data || !deletedSemester) return;
    const newSemesters = { ...data.semesters, [deletedSemester.name]: deletedSemester.data };
    const recalc = recalculateGPA(newSemesters);
    updateData({ ...data, semesters: recalc.semesters });
    setDeletedSemester(null);
    if (undoTimeout) clearTimeout(undoTimeout);
  };

  const toggleCourseStatus = (semName: string, courseIdx: number, type: 'delete' | 'restore') => {
    if (!data) return;
    const newSemesters = { ...data.semesters };
    newSemesters[semName].courses[courseIdx].isDeleted = type === 'delete';
    const recalc = recalculateGPA(newSemesters);
    updateData({ ...data, semesters: recalc.semesters });
  };

  const addForecast = () => {
    if (!data) return;
    let count = 1;
    while (data.semesters[`Forecast ${count}`]) count++;
    const name = `Forecast ${count}`;
    
    const newSem = {
      originalName: name,
      sortKey: `9999-${count.toString().padStart(2, '0')}`,
      courses: [],
      gpa: 0, percentage: 0, totalQualityPoints: 0, totalCreditHours: 0, totalMarksObtained: 0, totalMaxMarks: 0,
      isForecast: true,
      isBedForecast: bedMode && bedTab === 'bed'
    };

    updateData({ ...data, semesters: { ...data.semesters, [name]: newSem } });
    addLog(`Added ${name}`, 'success');
  };

  const addCustomCourse = (semName: string) => {
    if (!data) return;
    const code = prompt("Enter Course Code (e.g. CS-101):");
    if (!code) return;
    const marksStr = prompt("Enter Marks Obtained:");
    const marks = parseFloat(marksStr || '0');
    const chStr = prompt("Enter Credit Hours (1-10):", "3");
    const ch = parseInt(chStr || '3');

    const newCourse: Course = {
      code: code.toUpperCase(),
      title: 'Custom Course',
      creditHours: ch,
      marks,
      qualityPoints: calculateQualityPoints(marks, ch),
      grade: determineGrade(marks, ch),
      isExtraEnrolled: false, isRepeated: false, isDeleted: false, isCustom: true, source: 'manual',
      originalSemester: semName
    };

    const newSemesters = { ...data.semesters };
    newSemesters[semName].courses.push(newCourse);
    const recalc = recalculateGPA(newSemesters);
    updateData({ ...data, semesters: recalc.semesters });
  };

  const onDragStart = (e: React.DragEvent, course: Course, semName: string, idx: number) => {
    setDraggedCourse({ course, fromSemester: semName, index: idx });
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e: React.DragEvent, toSemester: string) => {
    e.preventDefault();
    if (!draggedCourse || !data) return;
    if (draggedCourse.fromSemester === toSemester) return;

    const newSemesters = { ...data.semesters };
    newSemesters[draggedCourse.fromSemester].courses.splice(draggedCourse.index, 1);
    newSemesters[toSemester].courses.push(draggedCourse.course);
    
    const recalc = recalculateGPA(newSemesters);
    updateData({ ...data, semesters: recalc.semesters });
    setDraggedCourse(null);
    addLog(`Moved ${draggedCourse.course.code} to ${toSemester}`, 'info');
  };

  // --- Sub-Components ---
  const renderStats = (displayData: Record<string, Semester>) => {
    const { overall } = recalculateGPA(displayData);
    const sortedKeys = Object.keys(displayData).sort((a,b) => displayData[a].sortKey.localeCompare(displayData[b].sortKey));
    const gpaTrend = sortedKeys.map(k => displayData[k].gpa);

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1 bg-gradient-to-br from-[#7a6ad8] to-[#6b5fca] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl group border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <p className="text-white/80 font-bold uppercase tracking-wider text-xs mb-1">CGPA</p>
            <h3 className="text-6xl font-black mb-4 tracking-tighter">{overall.cgpa.toFixed(4)}</h3>
            <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-white/90 shadow-[0_0_10px_white]" style={{ width: `${(overall.cgpa / 4) * 100}%` }}></div>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[
              { label: 'Percentage', val: `${overall.pct.toFixed(2)}%`, icon: 'fa-percent' },
              { label: 'Total Marks', val: `${overall.marks.toFixed(0)} / ${overall.max}`, icon: 'fa-graduation-cap' },
              { label: 'Credit Hours', val: overall.ch, icon: 'fa-clock' },
              { label: 'Quality Points', val: overall.qp.toFixed(2), icon: 'fa-star' },
            ].map((s, i) => (
              <div key={i} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 rounded-2xl shadow-sm border border-white/50 dark:border-gray-700 flex items-center justify-between transition-colors">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">{s.label}</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{s.val}</p>
                </div>
                <i className={`fas ${s.icon} text-2xl text-[#7a6ad8] opacity-20 dark:opacity-40`}></i>
              </div>
            ))}
            
            {/* Analytics Toggle Card */}
            <button 
              onClick={() => setShowChart(!showChart)} 
              className={`col-span-2 md:col-span-2 p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold text-sm ${showChart ? 'bg-[#7a6ad8] text-white border-[#7a6ad8]' : 'bg-white/50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700'}`}
            >
              <i className={`fas fa-chart-line ${showChart ? 'text-white' : 'text-[#7a6ad8]'}`}></i>
              {showChart ? 'Hide Analytics' : 'View Performance Trend'}
            </button>
          </div>
        </div>

        {/* Chart Section */}
        {showChart && (
            <div className="mb-8 p-6 glass rounded-[2rem] border border-white/40 dark:border-gray-700 h-80 relative animate-in zoom-in">
                <Chart 
                  type='line'
                  data={{
                    labels: sortedKeys,
                    datasets: [{
                      label: 'Semester GPA',
                      data: gpaTrend,
                      borderColor: '#7a6ad8',
                      backgroundColor: 'rgba(122, 106, 216, 0.1)',
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: '#fff',
                      pointBorderColor: '#7a6ad8',
                      pointRadius: 4
                    }]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, cornerRadius: 8 }
                    },
                    scales: { 
                        y: { 
                            min: 0, 
                            max: 4, 
                            grid: { color: 'rgba(128,128,128,0.1)' },
                            ticks: { color: 'gray' }
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { color: 'gray' }
                        }
                    }
                  }}
                />
            </div>
        )}
      </>
    );
  };

  const renderSemesters = (displayData: Record<string, Semester>) => {
    return (
      <div className="semester-grid">
        {Object.entries(displayData)
          .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
          .map(([name, sem]) => (
            <div 
              key={name} 
              className="glass rounded-2xl p-5 border border-white/40 dark:border-gray-700 shadow-lg relative group transition-all hover:bg-white/40 dark:hover:bg-gray-800/80"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, name)}
            >
              <div className="flex justify-between items-start mb-4 border-b border-slate-200 dark:border-gray-700 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-[#7a6ad8] rounded-full"></span>
                    {name}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">GPA: <span className="text-[#7a6ad8] font-bold">{sem.gpa.toFixed(3)}</span></p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => addCustomCourse(name)} className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 flex items-center justify-center text-xs" title="Add Course"><i className="fas fa-plus"></i></button>
                  <button onClick={() => deleteSemester(name)} className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center text-xs" title="Delete Semester"><i className="fas fa-trash"></i></button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-2 py-2 rounded-l">Subject</th>
                      <th className="px-1 py-2 text-center">CH</th>
                      <th className="px-1 py-2 text-center">Mrk</th>
                      <th className="px-2 py-2 text-right rounded-r">Grd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {sem.courses.map((c, idx) => (
                      <tr 
                        key={idx} 
                        draggable={!c.isDeleted}
                        onDragStart={(e) => onDragStart(e, c, name, idx)}
                        className={`group/row transition-colors ${c.isDeleted ? 'bg-red-50 dark:bg-red-900/20 opacity-50' : 'hover:bg-slate-50 dark:hover:bg-gray-700/30 cursor-move'}`}
                      >
                        <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-200 relative">
                          {c.code}
                          {c.isCustom && <span className="text-[8px] ml-1 text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 px-1 rounded">Cust</span>}
                          {c.isRepeated && <span className="text-[8px] ml-1 text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 px-1 rounded">Rep</span>}
                          {c.source === 'attendance' && <span className="text-[8px] ml-1 text-purple-500 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded">Att</span>}
                          
                          <div className="absolute left-0 top-0 h-full w-full bg-white/95 dark:bg-gray-800/95 hidden group-hover/row:flex items-center justify-center gap-2 rounded transition-opacity">
                             {c.isDeleted ? (
                               <button onClick={() => toggleCourseStatus(name, idx, 'restore')} className="text-green-600 dark:text-green-400 font-bold hover:underline text-[10px]"><i className="fas fa-undo"></i> Restore</button>
                             ) : (
                               <button onClick={() => toggleCourseStatus(name, idx, 'delete')} className="text-red-600 dark:text-red-400 font-bold hover:underline text-[10px]"><i className="fas fa-times"></i> Delete</button>
                             )}
                          </div>
                        </td>
                        <td className="px-1 py-2 text-center text-slate-500 dark:text-slate-400">{c.creditHours}</td>
                        <td className="px-1 py-2 text-center text-slate-500 dark:text-slate-400">{c.marks.toFixed(0)}</td>
                        <td className="px-2 py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${c.grade === 'F' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-[#7a6ad8]/10 text-[#7a6ad8] dark:bg-[#7a6ad8]/20 dark:text-[#9f8feb]'}`}>
                            {c.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>
    );
  };

  const visibleSemesters = data 
    ? (bedMode ? filterSemesters(data.semesters, bedTab === 'bed') : data.semesters) 
    : {};

  const statsData = bedMode && data 
    ? filterSemesters(data.semesters, bedTab === 'bed') 
    : (data ? data.semesters : {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 min-h-screen">
      
      {/* Toast Undo */}
      {deletedSemester && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom">
          <span>Deleted {deletedSemester.name}</span>
          <button onClick={restoreSemester} className="bg-[#7a6ad8] text-xs font-bold px-3 py-1 rounded-full hover:bg-white hover:text-[#7a6ad8] transition-colors">UNDO</button>
        </div>
      )}

      {/* Header Status Bar */}
      <div className="flex justify-center mb-10">
        <div className="glass px-6 py-2 rounded-full flex items-center gap-6 shadow-xl border border-white/20 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus.lms === 'online' ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-500'}`}></span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300">LMS: {serverStatus.lms.toUpperCase()}</span>
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus.ats === 'online' ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-500'}`}></span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300">ATS: {serverStatus.ats.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass rounded-[3rem] p-6 md:p-12 shadow-2xl border border-white/40 dark:border-gray-700 relative overflow-hidden min-h-[600px] transition-colors duration-300">
        {/* Top Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-100 dark:bg-gray-800 p-1.5 rounded-full flex shadow-inner border dark:border-gray-700">
            <button 
              onClick={() => setActiveTab('fetch')}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'fetch' ? 'bg-white dark:bg-gray-700 shadow text-[#7a6ad8] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Search Result
            </button>
            <button 
              onClick={() => setActiveTab('profiles')}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'profiles' ? 'bg-white dark:bg-gray-700 shadow text-[#7a6ad8] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              My Profiles
            </button>
          </div>
        </div>

        {/* Tab Content: Fetch */}
        {activeTab === 'fetch' && !data && !loading && (
          <div className="max-w-xl mx-auto py-12 text-center animate-in fade-in">
            <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">Fetch Records</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Connect securely to UAF LMS to retrieve your academic history.</p>
            <form onSubmit={handleFetch} className="relative mb-8">
              <div className="relative flex items-center">
                <i className="fas fa-id-card absolute left-5 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="2020-ag-1234"
                  className="w-full bg-white dark:bg-gray-900 border-2 border-transparent focus:border-[#7a6ad8] dark:focus:border-[#7a6ad8] rounded-2xl py-4 pl-12 pr-4 shadow-xl outline-none font-bold text-lg text-slate-800 dark:text-white transition-all dark:placeholder-gray-500"
                  value={agNo}
                  onChange={e => setAgNo(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="absolute right-2 bg-[#7a6ad8] hover:bg-[#6b5fca] text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg"
                >
                  Fetch
                </button>
              </div>
            </form>
            <p className="text-xs text-slate-400"><i className="fas fa-shield-alt mr-1"></i> Your data is processed locally.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                <div className="pulsar w-20 h-20 relative mb-8">
                    <div className="ring"></div>
                    <div className="absolute inset-0 m-auto w-3 h-3 bg-[#7a6ad8] rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{loadingStages[loadingStage]?.title || 'Processing'}</h3>
                <p className="text-slate-500 dark:text-slate-400">{loadingStages[loadingStage]?.sub || 'Please wait...'}</p>
            </div>
        )}

        {/* Tab Content: Profiles */}
        {activeTab === 'profiles' && !data && !loading && (
          <div className="max-w-2xl mx-auto py-8 animate-in fade-in">
            <h2 className="text-2xl font-black mb-6 text-center text-slate-800 dark:text-white">Saved Profiles</h2>
            
            <div className="flex justify-center gap-3 mb-8">
                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors text-slate-700 dark:text-slate-200">
                    <i className="fas fa-file-import me-2"></i> Import
                </button>
                <button onClick={exportProfiles} className="bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors text-slate-700 dark:text-slate-200">
                    <i className="fas fa-file-export me-2"></i> Export
                </button>
                <input type="file" ref={fileInputRef} onChange={importProfiles} className="hidden" accept=".json" />
            </div>

            <div className="space-y-3">
              {Object.keys(profiles).length === 0 ? (
                <p className="text-center text-slate-400 italic py-10">No profiles saved yet. Fetch a result to save it automatically.</p>
              ) : (
                Object.values(profiles).map(p => {
                  // Safety check for corrupted profiles
                  if (!p || !p.studentInfo) return null;
                  
                  return (
                  <div key={p.id} className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 flex items-center justify-between group hover:shadow-lg transition-all hover:bg-white dark:hover:bg-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7a6ad8] to-[#ff6b6b] flex items-center justify-center text-white font-bold text-sm">
                        {p.studentInfo.name ? p.studentInfo.name[0] : '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{p.studentInfo.name || 'Unknown Student'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.studentInfo.registration || 'No Reg No'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadProfile(p.id)} className="px-4 py-2 rounded-xl bg-[#7a6ad8]/10 text-[#7a6ad8] font-bold text-xs hover:bg-[#7a6ad8] hover:text-white transition-colors">Load</button>
                      <button onClick={() => deleteProfile(p.id)} className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        )}

        {/* Result View */}
        {data && !loading && (
          <div className="animate-in slide-in-from-bottom duration-500">
            {/* Nav Back */}
            <button onClick={() => setData(null)} className="mb-6 text-xs font-bold text-slate-400 hover:text-[#7a6ad8] flex items-center gap-1">
              <i className="fas fa-arrow-left"></i> Back to Search
            </button>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">{data.studentInfo ? data.studentInfo.name : 'Unknown'}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-mono tracking-wide">{data.studentInfo ? data.studentInfo.registration : ''}</p>
              </div>
              
              {bedMode && (
                <div className="mt-4 md:mt-0 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl flex">
                  <button 
                    onClick={() => setBedTab('bed')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${bedTab === 'bed' ? 'bg-white dark:bg-gray-700 shadow text-[#7a6ad8] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    B.Ed Program
                  </button>
                  <button 
                    onClick={() => setBedTab('other')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${bedTab === 'other' ? 'bg-white dark:bg-gray-700 shadow text-[#7a6ad8] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    Other
                  </button>
                </div>
              )}
            </div>

            {/* Stats Dashboard */}
            {renderStats(statsData)}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button onClick={addForecast} className="px-5 py-2.5 bg-slate-800 dark:bg-gray-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2 border border-slate-700">
                <i className="fas fa-magic"></i> Forecast Semester
              </button>
              <button onClick={generatePDF} className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2">
                <i className="fas fa-file-pdf"></i> Download PDF
              </button>
              <button onClick={handleFetchAttendance} className="px-5 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold text-xs hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center gap-2">
                <i className="fas fa-sync"></i> Attendance Import
              </button>
            </div>

            {/* Semester Grid */}
            {renderSemesters(visibleSemesters)}

          </div>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="mt-12 max-w-3xl mx-auto glass rounded-2xl p-4 border border-white/20 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-gray-700">
            <span className="text-xs font-bold text-slate-400 uppercase">System Log</span>
            <button onClick={() => setLogs([])} className="text-xs text-red-400 hover:text-red-500">Clear</button>
          </div>
          <div className="h-32 overflow-y-auto space-y-1 font-mono text-[10px]">
            {logs.map((l, i) => (
              <div key={i} className={`flex gap-2 ${l.type === 'error' ? 'text-red-500' : l.type === 'success' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="opacity-50">[{l.time}]</span> {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CalculatorPage;
