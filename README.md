# PCP Planner

A guided web app that walks a Canadian food facility operator through
building a Preventive Control Plan aligned with CFIA and the Safe Food for
Canadians Regulations (SFCR): facility profile, GMPs/prerequisite programs,
per-product process flow and hazard analysis, CCP determination (Codex
four-question decision tree), preventive control details, recall planning
(team roles/contacts + annual mock recall log), food-safety SOP drafting,
and export to a formatted Word document.

This is a working scaffold, not a finished product — see "What's stubbed
out" below before treating this as production-ready.

## Wizard steps

1. **Facility Profile** — facility name/address, regulatory scope
   (CFIA/SFCR licence vs. provincial/municipal), responsible individual.
   Shared across every product on the plan.
2. **GMPs & Prerequisite Programs** — generates starter documents for
   personnel health & hygiene, code of conduct, attire/dress code, vendor
   qualification, transportation letters of guarantee, sanitation, pest
   control, personnel training, corporate structure, and job descriptions.
3. **Products** — add as many products as the facility makes; each one
   gets its own description, intended use/consumer, packaging, and shelf
   life.
4. **Process Flow** *(per product)* — the steps a specific product goes
   through, receiving to shipping.
5. **Hazard Analysis** *(per product)* — biological/chemical/physical/
   radiological hazards at each step, with seeded suggestions.
6. **CCP Determination** *(per product)* — the Codex four-question decision
   tree, re-evaluated server-side on every answer.
7. **Preventive Controls** *(per product)* — critical limits, monitoring,
   corrective action, verification, recordkeeping, responsible party for
   each CCP.
8. **Recall Plan** — assign named team members with roles and contact
   info, log mock recalls (CFIA expects at least one annually, with an
   overdue warning if none is on file), and generate the written recall
   plan document from that data.
9. **SOPs** — remaining hazard-specific documents: allergen control and
   supply-chain (supplier verification).
10. **Review & Export** — summary stats and the unlock/export flow.

## Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to push
this to GitHub and run it on Render with managed Postgres.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Prisma** ORM, targeting Postgres (see DEPLOYMENT.md for provisioning
  one — locally you can point `DATABASE_URL` at any Postgres instance,
  including a free Neon/Supabase database or Docker)
- **NextAuth** (credentials provider, JWT sessions — no third-party identity
  provider ever sees user data)
- **Stripe** for billing (one-time plan unlock + optional recurring storage
  subscription), with a dev-mode bypass so the whole flow is testable
  without live keys
- **docx** for generating the exported Word document

## Running locally

```bash
cd pcp-planner
npm install
cp .env.example .env        # fill in DATABASE_URL (Postgres) and NEXTAUTH_SECRET at minimum
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The schema targets Postgres (see "Deploying" above) — `DATABASE_URL` needs
to point at a real Postgres instance even for local dev. A free
[Neon](https://neon.tech) or [Supabase](https://supabase.com) database
works well for this, or run one locally with
`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres`.

**Verification note:** this scaffold was built and checked in a sandboxed
environment whose network allowlist blocks Prisma's engine-binary CDN
(`binaries.prisma.sh`), so `prisma generate` / `prisma migrate` couldn't be
run to completion there. What *was* verified in that environment: `npm
install` completes cleanly, and `next build`'s webpack compilation stage
passes with zero syntax/import errors across every route and component
(40+ files, including the multi-product rework). Run `npx prisma generate`
followed by `npm run build` on a machine with normal network access (any
laptop, CI runner, or standard host) — that step is required once and will
generate the Prisma Client types the rest of the app expects.

Visit `http://localhost:3000`. Register an account, create a plan, and walk
through the wizard. Since `STRIPE_SECRET_KEY` is blank by default, the
Review & Export step will offer a "(Dev mode) Simulate unlock" button instead
of a real Stripe checkout, so you can test the full flow including docx
export without billing credentials.

## Data model

See `prisma/schema.prisma`. Key entities:

- `User` — account + membership/billing state
- `Plan` — one Preventive Control Plan for a facility, owns a serialized
  JSON `facilityProfile` string (SQLite has no native Json column) plus
  relational `products`, `sops`, `recallContacts`, `mockRecallRecords`, and
  export records
- `Product` — one product made at the facility (a plan can have any
  number). Holds product-specific fields (description, intended use/
  consumer, packaging, shelf life) and owns its own `processSteps`
- `ProcessStep` — one step in a *product's* process flow, ordered
- `Hazard` — one hazard at a process step, including the four CCP
  decision-tree answers and the resulting `ccpStatus`, plus preventive
  control fields (critical limit, monitoring, corrective action,
  verification, recordkeeping, responsible party)
- `Sop` — a generated/edited GMP or food-safety document (markdown-ish
  plain text). Which wizard step it appears under (GMP / Recall / SOPs) is
  determined by its `category` in `src/lib/sopTemplates.ts`, not stored on
  the row itself
- `RecallContact` — a named recall-team member with role + phone/email
- `MockRecallRecord` — a logged mock recall exercise (date, performed by,
  % traced, results summary)

Note: several fields that would naturally be Prisma `enum`s (membership
tier, plan status, hazard type/severity/likelihood, CCP status) are typed
as `String` instead, because SQLite doesn't support Prisma enums. Allowed
values are documented in comments in the schema and enforced in application
code.

## Core logic

- `src/lib/ccpDecisionTree.ts` — pure-function implementation of the
  Codex four-question CCP decision tree. The API route
  (`/api/plans/[id]/products/[productId]/process-steps/[stepId]/hazards/[hazardId]`)
  re-runs this server-side on every answer update, so `ccpStatus` is never
  trusted from the client.
- `src/lib/hazardLibrary.ts` — seed hazard suggestions keyed by common
  process-step names, to give first-time users a running start. Always
  editable/removable — not a substitute for a real hazard analysis.
- `src/lib/sopTemplates.ts` — starter templates for GMPs/prerequisite
  programs, the recall plan, and remaining food-safety SOPs, each
  interpolating the facility profile (and, where relevant, the product
  list, recall team, and mock-recall history). Generated documents are
  fully editable afterward. `src/components/TemplateDocsEditor.tsx` is the
  shared generate/edit UI used by the GMP, Recall, and SOPs steps.
- `src/lib/exportDocx.ts` — assembles the whole plan (facility profile,
  product list, GMPs, per-product process flow + hazard tables, per-product
  CCP detail, recall team/mock-recall tables, SOPs) into a single `.docx`
  via the `docx` package.
- `src/lib/entitlements.ts` — single source of truth for what a user/plan
  is entitled to (export gating, retention window, active subscription
  check) so the UI, API routes, and any future retention-purge job agree.

## Privacy & data handling

This tool is designed to hold sensitive, non-public facility and process
information, so:

- **Isolation by construction.** Every API route resolves the current user
  from the signed session (`src/lib/session.ts`) and scopes every Prisma
  query by `userId` (directly, or transitively through the owning `Plan` /
  `Product`). There is no endpoint that accepts a bare plan/product/step/
  hazard id without also checking ownership.
- **Credentials, not OAuth.** Sign-in is email + password (bcrypt-hashed,
  12 rounds), so no third-party identity provider is in the data path.
  Sessions are signed JWTs (`NEXTAUTH_SECRET`), not server-stored sessions.
- **Retention model.** Plans on the standard (non-subscribed) tier get a
  `retentionExpiresAt` timestamp (`DEFAULT_RETENTION_DAYS`, default 90) set
  on creation and refreshed on unlock/subscription events
  (`src/lib/entitlements.ts`). An active storage subscription
  (`User.storageSubscriptionEnd`) removes that expiry. **Note:** the actual
  purge job (a scheduled task that deletes plans past
  `retentionExpiresAt`) is not implemented yet — see "What's stubbed out."
- **User-initiated deletion.** `DELETE /api/plans/[id]` lets a user delete a
  single plan (and everything under it — products, steps, hazards, SOPs,
  recall data — via cascading deletes) immediately.
  `User.dataDeletionRequestedAt` is reserved on the schema for a
  full-account deletion flow (also not yet wired up).
- **Download anytime.** Once a plan is unlocked, `/api/plans/[id]/export`
  lets the user pull a full copy at any time — export isn't gated by
  storage-subscription status, only by the one-time unlock.
- **Transport/at-rest encryption.** Not this app's job directly — deploy
  behind HTTPS (Vercel/any modern host does this by default) and use a
  managed Postgres provider with encryption at rest (RDS, Supabase, Neon,
  etc.) in production.

## Billing model

- **One-time fee per plan** (`Plan.isPaid`) unlocks `.docx` export for that
  plan. Editing is free and unlimited before and after unlock.
- **Optional recurring storage subscription** (`User.storageSubscriptionEnd`)
  removes the default retention window across all of a user's plans and
  keeps them available indefinitely while active.
- Stripe Checkout is used for both (`/api/billing/checkout`), fulfilled via
  webhook (`/api/billing/webhook`). Until `STRIPE_SECRET_KEY` is set, both
  routes no-op safely and the UI falls back to a dev-mode unlock button.

To go live: create the two Stripe Prices (one-time and recurring), set
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ID_ONE_TIME`, and `STRIPE_PRICE_ID_STORAGE_SUBSCRIPTION` in
your environment, and register the webhook endpoint
(`/api/billing/webhook`) in the Stripe dashboard.

## What's stubbed out / next steps

This scaffold covers the core wizard, decision logic, GMP/recall/SOP
generation, multi-product hazard analysis, export, auth, and billing
plumbing end-to-end. Before treating it as a real product, you'd still want
to:

1. **Retention purge job.** A scheduled job (cron / queue) that finds plans
   past `retentionExpiresAt` (for users without an active subscription) and
   deletes or archives them, plus an email warning before it happens.
2. **Account deletion flow.** A user-facing "delete my account and all data"
   action that cascades through Prisma relations (the schema already has
   `onDelete: Cascade` set up for this).
3. **Email verification / password reset.** Currently registration is
   immediate with no email step.
4. **PDF export**, in addition to docx, if desired.
5. **A real review/sign-off step** — e.g. a lightweight e-signature or
   "reviewed by [name] on [date]" attestation captured before export, since
   this tool assists with drafting but a qualified individual should review
   the final plan.
6. **Legal/regulatory review of the templates and CCP tree language** — the
   language here follows the standard Codex structure and CFIA/SFCR
   terminology as understood at the time of writing, but has not been
   reviewed by a food-safety consultant, lawyer, or CFIA; treat it as a
   strong starting draft, not a compliance guarantee.
7. **Per-product allergen control**, if desired — allergen control and
   supplier verification are currently facility-wide documents that
   reference the product list; splitting allergen control per product would
   follow the same pattern used for process flow/hazard analysis.
8. **Production database** — swap SQLite for Postgres before deploying
   beyond a single instance (also lets you convert `facilityProfile` back to
   a native `Json` column and the string-typed enum fields back to real
   Prisma `enum`s).
