import { Course, Semester, ProcessedData } from '../types';
import { BED_COURSES } from '../constants';

// --- Grading Logic ---
export const calculateQualityPoints = (marks: number, ch: number, grade?: string): number => {
  // Handle Pass/Fail
  const g = (grade || '').toUpperCase().trim();
  if (g === 'F') return 0;
  if (g === 'P') return ch * 4.0; 

  // Standard UAF Formula Logic
  const maxMarks = ch * 20; 
  if (maxMarks === 0) return 0;
  
  // Cap marks at max (e.g. if teacher gave bonus marks)
  const adjustedMarks = marks > maxMarks ? maxMarks : marks;

  const percentage = (adjustedMarks / maxMarks) * 100;
  
  if (percentage >= 80) return ch * 4.00;
  if (percentage < 40) return 0;

  // Linear Interpolation: 40% = 1.0 GPA, 80% = 4.0 GPA
  // Formula: GPA = 1 + (Percentage - 40) * (3 / 40)
  let gpa = 1 + (percentage - 40) * (3 / 40);
  if (gpa > 4.0) gpa = 4.0;
  
  return Number((gpa * ch).toFixed(2));
};

export const determineGrade = (marks: number, ch: number): string => {
  const maxMarks = ch * 20;
  if (maxMarks === 0) return 'F';
  const p = (marks / maxMarks) * 100;
  
  if (p >= 80) return 'A';
  if (p >= 65) return 'B'; // UAF typically uses B for 65+
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
};

// --- ROBUST Semester Parsing (Ported from Original) ---
export const processSemesterName = (semester: string): string => {
  if (!semester) return 'Unknown Semester';
  const lower = semester.toLowerCase().trim();

  // Handle "Winter 2020-2021" -> "Winter 2020"
  const yearRangeMatch = lower.match(/(\d{4})-(\d{2,4})/);
  const singleYearMatch = lower.match(/\b(\d{4})\b/);

  let season = '';
  let year = '';

  if (lower.includes('spring')) season = 'Spring';
  else if (lower.includes('winter')) season = 'Winter';
  else if (lower.includes('summer')) season = 'Summer';
  else if (lower.includes('fall')) season = 'Fall';
  else season = 'Unknown';

  // Extract Year
  if (yearRangeMatch) {
    // Usually the first year is the identifier for Winter/Fall, second for Spring
    // But UAF standardizes often on the "Start" of the academic year or the calendar year
    // Original logic:
    if (season === 'Spring') year = `20${yearRangeMatch[2].slice(-2)}`; // 20-21 -> 2021
    else year = yearRangeMatch[1];
  } else if (singleYearMatch) {
    year = singleYearMatch[1];
  } else {
    // Fallback for "Winter20" style
    const shortMatch = lower.match(/(winter|spring|summer|fall)(\d{2})/);
    if (shortMatch) {
        year = `20${shortMatch[2]}`;
    }
  }

  if (season !== 'Unknown' && year) {
      return `${season} ${year}`;
  }
  
  // Fallback: Capitalize first letter
  return semester.charAt(0).toUpperCase() + semester.slice(1);
};

export const getSemesterSortKey = (semesterName: string): string => {
  const lower = semesterName.toLowerCase();
  
  // Forecasts go last
  if (lower.startsWith('forecast')) {
    const num = parseInt(lower.split(' ')[1] || '1');
    return `9999-${num.toString().padStart(2, '0')}`;
  }

  const yearMatch = lower.match(/\b(\d{4})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 0;
  
  let seasonOrder = 9;
  // Academic Year Ordering: Winter -> Spring -> Summer -> Fall (Calendar wise)
  if (lower.includes('winter')) seasonOrder = 1;
  else if (lower.includes('spring')) seasonOrder = 2;
  else if (lower.includes('summer')) seasonOrder = 3;
  else if (lower.includes('fall')) seasonOrder = 4;

  return `${year}-${seasonOrder}`;
};

// --- Filter Semesters (B.Ed Logic) ---
export const filterSemesters = (semesters: Record<string, Semester>, includeBed: boolean): Record<string, Semester> => {
  const filtered: Record<string, Semester> = {};

  Object.entries(semesters).forEach(([name, sem]) => {
    // Filter courses inside the semester
    const relevantCourses = sem.courses.filter(c => {
      const isBed = BED_COURSES.has(c.code.toUpperCase().trim());
      return includeBed ? isBed : !isBed;
    });

    const isRelevantForecast = includeBed ? sem.isBedForecast : (sem.isForecast && !sem.isBedForecast);

    // Only add semester if it has relevant courses OR is a relevant forecast
    if (relevantCourses.length > 0 || isRelevantForecast) {
      filtered[name] = {
        ...sem,
        courses: relevantCourses,
        // Recalculate basic stats for this subset (visual only, real recalc happens in recalculateGPA)
        totalCreditHours: relevantCourses.reduce((sum, c) => sum + (c.isDeleted ? 0 : c.creditHours), 0)
      };
    }
  });

  return filtered;
};

// --- Recalculate Totals (The Core Engine) ---
export const recalculateGPA = (semesters: Record<string, Semester>): { 
  semesters: Record<string, Semester>, 
  overall: { cgpa: number, pct: number, qp: number, ch: number, marks: number, max: number } 
} => {
  let grandQP = 0, grandCH = 0, grandMarks = 0, grandMax = 0;
  
  // 1. Flatten History to find Repeats
  const history: Record<string, { marks: number, semName: string, idx: number, grade: string }[]> = {};

  Object.entries(semesters).forEach(([semName, sem]) => {
    sem.courses.forEach((c, idx) => {
      if (c.isDeleted) return; // Skip deleted
      const code = c.code.toUpperCase().trim();
      if (!history[code]) history[code] = [];
      history[code].push({ marks: c.marks, semName, idx, grade: c.grade || '' });
    });
  });

  // 2. Determine Best Attempts
  Object.values(history).forEach(attempts => {
    if (attempts.length > 1) {
      // Sort by marks descending. 
      // Important: If grade is 'F', marks might be high but it's failed. 
      // However, usually we want the highest marks regardless, or the passed one.
      // Standard logic: Highest marks is the 'Best Attempt'.
      attempts.sort((a, b) => b.marks - a.marks); 
      
      attempts.forEach((att, i) => {
        const sem = semesters[att.semName];
        const course = sem.courses[att.idx];
        course.isRepeated = true;
        // The first one (index 0) is best. Others are Extra.
        course.isExtraEnrolled = i > 0; 
      });
    } else if (attempts.length === 1) {
       const sem = semesters[attempts[0].semName];
       const course = sem.courses[attempts[0].idx];
       course.isRepeated = false;
       course.isExtraEnrolled = false;
    }
  });

  // 3. Calculate Stats
  Object.values(semesters).forEach(sem => {
    let sQP = 0, sCH = 0, sMarks = 0, sMax = 0;
    sem.courses.forEach(c => {
      // Logic: If Deleted -> Ignore. If ExtraEnrolled -> Ignore for GPA.
      if (!c.isDeleted && !c.isExtraEnrolled) {
        sQP += c.qualityPoints;
        sCH += c.creditHours;
        sMarks += c.marks;
        // Standard Max Marks: 20 marks per Credit Hour (e.g. 3CH = 60)
        sMax += c.creditHours * 20; 
      }
    });
    
    sem.gpa = sCH > 0 ? sQP / sCH : 0;
    sem.percentage = sMax > 0 ? (sMarks / sMax) * 100 : 0;
    sem.totalQualityPoints = sQP;
    sem.totalCreditHours = sCH;
    sem.totalMarksObtained = sMarks;
    sem.totalMaxMarks = sMax;

    grandQP += sQP;
    grandCH += sCH;
    grandMarks += sMarks;
    grandMax += sMax;
  });

  return {
    semesters,
    overall: {
      cgpa: grandCH > 0 ? grandQP / grandCH : 0,
      pct: grandMax > 0 ? (grandMarks / grandMax) * 100 : 0,
      qp: grandQP,
      ch: grandCH,
      marks: grandMarks,
      max: grandMax
    }
  };
};
