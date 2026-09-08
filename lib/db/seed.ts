import { randomUUID } from "crypto";
import { db } from "./client";
import { runMigrations } from "./migrate";
import { employees, achievements } from "./schema";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthDay(d: Date): string {
  return d.toISOString().slice(5, 10);
}

function yearsAgo(years: number, from: Date): Date {
  const d = new Date(from);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d;
}

async function seed() {
  await runMigrations();

  const today = new Date();
  const now = new Date().toISOString();

  const rows = [
    {
      // Anniversary milestone fires TODAY when you run the cron/test-send —
      // seeded relative to "now" so this demo is live no matter when it's cloned.
      name: "Amara Okafor",
      email: "amara@example.com",
      department: "Engineering",
      startDate: isoDate(yearsAgo(5, today)),
      birthday: null,
      shareBirthday: false,
    },
    {
      name: "Rashid Al Mansoori",
      email: "rashid@example.com",
      department: "Customer Success",
      startDate: isoDate(yearsAgo(1, today)),
      birthday: null,
      shareBirthday: false,
    },
    {
      // Birthday milestone fires today too.
      name: "Priya Nair",
      email: "priya@example.com",
      department: "Design",
      startDate: isoDate(yearsAgo(2, today)),
      birthday: monthDay(today),
      shareBirthday: true,
    },
    {
      name: "Diego Fernandes",
      email: "diego@example.com",
      department: "Sales",
      startDate: "2022-03-14",
      birthday: "07-22",
      shareBirthday: true,
    },
    {
      name: "Lin Chen",
      email: "lin@example.com",
      department: "Engineering",
      startDate: "2024-11-02",
      birthday: "01-30",
      shareBirthday: false,
    },
    {
      name: "Fatima Al Suwaidi",
      email: "fatima@example.com",
      department: "People Ops",
      startDate: "2019-06-01",
      birthday: "09-09",
      shareBirthday: true,
    },
  ];

  const insertedIds: Record<string, string> = {};

  for (const row of rows) {
    const id = randomUUID();
    insertedIds[row.email] = id;
    await db.insert(employees).values({
      id,
      name: row.name,
      email: row.email,
      slackUserId: null,
      department: row.department,
      startDate: row.startDate,
      birthday: row.birthday,
      shareBirthday: row.shareBirthday,
      active: true,
      createdAt: now,
    });
  }

  await db.insert(achievements).values({
    id: randomUUID(),
    employeeId: insertedIds["fatima@example.com"],
    title: "Shipped the Q3 onboarding revamp",
    description: "Cut new-hire ramp time from 3 weeks to 8 days.",
    loggedAt: now,
  });

  console.log(`Seeded ${rows.length} employees and 1 achievement.`);
  console.log("Two employees have a milestone firing today — try the admin dashboard's 'Send test celebration' button.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
