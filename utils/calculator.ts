
import { Course, Semester, ProcessedData } from '../types';
import { BED_COURSES } from '../constants';

// --- Grading Logic ---
export const calculateQualityPoints = (marks: number, ch: number, grade?: string): number => {
  if (grade === 'F') return 0;
  if (grade === 'P') return ch * 4.0; // Pass usually doesn't affect GPA but for display we might need logic

  // Approximation based on standard UAF scale logic (Marks / Max * CH * 4 roughly)
  // Or the "Rule of Thumb" step logic
  const maxMarks = ch * 20; 
  if (maxMarks === 0) return 0;
  
  if (marks > maxMarks) marks = maxMarks; // Cap at max

  const percentage = (marks / maxMarks) * 100;
  
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
  const p = (marks / maxMarks) * 100;
  if (p >= 80) return 'A';
  if (p >= 65) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
};

// --- Semester Sorting ---
export const getSemesterSortKey = (semesterName: string): string => {
  const lower = semesterName.toLowerCase();
  if (lower.startsWith('forecast')) {
    const num = parseInt(lower.split(' ')[1] || '1');
    return `3000-${num.toString().padStart(2, '0')}`;
  }

  const yearMatch = lower.match(/\b(\d{4})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 9999;
  
  let seasonOrder = 9;
  if (lower.includes('winter')) seasonOrder = 1;
  else if (lower.includes('spring')) seasonOrder = 2;
  else if (lower.includes('summer')) seasonOrder = 3;
  else if (lower.includes('fall')) seasonOrder = 4;

  // Adjust year for Spring/Summer which are part of academic year starting prev year
  // but UAF usually lists them by calendar year. Simple YYYY-Order works best.
  return `${year}-${seasonOrder}`;
};

// --- B.Ed Filter ---
export const filterSemesters = (semesters: Record<string, Semester>, includeBed: boolean): Record<string, Semester> => {
  const filtered: Record<string, Semester> = {};

  Object.entries(semesters).forEach(([name, sem]) => {
    // Check if this semester has relevant courses
    const relevantCourses = sem.courses.filter(c => {
      const isBed = BED_COURSES.has(c.code.toUpperCase().trim());
      return includeBed ? isBed : !isBed;
    });

    // Also include if it's a forecast semester specifically for this type
    const isRelevantForecast = includeBed ? sem.isBedForecast : (sem.isForecast && !sem.isBedForecast);

    if (relevantCourses.length > 0 || isRelevantForecast) {
      // Deep copy semester but replace courses with filtered list
      filtered[name] = {
        ...sem,
        courses: relevantCourses
      };
    }
  });

  return filtered;
};

// --- Recalculate Totals ---
export const recalculateGPA = (semesters: Record<string, Semester>): { 
  semesters: Record<string, Semester>, 
  overall: { cgpa: number, pct: number, qp: number, ch: number, marks: number, max: number } 
} => {
  let grandQP = 0, grandCH = 0, grandMarks = 0, grandMax = 0;
  
  // Track repeats globally
  const history: Record<string, { marks: number, semName: string, idx: number }[]> = {};

  // 1. Build History
  Object.entries(semesters).forEach(([semName, sem]) => {
    sem.courses.forEach((c, idx) => {
      if (c.isDeleted) return;
      if (!history[c.code]) history[c.code] = [];
      history[c.code].push({ marks: c.marks, semName, idx });
    });
  });

  // 2. Mark Repeats
  Object.values(history).forEach(attempts => {
    if (attempts.length > 1) {
      attempts.sort((a, b) => b.marks - a.marks); // Best marks first
      attempts.forEach((att, i) => {
        const sem = semesters[att.semName];
        const course = sem.courses[att.idx];
        course.isRepeated = true;
        course.isExtraEnrolled = i > 0; // Only first (best) is NOT extra
      });
    } else if (attempts.length === 1) {
       const sem = semesters[attempts[0].semName];
       const course = sem.courses[attempts[0].idx];
       course.isRepeated = false;
       course.isExtraEnrolled = false;
    }
  });

  // 3. Calculate Semester & Overall Stats
  Object.values(semesters).forEach(sem => {
    let sQP = 0, sCH = 0, sMarks = 0, sMax = 0;
    sem.courses.forEach(c => {
      if (!c.isDeleted && !c.isExtraEnrolled) {
        sQP += c.qualityPoints;
        sCH += c.creditHours;
        sMarks += c.marks;
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
