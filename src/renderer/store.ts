import { create } from 'zustand';
import {
  Student,
  Hall,
  Staff,
  ExamSession,
  TimetableEntry,
  SeatingResult,
  InvigilatorDutyAssignment,
  SeatAssignment,
  RuleViolation,
} from '../core/types';
import { generateSeatingPlan } from '../core/seating';
import { validateSeatingPlan } from '../core/validator';
import { autoAssignInvigilators } from '../core/invigilator';
import { api } from './api';

export type ViewTab =
  | 'dashboard'
  | 'students'
  | 'halls'
  | 'sessions'
  | 'seating'
  | 'invigilators'
  | 'documents'
  | 'settings';

interface AppSettings {
  collegeName: string;
  subtitle: string;
  convenerName: string;
  hodName: string;
}

interface AppState {
  currentTab: ViewTab;
  setCurrentTab: (tab: ViewTab) => void;

  students: Student[];
  halls: Hall[];
  staff: Staff[];
  currentSession: ExamSession;
  timetable: TimetableEntry[];
  seatingResult: SeatingResult | null;
  invigilatorAssignments: InvigilatorDutyAssignment[];
  settings: AppSettings;

  // Print Preview Modal State
  previewModal: {
    isOpen: boolean;
    title: string;
    html: string;
  };

  // Actions
  loadInitialData: () => Promise<void>;
  setStudents: (students: Student[]) => void;
  addStudents: (newStudents: Student[]) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  toggleStudentStatus: (id: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  clearAllStudents: () => Promise<void>;

  updateHall: (hall: Hall) => Promise<void>;
  addHall: (hall: Hall) => Promise<void>;
  deleteHall: (id: string) => Promise<void>;

  generateSeating: () => void;
  swapSeats: (hallId: string, seat1: number, seat2: number) => void;
  assignInvigilators: () => void;
  updateDutyAssignment: (duty: InvigilatorDutyAssignment) => void;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  openPreview: (title: string, html: string) => void;
  closePreview: () => void;
}

const DEFAULT_SESSION: ExamSession = {
  id: 'session-oct-2026',
  name: 'Second Series Exam, Odd Sem 2026',
  academicYear: '2026-27',
  sessionType: 'Second Series',
  semesterType: 'odd',
  startDate: '09/10/2026',
  endDate: '16/10/2026',
  defaultTime: '10.15 AM - 12.15 PM',
  programmesIncluded: ['B.Tech', 'MCA', 'BCA', 'Diploma'],
  signatoryConvener: 'Exam Cell Convener',
  signatoryHod: 'Principal / HOD',
};

const DEFAULT_SETTINGS: AppSettings = {
  collegeName: 'COLLEGE OF ENGINEERING POONJAR',
  subtitle: 'A Unit of IHRD, Government of Kerala',
  convenerName: 'Exam Cell Convener',
  hodName: 'Principal / HOD',
};

export const useAppStore = create<AppState>((set, get) => ({
  currentTab: 'dashboard',
  setCurrentTab: (tab) => set({ currentTab: tab }),

  students: [],
  halls: [],
  staff: [],
  currentSession: DEFAULT_SESSION,
  timetable: [],
  seatingResult: null,
  invigilatorAssignments: [],
  settings: DEFAULT_SETTINGS,

  previewModal: {
    isOpen: false,
    title: '',
    html: '',
  },

  loadInitialData: async () => {
    try {
      if (api.isElectron) {
        // Fetch halls from DB
        const hallsData = await api.rawQuery('SELECT * FROM halls ORDER BY priority_order ASC');
        if (hallsData && hallsData.length > 0) {
          const halls: Hall[] = hallsData.map((h: any) => ({
            id: h.id,
            name: h.name,
            department: h.department,
            furnitureType: h.furniture_type || 'bench_desk',
            studentsPerBench: (h.students_per_bench === 3 ? 3 : 2) as 2 | 3,
            threeSeaterBenchCount: h.three_seater_bench_count || 0,
            columnCount: h.column_count || 4,
            rowCount: h.row_count || 5,
            benchCount: h.bench_count,
            textpadChairCount: h.textpad_chair_count || 0,
            deskCount: h.desk_count,
            chairCount: h.chair_count,
            capacity: h.capacity,
            isAvailable: Boolean(h.is_available),
            priorityOrder: h.priority_order,
          }));
          set({ halls });
        }

        // Fetch staff from DB
        const staffData = await api.rawQuery('SELECT * FROM staff ORDER BY name ASC');
        if (staffData && staffData.length > 0) {
          const staff: Staff[] = staffData.map((s: any) => ({
            id: s.id,
            name: s.name,
            designation: s.designation,
            department: s.department,
            tutorOfGroup: s.tutor_of_group,
            isExamCellMember: Boolean(s.is_exam_cell_member),
            maxDutiesPerSession: s.max_duties_per_session,
          }));
          set({ staff });
        }

        // Fetch students from DB
        const studentsData = await api.rawQuery('SELECT * FROM students ORDER BY roll_no ASC');
        if (studentsData && studentsData.length > 0) {
          const students: Student[] = studentsData.map((s: any) => ({
            id: s.id,
            rollNo: s.roll_no,
            registerNo: s.register_no,
            name: s.name,
            programme: s.programme,
            branch: s.branch,
            semester: s.semester,
            batch: s.batch,
            status: s.status,
            groupId: s.group_id,
          }));
          set({ students });
        }
      } else {
        // Fallback default sample data for dev browser
        seedBrowserDevData(set, get);
      }
    } catch (err) {
      console.error('Failed to load DB initial data:', err);
      seedBrowserDevData(set, get);
    }
  },

  setStudents: (students) => set({ students }),

  addStudents: async (newStudents) => {
    set((state) => {
      const existingIds = new Set(state.students.map((s) => s.id));
      const filtered = newStudents.filter((s) => !existingIds.has(s.id));
      const merged = [...state.students, ...filtered];
      return { students: merged };
    });

    if (api.isElectron) {
      for (const s of newStudents) {
        await api.rawRun(
          `INSERT OR REPLACE INTO students (id, roll_no, register_no, name, programme, branch, semester, batch, status, group_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.rollNo, s.registerNo || '', s.name, s.programme, s.branch, s.semester, s.batch || '', s.status, s.groupId, Date.now()]
        );
      }
    }
  },

  updateStudent: async (student) => {
    set((state) => ({
      students: state.students.map((s) => (s.id === student.id ? student : s)),
    }));

    if (api.isElectron) {
      await api.rawRun(
        `UPDATE students SET roll_no = ?, register_no = ?, name = ?, programme = ?, branch = ?, semester = ?, batch = ?, status = ?, group_id = ? WHERE id = ?`,
        [student.rollNo, student.registerNo || '', student.name, student.programme, student.branch, student.semester, student.batch || '', student.status, student.groupId, student.id]
      );
    }
  },

  toggleStudentStatus: async (id) => {
    let updated: Student | undefined;
    set((state) => {
      const students = state.students.map((s) => {
        if (s.id === id) {
          updated = { ...s, status: s.status === 'active' ? 'dropped' : 'active' };
          return updated;
        }
        return s;
      });
      return { students };
    });

    if (api.isElectron && updated) {
      await api.rawRun(`UPDATE students SET status = ? WHERE id = ?`, [updated.status, id]);
    }
  },

  deleteStudent: async (id) => {
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
    }));
    if (api.isElectron) {
      await api.rawRun('DELETE FROM students WHERE id = ?', [id]);
    }
  },

  clearAllStudents: async () => {
    set({ students: [], seatingResult: null });
    if (api.isElectron) {
      await api.rawRun('DELETE FROM students');
      await api.rawRun('DELETE FROM seating_plans');
    }
  },

  updateHall: async (hall) => {
    set((state) => ({
      halls: state.halls.map((h) => (h.id === hall.id ? hall : h)),
    }));
    if (api.isElectron) {
      await api.rawRun(
        `UPDATE halls SET name = ?, department = ?, furniture_type = ?, students_per_bench = ?, three_seater_bench_count = ?, column_count = ?, row_count = ?, bench_count = ?, textpad_chair_count = ?, desk_count = ?, chair_count = ?, capacity = ?, is_available = ? WHERE id = ?`,
        [
          hall.name,
          hall.department,
          hall.furnitureType || 'bench_desk',
          hall.studentsPerBench || 2,
          hall.threeSeaterBenchCount || 0,
          hall.columnCount || 4,
          hall.rowCount || 5,
          hall.benchCount,
          hall.textpadChairCount || 0,
          hall.deskCount,
          hall.chairCount,
          hall.capacity,
          hall.isAvailable ? 1 : 0,
          hall.id,
        ]
      );
    }
  },

  addHall: async (hall) => {
    set((state) => ({ halls: [...state.halls, hall] }));
    if (api.isElectron) {
      await api.rawRun(
        `INSERT INTO halls (id, name, department, furniture_type, students_per_bench, three_seater_bench_count, column_count, row_count, bench_count, textpad_chair_count, desk_count, chair_count, capacity, is_available, priority_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          hall.id,
          hall.name,
          hall.department,
          hall.furnitureType || 'bench_desk',
          hall.studentsPerBench || 2,
          hall.threeSeaterBenchCount || 0,
          hall.columnCount || 4,
          hall.rowCount || 5,
          hall.benchCount,
          hall.textpadChairCount || 0,
          hall.deskCount,
          hall.chairCount,
          hall.capacity,
          hall.isAvailable ? 1 : 0,
          hall.priorityOrder || 0,
        ]
      );
    }
  },

  deleteHall: async (id) => {
    set((state) => ({ halls: state.halls.filter((h) => h.id !== id) }));
    if (api.isElectron) {
      await api.rawRun('DELETE FROM halls WHERE id = ?', [id]);
    }
  },

  generateSeating: () => {
    const { students, halls } = get();
    const result = generateSeatingPlan({
      students,
      halls,
      maxHallCapacity: 40,
    });
    set({ seatingResult: result });
  },

  swapSeats: (hallId, seatNum1, seatNum2) => {
    const { seatingResult, halls, students } = get();
    if (!seatingResult) return;

    const updatedPlans = seatingResult.hallPlans.map((plan) => {
      if (plan.hallId !== hallId) return plan;

      const newSeats = plan.seats.map((seat) => ({ ...seat }));
      const s1 = newSeats.find((s) => s.seatNumber === seatNum1);
      const s2 = newSeats.find((s) => s.seatNumber === seatNum2);

      if (s1 && s2) {
        const tempId = s1.studentId;
        const tempStudent = s1.student;

        s1.studentId = s2.studentId;
        s1.student = s2.student;

        s2.studentId = tempId;
        s2.student = tempStudent;
      }

      return {
        ...plan,
        seats: newSeats,
      };
    });

    const hallsMap = new Map(halls.map((h) => [h.id, h]));
    const violations = validateSeatingPlan(updatedPlans, hallsMap, students);

    set({
      seatingResult: {
        ...seatingResult,
        hallPlans: updatedPlans,
        violations,
        isValid: violations.filter((v) => v.severity === 'error').length === 0,
      },
    });
  },

  assignInvigilators: () => {
    const { currentSession, seatingResult, staff } = get();
    if (!seatingResult || seatingResult.hallPlans.length === 0) return;

    const dates = ['09/10/2026', '12/10/2026', '13/10/2026', '14/10/2026', '15/10/2026'];
    const result = autoAssignInvigilators({
      sessionId: currentSession.id,
      dates,
      slots: ['FN'],
      hallPlans: seatingResult.hallPlans,
      staffList: staff,
    });

    set({ invigilatorAssignments: result.assignments });
  },

  updateDutyAssignment: (duty) => {
    set((state) => ({
      invigilatorAssignments: state.invigilatorAssignments.map((a) => (a.id === duty.id ? duty : a)),
    }));
  },

  updateSettings: (newSettings) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }));
  },

  openPreview: (title, html) => {
    set({ previewModal: { isOpen: true, title, html } });
  },

  closePreview: () => {
    set((state) => ({ previewModal: { ...state.previewModal, isOpen: false } }));
  },
}));

function seedBrowserDevData(set: any, get: any) {
  // Pre-seed default halls
  const halls: Hall[] = [
    { id: 'hall-b206', name: 'B 206', department: 'CS', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 1 },
    { id: 'hall-b207', name: 'B 207', department: 'CS', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 2 },
    { id: 'hall-d101', name: 'D 101', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 3 },
    { id: 'hall-d102', name: 'D 102', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 4 },
    { id: 'hall-d103', name: 'D 103', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 5 },
    { id: 'hall-d106', name: 'D 106', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 6 },
    { id: 'hall-d201', name: 'D 201', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 7 },
    { id: 'hall-d202', name: 'D 202', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 8 },
  ];

  // Pre-seed faculty list
  const staff: Staff[] = [
    { id: 'st-1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS A', isExamCellMember: true },
    { id: 'st-2', name: 'Flower Abraham', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S5 EC', isExamCellMember: true },
    { id: 'st-3', name: 'Manoj K R', designation: 'HOD', department: 'CS', isExamCellMember: true },
    { id: 'st-4', name: 'Adithya S Reji', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true },
    { id: 'st-5', name: 'Al saheer', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true },
    { id: 'st-6', name: 'Anjala Michael', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true },
    { id: 'st-7', name: 'Aparna A Nair', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S1' },
    { id: 'st-8', name: 'Asiya Muhammed', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S5 CS B' },
    { id: 'st-9', name: 'Athira Lal', designation: 'Assistant Professor', department: 'BCA', tutorOfGroup: 'BCA S3' },
    { id: 'st-10', name: 'Athiralakshmi S', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S1 CS A' },
    { id: 'st-11', name: 'Emmanuel Joy', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S3 EC' },
    { id: 'st-12', name: 'Gincy Jose', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S3' },
    { id: 'st-13', name: 'Haripriya S', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S5 CS A' },
    { id: 'st-14', name: 'Jabin Mathew', designation: 'Lecturer', department: 'Diploma', tutorOfGroup: 'S5 AU' },
    { id: 'st-15', name: 'Jefcin Joseph', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S1 CS B' },
    { id: 'st-16', name: 'Krishna Divakar', designation: 'Assistant Professor', department: 'EC' },
    { id: 'st-17', name: 'Kripa Mathew', designation: 'Assistant Professor', department: 'CS' },
    { id: 'st-18', name: 'Martin James', designation: 'Assistant Professor', department: 'Diploma' },
    { id: 'st-19', name: 'Priyanka Prasad', designation: 'Assistant Professor', department: 'CS' },
    { id: 'st-20', name: 'Remya G Nair', designation: 'Assistant Professor', department: 'EC' },
    { id: 'st-21', name: 'Sona Joseph', designation: 'Assistant Professor', department: 'MCA' },
    { id: 'st-22', name: 'Sreeja Sivan', designation: 'Assistant Professor', department: 'Diploma' },
    { id: 'st-23', name: 'Sumana E X', designation: 'Assistant Professor', department: 'CS' },
    { id: 'st-24', name: 'Suneetha S', designation: 'Assistant Professor', department: 'EC' },
    { id: 'st-25', name: 'Treesa Maria Sunny', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS B' },
  ];

  // Pre-seed series exam student roster from reference lists
  const students: Student[] = [];

  // S3 CS A: 35 students
  const s3Names = [
    'ABHINAV P', 'ABHISHEK K ANEESH', 'ADHI KRISHNA P M', 'ADHILA KABEER', 'ADITHYAN H',
    'ADWAITH P A', 'AFEEFA NAJEEB', 'AKSHAYNADH T S', 'ALDRIN SHAJI', 'ALEN C BIJU',
    'ALKARAM P P', 'AL SABITH NOUSHAD', 'AMEEN V', 'ANANDHU SURESH', 'ANAS MOHAMMED P',
    'ANEENA SUSAN PHILIP', 'ANFIYA ASHRAF', 'ANJALI CHANDRAN', 'ANKITHA A S', 'ANSALNA ANAS',
    'ANUGRAH P S', 'APARNA S', 'ARAVIND AJITH', 'ARJUN T S', 'ASNA PARVEEN',
    'ATHULYA RAJ', 'AYISHA SAFA K', 'BASIL GEORGE', 'BHAGATH P', 'CHRISTO ROY',
    'DANISH MOHAMMED', 'DAYA BIJU', 'DEVIKA DINESH', 'FASNA FATHIMA', 'GOPIKA GOPI'
  ];
  s3Names.forEach((name, i) => {
    students.push({
      id: `s3csa-${i + 1}`,
      rollNo: `${i + 1}`,
      registerNo: `PJR25CS${(i + 1).toString().padStart(3, '0')}`,
      name,
      programme: 'B.Tech',
      branch: 'CS',
      semester: 'S3',
      batch: 'A',
      status: 'active',
      groupId: 'S3 CS A',
    });
  });

  // S5 CS B: 35 students
  const s5bNames = [
    'ABI SUNEER', 'ADARSH O', 'ADARSH P M', 'ADINAN AZEEZ K T', 'ADITHYAN CHANDRAN',
    'AISHA MOL A A', 'AISWARYA RAJ', 'AKSHARA M', 'AKSHAY BIJU', 'ALAN C V',
    'ALAN THOMAS', 'AMEEN SHA S', 'ANAGHA PRASAD', 'ANANDHU BABU', 'ANAS P S',
    'ANASWARA SURESH', 'ANJANA RAJ', 'APARNA ANIL', 'ARJUN SANTHOSH', 'ASHIK SHIBU',
    'ISHANA ILYAS', 'JESVIN JOSE', 'LITHU P L', 'MICHAEL MANOJ', 'MUHAMMED SHAHEER T T',
    'NAHLA SABIR', 'NANDHANA S S', 'NAVANEETH KRISHNA', 'NEELIMA P S', 'NIVED KRISHNA',
    'RAHUL KRISHNA', 'RIZWAN AHMED', 'ROHIT K', 'SAHAL S', 'SANJAY S'
  ];
  s5bNames.forEach((name, i) => {
    students.push({
      id: `s5csb-${i + 1}`,
      rollNo: `S5 CS B ${i + 1}`,
      name,
      programme: 'B.Tech',
      branch: 'CS',
      semester: 'S5',
      batch: 'B',
      status: 'active',
      groupId: 'S5 CS B',
    });
  });

  // S5 EC: 14 students
  const s5ecNames = [
    'ADARSH S', 'ANAKHA SHAJIMON', 'ANN SUSAN PHILIP', 'ASIYA SHAHUL', 'DEVIKA ANIL',
    'DHENUKA DWAJAN', 'DIYANJALI RAJESH', 'FATHIMA LUBABA K M', 'HANNA MERIN THANKACHAN',
    'HANNA SHEREEF', 'KHADEEJA SHAMEER', 'SHARFAS MOHAMMED', 'TONY P SOJAN', 'ARJUN KRISHNA'
  ];
  s5ecNames.forEach((name, i) => {
    students.push({
      id: `s5ec-${i + 1}`,
      rollNo: `S5 EC ${(i + 1).toString().padStart(2, '0')}`,
      name,
      programme: 'B.Tech',
      branch: 'EC',
      semester: 'S5',
      status: 'active',
      groupId: 'S5 EC',
    });
  });

  // BCA S3: 7 students
  const bcaNames = ['ADITHYA V S', 'AKHIL SHAJI', 'ANANYA R', 'BIBIN BENNY', 'DONA JOSE', 'HARIKRISHNAN R', 'JEFFIN JOHN'];
  bcaNames.forEach((name, i) => {
    students.push({
      id: `bcas3-${i + 1}`,
      rollNo: `${i + 1}`,
      name,
      programme: 'BCA',
      branch: 'BCA',
      semester: 'S3',
      status: 'active',
      groupId: 'BCA S3',
    });
  });

  // MCA S1: 15 students
  const mcaNames = [
    'ABIN ROY', 'ALEN VARGHESE', 'AMAL RAJ', 'ANJU MARY', 'ARYA S',
    'ASWIN P', 'CHRISTY BABY', 'DEEPAK K', 'FATHIMA K', 'JISHA JOSEPH',
    'MANU MOHAN', 'NANDHANA P', 'ROSHAN K', 'SARATH S', 'VISHNU V'
  ];
  mcaNames.forEach((name, i) => {
    students.push({
      id: `mcas1-${i + 1}`,
      rollNo: `${i + 1}`,
      name,
      programme: 'MCA',
      branch: 'MCA',
      semester: 'S1',
      status: 'active',
      groupId: 'MCA S1',
    });
  });

  set({ halls, staff, students });
}

