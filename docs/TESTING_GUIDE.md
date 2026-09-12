# Testing Kudos — step by step

This walks through running Kudos entirely on your own machine and proving the real flow
works — milestone detection → celebration message generation → Slack delivery — plus the
admin panel and the daily cron job behind it. Structured free-first: the whole core flow
works and is fully visible with zero external accounts; what needs a real Slack webhook or a
real AI provider key is called out explicitly, with exactly what changes once you add one.

## Part 1 — Install, seed, and log in

Needs Node.js 18.18+ (this repo's CI runs Node 22) and npm. Nothing else — no Docker, no
external database, no API keys required to get the core flow running.

```bash
git clone https://github.com/ubaidslab/Automated-Employee-Appreciation-Milestone-Bot.git
cd Automated-Employee-Appreciation-Milestone-Bot
npm install
cp .env.example .env.local
```

`.env.example` ships nearly every variable pre-filled with *some* value already — including
`ADMIN_KEY`, `SESSION_SECRET`, and `CRON_SECRET` as literal placeholder text
(`change-me-to-...`), which technically works as-is. Still, open `.env.local` and:

- **Set your own `ADMIN_KEY`, `SESSION_SECRET`, and `CRON_SECRET`** — any strings, this is
  local testing. Leaving the shipped placeholders means using a key that's sitting in a
  public repo.
- **Blank out `SLACK_WEBHOOK_URL`** — leave it as `SLACK_WEBHOOK_URL=` with nothing after the
  `=`. It also ships pre-filled, with a fake-but-real-domain `hooks.slack.com` URL, and
  because that's a non-empty string the app treats Slack as "configured" and actually
  attempts (and fails) a real HTTP request to it, instead of cleanly reporting "not
  configured." Blanking it is what makes Part 3 below behave exactly as described.
- Optionally blank `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_KEY` too — not required (a bad
  credential and a missing one both fall back to the template message the same way), just
  faster and keeps the terminal free of a doomed network request.
- Leave the rest (`DATABASE_URL`, `AI_PROVIDER`, `COMPANY_NAME`, `MESSAGE_TONE`, the
  `*_MODEL` vars, `OPENAI_API_KEY`, `NEXT_PUBLIC_SITE_URL`) as shipped.

Now create the schema and load the demo data:

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` actually runs the same migration step internally before inserting rows, so
`db:migrate` first is redundant here — running both is still harmless, and it's worth knowing
`db:migrate` exists on its own (e.g. to (re)create the schema without touching data). Either
way, **run one of these before your first `npm run dev`** — it's not only for demo data:
`/api/admin/upcoming`, `/api/admin/celebrations`, `/api/admin/test-send`, and
`/api/admin/achievements` all assume the tables already exist and don't self-create them the
way the employees and cron routes do. Skip this step and the Dashboard's first API call fails
outright.

`db:seed` prints:

```
Seeded 6 employees and 1 achievement.
Two employees have a milestone firing today — try the admin dashboard's 'Send test celebration' button.
```

Take that second line with a grain of salt — see Part 2 for the real count.

```bash
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/admin`; since you have no session
cookie yet, the admin middleware immediately bounces that to `/login`. Enter the `ADMIN_KEY`
you set above. On success you land on the Dashboard.

## Part 2 — What the seed data actually contains

`lib/db/seed.ts` inserts 6 fictional employees and 1 pre-existing achievement:

| Employee | Department | Start date | Birthday | Shares birthday? |
|---|---|---|---|---|
| Amara Okafor | Engineering | exactly 5 years before today | — | — |
| Rashid Al Mansoori | Customer Success | exactly 1 year before today | — | — |
| Priya Nair | Design | exactly 2 years before today | today's month/day | yes |
| Diego Fernandes | Sales | 2022-03-14 (fixed) | 07-22 | yes |
| Lin Chen | Engineering | 2024-11-02 (fixed) | 01-30 | **no** |
| Fatima Al Suwaidi | People Ops | 2019-06-01 (fixed) | 09-09 | yes |

Three employees have dates computed relative to the moment you run `db:seed`, deliberately,
so there's always something due "today" no matter when you clone this. Running those dates
through the milestone rules in `lib/milestones/detect.ts` (configured milestone years: 1, 2,
3, 5, 10, 15, 20, 25, 30 — `lib/milestones/constants.ts`):

- **Amara Okafor** — 5-year anniversary today
- **Rashid Al Mansoori** — 1-year anniversary today
- **Priya Nair** — **both** a 2-year anniversary *and* her birthday today (2 is also a
  configured milestone year, and her seeded birthday is today's month/day)

That's 3 employees but **4 separate milestone events** — which is what the Dashboard's "Due
today" list actually shows: 4 cards, not the "two employees" the seed script's own log line
claims.

The seeded achievement — "Shipped the Q3 onboarding revamp" for Fatima Al Suwaidi — is
written directly into the database by the seed script, not through the achievement-logging
endpoint, so it never ran through `celebrateMilestone`. It won't appear in the Celebration
log, and there's no standalone "past achievements" list anywhere in the UI to see it either —
it exists as a database row and nothing more. Log a fresh one yourself in Part 4 to see that
flow actually fire.

Lin Chen's `shareBirthday: false` is the concrete demo of the README's "opt-in birthdays"
feature: her birthday never appears as due or upcoming, on any date — `getUpcomingMilestones`
only ever considers a birthday when `shareBirthday` is true, so this isn't just a UI filter.

**Resetting:** `employees.email` is unique, and `db:seed` always inserts fresh rows rather
than upserting — running it a second time against a database that already has these rows
fails with a unique-constraint error. To reset (e.g. the UTC calendar date rolled over since
you seeded, so nothing reads as "due today" anymore — see the README's timezone note, all
dates compare as UTC calendar dates, not local time):

```bash
rm -f local.db local.db-journal
npm run db:seed
```

## Part 3 — Proving the core flow works, at zero cost

On the Dashboard, "Due today" shows the 4 cards from Part 2, each with a **Send celebration**
button. Below that, "Coming up in the next 30 days" lists anything else on the horizon —
whether Diego's or Fatima's fixed dates show up there depends on the actual day you're
testing; Lin Chen's birthday, per Part 2, never will.

Click one of the "due today" cards, e.g. Amara Okafor's. That calls
`POST /api/admin/test-send`, which runs the same `celebrateMilestone` function the daily cron
uses (`lib/celebrate.ts`) for just that employee: generate a message, attempt delivery,
record the outcome. All three steps happen regardless of whether Slack or an AI provider is
configured — which is the point of this section.

With `SLACK_WEBHOOK_URL` blank (Part 1) and no AI provider reachable, here's exactly what
you'll see:

- A feedback line on the Dashboard: `anniversary: failed`.
- A new row on the **Celebration log** page (`/admin/log`): Amara's name, a red **failed**
  badge, a **Template fallback** badge, the generated message text —
  `🎉 Congratulations to Amara Okafor on 5 years at Acme Inc.! Thank you for everything you
  bring to the team.` (the fixed fallback template in `lib/ai/celebration-message.ts`;
  "Acme Inc." comes from `COMPANY_NAME`'s shipped default in `.env.example` — edit that and
  restart to personalize it, including in the AI-generated messages later) — and, underneath,
  the delivery error: `SLACK_WEBHOOK_URL is not configured (see .env.example).`

That's the answer to "can you preview a generated message without a real Slack webhook":
**yes** — the message is always generated and written to the Celebration log before delivery
is even attempted. There's no dedicated "preview" button, but the log doubles as one.

Click **Send celebration** on the same card again. The first attempt recorded
`deliveryStatus: "failed"`, so `celebrateMilestone` treats it as retryable and generates and
attempts again, rather than skipping it — you'll get `anniversary: failed` a second time, not
a duplicate. The database-level dedup only kicks in once a send actually succeeds
(`deliveryStatus: "sent"`) — worth coming back to click twice more after Part 5, once Slack is
really wired up, to see `already_celebrated` come back instantly with no second Slack message
and no second AI call. That's the unique index on `(employee_id, milestone_key)` in
`lib/db/schema.ts` doing the work, not just application logic.

## Part 4 — Roster: adding an employee and logging a real achievement

Still free. Go to `/admin/roster`.

- **Add employee** — name, email, department (optional), start date, and an optional `MM-DD`
  birthday behind a checkbox: "OK to celebrate their birthday publicly" (the `shareBirthday`
  flag from Part 2). `lib/validate/employee.ts` rejects a missing name, a malformed email, a
  start date that isn't `YYYY-MM-DD`, or a birthday outside `MM-DD`/a valid month-day range —
  worth trying one to show the inline validation error.
- **Active employees** table lists everyone active, each with a **Deactivate** button — a
  soft delete (`active` flips to `false`; the row and any celebration history stay in the
  database, nothing is actually removed). One easy-to-miss detail: `employees.email` is
  unique regardless of `active`, so deactivating someone doesn't free their email up for
  reuse.
- **Log an achievement** — pick an employee, give it a title (required) and optional
  details, submit. Unlike anniversaries and birthdays, this calls `celebrateMilestone`
  immediately (`app/api/admin/achievements/route.ts`) rather than waiting for the next cron
  run — you'll see inline text like `Logged and celebration sent.` or
  `Logged and celebration failed.` depending on whether Slack is configured, and a new row
  lands in the Celebration log right away. This is the cleanest single action for
  demonstrating the achievement path specifically, since (Part 2) the seeded achievement
  never went through this code path at all.

## Part 5 — Does this need a real Slack webhook?

Only for the final delivery step — detection, generation, the log, and dedup all work and are
fully visible without one (Parts 3–4). To make a real message land in a real channel:

1. Create a Slack workspace if you don't already belong to one — free.
2. Create an Incoming Webhook for a channel: https://api.slack.com/messaging/webhooks
3. In `.env.local`: `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/…` (your real one).
4. Restart `npm run dev`.
5. Click **Send celebration** again on a card that previously showed `failed` (or log a new
   achievement). The Celebration log entry should now show a green **sent** badge, no
   delivery error, and the message should actually appear in the Slack channel. Click it once
   more to see `already_celebrated` (Part 3's dedup note).

## Part 6 — Does this need a real AI provider key?

Only for the message text to be genuinely AI-written instead of the fixed template you saw in
Part 3. `generateCelebrationMessage` (`lib/ai/celebration-message.ts`) never throws — if the
underlying call fails for any reason (no provider configured, provider unreachable, bad
response), it's caught and the fallback template is used instead, with the Celebration log's
**Template fallback**/**AI-generated** badge telling you which happened.

`AI_PROVIDER` defaults to `cloudflare`. Two options:

| Provider | Cost | Env vars |
|---|---|---|
| Cloudflare Workers AI (default) | Free tier | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY` (`CLOUDFLARE_MODEL` optional, defaults to `@cf/meta/llama-3-8b-instruct`) |
| OpenAI (`AI_PROVIDER=openai`) | Paid — no free tier, needs billing on the account | `OPENAI_API_KEY` (`OPENAI_MODEL` optional, defaults to `gpt-4o-mini`) |

For the free option:

1. Sign up / log in at https://developers.cloudflare.com/workers-ai/ and grab an Account ID
   and an API token.
2. Add both to `.env.local`, restart `npm run dev`.
3. Trigger a fresh celebration (Part 3 or 4) — the badge should now read **AI-generated**,
   and the message reads like actual short, specific prose instead of the fixed template.

`COMPANY_NAME` (default `Acme Inc.`) feeds both the AI prompt and the fallback templates;
`MESSAGE_TONE` (`warm`, default, or `professional`) only affects the AI prompt — the fallback
text doesn't change with tone. Both are worth setting deliberately in `.env.local` before
recording anything.

## Part 7 — Testing the daily cron route directly

In production, `vercel.json` schedules a GET to `/api/cron/check-milestones` daily at 09:00
UTC, authenticated by Vercel automatically sending `Authorization: Bearer $CRON_SECRET`.
Locally, with `CRON_SECRET` set in `.env.local` (Part 1) and the dev server restarted:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-milestones
```

Without that header (or with `CRON_SECRET` unset), the route returns `401 Unauthorized` — a
quick way to demonstrate the auth gate itself. With it, you get JSON back:

```json
{ "date": "2026-09-12", "checked": 6, "outcomes": [
  { "employeeId": "...", "type": "anniversary", "status": "sent" },
  { "employeeId": "...", "type": "birthday", "status": "already_celebrated" }
]}
```

`checked` is every active employee scanned (6, right after seeding); `outcomes` only lists
the ones with an actual milestone today — 4 entries right after a fresh seed, matching Part
2. This is the same code path as the Dashboard's **Send celebration** button, just run once
for every active employee instead of one at a time — so anything you already clicked through
in Part 3/4 comes back `already_celebrated` here instead of `sent`.

## Part 8 — Running the automated test suite

```bash
npm test
```

Runs `vitest run` against everything matching `lib/**/*.test.ts` (`vitest.config.ts`) — 41
test cases across 4 files, all pure unit tests: no database, no network call.

- **`lib/milestones/detect.test.ts`** — the actual milestone math: exact-year anniversary
  matching, a leap-year start date, birthday matching including the Feb 29 → Feb 28 policy
  for non-leap years, years-of-service counting, the dedup key builders, and the "upcoming"
  window projection (including that it honors `shareBirthday`).
- **`lib/auth/admin-auth.test.ts`** — `ADMIN_KEY` verification, and the HMAC-signed session
  cookie: issued, valid, and correctly rejected when missing, tampered, expired, or signed
  with a different secret.
- **`lib/validate/employee.test.ts`** / **`lib/validate/achievement.test.ts`** — the input
  validation behind the Roster forms and their APIs.

`npm run test:watch` runs the same suite in watch mode.

What's *not* covered: `lib/celebrate.ts`, `lib/ai/`, and `lib/notify/slack.ts` (the parts that
touch the database or make a network call) have no tests, and there's no route-, UI-, or
end-to-end test at all — the README's own Roadmap lists "End-to-end tests (Playwright)" as
future work, consistent with what's actually here today.

## Part 9 — Lint, typecheck, build, and what CI checks

```bash
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

`.github/workflows/ci.yml` runs on every push and pull request to `main`: checkout → Node 22
→ `npm ci` → lint → typecheck → `npm test` → build, on `ubuntu-latest`. It sets five
placeholder env vars (`DATABASE_URL`, `ADMIN_KEY`, `SESSION_SECRET`, `CRON_SECRET`, a fake
`SLACK_WEBHOOK_URL`) purely so the build's route collection step doesn't throw on missing
config — it does **not** set any AI provider vars, so CI never makes a real AI call,
consistent with that path always having a non-throwing fallback (Part 6). If all four
commands above pass locally, CI will too — and that's exactly what `CONTRIBUTING.md` already
asks contributors to check before opening a PR.

## Suggested recording order

The parts above already build on each other in a reasonable order for a walkthrough:

1. Fresh clone → install → `.env.local` (keys set, Slack/Cloudflare blanked) →
   `db:migrate`/`db:seed` → `npm run dev`.
2. Log in, land on the Dashboard — point out the 4 "due today" cards computed live from the
   seed data.
3. Send one — show the Celebration log entry: message text present, `failed` badge,
   `Template fallback` badge.
4. Add a real `SLACK_WEBHOOK_URL`, restart, send another — `sent` in both the log and the
   actual Slack channel; send it again to show `already_celebrated`.
5. Add Cloudflare credentials, restart, send a third — badge flips to `AI-generated`, message
   reads noticeably differently.
6. Roster page: add an employee, then log a fresh achievement — watch it hit the log
   immediately, unlike the seeded one (Part 2).
7. `curl` the cron route with and without `CRON_SECRET` — 401 vs. a real JSON summary, mostly
   `already_celebrated` by this point.
8. `npm test`, and lint/typecheck/build if you want to show CI's exact checks passing locally.
