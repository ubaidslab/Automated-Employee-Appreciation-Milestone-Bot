import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./db/client";
import { celebrations, type Employee } from "./db/schema";
import { generateCelebrationMessage, type CelebrationContext } from "./ai/celebration-message";
import { getNotifier } from "./notify/slack";

export interface CelebrateResult {
  status: "sent" | "already_celebrated" | "failed";
  error?: string;
}

/**
 * Shared by the daily cron route and the "log an achievement" / "send test
 * celebration" admin actions — one place that knows how to dedupe, generate,
 * send, and record a celebration, so the two callers can't drift out of sync.
 *
 * Dedup strategy: check for an existing (employeeId, milestoneKey) row first
 * so a previously *failed* attempt can be retried; the database's unique
 * index on that pair is the backstop against a genuine race (two requests
 * both passing the check before either writes), converted into an
 * "already_celebrated" result rather than a duplicate Slack message.
 */
export async function celebrateMilestone(
  employee: Employee,
  milestoneType: "anniversary" | "birthday" | "achievement",
  milestoneKey: string,
  context: Omit<CelebrationContext, "employeeName" | "type">
): Promise<CelebrateResult> {
  const existingRows = await db
    .select()
    .from(celebrations)
    .where(and(eq(celebrations.employeeId, employee.id), eq(celebrations.milestoneKey, milestoneKey)))
    .limit(1);
  const existing = existingRows[0];

  if (existing?.deliveryStatus === "sent") {
    return { status: "already_celebrated" };
  }

  const { text, aiGenerated } = await generateCelebrationMessage({
    employeeName: employee.name,
    type: milestoneType,
    ...context,
  });

  const now = new Date().toISOString();

  try {
    const notifier = getNotifier();
    await notifier.send(text);

    if (existing) {
      await db
        .update(celebrations)
        .set({ messageText: text, aiGenerated, deliveryStatus: "sent", deliveryError: null, sentAt: now })
        .where(eq(celebrations.id, existing.id));
    } else {
      await db.insert(celebrations).values({
        id: randomUUID(),
        employeeId: employee.id,
        milestoneType,
        milestoneKey,
        messageText: text,
        aiGenerated,
        sentAt: now,
        deliveryStatus: "sent",
        deliveryError: null,
      });
    }

    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      if (existing) {
        await db
          .update(celebrations)
          .set({ messageText: text, aiGenerated, deliveryStatus: "failed", deliveryError: message, sentAt: now })
          .where(eq(celebrations.id, existing.id));
      } else {
        await db.insert(celebrations).values({
          id: randomUUID(),
          employeeId: employee.id,
          milestoneType,
          milestoneKey,
          messageText: text,
          aiGenerated,
          sentAt: now,
          deliveryStatus: "failed",
          deliveryError: message,
        });
      }
    } catch {
      // Lost a race with another request for the same (employee, milestoneKey)
      // pair — that request's outcome is the one that stands; nothing to do here.
    }

    return { status: "failed", error: message };
  }
}
