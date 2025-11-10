-- ============================================
-- TecDoc → Postgres Direct Mapping
-- ============================================
-- 
-- Dva pristupa:
-- 1. Foreign Data Wrapper (FDW) - direktan link MySQL→Postgres
-- 2. Staging tabela - export iz MySQL, import u Postgres
--
-- Preporuka: Staging pristup (jednostavniji, pouzdaniji)

-- ============================================
-- OPCIJA 1: STAGING PRISTUP (PREPORUČENO)
-- ============================================

-- Korak 1: Kreiraj staging tabelu u Postgres
CREATE TABLE IF NOT EXISTS staging_tecdoc_enrichment (
    id SERIAL PRIMARY KEY,
    catalog_number VARCHAR(100),
    tecdoc_article_id BIGINT,
    oem_numbers JSONB,
    technical_specs JSONB,
    vehicle_fitments JSONB,
    cross_references JSONB,
    supplier_info JSONB,
    processed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50)
);

CREATE INDEX idx_staging_catalog ON staging_tecdoc_enrichment(catalog_number);

-- ============================================
-- Korak 2: Export iz TecDoc MySQL u CSV
-- ============================================
-- Pokreni ovaj query u MySQL TecDoc bazi:

/*
SELECT 
    a.DataSupplierArticleNumber as catalog_number,
    a.id as tecdoc_article_id,
    (
        SELECT JSON_ARRAYAGG(OENbr)
        FROM article_oe_numbers aon
        WHERE aon.article_id = a.id
    ) as oem_numbers,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'name', aa.attrName,
                'value', aa.attrValue,
                'unit', aa.attrUnit
            )
        )
        FROM article_attributes aa
        WHERE aa.article_id = a.id
    ) as technical_specs,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'brand', m.Description,
                'model', mo.Description,
                'variant', pc.Description,
                'year_from', pc.YearOfConstrFrom,
                'year_to', pc.YearOfConstrTo
            )
        )
        FROM article_linkages al
        JOIN passengercars pc ON al.item = pc.InternalID AND al.item_type = 1
        JOIN manufacturers m ON pc.Manufacturer = m.id
        JOIN models mo ON pc.Model = mo.id
        WHERE al.article_id = a.id
        LIMIT 50
    ) as vehicle_fitments,
    'pending' as status
FROM articles a
WHERE a.DataSupplierArticleNumber IN (
    -- Ovdje će ići lista tvojih 12,000 katalošk ih brojeva
    SELECT "catalogNumber" FROM your_products_table
)
INTO OUTFILE '/tmp/tecdoc_enrichment.csv'
FIELDS TERMINATED BY ';'
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
*/

-- ============================================
-- Korak 3: Import CSV u Postgres staging tabelu
-- ============================================

-- U Postgres:
COPY staging_tecdoc_enrichment(
    catalog_number,
    tecdoc_article_id,
    oem_numbers,
    technical_specs,
    vehicle_fitments,
    status
)
FROM '/tmp/tecdoc_enrichment.csv'
DELIMITER ';'
CSV HEADER;

-- ============================================
-- Korak 4: Update produkcijske Product tabele
-- ============================================

-- Update OEM brojeva
UPDATE "Product" p
SET 
    "oemNumber" = s.oem_numbers::TEXT,
    "updatedAt" = NOW()
FROM staging_tecdoc_enrichment s
WHERE p."catalogNumber" = s.catalog_number
  AND s.oem_numbers IS NOT NULL;

-- Update tehničkih specifikacija
UPDATE "Product" p
SET 
    "technicalSpecs" = s.technical_specs,
    "updatedAt" = NOW()
FROM staging_tecdoc_enrichment s
WHERE p."catalogNumber" = s.catalog_number
  AND s.technical_specs IS NOT NULL;

-- Update vozila
UPDATE "Product" p
SET 
    "vehicleFitments" = s.vehicle_fitments,
    "updatedAt" = NOW()
FROM staging_tecdoc_enrichment s
WHERE p."catalogNumber" = s.catalog_number
  AND s.vehicle_fitments IS NOT NULL;

-- ============================================
-- Korak 5: Verifikacija
-- ============================================

-- Provjeri koliko proizvoda je obogaćeno
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN "oemNumber" IS NOT NULL THEN 1 END) as with_oem,
    COUNT(CASE WHEN "technicalSpecs" IS NOT NULL THEN 1 END) as with_specs,
    COUNT(CASE WHEN "vehicleFitments" IS NOT NULL THEN 1 END) as with_vehicles
FROM "Product";

-- Provjeri primjer obogaćenih proizvoda
SELECT 
    "catalogNumber",
    "oemNumber",
    jsonb_array_length("technicalSpecs") as specs_count,
    jsonb_array_length("vehicleFitments") as vehicles_count
FROM "Product"
WHERE "technicalSpecs" IS NOT NULL
LIMIT 10;

-- ============================================
-- OPCIJA 2: FOREIGN DATA WRAPPER (napredniji)
-- ============================================

-- Instaliraj mysql_fdw extension
CREATE EXTENSION IF NOT EXISTS mysql_fdw;

-- Kreiraj foreign server (link na MySQL)
CREATE SERVER tecdoc_mysql
FOREIGN DATA WRAPPER mysql_fdw
OPTIONS (
    host 'localhost',
    port '3306'
);

-- Kreiraj user mapping
CREATE USER MAPPING FOR postgres
SERVER tecdoc_mysql
OPTIONS (
    username 'root',
    password 'your_password'
);

-- Kreiraj foreign table za TecDoc articles
CREATE FOREIGN TABLE tecdoc_articles (
    id BIGINT,
    DataSupplierArticleNumber VARCHAR(100),
    NormalizedDescription TEXT,
    Supplier INT
)
SERVER tecdoc_mysql
OPTIONS (dbname 'tecdoc1q2019', table_name 'articles');

-- Kreiraj foreign table za OEM brojeve
CREATE FOREIGN TABLE tecdoc_article_oe (
    article_id BIGINT,
    OENbr VARCHAR(100)
)
SERVER tecdoc_mysql
OPTIONS (dbname 'tecdoc1q2019', table_name 'article_oe_numbers');

-- Sada možeš direktno query-ati iz Postgres:
SELECT 
    p."catalogNumber",
    ta.id as tecdoc_id,
    array_agg(DISTINCT tao.OENbr) as oem_numbers
FROM "Product" p
LEFT JOIN tecdoc_articles ta 
    ON p."catalogNumber" = ta.DataSupplierArticleNumber
LEFT JOIN tecdoc_article_oe tao 
    ON ta.id = tao.article_id
GROUP BY p."catalogNumber", ta.id
LIMIT 10;

-- ============================================
-- HELPER QUERIES
-- ============================================

-- Query 1: Pronađi proizvode bez OEM brojeva
SELECT 
    id,
    "catalogNumber",
    name
FROM "Product"
WHERE "oemNumber" IS NULL
  OR "oemNumber" = ''
LIMIT 100;

-- Query 2: Pronađi proizvode bez vozila
SELECT 
    id,
    "catalogNumber",
    name
FROM "Product"
WHERE "vehicleFitments" IS NULL
  OR "vehicleFitments"::TEXT = '[]'
LIMIT 100;

-- Query 3: Statistika obogaćivanja
WITH enrichment_stats AS (
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "oemNumber" IS NOT NULL THEN 1 END) as has_oem,
        COUNT(CASE WHEN "technicalSpecs" IS NOT NULL THEN 1 END) as has_specs,
        COUNT(CASE WHEN "vehicleFitments" IS NOT NULL THEN 1 END) as has_vehicles,
        COUNT(CASE WHEN "crossReferences" IS NOT NULL THEN 1 END) as has_cross_refs
    FROM "Product"
)
SELECT 
    total,
    has_oem,
    ROUND(100.0 * has_oem / total, 2) as oem_pct,
    has_specs,
    ROUND(100.0 * has_specs / total, 2) as specs_pct,
    has_vehicles,
    ROUND(100.0 * has_vehicles / total, 2) as vehicles_pct,
    has_cross_refs,
    ROUND(100.0 * has_cross_refs / total, 2) as cross_refs_pct
FROM enrichment_stats;

-- ============================================
-- BATCH PROCESSING FUNKCIJA
-- ============================================

CREATE OR REPLACE FUNCTION enrich_products_batch(
    batch_size INT DEFAULT 100
)
RETURNS TABLE(
    processed INT,
    succeeded INT,
    failed INT
) AS $$
DECLARE
    v_processed INT := 0;
    v_succeeded INT := 0;
    v_failed INT := 0;
    v_product RECORD;
BEGIN
    FOR v_product IN 
        SELECT id, "catalogNumber"
        FROM "Product"
        WHERE "oemNumber" IS NULL
        LIMIT batch_size
    LOOP
        BEGIN
            -- Update sa podacima iz staging tabele
            UPDATE "Product" p
            SET 
                "oemNumber" = s.oem_numbers::TEXT,
                "technicalSpecs" = s.technical_specs,
                "vehicleFitments" = s.vehicle_fitments,
                "updatedAt" = NOW()
            FROM staging_tecdoc_enrichment s
            WHERE p.id = v_product.id
              AND p."catalogNumber" = s.catalog_number;
            
            v_processed := v_processed + 1;
            v_succeeded := v_succeeded + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            RAISE NOTICE 'Failed to enrich product %: %', v_product.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_succeeded, v_failed;
END;
$$ LANGUAGE plpgsql;

-- Pozovi funkciju:
SELECT * FROM enrich_products_batch(100);

-- ============================================
-- MONITORING
-- ============================================

-- Real-time progress tracking
CREATE TABLE IF NOT EXISTS enrichment_log (
    id SERIAL PRIMARY KEY,
    product_id TEXT,
    catalog_number VARCHAR(100),
    action VARCHAR(50),
    status VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Funkcija za logovanje
CREATE OR REPLACE FUNCTION log_enrichment(
    p_product_id TEXT,
    p_catalog TEXT,
    p_action VARCHAR(50),
    p_status VARCHAR(20),
    p_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO enrichment_log (product_id, catalog_number, action, status, message)
    VALUES (p_product_id, p_catalog, p_action, p_status, p_message);
END;
$$ LANGUAGE plpgsql;

-- Provjeri log
SELECT 
    action,
    status,
    COUNT(*) as count,
    MAX(created_at) as last_run
FROM enrichment_log
GROUP BY action, status
ORDER BY last_run DESC;
