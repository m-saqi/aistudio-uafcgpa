// src/utils/calculator.ts
import { Course, Semester } from '../types';
import { BED_COURSES } from '../constants';

// --- 1. Official UAF Grading Table (Ported exactly from your HTML) ---
export const calculateQualityPoints = (marks: number, ch: number, grade?: string): number => {
  // Handle P/F or specific grades
  const g = (grade || '').trim().toUpperCase();
  if (g === 'P') return ch * 4.0;
  if (g === 'F') return 0;

  let qp = 0;

  // Exact logic from your working HTML
  if (ch === 10) {
      if (marks >= 160) qp = 40;
      else if (marks >= 100) qp = 40 - ((160 - marks) * 0.33333);
      else if (marks < 100) qp = 20 - ((100 - marks) * 0.5);
      if (marks < 80) qp = 0;
  } else if (ch === 9) {
      if (marks >= 144) qp = 36;
      else if (marks >= 90) qp = 36 - ((144 - marks) * 0.33333);
      else if (marks < 90) qp = 18 - ((90 - marks) * 0.5);
      if (marks < 72) qp = 0;
  } else if (ch === 8) {
      if (marks >= 128) qp = 32;
      else if (marks >= 80) qp = 32 - ((128 - marks) * 0.33333);
      else if (marks < 80) qp = 16 - ((80 - marks) * 0.5);
      if (marks < 64) qp = 0;
  } else if (ch === 7) {
      if (marks >= 112) qp = 28;
      else if (marks >= 70) qp = 28 - ((112 - marks) * 0.33333);
      else if (marks < 70) qp = 14 - ((70 - marks) * 0.5);
      if (marks < 56) qp = 0;
  } else if (ch === 6) {
      if (marks >= 96) qp = 24;
      else if (marks >= 60) qp = 24 - ((96 - marks) * 0.33333);
      else if (marks < 60) qp = 12 - ((60 - marks) * 0.5);
      if (marks < 48) qp = 0;
  } else if (ch === 5) {
      if (marks >= 80) qp = 20;
      else if (marks >= 50) qp = 20 - ((80 - marks) * 0.33333);
      else if (marks < 50) qp = 10 - ((50 - marks) * 0.5);
      if (marks < 40) qp = 0;
  } else if (ch === 4) {
      if (marks >= 64) qp = 16;
      else if (marks >= 40) qp = 16 - ((64 - marks) * 0.33333);
      else if (marks < 40) qp = 8 - ((40 - marks) * 0.5);
      if (marks < 32) qp = 0;
  } else if (ch === 3) {
      if (marks >= 48) qp = 12;
      else if (marks >= 30) qp = 12 - ((48 - marks) * 0.33333);
      else if (marks < 30) qp = 6 - ((30 - marks) * 0.5);
      if (marks < 24) qp = 0;
  } else if (ch === 2) {
      if (marks >= 32) qp = 8;
      else if (marks >= 20) qp = 8 - ((32 - marks) * 0.33333);
      else if (marks < 20) qp = 4 - ((20 - marks) * 0.5);
      if (marks < 16) qp = 0;
  } else if (ch === 1) {
      if (marks >= 16) qp = 4;
      else if (marks >= 10) qp = 4 - ((16 - marks) * 0.33333);
      else if (marks < 10) qp = 2 - ((10 - marks) * 0.5);
      if (marks < 8) qp = 0;
  }

  return parseFloat(Math.max(0, qp).toFixed(2));
};

export const determineGrade = (marks: number, ch: number): string => {
  // Simple fallback grade logic if API doesn't provide it
  const max = ch * 20;
  if (max === 0) return 'F';
  const pct = (marks / max) * 100;
  if (pct >= 80) return 'A';
  if (pct >= 65) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

// --- 2. Robust Semester Parsing (Ported from HTML) ---
export const processSemesterName = (semester: string): string => {
  if (!semester) return 'Unknown Semester';
  const lower = semester.toLowerCase().trim();

  // Regex for "2020-2021" or "Winter 2020"
  const yearRangeMatch = lower.match(/(\d{4})-(\d{2,4})/);
  const singleYearMatch = lower.match(/\b(\d{4})\b/);

  let season = 'Unknown';
  let year = '';

  if (lower.includes('spring')) season = 'Spring';
  else if (lower.includes('winter')) season = 'Winter';
  else if (lower.includes('summer')) season = 'Summer';
  else if (lower.includes('fall')) season = 'Fall';

  if (season !== 'Unknown') {
     if (yearRangeMatch) {
         // Logic: Winter 2020-2021 -> Winter 2020. Spring 2020-2021 -> Spring 2021
         if (season === 'Spring') year = `20${yearRangeMatch[2].slice(-2)}`;
         else year = yearRangeMatch[1];
     } else if (singleYearMatch) {
         year = singleYearMatch[1];
     }
  }

  // Fallback for "Winter20" style from Attendance System
  if (season === 'Unknown' || !year) {
      const shortMatch = lower.match(/^(winter|spring|summer|fall)(\d{2})$/);
      if (shortMatch) {
          season = shortMatch[1].charAt(0).toUpperCase() + shortMatch[1].slice(1);
          year = `20${shortMatch[2]}`;
      }
  }

  if (season !== 'Unknown' && year) return `${season} ${year}`;
  return semester.charAt(0).toUpperCase() + semester.slice(1);
};

export const getSemesterSortKey = (semesterName: string): string => {
  const lower = semesterName.toLowerCase();
  
  if (lower.startsWith('forecast')) {
    const num = parseInt(lower.split(' ')[1] || '1');
    return `3000-${num.toString().padStart(2, '0')}`;
  }

  const yearMatch = lower.match(/\b(\d{4})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 0;
  
  // Academic Order: Winter -> Spring -> Summer -> Fall
  let seasonOrder = 9;
  let academicYear = year;

  if (lower.includes('winter')) { seasonOrder = 1; }
  else if (lower.includes('spring')) { seasonOrder = 2; academicYear = year - 1; }
  else if (lower.includes('summer')) { seasonOrder = 3; academicYear = year - 1; }
  else if (lower.includes('fall')) { seasonOrder = 4; }

  return `${academicYear}-${seasonOrder}`;
};

// --- 3. B.Ed Filter Logic ---
export const filterSemesters = (semesters: Record<string, Semester>, includeBed: boolean): Record<string, Semester> => {
  const filtered: Record<string, Semester> = {};

  Object.entries(semesters).forEach(([name, sem]) => {
    // 1. Identify which courses belong in this view
    const relevantCourses = sem.courses.filter(c => {
      const isBed = BED_COURSES.has(c.code.toUpperCase().trim());
      return includeBed ? isBed : !isBed;
    });

    // 2. Determine if this semester container should show up
    // It shows if it has relevant courses OR if it's a Forecast explicitly made for this view
    const isRelevantForecast = includeBed ? sem.isBedForecast : (sem.isForecast && !sem.isBedForecast);
    const hasRelevance = relevantCourses.length > 0;

    if (hasRelevance || isRelevantForecast) {
      // Create a shallow copy with filtered courses for display stats
      filtered[name] = {
        ...sem,
        courses: relevantCourses
        // Note: We don't recalc GPA here, the main recalculateGPA function handles that based on the filtered courses passed to it
      };
    }
  });

  return filtered;
};

// --- 4. The Calculation Engine ---
export const recalculateGPA = (semesters: Record<string, Semester>) => {
  let grandQP = 0, grandCH = 0, grandMarks = 0, grandMax = 0;
  
  // Flatten to find repeats globally (across all semesters in this subset)
  const history: Record<string, { marks: number, semName: string, idx: number, grade: string }[]> = {};

  Object.entries(semesters).forEach(([semName, sem]) => {
    sem.courses.forEach((c, idx) => {
      if (c.isDeleted) return;
      const code = c.code.toUpperCase().trim();
      if (!history[code]) history[code] = [];
      history[code].push({ marks: c.marks, semName, idx, grade: c.grade || '' });
    });
  });

  // Mark best attempts
  Object.values(history).forEach(attempts => {
    if (attempts.length > 1) {
      // Sort: Highest marks first.
      attempts.sort((a, b) => b.marks - a.marks);
      attempts.forEach((att, i) => {
        const sem = semesters[att.semName];
        if(sem && sem.courses[att.idx]) {
            sem.courses[att.idx].isRepeated = true;
            sem.courses[att.idx].isExtraEnrolled = i > 0; // Index 0 is best, others are extra
        }
      });
    } else if (attempts.length === 1) {
       const sem = semesters[attempts[0].semName];
       if(sem) {
           sem.courses[attempts[0].idx].isRepeated = false;
           sem.courses[attempts[0].idx].isExtraEnrolled = false;
       }
    }
  });

  // Calculate Stats
  Object.values(semesters).forEach(sem => {
    let sQP = 0, sCH = 0, sMarks = 0, sMax = 0;
    
    sem.courses.forEach(c => {
      if (!c.isDeleted && !c.isExtraEnrolled) {
        sQP += c.qualityPoints;
        sCH += c.creditHours;
        sMarks += c.marks;
        
        // Calculate Max Marks for Percentage
        let max = 0;
        if ((c.grade || '').toUpperCase() === 'P') {
            max = c.creditHours === 1 ? 100 : c.marks; // 1CH P usually 100 max
        } else {
            // Standard map: 3CH->60, 4CH->80, etc. (20 * CH)
            max = c.creditHours * 20; 
        }
        sMax += max;
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
      percentage: grandMax > 0 ? (grandMarks / grandMax) * 100 : 0,
      totalQualityPoints: grandQP,
      totalCreditHours: grandCH,
      totalMarksObtained: grandMarks,
      totalMaxMarks: grandMax
    }
  };
};
