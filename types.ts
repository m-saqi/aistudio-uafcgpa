
export interface Course {
  code: string;
  title: string;
  creditHours: number;
  creditHoursDisplay?: string;
  marks: number;
  qualityPoints: number;
  grade: string;
  teacher?: string;
  isExtraEnrolled: boolean;
  isRepeated: boolean;
  isDeleted: boolean;
  isCustom: boolean;
  source?: 'lms' | 'attendance' | 'manual';
  originalSemester?: string;
  // Breakdown
  mid?: string;
  assignment?: string;
  final?: string;
  practical?: string;
}

export interface Semester {
  originalName: string;
  sortKey: string;
  courses: Course[];
  gpa: number;
  percentage: number;
  totalQualityPoints: number;
  totalCreditHours: number;
  totalMarksObtained: number;
  totalMaxMarks: number;
  isForecast?: boolean;
  isBedForecast?: boolean;
  hasBedCourses?: boolean;
  hasOtherCourses?: boolean;
}

export interface StudentInfo {
  name: string;
  registration: string;
}

export interface ProcessedData {
  id: string; // Unique ID for profile
  studentInfo: StudentInfo;
  semesters: Record<string, Semester>;
  displayName?: string;
  createdAt?: string;
  lastModified?: string;
  bedMode?: boolean;
}

export interface ServerStatus {
  lms: 'online' | 'offline' | 'error' | 'checking';
  ats: 'online' | 'offline' | 'error' | 'checking';
}

export interface RawCourseData {
  StudentName: string;
  RegistrationNo: string;
  Semester: string;
  CourseCode: string;
  CourseTitle: string;
  CreditHours: string;
  Total: string;
  Grade: string;
  TeacherName?: string;
  Mid?: string;
  Assignment?: string;
  Final?: string;
  Practical?: string;
}
