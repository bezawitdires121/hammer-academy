# Hammer Academy

A production school communication platform connecting parents, teachers, and admin for a primary school (Grades 1–5) in Ethiopia , replacing manual SMS communication with a structured, secure system.

**Live app:** https://hammer-academy.vercel.app *(access is role-based; accounts are provisioned by the school admin, not self-registered)*

Since the dashboards are behind authentication, here's what each role actually experiences:

## Admin

- Creates and manages every account (teachers, parents, students) : there's no public sign-up
- Assigns teachers to specific subjects within specific classes (e.g. Mr. Dawit → Grade 3A Mathematics)
- Reviews every class's draft results for a given exam in one screen, then approves and publishes the entire class at once
- Posts school-wide, grade-specific, or class-specific announcements
- Responds to parent-submitted issues
- Views a full audit log of every sensitive action taken in the system, with who/what/when
- Can deactivate/reactivate any account without deleting its history

## Teacher

- Sees only the subjects they're actually assigned to teach (e.g. "Mathematics : Grade 3A")
- Enters marks for every student in a class for one subject at a time, selecting the exam/result type (Midterm, Final, etc.)
- Can revise a draft at any time before admin publishes it : once published, it's locked and requires an admin to unpublish first
- Reviews their own entered results grouped by class → exam → student
- Can respond to parent-submitted issues

## Parent

- Sees only their own child's (or children's) *published* results — drafts are never visible, enforced at the database query level, not just hidden in the UI
- Each child gets a separate section showing subject-by-subject marks, grade, overall average, and teacher remarks for each exam
- Receives school announcements relevant to their child's grade/class, plus school-wide ones
- Can submit questions or concerns directly to the school and gets notified when the school responds
- Can reset their password via a phone-verified one-time code : no email required

## Notifications

Every important update : a published result, a new announcement, a response to a submitted issue : triggers an SMS via SMSEthiopia. To protect student privacy, **SMS messages never contain grades, personal details, or full message content** , they include a short preview and a secure link that requires login to view the full details, deep-linking straight to the relevant page (announcements, issues, or the parent's own dashboard for results).

## Security

- Server-enforced role-based access control on every route and every server action (not just hidden UI)
- Passwords hashed with bcrypt; rate-limited login (distributed via Upstash Redis, so it holds up across serverless instances)
- All sensitive admin/teacher actions are permanently audit-logged
- Every input validated server-side with Zod before touching the database
- Phone numbers normalized to a single consistent format across the whole app
- Error monitoring via Sentry (Session Replay intentionally disabled to avoid ever recording a parent viewing their child's grades)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma 7 · Auth.js v5 · Supabase (PostgreSQL) · Upstash Redis · SMSEthiopia · Sentry

## Local Development

```bash
npm install
npx prisma generate
npm run dev
```

Requires a `.env` file with `DATABASE_URL`, `AUTH_SECRET`, `SMS_ETHIOPIA_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `NEXT_PUBLIC_APP_URL`. No seed credentials are published here since this connects to a real school's production data , accounts are provisioned by an admin.
