import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { celebrations, employees } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: celebrations.id,
      employeeId: celebrations.employeeId,
      employeeName: employees.name,
      milestoneType: celebrations.milestoneType,
      milestoneKey: celebrations.milestoneKey,
      messageText: celebrations.messageText,
      aiGenerated: celebrations.aiGenerated,
      sentAt: celebrations.sentAt,
      deliveryStatus: celebrations.deliveryStatus,
      deliveryError: celebrations.deliveryError,
    })
    .from(celebrations)
    .leftJoin(employees, eq(celebrations.employeeId, employees.id))
    .orderBy(desc(celebrations.sentAt))
    .limit(100);

  return NextResponse.json({ celebrations: rows });
}
