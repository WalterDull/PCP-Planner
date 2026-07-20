# Security review

This was a manual code-level review (not an automated `/security-review`
diff pass — that tool needs a real git repository on the machine running
it, and this project hasn't been pushed anywhere yet; run it again once
the repo is on GitHub if you want a second, tool-based pass). Scope:
authentication, authorization/data isolation, billing, input handling,
and dependency vulnerabilities.

## What was already solid

- **Authorization is consistent.** Every data-bearing API route resolves
  the user from the session and scopes the query through `getOwnedPlan` /
  `getOwnedProduct` (`src/lib/session.ts`) — there's no route that trusts a
  bare plan/product/step/hazard id from the client. Spot-checked all 25
  route files; the only ones skipping this are the deprecated pre-multi-
  product stubs (they take no input and just return `410`) and the
  necessarily-public `register`/NextAuth/Stripe-webhook routes.
- **Passwords:** bcrypt, 12 rounds, never logged or returned in any
  response.
- **Stripe webhook:** verifies the signature (`stripe.webhooks.constructEvent`)
  against the raw body before trusting any event data — a forged webhook
  POST without a valid signature is rejected.
- **Dev-mode billing bypass** (`checkout-dev-unlock`) checks plan
  ownership and hard-refuses to run once `STRIPE_SECRET_KEY` or
  `NODE_ENV=production` is set, so it can't accidentally ship live.
- **No raw SQL, no `dangerouslySetInnerHTML`.** All database access goes
  through Prisma's parameterized query builder; no template rendering
  reflects unescaped user input into HTML.
- **Registration** input is validated with zod (email format, 8-char
  minimum password) before touching the database.

## Gaps found and fixed in this pass

1. **No rate limiting on login/registration.** The credentials
   sign-in endpoint and `/api/register` had no throttling, so both were
   open to brute-force/credential-stuffing and to mass fake-account
   creation. **Fixed:** added `src/middleware.ts` rate limiting (10
   requests / 5 minutes per IP per endpoint) on `/api/register` and
   `/api/auth/callback/credentials`, alongside the existing session-gating
   for `/dashboard` and `/plans`. This uses an in-memory counter, which is
   fine for the single-instance Render setup in DEPLOYMENT.md — if you
   ever scale to multiple instances, swap it for a shared store (e.g.
   Upstash Redis) since in-memory limits don't share state across
   instances.
2. **Missing security response headers.** Nothing set
   `X-Frame-Options`, `X-Content-Type-Options`, a `Referrer-Policy`, or
   HSTS. **Fixed:** added a `headers()` block in `next.config.js` applying
   those to every route (clickjacking protection, MIME-sniffing
   protection, HSTS for the HTTPS Render already terminates).
3. **Outdated Next.js pin with known advisories.** The project pinned an
   exact `next@14.2.15`. `npm audit` flagged that version range (shared by
   nearly every Next.js release prior to a 16.x fix) against a number of
   advisories, mostly Server-Components/middleware DoS and cache-poisoning
   issues — none of which are high-risk for this app's actual usage
   (no middleware-based auth bypass surface beyond what's reviewed above,
   no image-optimization proxy in use), but there's no reason not to be on
   the latest patch. **Fixed:** bumped to `^14.2.35` (latest 14.x patch as
   of this review) so `npm install` picks up every 14.x security fix
   without the breaking Next 16 upgrade. Re-run `npm audit` after
   installing to confirm a clean report on your machine.

## Known residual items (not fixed here — judgment calls, not bugs)

- **`uuid` transitive advisory via `next-auth@4.24.14`.** Moderate
  severity, and the vulnerable code path (a buffer-bounds check that only
  matters when a caller passes its own buffer into `uuid.v3/v5/v6`) isn't
  reachable through anything this app does with next-auth. No fix is
  available in the 4.x line yet (the maintained fix requires the not-yet-stable
  Auth.js v5). Worth revisiting next time you touch auth deps.
- **No account lockout / CAPTCHA beyond the new IP rate limit.** The rate
  limit slows down automated attacks; it doesn't stop a slow, distributed
  one. Consider adding a CAPTCHA (e.g. Cloudflare Turnstile, since it's
  free) on registration and after a few failed logins if abuse becomes a
  real problem.
- **No password reset flow yet** (already flagged in README's "What's
  stubbed out") — until that exists, an account with a forgotten password
  is unrecoverable, which is a support problem more than a security one,
  but worth prioritizing before real users sign up.
- **No structured audit logging.** `SessionToken` records logins, but
  there's no log of who viewed/edited/exported which plan — worth adding
  before this holds real customer facility data at scale, both for your
  own incident response and because CFIA-facing food safety records
  generally expect a change history.
- **CSP not set.** The headers added above cover the easy, low-risk wins;
  a real Content-Security-Policy is more involved to get right (needs to
  account for every inline script/style Next.js and Tailwind's dev tooling
  use) and was left out to avoid breaking the app with an untested policy.
  Worth adding deliberately, with testing, before a public launch.

## Suggested next step

Once this is pushed to GitHub (see DEPLOYMENT.md), running the automated
`/security-review` against an actual pull request/diff there will catch
anything pattern-based that a manual pass like this one can miss, and is
worth doing as a standing habit on every future change.
