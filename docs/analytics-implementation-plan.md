## Analytics + Search Logging Implementation Plan

Goal: add lightweight, SEO-safe analytics and first-party search logging with minimal performance impact.

### Scope
- Cloudflare Web Analytics (free, no cookies).
- Microsoft Clarity (optional but requested).
- Prisma search logging for on-site search and filters.

### Inputs Needed
- Cloudflare Web Analytics site token.
- Microsoft Clarity Project ID.

### Bitesize Tasks

1) Define tracking events
- Search submit (query, page, filters).
- Filter changes (category/brand/generation/engine, price range).
- No-results view (query + filters).
- Optional: click on a product from results.

2) Prisma schema & migration
- Add `SearchLog` model with fields:
  - `id`, `createdAt`, `query`, `filters` (JSON), `resultsCount`, `page`,
    `path`, `clientIpHash`, `userAgent`, `sessionId` (optional), `source` (page).
- Add indexes on `createdAt`, `query`.
- Run migration + generate client.

3) Backend logging API
- Create POST endpoint: `/api/analytics/search`.
- Validate input (zod).
- Normalize query string and filters.
- Hash IP (e.g., SHA-256 with salt from env).
- Store row in DB asynchronously (non-blocking).

4) Frontend event hooks
- Search page: log on query submit + on no-results.
- Products listing: log when filters change (debounced).
- Advanced search: log on search request success.
- VIN/vehicle search (optional) for intent tracking.

5) Cloudflare Analytics
- Inject script in `src/app/layout.tsx`.
- Ensure it loads after main content (lazy or defer).

6) Microsoft Clarity
- Inject script in `src/app/layout.tsx` (defer).
- Disable in development.

7) Admin visibility (optional)
- Add simple admin page to list top queries and no-results.
- Export CSV button.

8) QA + rollout
- Verify no errors in console.
- Confirm logs inserted in DB.
- Confirm scripts loaded once per page.

### Acceptance Criteria
- Build passes locally and on production.
- Search logs appear in DB with correct filters and result counts.
- No measurable slowdown in search UI.
- Analytics scripts load without blocking rendering.

### Recommended Order
1) Prisma schema + migration.
2) Logging API.
3) Frontend event hooks.
4) Analytics scripts in layout.
5) Optional admin view.

### Rollback
- Remove scripts from layout.
- Keep `SearchLog` table (safe to leave).
