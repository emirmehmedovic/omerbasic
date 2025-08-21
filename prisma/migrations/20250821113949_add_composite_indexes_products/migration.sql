-- Composite indexes to speed up keyset pagination and category-filtered listings
-- Idempotent: safe to run multiple times

-- Global latest products pagination (createdAt DESC, id)
CREATE INDEX IF NOT EXISTS product_created_id_idx
  ON "Product" ("createdAt" DESC, "id");

-- Category + latest products pagination within category
CREATE INDEX IF NOT EXISTS product_category_created_id_idx
  ON "Product" ("categoryId", "createdAt" DESC, "id");
