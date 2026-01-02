-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT,
    "filters" JSONB,
    "resultsCount" INTEGER,
    "page" INTEGER,
    "path" TEXT,
    "source" TEXT,
    "userAgent" TEXT,
    "clientIpHash" TEXT,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_query_idx" ON "SearchLog"("query");
