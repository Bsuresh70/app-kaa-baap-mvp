# App Kaa Baap — Phase 0 Technical Audit

Audit date: 2026-10-30
Repository: Bsuresh70/app-kaa-baap-mvp
Audit branch: audit/phase-0-baseline (created from main)
Production safety: main and production were not modified.

## Executive summary

The repository is accessible and the existing feature branch and draft pull request are intact. Pull request #1 has a successful Netlify deploy-preview status check, but a successful deployment status is not the same as an end-to-end runtime test. No GitHub Actions workflow runs or CI status checks were reported for the inspected main commit. The production site and preview pages could not be fetched using the available inspection tools in this session, and no Netlify account-management connector is connected.

## Repository baseline

- Default branch: main
- Existing feature branch: feature/platform-foundation
- Open draft PR: #1, "Platform foundation: architecture and discovery runtime fix"
- PR base SHA: e3bb90b684be579afdccfc26b35eae220f63c932
- PR head SHA: d1f77ff845766b4837e3e20258850e8c7d92d114
- PR has no submitted reviews or inline review threads.
- PR head has a successful Netlify status: https://deploy-preview-1--motherofallapps.netlify.app
- Main commit had no reported commit statuses or workflow runs.

## Findings

### P0 — Discovery function implementation ambiguity

The functions directory contains both:
- netlify/functions/discover.js
- netlify/functions/discover.mjs

Both filenames map to the same Netlify function slug, discover. They use different module formats and different handler styles. The Netlify documentation describes function naming by filename and warns about same-name function source files being ignored/selected based on extension/module format. Confirm the actual build resolution and retain exactly one canonical implementation before relying on deploy-preview tests.

The frontend calls /.netlify/functions/discover, so it is important to know which file is actually packaged.

### P0 — Main-branch ES module has a runtime ReferenceError

In main, netlify/functions/discover.mjs parses the request into input, but later constructs the prompt using body.country, body.price and body.platform. The variable body is not declared in that file. A valid search request that reaches prompt construction can therefore fail before the OpenAI request. PR #1 adds const body = input, which addresses this specific defect in the .mjs implementation.

### P1 — Existing discovery safeguards and limitations

- The discovery function uses server-side OPENAI_API_KEY; the key is not embedded in the inspected browser files.
- Query length and catalogue size are capped.
- The function uses web search and asks the model to provide official product URLs and source URLs.
- Returned URLs are checked for HTTPS, but there is no strict host allowlist or server-side reachability check. HTTPS alone does not prove a URL is the official app URL.
- No rate limiting, abuse control or caching was evident in the inspected function.
- The legacy .js handler returns Access-Control-Allow-Origin: *; review whether cross-origin access is needed and tighten it if not.
- The frontend correctly avoids presenting keyword-only fallback matches as reliable recommendations when live search fails.
- Trust and verification labels are present, but catalogue entries are mostly marked not_verified. Do not describe the catalogue as comprehensively verified.

### P1 — Developer submission is demo-only

The developer form in app.js only displays a message that the form does not submit or store data. It is not yet a real developer-submission workflow. The architecture document correctly proposes database-backed submissions with manual moderation.

### P2 — Product and visual identity

The current header uses a simple letter A and the earlier tagline "Every App. One Intelligent Gateway." It does not yet implement the newly approved full brand identity. Logo assets and a scalable SVG/app-icon set should be prepared as a separate, low-risk brand task.

## Netlify inspection status

- PR #1 Netlify deploy-preview status check: success.
- Preview URL reported by GitHub: https://deploy-preview-1--motherofallapps.netlify.app
- Production URL known from project context: https://motherofallapps.netlify.app
- Direct page retrieval and function invocation were not completed in this session.
- No Netlify connector was available to inspect site settings, deploy logs, environment-variable scopes or deploy history. The presence/value of OPENAI_API_KEY was not verified; never expose or paste the secret into chat.

## Recommended next actions

1. In a new remediation branch, consolidate the discovery function into one canonical file and remove the stale duplicate only after confirming Netlify's supported resolution.
2. Keep the PR #1 change that fixes body = input, then test a valid search request, malformed JSON, empty query, missing API key and non-POST method on a deploy preview.
3. Verify that the preview search returns results with source links and that country, price and platform filters remain consistent.
4. Inspect production deploy metadata and Netlify function logs without changing production.
5. Add rate limiting/abuse controls, stricter URL validation and caching before public scale.
6. Implement the developer submission workflow only after authentication, database and row-level security are ready.
7. Keep main and production unchanged until review and explicit approval.

## Approval boundary

No merge, production deployment, paid service, environment-variable mutation or external account permission change was performed during this audit.
