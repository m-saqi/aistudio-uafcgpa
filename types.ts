// src/types.ts

export interface StudentInfo {
  name: string;
  registration: string;
}

export interface Course {
  code: string;
  title: string;
  creditHours: number;
  creditHoursDisplay?: string;
  marks: number;
  qualityPoints: number;
  grade: string;
  teacher?: string;
  
  // Status flags
  isExtraEnrolled: boolean; // True if it's a repeat but not the best attempt
  isRepeated: boolean;      // True if course appears multiple times
  isDeleted: boolean;       // Soft delete for "what-if" scenarios
  isCustom: boolean;        // True if added manually or via Attendance import
  
  // Metadata
  source: 'lms' | 'attendance' | 'manual';
  originalSemester: string; // Crucial for B.Ed filtering
  
  // Detailed breakdown (optional)
  mid?: string;
  assignment?: string;
  final?: string;
  practical?: string;
}

export interface Semester {
  originalName: string;
  sortKey: string;
  courses: Course[];
  
  // Stats
  gpa: number;
  percentage: number;
  totalQualityPoints: number;
  totalCreditHours: number;
  totalMarksObtained: number;
  totalMaxMarks: number;
  
  // Logic flags
  isForecast?: boolean;
  isBedForecast?: boolean; // Specific to B.Ed tab
  hasBedCourses?: boolean;
  hasOtherCourses?: boolean;
}

export interface ProcessedData {
  id: string;
  studentInfo: StudentInfo;
  semesters: Record<string, Semester>;
  courseHistory: Record<string, any[]>; // For debugging/advanced logic
  createdAt: string;
  lastModified: string;
  bedMode: boolean; // User preference
  displayName?: string;
}

export interface RawCourseData {
  CourseCode: string;
  CourseTitle: string;
  CreditHours: string;
  Total: string;
  Grade: string;
  Semester: string;
  TeacherName?: string;
  Mid?: string;
  Assignment?: string;
  Final?: string;
  Practical?: string;
  [key: string]: any;
}

export interface ServerStatus {
  lms: 'online' | 'offline' | 'checking' | 'error';
  ats: 'online' | 'offline' | 'checking' | 'error';
}
