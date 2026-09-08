import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  slackUserId: text("slack_user_id"),
  department: text("department"),
  // ISO date (YYYY-MM-DD) — the employee's start date, used for anniversary detection.
  startDate: text("start_date").notNull(),
  // MM-DD only, deliberately — we don't need birth *year* to detect "is today their
  // birthday", so we don't collect it. Nullable: not every employee has one on file.
  birthday: text("birthday"),
  shareBirthday: integer("share_birthday", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  title: text("title").notNull(),
  description: text("description"),
  loggedAt: text("logged_at").notNull(),
});

export const celebrations = sqliteTable(
  "celebrations",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    milestoneType: text("milestone_type").notNull(), // "anniversary" | "birthday" | "achievement"
    // e.g. "anniversary_5", "birthday_2027", "achievement_<achievementId>" — the
    // (employeeId, milestoneKey) pair is unique below, which is what actually
    // prevents a milestone from being celebrated twice, at the database level,
    // not just in application logic.
    milestoneKey: text("milestone_key").notNull(),
    messageText: text("message_text").notNull(),
    // False when the AI provider failed and the fallback template was used
    // instead — surfaced in the admin log so a provider outage is visible,
    // not silently masked by "it still sent something".
    aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(true),
    sentAt: text("sent_at").notNull(),
    deliveryStatus: text("delivery_status").notNull(), // "sent" | "failed"
    deliveryError: text("delivery_error"),
  },
  (table) => ({
    employeeMilestoneUnique: uniqueIndex("celebrations_employee_milestone_unique").on(
      table.employeeId,
      table.milestoneKey
    ),
  })
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type Celebration = typeof celebrations.$inferSelect;
export type NewCelebration = typeof celebrations.$inferInsert;
