import { describe, expect, it } from "vitest";
import {
  buildAnniversaryKey,
  buildBirthdayKey,
  buildAchievementKey,
  getUpcomingMilestones,
  getYearsOfService,
  isAnniversaryMilestoneToday,
  isBirthdayToday,
} from "./detect";

describe("isAnniversaryMilestoneToday", () => {
  it("returns the milestone year on an exact, configured anniversary", () => {
    expect(isAnniversaryMilestoneToday("2021-03-14", "2026-03-14", [1, 2, 3, 5])).toBe(5);
  });

  it("returns null when the month/day doesn't match today", () => {
    expect(isAnniversaryMilestoneToday("2021-03-14", "2026-03-15", [5])).toBeNull();
  });

  it("returns null when years-of-service isn't a configured milestone year", () => {
    expect(isAnniversaryMilestoneToday("2021-03-14", "2026-03-14", [1, 2, 3])).toBeNull();
  });

  it("returns null for year zero (hire date itself, not yet an anniversary)", () => {
    expect(isAnniversaryMilestoneToday("2026-03-14", "2026-03-14", [1, 2, 3])).toBeNull();
  });

  it("handles a Feb 29 start date on a matching leap-year anniversary", () => {
    // 2020 and 2024 are both leap years; 4 years apart, both have Feb 29.
    expect(isAnniversaryMilestoneToday("2020-02-29", "2024-02-29", [4])).toBe(4);
  });
});

describe("isBirthdayToday", () => {
  it("returns true on an exact month/day match", () => {
    expect(isBirthdayToday("07-22", "2026-07-22")).toBe(true);
  });

  it("returns false on a non-matching date", () => {
    expect(isBirthdayToday("07-22", "2026-07-23")).toBe(false);
  });

  it("returns false when no birthday is on file", () => {
    expect(isBirthdayToday(null, "2026-07-22")).toBe(false);
  });

  it("celebrates a Feb 29 birthday on Feb 28 in a non-leap year", () => {
    expect(isBirthdayToday("02-29", "2026-02-28")).toBe(true); // 2026 is not a leap year
    expect(isBirthdayToday("02-29", "2026-03-01")).toBe(false);
  });

  it("celebrates a Feb 29 birthday on Feb 29 in a leap year", () => {
    expect(isBirthdayToday("02-29", "2028-02-29")).toBe(true); // 2028 is a leap year
  });
});

describe("getYearsOfService", () => {
  it("counts a full year once the anniversary date has passed", () => {
    expect(getYearsOfService("2021-03-14", "2026-03-15")).toBe(5);
  });

  it("does not count the current year until the anniversary date arrives", () => {
    expect(getYearsOfService("2021-03-14", "2026-03-13")).toBe(4);
  });

  it("counts the anniversary date itself as the new year", () => {
    expect(getYearsOfService("2021-03-14", "2026-03-14")).toBe(5);
  });

  it("never returns a negative number for a future start date", () => {
    expect(getYearsOfService("2027-01-01", "2026-01-01")).toBe(0);
  });
});

describe("key builders", () => {
  it("builds a stable anniversary key from the milestone year alone", () => {
    expect(buildAnniversaryKey(5)).toBe("anniversary_5");
  });

  it("builds a birthday key scoped to the calendar year", () => {
    expect(buildBirthdayKey("2027-07-22")).toBe("birthday_2027");
  });

  it("builds an achievement key from the achievement id", () => {
    expect(buildAchievementKey("abc-123")).toBe("achievement_abc-123");
  });
});

describe("getUpcomingMilestones", () => {
  const employees = [
    { id: "e1", startDate: "2021-03-20", birthday: null, shareBirthday: false },
    { id: "e2", startDate: "2020-01-01", birthday: "03-25", shareBirthday: true },
    { id: "e3", startDate: "2020-01-01", birthday: "03-25", shareBirthday: false },
  ];

  it("finds an anniversary within the window", () => {
    const upcoming = getUpcomingMilestones(employees, "2026-03-14", 30, [5]);
    expect(upcoming).toContainEqual({ employeeId: "e1", type: "anniversary", date: "2026-03-20", years: 5 });
  });

  it("finds a birthday within the window only for employees who opted in", () => {
    const upcoming = getUpcomingMilestones(employees, "2026-03-14", 30);
    expect(upcoming).toContainEqual({ employeeId: "e2", type: "birthday", date: "2026-03-25" });
    expect(upcoming.find((m) => m.employeeId === "e3")).toBeUndefined();
  });

  it("excludes milestones outside the window", () => {
    const upcoming = getUpcomingMilestones(employees, "2026-03-14", 3, [5]);
    expect(upcoming).toHaveLength(0);
  });

  it("returns results sorted by date", () => {
    const upcoming = getUpcomingMilestones(employees, "2026-03-14", 30, [5]);
    const dates = upcoming.map((m) => m.date);
    expect(dates).toEqual([...dates].sort());
  });
});
