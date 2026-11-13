/**
 * Date utilities for KTU Exam Cell Manager.
 * Supports standard Indian academic DD/MM/YYYY formatting, date normalization,
 * working date range computation (skipping Sundays), and timetable date shifting.
 */

import { TimetableEntry } from './types';

/**
 * Normalizes common date strings like "8/12/2026", "08/12/2026", "2026-12-08" to "DD/MM/YYYY".
 */
export function normalizeDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Match DD/MM/YYYY or D/M/YYYY (also handles hyphens)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

/**
 * Parses DD/MM/YYYY into a Date object at midnight local time.
 */
export function parseDmyDate(dmy: string): Date | null {
  const norm = normalizeDateStr(dmy);
  const parts = norm.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day, 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object as standard "DD/MM/YYYY".
 */
export function formatDmyDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Returns short day of week (e.g. "Mon", "Tue", "Wed") for a DD/MM/YYYY string.
 */
export function getDayOfWeekShort(dmy: string): string {
  const d = parseDmyDate(dmy);
  if (!d) return '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

/**
 * Returns all institutional working dates (skipping Sundays) between startStr and endStr inclusive.
 */
export function getWorkingDatesInRange(startStr: string, endStr: string): string[] {
  const start = parseDmyDate(startStr);
  const end = parseDmyDate(endStr);
  if (!start || !end) {
    const normStart = normalizeDateStr(startStr);
    return normStart ? [normStart] : [];
  }
  if (start > end) {
    return [formatDmyDate(start)];
  }

  const result: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    // Skip Sunday (0)
    if (cur.getDay() !== 0) {
      result.push(formatDmyDate(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }

  return result.length > 0 ? result : [formatDmyDate(start)];
}

/**
 * Shifts existing timetable entries to a new date window:
 * Preserves the day sequence (Day 1 -> new Date 1, Day 2 -> new Date 2, etc.),
 * keeping group, slot, and subject intact.
 */
export function shiftTimetableDates(
  entries: TimetableEntry[],
  newStartDate: string,
  newEndDate: string
): TimetableEntry[] {
  if (entries.length === 0) return [];

  const normStart = normalizeDateStr(newStartDate);
  const normEnd = normalizeDateStr(newEndDate);
  const newDates = getWorkingDatesInRange(normStart, normEnd);
  if (newDates.length === 0) return entries;

  // Extract all unique dates present in current timetable, sorted chronologically
  const oldUniqueDates = Array.from(new Set(entries.map((e) => normalizeDateStr(e.date))))
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDmyDate(a)?.getTime() || 0;
      const db = parseDmyDate(b)?.getTime() || 0;
      return da - db;
    });

  // Map each old date index to corresponding new date
  const dateMap: Record<string, string> = {};
  oldUniqueDates.forEach((oldDate, idx) => {
    dateMap[oldDate] = idx < newDates.length ? newDates[idx] : newDates[newDates.length - 1];
  });

  return entries.map((e) => {
    const normOld = normalizeDateStr(e.date);
    const targetDate = dateMap[normOld] || newDates[0];
    return {
      ...e,
      date: targetDate,
    };
  });
}

