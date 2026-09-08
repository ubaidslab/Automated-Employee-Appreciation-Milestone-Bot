import { generateText } from "./generate";

const COMPANY_NAME = process.env.COMPANY_NAME?.trim() || "the team";
const TONE = (process.env.MESSAGE_TONE?.trim().toLowerCase() || "warm") as "warm" | "professional";

export interface CelebrationContext {
  employeeName: string;
  type: "anniversary" | "birthday" | "achievement";
  years?: number;
  achievementTitle?: string;
  achievementDescription?: string;
}

export interface CelebrationMessage {
  text: string;
  aiGenerated: boolean;
}

function buildPrompt(ctx: CelebrationContext): { system: string; user: string } {
  const toneInstruction =
    TONE === "professional"
      ? "Keep the tone warm but professional and workplace-appropriate."
      : "Keep the tone warm, upbeat, and a little casual — like a genuinely happy teammate, not corporate copy.";

  const system = `You write short employee-recognition messages for ${COMPANY_NAME}, posted in a shared team Slack channel. ${toneInstruction} Write 2-4 sentences. At most one emoji. Avoid generic filler like "keep up the great work" with nothing specific behind it. Output only the message text, nothing else — no preamble, no quotes around it.`;

  let user: string;
  switch (ctx.type) {
    case "anniversary":
      user = `Write a work-anniversary message for ${ctx.employeeName}, celebrating ${ctx.years} year${
        ctx.years === 1 ? "" : "s"
      } at ${COMPANY_NAME} today.`;
      break;
    case "birthday":
      user = `Write a birthday message for ${ctx.employeeName} — it's their birthday today.`;
      break;
    case "achievement":
      user = `Write a congratulatory message for ${ctx.employeeName} for this achievement: "${ctx.achievementTitle}"${
        ctx.achievementDescription ? ` — ${ctx.achievementDescription}` : ""
      }.`;
      break;
  }

  return { system, user };
}

function fallbackMessage(ctx: CelebrationContext): string {
  switch (ctx.type) {
    case "anniversary":
      return `🎉 Congratulations to ${ctx.employeeName} on ${ctx.years} year${
        ctx.years === 1 ? "" : "s"
      } at ${COMPANY_NAME}! Thank you for everything you bring to the team.`;
    case "birthday":
      return `🎂 Happy birthday, ${ctx.employeeName}! Hope you have a great day.`;
    case "achievement":
      return `👏 Congrats to ${ctx.employeeName} on: ${ctx.achievementTitle}!`;
  }
}

/**
 * Never throws: a Slack message celebrating someone should still go out even
 * if the AI provider is down or misconfigured, just with a simpler templated
 * message instead. The caller (and the admin log) can see which happened via
 * `aiGenerated`.
 */
export async function generateCelebrationMessage(ctx: CelebrationContext): Promise<CelebrationMessage> {
  const { system, user } = buildPrompt(ctx);

  try {
    const text = await generateText([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return { text, aiGenerated: true };
  } catch (error) {
    console.error("AI celebration message generation failed, using fallback template:", error);
    return { text: fallbackMessage(ctx), aiGenerated: false };
  }
}
