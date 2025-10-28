## Performance Optimization Checklist

- [x] **Cache category hierarchies** *(2025-10-21)*
  - Implemented cached `getCategoryAndChildrenIds()` in `src/app/api/products/route.ts` with 60s TTL and in-memory traversal to eliminate repetitive DB queries.
- [x] **Add Prisma query logging toggle**
  - Added `PRISMA_LOG_QUERIES` env flag and `logQuery()` helper to optionally log query payloads.
- [x] **Verify indexes for vehicle fitments**
  - Confirmed `ProductVehicleFitment` already has `@@index([generationId, engineId])` and `@@index([productId])`; no changes required.
- [x] **Load-test `/api/products`** *(2025-10-21)*
  - DevTools timing: total response ≈ 379 ms (waiting 76 ms, download 301 ms) for `categoryId=cmer01kc300017qbwul5hej6j`.
- [x] **Document deployment notes**
  - Enable `PRISMA_LOG_QUERIES=true` when deeper profiling is needed, otherwise keep unset for cleaner logs.
