import {
  HallSeatingPlan,
  InvigilatorConflict,
  InvigilatorDutyAssignment,
  Programme,
  Staff,
} from './types';

export interface AutoAssignInvigilatorsOptions {
  sessionId: string;
  dates: string[];
  slots: ('FN' | 'AN')[];
  hallPlans: HallSeatingPlan[]; // Default hall plans
  staffList: Staff[];
  existingAssignments?: InvigilatorDutyAssignment[];
  slotHallPlans?: Record<string, HallSeatingPlan[]>; // Optional per-slot plans: `${date}_${slot}` -> HallSeatingPlan[]
}

/**
 * Infers the programmes writing exams in a hall from groupsPresent.
 */
export function getHallProgrammes(groupsPresent: string[]): Programme[] {
  const progs = new Set<Programme>();
  for (const grp of groupsPresent) {
    const norm = grp.toUpperCase();
    if (norm.includes('MCA')) {
      progs.add('MCA');
    } else if (norm.includes('BCA')) {
      progs.add('BCA');
    } else if (
      norm.includes('DIPLOMA') ||
      norm.includes('POLY') ||
      norm.includes(' EEE') ||
      norm.includes(' AU') ||
      norm.includes(' CT')
    ) {
      progs.add('Diploma');
    } else {
      progs.add('B.Tech');
    }
  }
  return Array.from(progs);
}

/**
 * Returns the teaching programmes for a staff member.
 * Falls back to their department if programmes is not explicitly configured.
 */
export function getStaffProgrammes(staff: Staff): Programme[] {
  if (staff.programmes && staff.programmes.length > 0) {
    return staff.programmes;
  }
  const dept = (staff.department || '').toUpperCase();
  if (dept.includes('DIPLOMA')) return ['Diploma'];
  if (dept.includes('MCA')) return ['MCA'];
  if (dept.includes('BCA')) return ['BCA'];
  return ['B.Tech'];
}

/**
 * Validates a proposed or existing invigilator assignment.
 */
export function validateInvigilatorAssignment(
  assignment: InvigilatorDutyAssignment,
  hallPlan: HallSeatingPlan | undefined,
  staff: Staff,
  allAssignmentsInSlot: InvigilatorDutyAssignment[]
): InvigilatorConflict[] {
  const conflicts: InvigilatorConflict[] = [];

  // Check 1: Double booking in the same date and slot
  const sameSlotDuties = allAssignmentsInSlot.filter(
    (a) =>
      a.id !== assignment.id &&
      a.staffId === assignment.staffId &&
      a.date === assignment.date &&
      a.sessionSlot === assignment.sessionSlot
  );

  if (sameSlotDuties.length > 0) {
    conflicts.push({
      staffId: staff.id,
      staffName: staff.name,
      date: assignment.date,
      sessionSlot: assignment.sessionSlot,
      hallName: assignment.hallName,
      reason: 'DOUBLE_BOOKED',
      message: `${staff.name} is double-booked on ${assignment.date} (${assignment.sessionSlot}) in halls: ${assignment.hallName} and ${sameSlotDuties[0].hallName}.`,
    });
  }

  // Check 2: Tutor conflict
  // A staff member who is class tutor of any group seated in this hall CANNOT invigilate there
  if (staff.tutorOfGroup && hallPlan) {
    const isTutorOfPresentGroup = hallPlan.groupsPresent.some((grp) => {
      const normalizedTutor = staff.tutorOfGroup!.replace(/\s+/g, '').toUpperCase();
      const normalizedGrp = grp.replace(/\s+/g, '').toUpperCase();
      return (
        normalizedTutor === normalizedGrp ||
        normalizedGrp.includes(normalizedTutor) ||
        normalizedTutor.includes(normalizedGrp)
      );
    });

    if (isTutorOfPresentGroup) {
      conflicts.push({
        staffId: staff.id,
        staffName: staff.name,
        date: assignment.date,
        sessionSlot: assignment.sessionSlot,
        hallName: assignment.hallName,
        reason: 'TUTOR_OF_HALL_STUDENT',
        message: `${staff.name} is the class tutor of ${staff.tutorOfGroup}, which is seated in ${assignment.hallName}. Cannot invigilate own students.`,
      });
    }
  }

  return conflicts;
}

/**
 * Automatically assigns invigilators fairly across all halls and dates.
 * Enforces:
 * 1. Tutor exclusion (class tutors never invigilate their own students)
 * 2. No double booking in the same slot
 * 3. Programme matching (Diploma teachers go to Diploma exams, B.Tech to B.Tech, MCA/BCA to MCA/BCA, cross-teachers to either)
 * 4. Fair load balancing across all faculty
 */
export function autoAssignInvigilators(
  options: AutoAssignInvigilatorsOptions
): {
  assignments: InvigilatorDutyAssignment[];
  conflicts: InvigilatorConflict[];
  unassignedSlots: { date: string; slot: 'FN' | 'AN'; hallName: string }[];
} {
  const {
    sessionId,
    dates,
    slots,
    hallPlans,
    staffList,
    existingAssignments = [],
    slotHallPlans = {},
  } = options;

  const assignments: InvigilatorDutyAssignment[] = [...existingAssignments];
  const allConflicts: InvigilatorConflict[] = [];
  const unassignedSlots: { date: string; slot: 'FN' | 'AN'; hallName: string }[] = [];

  const staffMap = new Map<string, Staff>(staffList.map((s) => [s.id, s]));
  const defaultHallPlanMap = new Map<string, HallSeatingPlan>(hallPlans.map((h) => [h.hallId, h]));

  // Track duties per staff for fair distribution
  const dutyCounts = new Map<string, number>();
  for (const s of staffList) {
    dutyCounts.set(s.id, 0);
  }
  for (const a of existingAssignments) {
    dutyCounts.set(a.staffId, (dutyCounts.get(a.staffId) || 0) + 1);
  }

  for (const date of dates) {
    for (const slot of slots) {
      const slotKey = `${date}_${slot}`;
      const activeHallsForSlot =
        slotHallPlans[slotKey] && slotHallPlans[slotKey].length > 0
          ? slotHallPlans[slotKey].filter((h) => h.totalStudents > 0)
          : hallPlans.filter((h) => h.totalStudents > 0);

      // Find staff already assigned in this slot
      const assignedInSlot = new Set(
        assignments
          .filter((a) => a.date === date && a.sessionSlot === slot)
          .map((a) => a.staffId)
      );

      for (const hall of activeHallsForSlot) {
        // Check if already assigned
        const existing = assignments.find(
          (a) => a.date === date && a.sessionSlot === slot && a.hallId === hall.hallId
        );
        if (existing) continue;

        const hallProgs = getHallProgrammes(hall.groupsPresent);

        // Find candidate staff
        const candidates = staffList.filter((s) => {
          if (assignedInSlot.has(s.id)) return false;

          // Check max duties
          const maxDuties = s.maxDutiesPerSession || 6;
          if ((dutyCounts.get(s.id) || 0) >= maxDuties) return false;

          // Check tutor conflict with hall
          if (s.tutorOfGroup) {
            const hasTutorConflict = hall.groupsPresent.some((grp) => {
              const normalizedTutor = s.tutorOfGroup!.replace(/\s+/g, '').toUpperCase();
              const normalizedGrp = grp.replace(/\s+/g, '').toUpperCase();
              return (
                normalizedTutor === normalizedGrp ||
                normalizedGrp.includes(normalizedTutor) ||
                normalizedTutor.includes(normalizedGrp)
              );
            });
            if (hasTutorConflict) return false;
          }

          return true;
        });

        // Sort candidates:
        // 1. Programme match (Diploma faculty for Diploma halls, B.Tech for B.Tech, MCA/BCA for MCA/BCA, cross teachers match either)
        // 2. Current duty count ascending (fair load balancing)
        // 3. Non-exam cell members first (exam cell coordinates)
        // 4. Lecturer / Assistant Professor first before HOD
        // 5. Alphabetical by name
        candidates.sort((a, b) => {
          const progsA = getStaffProgrammes(a);
          const progsB = getStaffProgrammes(b);

          const matchA = hallProgs.length === 0 || hallProgs.some((p) => progsA.includes(p));
          const matchB = hallProgs.length === 0 || hallProgs.some((p) => progsB.includes(p));

          if (matchA !== matchB) {
            return matchA ? -1 : 1;
          }

          const countA = dutyCounts.get(a.id) || 0;
          const countB = dutyCounts.get(b.id) || 0;
          if (countA !== countB) return countA - countB;

          if (a.isExamCellMember !== b.isExamCellMember) {
            return a.isExamCellMember ? 1 : -1;
          }

          if (a.designation === 'HOD' && b.designation !== 'HOD') return 1;
          if (b.designation === 'HOD' && a.designation !== 'HOD') return -1;

          return a.name.localeCompare(b.name);
        });

        if (candidates.length > 0) {
          const selected = candidates[0];
          assignedInSlot.add(selected.id);
          dutyCounts.set(selected.id, (dutyCounts.get(selected.id) || 0) + 1);

          const newAssignment: InvigilatorDutyAssignment = {
            id: `duty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            sessionId,
            date,
            sessionSlot: slot,
            hallId: hall.hallId,
            hallName: hall.hallName,
            staffId: selected.id,
            staffName: selected.name,
            staffDepartment: selected.department,
          };

          assignments.push(newAssignment);
        } else {
          unassignedSlots.push({
            date,
            slot,
            hallName: hall.hallName,
          });
        }
      }
    }
  }

  // Validate all assignments
  for (const a of assignments) {
    const staff = staffMap.get(a.staffId);
    const hallPlan = defaultHallPlanMap.get(a.hallId);
    if (staff) {
      const conflicts = validateInvigilatorAssignment(a, hallPlan, staff, assignments);
      allConflicts.push(...conflicts);
    }
  }

  return {
    assignments,
    conflicts: allConflicts,
    unassignedSlots,
  };
}
