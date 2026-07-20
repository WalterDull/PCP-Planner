# Deploying PCP Planner: GitHub → Render

This walks through pushing the project to GitHub and running it on Render,
using Render's own managed Postgres for the database (Render's app
filesystem is ephemeral, so the SQLite file used for early local testing
won't survive a deploy — this project's `prisma/schema.prisma` is now
already set to `postgresql`, so no schema change is needed before you
start).

Total time: 30–45 minutes for a first deploy.

## 0. What you'll need

- A free [GitHub](https://github.com) account
- A free [Render](https://render.com) account (can sign up with GitHub)
- Node 18+ installed locally (to generate a `NEXTAUTH_SECRET` and, if you
  want, to test the Postgres connection before deploying)

## 1. Put the project on GitHub

1. Unzip this project locally if you haven't already (`pcp-planner/`).
2. In that folder, initialize git and make the first commit:

   ```bash
   cd pcp-planner
   git init
   git add .
   git commit -m "Initial commit"
   ```

   The included `.gitignore` already excludes `node_modules`, `.next`,
   `.env`, and any local `dev.db` — double check `git status` doesn't show
   any of those before committing (if it does, add them to `.gitignore`
   before you `git add`).
3. Create a new **empty** repository on GitHub (no README/license — you
   already have files): go to github.com → **New repository** → name it
   e.g. `pcp-planner` → **Create repository**.
4. Push:

   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/pcp-planner.git
   git push -u origin main
   ```

   If prompted for a password, GitHub requires a [personal access
   token](https://github.com/settings/tokens) instead of your account
   password — or use `gh auth login` if you have the GitHub CLI installed.

Your code is now on GitHub. Since the repo holds sensitive business-logic
(and eventually customer data flows through it, even though no customer
data itself lives in the repo), keep it **private** unless you have a
specific reason to make it public.

## 2. Create the Postgres database on Render

1. Log into [Render](https://dashboard.render.com).
2. **New** → **PostgreSQL**.
3. Name it e.g. `pcp-planner-db`, pick a region close to your users
   (e.g. `Oregon` or `Ohio` for Canada-adjacent latency), leave the free
   plan selected for testing (upgrade later for production — the free
   Postgres tier is deleted after 30 days of inactivity/expiry, so plan to
   upgrade before going live with real customers).
4. Click **Create Database**. Wait for it to become "Available."
5. On the database's page, copy the **Internal Database URL** (you'll use
   this one if your web service is in the same Render region — it's
   faster and doesn't count against external bandwidth) — or the
   **External Database URL** if you want to connect from your own laptop
   too (e.g. to run migrations from your machine, or open Prisma Studio).
   Keep this tab open; you'll need the value in step 4.

## 3. Create the web service on Render

1. **New** → **Web Service**.
2. Connect your GitHub account if you haven't, then select the
   `pcp-planner` repo.
3. Fill in:
   - **Name:** `pcp-planner` (this becomes part of your default URL:
     `pcp-planner.onrender.com`)
   - **Region:** same region you picked for the database
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:**
     ```
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
     (`migrate deploy` applies your Prisma migrations to the production
     database non-interactively — safe to run on every deploy, it's a
     no-op if there's nothing new to apply. The very first deploy will
     have no migration files yet — see step 5 below.)
   - **Start Command:** `npm run start`
   - **Instance Type:** Free is fine to confirm everything works; move to
     a paid instance before relying on this for real customers (the free
     tier spins down after 15 minutes of inactivity, so the first request
     after idling takes ~30–60 seconds).
4. Don't click Create yet — add environment variables first (next step).

## 4. Set environment variables

Still on the web service creation screen, scroll to **Environment
Variables** and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | The Internal Database URL you copied in step 2 |
| `NEXTAUTH_URL` | `https://pcp-planner.onrender.com` initially; switch to `https://pcp.ftcinternational.com` once the custom subdomain in step 8 is live |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXTAUTH_URL` — drives SEO metadata, the sitemap, and robots.txt (see "SEO" section below) |
| `NEXTAUTH_SECRET` | A long random string — generate one locally with `openssl rand -base64 32` |
| `DEFAULT_RETENTION_DAYS` | `90` |
| `STRIPE_SECRET_KEY` | Leave blank for now to launch in dev-mode-unlock (see below), or your real Stripe secret key once you're ready to take payments |
| `STRIPE_WEBHOOK_SECRET` | Same — blank until you wire up real billing |
| `STRIPE_PRICE_ID_ONE_TIME` | Same |
| `STRIPE_PRICE_ID_STORAGE_SUBSCRIPTION` | Same |

Click **Create Web Service**. Render will pull the repo, run the build
command, and start it — watch the **Logs** tab for progress.

## 5. First deploy: create the initial migration

This project doesn't ship with a `prisma/migrations` folder yet (migrations
were never generated in the sandboxed environment it was built in). You
need to generate that folder once, against your real Postgres database,
and commit it — after that, every future deploy's `migrate deploy` step
will pick up new migrations automatically.

The simplest way: run it from your own machine, pointed at the Render
database, then push the generated files.

1. In your local `pcp-planner` folder, create a `.env` (copy
   `.env.example`) and set `DATABASE_URL` to the **External Database URL**
   from step 2.
2. Run:

   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

   This creates `prisma/migrations/<timestamp>_init/` with the SQL to
   build every table, and applies it directly to your Render Postgres
   database.
3. Commit and push the migration folder:

   ```bash
   git add prisma/migrations
   git commit -m "Add initial Postgres migration"
   git push
   ```
4. Render will auto-redeploy on the push. From now on, whenever you change
   `prisma/schema.prisma`, run `npx prisma migrate dev --name <description>`
   locally (against a dev database — see the note below), commit the new
   migration folder, and push; Render's build command applies it
   automatically via `migrate deploy`.

**Note on local development going forward:** now that the schema targets
Postgres, local dev needs a Postgres database too (SQLite no longer
matches the schema). Easiest options: point your local `.env` at the same
Render database temporarily (fine while you're the only user), spin up a
free database on [Neon](https://neon.tech) or
[Supabase](https://supabase.com) for local dev, or run Postgres in Docker
(`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres`).

## 6. Verify

1. Once the deploy finishes (Logs tab shows the app listening), visit your
   Render URL.
2. Register an account, create a plan, walk through the wizard.
3. On Review & Export, since `STRIPE_SECRET_KEY` is blank, you'll see a
   "(Dev mode) Simulate unlock" button — use it to confirm the `.docx`
   export works end-to-end in production.

## 7. Going live with billing (when ready)

1. Create a [Stripe](https://stripe.com) account, create two Prices: one
   one-time (the plan unlock fee) and one recurring (the storage
   subscription).
2. In Render's environment variables, set `STRIPE_SECRET_KEY`,
   `STRIPE_PRICE_ID_ONE_TIME`, and `STRIPE_PRICE_ID_STORAGE_SUBSCRIPTION`.
3. In the Stripe dashboard, add a webhook endpoint pointing at
   `https://<your-render-url>/api/billing/webhook`, subscribed to the
   checkout/payment events the app listens for; copy the resulting signing
   secret into `STRIPE_WEBHOOK_SECRET` on Render.
4. Render redeploys automatically when you save environment variable
   changes. The dev-mode "Simulate unlock" button disappears automatically
   once `STRIPE_SECRET_KEY` is set, and real Stripe Checkout takes over.

## 8. Custom domain — pcp.ftcinternational.com

This app is set up to run as its own subdomain of the main FTC
International site rather than a subpath, which keeps things simple:
Render serves the whole app, and FTC International's existing site is
untouched.

1. Render → your web service → **Settings** → **Custom Domains** → **Add
   Custom Domain** → enter `pcp.ftcinternational.com`.
2. Render shows you a CNAME target (something like
   `pcp-planner.onrender.com`). In whoever manages DNS for
   `ftcinternational.com` (their registrar or DNS provider), add:
   ```
   Type:  CNAME
   Name:  pcp
   Value: <the target Render gave you>
   ```
3. DNS propagation is usually minutes, sometimes up to a few hours. Render
   auto-issues an SSL certificate for the domain once it verifies.
4. Update both `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` in Render's
   environment variables to `https://pcp.ftcinternational.com` and
   redeploy (env var changes trigger a redeploy automatically).

## SEO

Since this runs at its own subdomain, it's a normal, independently
indexable site as far as Google is concerned — no special subpath/
basePath configuration was needed. What's already wired up in the code:

- **Metadata** (`src/lib/seo.ts`, used from `src/app/layout.tsx`): page
  titles (`"PCP Planner by FTC International"` everywhere, per-page
  titles for Pricing etc.), meta description, keywords, canonical URLs,
  and Open Graph/Twitter card tags — all driven off `NEXT_PUBLIC_SITE_URL`.
- **`/robots.txt`** (`src/app/robots.ts`) — allows crawling of the public
  marketing pages, explicitly blocks `/dashboard`, `/plans`, and `/api`
  (private, authenticated, per-user data has no business being indexed).
- **`/sitemap.xml`** (`src/app/sitemap.ts`) — lists the public pages only.
- **JSON-LD structured data** (in `layout.tsx`) — a `SoftwareApplication`
  schema block naming FTC International as the brand, which is what
  drives things like rich snippets in search results.
- **Auto-generated OG image and favicon** (`src/app/opengraph-image.tsx`,
  `src/app/icon.tsx`) — placeholder branded graphics so social shares and
  browser tabs don't look broken; swap in real FTC International logo
  assets (`public/favicon.ico`, or a static `public/og-image.png` +
  matching Metadata) whenever you have them — Next.js's file convention
  picks up static files automatically with no code change.

**On "ensuring high search rankings":** the above covers everything
technically within the app's control — correct metadata, a crawlable
sitemap, no accidental blocking of public pages, fast server-rendered
pages (no heavy client-side-only rendering on the marketing pages), and
mobile-responsive layout (Tailwind, already responsive). Nobody — including
Google — can guarantee a specific ranking; that also depends on things
outside the code: how many other sites link to it, how established
ftcinternational.com's domain authority already is, the competitiveness of
"preventive control plan" as a search term, and ongoing content (a blog,
FAQ, or resource pages tend to help far more than any meta tag). Once it's
live, submitting the sitemap in [Google Search
Console](https://search.google.com/search-console) and [Bing Webmaster
Tools](https://www.bing.com/webmasters) is the highest-leverage next step
for getting indexed quickly.

## Ongoing workflow

From here on, deploying is just: commit, push to `main`, Render
auto-builds and redeploys. Any schema change needs a migration generated
locally (`npx prisma migrate dev --name ...`) and committed alongside the
code change, same as step 5.
