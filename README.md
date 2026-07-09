# Hammer Academy

A production school communication platform connecting parents, teachers, and admin for a primary school (Grades 1-5) in Ethiopia — replacing manual SMS communication with a structured, secure system.

## Features

- Role-based access (Admin, Teacher, Parent) with server-enforced permissions
- Student result pipeline: teacher entry → admin approval → publish → parent view (with locking after publish)
- School/grade/class-scoped announcements
- SMS-first notifications via SMSEthiopia for results, announcements, and issue responses
- Parent issue reporting with admin/teacher response flow
- Phone-based OTP password reset
- Full audit logging of sensitive admin actions
- Distributed rate limiting (Upstash Redis) and error monitoring (Sentry)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma 7 · Auth.js v5 · Supabase (PostgreSQL) · Upstash Redis · SMSEthiopia · Sentry

## Getting Started

```bash
npm install
npx prisma generate
npm run dev
```

Requires a `.env` file with `DATABASE_URL`, `AUTH_SECRET`, `SMS_ETHIOPIA_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `NEXT_PUBLIC_APP_URL`.