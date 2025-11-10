"""
Test konekcije na produkcijsku PostgreSQL bazu na VPS-u
Ova skripta treba da se pokrene NA VPS-u!
"""

import psycopg2
import mysql.connector
import sys

def test_postgres():
    """Test PostgreSQL konekcije (localhost na VPS-u)"""
    try:
        print("🔌 Testiram PostgreSQL konekciju...")
        print("📍 Host: localhost:5432")
        
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="emiir",
            password="emirMehmedovic123456789omerbasic",
            database="omerbasicdb",
            connect_timeout=10
        )
        
        print("✅ Uspješno povezan!")
        
        # Test query
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM "Product"')
        count = cursor.fetchone()[0]
        print(f"📦 Broj proizvoda u bazi: {count}")
        
        cursor.execute('SELECT COUNT(*) FROM "Category"')
        cat_count = cursor.fetchone()[0]
        print(f"📁 Broj kategorija u bazi: {cat_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "VehicleGeneration"')
        gen_count = cursor.fetchone()[0]
        print(f"🚗 Broj generacija vozila u bazi: {gen_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "ProductVehicleFitment"')
        fit_count = cursor.fetchone()[0]
        print(f"🔗 Broj vehicle fitments u bazi: {fit_count}")
        
        cursor.close()
        conn.close()
        
        print("✅ PostgreSQL OK!")
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL greška: {e}")
        return False

def test_tecdoc_mysql(port=3307):
    """Test TecDoc MySQL konekcije (preko SSH tunela)"""
    try:
        print(f"\n🔌 Testiram TecDoc MySQL konekciju...")
        print(f"📍 Host: localhost:{port} (SSH tunel)")
        
        conn = mysql.connector.connect(
            host="localhost",
            port=port,
            user="root",
            password="",
            database="tecdoc1q2019",
            connect_timeout=10
        )
        
        print("✅ Uspješno povezan!")
        
        # Test query
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM articles')
        count = cursor.fetchone()[0]
        print(f"📦 Broj artikala u TecDoc bazi: {count}")
        
        cursor.close()
        conn.close()
        
        print("✅ TecDoc MySQL OK!")
        return True
        
    except Exception as e:
        print(f"❌ TecDoc MySQL greška: {e}")
        print("\n💡 Provjeri:")
        print("   1. Da li je SSH tunel aktivan?")
        print("   2. Pokreni na Mac-u: ssh -R 3307:localhost:3306 omerbasic@188.245.74.57")
        return False

if __name__ == "__main__":
    print("="*70)
    print("🧪 TEST KONEKCIJA ZA BATCH SKRIPTU")
    print("="*70)
    print("\n⚠️  VAŽNO: Ova skripta mora biti pokrenuta NA VPS-u!")
    print("⚠️  SSH tunel mora biti aktivan sa Mac-a!\n")
    
    pg_ok = test_postgres()
    mysql_ok = test_tecdoc_mysql(port=3307)
    
    print("\n" + "="*70)
    if pg_ok and mysql_ok:
        print("✅ SVE KONEKCIJE OK! Možeš pokrenuti batch skriptu.")
        print("\nPokreni:")
        print("  python phase2_enrich_products_batch.py --tecdoc-port 3307 --limit 5 --force")
        sys.exit(0)
    else:
        print("❌ Neke konekcije nisu uspjele. Provjeri greške iznad.")
        sys.exit(1)
