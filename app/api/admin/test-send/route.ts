import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import {
  buildAnniversaryKey,
  buildBirthdayKey,
  isAnniversaryMilestoneToday,
  isBirthdayToday,
} from "@/lib/milestones/detect";

// Every route in this app reads/writes live database state — none of them
// should ever be statically optimized at build time.
export const dynamic = "force-dynamic";
import { DEFAULT_MILESTONE_YEARS } from "@/lib/milestones/constants";
import { celebrateMilestone } from "@/lib/celebrate";

/** Manually runs today's milestone check for one employee, without waiting
 * for the daily cron — the "does this actually work" button in the admin UI. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const employeeId = typeof (body as Record<string, unknown>)?.employeeId === "string"
    ? (body as Record<string, string>).employeeId
    : "";
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  }

  const rows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = rows[0];
  if (!employee) {
    return NextResponse.json({ error: "No employee found with that id." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const outcomes: { type: string; status: string }[] = [];

  const anniversaryYears = isAnniversaryMilestoneToday(employee.startDate, today, DEFAULT_MILESTONE_YEARS);
  if (anniversaryYears !== null) {
    const result = await celebrateMilestone(employee, "anniversary", buildAnniversaryKey(anniversaryYears), {
      years: anniversaryYears,
    });
    outcomes.push({ type: "anniversary", status: result.status });
  }

  if (employee.shareBirthday && isBirthdayToday(employee.birthday, today)) {
    const result = await celebrateMilestone(employee, "birthday", buildBirthdayKey(today), {});
    outcomes.push({ type: "birthday", status: result.status });
  }

  if (outcomes.length === 0) {
    return NextResponse.json({
      message: "No anniversary or birthday milestone for this employee today — nothing to send.",
      outcomes,
    });
  }

  return NextResponse.json({ outcomes });
}
