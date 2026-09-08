import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { getUpcomingMilestones } from "@/lib/milestones/detect";
import { DEFAULT_MILESTONE_YEARS, DEFAULT_UPCOMING_WINDOW_DAYS } from "@/lib/milestones/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const activeEmployees = await db.select().from(employees).where(eq(employees.active, true));
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = getUpcomingMilestones(
    activeEmployees,
    today,
    DEFAULT_UPCOMING_WINDOW_DAYS,
    DEFAULT_MILESTONE_YEARS
  );

  const byId = new Map(activeEmployees.map((e) => [e.id, e]));
  const enriched = upcoming.map((m) => ({
    ...m,
    employeeName: byId.get(m.employeeId)?.name ?? "Unknown",
  }));

  return NextResponse.json({ today, windowDays: DEFAULT_UPCOMING_WINDOW_DAYS, upcoming: enriched });
}
