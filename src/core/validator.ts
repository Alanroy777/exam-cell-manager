import { Hall, HallSeatingPlan, RuleViolation, Student } from './types';

/**
 * Normalizes branch strings (e.g., 'CSE', 'CS', 'Computer Science' -> 'CS')
 */
export function normalizeBranch(branch: string): string {
  const b = branch.trim().toUpperCase();
  if (b.includes('COMP') || b === 'CSE' || b === 'CS' || b === 'CT') {
    if (b === 'CT') return 'CT';
    return 'CS';
  }
  if (b.includes('ELECTRONIC') || b === 'ECE' || b === 'EC') return 'EC';
  if (b.includes('ELECTRICAL') || b === 'EEE') return 'EEE';
  if (b.includes('AUTO') || b === 'AU') return 'AU';
  if (b.includes('MCA')) return 'MCA';
  if (b.includes('BCA')) return 'BCA';
  return b;
}

/**
 * Normalizes semester strings (e.g., '1', 'S1', 'Semester 1', 'V' -> 'S1', 'S5')
 */
export function normalizeSemester(sem: string): string {
  const s = sem.trim().toUpperCase();
  if (s === 'I' || s === '1' || s === 'S1') return 'S1';
  if (s === 'II' || s === '2' || s === 'S2') return 'S2';
  if (s === 'III' || s === '3' || s === 'S3') return 'S3';
  if (s === 'IV' || s === '4' || s === 'S4') return 'S4';
  if (s === 'V' || s === '5' || s === 'S5') return 'S5';
  if (s === 'VI' || s === '6' || s === 'S6') return 'S6';
  if (s === 'VII' || s === '7' || s === 'S7') return 'S7';
  if (s === 'VIII' || s === '8' || s === 'S8') return 'S8';
  if (s.startsWith('S')) return s;
  return `S${s}`;
}

/**
 * Normalizes group IDs to institutional standard format
 * e.g. "S3 BCA" -> "BCA S3", "BCA S3" -> "BCA S3"
 *      "S1 MCA" -> "MCA S1", "MCA S1" -> "MCA S1"
 *      "S3 CSE A", "S3 A" -> "S3 CS A"
 *      "S5 CSE B", "S5 B" -> "S5 CS B"
 *      "S7", "S7 CSE" -> "S7 CS"
 *      "S5 ECE" -> "S5 EC"
 */
export function normalizeGroupId(groupId: string): string {
  if (!groupId) return '';
  const trimmed = groupId.trim();

  // Diploma: e.g. "Diploma S1", "S1 Diploma", "DIP S3", "S3 DIP"
  const dipMatch = trimmed.match(/\b(?:S([1-6])[\s_-]*(?:DIPLOMA|DIP)|(?:DIPLOMA|DIP)[\s_-]*S([1-6]))\b/i);
  if (dipMatch) {
    const sem = dipMatch[1] || dipMatch[2];
    return `Diploma S${sem}`;
  }

  // BCA: e.g. "S3 BCA", "BCA S3", "BCA-S3" -> "BCA S3"
  const bcaMatch = trimmed.match(/\b(?:S([1-6])[\s_-]*BCA|BCA[\s_-]*S([1-6]))\b/i);
  if (bcaMatch) {
    const sem = bcaMatch[1] || bcaMatch[2];
    return `BCA S${sem}`;
  }

  // MCA: e.g. "S1 MCA", "MCA S1", "S3 MCA", "MCA S3" -> "MCA S1" / "MCA S3"
  const mcaMatch = trimmed.match(/\b(?:S([1-4])[\s_-]*MCA|MCA[\s_-]*S([1-4]))\b/i);
  if (mcaMatch) {
    const sem = mcaMatch[1] || mcaMatch[2];
    return `MCA S${sem}`;
  }

  // B.Tech S7: e.g. "S7", "S7 CS", "S7 CSE", "B.Tech S7", "BTECH S7", "S7-CS" -> "S7 CS"
  if (/^S7[\s_-]*(?:CS|CSE)?$/i.test(trimmed) || /^(?:B\.?TECH[\s_-]*)?S7[\s_-]*(?:CSE?)?$/i.test(trimmed)) {
    return 'S7 CS';
  }

  // B.Tech CS with batches: e.g. "S3 CS A", "S3 CSE A", "S3 A", "S5 CS B", "S5 B", "S3-CS-A" -> "S3 CS A" / "S5 CS B"
  const csBatchMatch = trimmed.match(/^S([1-8])[\s_-]*(?:CS|CSE)?[\s_-]*([A-C])$/i);
  if (csBatchMatch) {
    return `S${csBatchMatch[1]} CS ${csBatchMatch[2].toUpperCase()}`;
  }

  // B.Tech EC: e.g. "S5 EC", "S5 ECE", "S3 EC", "S3 ECE", "S5EC" -> "S5 EC" / "S3 EC"
  const ecMatch = trimmed.match(/^S([1-8])[\s_-]*(?:EC|ECE)$/i);
  if (ecMatch) {
    return `S${ecMatch[1]} EC`;
  }

  // B.Tech general: e.g. "S3 CS", "S5 CS", "S3CS"
  const csGeneralMatch = trimmed.match(/^S([1-8])[\s_-]*(?:CS|CSE)$/i);
  if (csGeneralMatch) {
    return `S${csGeneralMatch[1]} CS`;
  }

  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Check if two students are in conflict sitting adjacent on the same bench.
 * Rule: Same branch AND same semester must NEVER sit together, regardless of batch.
 */
export function areStudentsInConflict(s1: Student, s2: Student): { conflict: boolean; reason?: string } {
  const b1 = normalizeBranch(s1.branch);
  const b2 = normalizeBranch(s2.branch);
  const sem1 = normalizeSemester(s1.semester);
  const sem2 = normalizeSemester(s2.semester);

  if (b1 === b2 && sem1 === sem2) {
    return {
      conflict: true,
      reason: `Both students belong to ${b1} ${sem1} (Cannot sit on same bench even if different batches: ${s1.batch || 'Main'} vs ${s2.batch || 'Main'})`
    };
  }

  return { conflict: false };
}

/**
 * Validates an entire seating arrangement against all KTU/CEP exam cell rules.
 */
export function validateSeatingPlan(
  hallPlans: HallSeatingPlan[],
  hallsMap: Map<string, Hall>,
  allStudents: Student[]
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Track group counts per hall for balance check
  // Key: groupId -> Map<hallId, count>
  const groupHallCounts = new Map<string, Map<string, number>>();

  for (const plan of hallPlans) {
    const hall = hallsMap.get(plan.hallId);
    const capacityLimit = hall ? Math.min(hall.capacity, 40) : 40;

    // Rule 1: Maximum 40 students per hall (or hall's own capacity if lower)
    const activeSeats = plan.seats.filter(s => s.studentId && s.student);
    if (activeSeats.length > capacityLimit) {
      violations.push({
        code: 'MAX_CAPACITY',
        severity: 'error',
        hallId: plan.hallId,
        hallName: plan.hallName,
        message: `Hall ${plan.hallName} exceeds capacity of ${capacityLimit}. Seated: ${activeSeats.length} students.`,
      });
    }

    // Rule 2 & 3: Check bench adjacency (2-seater and 3-seater benches)
    // Group seats by bench (benchNo, column)
    const benches = new Map<
      string,
      {
        left?: Student;
        middle?: Student;
        right?: Student;
        leftSeat?: number;
        middleSeat?: number;
        rightSeat?: number;
      }
    >();

    for (const seat of plan.seats) {
      const key = `${seat.column}-${seat.benchNo}`;
      const bench = benches.get(key) || {};
      if (seat.position === 'left') {
        bench.left = seat.student;
        bench.leftSeat = seat.seatNumber;
      } else if (seat.position === 'middle') {
        bench.middle = seat.student;
        bench.middleSeat = seat.seatNumber;
      } else {
        bench.right = seat.student;
        bench.rightSeat = seat.seatNumber;
      }
      benches.set(key, bench);

      // Count students per group for balance rule
      if (seat.student) {
        const gid = seat.student.groupId;
        if (!groupHallCounts.has(gid)) {
          groupHallCounts.set(gid, new Map());
        }
        const hallMap = groupHallCounts.get(gid)!;
        hallMap.set(plan.hallId, (hallMap.get(plan.hallId) || 0) + 1);
      }
    }

    // Check each bench for conflicts between any pair seated on it
    for (const [benchKey, bench] of benches.entries()) {
      // 1. Left vs Right
      if (bench.left && bench.right) {
        const check = areStudentsInConflict(bench.left, bench.right);
        if (check.conflict) {
          violations.push({
            code: 'SAME_SEM_BRANCH_ADJACENT',
            severity: 'error',
            hallId: plan.hallId,
            hallName: plan.hallName,
            message: `Bench ${benchKey} in ${plan.hallName} has conflicting students seated together (Left & Right): ${bench.left.name} (${bench.left.groupId}) and ${bench.right.name} (${bench.right.groupId}). ${check.reason}`,
            seatNumbers: [bench.leftSeat || 0, bench.rightSeat || 0],
            studentIds: [bench.left.id, bench.right.id],
          });
        }
      }
      // 2. Left vs Middle
      if (bench.left && bench.middle) {
        const check = areStudentsInConflict(bench.left, bench.middle);
        if (check.conflict) {
          violations.push({
            code: 'SAME_SEM_BRANCH_ADJACENT',
            severity: 'error',
            hallId: plan.hallId,
            hallName: plan.hallName,
            message: `Bench ${benchKey} in ${plan.hallName} has conflicting students seated together (Left & Middle): ${bench.left.name} (${bench.left.groupId}) and ${bench.middle.name} (${bench.middle.groupId}). ${check.reason}`,
            seatNumbers: [bench.leftSeat || 0, bench.middleSeat || 0],
            studentIds: [bench.left.id, bench.middle.id],
          });
        }
      }
      // 3. Middle vs Right
      if (bench.middle && bench.right) {
        const check = areStudentsInConflict(bench.middle, bench.right);
        if (check.conflict) {
          violations.push({
            code: 'SAME_SEM_BRANCH_ADJACENT',
            severity: 'error',
            hallId: plan.hallId,
            hallName: plan.hallName,
            message: `Bench ${benchKey} in ${plan.hallName} has conflicting students seated together (Middle & Right): ${bench.middle.name} (${bench.middle.groupId}) and ${bench.right.name} (${bench.right.groupId}). ${check.reason}`,
            seatNumbers: [bench.middleSeat || 0, bench.rightSeat || 0],
            studentIds: [bench.middle.id, bench.right.id],
          });
        }
      }
    }

    // Check adjacent single textpad chairs in the same row
    const rowChairs = new Map<number, { col: string; seat: number; student: Student }[]>();
    for (const seat of plan.seats) {
      if (seat.seatType === 'writing_pad' && seat.student) {
        const list = rowChairs.get(seat.benchNo) || [];
        list.push({ col: seat.column, seat: seat.seatNumber, student: seat.student });
        rowChairs.set(seat.benchNo, list);
      }
    }
    for (const [rNo, list] of rowChairs.entries()) {
      list.sort((a, b) => a.col.localeCompare(b.col));
      for (let i = 0; i < list.length - 1; i++) {
        const s1 = list[i];
        const s2 = list[i + 1];
        const colDiff = Math.abs(s1.col.charCodeAt(0) - s2.col.charCodeAt(0));
        if (colDiff === 1) {
          const check = areStudentsInConflict(s1.student, s2.student);
          if (check.conflict) {
            violations.push({
              code: 'SAME_SEM_BRANCH_ADJACENT',
              severity: 'error',
              hallId: plan.hallId,
              hallName: plan.hallName,
              message: `Row ${rNo} adjacent textpad chairs (Col ${s1.col} & ${s2.col}) in ${plan.hallName} have conflicting students: ${s1.student.name} (${s1.student.groupId}) and ${s2.student.name} (${s2.student.groupId}). ${check.reason}`,
              seatNumbers: [s1.seat, s2.seat],
              studentIds: [s1.student.id, s2.student.id],
            });
          }
        }
      }
    }
  }

  // Rule 4: Balance Rule Check
  // When a group is split across halls, the split must be balanced within +/- 1 student
  for (const [groupId, hallMap] of groupHallCounts.entries()) {
    if (hallMap.size > 1) {
      const counts = Array.from(hallMap.values());
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      if (maxCount - minCount > 1) {
        // Find halls involved
        const distribution = Array.from(hallMap.entries())
          .map(([hId, c]) => {
            const h = hallsMap.get(hId);
            return `${h ? h.name : hId}: ${c}`;
          })
          .join(', ');

        violations.push({
          code: 'UNEVEN_SPLIT',
          severity: 'warning',
          hallId: '',
          hallName: 'All Halls',
          message: `Group ${groupId} is split unevenly across halls (${distribution}). Difference exceeds 1 student.`,
        });
      }
    }
  }

  return violations;
}

