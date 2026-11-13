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
  HallSeatingPlan,
  Programme,
} from '../core/types';
import { generateSeatingPlan } from '../core/seating';
import { validateSeatingPlan, normalizeBranch, normalizeSemester, normalizeGroupId } from '../core/validator';
import { autoAssignInvigilators, getStaffProgrammes } from '../core/invigilator';
import { normalizeDateStr, shiftTimetableDates, getWorkingDatesInRange } from '../core/dateUtils';
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

  // Active exam slot & per-slot selections
  selectedExamDate: string;
  selectedExamSlot: 'FN' | 'AN';
  slotHallSelections: Record<string, string[]>; // `${date}_${slot}` -> hallId[]
  slotSeatingResults: Record<string, SeatingResult>; // `${date}_${slot}` -> SeatingResult

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

  // Session & Timetable Actions
  updateSession: (session: ExamSession) => Promise<void>;
  syncTimetableDates: (startDate?: string, endDate?: string) => Promise<void>;
  addTimetableEntry: (entry: TimetableEntry) => Promise<void>;
  updateTimetableEntryDate: (id: string, newDate: string) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  setTimetable: (entries: TimetableEntry[]) => Promise<void>;

  // Slot & Hall Selection Actions
  setSelectedExamDate: (date: string) => void;
  setSelectedExamSlot: (slot: 'FN' | 'AN') => void;
  toggleHallForSlot: (hallId: string, date?: string, slot?: 'FN' | 'AN') => void;
  setHallsForSlot: (hallIds: string[], date?: string, slot?: 'FN' | 'AN') => void;
  autoSelectHallsForSlot: (date?: string, slot?: 'FN' | 'AN') => string[];

  generateSeating: () => void;
  generateSeatingForSlot: (date?: string, slot?: 'FN' | 'AN') => Promise<void>;
  swapSeats: (hallId: string, seat1: number, seat2: number) => Promise<void>;
  assignInvigilators: () => Promise<void>;
  updateDutyAssignment: (duty: InvigilatorDutyAssignment) => Promise<void>;
  addDutyAssignment: (duty: InvigilatorDutyAssignment) => Promise<void>;
  removeDutyAssignment: (dutyId: string) => Promise<void>;
  setDutyAssignments: (assignments: InvigilatorDutyAssignment[]) => Promise<void>;
  clearAllInvigilatorAssignments: () => Promise<void>;
  updateStaffProgrammes: (staffId: string, programmes: Programme[]) => Promise<void>;
  toggleStaffProgramme: (staffId: string, programme: Programme) => Promise<void>;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  openPreview: (title: string, html: string) => void;
  closePreview: () => void;
  resetToDefaultSampleData: () => Promise<void>;
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

export const DEFAULT_TIMETABLE: TimetableEntry[] = [
  {
    id: 'tt-1',
    sessionId: 'session-oct-2026',
    date: '09/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S3 CS A',
    subjectCode: 'CST 201',
    subjectName: 'Data Structures',
  },
  {
    id: 'tt-2',
    sessionId: 'session-oct-2026',
    date: '09/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S5 EC',
    subjectCode: 'ECT 301',
    subjectName: 'Linear Integrated Circuits',
  },
  {
    id: 'tt-3',
    sessionId: 'session-oct-2026',
    date: '09/10/2026',
    sessionSlot: 'AN',
    timeRange: '01.30 PM - 03.30 PM',
    groupId: 'S5 CS B',
    subjectCode: 'CST 301',
    subjectName: 'Formal Languages & Automata Theory',
  },
  {
    id: 'tt-4',
    sessionId: 'session-oct-2026',
    date: '12/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S3 CS A',
    subjectCode: 'CST 203',
    subjectName: 'Logic System Design',
  },
  {
    id: 'tt-5',
    sessionId: 'session-oct-2026',
    date: '12/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'BCA S3',
    subjectCode: 'BCA 301',
    subjectName: 'Database Management Systems',
  },
  {
    id: 'tt-6',
    sessionId: 'session-oct-2026',
    date: '13/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S5 CS B',
    subjectCode: 'CST 303',
    subjectName: 'Computer Networks',
  },
  {
    id: 'tt-7',
    sessionId: 'session-oct-2026',
    date: '13/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'MCA S1',
    subjectCode: '20MCA101',
    subjectName: 'Mathematical Foundations of Computing',
  },
  {
    id: 'tt-8',
    sessionId: 'session-oct-2026',
    date: '14/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S3 CS A',
    subjectCode: 'CST 205',
    subjectName: 'Object Oriented Programming with Java',
  },
  {
    id: 'tt-9',
    sessionId: 'session-oct-2026',
    date: '14/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S5 EC',
    subjectCode: 'ECT 305',
    subjectName: 'Analog & Digital Communication',
  },
  {
    id: 'tt-10',
    sessionId: 'session-oct-2026',
    date: '15/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'S5 CS B',
    subjectCode: 'CST 305',
    subjectName: 'System Software',
  },
  {
    id: 'tt-11',
    sessionId: 'session-oct-2026',
    date: '15/10/2026',
    sessionSlot: 'FN',
    timeRange: '10.15 AM - 12.15 PM',
    groupId: 'MCA S1',
    subjectCode: '20MCA103',
    subjectName: 'Digital Fundamentals & Architecture',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  collegeName: 'COLLEGE OF ENGINEERING POONJAR',
  subtitle: 'A Unit of IHRD, Government of Kerala',
  convenerName: 'Exam Cell Convener',
  hodName: 'Principal / HOD',
};

export const BROWSER_STORAGE_KEYS = {
  HAS_DATA: 'ecc_has_data_v2',
  STUDENTS: 'ecc_students_v2',
  HALLS: 'ecc_halls_v2',
  STAFF: 'ecc_staff_v2',
  SESSION: 'ecc_session_v2',
  TIMETABLE: 'ecc_timetable_v2',
  SLOT_HALLS: 'ecc_slot_hall_selections_v2',
  SLOT_SEATING: 'ecc_slot_seating_results_v2',
  DUTIES: 'ecc_invigilator_assignments_v2',
  SETTINGS: 'ecc_settings_v2',
  SELECTED_DATE: 'ecc_selected_exam_date_v2',
  SELECTED_SLOT: 'ecc_selected_exam_slot_v2',
};

export function saveToLocalStorage(data: {
  students?: Student[];
  halls?: Hall[];
  staff?: Staff[];
  currentSession?: ExamSession;
  timetable?: TimetableEntry[];
  slotHallSelections?: Record<string, string[]>;
  slotSeatingResults?: Record<string, SeatingResult>;
  invigilatorAssignments?: InvigilatorDutyAssignment[];
  settings?: AppSettings;
  selectedExamDate?: string;
  selectedExamSlot?: 'FN' | 'AN';
}) {
  if (typeof window === 'undefined' || !window.localStorage || api.isElectron) return;
  try {
    localStorage.setItem(BROWSER_STORAGE_KEYS.HAS_DATA, 'true');
    if (data.students !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
    }
    if (data.halls !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.HALLS, JSON.stringify(data.halls));
    }
    if (data.staff !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.STAFF, JSON.stringify(data.staff));
    }
    if (data.currentSession !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SESSION, JSON.stringify(data.currentSession));
    }
    if (data.timetable !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.TIMETABLE, JSON.stringify(data.timetable));
    }
    if (data.slotHallSelections !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SLOT_HALLS, JSON.stringify(data.slotHallSelections));
    }
    if (data.slotSeatingResults !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SLOT_SEATING, JSON.stringify(data.slotSeatingResults));
    }
    if (data.invigilatorAssignments !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.DUTIES, JSON.stringify(data.invigilatorAssignments));
    }
    if (data.settings !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    if (data.selectedExamDate !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SELECTED_DATE, data.selectedExamDate);
    }
    if (data.selectedExamSlot !== undefined) {
      localStorage.setItem(BROWSER_STORAGE_KEYS.SELECTED_SLOT, data.selectedExamSlot);
    }
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

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

  selectedExamDate: '09/10/2026',
  selectedExamSlot: 'FN',
  slotHallSelections: {},
  slotSeatingResults: {},

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
          const staff: Staff[] = staffData.map((s: any) => {
            let programmes: Programme[] | undefined;
            if (s.programmes) {
              try {
                programmes = typeof s.programmes === 'string' ? JSON.parse(s.programmes) : s.programmes;
              } catch {
                programmes = undefined;
              }
            }
            if (!programmes || programmes.length === 0) {
              const dept = (s.department || '').toUpperCase();
              if (dept.includes('DIPLOMA')) programmes = ['Diploma'];
              else if (dept.includes('MCA')) programmes = ['MCA'];
              else if (dept.includes('BCA')) programmes = ['BCA'];
              else programmes = ['B.Tech'];
            }
            return {
              id: s.id,
              name: s.name,
              designation: s.designation,
              department: s.department,
              tutorOfGroup: s.tutor_of_group,
              isExamCellMember: Boolean(s.is_exam_cell_member),
              maxDutiesPerSession: s.max_duties_per_session,
              programmes,
            };
          });
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

        // Fetch active exam session from DB
        const sessionData = await api.rawQuery('SELECT * FROM exam_sessions WHERE is_current = 1 LIMIT 1');
        let activeSession = DEFAULT_SESSION;
        if (sessionData && sessionData.length > 0) {
          const s = sessionData[0];
          activeSession = {
            id: s.id,
            name: s.name,
            academicYear: s.academic_year,
            sessionType: s.session_type,
            semesterType: s.semester_type,
            startDate: s.start_date,
            endDate: s.end_date,
            defaultTime: s.default_time,
            programmesIncluded: typeof s.programmes_included === 'string' ? JSON.parse(s.programmes_included) : (s.programmes_included || []),
            signatoryConvener: s.signatory_convener,
            signatoryHod: s.signatory_hod,
          };
          set({ currentSession: activeSession });
        }

        // Fetch timetable from DB
        const timetableData = await api.rawQuery('SELECT * FROM timetable_entries WHERE session_id = ? ORDER BY date ASC, session_slot ASC', [activeSession.id]);
        if (timetableData && timetableData.length > 0) {
          const timetable: TimetableEntry[] = timetableData.map((t: any) => ({
            id: t.id,
            sessionId: t.session_id,
            date: t.date,
            sessionSlot: t.session_slot,
            timeRange: t.time_range,
            groupId: t.group_id,
            subjectCode: t.subject_code,
            subjectName: t.subject_name,
          }));
          set({ timetable });
        } else {
          // Pre-seed default timetable entries
          const entriesToSeed = DEFAULT_TIMETABLE.map((t) => ({ ...t, sessionId: activeSession.id }));
          set({ timetable: entriesToSeed });
          for (const t of entriesToSeed) {
            await api.rawRun(
              `INSERT OR REPLACE INTO timetable_entries (id, session_id, date, session_slot, time_range, group_id, subject_code, subject_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [t.id, t.sessionId, t.date, t.sessionSlot, t.timeRange, t.groupId, t.subjectCode, t.subjectName]
            );
          }
        }

        // Fetch saved seating plans from DB
        const seatingPlansData = await api.rawQuery('SELECT * FROM seating_plans WHERE session_id = ?', [activeSession.id]);
        if (seatingPlansData && seatingPlansData.length > 0) {
          const slotResults: Record<string, SeatingResult> = {};
          const slotHallMap: Record<string, string[]> = {};
          const grouped: Record<string, any[]> = {};

          for (const row of seatingPlansData) {
            const key = `${row.date}_${row.session_slot}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
          }

          const currentHalls = get().halls;
          const currentStudents = get().students;

          for (const [key, rows] of Object.entries(grouped)) {
            const hallPlans: HallSeatingPlan[] = rows.map((r: any) => {
              const seats: SeatAssignment[] = JSON.parse(r.seat_assignments || '[]');
              const hallObj = currentHalls.find((h) => h.id === r.hall_id);
              const groupsPresent = Array.from(new Set(seats.map((s) => s.student?.groupId).filter(Boolean))) as string[];
              const totalStudents = seats.filter((s) => s.studentId).length;
              return {
                hallId: r.hall_id,
                hallName: hallObj?.name || r.hall_id,
                capacity: hallObj?.capacity || 40,
                columnCount: hallObj?.columnCount || 4,
                seats,
                groupsPresent,
                totalStudents,
              };
            });

            slotHallMap[key] = rows.map((r: any) => r.hall_id);
            const assignedStudents = hallPlans.reduce((sum, h) => sum + h.totalStudents, 0);
            const groupBreakdown: Record<string, number> = {};
            for (const hp of hallPlans) {
              for (const seat of hp.seats) {
                if (seat.student?.groupId) {
                  groupBreakdown[seat.student.groupId] = (groupBreakdown[seat.student.groupId] || 0) + 1;
                }
              }
            }

            const hallsMap = new Map(currentHalls.map((h) => [h.id, h]));
            const violations = validateSeatingPlan(hallPlans, hallsMap, currentStudents);

            slotResults[key] = {
              hallPlans,
              unassignedStudents: [],
              violations,
              isValid: violations.filter((v) => v.severity === 'error').length === 0,
              summary: {
                totalStudents: assignedStudents,
                assignedStudents,
                totalHallsUsed: hallPlans.length,
                groupBreakdown,
              },
            };
          }

          set({
            slotSeatingResults: slotResults,
            slotHallSelections: slotHallMap,
          });

          const curKey = `${get().selectedExamDate}_${get().selectedExamSlot}`;
          if (slotResults[curKey]) {
            set({ seatingResult: slotResults[curKey] });
          }
        }

        // Fetch saved invigilator duties from DB
        const dutiesData = await api.rawQuery(
          'SELECT * FROM invigilator_duties WHERE session_id = ?',
          [activeSession.id]
        );
        if (dutiesData && dutiesData.length > 0) {
          const currentStaff = get().staff;
          const currentHalls = get().halls;
          const invigilatorAssignments: InvigilatorDutyAssignment[] = dutiesData.map((d: any) => {
            const st = currentStaff.find((s) => s.id === d.staff_id);
            const hl = currentHalls.find((h) => h.id === d.hall_id);
            return {
              id: d.id,
              sessionId: d.session_id,
              date: d.date,
              sessionSlot: d.session_slot as 'FN' | 'AN',
              hallId: d.hall_id,
              hallName: hl?.name || d.hall_id,
              staffId: d.staff_id,
              staffName: st?.name || d.staff_id,
              staffDepartment: st?.department || '',
            };
          });
          set({ invigilatorAssignments });
        }
      } else {
        // Browser Mode with LocalStorage Persistence
        const hasSaved = typeof window !== 'undefined' && localStorage.getItem(BROWSER_STORAGE_KEYS.HAS_DATA) === 'true';
        if (hasSaved) {
          try {
            const rawStudents = localStorage.getItem(BROWSER_STORAGE_KEYS.STUDENTS);
            const rawHalls = localStorage.getItem(BROWSER_STORAGE_KEYS.HALLS);
            const rawStaff = localStorage.getItem(BROWSER_STORAGE_KEYS.STAFF);
            const rawSession = localStorage.getItem(BROWSER_STORAGE_KEYS.SESSION);
            const rawTimetable = localStorage.getItem(BROWSER_STORAGE_KEYS.TIMETABLE);
            const rawSlotHalls = localStorage.getItem(BROWSER_STORAGE_KEYS.SLOT_HALLS);
            const rawSlotSeating = localStorage.getItem(BROWSER_STORAGE_KEYS.SLOT_SEATING);
            const rawDuties = localStorage.getItem(BROWSER_STORAGE_KEYS.DUTIES);
            const rawSettings = localStorage.getItem(BROWSER_STORAGE_KEYS.SETTINGS);
            const rawDate = localStorage.getItem(BROWSER_STORAGE_KEYS.SELECTED_DATE);
            const rawSlot = localStorage.getItem(BROWSER_STORAGE_KEYS.SELECTED_SLOT);

            const students: Student[] = rawStudents ? JSON.parse(rawStudents) : [];
            const halls: Hall[] = rawHalls ? JSON.parse(rawHalls) : [];
            const staff: Staff[] = rawStaff ? JSON.parse(rawStaff) : [];
            const currentSession: ExamSession = rawSession ? JSON.parse(rawSession) : DEFAULT_SESSION;
            const timetable: TimetableEntry[] = rawTimetable ? JSON.parse(rawTimetable) : DEFAULT_TIMETABLE;
            const slotHallSelections = rawSlotHalls ? JSON.parse(rawSlotHalls) : {};
            const slotSeatingResults = rawSlotSeating ? JSON.parse(rawSlotSeating) : {};
            const invigilatorAssignments = rawDuties ? JSON.parse(rawDuties) : [];
            const settings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_SETTINGS;
            const selectedExamDate = rawDate || currentSession.startDate || '09/10/2026';
            const selectedExamSlot = (rawSlot === 'AN' ? 'AN' : 'FN') as 'FN' | 'AN';

            const curKey = `${selectedExamDate}_${selectedExamSlot}`;
            const seatingResult = slotSeatingResults[curKey] || null;

            set({
              students,
              halls: halls.length > 0 ? halls : getPreSeededHalls(),
              staff: staff.length > 0 ? staff : getPreSeededStaff(),
              currentSession,
              timetable,
              slotHallSelections,
              slotSeatingResults,
              invigilatorAssignments,
              settings,
              selectedExamDate,
              selectedExamSlot,
              seatingResult,
            });

            // If seating hasn't been generated for the active slot yet, generate it
            if (!seatingResult && students.length > 0) {
              get().autoSelectHallsForSlot(selectedExamDate, selectedExamSlot);
              await get().generateSeatingForSlot(selectedExamDate, selectedExamSlot);
            }
            return;
          } catch (e) {
            console.error('Failed to parse localStorage data, re-seeding:', e);
          }
        }

        // First time load: seed default sample data and immediately persist to localStorage
        seedBrowserDevData(set, get);
        const st = get();
        saveToLocalStorage({
          students: st.students,
          halls: st.halls,
          staff: st.staff,
          currentSession: st.currentSession,
          timetable: st.timetable,
          slotHallSelections: st.slotHallSelections,
          slotSeatingResults: st.slotSeatingResults,
          invigilatorAssignments: st.invigilatorAssignments,
          settings: st.settings,
          selectedExamDate: st.selectedExamDate,
          selectedExamSlot: st.selectedExamSlot,
        });
      }
    } catch (err) {
      console.error('Failed to load DB initial data:', err);
      seedBrowserDevData(set, get);
    }
  },

  setStudents: (students) => {
    set({ students });
    saveToLocalStorage({ students });
  },

  addStudents: async (newStudents) => {
    // 1. Normalize all incoming student fields (group, branch, semester)
    const normalizedNew = newStudents.map((s) => ({
      ...s,
      groupId: normalizeGroupId(s.groupId),
      branch: normalizeBranch(s.branch),
      semester: normalizeSemester(s.semester),
    }));

    const incomingNormGroups = new Set(normalizedNew.map((s) => normalizeGroupId(s.groupId)));
    const currentStudents = get().students;

    // Check if current list is only default sample students
    const isSampleRoster =
      currentStudents.length > 0 &&
      currentStudents.every((s) =>
        s.id.startsWith('s3csa-') ||
        s.id.startsWith('s5csb-') ||
        s.id.startsWith('s5ec-') ||
        s.id.startsWith('bcas3-') ||
        s.id.startsWith('mcas1-')
      );

    let updatedStudents: Student[];
    if (isSampleRoster) {
      // Discard matching sample dummy students so we don't mix real and fake students
      const remainingStudents = currentStudents.filter(
        (s) => !incomingNormGroups.has(normalizeGroupId(s.groupId))
      );
      updatedStudents = [...remainingStudents, ...normalizedNew];
    } else {
      // Replace students belonging to the same group(s) to avoid duplicate roll numbers on re-import
      const remainingStudents = currentStudents.filter(
        (s) => !incomingNormGroups.has(normalizeGroupId(s.groupId))
      );
      updatedStudents = [...remainingStudents, ...normalizedNew];
    }

    set({ students: updatedStudents });
    saveToLocalStorage({ students: updatedStudents });

    if (api.isElectron) {
      for (const s of normalizedNew) {
        await api.rawRun(
          `INSERT OR REPLACE INTO students (id, roll_no, register_no, name, programme, branch, semester, batch, status, group_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.rollNo, s.registerNo || '', s.name, s.programme, s.branch, s.semester, s.batch || '', s.status, s.groupId, Date.now()]
        );
      }
    }
    const { selectedExamDate, selectedExamSlot } = get();
    get().autoSelectHallsForSlot(selectedExamDate, selectedExamSlot);
    await get().generateSeatingForSlot(selectedExamDate, selectedExamSlot);
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
    set({ students: [], seatingResult: null, slotSeatingResults: {} });
    saveToLocalStorage({ students: [], slotSeatingResults: {} });
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

  updateSession: async (session: ExamSession) => {
    const oldSession = get().currentSession;
    const normStart = normalizeDateStr(session.startDate) || session.startDate;
    const normEnd = normalizeDateStr(session.endDate) || session.endDate;
    const normalizedSession: ExamSession = {
      ...session,
      startDate: normStart,
      endDate: normEnd,
    };

    const startDateChanged = normalizeDateStr(oldSession.startDate) !== normStart;
    const endDateChanged = normalizeDateStr(oldSession.endDate) !== normEnd;

    set({ currentSession: normalizedSession });

    // When the user changes exam start/end dates, automatically shift existing timetable entries!
    if ((startDateChanged || endDateChanged) && get().timetable.length > 0) {
      const shifted = shiftTimetableDates(get().timetable, normStart, normEnd);
      await get().setTimetable(shifted);
      set({ selectedExamDate: normStart });
    } else if (startDateChanged) {
      set({ selectedExamDate: normStart });
    }

    if (api.isElectron) {
      await api.rawRun(
        `UPDATE exam_sessions SET name = ?, academic_year = ?, session_type = ?, semester_type = ?, start_date = ?, end_date = ?, default_time = ?, programmes_included = ?, signatory_convener = ?, signatory_hod = ? WHERE id = ?`,
        [
          normalizedSession.name,
          normalizedSession.academicYear,
          normalizedSession.sessionType,
          normalizedSession.semesterType,
          normalizedSession.startDate,
          normalizedSession.endDate,
          normalizedSession.defaultTime,
          JSON.stringify(normalizedSession.programmesIncluded),
          normalizedSession.signatoryConvener,
          normalizedSession.signatoryHod,
          normalizedSession.id,
        ]
      );
    }
  },

  syncTimetableDates: async (startDate?: string, endDate?: string) => {
    const { currentSession, timetable } = get();
    const start = normalizeDateStr(startDate || currentSession.startDate);
    const end = normalizeDateStr(endDate || currentSession.endDate);
    if (!start || !end || timetable.length === 0) return;

    const shifted = shiftTimetableDates(timetable, start, end);
    await get().setTimetable(shifted);
    set({ selectedExamDate: start });
  },

  addTimetableEntry: async (entry: TimetableEntry) => {
    const normDate = normalizeDateStr(entry.date) || entry.date;
    const normEntry = {
      ...entry,
      date: normDate,
    };
    set((state) => ({ timetable: [...state.timetable, normEntry] }));
    if (api.isElectron) {
      await api.rawRun(
        `INSERT OR REPLACE INTO timetable_entries (id, session_id, date, session_slot, time_range, group_id, subject_code, subject_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [normEntry.id, normEntry.sessionId, normEntry.date, normEntry.sessionSlot, normEntry.timeRange, normEntry.groupId, normEntry.subjectCode, normEntry.subjectName]
      );
    }
    // Automatically update hall selections and regenerate seating arrangement for this slot!
    get().autoSelectHallsForSlot(normDate, normEntry.sessionSlot);
    await get().generateSeatingForSlot(normDate, normEntry.sessionSlot);
  },

  updateTimetableEntryDate: async (id: string, newDate: string) => {
    const target = get().timetable.find((t) => t.id === id);
    const oldDate = target?.date;
    const oldSlot = target?.sessionSlot;
    const normDate = normalizeDateStr(newDate);
    set((state) => ({
      timetable: state.timetable.map((t) => (t.id === id ? { ...t, date: normDate } : t)),
    }));
    if (api.isElectron) {
      await api.rawRun('UPDATE timetable_entries SET date = ? WHERE id = ?', [normDate, id]);
    }
    if (oldDate && oldSlot) {
      get().autoSelectHallsForSlot(oldDate, oldSlot);
      await get().generateSeatingForSlot(oldDate, oldSlot);
    }
    if (target && normDate !== oldDate) {
      get().autoSelectHallsForSlot(normDate, target.sessionSlot);
      await get().generateSeatingForSlot(normDate, target.sessionSlot);
    }
  },

  deleteTimetableEntry: async (id: string) => {
    const target = get().timetable.find((t) => t.id === id);
    set((state) => ({ timetable: state.timetable.filter((t) => t.id !== id) }));
    if (api.isElectron) {
      await api.rawRun('DELETE FROM timetable_entries WHERE id = ?', [id]);
    }
    if (target) {
      get().autoSelectHallsForSlot(target.date, target.sessionSlot);
      await get().generateSeatingForSlot(target.date, target.sessionSlot);
    }
  },

  setTimetable: async (entries: TimetableEntry[]) => {
    const normalized = entries.map((e) => ({
      ...e,
      date: normalizeDateStr(e.date) || e.date,
    }));
    set({ timetable: normalized });
    if (api.isElectron) {
      const { currentSession } = get();
      await api.rawRun('DELETE FROM timetable_entries WHERE session_id = ?', [currentSession.id]);
      for (const entry of normalized) {
        await api.rawRun(
          `INSERT INTO timetable_entries (id, session_id, date, session_slot, time_range, group_id, subject_code, subject_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [entry.id, entry.sessionId, entry.date, entry.sessionSlot, entry.timeRange, entry.groupId, entry.subjectCode, entry.subjectName]
        );
      }
    }
    // Regenerate seating for all unique slots in the new timetable
    const slotKeys = Array.from(new Set(normalized.map((e) => `${e.date}_${e.sessionSlot}`)));
    for (const key of slotKeys) {
      const [d, s] = key.split('_');
      get().autoSelectHallsForSlot(d, s as 'FN' | 'AN');
      await get().generateSeatingForSlot(d, s as 'FN' | 'AN');
    }
  },

  setSelectedExamDate: (date: string) => {
    const { selectedExamSlot, slotSeatingResults } = get();
    const key = `${date}_${selectedExamSlot}`;
    const plan = slotSeatingResults[key] || null;
    set({
      selectedExamDate: date,
      seatingResult: plan,
    });
    if (!plan) {
      get().generateSeatingForSlot(date, selectedExamSlot);
    }
  },

  setSelectedExamSlot: (slot: 'FN' | 'AN') => {
    const { selectedExamDate, slotSeatingResults } = get();
    const key = `${selectedExamDate}_${slot}`;
    const plan = slotSeatingResults[key] || null;
    set({
      selectedExamSlot: slot,
      seatingResult: plan,
    });
    if (!plan) {
      get().generateSeatingForSlot(selectedExamDate, slot);
    }
  },

  toggleHallForSlot: (hallId: string, targetDate?: string, targetSlot?: 'FN' | 'AN') => {
    const date = targetDate || get().selectedExamDate;
    const slot = targetSlot || get().selectedExamSlot;
    const key = `${date}_${slot}`;
    const current = get().slotHallSelections[key] || [];
    const updated = current.includes(hallId)
      ? current.filter((id) => id !== hallId)
      : [...current, hallId];

    set((state) => ({
      slotHallSelections: {
        ...state.slotHallSelections,
        [key]: updated,
      },
    }));
  },

  setHallsForSlot: (hallIds: string[], targetDate?: string, targetSlot?: 'FN' | 'AN') => {
    const date = targetDate || get().selectedExamDate;
    const slot = targetSlot || get().selectedExamSlot;
    const key = `${date}_${slot}`;
    set((state) => ({
      slotHallSelections: {
        ...state.slotHallSelections,
        [key]: hallIds,
      },
    }));
  },

  autoSelectHallsForSlot: (targetDate?: string, targetSlot?: 'FN' | 'AN') => {
    const { timetable, students, halls, selectedExamDate, selectedExamSlot } = get();
    const date = targetDate || selectedExamDate;
    const slot = targetSlot || selectedExamSlot;
    const key = `${date}_${slot}`;

    // Get groups in this slot from timetable
    const slotEntries = timetable.filter((t) => t.date === date && t.sessionSlot === slot);
    let targetGroupIds = slotEntries.map((t) => t.groupId);
    if (targetGroupIds.length === 0) {
      targetGroupIds = Array.from(new Set(students.filter((s) => s.status === 'active').map((s) => s.groupId)));
    }

    const targetNormalized = targetGroupIds.map(normalizeGroupId);
    const scheduledStudents = students.filter(
      (s) => s.status === 'active' && targetNormalized.includes(normalizeGroupId(s.groupId))
    );
    const neededCap = scheduledStudents.length;

    // Calculate max students in any single conflict clique (same branch + same semester)
    const cliqueSizes: Record<string, number> = {};
    for (const s of scheduledStudents) {
      const b = normalizeBranch(s.branch);
      const sem = normalizeSemester(s.semester);
      const k = `${b}_${sem}`;
      cliqueSizes[k] = (cliqueSizes[k] || 0) + 1;
    }
    const maxCliqueSize = Math.max(0, ...Object.values(cliqueSizes));

    const availableHalls = halls
      .filter((h) => h.isAvailable)
      .sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

    const picked: string[] = [];
    let accTotal = 0;
    let accSingle = 0;
    for (const h of availableHalls) {
      picked.push(h.id);
      const cap = Math.min(h.capacity || 40, 40);
      const single = Math.floor(cap / 2);
      accTotal += cap;
      accSingle += single;
      if (accTotal >= neededCap && accSingle >= maxCliqueSize) break;
    }

    const finalPicked = picked.length > 0 ? picked : availableHalls.map((h) => h.id);

    set((state) => ({
      slotHallSelections: {
        ...state.slotHallSelections,
        [key]: finalPicked,
      },
    }));
    return finalPicked;
  },

  generateSeatingForSlot: async (targetDate?: string, targetSlot?: 'FN' | 'AN') => {
    const {
      currentSession,
      timetable,
      students,
      halls,
      selectedExamDate,
      selectedExamSlot,
      slotHallSelections,
    } = get();

    const date = targetDate || selectedExamDate;
    const slot = targetSlot || selectedExamSlot;
    const slotKey = `${date}_${slot}`;

    // 1. Identify which groups are scheduled in this slot from timetable
    const slotEntries = timetable.filter((t) => t.date === date && t.sessionSlot === slot);
    let targetGroupIds = slotEntries.map((t) => t.groupId);

    // If no timetable entries exist for this slot, fallback to all active groups
    if (targetGroupIds.length === 0) {
      targetGroupIds = Array.from(new Set(students.filter((s) => s.status === 'active').map((s) => s.groupId)));
    }

    // 2. Filter students belonging to these scheduled groups
    const targetNormalized = targetGroupIds.map(normalizeGroupId);
    const scheduledStudents = students.filter(
      (s) => s.status === 'active' && targetNormalized.includes(normalizeGroupId(s.groupId))
    );

    // Compute max students in any single conflict clique
    const cliqueSizes: Record<string, number> = {};
    for (const s of scheduledStudents) {
      const b = normalizeBranch(s.branch);
      const sem = normalizeSemester(s.semester);
      const k = `${b}_${sem}`;
      cliqueSizes[k] = (cliqueSizes[k] || 0) + 1;
    }
    const maxCliqueSize = Math.max(0, ...Object.values(cliqueSizes));

    // 3. Get halls selected for this slot or auto-pick if missing or insufficient
    let chosenHallIds = slotHallSelections[slotKey];
    const currentChosenObjs = halls.filter((h) => chosenHallIds && chosenHallIds.includes(h.id));
    const currentTotalCap = currentChosenObjs.reduce((sum, h) => sum + Math.min(h.capacity || 40, 40), 0);
    const currentSingleCap = currentChosenObjs.reduce(
      (sum, h) => sum + Math.floor(Math.min(h.capacity || 40, 40) / 2),
      0
    );

    if (
      !chosenHallIds ||
      chosenHallIds.length === 0 ||
      currentTotalCap < scheduledStudents.length ||
      currentSingleCap < maxCliqueSize
    ) {
      chosenHallIds = get().autoSelectHallsForSlot(date, slot);
    }

    // Filter Hall objects
    const candidateHalls = halls.filter((h) => chosenHallIds.includes(h.id));

    // 4. Run seating plan generator with chosen halls
    const result = generateSeatingPlan({
      students: scheduledStudents,
      halls: candidateHalls,
      maxHallCapacity: 40,
      useAllProvidedHalls: true,
    });

    // 5. Update state
    set((state) => ({
      slotSeatingResults: { ...state.slotSeatingResults, [slotKey]: result },
      ...(state.selectedExamDate === date && state.selectedExamSlot === slot
        ? { seatingResult: result }
        : {}),
    }));

    // 6. Persist to DB if in Electron
    if (api.isElectron) {
      await api.rawRun(
        `DELETE FROM seating_plans WHERE session_id = ? AND date = ? AND session_slot = ?`,
        [currentSession.id, date, slot]
      );

      for (const plan of result.hallPlans) {
        const planId = `${currentSession.id}_${date}_${slot}_${plan.hallId}`;
        await api.rawRun(
          `INSERT OR REPLACE INTO seating_plans (id, session_id, date, session_slot, hall_id, seat_assignments, is_locked, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId,
            currentSession.id,
            date,
            slot,
            plan.hallId,
            JSON.stringify(plan.seats),
            0,
            Date.now(),
          ]
        );
      }
    }
  },

  generateSeating: () => {
    const { selectedExamDate, selectedExamSlot, generateSeatingForSlot } = get();
    generateSeatingForSlot(selectedExamDate, selectedExamSlot);
  },

  swapSeats: async (hallId, seatNum1, seatNum2) => {
    const { seatingResult, halls, students, selectedExamDate, selectedExamSlot, currentSession } = get();
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

    const updatedResult: SeatingResult = {
      ...seatingResult,
      hallPlans: updatedPlans,
      violations,
      isValid: violations.filter((v) => v.severity === 'error').length === 0,
    };

    const key = `${selectedExamDate}_${selectedExamSlot}`;
    set((state) => ({
      seatingResult: updatedResult,
      slotSeatingResults: {
        ...state.slotSeatingResults,
        [key]: updatedResult,
      },
    }));

    if (api.isElectron) {
      const changedPlan = updatedPlans.find((p) => p.hallId === hallId);
      if (changedPlan) {
        const planId = `${currentSession.id}_${selectedExamDate}_${selectedExamSlot}_${hallId}`;
        await api.rawRun(
          `UPDATE seating_plans SET seat_assignments = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(changedPlan.seats), Date.now(), planId]
        );
      }
    }
  },

  setDutyAssignments: async (assignments: InvigilatorDutyAssignment[]) => {
    set({ invigilatorAssignments: assignments });
    if (api.isElectron) {
      const { currentSession } = get();
      await api.rawRun('DELETE FROM invigilator_duties WHERE session_id = ?', [currentSession.id]);
      for (const a of assignments) {
        await api.rawRun(
          `INSERT INTO invigilator_duties (id, session_id, date, session_slot, hall_id, staff_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.sessionId, a.date, a.sessionSlot, a.hallId, a.staffId, 'assigned']
        );
      }
    }
  },

  assignInvigilators: async () => {
    const { currentSession, seatingResult, slotSeatingResults, staff, timetable } = get();

    // Use dynamic timetable dates or session window dates (skipping Sundays)
    const datesFromTt = Array.from(new Set(timetable.map((t) => t.date)));
    const dates =
      datesFromTt.length > 0
        ? datesFromTt
        : getWorkingDatesInRange(currentSession.startDate, currentSession.endDate);

    const slotHallPlans: Record<string, HallSeatingPlan[]> = {};
    for (const [key, res] of Object.entries(slotSeatingResults)) {
      if (res && res.hallPlans.length > 0) {
        slotHallPlans[key] = res.hallPlans;
      }
    }

    const defaultPlans = seatingResult?.hallPlans || [];

    const result = autoAssignInvigilators({
      sessionId: currentSession.id,
      dates,
      slots: ['FN', 'AN'],
      hallPlans: defaultPlans,
      staffList: staff,
      slotHallPlans,
    });

    await get().setDutyAssignments(result.assignments);
  },

  addDutyAssignment: async (duty: InvigilatorDutyAssignment) => {
    // Remove any conflicting duty for the same staff at the exact date & slot, or for the same hall at the exact date & slot
    const updated = get().invigilatorAssignments.filter(
      (a) =>
        !(
          a.date === duty.date &&
          a.sessionSlot === duty.sessionSlot &&
          (a.staffId === duty.staffId || a.hallId === duty.hallId)
        )
    );
    updated.push(duty);
    set({ invigilatorAssignments: updated });

    if (api.isElectron) {
      await api.rawRun(
        `DELETE FROM invigilator_duties WHERE date = ? AND session_slot = ? AND (staff_id = ? OR hall_id = ?)`,
        [duty.date, duty.sessionSlot, duty.staffId, duty.hallId]
      );
      await api.rawRun(
        `INSERT OR REPLACE INTO invigilator_duties (id, session_id, date, session_slot, hall_id, staff_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [duty.id, duty.sessionId, duty.date, duty.sessionSlot, duty.hallId, duty.staffId, 'assigned']
      );
    }
  },

  updateDutyAssignment: async (duty: InvigilatorDutyAssignment) => {
    await get().addDutyAssignment(duty);
  },

  removeDutyAssignment: async (dutyId: string) => {
    set((state) => ({
      invigilatorAssignments: state.invigilatorAssignments.filter((a) => a.id !== dutyId),
    }));
    if (api.isElectron) {
      await api.rawRun(`DELETE FROM invigilator_duties WHERE id = ?`, [dutyId]);
    }
  },

  clearAllInvigilatorAssignments: async () => {
    const { currentSession } = get();
    set({ invigilatorAssignments: [] });
    if (api.isElectron) {
      await api.rawRun(`DELETE FROM invigilator_duties WHERE session_id = ?`, [currentSession.id]);
    }
  },

  updateStaffProgrammes: async (staffId: string, programmes: Programme[]) => {
    set((state) => ({
      staff: state.staff.map((s) => (s.id === staffId ? { ...s, programmes } : s)),
    }));
    if (api.isElectron) {
      await api.rawRun(`UPDATE staff SET programmes = ? WHERE id = ?`, [JSON.stringify(programmes), staffId]);
    }
  },

  toggleStaffProgramme: async (staffId: string, programme: Programme) => {
    const s = get().staff.find((st) => st.id === staffId);
    if (!s) return;
    const currentProgs = s.programmes || getStaffProgrammes(s);
    const newProgs = currentProgs.includes(programme)
      ? currentProgs.filter((p) => p !== programme)
      : [...currentProgs, programme];
    // Ensure at least one programme remains
    const finalProgs = newProgs.length > 0 ? newProgs : [programme];
    await get().updateStaffProgrammes(staffId, finalProgs);
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

  resetToDefaultSampleData: async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const key of Object.values(BROWSER_STORAGE_KEYS)) {
        localStorage.removeItem(key);
      }
    }
    seedBrowserDevData(set, get);
    const st = get();
    saveToLocalStorage({
      students: st.students,
      halls: st.halls,
      staff: st.staff,
      currentSession: st.currentSession,
      timetable: st.timetable,
      slotHallSelections: st.slotHallSelections,
      slotSeatingResults: st.slotSeatingResults,
      invigilatorAssignments: st.invigilatorAssignments,
      settings: st.settings,
      selectedExamDate: st.selectedExamDate,
      selectedExamSlot: st.selectedExamSlot,
    });
  },
}));

if (typeof window !== 'undefined' && !api.isElectron) {
  let saveTimeout: any = null;
  useAppStore.subscribe((state) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToLocalStorage({
        students: state.students,
        halls: state.halls,
        staff: state.staff,
        currentSession: state.currentSession,
        timetable: state.timetable,
        slotHallSelections: state.slotHallSelections,
        slotSeatingResults: state.slotSeatingResults,
        invigilatorAssignments: state.invigilatorAssignments,
        settings: state.settings,
        selectedExamDate: state.selectedExamDate,
        selectedExamSlot: state.selectedExamSlot,
      });
    }, 150);
  });
}

export function getPreSeededHalls(): Hall[] {
  return [
    { id: 'hall-b206', name: 'B 206', department: 'CS', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 1 },
    { id: 'hall-b207', name: 'B 207', department: 'CS', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 2 },
    { id: 'hall-d101', name: 'D 101', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 3 },
    { id: 'hall-d102', name: 'D 102', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 4 },
    { id: 'hall-d103', name: 'D 103', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 5 },
    { id: 'hall-d106', name: 'D 106', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 6 },
    { id: 'hall-d201', name: 'D 201', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 7 },
    { id: 'hall-d202', name: 'D 202', department: 'EC', capacity: 40, benchCount: 20, deskCount: 20, chairCount: 0, isAvailable: true, priorityOrder: 8 },
  ];
}

export function getPreSeededStaff(): Staff[] {
  return [
    { id: 'st-1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS A', isExamCellMember: true, programmes: ['B.Tech'] },
    { id: 'st-2', name: 'Flower Abraham', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S5 EC', isExamCellMember: true, programmes: ['B.Tech'] },
    { id: 'st-3', name: 'Manoj K R', designation: 'HOD', department: 'CS', isExamCellMember: true, programmes: ['B.Tech'] },
    { id: 'st-4', name: 'Adithya S Reji', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true, programmes: ['Diploma'] },
    { id: 'st-5', name: 'Al saheer', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true, programmes: ['Diploma'] },
    { id: 'st-6', name: 'Anjala Michael', designation: 'Lecturer', department: 'Diploma', isExamCellMember: true, programmes: ['Diploma'] },
    { id: 'st-7', name: 'Aparna A Nair', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S1', programmes: ['MCA'] },
    { id: 'st-8', name: 'Asiya Muhammed', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S5 CS B', programmes: ['B.Tech'] },
    { id: 'st-9', name: 'Athira Lal', designation: 'Assistant Professor', department: 'BCA', tutorOfGroup: 'BCA S3', programmes: ['BCA', 'MCA'] },
    { id: 'st-10', name: 'Athiralakshmi S', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S1 CS A', programmes: ['B.Tech'] },
    { id: 'st-11', name: 'Emmanuel Joy', designation: 'Assistant Professor', department: 'EC', tutorOfGroup: 'S3 EC', programmes: ['B.Tech'] },
    { id: 'st-12', name: 'Gincy Jose', designation: 'Assistant Professor', department: 'MCA', tutorOfGroup: 'MCA S3', programmes: ['MCA', 'BCA', 'B.Tech'] },
    { id: 'st-13', name: 'Haripriya S', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S5 CS A', programmes: ['B.Tech'] },
    { id: 'st-14', name: 'Jabin Mathew', designation: 'Lecturer', department: 'Diploma', tutorOfGroup: 'S5 AU', programmes: ['Diploma'] },
    { id: 'st-15', name: 'Jefcin Joseph', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S1 CS B', programmes: ['B.Tech'] },
    { id: 'st-16', name: 'Krishna Divakar', designation: 'Assistant Professor', department: 'EC', programmes: ['B.Tech'] },
    { id: 'st-17', name: 'Kripa Mathew', designation: 'Assistant Professor', department: 'CS', programmes: ['B.Tech'] },
    { id: 'st-18', name: 'Martin James', designation: 'Assistant Professor', department: 'Diploma', programmes: ['B.Tech', 'Diploma'] },
    { id: 'st-19', name: 'Priyanka Prasad', designation: 'Assistant Professor', department: 'CS', programmes: ['B.Tech'] },
    { id: 'st-20', name: 'Remya G Nair', designation: 'Assistant Professor', department: 'EC', programmes: ['B.Tech'] },
    { id: 'st-21', name: 'Sona Joseph', designation: 'Assistant Professor', department: 'MCA', programmes: ['MCA', 'BCA'] },
    { id: 'st-22', name: 'Sreeja Sivan', designation: 'Assistant Professor', department: 'Diploma', programmes: ['Diploma'] },
    { id: 'st-23', name: 'Sumana E X', designation: 'Assistant Professor', department: 'CS', programmes: ['B.Tech', 'Diploma'] },
    { id: 'st-24', name: 'Suneetha S', designation: 'Assistant Professor', department: 'EC', programmes: ['B.Tech'] },
    { id: 'st-25', name: 'Treesa Maria Sunny', designation: 'Assistant Professor', department: 'CS', tutorOfGroup: 'S3 CS B', programmes: ['B.Tech'] },
  ];
}

export function getPreSeededStudents(): Student[] {
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

  return students;
}

function seedBrowserDevData(set: any, get: any) {
  const halls = getPreSeededHalls();
  const staff = getPreSeededStaff();
  const students = getPreSeededStudents();
  const timetable = DEFAULT_TIMETABLE;
  const slotHallSelections: Record<string, string[]> = {
    '09/10/2026_FN': ['hall-b206', 'hall-b207'],
  };

  set({
    halls,
    staff,
    students,
    timetable,
    slotHallSelections,
    selectedExamDate: '09/10/2026',
    selectedExamSlot: 'FN',
  });
}

