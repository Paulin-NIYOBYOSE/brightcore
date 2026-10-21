# BrightCore Careers

**Recruitment and Applicant Management System.** Candidates discover open roles and apply in a few minutes, without creating an account. Recruiters sign in to publish jobs, review applicants, download CVs and record decisions.

Built with Next.js 16 (App Router), TypeScript, PostgreSQL and Prisma.

## Contents

- [Quick start](#quick-start)
- [Five-Minute Evaluation Guide](#five-minute-evaluation-guide)
- [Main features](#main-features)
- [Technology choices](#technology-choices)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Database migrations and seeding](#database-migrations-and-seeding)
- [Development admin login](#development-admin-login)
- [Candidate workflow](#candidate-workflow)
- [Administrator workflow](#administrator-workflow)
- [Automated tests](#automated-tests)
- [Linting and type checking](#linting-and-type-checking)
- [Production build](#production-build)
- [Security and private CV storage](#security-and-private-cv-storage)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)
- [Improvements with more time](#improvements-with-more-time)

## Quick start

Requires Docker with Docker Compose.

```bash
cp .env.example .env          # optional: change the passwords in .env
docker compose up --build     # first build takes a few minutes
```

Open **http://localhost:3000**. Recruiters sign in at **http://localhost:3000/admin/login** with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (see [Development admin login](#development-admin-login)).

Compose starts PostgreSQL, applies migrations, seeds the administrator and sample data, and then starts the app. Data is kept in Docker volumes across restarts.

## Five-Minute Evaluation Guide

### Step 1: Start the app

Follow the [Quick start](#quick-start) (or [Running locally](#running-locally) without Docker), then open http://localhost:3000.

### Step 2: Browse jobs

- The careers page lists **four open sample jobs** with location, employment type, closing date and summary.
- Try the search ("kigali", "designer") and the employment-type filter.
- Open **Senior Full-Stack Engineer** to see the description, responsibilities, requirements and closing date.

### Step 3: Apply for a job

1. Click **Apply for this role**.
2. Fill in the form and choose any PDF under 5 MB.
3. Submit. A confirmation with a reference number (e.g. `BC-1A2B3C4D`) appears.

### Step 4: Test validation

- **Duplicate:** apply to the same job again with the same email, even with different capitalisation (`Jane@Example.com` vs `jane@example.com`). You see: *"You have already applied for this job with this email address."*
- **Invalid files:** choose a `.txt` or `.docx` file (the file dialog shows PDFs by default; switch it to *All files*). It is rejected in the browser. Then rename a text file to `cv.pdf` and submit: the server rejects it because the bytes are not a PDF.
- **Expired closing date:** the seeded **Data Analyst** job is still marked OPEN but its closing date has passed. It is hidden from the listing. In the admin Jobs page, click its external-link icon: the job page says applications are closed and offers no form.
- **Manually closed job:** the seeded **DevOps Engineer** job is CLOSED before its closing date and behaves the same way.
- **Server-side enforcement:** open the apply page of an open job in one tab. In another tab, sign in as admin and **Close** that job. Submit the form in the first tab: the server rejects it with *"Applications for this job are closed."* Reopen the job afterwards.

Closing-date boundaries (open until 23:59:59 Kigali time, closed from 00:00 the next day) are covered by automated tests with a controlled clock. You don't need to wait for a date to pass.

### Step 5: Review as administrator

1. Visit http://localhost:3000/admin/login and sign in with the development credentials.
2. The **Dashboard** shows live counts: total and open jobs, total, pending, accepted and rejected applications, plus a per-job breakdown. Your new application is counted as **Pending** and appears under *Latest applications*.

### Step 6: Review the applicant

Open **Applications**, filter by job or status if you like, and click **Review** on your application. You see the candidate's details, cover note and **Download CV** (a PDF attachment).

### Step 7: Change the decision

Click **Accept** or **Reject**, optionally add a note, and confirm. The status badge, decision time and note update straight away. Go back to the Dashboard: the counts have changed. The decision is stored in PostgreSQL, so it survives restarts.

### Step 8: Verify security and tests

```bash
# Signed-out requests are refused (401, JSON body, no file contents):
curl -i http://localhost:3000/api/admin/applications/b2e4d3c5-6a7f-4081-9b12-1c2d3e4f5a01/cv

# Admin pages redirect signed-out visitors to the login page (307):
curl -i http://localhost:3000/admin

# Automated tests (76 tests), inside Docker:
docker compose --profile test run --rm test
```

Signing out deletes the session in the database, so a copied session cookie stops working immediately.

## Main features

**Candidates (public, no account)**
- Careers page listing jobs that are OPEN and not past their closing date, with search by title or location and an employment-type filter (plain GET form: works without JavaScript, results are shareable URLs).
- Job pages with description, responsibilities, requirements, closing date and clear "applications closed" states. Drafts return a real 404.
- Accessible application form: labelled fields, field-level errors, character counter, PDF picker showing the chosen file with **Replace** and **Remove**, and a submitting state that prevents double submission.
- Confirmation with a reference number.

**Recruiters (authenticated)**
- Secure sign-in and sign-out, with rate limiting.
- Dashboard with database-driven counts and a per-job status breakdown.
- Job management: create (save as draft or publish), edit, publish, close and reopen, each with a confirmation dialog. Closing never deletes applications.
- Application management: filter by job and status, pagination, detail view with cover note, authenticated CV download, accept or reject with an optional internal note, and revising a decision.

## Technology choices

| Choice | Why |
| --- | --- |
| **Next.js 16 (App Router)** | One codebase for the public site, admin UI and server logic. Server Components query the database directly; Server Actions handle mutations, with built-in origin checks against CSRF. |
| **TypeScript (strict)** | Types flow from the database schema (Prisma) through services to the UI. |
| **PostgreSQL + Prisma 7** | Relational data with real constraints (foreign keys, unique indexes, CHECK constraints). Prisma gives typed, parameterised queries and versioned migrations. Prisma 7 uses the `pg` driver adapter, so there is no native query engine to ship. |
| **Zod 4** | One schema per input, shared by the browser (instant feedback) and the server (the authority). |
| **React Hook Form** | Client-side validation with the same Zod schemas, without re-rendering on every keystroke. |
| **Argon2id** (`@node-rs/argon2`) | Current OWASP recommendation for password hashing; prebuilt binaries, no compiler needed. |
| **Database-backed sessions** | Simple to reason about and explain, and sign-out revokes a session instantly. No auth library needed for one administrator role. |
| **Tailwind CSS 4 + small in-repo UI primitives** | Components follow the shadcn/ui pattern (`cva` + `tailwind-merge`) but are written in the repo instead of generated, which keeps dependencies minimal. Dialogs use the native `<dialog>` element. |
| **Vitest + Testing Library** | Fast unit, integration (real PostgreSQL) and component tests. |
| **Docker Compose** | One command for evaluators; no paid services. |

## Architecture

```
Browser
  │  GET pages            POST server actions            GET CV download
  ▼                       ▼                              ▼
src/app  (routes: thin entry points)
  • pages (Server Components) ─ read data via services
  • actions.ts ("use server")  ─ 1. authenticate (admin actions)
  • api/.../cv/route.ts           2. call a service
                                  3. revalidate pages / redirect
  │
  ▼
src/server  (server-only)
  • services/   business rules: jobs, applications, dashboard
  • auth/       Argon2id, DB sessions, cookie helpers, rate limiter
  • storage/    CvStorage interface + local private disk, PDF checks
  • db.ts, env.ts, logger.ts
  │
  ▼
PostgreSQL (Prisma)          Private CV directory (outside public/)

src/lib  (shared with the browser): Zod schemas, closing-date rules, constants
```

- **Business logic lives in services**, which take plain inputs (and an injectable `now` for date rules). They are tested directly against a real database.
- **Authentication happens at every entry point**: each admin page calls `requireAdminPage()`, and each admin server action and API route calls `getCurrentAdmin()`. Both validate the session against the database. The `proxy.ts` redirect is only a convenience.
- **Inputs are typed as `unknown`** at the boundary and parsed with Zod before use.

**Submission flow** (`submitApplication` in `src/server/services/applications.ts`):

1. Load the job. It must exist, not be a draft, be OPEN and be on or before its closing date in Kigali time.
2. Validate the form fields and the CV bytes together, so the candidate sees every problem at once.
3. Check for an existing application with the same normalised email for this job.
4. Save the CV under a random key, then insert the application as `PENDING`.
5. If the insert fails, delete the saved file. A unique-constraint violation (two simultaneous submissions) is reported as a duplicate.

## Project structure

```
prisma/
  schema.prisma              data model
  migrations/                SQL migrations (including CHECK constraints)
  seed.ts                    administrator + sample data (idempotent)
  sample-pdf.ts              tiny PDF builder for sample CVs and tests
src/
  app/
    (public)/                careers site: /, /jobs/[jobId], /jobs/[jobId]/apply
    admin/login/             sign-in page
    admin/(dashboard)/       protected admin pages and their server actions
    admin/auth-actions.ts    login / logout actions
    api/admin/applications/[applicationId]/cv/route.ts   authenticated CV download
  components/                ui/ primitives, public/ and admin/ components
  lib/                       validation schemas, date rules, constants (browser-safe)
  server/                    services, auth, storage, db, env (server-only)
  proxy.ts                   optimistic admin redirect
  instrumentation.ts         validates environment variables at startup
tests/
  unit/                      pure logic (dates, PDF checks, validation, storage)
  integration/               services, server actions and the CV route on PostgreSQL
  ui/                        application form (jsdom)
  support/                   test setup, factories, Next.js request mocks
docker/postgres/init/        creates the test database in the Compose PostgreSQL
Dockerfile, docker-compose.yml, .github/workflows/ci.yml
```

## Prerequisites

- **Docker route:** Docker with Docker Compose v2.
- **Local route:** Node.js 22.12+ (developed on Node 24/25), npm, and PostgreSQL 14+ (tested on 14 locally and 17 in Docker). You can use the Compose `db` service for PostgreSQL.

## Environment variables

Copy `.env.example` to `.env`. It contains placeholders only; `.env` is git-ignored.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (outside Docker) | PostgreSQL URL for the app, migrations and seed. Compose sets its own value for containers. |
| `TEST_DATABASE_URL` | for tests | Separate database for tests. **Its tables are emptied**; its name must contain `test`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Docker | Credentials for the Compose PostgreSQL container. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | The administrator the seed creates. Password: at least 12 characters, stored as an Argon2id hash. |
| `APP_TIMEZONE` | no (default `Africa/Kigali`) | Business timezone for closing dates. |
| `CV_STORAGE_DIR` | no (default `./storage/cvs`) | Private CV directory. Must be outside `public/`. |
| `SESSION_COOKIE_SECURE` | no | Defaults to `true` in production. Compose sets `false` because it serves plain HTTP on localhost. |
| `SEED_SAMPLE_DATA` | no (default `true`) | Set `false` to seed only the administrator. |
| `APP_PORT`, `POSTGRES_PORT` | no | Host ports for Compose (defaults 3000 and 5433). |

The server validates its configuration at startup and names any missing or invalid variable, without printing values.

## Running locally

### With Docker (recommended)

```bash
cp .env.example .env
docker compose up --build        # add -d to run in the background
```

- App: http://localhost:3000. Use `APP_PORT=3100 docker compose up` if port 3000 is taken.
- Stop with `docker compose down`. Data stays in the `pgdata` and `cv_storage` volumes. `docker compose down -v` deletes them.

### Without Docker for the app

```bash
npm install                      # also generates the Prisma client
cp .env.example .env             # point DATABASE_URL / TEST_DATABASE_URL at your PostgreSQL
docker compose up -d db          # optional: PostgreSQL on localhost:5433
npm run db:setup                 # apply migrations, then seed
npm run dev                      # http://localhost:3000
```

If you use your own PostgreSQL instead of the `db` service, create the two databases first, e.g. `createdb brightcore && createdb brightcore_test`.

## Database migrations and seeding

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | `prisma migrate deploy`: applies pending migrations. Never resets data. |
| `npm run db:seed` | Creates the administrator and sample data if missing. Safe to rerun: records use fixed IDs and are never overwritten. If `ADMIN_PASSWORD` changed, it updates the hash and signs out existing sessions. |
| `npm run db:setup` | Both of the above. |
| `npm run db:migrate:dev` | Development only: create a new migration after editing `schema.prisma`. |
| `npm run db:generate` | Regenerate the Prisma client (runs automatically on `npm install`). |

In Docker, the one-off `migrate` service runs `migrate deploy` and the seed on every `docker compose up`, before the app starts. Both are idempotent.

**Seeded data:** seven jobs (four open; one OPEN but past its closing date; one manually CLOSED; one DRAFT) and four clearly fictional sample applications (`*.sample@example.com`) covering all three statuses, each with a generated sample PDF CV.

## Development admin login

- **Email:** `ADMIN_EMAIL` from `.env` (example value: `admin@brightcore.test`)
- **Password:** `ADMIN_PASSWORD` from `.env`. If you kept the example file unchanged, it is `replace-with-a-local-admin-password`.

To change it, edit `.env` and rerun the seed (`npm run db:seed`, or restart Compose). The seed never prints the password.

These are development credentials for local evaluation only. A real deployment sets its own secrets.

## Candidate workflow

1. Browse `/` and search or filter.
2. Open `/jobs/[jobId]` to read the details.
3. Apply at `/jobs/[jobId]/apply` with name, email, phone, cover note and a PDF CV (up to 5 MB).
4. See the confirmation and reference. The application is stored as **Pending**.

## Administrator workflow

| Route | Purpose |
| --- | --- |
| `/admin/login` | Sign in |
| `/admin` | Dashboard: counts by status, per-job breakdown, latest applications |
| `/admin/jobs` | All jobs with status, closing date and application count; publish, close, reopen |
| `/admin/jobs/new` | Create a job (save as draft or publish) |
| `/admin/jobs/[jobId]/edit` | Edit a job's content |
| `/admin/applications` | Applications, filterable by job and status, paginated |
| `/admin/applications/[applicationId]` | Candidate details, cover note, CV download, decision |
| `/api/admin/applications/[applicationId]/cv` | Authenticated CV download (attachment) |

**Status rules**

- Jobs: `DRAFT → OPEN` (publish), `OPEN → CLOSED` (close), `CLOSED → OPEN` (reopen). Publishing and reopening require a closing date of today or later. Any other change is refused.
- Applications: always created as `PENDING` by the system. An administrator can set `ACCEPTED` or `REJECTED`, revise between the two, and edit the note. Nothing can set an application back to `PENDING`.

## Automated tests

```bash
npm test                                    # all 76 tests (needs TEST_DATABASE_URL)
npx vitest run --project unit               # no database needed
npx vitest run --project integration
npx vitest run --project ui
docker compose --profile test run --rm test # everything inside Docker
```

Integration tests run against a real PostgreSQL test database. Migrations are applied once, and every test starts with empty tables and an empty CV directory. Tests that depend on dates pass a fixed "now" to the services, so they never depend on the real date. Server actions and the CV route handler are called directly, with Next.js request APIs (cookies, headers, redirect) replaced by a small test request context.

| Requirement | Test |
| --- | --- |
| Valid application is created and starts as PENDING | `tests/integration/submit-application.test.ts` |
| Closed job rejects applications | same file |
| Expired job rejects applications | same file |
| Job closing today stays open all day (Kigali time) | same file, and `tests/unit/closing-date.test.ts` |
| Duplicate (normalised email, same job) rejected; concurrent duplicates | `submit-application.test.ts` |
| Same email can apply to a different job | `submit-application.test.ts` |
| Invalid, empty and oversized CVs rejected, nothing stored | `submit-application.test.ts`, `tests/unit/cv-files.test.ts` |
| CV file removed if the database write fails | `submit-application.test.ts` |
| Administrator accepts / rejects with a note | `tests/integration/admin-actions.test.ts` |
| Unauthenticated, forged or expired sessions cannot use admin actions | `admin-actions.test.ts` |
| Unauthenticated users cannot download CVs (401); IDs and paths validated | `tests/integration/cv-download.test.ts` |
| Password hashing, session hashing and expiry, rate limiting, safe redirects, sign-out | `tests/integration/admin-auth.test.ts`, `tests/unit/*` |
| Mass-assignment protection (unexpected fields rejected) | `admin-actions.test.ts`, `tests/unit/validation.test.ts` |
| Job transitions, public listing rules, search, dashboard counts | `tests/integration/jobs-and-dashboard.test.ts` |
| Form behaviour: validation, file checks, replace and remove, server errors | `tests/ui/application-form.test.tsx` |

## Linting and type checking

```bash
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript rules)
npm run typecheck    # regenerates route types, then tsc --noEmit (strict)
```

`.github/workflows/ci.yml` runs lint, type check, tests (with a PostgreSQL service) and the build on pushes and pull requests. It is included but has not been run on GitHub from this repository yet.

## Production build

```bash
npm run build                    # standalone output in .next/standalone

# Run the standalone server, as the Docker image does:
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
CV_STORAGE_DIR="$PWD/storage/cvs" node .next/standalone/server.js
```

The standalone server changes its working directory to `.next/standalone`, so give `CV_STORAGE_DIR` as an absolute path. `npm start` also works for a quick local check, but Next.js prints a warning about the standalone output.

The Docker `runner` image contains only the standalone server, runs as the non-root `node` user, and gets its configuration from environment variables.

## Security and private CV storage

**CV uploads**
- Limit enforced in the browser (fast feedback), by the Server Action body limit (6 MB including form overhead), and by the service (5 MB on the actual bytes).
- The server checks the bytes: a `%PDF-x.y` signature at the start and an `%%EOF` marker at the end. The file name, extension and browser-reported MIME type are never trusted. Empty files are rejected.
- Stored as `<random UUID>.pdf` in `CV_STORAGE_DIR`, outside `public/`, with file mode `0600`. The candidate's file name is sanitised and kept only for display and downloads.
- Storage sits behind a small `CvStorage` interface (`save`, `read`, `remove`), so a private object-storage bucket could replace the local disk without touching callers.
- Downloads only go through `/api/admin/applications/[id]/cv`. The route authenticates the administrator, validates the ID, takes the storage key from the database (never from the request), checks that the resolved path stays inside the storage directory, and responds with `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` and a sandboxing CSP.

**Authentication and sessions**
- Passwords are hashed with Argon2id (19 MiB memory, 2 passes). Unknown emails still run a hash check, so response timing doesn't reveal which accounts exist. Login errors are generic.
- Sessions use a 256-bit random token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only the token's SHA-256 hash is stored, so a database leak cannot be replayed. Sessions expire after 8 hours and are deleted on sign-out. Nothing is kept in `localStorage`.
- Failed sign-ins are limited to 5 per 15 minutes per client address and email.
- After sign-in, the `next` redirect only accepts paths under `/admin`, which blocks open redirects.

**Requests and data**
- SQL injection: all queries go through Prisma with parameters, and the only raw SQL is a static `TRUNCATE` in test setup. Search wildcards are escaped.
- Validation: every server boundary parses `unknown` input with Zod. Admin payloads use strict objects, so unexpected fields such as `status` or `email` are rejected (mass assignment). Data is written by explicit field mapping.
- IDOR: route and action IDs must be UUIDs. Decisions update exactly one application's decision fields. All admin data requires an authenticated administrator.
- XSS: everything renders through React's escaping; cover notes are shown as plain text; there is no `dangerouslySetInnerHTML`.
- CSRF: every change goes through a POST Server Action, which Next.js rejects when the `Origin` doesn't match the host. Cookies are `SameSite=Lax`, and no GET request changes data (the CV download is read-only).
- Errors: candidates and administrators see friendly messages. Details go to structured server logs that contain IDs and error codes, never passwords, tokens or CV contents.
- Headers: Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in production. `X-Powered-By` is removed.
- Database integrity: foreign keys (applications cannot outlive their job), a unique `(jobId, email)` index, and CHECK constraints that emails are stored trimmed and lower-cased.
- Secrets: `.env`, uploaded CVs, generated code and build output are git-ignored and excluded from the Docker build context.

This project has not been independently security-audited. The list above describes what is implemented.

## Assumptions

- **Closing dates** are calendar dates in the business timezone (`APP_TIMEZONE`, default `Africa/Kigali`, UTC+2, no daylight saving). A job accepts applications through the whole closing date and is closed from 00:00 the next day. The rule is checked on the server on every submission and in every listing query.
- **"Open jobs"** on the dashboard means jobs candidates can apply to today: status OPEN and closing date not passed. An OPEN job past its date shows as *Closing date passed*.
- **Emails** are compared after trimming and lower-casing (no provider-specific rules such as Gmail dots).
- **Phone numbers** are free-form international numbers: an optional `+`, digits, spaces and common separators, with 7 to 15 digits.
- **Single administrator role.** Every signed-in administrator can manage all jobs and applications.
- **Decision notes** are internal and never shown to candidates.
- Jobs cannot be deleted, which keeps every application's history intact.

## Known limitations

- **Rate limiting is in memory**, per server process, and resets on restart. The client address comes from `X-Forwarded-For`, which a client can spoof unless a trusted proxy sets it. A multi-instance deployment would need a shared store such as Redis.
- **CSP allows `'unsafe-inline'` scripts**, which Next.js needs without nonce-based CSP. Nonces would be stronger.
- **CVs are checked for PDF structure, not malware.** PDFs can contain active content. Downloads are forced to attachments, but a production system should add antivirus scanning.
- **Local disk storage** fits a single server. Multiple instances would need shared private object storage.
- **No candidate notifications** (email) and no candidate-facing status page.
- **Sessions** have a fixed 8-hour lifetime: no sliding renewal and no "sign out everywhere" button (changing `ADMIN_PASSWORD` and reseeding signs out all sessions).
- **Status codes:** admin "record not found" pages show the not-found screen (marked `noindex`) but return HTTP 200, because the admin loading skeleton starts streaming first. Public pages and the CV API return proper 404s.
- **Race window:** a submission that passes the "job is open" check in the same instant an administrator closes the job can still be saved.
- **Dependency audit:** `npm audit` reports a `braces` advisory in ESLint's development tooling (`eslint-config-next`). Production dependencies report 0 vulnerabilities.
- Without the Docker `buildx` plugin, Compose uses the classic builder and prints a warning. The build still works.

## Improvements with more time

- Email notifications to candidates on decisions, using an outbox table written in the same transaction as the status change.
- Audit trail: which administrator made each decision, and the history of changes.
- Multiple administrator accounts with roles, password reset and MFA.
- Private object storage (e.g. S3) with antivirus scanning on upload.
- Redis-backed rate limiting, and nonce-based CSP.
- Browser end-to-end tests (Playwright) in CI, and automated accessibility checks (axe).
- Full-text search, and pagination on the public listing.
- Kinyarwanda and French translations.
