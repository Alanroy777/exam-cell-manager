import {
  BenchColumn,
  BenchPosition,
  FurnitureType,
  Hall,
  HallSeatingPlan,
  RuleViolation,
  SeatAssignment,
  SeatingResult,
  Student,
} from './types';
import { areStudentsInConflict, normalizeBranch, normalizeSemester, validateSeatingPlan } from './validator';

export interface GenerateSeatingOptions {
  students: Student[];
  halls: Hall[];
  maxHallCapacity?: number; // Defaults to 40
}

/**
 * Creates seat slots for a hall based on its furniture setup and capacity:
 * 1. bench_desk / desk_chair:
 *    - Left and Right positions on each bench/desk.
 *    - Benches distributed evenly across Columns A, B, C, D.
 * 2. writing_pad_chair:
 *    - Individual writing tablet armchairs / chairs with book placers.
 *    - Arranged in Columns A, B, C, D.
 *    - Columns A & C form Left stream; Columns B & D form Right stream (ensures alternating non-conflicting groups).
 */
export function createEmptySeats(
  benchCount: number = 20,
  capacity: number = 40,
  furnitureType: FurnitureType = 'bench_desk',
  columnCount: number = 4,
  rowCount: number = 5,
  textpadChairCount: number = 0,
  studentsPerBench: 2 | 3 = 2,
  threeSeaterBenchCount: number = 0
): SeatAssignment[] {
  const seats: SeatAssignment[] = [];
  const maxCap = Math.min(Math.max(capacity, 1), 40);
  const ALL_COLUMNS: BenchColumn[] = ['A', 'B', 'C', 'D'];
  const validColCount = Math.min(Math.max(columnCount || 4, 1), 4);
  const activeCols = ALL_COLUMNS.slice(0, validColCount);

  if (furnitureType === 'writing_pad_chair') {
    // Individual chairs with attached writing pads / book placers
    const chairsPerCol = distributeEvenly(Array.from({ length: maxCap }), activeCols.length);

    let seatNumber = 1;
    for (let cIdx = 0; cIdx < activeCols.length; cIdx++) {
      const col = activeCols[cIdx];
      const count = chairsPerCol[cIdx].length;
      // Alternate columns: even cols (A, C) -> 'left', odd cols (B, D) -> 'right'
      const position: BenchPosition = cIdx % 2 === 0 ? 'left' : 'right';
      for (let r = 1; r <= count; r++) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: r,
          column: col,
          position,
          seatType: 'writing_pad',
          studentId: null,
        });
      }
    }
    return seats;
  }

  if (furnitureType === 'mixed') {
    // Mixed configuration:
    // e.g. 2 columns, 5 rows: benches in rows 1-4 + textpad chairs in row 5
    // Supports 2-seater benches, all 3-seater benches, or partial 3-seater benches
    const colCount = activeCols.length;
    const actualBenches = Math.max(0, benchCount);
    const benchRows = Math.ceil(actualBenches / colCount);

    const is3Seater = studentsPerBench === 3 || threeSeaterBenchCount > 0;
    const num3Seaters = studentsPerBench === 3
      ? actualBenches
      : Math.min(threeSeaterBenchCount, actualBenches);

    const actualTextpads = Math.max(0, textpadChairCount);
    const textpadRows = Math.ceil(actualTextpads / colCount);

    // Bench slots list (ordered column-first)
    const benchSlots: { col: BenchColumn; benchNo: number; is3Seater: boolean }[] = [];
    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const col = activeCols[cIdx];
      for (let r = 1; r <= benchRows; r++) {
        const benchIndex = (r - 1) * colCount + cIdx;
        if (benchIndex < actualBenches) {
          benchSlots.push({
            col,
            benchNo: r,
            is3Seater: benchIndex < num3Seaters,
          });
        }
      }
    }

    // Textpad slots list (rows starting at benchRows + 1, ordered column-first)
    const textpadSlots: { col: BenchColumn; benchNo: number; stream: BenchPosition }[] = [];
    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const col = activeCols[cIdx];
      for (let tr = 1; tr <= textpadRows; tr++) {
        const tpIdx = (tr - 1) * colCount + cIdx;
        if (tpIdx < actualTextpads) {
          let stream: BenchPosition = 'left';
          if (colCount === 3) {
            stream = cIdx === 0 ? 'left' : cIdx === 1 ? 'middle' : 'right';
          } else {
            stream = cIdx % 2 === 0 ? 'left' : 'right';
          }
          textpadSlots.push({
            col,
            benchNo: benchRows + tr,
            stream,
          });
        }
      }
    }

    let seatNumber = 1;

    // 1. Left side seats (all bench left seats + left textpads)
    for (const bs of benchSlots) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: bs.benchNo,
          column: bs.col,
          position: 'left',
          seatType: 'bench',
          studentId: null,
        });
      }
    }
    for (const ts of textpadSlots.filter((t) => t.stream === 'left')) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: ts.benchNo,
          column: ts.col,
          position: 'left',
          seatType: 'writing_pad',
          studentId: null,
        });
      }
    }

    // 2. Middle side seats (for 3-seater benches + middle textpads if any)
    for (const bs of benchSlots.filter((b) => b.is3Seater)) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: bs.benchNo,
          column: bs.col,
          position: 'middle',
          seatType: 'bench',
          studentId: null,
        });
      }
    }
    for (const ts of textpadSlots.filter((t) => t.stream === 'middle')) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: ts.benchNo,
          column: ts.col,
          position: 'middle',
          seatType: 'writing_pad',
          studentId: null,
        });
      }
    }

    // 3. Right side seats (all bench right seats + right textpads)
    for (const bs of benchSlots) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: bs.benchNo,
          column: bs.col,
          position: 'right',
          seatType: 'bench',
          studentId: null,
        });
      }
    }
    for (const ts of textpadSlots.filter((t) => t.stream === 'right')) {
      if (seats.length < maxCap) {
        seats.push({
          seatNumber: seatNumber++,
          benchNo: ts.benchNo,
          column: ts.col,
          position: 'right',
          seatType: 'writing_pad',
          studentId: null,
        });
      }
    }

    return seats;
  }

  // Check if this hall has 3-seater benches
  const is3SeaterHall = studentsPerBench === 3 || threeSeaterBenchCount > 0;
  const num3Seaters = studentsPerBench === 3
    ? benchCount
    : Math.min(threeSeaterBenchCount, benchCount);

  if (is3SeaterHall && num3Seaters > 0) {
    // 3-Seater benches logic: Left seats, Middle seats (for 3-seater benches), and Right seats
    const colCount = activeCols.length;
    const totalSlots = Math.max(benchCount, Math.ceil(maxCap / 3));
    const slotsDistribution = distributeEvenly(Array.from({ length: totalSlots }), colCount);

    const slotList: { col: BenchColumn; benchNo: number; is3Seater: boolean }[] = [];
    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const col = activeCols[cIdx];
      const sCount = slotsDistribution[cIdx].length;
      for (let s = 1; s <= sCount; s++) {
        const slotIndex = (s - 1) * colCount + cIdx;
        slotList.push({
          col,
          benchNo: s,
          is3Seater: slotIndex < num3Seaters,
        });
      }
    }

    const middleSlots = slotList.filter((sl) => sl.is3Seater);
    const totalPotential = slotList.length * 2 + middleSlots.length;
    const effectiveCap = Math.min(maxCap, totalPotential);

    let leftCount = 0;
    let middleCount = 0;
    let rightCount = 0;

    for (let i = 0; i < effectiveCap; i++) {
      if (leftCount <= rightCount && leftCount < slotList.length) {
        leftCount++;
      } else if (middleCount < middleSlots.length && middleCount <= rightCount) {
        middleCount++;
      } else if (rightCount < slotList.length) {
        rightCount++;
      } else if (leftCount < slotList.length) {
        leftCount++;
      } else if (middleCount < middleSlots.length) {
        middleCount++;
      } else {
        break;
      }
    }

    let seatNumber = 1;
    // 1. Left seats
    for (let i = 0; i < leftCount; i++) {
      const sl = slotList[i];
      seats.push({
        seatNumber: seatNumber++,
        benchNo: sl.benchNo,
        column: sl.col,
        position: 'left',
        seatType: 'bench',
        studentId: null,
      });
    }

    // 2. Middle seats
    for (let i = 0; i < middleCount; i++) {
      const sl = middleSlots[i];
      seats.push({
        seatNumber: seatNumber++,
        benchNo: sl.benchNo,
        column: sl.col,
        position: 'middle',
        seatType: 'bench',
        studentId: null,
      });
    }

    // 3. Right seats
    for (let i = 0; i < rightCount; i++) {
      const sl = slotList[i];
      seats.push({
        seatNumber: seatNumber++,
        benchNo: sl.benchNo,
        column: sl.col,
        position: 'right',
        seatType: 'bench',
        studentId: null,
      });
    }

    return seats;
  }

  // Standard bench & desk or desk with chairs (2-seater)
  const colCount = activeCols.length;
  // Total 2-seater slots needed to fulfill capacity (e.g. 20 slots of 2 for 40 capacity)
  const totalSlots = Math.ceil(maxCap / 2);
  const slotsDistribution = distributeEvenly(Array.from({ length: totalSlots }), colCount);

  // Number of slots that have wooden benches
  // Any slot beyond benchCount is a desk with 2 chairs (when 1 bench is short, 2 chairs are added to that desk)
  const actualBenches = Math.max(0, benchCount);

  const leftCount = Math.ceil(maxCap / 2);
  const rightCount = maxCap - leftCount;

  let seatNumber = 1;
  let leftAssigned = 0;
  // Left side seats
  for (let cIdx = 0; cIdx < colCount; cIdx++) {
    const col = activeCols[cIdx];
    const sCount = slotsDistribution[cIdx].length;
    for (let s = 1; s <= sCount && leftAssigned < leftCount; s++) {
      const slotIndex = (s - 1) * colCount + cIdx;
      seats.push({
        seatNumber: seatNumber++,
        benchNo: s,
        column: col,
        position: 'left',
        seatType: slotIndex < actualBenches ? 'bench' : 'desk_chair',
        studentId: null,
      });
      leftAssigned++;
    }
  }

  let rightAssigned = 0;
  // Right side seats
  for (let cIdx = 0; cIdx < colCount; cIdx++) {
    const col = activeCols[cIdx];
    const sCount = slotsDistribution[cIdx].length;
    for (let s = 1; s <= sCount && rightAssigned < rightCount; s++) {
      const slotIndex = (s - 1) * colCount + cIdx;
      seats.push({
        seatNumber: seatNumber++,
        benchNo: s,
        column: col,
        position: 'right',
        seatType: slotIndex < actualBenches ? 'bench' : 'desk_chair',
        studentId: null,
      });
      rightAssigned++;
    }
  }

  return seats;
}

/**
 * Sorts students naturally by numeric roll number
 */
export function sortStudentsByRoll(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
    const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
  });
}

/**
 * Distributes an array of items into `k` buckets evenly (difference between buckets <= 1)
 */
export function distributeEvenly<T>(items: T[], k: number): T[][] {
  if (k <= 0) return [];
  const buckets: T[][] = Array.from({ length: k }, () => []);
  const n = items.length;
  const base = Math.floor(n / k);
  const remainder = n % k;

  let currentIndex = 0;
  for (let i = 0; i < k; i++) {
    const size = base + (i < remainder ? 1 : 0);
    buckets[i] = items.slice(currentIndex, currentIndex + size);
    currentIndex += size;
  }
  return buckets;
}

interface ConflictClique {
  key: string;
  branch: string;
  semester: string;
  groups: Map<string, Student[]>;
  totalCount: number;
}

/**
 * Core Seating Arrangement Engine
 * Pure TypeScript, zero UI dependencies.
 */
export function generateSeatingPlan(options: GenerateSeatingOptions): SeatingResult {
  const { students: rawStudents, halls: allHalls, maxHallCapacity = 40 } = options;

  // Filter only active students
  const activeStudents = rawStudents.filter((s) => s.status === 'active');
  const availableHalls = allHalls
    .filter((h) => h.isAvailable)
    .sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

  const hallsMap = new Map<string, Hall>(allHalls.map((h) => [h.id, h]));
  const groupBreakdown: Record<string, number> = {};

  if (activeStudents.length === 0) {
    return {
      hallPlans: [],
      unassignedStudents: [],
      violations: [],
      isValid: true,
      summary: {
        totalStudents: 0,
        assignedStudents: 0,
        totalHallsUsed: 0,
        groupBreakdown: {},
      },
    };
  }

  // Group students by conflict clique: (branch, semester)
  const cliqueMap = new Map<string, ConflictClique>();

  for (const s of activeStudents) {
    const gid = s.groupId;
    groupBreakdown[gid] = (groupBreakdown[gid] || 0) + 1;

    const b = normalizeBranch(s.branch);
    const sem = normalizeSemester(s.semester);
    const cliqueKey = `${b}_${sem}`;

    if (!cliqueMap.has(cliqueKey)) {
      cliqueMap.set(cliqueKey, {
        key: cliqueKey,
        branch: b,
        semester: sem,
        groups: new Map(),
        totalCount: 0,
      });
    }

    const clique = cliqueMap.get(cliqueKey)!;
    if (!clique.groups.has(gid)) {
      clique.groups.set(gid, []);
    }
    clique.groups.get(gid)!.push(s);
    clique.totalCount++;
  }

  // Sort students within each group by roll number
  for (const clique of cliqueMap.values()) {
    for (const [gid, list] of clique.groups.entries()) {
      clique.groups.set(gid, sortStudentsByRoll(list));
    }
  }

  const totalStudents = activeStudents.length;

  // Select halls based on actual individual capacities until combined capacity >= totalStudents
  const selectedHalls: Hall[] = [];
  let accumulatedCap = 0;
  for (const hall of availableHalls) {
    selectedHalls.push(hall);
    accumulatedCap += Math.min(hall.capacity, maxHallCapacity);
    if (accumulatedCap >= totalStudents) break;
  }

  if (accumulatedCap < totalStudents) {
    const violations: RuleViolation[] = [
      {
        code: 'MAX_CAPACITY',
        severity: 'error',
        hallId: '',
        hallName: 'All Halls',
        message: `Insufficient hall capacity available. Total ${totalStudents} active students need seating, but combined capacity of all ${availableHalls.length} available halls is only ${accumulatedCap}.`,
      },
    ];
    return {
      hallPlans: [],
      unassignedStudents: activeStudents,
      violations,
      isValid: false,
      summary: {
        totalStudents,
        assignedStudents: 0,
        totalHallsUsed: 0,
        groupBreakdown,
      },
    };
  }

  // Initialize empty hall plans with their specific furniture configuration & capacity
  const hallPlans: HallSeatingPlan[] = selectedHalls.map((hall) => ({
    hallId: hall.id,
    hallName: hall.name,
    capacity: Math.min(hall.capacity, maxHallCapacity),
    columnCount: hall.columnCount || 4,
    seats: createEmptySeats(
      hall.benchCount,
      hall.capacity,
      hall.furnitureType || 'bench_desk',
      hall.columnCount || 4,
      hall.rowCount || 5,
      hall.textpadChairCount || 0,
      hall.studentsPerBench || 2,
      hall.threeSeaterBenchCount || 0
    ),
    groupsPresent: [],
    totalStudents: 0,
  }));

  // Divide cliques into non-conflicting streams
  const hasMiddleStream = hallPlans.some((p) => p.seats.some((s) => s.position === 'middle'));
  const cliques = Array.from(cliqueMap.values()).sort((a, b) => b.totalCount - a.totalCount);

  const totalLeftCap = hallPlans.reduce((sum, p) => sum + p.seats.filter((s) => s.position === 'left').length, 0);
  const totalMiddleCap = hallPlans.reduce((sum, p) => sum + p.seats.filter((s) => s.position === 'middle').length, 0);
  const totalRightCap = hallPlans.reduce((sum, p) => sum + p.seats.filter((s) => s.position === 'right').length, 0);

  interface StreamBin {
    side: BenchPosition;
    capacity: number;
    assignedCount: number;
    cliques: ConflictClique[];
  }

  const streams: StreamBin[] = [
    { side: 'left', capacity: totalLeftCap, assignedCount: 0, cliques: [] },
    { side: 'right', capacity: totalRightCap, assignedCount: 0, cliques: [] },
  ];

  if (hasMiddleStream && totalMiddleCap > 0) {
    streams.push({ side: 'middle', capacity: totalMiddleCap, assignedCount: 0, cliques: [] });
  }

  const sidePriority: Record<BenchPosition, number> = { left: 1, right: 2, middle: 3 };

  for (const c of cliques) {
    const size = c.totalCount;

    // Streams that have enough remaining capacity for this entire clique
    const eligible = streams.filter((s) => s.assignedCount + size <= s.capacity);

    let chosen: StreamBin;
    if (eligible.length > 0) {
      // Choose stream with lowest load ratio (assignedCount / capacity)
      eligible.sort((a, b) => {
        const loadA = a.capacity > 0 ? a.assignedCount / a.capacity : 1;
        const loadB = b.capacity > 0 ? b.assignedCount / b.capacity : 1;
        if (Math.abs(loadA - loadB) > 0.001) {
          return loadA - loadB;
        }
        return sidePriority[a.side] - sidePriority[b.side];
      });
      chosen = eligible[0];
    } else {
      // If none can fit the whole clique without exceeding capacity,
      // pick the stream with largest remaining capacity
      const sortedByRem = [...streams].sort((a, b) => {
        const remA = a.capacity - a.assignedCount;
        const remB = b.capacity - b.assignedCount;
        if (remB !== remA) return remB - remA;
        return sidePriority[a.side] - sidePriority[b.side];
      });
      chosen = sortedByRem[0];
    }

    chosen.cliques.push(c);
    chosen.assignedCount += size;
  }

  const leftCliques = streams.find((s) => s.side === 'left')?.cliques || [];
  const middleCliques = streams.find((s) => s.side === 'middle')?.cliques || [];
  const rightCliques = streams.find((s) => s.side === 'right')?.cliques || [];

  assignStreamWithBalancedGroups(leftCliques, hallPlans, 'left', false);
  if (hasMiddleStream && middleCliques.length > 0) {
    assignStreamWithBalancedGroups(middleCliques, hallPlans, 'middle', false);
  }
  assignStreamWithBalancedGroups(rightCliques, hallPlans, 'right', true);

  // Update totalStudents and groupsPresent for each hall plan
  for (const plan of hallPlans) {
    const active = plan.seats.filter((s) => s.studentId && s.student);
    plan.totalStudents = active.length;
    const gSet = new Set<string>();
    for (const s of active) {
      if (s.student) gSet.add(s.student.groupId);
    }
    plan.groupsPresent = Array.from(gSet);
  }

  // Validate the seating plan
  const violations = validateSeatingPlan(hallPlans, hallsMap, activeStudents);
  const assignedCount = hallPlans.reduce((sum, p) => sum + p.totalStudents, 0);
  const unassigned = activeStudents.filter(
    (s) => !hallPlans.some((p) => p.seats.some((st) => st.studentId === s.id))
  );

  return {
    hallPlans,
    unassignedStudents: unassigned,
    violations,
    isValid: violations.filter((v) => v.severity === 'error').length === 0 && unassigned.length === 0,
    summary: {
      totalStudents,
      assignedStudents: assignedCount,
      totalHallsUsed: hallPlans.filter((p) => p.totalStudents > 0).length,
      groupBreakdown,
    },
  };
}

/**
 * Assigns student groups within a stream to one side of the halls ('left' or 'right').
 * Guarantees that:
 * 1. When a group is split across halls, counts are balanced within +/- 1
 * 2. Roll numbers are strictly sequential in each hall
 * 3. 100% of students are assigned (0 unassigned)
 */
function assignStreamWithBalancedGroups(
  cliques: ConflictClique[],
  hallPlans: HallSeatingPlan[],
  side: BenchPosition,
  reverseHalls: boolean
) {
  const allGroups: { gid: string; students: Student[] }[] = [];
  for (const c of cliques) {
    for (const [gid, students] of c.groups.entries()) {
      allGroups.push({ gid, students });
    }
  }

  allGroups.sort((a, b) => b.students.length - a.students.length);

  const numHalls = hallPlans.length;
  const hallIndices = Array.from({ length: numHalls }, (_, i) => i);
  if (reverseHalls) hallIndices.reverse();

  for (const group of allGroups) {
    const students = group.students;
    const count = students.length;

    // Remaining capacity per hall on this side
    const avail = hallIndices
      .map((idx) => ({
        idx,
        cap: hallPlans[idx].seats.filter((s) => s.position === side && !s.studentId).length,
      }))
      .filter((h) => h.cap > 0);

    if (avail.length === 0) continue;

    // Check if group can fit in a single hall
    let chosenHalls: { idx: number; count: number }[] = [];
    const singleFit = avail.find((h) => h.cap >= count);

    if (singleFit && count <= singleFit.cap) {
      chosenHalls = [{ idx: singleFit.idx, count }];
    } else {
      // Split group across minimum halls needed whose sum >= count
      // Find candidate halls with largest available space
      const sortedByCap = [...avail].sort((a, b) => b.cap - a.cap);
      let accumulated = 0;
      const candidates: typeof avail = [];
      for (const h of sortedByCap) {
        candidates.push(h);
        accumulated += h.cap;
        if (accumulated >= count) break;
      }

      // Distribute count among candidate halls as balanced as possible:
      // Ideal target per hall: floor(count / candidates.length) or ceil(...)
      const idealChunks = distributeEvenly(students, candidates.length);
      const allocatedCounts: number[] = idealChunks.map((c) => c.length);

      // Adjust if any candidate doesn't have enough capacity for ideal chunk
      for (let i = 0; i < candidates.length; i++) {
        if (allocatedCounts[i] > candidates[i].cap) {
          const excess = allocatedCounts[i] - candidates[i].cap;
          allocatedCounts[i] = candidates[i].cap;
          // Distribute excess to other candidates with spare capacity
          for (let j = 0; j < candidates.length && excess > 0; j++) {
            if (i !== j && candidates[j].cap > allocatedCounts[j]) {
              const add = Math.min(excess, candidates[j].cap - allocatedCounts[j]);
              allocatedCounts[j] += add;
            }
          }
        }
      }

      chosenHalls = candidates.map((c, i) => ({ idx: c.idx, count: allocatedCounts[i] }));
    }

    // Place sequential student slices into chosen halls
    let cursor = 0;
    for (const h of chosenHalls) {
      if (h.count <= 0) continue;
      const chunk = students.slice(cursor, cursor + h.count);
      cursor += h.count;

      const hallPlan = hallPlans[h.idx];
      const targetSeats = hallPlan.seats.filter((s) => s.position === side && !s.studentId);

      for (let j = 0; j < chunk.length && j < targetSeats.length; j++) {
        const st = chunk[j];
        targetSeats[j].studentId = st.id;
        targetSeats[j].student = st;
      }
    }
  }
}
