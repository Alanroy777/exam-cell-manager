import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

let sqliteDb: Database.Database | null = null;
let ormDb: ReturnType<typeof drizzle> | null = null;
let currentDbPath: string = '';

export function getDbPath(userDataPath?: string): string {
  if (userDataPath) {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'exam_cell_manager.db');
  }
  const defaultDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return path.join(defaultDir, 'exam_cell_manager.db');
}

export function initDatabase(dbPath?: string) {
  if (sqliteDb) {
    sqliteDb.close();
  }
  currentDbPath = dbPath || getDbPath();
  sqliteDb = new Database(currentDbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  // Run initial schema DDL migrations
  runMigrations(sqliteDb);

  ormDb = drizzle(sqliteDb, { schema });
  seedDefaultData(sqliteDb);

  return { sqliteDb, ormDb, dbPath: currentDbPath };
}

export function getDb() {
  if (!ormDb) {
    initDatabase();
  }
  return ormDb!;
}

export function getSqliteDb() {
  if (!sqliteDb) {
    initDatabase();
  }
  return sqliteDb!;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      roll_no TEXT NOT NULL,
      register_no TEXT,
      name TEXT NOT NULL,
      programme TEXT NOT NULL,
      branch TEXT NOT NULL,
      semester TEXT NOT NULL,
      batch TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      group_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS halls (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      furniture_type TEXT NOT NULL DEFAULT 'bench_desk',
      students_per_bench INTEGER NOT NULL DEFAULT 2,
      three_seater_bench_count INTEGER NOT NULL DEFAULT 0,
      column_count INTEGER NOT NULL DEFAULT 4,
      row_count INTEGER NOT NULL DEFAULT 5,
      bench_count INTEGER NOT NULL DEFAULT 20,
      textpad_chair_count INTEGER NOT NULL DEFAULT 0,
      desk_count INTEGER NOT NULL DEFAULT 20,
      chair_count INTEGER NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 40,
      is_available INTEGER NOT NULL DEFAULT 1,
      priority_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      tutor_of_group TEXT,
      is_exam_cell_member INTEGER NOT NULL DEFAULT 0,
      max_duties_per_session INTEGER NOT NULL DEFAULT 5,
      contact_number TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      session_type TEXT NOT NULL,
      semester_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      default_time TEXT NOT NULL DEFAULT '10.15 AM - 12.15 PM',
      programmes_included TEXT NOT NULL,
      signatory_convener TEXT NOT NULL DEFAULT 'Exam Cell Convener',
      signatory_hod TEXT NOT NULL DEFAULT 'Principal / HOD',
      is_current INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      date TEXT NOT NULL,
      session_slot TEXT NOT NULL,
      time_range TEXT NOT NULL,
      group_id TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seating_plans (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      date TEXT NOT NULL,
      session_slot TEXT NOT NULL,
      hall_id TEXT NOT NULL,
      seat_assignments TEXT NOT NULL,
      is_locked INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invigilator_duties (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      date TEXT NOT NULL,
      session_slot TEXT NOT NULL,
      hall_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned'
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  try {
    db.exec(`ALTER TABLE halls ADD COLUMN furniture_type TEXT NOT NULL DEFAULT 'bench_desk';`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE halls ADD COLUMN column_count INTEGER NOT NULL DEFAULT 4;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE halls ADD COLUMN row_count INTEGER NOT NULL DEFAULT 5;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE halls ADD COLUMN textpad_chair_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE halls ADD COLUMN students_per_bench INTEGER NOT NULL DEFAULT 2;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE halls ADD COLUMN three_seater_bench_count INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
  }
  try {
    // Correct chair_count for standard bench_desk halls where it was mistakenly seeded as 40
    db.exec(`
      UPDATE halls 
      SET chair_count = CASE 
        WHEN desk_count > bench_count THEN MAX(0, (desk_count - bench_count) * 2)
        ELSE 0 
      END
      WHERE chair_count >= 38 AND (furniture_type = 'bench_desk' OR furniture_type IS NULL);
    `);
  } catch {
    // Ignore migration error
  }
}

function seedDefaultData(db: Database.Database) {
  // Check if halls exist, if not seed default CEP exam halls
  const hallCount = db.prepare('SELECT count(*) as count FROM halls').get() as { count: number };
  if (hallCount.count === 0) {
    const defaultHalls = [
      { id: 'hall-b206', name: 'B 206', department: 'CS', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 1 },
      { id: 'hall-b207', name: 'B 207', department: 'CS', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 2 },
      { id: 'hall-d101', name: 'D 101', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 3 },
      { id: 'hall-d102', name: 'D 102', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 4 },
      { id: 'hall-d103', name: 'D 103', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 5 },
      { id: 'hall-d106', name: 'D 106', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 6 },
      { id: 'hall-d201', name: 'D 201', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 7 },
      { id: 'hall-d202', name: 'D 202', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 8 },
      { id: 'hall-d205', name: 'D 205', department: 'EC', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 9 },
      { id: 'hall-b303', name: 'B 303', department: 'CS', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 10 },
      { id: 'hall-a101', name: 'A 101', department: 'Diploma', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 11 },
      { id: 'hall-e101', name: 'E 101', department: 'Diploma', capacity: 40, bench: 20, desk: 20, chair: 0, prio: 12 },
    ];

    const insertHall = db.prepare(`
      INSERT INTO halls (id, name, department, furniture_type, column_count, row_count, bench_count, textpad_chair_count, desk_count, chair_count, capacity, is_available, priority_order)
      VALUES (@id, @name, @department, 'bench_desk', 4, 5, @bench, 0, @desk, @chair, @capacity, 1, @prio)
    `);

    const insertMany = db.transaction((hallsList) => {
      for (const h of hallsList) insertHall.run(h);
    });
    insertMany(defaultHalls);
  }

  // Check if staff exist, if not seed from reference duty list & prompt
  const staffCount = db.prepare('SELECT count(*) as count FROM staff').get() as { count: number };
  if (staffCount.count === 0) {
    const defaultStaff = [
      { id: 'staff-1', name: 'Rajesh K R', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S3 CS A', examCell: 1 },
      { id: 'staff-2', name: 'Flower Abraham', designation: 'Assistant Professor', department: 'EC', tutorOf: 'S5 EC', examCell: 1 },
      { id: 'staff-3', name: 'Manoj K R', designation: 'HOD', department: 'CS', tutorOf: '', examCell: 1 },
      { id: 'staff-4', name: 'Adithya S Reji', designation: 'Lecturer', department: 'Diploma', tutorOf: 'S3 EEE', examCell: 1 },
      { id: 'staff-5', name: 'Al saheer', designation: 'Lecturer', department: 'Diploma', tutorOf: 'S5 CT', examCell: 1 },
      { id: 'staff-6', name: 'Anjala Michael', designation: 'Lecturer', department: 'Diploma', tutorOf: 'S3 AU', examCell: 1 },
      { id: 'staff-7', name: 'Aparna A Nair', designation: 'Assistant Professor', department: 'MCA', tutorOf: 'MCA S1', examCell: 0 },
      { id: 'staff-8', name: 'Asiya Muhammed', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S5 CS B', examCell: 0 },
      { id: 'staff-9', name: 'Athira Lal', designation: 'Assistant Professor', department: 'BCA', tutorOf: 'BCA S3', examCell: 0 },
      { id: 'staff-10', name: 'Athiralakshmi S', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S1 CS A', examCell: 0 },
      { id: 'staff-11', name: 'Emmanuel Joy', designation: 'Assistant Professor', department: 'EC', tutorOf: 'S3 EC', examCell: 0 },
      { id: 'staff-12', name: 'Gincy Jose', designation: 'Assistant Professor', department: 'MCA', tutorOf: 'MCA S3', examCell: 0 },
      { id: 'staff-13', name: 'Haripriya S', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S5 CS A', examCell: 0 },
      { id: 'staff-14', name: 'Jabin Mathew', designation: 'Lecturer', department: 'Diploma', tutorOf: 'S5 AU', examCell: 0 },
      { id: 'staff-15', name: 'Jefcin Joseph', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S1 CS B', examCell: 0 },
      { id: 'staff-16', name: 'Krishna Divakar', designation: 'Assistant Professor', department: 'EC', tutorOf: '', examCell: 0 },
      { id: 'staff-17', name: 'Kripa Mathew', designation: 'Assistant Professor', department: 'CS', tutorOf: '', examCell: 0 },
      { id: 'staff-18', name: 'Martin James', designation: 'Assistant Professor', department: 'Diploma', tutorOf: '', examCell: 0 },
      { id: 'staff-19', name: 'Priyanka Prasad', designation: 'Assistant Professor', department: 'CS', tutorOf: '', examCell: 0 },
      { id: 'staff-20', name: 'Remya G Nair', designation: 'Assistant Professor', department: 'EC', tutorOf: '', examCell: 0 },
      { id: 'staff-21', name: 'Sona Joseph', designation: 'Assistant Professor', department: 'MCA', tutorOf: '', examCell: 0 },
      { id: 'staff-22', name: 'Sreeja Sivan', designation: 'Assistant Professor', department: 'Diploma', tutorOf: '', examCell: 0 },
      { id: 'staff-23', name: 'Sumana E X', designation: 'Assistant Professor', department: 'CS', tutorOf: '', examCell: 0 },
      { id: 'staff-24', name: 'Suneetha S', designation: 'Assistant Professor', department: 'EC', tutorOf: '', examCell: 0 },
      { id: 'staff-25', name: 'Treesa Maria Sunny', designation: 'Assistant Professor', department: 'CS', tutorOf: 'S3 CS B', examCell: 0 },
    ];

    const insertStaff = db.prepare(`
      INSERT INTO staff (id, name, designation, department, tutor_of_group, is_exam_cell_member, max_duties_per_session)
      VALUES (@id, @name, @designation, @department, @tutorOf, @examCell, 5)
    `);

    const insertManyStaff = db.transaction((staffList) => {
      for (const s of staffList) insertStaff.run(s);
    });
    insertManyStaff(defaultStaff);
  }

  // Check if active exam session exists, if not seed default
  const sessionCount = db.prepare('SELECT count(*) as count FROM exam_sessions').get() as { count: number };
  if (sessionCount.count === 0) {
    db.prepare(`
      INSERT INTO exam_sessions (id, name, academic_year, session_type, semester_type, start_date, end_date, default_time, programmes_included, signatory_convener, signatory_hod, is_current)
      VALUES ('session-oct-2026', 'Second Series Exam, Odd Sem 2026', '2026-27', 'Second Series', 'odd', '09/10/2026', '16/10/2026', '10.15 AM - 12.15 PM', '["B.Tech", "MCA", "BCA", "Diploma"]', 'Exam Cell Convener', 'Principal', 1)
    `).run();
  }
}

export function backupDatabase(destFilePath: string): boolean {
  if (!sqliteDb || !currentDbPath) return false;
  try {
    // Check if destination directory exists
    const dir = path.dirname(destFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Checkpoint WAL before copying
    sqliteDb.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(currentDbPath, destFilePath);
    return true;
  } catch (err) {
    console.error('Backup error:', err);
    return false;
  }
}

export function restoreDatabase(sourceFilePath: string): boolean {
  try {
    if (!fs.existsSync(sourceFilePath)) return false;
    if (sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    }
    fs.copyFileSync(sourceFilePath, currentDbPath);
    initDatabase(currentDbPath);
    return true;
  } catch (err) {
    console.error('Restore error:', err);
    return false;
  }
}

