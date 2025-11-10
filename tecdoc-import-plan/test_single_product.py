"""
Test FAZA 2 sa jednim proizvodom
==================================
Testira kompletan proces obogaćivanja za jedan proizvod
"""

import psycopg2
import mysql.connector
import json
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)

def test_single_product():
    """Test sa jednim proizvodom"""
    
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
    
    print("\n" + "="*70)
    print("🧪 TEST: Obogaćivanje Jednog Proizvoda")
    print("="*70)
    
    # Uzmi prvi proizvod sa tecdocArticleId
    pg_cursor = postgres.cursor()
    pg_cursor.execute("""
        SELECT 
            id,
            name,
            "catalogNumber",
            "tecdocArticleId",
            "tecdocProductId"
        FROM "Product"
        WHERE "tecdocArticleId" IS NOT NULL
        LIMIT 1
    """)
    
    product = pg_cursor.fetchone()
    
    if not product:
        print("❌ Nema proizvoda sa tecdocArticleId!")
        return
    
    product_id, name, catalog, article_id, tecdoc_product_id = product
    
    print(f"\n📦 Proizvod:")
    print(f"   ID: {product_id}")
    print(f"   Naziv: {name}")
    print(f"   Katalog: {catalog}")
    print(f"   TecDoc Article ID: {article_id}")
    print(f"   TecDoc Product ID: {tecdoc_product_id}")
    
    # 1. ROOT Kategorija
    print(f"\n{'='*70}")
    print("🏷️  KORAK 1: Pronalaženje ROOT Kategorije")
    print("="*70)
    
    td_cursor = tecdoc.cursor()
    
    # Query sa semantic matching
    query = """
        SELECT
            st_root.node_id as root_node_id,
            st_root.Description as root_category_name,
            p.Description as product_description,
            CASE
                WHEN p.Description LIKE CONCAT('%', st_root.Description, '%') THEN 3
                WHEN st_child.Description = p.Description THEN 2
                ELSE 1
            END as relevance_score
        FROM articles a
        LEFT JOIN products p ON p.ID = a.CurrentProduct
        LEFT JOIN search_trees st_child ON (
            p.Description LIKE CONCAT('%', st_child.Description, '%')
            AND st_child.tree_id = 1
            AND st_child.parent_node_id > 0
        )
        LEFT JOIN search_trees st_root ON (
            st_root.node_id = st_child.parent_node_id
            AND st_root.tree_id = 1
            AND st_root.parent_node_id = 0
        )
        WHERE a.id = %s
        AND st_root.node_id IS NOT NULL
        ORDER BY 
            relevance_score DESC,
            LENGTH(st_child.Description) DESC
        LIMIT 5
    """
    
    td_cursor.execute(query, (article_id,))
    results = td_cursor.fetchall()
    
    if results:
        print(f"\n✅ Pronađeno {len(results)} mogućih ROOT kategorija:")
        print(f"\n{'Node ID':<10} {'ROOT Kategorija':<30} {'Product':<40} {'Score':<10}")
        print("-" * 90)
        for node_id, root_name, prod_desc, score in results:
            print(f"{node_id:<10} {root_name:<30} {prod_desc[:37]+'...' if len(prod_desc) > 40 else prod_desc:<40} {score:<10}")
        
        # Najbolji match
        best_match = results[0]
        root_node_id = best_match[0]
        root_category_name = best_match[1]
        
        print(f"\n🎯 NAJBOLJI MATCH: {root_category_name} (node_id: {root_node_id})")
        
        # Mapiranje na lokalnu kategoriju
        pg_cursor.execute("""
            SELECT id, name 
            FROM "Category"
            WHERE "externalId" = %s
        """, (str(root_node_id),))
        
        local_category = pg_cursor.fetchone()
        
        if local_category:
            print(f"✅ Mapirana na lokalnu kategoriju: {local_category[1]} (ID: {local_category[0]})")
        else:
            print(f"⚠️  Nema lokalne kategorije za node_id: {root_node_id}")
    else:
        print("❌ Nije pronađena ROOT kategorija")
    
    # 2. OEM Brojevi
    print(f"\n{'='*70}")
    print("🔧 KORAK 2: OEM Brojevi")
    print("="*70)
    
    td_cursor.execute("""
        SELECT OENbr
        FROM article_oe_numbers
        WHERE article_id = %s
        LIMIT 10
    """, (article_id,))
    
    oem_numbers = [row[0] for row in td_cursor.fetchall()]
    
    if oem_numbers:
        print(f"✅ Pronađeno {len(oem_numbers)} OEM brojeva:")
        for oem in oem_numbers[:5]:
            print(f"   - {oem}")
        if len(oem_numbers) > 5:
            print(f"   ... i još {len(oem_numbers) - 5}")
    else:
        print("❌ Nema OEM brojeva")
    
    # 3. Tehničke Specifikacije
    print(f"\n{'='*70}")
    print("📋 KORAK 3: Tehničke Specifikacije")
    print("="*70)
    
    specs = []
    try:
        # Pokušaj različita imena tabela
        queries = [
            # Pokušaj 1: article_attributes
            """
                SELECT 
                    aaa.attribute_id as attr_id,
                    aaa.Value as attr_value
                FROM article_attributes aaa
                WHERE aaa.article_id = %s
                LIMIT 10
            """,
            # Pokušaj 2: article_criteria
            """
                SELECT 
                    ac.criteria_id as attr_id,
                    ac.Value as attr_value
                FROM article_criteria ac
                WHERE ac.article_id = %s
                LIMIT 10
            """
        ]
        
        for query in queries:
            try:
                td_cursor.execute(query, (article_id,))
                specs = td_cursor.fetchall()
                if specs:
                    break
            except:
                continue
        
        if specs:
            print(f"✅ Pronađeno {len(specs)} specifikacija:")
            for attr_id, value in specs[:5]:
                print(f"   - Attribute {attr_id}: {value}")
            if len(specs) > 5:
                print(f"   ... i još {len(specs) - 5}")
        else:
            print("❌ Nema specifikacija")
    except Exception as e:
        print(f"⚠️  Preskočeno (tabela ne postoji): {e}")
        specs = []
    
    # 4. Kompatibilna Vozila
    print(f"\n{'='*70}")
    print("🚗 KORAK 4: Kompatibilna Vozila")
    print("="*70)
    
    vehicles = []
    try:
        # Jednostavniji query bez Manufacturer
        td_cursor.execute("""
            SELECT DISTINCT
                pc.Description as vehicle,
                pc.ID as vehicle_id
            FROM articles a
            JOIN products p ON p.ID = a.CurrentProduct
            JOIN tree_node_products tnp ON tnp.product_id = p.ID
            JOIN passengercars pc ON pc.ID = tnp.parent_node_id
            WHERE a.id = %s
            AND tnp.tree_id = 1
            LIMIT 10
        """, (article_id,))
        
        vehicles = td_cursor.fetchall()
        
        if vehicles:
            print(f"✅ Pronađeno {len(vehicles)} kompatibilnih vozila:")
            for vehicle, vehicle_id in vehicles[:5]:
                print(f"   - {vehicle} (ID: {vehicle_id})")
            if len(vehicles) > 5:
                print(f"   ... i još {len(vehicles) - 5}")
        else:
            print("❌ Nema kompatibilnih vozila")
    except Exception as e:
        print(f"⚠️  Greška: {e}")
        vehicles = []
    
    # 5. Cross-References
    print(f"\n{'='*70}")
    print("🔄 KORAK 5: Cross-References (Ekvivalenti)")
    print("="*70)
    
    cross_refs = []
    try:
        td_cursor.execute("""
            SELECT 
                a2.DataSupplierArticleNumber as equiv_number,
                s.Description as supplier
            FROM article_linkages al
            JOIN articles a2 ON a2.id = al.linked_article_id
            LEFT JOIN suppliers s ON s.ID = a2.Supplier
            WHERE al.article_id = %s
            LIMIT 10
        """, (article_id,))
        
        cross_refs = td_cursor.fetchall()
        
        if cross_refs:
            print(f"✅ Pronađeno {len(cross_refs)} ekvivalenata:")
            for equiv_num, supplier in cross_refs[:5]:
                print(f"   - {equiv_num} ({supplier})")
            if len(cross_refs) > 5:
                print(f"   ... i još {len(cross_refs) - 5}")
        else:
            print("❌ Nema cross-references")
    except Exception as e:
        print(f"⚠️  Greška: {e}")
        cross_refs = []
    
    # Summary
    print(f"\n{'='*70}")
    print("📊 SUMMARY")
    print("="*70)
    print(f"✅ ROOT Kategorija: {'DA' if results else 'NE'}")
    print(f"✅ OEM Brojevi: {len(oem_numbers)}")
    print(f"✅ Specifikacije: {len(specs)}")
    print(f"✅ Vozila: {len(vehicles)}")
    print(f"✅ Cross-refs: {len(cross_refs)}")
    print("="*70)
    
    # Cleanup
    td_cursor.close()
    pg_cursor.close()
    tecdoc.close()
    postgres.close()

if __name__ == "__main__":
    test_single_product()
