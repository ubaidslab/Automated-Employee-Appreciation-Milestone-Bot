import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { runMigrations } from "@/lib/db/migrate";
import {
  buildAnniversaryKey,
  buildBirthdayKey,
  isAnniversaryMilestoneToday,
  isBirthdayToday,
} from "@/lib/milestones/detect";
import { DEFAULT_MILESTONE_YEARS } from "@/lib/milestones/constants";
import { celebrateMilestone } from "@/lib/celebrate";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron triggers scheduled routes with a GET request (not POST) and
 * sends `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET
 * is set in the project's env vars — this checks for exactly that, so only
 * Vercel's own scheduler (or someone who has the secret) can trigger a real
 * send. See vercel.json for the schedule.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await runMigrations();

  const today = new Date().toISOString().slice(0, 10);
  const activeEmployees = await db.select().from(employees).where(eq(employees.active, true));

  const outcomes: { employeeId: string; type: string; status: string }[] = [];

  for (const employee of activeEmployees) {
    const anniversaryYears = isAnniversaryMilestoneToday(employee.startDate, today, DEFAULT_MILESTONE_YEARS);
    if (anniversaryYears !== null) {
      const result = await celebrateMilestone(
        employee,
        "anniversary",
        buildAnniversaryKey(anniversaryYears),
        { years: anniversaryYears }
      );
      outcomes.push({ employeeId: employee.id, type: "anniversary", status: result.status });
    }

    if (employee.shareBirthday && isBirthdayToday(employee.birthday, today)) {
      const result = await celebrateMilestone(employee, "birthday", buildBirthdayKey(today), {});
      outcomes.push({ employeeId: employee.id, type: "birthday", status: result.status });
    }
  }

  return NextResponse.json({ date: today, checked: activeEmployees.length, outcomes });
}
