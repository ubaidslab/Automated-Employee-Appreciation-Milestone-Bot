import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employees } from "@/lib/db/schema";
import { isValidationError } from "@/lib/validate/types";
import { validateEmployeeInput } from "@/lib/validate/employee";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  await db
    .update(employees)
    .set({
      name: validated.name,
      email: validated.email,
      slackUserId: validated.slackUserId,
      department: validated.department,
      startDate: validated.startDate,
      birthday: validated.birthday,
      shareBirthday: validated.shareBirthday,
    })
    .where(eq(employees.id, params.id));

  return NextResponse.json({ ok: true });
}

/** Soft delete — deactivate rather than remove, so the celebration/achievement
 * history for that employee stays intact and auditable. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.update(employees).set({ active: false }).where(eq(employees.id, params.id));
  return NextResponse.json({ ok: true });
}
