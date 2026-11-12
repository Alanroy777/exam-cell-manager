import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  rollNo: text('roll_no').notNull(),
  registerNo: text('register_no'),
  name: text('name').notNull(),
  programme: text('programme').notNull(),
  branch: text('branch').notNull(),
  semester: text('semester').notNull(),
  batch: text('batch'),
  status: text('status').notNull().default('active'), // 'active' | 'dropped'
  groupId: text('group_id').notNull(),
  createdAt: integer('created_at').notNull().default(Date.now()),
});

export const halls = sqliteTable('halls', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  furnitureType: text('furniture_type').notNull().default('bench_desk'),
  studentsPerBench: integer('students_per_bench').notNull().default(2),
  threeSeaterBenchCount: integer('three_seater_bench_count').notNull().default(0),
  columnCount: integer('column_count').notNull().default(4),
  rowCount: integer('row_count').notNull().default(5),
  benchCount: integer('bench_count').notNull().default(20),
  textpadChairCount: integer('textpad_chair_count').notNull().default(0),
  deskCount: integer('desk_count').notNull().default(20),
  chairCount: integer('chair_count').notNull().default(0),
  capacity: integer('capacity').notNull().default(40),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  priorityOrder: integer('priority_order').notNull().default(0),
});

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  designation: text('designation').notNull(),
  department: text('department').notNull(),
  tutorOfGroup: text('tutor_of_group'),
  isExamCellMember: integer('is_exam_cell_member', { mode: 'boolean' }).notNull().default(false),
  maxDutiesPerSession: integer('max_duties_per_session').notNull().default(5),
  contactNumber: text('contact_number'),
  email: text('email'),
});

export const examSessions = sqliteTable('exam_sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  academicYear: text('academic_year').notNull(),
  sessionType: text('session_type').notNull(), // 'First Series' | 'Second Series'
  semesterType: text('semester_type').notNull(), // 'odd' | 'even'
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  defaultTime: text('default_time').notNull().default('10.15 AM - 12.15 PM'),
  programmesIncluded: text('programmes_included').notNull(), // JSON array
  signatoryConvener: text('signatory_convener').notNull().default('Exam Cell Convener'),
  signatoryHod: text('signatory_hod').notNull().default('Principal / HOD'),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
});

export const timetableEntries = sqliteTable('timetable_entries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  date: text('date').notNull(),
  sessionSlot: text('session_slot').notNull(), // 'FN' | 'AN'
  timeRange: text('time_range').notNull(),
  groupId: text('group_id').notNull(),
  subjectCode: text('subject_code').notNull(),
  subjectName: text('subject_name').notNull(),
});

export const seatingPlans = sqliteTable('seating_plans', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  date: text('date').notNull(),
  sessionSlot: text('session_slot').notNull(), // 'FN' | 'AN'
  hallId: text('hall_id').notNull(),
  seatAssignments: text('seat_assignments').notNull(), // JSON SeatAssignment[]
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});

export const invigilatorDuties = sqliteTable('invigilator_duties', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  date: text('date').notNull(),
  sessionSlot: text('session_slot').notNull(),
  hallId: text('hall_id').notNull(),
  staffId: text('staff_id').notNull(),
  status: text('status').notNull().default('assigned'),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

