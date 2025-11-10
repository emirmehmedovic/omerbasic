#!/usr/bin/env python3
"""
Quick test script za validaciju motor-specific vs universal detection
"""

import sys
sys.path.insert(0, '/Users/emir_mw/omerbasic/tecdoc-import-plan')

from phase2_enrich_products_batch import TecDocEnricherBatch
import json

def test_motor_specific():
    """Test motor-specific article (ELRING Seal Ring 915.009)"""
    print("\n" + "="*80)
    print("TEST 1: MOTOR-SPECIFIC ARTICLE (ELRING Seal Ring 915.009)")
    print("="*80)

    enricher = TecDocEnricherBatch()
    article_id = 83442842

    # Test get_compatible_vehicles
    print(f"\n1️⃣  Testing get_compatible_vehicles({article_id})...")
    vehicles = enricher.get_compatible_vehicles(article_id)
    print(f"   Found {len(vehicles)} vehicles")

    if len(vehicles) == 0:
        print("   ❌ FAIL: No vehicles found")
        return False

    # Check structure
    print(f"\n2️⃣  Validating vehicle structure...")
    sample = vehicles[0]
    print(f"   Sample vehicle: {sample}")

    required_fields = ['brand', 'model', 'generation']
    missing = [f for f in required_fields if f not in sample]

    if missing:
        print(f"   ❌ FAIL: Missing fields: {missing}")
        return False

    print(f"   ✅ PASS: Vehicle structure is correct")
    print(f"   has_engine = {sample.get('has_engine', 'N/A')}")
    print(f"   engine_code = {sample.get('engine_code', 'N/A')}")

    # Show samples
    print(f"\n4️⃣  Sample vehicles (first 5):")
    for i, vehicle in enumerate(vehicles[:5], 1):
        print(f"   {i}. {vehicle['brand']} {vehicle['model']} {vehicle['generation']} - {vehicle['engine_code']}")

    if len(vehicles) > 5:
        print(f"   ... and {len(vehicles) - 5} more")

    print(f"\n✅ MOTOR-SPECIFIC TEST PASSED")
    return True

def test_universal():
    """Test universal article (TYC License Plate Light)"""
    print("\n" + "="*80)
    print("TEST 2: UNIVERSAL ARTICLE (TYC License Plate Light 250335841)")
    print("="*80)

    enricher = TecDocEnricherBatch()
    article_id = 250335841

    # Test get_compatible_vehicles
    print(f"\n1️⃣  Testing get_compatible_vehicles({article_id})...")
    vehicles = enricher.get_compatible_vehicles(article_id)
    print(f"   Found {len(vehicles)} vehicles")

    if len(vehicles) == 0:
        print("   ❌ FAIL: No vehicles found")
        return False

    # Check structure
    print(f"\n2️⃣  Validating vehicle structure...")
    sample = vehicles[0]
    print(f"   Sample vehicle: {sample}")

    required_fields = ['brand', 'model', 'generation']
    missing = [f for f in required_fields if f not in sample]

    if missing:
        print(f"   ❌ FAIL: Missing fields: {missing}")
        return False

    print(f"   ✅ PASS: Vehicle structure is correct")
    print(f"   has_engine = {sample.get('has_engine', 'N/A')}")
    print(f"   engine_code = {sample.get('engine_code', 'N/A')}")

    # Show samples
    print(f"\n4️⃣  Sample vehicles (first 5):")
    for i, vehicle in enumerate(vehicles[:5], 1):
        print(f"   {i}. {vehicle['brand']} {vehicle['model']} {vehicle['generation']}")

    if len(vehicles) > 5:
        print(f"   ... and {len(vehicles) - 5} more")

    print(f"\n✅ UNIVERSAL TEST PASSED")
    return True

def main():
    print("\n" + "#"*80)
    print("# TESTING MOTOR-SPECIFIC VS UNIVERSAL DETECTION")
    print("#"*80)

    try:
        test1_pass = test_motor_specific()
    except Exception as e:
        print(f"\n❌ TEST 1 FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
        test1_pass = False

    try:
        test2_pass = test_universal()
    except Exception as e:
        print(f"\n❌ TEST 2 FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
        test2_pass = False

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)

    if test1_pass:
        print("✅ Motor-specific detection: PASS")
    else:
        print("❌ Motor-specific detection: FAIL")

    if test2_pass:
        print("✅ Universal detection: PASS")
    else:
        print("❌ Universal detection: FAIL")

    if test1_pass and test2_pass:
        print("\n" + "🎉 "*20)
        print("ALL TESTS PASSED!")
        print("🎉 "*20)
        return 0
    else:
        print("\n" + "⚠️  "*20)
        print("SOME TESTS FAILED")
        print("⚠️  "*20)
        return 1

if __name__ == "__main__":
    sys.exit(main())
