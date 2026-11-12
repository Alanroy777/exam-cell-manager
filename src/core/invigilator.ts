import {
  HallSeatingPlan,
  InvigilatorConflict,
  InvigilatorDutyAssignment,
  Staff,
} from './types';

export interface AutoAssignInvigilatorsOptions {
  sessionId: string;
  dates: string[];
  slots: ('FN' | 'AN')[];
  hallPlans: HallSeatingPlan[]; // Hall plans for this exam session
  staffList: Staff[];
  existingAssignments?: InvigilatorDutyAssignment[];
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
      // Direct group match (e.g. "S3 CS A") or normalized comparison
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
 */
export function autoAssignInvigilators(
  options: AutoAssignInvigilatorsOptions
): {
  assignments: InvigilatorDutyAssignment[];
  conflicts: InvigilatorConflict[];
  unassignedSlots: { date: string; slot: 'FN' | 'AN'; hallName: string }[];
} {
  const { sessionId, dates, slots, hallPlans, staffList, existingAssignments = [] } = options;

  const assignments: InvigilatorDutyAssignment[] = [...existingAssignments];
  const allConflicts: InvigilatorConflict[] = [];
  const unassignedSlots: { date: string; slot: 'FN' | 'AN'; hallName: string }[] = [];

  const staffMap = new Map<string, Staff>(staffList.map((s) => [s.id, s]));
  const hallPlanMap = new Map<string, HallSeatingPlan>(hallPlans.map((h) => [h.hallId, h]));

  // Track duties per staff for fair distribution
  const dutyCounts = new Map<string, number>();
  for (const s of staffList) {
    dutyCounts.set(s.id, 0);
  }
  for (const a of existingAssignments) {
    dutyCounts.set(a.staffId, (dutyCounts.get(a.staffId) || 0) + 1);
  }

  // Active halls that have students
  const activeHalls = hallPlans.filter((h) => h.totalStudents > 0);

  for (const date of dates) {
    for (const slot of slots) {
      // Find staff already assigned in this slot
      const assignedInSlot = new Set(
        assignments
          .filter((a) => a.date === date && a.sessionSlot === slot)
          .map((a) => a.staffId)
      );

      for (const hall of activeHalls) {
        // Check if already assigned
        const existing = assignments.find(
          (a) => a.date === date && a.sessionSlot === slot && a.hallId === hall.hallId
        );
        if (existing) continue;

        // Find candidate staff
        const candidates = staffList.filter((s) => {
          if (assignedInSlot.has(s.id)) return false;

          // Check max duties
          const maxDuties = s.maxDutiesPerSession || 5;
          if ((dutyCounts.get(s.id) || 0) >= maxDuties) return false;

          // Check tutor conflict with hall
          if (s.tutorOfGroup) {
            const hasTutorConflict = hall.groupsPresent.some((grp) => {
              const normalizedTutor = s.tutorOfGroup!.replace(/\s+/g, '').toUpperCase();
              const normalizedGrp = grp.replace(/\s+/g, '').toUpperCase();
              return normalizedTutor === normalizedGrp;
            });
            if (hasTutorConflict) return false;
          }

          return true;
        });

        // Sort candidates by:
        // 1. Current duty count ascending (fair distribution)
        // 2. Non-exam cell members first (exam cell oversees operations)
        // 3. Lecturer / Assistant Professor first before HOD
        candidates.sort((a, b) => {
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
    const hallPlan = hallPlanMap.get(a.hallId);
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

