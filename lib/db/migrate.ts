import { db } from "./client";

/**
 * Creates the schema directly rather than through drizzle-kit's versioned
 * migration files — this project's schema is fixed for the demo, so one
 * init script is simpler than a migration toolchain with fewer moving
 * parts to break on a fresh clone. A real deployment with an evolving
 * schema would want proper drizzle-kit migrations instead.
 */
export async function runMigrations(): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      slack_user_id TEXT,
      department TEXT,
      start_date TEXT NOT NULL,
      birthday TEXT,
      share_birthday INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      title TEXT NOT NULL,
      description TEXT,
      logged_at TEXT NOT NULL
    );
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS celebrations (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      milestone_type TEXT NOT NULL,
      milestone_key TEXT NOT NULL,
      message_text TEXT NOT NULL,
      ai_generated INTEGER NOT NULL DEFAULT 1,
      sent_at TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      delivery_error TEXT
    );
  `);

  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS celebrations_employee_milestone_unique
    ON celebrations (employee_id, milestone_key);
  `);
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
