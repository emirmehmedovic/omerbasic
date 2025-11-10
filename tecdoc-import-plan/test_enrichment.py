"""
Test Script - TecDoc Enrichment
================================
Testira obogaćivanje sa 10 proizvoda prije full run-a
"""

import psycopg2
import mysql.connector
import json

def test_connections():
    """Test konekcija na baze"""
    print("\n" + "="*70)
    print("🔌 Testing database connections...")
    print("="*70)
    
    try:
        # Test TecDoc MySQL
        tecdoc = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # ← EDITUJ
            database="tecdoc1q2019",
            connect_timeout=10
        )
        print("✅ TecDoc MySQL: Connected")
        
        cursor = tecdoc.cursor()
        cursor.execute("SELECT COUNT(*) FROM articles")
        count = cursor.fetchone()[0]
        print(f"   Articles count: {count:,}")
        cursor.close()
        tecdoc.close()
        
    except Exception as e:
        print(f"❌ TecDoc MySQL: Failed - {e}")
        return False
    
    try:
        # Test Postgres (Neon remote database)
        postgres = psycopg2.connect(
            "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
            connect_timeout=10
        )
        print("✅ Postgres: Connected")
        
        cursor = postgres.cursor()
        cursor.execute('SELECT COUNT(*) FROM "Product"')
        count = cursor.fetchone()[0]
        print(f"   Products count: {count:,}")
        cursor.close()
        postgres.close()
        
    except Exception as e:
        print(f"❌ Postgres: Failed - {e}")
        return False
    
    print("\n✅ All connections successful!\n")
    return True

def test_category_mapping():
    """Test mapiranje kategorija"""
    print("\n" + "="*70)
    print("🏷️  Testing category mapping...")
    print("="*70)
    
    try:
        postgres = psycopg2.connect(
            "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
        )
        
        cursor = postgres.cursor()
        cursor.execute("""
            SELECT 
                id, 
                name, 
                "externalId"
            FROM "Category"
            WHERE "externalId" IS NOT NULL
            ORDER BY "externalId"
            LIMIT 10
        """)
        
        results = cursor.fetchall()
        
        if results:
            print(f"\n✅ Found {len(results)} categories with externalId:")
            print("\n" + "-"*70)
            for row in results:
                print(f"   {row[2]:>8} → {row[1]}")
            print("-"*70)
        else:
            print("⚠️  No categories with externalId found!")
            print("   Run: npm run import:tecdoc-categories")
        
        cursor.close()
        postgres.close()
        
        return len(results) > 0
        
    except Exception as e:
        print(f"❌ Category mapping test failed: {e}")
        return False

def test_sample_products():
    """Test sa 3 proizvoda"""
    print("\n" + "="*70)
    print("📦 Testing with sample products...")
    print("="*70)
    
    try:
        # Konekcije
        tecdoc = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="tecdoc1q2019"
        )
        
        postgres = psycopg2.connect(
            "postgresql://neondb_owner:npg_fr1hSiyUN0gR@ep-floral-frog-a28sjyps-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
        )
        
        # Uzmi 3 proizvoda
        pg_cursor = postgres.cursor()
        pg_cursor.execute("""
            SELECT 
                id,
                name,
                "catalogNumber"
            FROM "Product"
            WHERE "catalogNumber" IS NOT NULL
            LIMIT 3
        """)
        
        products = pg_cursor.fetchall()
        
        print(f"\n📋 Testing {len(products)} products:\n")
        
        for product in products:
            product_id, name, catalog_number = product
            print("-"*70)
            print(f"Product: {name[:50]}")
            print(f"Catalog: {catalog_number}")
            
            # Traži u TecDoc
            td_cursor = tecdoc.cursor()
            td_cursor.execute("""
                SELECT id, CurrentProduct
                FROM articles
                WHERE DataSupplierArticleNumber = %s
                LIMIT 1
            """, (catalog_number,))
            
            article = td_cursor.fetchone()
            
            if article:
                article_id, product_id_td = article
                print(f"✅ Found in TecDoc: article_id={article_id}")
                
                # Test ROOT kategoriju
                td_cursor.execute("""
                    SELECT
                        st_root.node_id,
                        st_root.Description
                    FROM articles a
                    LEFT JOIN products p ON p.ID = a.CurrentProduct
                    LEFT JOIN search_trees st_child ON (
                        st_child.Description = p.Description
                        AND st_child.tree_id = 1
                        AND st_child.parent_node_id > 0
                    )
                    LEFT JOIN search_trees st_root ON (
                        st_root.node_id = st_child.parent_node_id
                        AND st_root.tree_id = 1
                        AND st_root.parent_node_id = 0
                    )
                    WHERE a.id = %s
                """, (article_id,))
                
                root = td_cursor.fetchone()
                
                if root and root[0]:
                    print(f"   ROOT: {root[1]} (node_id: {root[0]})")
                    
                    # Provjeri mapiranje
                    pg_cursor.execute("""
                        SELECT id, name
                        FROM "Category"
                        WHERE "externalId" = %s
                    """, (str(root[0]),))
                    
                    local_cat = pg_cursor.fetchone()
                    
                    if local_cat:
                        print(f"   ✅ Mapped to: {local_cat[1]}")
                    else:
                        print(f"   ⚠️  No local category for node_id: {root[0]}")
                else:
                    print("   ⚠️  No ROOT category found")
            else:
                print(f"❌ Not found in TecDoc")
            
            td_cursor.close()
        
        pg_cursor.close()
        postgres.close()
        tecdoc.close()
        
        print("-"*70)
        print("\n✅ Sample test completed!\n")
        return True
        
    except Exception as e:
        print(f"❌ Sample test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "#"*70)
    print("# TecDoc Enrichment - Test Suite")
    print("#"*70)
    
    tests = [
        ("Database Connections", test_connections),
        ("Category Mapping", test_category_mapping),
        ("Sample Products", test_sample_products)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "#"*70)
    print("# Test Summary")
    print("#"*70)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:10} {test_name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n✅ All tests passed! Ready for enrichment.")
        print("\nNext step:")
        print("  python tecdoc_enrichment_updated.py")
    else:
        print("\n⚠️  Some tests failed. Fix issues before running enrichment.")
    
    print("#"*70 + "\n")

if __name__ == "__main__":
    main()
