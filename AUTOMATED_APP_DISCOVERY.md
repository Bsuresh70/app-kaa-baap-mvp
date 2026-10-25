# App Kaa Baap — Automated App Discovery and Developer Platform

## Product goal
Make App Kaa Baap a trusted discovery platform where people can find useful apps and developers can introduce new apps to relevant users. The catalogue should grow continuously, not only through manual edits.

## Non-negotiable trust rules
- Recommendations are ranked for user benefit and fit, not commission, payment, or developer influence.
- Paid placements, if ever introduced, must be visibly labelled and kept separate from organic recommendations.
- Never invent app names, prices, platform support, availability, security claims, ratings, or launch dates.
- Keep source URLs and a last-checked timestamp for important claims.
- Mark submissions as pending until validation is complete. Developer submission must not automatically mean approval or recommendation.
- Respect user constraints such as country, platform, language, price, accessibility, privacy, and age suitability.
- If no suitable verified app is known, say so instead of filling the list with irrelevant matches.

## Discovery pipeline

### 1. Collect candidates continuously
Use several independent routes rather than relying on a single source:
- Developer-submitted app listings.
- Official app-store and developer APIs where available and permitted.
- Public launch feeds, startup directories, product-launch communities, open-source project directories, and official developer announcements where their terms permit automated access.
- Curated editorial submissions and user suggestions.

Record source, first-seen date, canonical app URL, and discovery method. Respect robots.txt, API terms, rate limits, and licensing. Do not scrape sources that prohibit it.

### 2. Normalize and deduplicate
Normalize names, publisher/developer identity, official URLs, package/bundle IDs, and platform-specific listing URLs. Detect likely duplicates and versions of the same product. Keep separate listings only where platforms or products are genuinely distinct.

### 3. Validate candidate details
Check that:
- The official website or store listing resolves.
- The app appears to be available or is clearly marked as pre-launch.
- Developer/publisher identity and platform are recorded where verifiable.
- Pricing is represented as Free, Freemium, Paid, or Unknown, with a source and checked date.
- Countries, languages, category, accessibility, privacy, and other claims are supported by sources or labelled unverified.
- Suspicious, deceptive, malicious, spam, copied, or low-quality submissions are flagged for review.

### 4. Review and publish safely
Use statuses: discovered, needs_review, verified, published, rejected, stale, and removed.
New entries should enter a review queue. High-confidence candidates may be automatically enriched, but should not be published as verified until required checks pass. Keep an audit trail of edits and source evidence.

### 5. Weekly refresh
A scheduled job should:
- Run once a week and also allow a manual run.
- Collect candidates from configured sources.
- Deduplicate against the catalogue and pending queue.
- Recheck published app URLs and time-sensitive fields.
- Flag broken links, changed pricing, discontinued apps, and stale records.
- Save a report of new candidates, updates, failures, and items requiring human review.
- Avoid overwriting good catalogue data when a source is unavailable or a run fails.

A weekly job is a baseline, not a guarantee that every launch worldwide will be captured. Additional daily feeds and developer submissions reduce the gap.

## Developer introduction platform
Provide a public Submit your app page with:
- App name, official website/store listing, developer/publisher name, contact email, supported countries/platforms/languages, category, pricing model, short description, launch status/date, accessibility/privacy information, and optional demo/API/deep-link details.
- Clear consent to publish submitted information and a privacy notice.
- Verification email or other ownership check before the listing is marked developer-verified.
- Duplicate detection, anti-spam/rate limits, abuse reporting, and moderation.
- A developer dashboard later for editing listings, viewing status, correcting information, and seeing aggregate discovery analytics.
- No promise of ranking, endorsement, or publication simply because a developer submits or pays.

## Recommended MVP implementation sequence
1. Add the developer submission form and a safe pending-review queue.
2. Store catalogue records in a database rather than relying indefinitely on a hand-edited JavaScript array.
3. Add scheduled discovery jobs with a small set of permitted, reliable sources and a manual Run discovery option.
4. Add URL checks, deduplication, provenance, timestamps, and a review dashboard.
5. Add developer ownership verification and listing management.
6. Expand sources by region and category, measuring coverage and false positives.

## Important current limitation
The existing MVP uses a small, illustrative static catalogue in apps.js. The weekly discovery pipeline, developer submission portal, review queue, database, and verification workflow are planned capabilities, not implemented features yet. Do not market them as live until built and tested.
