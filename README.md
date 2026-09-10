# Stock Condition Survey

A mobile-first Next.js application for property surveyors to record condition evidence, lifecycle assumptions, remedial works, photographs, and approved AI-assisted reports.

The interface runs in demo mode when Supabase variables are absent, so the complete navigation and survey flow can be reviewed before infrastructure is connected.

## Application flow

1. Create an account or sign in with email and password.
2. Create a property and generate its flats, rooms, or units.
3. Open a unit. The app resumes its active survey or creates a dated survey.
4. The flat workspace shows every catalog element and its explicit status.
5. Select an element and complete the six stages: element, construction, defects, lifecycle, works, and review.
6. Save partial or complete the element. Both actions return to the same flat workspace and suggest the next incomplete element.
7. Manually complete the survey after at least one element is saved. Incomplete coverage produces an acknowledgement warning but does not block completion.
8. Review portfolio records, generate a Claude-grounded report, edit it, approve the version, and export the branded PDF.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With blank environment variables the app uses realistic local demonstration data and keeps element drafts in IndexedDB.

Set `NEXT_PUBLIC_DEMO_MODE=true` when running the local Playwright suite or when you want to force the demonstration catalogue even if `.env.local` contains hosted Supabase credentials.

## Supabase setup

1. Create a new Supabase project.
2. Install the Supabase CLI and link this folder to the project.
3. Apply all migrations, including `supabase/migrations/202609050001_managed_reports.sql`.
4. Run `supabase/seed.sql`.
5. Enable email/password authentication and set the Site URL plus allowed redirect URLs for `/auth/callback` (for local development, `http://localhost:3000/auth/callback`; add the production URL too).
6. Copy the project URL and publishable key to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
7. Add `ANTHROPIC_API_KEY`. `ANTHROPIC_WORKSPACE_ID` is optional and should only be set when the key can access multiple Claude workspaces. Optionally override `ANTHROPIC_MODEL` and `REPORT_MAX_OUTPUT_TOKENS` (defaults to `16000`).
8. Add a non-empty server-only `SUPABASE_SERVICE_ROLE_KEY` and `REPORT_WORKER_SECRET`. The service role is used only by the report worker; never expose either value to the browser.

Report generation emits structured JSON events to the Next.js server log. Filter for
`[reports.generate]` to follow a request by its `requestId`; events cover validation,
authentication, query filters, per-survey element/finding/photo counts, snapshot size,
persistence, Claude request/response usage, failures, and completion. Secrets, prompts,
notes, and photo contents are never logged.

While Claude is processing, `claude.awaiting_response` is emitted every 10 seconds. The
full stored input and model response remain in the report row (`prompt_input_snapshot`
and `model_response`) rather than being printed to the terminal.

To keep generation responsive, Claude receives assessed elements and explicit coverage
totals; untouched catalogue elements are excluded from the model payload. The complete
survey evidence remains available in the source survey tables.

The migrations create organization-scoped row-level security, the private `survey-media` bucket and policies, the one-row-per-defect reporting view, catalog-seeding trigger, indexes, audit/idempotency storage, report scopes, property/building metadata, managed report sections/versions/generation jobs, and all required domain tables. The service-role key is required for asynchronous report processing and is referenced only from server code.

Report generation creates a durable job and returns immediately. The application invokes the worker after queueing; configure a trusted scheduler to POST to `/api/reports/worker` with the `x-report-worker-secret` header and `REPORT_WORKER_SECRET` value every minute to recover jobs after a process restart. The worker retries provider failures twice and records progress, request IDs, token usage, and sanitized errors in `report_generation_runs`.

Authenticated users can inspect and manually dispatch their organization's jobs at `/reports/jobs`. New report requests are rejected before queueing when `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` is missing, preventing permanently queued report rows. The scheduler secret remains server-only and is never sent to the jobs page.

Reports and jobs use URL-based pagination with ten rows per page. During generation, the report page shows worker progress rather than an empty editor. Claude returns strict narrative JSON; factual tables, costs, property/unit context, lifecycle values, and photographs are assembled deterministically from the stored survey snapshot before the complete document is saved.

New accounts use the Supabase email confirmation flow. The sign-up form stores the surveyor's full name in user metadata; the migration trigger provisions the matching profile in the seeded MVP organization. The seed also backfills profiles for Auth users who existed before the schema was deployed. Browser API calls send the current access token as a bearer header, and the server validates that token (or the SSR cookie session) before issuing any RLS-scoped query. Password reset links return through `/auth/callback` and then open `/reset-password`. All application pages redirect unauthenticated users to `/login`, while every write API independently validates the session and organization membership.

For a new development project, supply the exact direct or session-pooler Postgres URI from Supabase as a temporary `SUPABASE_DB_URL` environment variable (with the password percent-encoded), then run `npm run supabase:push`. The script previews pending migrations before applying them with the development seed. Never use `--include-seed` against an existing production database; Supabase documents it for fresh development/staging environments. [CLI deployment workflow](https://supabase.com/docs/guides/local-development/cli-workflows)

## Offline behavior

- Dexie stores active drafts, queued mutations, and image blobs.
- Zustand keeps the current six-stage form responsive.
- Client UUIDs and mutation IDs make retries idempotent.
- Writes automatically retry when connectivity returns.
- Version mismatches are retained as conflicts instead of overwriting server records.
- Report generation and PDF export are intentionally online-only.
- The production service worker uses network-first caching for the application shell. IndexedDB remains the source of truth for unsynced survey work.

## Report safeguards

Claude receives a stored survey snapshot, never free-form claims. The system prompt prohibits invented costs, unseen defects, standards compliance, structural conclusions, and legal advice. The prompt input, raw model response, editor changes, timestamps, approver, and version state are retained. PDF export checks for an approved report.

## Quality commands

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The lifecycle tests cover overdue values and planning boundaries. The schema tests cover inaccessible-element validation. The implementation is structured for Playwright coverage once test credentials and a Supabase test project are supplied.

## Main locations

- `src/app/(app)` — application pages
- `src/components/survey/element-stepper.tsx` — six-stage assessment flow
- `src/lib/offline/db.ts` — IndexedDB outbox and media queue
- `src/app/api` — protected mutations, uploads, reports, and PDF export
- `supabase/migrations` — database, RLS, storage, and views
- `src/lib/catalog.ts` — full component catalog extracted from the supplied prototype
