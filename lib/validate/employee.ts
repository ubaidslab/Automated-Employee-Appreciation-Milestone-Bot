import { type ValidationError } from "./types";

export interface EmployeeInput {
  name: string;
  email: string;
  department: string | null;
  startDate: string;
  birthday: string | null;
  shareBirthday: boolean;
  slackUserId: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The one real trust boundary for employee data — reject anything
 * malformed here rather than trusting the admin form or a future API caller. */
export function validateEmployeeInput(body: unknown): EmployeeInput | ValidationError {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 200) {
    return { error: "Name is required (max 200 characters)." };
  }

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { error: "A valid email is required." };
  }

  const startDate = typeof b.startDate === "string" ? b.startDate : "";
  if (!DATE_RE.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    return { error: "startDate must be a valid YYYY-MM-DD date." };
  }

  let birthday: string | null = null;
  if (b.birthday !== null && b.birthday !== undefined && b.birthday !== "") {
    if (typeof b.birthday !== "string" || !MONTH_DAY_RE.test(b.birthday)) {
      return { error: "birthday must be a valid MM-DD value, or omitted." };
    }
    const [month, day] = b.birthday.split("-").map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { error: "birthday must be a valid MM-DD value." };
    }
    birthday = b.birthday;
  }

  const department =
    typeof b.department === "string" && b.department.trim() ? b.department.trim().slice(0, 100) : null;
  const shareBirthday = Boolean(b.shareBirthday);
  const slackUserId =
    typeof b.slackUserId === "string" && b.slackUserId.trim() ? b.slackUserId.trim().slice(0, 50) : null;

  return { name, email, department, startDate, birthday, shareBirthday, slackUserId };
}
