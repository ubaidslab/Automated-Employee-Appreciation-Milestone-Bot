import { type ValidationError } from "./types";

export interface AchievementInput {
  employeeId: string;
  title: string;
  description: string | null;
}

export function validateAchievementInput(body: unknown): AchievementInput | ValidationError {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }
  const b = body as Record<string, unknown>;

  const employeeId = typeof b.employeeId === "string" ? b.employeeId.trim() : "";
  if (!employeeId) {
    return { error: "employeeId is required." };
  }

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return { error: "title is required (max 200 characters)." };
  }

  const description =
    typeof b.description === "string" && b.description.trim() ? b.description.trim().slice(0, 1000) : null;

  return { employeeId, title, description };
}
