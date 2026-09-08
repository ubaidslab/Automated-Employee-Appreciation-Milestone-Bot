import { DEFAULT_MILESTONE_YEARS } from "./constants";

/**
 * All dates in this module are plain "YYYY-MM-DD" (or "MM-DD" for birthdays)
 * strings, parsed and compared as UTC calendar dates — not local time. That's
 * a deliberate simplification: with employees potentially spread across
 * timezones and a single daily cron run, per-employee timezone-aware "today"
 * isn't worth the complexity for this project. Documented in the README.
 */

export interface MinimalEmployee {
  id: string;
  startDate: string;
  birthday: string | null;
  shareBirthday: boolean;
}

export interface UpcomingMilestone {
  employeeId: string;
  type: "anniversary" | "birthday";
  date: string;
  years?: number;
}

function parseUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whole years of service as of `today`. Not used for the "today" check itself
 * (see isAnniversaryMilestoneToday) — useful for display ("3rd year") elsewhere. */
export function getYearsOfService(startDate: string, today: string): number {
  const start = parseUtcDate(startDate);
  const now = parseUtcDate(today);
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  const hasHadAnniversaryThisYear =
    now.getUTCMonth() > start.getUTCMonth() ||
    (now.getUTCMonth() === start.getUTCMonth() && now.getUTCDate() >= start.getUTCDate());
  if (!hasHadAnniversaryThisYear) years -= 1;
  return Math.max(0, years);
}

/**
 * Returns the milestone-year number if `today` is exactly the anniversary of
 * `startDate` AND that many years is a configured milestone year, else null.
 */
export function isAnniversaryMilestoneToday(
  startDate: string,
  today: string,
  milestoneYears: number[] = DEFAULT_MILESTONE_YEARS
): number | null {
  const start = parseUtcDate(startDate);
  const now = parseUtcDate(today);

  const sameMonthDay =
    now.getUTCMonth() === start.getUTCMonth() && now.getUTCDate() === start.getUTCDate();
  if (!sameMonthDay) return null;

  const years = now.getUTCFullYear() - start.getUTCFullYear();
  if (years <= 0) return null;

  return milestoneYears.includes(years) ? years : null;
}

/**
 * True if `today` is the employee's birthday. A Feb 29 birthday is
 * celebrated on Feb 28 in non-leap years rather than skipped for three years
 * out of four — a documented policy choice, not the only valid one.
 */
export function isBirthdayToday(birthday: string | null, today: string): boolean {
  if (!birthday) return false;

  const [bMonth, bDay] = birthday.split("-").map(Number);
  const now = parseUtcDate(today);
  const nowMonth = now.getUTCMonth() + 1;
  const nowDay = now.getUTCDate();

  if (bMonth === nowMonth && bDay === nowDay) return true;

  if (bMonth === 2 && bDay === 29 && !isLeapYear(now.getUTCFullYear())) {
    return nowMonth === 2 && nowDay === 28;
  }

  return false;
}

export function buildAnniversaryKey(years: number): string {
  return `anniversary_${years}`;
}

export function buildBirthdayKey(today: string): string {
  return `birthday_${today.slice(0, 4)}`;
}

export function buildAchievementKey(achievementId: string): string {
  return `achievement_${achievementId}`;
}

/**
 * Projects forward day-by-day over the window, reusing the exact same
 * per-day checks as the "is it today" functions above — so "what's coming
 * up" can never drift out of sync with what the cron actually celebrates.
 */
export function getUpcomingMilestones(
  employees: MinimalEmployee[],
  today: string,
  windowDays: number,
  milestoneYears: number[] = DEFAULT_MILESTONE_YEARS
): UpcomingMilestone[] {
  const results: UpcomingMilestone[] = [];
  const start = parseUtcDate(today);

  for (let offset = 0; offset <= windowDays; offset++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    const dateStr = formatUtcDate(date);

    for (const employee of employees) {
      const years = isAnniversaryMilestoneToday(employee.startDate, dateStr, milestoneYears);
      if (years !== null) {
        results.push({ employeeId: employee.id, type: "anniversary", date: dateStr, years });
      }
      if (employee.shareBirthday && isBirthdayToday(employee.birthday, dateStr)) {
        results.push({ employeeId: employee.id, type: "birthday", date: dateStr });
      }
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
