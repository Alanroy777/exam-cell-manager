import { describe, it, expect } from 'vitest';
import {
  normalizeDateStr,
  parseDmyDate,
  formatDmyDate,
  getWorkingDatesInRange,
  shiftTimetableDates,
  getDayOfWeekShort,
} from '../src/core/dateUtils';
import { TimetableEntry } from '../src/core/types';

describe('dateUtils', () => {
  it('normalizes single digit day and month to DD/MM/YYYY', () => {
    expect(normalizeDateStr('8/12/2026')).toBe('08/12/2026');
    expect(normalizeDateStr('08/12/2026')).toBe('08/12/2026');
    expect(normalizeDateStr('8-12-2026')).toBe('08/12/2026');
    expect(normalizeDateStr('2026-12-08')).toBe('08/12/2026');
  });

  it('correctly calculates working dates skipping Sundays', () => {
    // 08/12/2026 is Tue. 13/12/2026 is Sun. 16/12/2026 is Wed.
    const dates = getWorkingDatesInRange('8/12/2026', '16/12/2026');
    expect(dates).toContain('08/12/2026');
    expect(dates).toContain('09/12/2026');
    expect(dates).toContain('10/12/2026');
    expect(dates).toContain('11/12/2026');
    expect(dates).toContain('12/12/2026');
    expect(dates).not.toContain('13/12/2026'); // Sunday skipped
    expect(dates).toContain('14/12/2026');
    expect(dates).toContain('15/12/2026');
    expect(dates).toContain('16/12/2026');
    expect(dates.length).toBe(8);
  });

  it('shifts existing timetable entries to new session dates', () => {
    const sampleEntries: TimetableEntry[] = [
      {
        id: 'tt-1',
        sessionId: 's1',
        date: '09/10/2026',
        sessionSlot: 'FN',
        timeRange: '10.15 AM - 12.15 PM',
        groupId: 'S3 CS A',
        subjectCode: 'CST 201',
        subjectName: 'Data Structures',
      },
      {
        id: 'tt-2',
        sessionId: 's1',
        date: '12/10/2026',
        sessionSlot: 'FN',
        timeRange: '10.15 AM - 12.15 PM',
        groupId: 'S5 CS B',
        subjectCode: 'CST 301',
        subjectName: 'Automata',
      },
    ];

    const shifted = shiftTimetableDates(sampleEntries, '8/12/2026', '16/12/2026');
    expect(shifted[0].date).toBe('08/12/2026');
    expect(shifted[1].date).toBe('09/12/2026');
    expect(shifted[0].subjectCode).toBe('CST 201');
    expect(shifted[1].groupId).toBe('S5 CS B');
  });

  it('returns short day of week', () => {
    expect(getDayOfWeekShort('08/12/2026')).toBe('Tue');
    expect(getDayOfWeekShort('13/12/2026')).toBe('Sun');
    expect(getDayOfWeekShort('14/12/2026')).toBe('Mon');
  });
});

