import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { runMigrations } from "@/lib/db/migrate";
import { isValidationError } from "@/lib/validate/types";
import { validateEmployeeInput } from "@/lib/validate/employee";

export const dynamic = "force-dynamic";

export async function GET() {
  await runMigrations();
  const rows = await db.select().from(employees).where(eq(employees.active, true)).orderBy(desc(employees.createdAt));
  return NextResponse.json({ employees: rows });
}

export async function POST(req: NextRequest) {
  await runMigrations();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validated = validateEmployeeInput(body);
  if (isValidationError(validated)) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const id = randomUUID();
  try {
    await db.insert(employees).values({
      id,
      name: validated.name,
      email: validated.email,
      slackUserId: validated.slackUserId,
      department: validated.department,
      startDate: validated.startDate,
      birthday: validated.birthday,
      shareBirthday: validated.shareBirthday,
      active: true,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "An employee with that email already exists." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ id }, { status: 201 });
}
