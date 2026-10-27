# App Kaa Baap — Platform Architecture

Status: architecture baseline for incremental implementation. This document does not replace the working MVP or publish changes to production.

## Product decisions

- Audience at launch: India and the United States.
- Client: responsive mobile-first website/PWA; keep the frontend framework-agnostic until the current static MVP has been audited.
- Discovery: combine local indexed records with live web discovery and permitted catalogue/data sources. Never claim exhaustive coverage of the internet or Google Play.
- Trust labels: `Official source checked`, `Developer submitted — pending review`, `Developer verified`, `Community recommended`, `Web-discovered — not verified`, and `Sponsored` (always disclosed).
- Recommendations: users and developers may recommend listings, with the source labelled. Ranking must not silently favour payment or sponsorship.
- Developer submissions: manual approval before public listing.
- Identity: Google sign-in to App Kaa Baap; external apps remain separate unless they explicitly support an approved OAuth/OIDC or API integration.
- Security: never collect external-app passwords; request minimum OAuth scopes; validate identity tokens server-side; keep API keys and refresh tokens server-side; support revocation and account deletion.
- Continuity: preserve the existing GitHub repository and Netlify production deployment. Use feature branches and preview deployments before merging to `main`.

## Target architecture

1. **Web/PWA client** — discovery, filters, listing detail, saved apps, recommendations, developer submission and moderation UI.
2. **Discovery service** — Netlify Functions for server-side AI/web search, validation, rate limits, response normalization and caching.
3. **Supabase Auth** — Google OAuth for App Kaa Baap identity, with secure session handling.
4. **Supabase PostgreSQL** — canonical app records, source evidence, developer submissions, moderation status, recommendations, saved items, connected-provider metadata and audit events. Row Level Security (RLS) must be enabled for user-owned records.
5. **Integration adapters** — one adapter per supported provider; store only the minimum required tokens in a server-controlled secret store. Do not expose provider tokens to browser code.
6. **Discovery sources** — local catalogue, official app-store/provider pages, developer submissions, approved public APIs and live web search. Respect provider terms, robots/access rules, rate limits and licensing.
7. **Operations** — Netlify deploy previews, error logging without secrets, abuse/rate controls, privacy policy, deletion/export flows and backups.

## Trust and data model (initial proposal)

- `profiles`: user ID, display name, avatar URL, created/updated timestamps.
- `apps`: stable ID, name, description, category, official URL, platform list, country availability, pricing label, listing status, created/updated timestamps.
- `app_sources`: app ID, source URL, source type, checked timestamp, evidence note, checker/status.
- `developer_profiles`: owner user ID, organisation/name, verification status, contact channel.
- `app_submissions`: developer ID, proposed app fields, review status (`pending`, `approved`, `rejected`), reviewer, decision note and timestamps.
- `recommendations`: app ID, author user ID, author type (`user` or `developer`), rating, review text, disclosure fields, moderation status and timestamps.
- `saved_apps`: user ID, app ID, created timestamp.
- `connected_accounts`: user ID, provider ID, granted scopes and connection status; no provider secret/token should be readable by the client.
- `moderation_events`: actor, target, action, reason and timestamp.

Use foreign keys, uniqueness constraints, input validation, spam/rate limits and RLS policies. Public users can read approved listings and approved recommendations; only authorised moderators can approve submissions. Developers may manage only their own submissions and listings. Users may edit/delete only their own recommendations and saved items.

## Implementation phases and acceptance checks

### Phase 0 — baseline audit and safety
- Confirm the current production URL, Netlify environment variables and deploy status.
- Test the existing search function and inspect Netlify logs.
- Fix any existing runtime/configuration issues on a feature branch before adding authentication.
- Keep API keys out of browser files and repository history.
- Acceptance: current search/filter behaviours remain intact; a failed live search produces a clear error and no misleading results.

### Phase 1 — identity foundation
- Create a Supabase project and configure Google OAuth redirect URLs for the Netlify preview and production domains.
- Add only the required public Supabase URL and publishable/anon key to the client; keep service-role keys server-side only.
- Add sign-in, sign-out, session restoration and a minimal profile.
- Acceptance: Google login/logout works on preview; no service-role key is sent to the browser; RLS blocks cross-user reads/writes.

### Phase 2 — canonical catalogue and moderation
- Create database migrations and RLS policies for apps, sources, developer profiles, submissions and moderation events.
- Convert the current front-end-only developer form into a signed-in submission flow.
- Keep every new submission pending until moderator approval.
- Acceptance: public search displays approved records only; a submission stays private/pending until approved.

### Phase 3 — recommendations
- Add user/developer recommendation forms and clear source labels.
- Add reporting, basic anti-spam controls, moderation and sponsored-placement disclosures.
- Acceptance: user and developer contributions are distinguishable and cannot bypass moderation rules.

### Phase 4 — broad discovery
- Keep live web discovery independent of the local catalogue.
- Validate external result URLs, normalize results, deduplicate, label evidence status, cache safely and apply filters consistently.
- Add source-specific adapters only when their APIs/terms permit use.
- Acceptance: results identify official/source links and verification status; unknown facts stay unknown; filters do not silently contradict results.

### Phase 5 — progressive connections
- Implement provider-specific OAuth/API adapters one at a time, starting with a documented high-value integration.
- Show permissions before connection, store tokens server-side, support disconnect/revocation, and never imply all apps support SSO.
- Acceptance: a connection works end-to-end with least-privilege scopes and revocation.

### Phase 6 — PWA and production readiness
- Add installability/offline shell where useful, accessibility, analytics with privacy controls, monitoring, backups and documented incident handling.
- Test India/USA availability and mobile layouts.
- Acceptance: deployment preview passes regression tests before any production merge.

## Immediate next steps

1. Review this architecture branch and merge it only after approval.
2. Audit the current discovery function before adding new features; the current code must be checked for configuration and runtime correctness.
3. Create the Supabase project and configure Google OAuth; do not paste secret keys into chat or commit them.
4. Implement Phase 1 in a separate feature branch and test using Netlify deploy previews.
5. Proceed to database-backed developer submissions only after login and RLS tests pass.

## Environment variables

Client/public:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or current Supabase publishable key)

Server-only:
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only if a server function genuinely requires privileged access
- Provider OAuth client secrets and encryption keys, as needed

Never put server-only values in `index.html`, `app.js`, `apps.js`, public build variables or Git commits.
