import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { achievements, employees } from "@/lib/db/schema";
import { isValidationError } from "@/lib/validate/types";
import { validateAchievementInput } from "@/lib/validate/achievement";
import { buildAchievementKey } from "@/lib/milestones/detect";

export const dynamic = "force-dynamic";
import { celebrateMilestone } from "@/lib/celebrate";

/** Logs an achievement and immediately celebrates it — unlike anniversaries
 * and birthdays, achievements aren't date-driven, so there's no reason to
 * wait for the daily cron. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validated = validateAchievementInput(body);
  if (isValidationError(validated)) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const employeeRows = await db.select().from(employees).where(eq(employees.id, validated.employeeId)).limit(1);
  const employee = employeeRows[0];
  if (!employee) {
    return NextResponse.json({ error: "No employee found with that id." }, { status: 404 });
  }

  const id = randomUUID();
  await db.insert(achievements).values({
    id,
    employeeId: employee.id,
    title: validated.title,
    description: validated.description,
    loggedAt: new Date().toISOString(),
  });

  const result = await celebrateMilestone(employee, "achievement", buildAchievementKey(id), {
    achievementTitle: validated.title,
    achievementDescription: validated.description ?? undefined,
  });

  return NextResponse.json({ id, celebration: result }, { status: 201 });
}
