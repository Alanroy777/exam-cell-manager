export type Programme = 'B.Tech' | 'Diploma' | 'MCA' | 'BCA';

export type Semester = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';

export interface Student {
  id: string;
  rollNo: string;             // e.g. "1" or "S5 CS A 01"
  registerNo?: string;         // e.g. "PJR25CS002"
  name: string;               // e.g. "ABHINAV P"
  programme: Programme;       // 'B.Tech', 'Diploma', 'MCA', 'BCA'
  branch: string;             // e.g. "CS", "EC", "EEE", "AU", "CT"
  semester: string;           // e.g. "S1", "S3", "S5"
  batch?: string;             // e.g. "A", "B", or undefined
  status: 'active' | 'dropped';
  groupId: string;            // Standard group key, e.g. "S3 CS A", "S5 EC", "MCA S3", "BCA S3"
}

export type FurnitureType = 'bench_desk' | 'desk_chair' | 'writing_pad_chair' | 'mixed';

export interface Hall {
  id: string;
  name: string;               // e.g. "D101", "B206", "B207", "D102", "D103"
  department: string;         // e.g. "CS", "EC", "Diploma", "General"
  furnitureType?: FurnitureType; // 'bench_desk' | 'desk_chair' | 'writing_pad_chair' | 'mixed'
  studentsPerBench?: 2 | 3;   // 2 (standard default) or 3 (larger 3-seater benches)
  threeSeaterBenchCount?: number; // count of 3-seater benches when partially mixed
  columnCount?: number;       // 2, 3, or 4 columns (default 4)
  rowCount?: number;          // number of rows per column (default 5)
  benchCount: number;         // number of benches (e.g. 20, 15, 8)
  textpadChairCount?: number; // number of writing pad / textpad chairs (e.g. 2 in last row)
  deskCount: number;          // number of desks
  chairCount: number;         // number of chairs
  capacity: number;           // hard max 40 (per KTU rules)
  isAvailable: boolean;       // available for exam session
  priorityOrder?: number;
}

export type BenchColumn = 'A' | 'B' | 'C' | 'D';
export type BenchPosition = 'left' | 'middle' | 'right';

export interface SeatAssignment {
  seatNumber: number;         // 1 to 40
  benchNo: number;            // 1 to 10
  column: BenchColumn;        // A, B, C, D
  position: BenchPosition;    // left, right
  seatType?: 'bench' | 'desk_chair' | 'writing_pad'; // type of seat: 2-seater bench, desk with 2 chairs, or single textpad chair
  studentId: string | null;
  student?: Student;
}

export interface HallSeatingPlan {
  hallId: string;
  hallName: string;
  capacity: number;
  columnCount?: number;
  seats: SeatAssignment[];
  groupsPresent: string[];
  totalStudents: number;
}

export interface RuleViolation {
  code: 'MAX_CAPACITY' | 'SAME_GROUP_ADJACENT' | 'SAME_SEM_BRANCH_ADJACENT' | 'UNEVEN_SPLIT' | 'HALL_UNAVAILABLE';
  severity: 'error' | 'warning';
  hallId: string;
  hallName: string;
  message: string;
  seatNumbers?: number[];
  studentIds?: string[];
}

export interface SeatingResult {
  hallPlans: HallSeatingPlan[];
  unassignedStudents: Student[];
  violations: RuleViolation[];
  isValid: boolean;
  summary: {
    totalStudents: number;
    assignedStudents: number;
    totalHallsUsed: number;
    groupBreakdown: Record<string, number>;
  };
}

export interface Staff {
  id: string;
  name: string;
  designation: 'Lecturer' | 'Assistant Professor' | 'Associate Professor' | 'Professor' | 'HOD';
  department: string;
  tutorOfGroup?: string;      // Group ID they are tutor of, e.g. "S3 CS A", "MCA S1"
  isExamCellMember?: boolean; // Exam cell members (6 staff: 5 faculty + 1 HOD)
  maxDutiesPerSession?: number;
  contactNumber?: string;
  email?: string;
}

export interface ExamSession {
  id: string;
  name: string;               // e.g. "Second Series Exam, Odd Sem 2026"
  academicYear: string;       // e.g. "2026-27"
  sessionType: 'First Series' | 'Second Series';
  semesterType: 'odd' | 'even';
  startDate: string;          // DD/MM/YYYY or YYYY-MM-DD
  endDate: string;
  defaultTime: string;        // e.g. "10.15 AM - 12.15 PM"
  programmesIncluded: Programme[];
  signatoryConvener: string;  // e.g. "Exam Cell Convener"
  signatoryHod: string;       // e.g. "Principal / HOD"
}

export interface TimetableEntry {
  id: string;
  sessionId: string;
  date: string;               // e.g. "09/10/2026"
  sessionSlot: 'FN' | 'AN';
  timeRange: string;          // e.g. "10.15 AM - 12.15 PM"
  groupId: string;            // e.g. "S3 CS A"
  subjectCode: string;        // e.g. "CST 201"
  subjectName: string;        // e.g. "Data Structures"
}

export interface InvigilatorDutyAssignment {
  id: string;
  sessionId: string;
  date: string;
  sessionSlot: 'FN' | 'AN';
  hallId: string;
  hallName: string;
  staffId: string;
  staffName: string;
  staffDepartment: string;
}

export interface InvigilatorConflict {
  staffId: string;
  staffName: string;
  date: string;
  sessionSlot: 'FN' | 'AN';
  hallName: string;
  reason: 'TUTOR_OF_HALL_STUDENT' | 'DOUBLE_BOOKED' | 'EXCEEDED_DUTIES';
  message: string;
}

