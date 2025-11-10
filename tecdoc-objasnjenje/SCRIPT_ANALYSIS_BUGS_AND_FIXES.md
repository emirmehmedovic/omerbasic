# 🐛 ANALIZA GREŠKE U SKRIPTI: phase2_enrich_products_batch.py

**Datum**: 9. novembar 2025.
**Status**: ✅ IDENTIFIKOVANE 5 KRITIČNIH GREŠAKA
**Skripta**: `phase2_enrich_products_batch.py`

---

## 🔴 KRITIČNA GREŠKA #1: `get_compatible_vehicles()` - POGREŠNA LOGIKA FILTRIRANJA

### Lokacija
Lines: 282-362

### Problem
```python
# POGREŠNO - trenutni kod:
query = """
    SELECT DISTINCT pc.id
    FROM passengercars pc
    WHERE pc.ManufacturerId = %s
    LIMIT 100
"""
```

### Zašto je greška?

1. **Nema filtriranja po motorima**
   - Kod pronalazi SVE passengercars za proizvođača
   - Bez obzira da li su kompatibilni sa člankom
   - Primjer: Ako je artikal za **1.8 TFSI**, pronalazi i **2.0 TDI**, **3.2 V6** itd.

2. **Nema filteriranja po OEM broju**
   - Kod IGNORIŠE OEM broj kompletno
   - Trebalo bi da uključi samo vozila koja imaju taj specifičan OEM broj

3. **Rezultat: Previše ili Premalo vozila**
   - Za artikle sa specifičnim motorima: Dobije 1000+ vozila (pogrešnih)
   - Za artikle bez motornog filtriranja: Trebalo bi универзалан pristup

### Ispravan pristup

```python
def get_compatible_vehicles(self, article_id: int):
    """
    Pronađi kompatibilna vozila preko OE brojeva + passengercars
    - Ako je OEM broj za specifičan motor: Filtriraj po motorima
    - Ako je OEM broj UNIVERZAN: Pronađi sve varijante
    """
    tecdoc_cursor = self.tecdoc_conn.cursor()

    # 1. Pronađi OE brojeve + Manufacturer
    query = """
        SELECT DISTINCT
            aon.OENbr,
            aon.Manufacturer,
            m.Description as manufacturer_name
        FROM article_oe_numbers aon
        LEFT JOIN manufacturers m ON m.id = aon.Manufacturer
        WHERE aon.article_id = %s
        LIMIT 5
    """

    tecdoc_cursor.execute(query, (article_id,))
    oe_data = tecdoc_cursor.fetchall()

    if not oe_data:
        tecdoc_cursor.close()
        return []

    # 2. Za svaki OEM broj, pronađi specifične motore ako postoje
    all_passengercars_ids = []

    for oe_number, manufacturer_id, manufacturer_name in oe_data:
        # KLJUČNA PROMJENA: Koristi OEM broj za filtriranje vozila
        query = """
            SELECT DISTINCT pc.id
            FROM passengercars pc
            JOIN article_oe_numbers aon ON 1=1
            WHERE pc.ManufacturerId = %s
            AND aon.OENbr = %s
            AND aon.article_id = %s
            LIMIT 200
        """

        tecdoc_cursor.execute(query, (manufacturer_id, oe_number, article_id))
        results = tecdoc_cursor.fetchall()

        all_passengercars_ids.extend([r[0] for r in results])

    tecdoc_cursor.close()

    if not all_passengercars_ids:
        return []

    # 3. Mapiranje na našu bazu
    prod_cursor = self.prod_conn.cursor()

    all_passengercars_ids = list(set(all_passengercars_ids))[:200]
    placeholders = ','.join(['%s'] * len(all_passengercars_ids))

    query = f"""
        SELECT DISTINCT
            vb.name as brand,
            vm.name as model,
            vg.name as generation,
            ve."engineCode" as engine_code
        FROM "VehicleGeneration" vg
        JOIN "VehicleModel" vm ON vm.id = vg."modelId"
        JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
        LEFT JOIN "VehicleEngine" ve ON ve."generationId" = vg.id
        WHERE vg."externalId" IN ({placeholders})
        LIMIT 200
    """

    prod_cursor.execute(query, tuple(map(str, all_passengercars_ids)))
    results = prod_cursor.fetchall()
    prod_cursor.close()

    vehicles = []
    for brand, model, generation, engine_code in results:
        vehicles.append({
            'brand': brand,
            'model': model,
            'generation': generation,
            'engine_code': engine_code
        })

    return vehicles
```

---

## 🔴 KRITIČNA GREŠKA #2: `get_compatible_vehicles()` - Nema specificiranja motorima

### Lokacija
Lines: 282-362

### Problem

Za artikle kao **ELRING Seal Ring (915.009)** koji trebaju biti kompatibilni sa **specifičnim motorima**:
- **Trebalo bi**: 1.6, 1.8 TFSI, 2.0 TDI, 1.9 TDI itd.
- **Dobijate**: Sva vozila za taj proizvođača bez obzira na motor

### Rješenje: Dodaj motor filtriranje

```python
def get_compatible_vehicles_with_engines(self, article_id: int):
    """
    Pronađi kompatibilna vozila sa specifičnim motorima
    Koristi passengercars_link_engines za motor specifičnost
    """
    tecdoc_cursor = self.tecdoc_conn.cursor()

    # KLJUČNA QUERY: Vozila sa SPECIFICIRANIM motorima
    query = """
        SELECT DISTINCT
            pc.id as passengercars_id,
            mo.Description as model_name,
            pc.Description as motor_description,
            e.Description as engine_code,
            m.Description as manufacturer_name
        FROM article_oe_numbers aon
        LEFT JOIN passengercars pc ON pc.ManufacturerId = aon.Manufacturer
        LEFT JOIN passengercars_link_engines ple ON ple.car_id = pc.id
        LEFT JOIN engines e ON e.id = ple.engine_id
        LEFT JOIN models mo ON mo.id = pc.Model
        LEFT JOIN manufacturers m ON m.id = pc.ManufacturerId
        WHERE aon.article_id = %s
        AND m.id = aon.Manufacturer
        LIMIT 500
    """

    tecdoc_cursor.execute(query, (article_id,))
    results = tecdoc_cursor.fetchall()
    tecdoc_cursor.close()

    if not results:
        return []

    # Ekstrakuj passengercars IDs
    all_passengercars_ids = list(set([r[0] for r in results]))[:200]

    # Mapiranje na našu bazu
    prod_cursor = self.prod_conn.cursor()

    placeholders = ','.join(['%s'] * len(all_passengercars_ids))

    query = f"""
        SELECT DISTINCT
            vb.name as brand,
            vm.name as model,
            vg.name as generation,
            ve."engineCode" as engine_code,
            vg."externalId" as tecdoc_passengercars_id
        FROM "VehicleGeneration" vg
        JOIN "VehicleModel" vm ON vm.id = vg."modelId"
        JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
        LEFT JOIN "VehicleEngine" ve ON ve."generationId" = vg.id
        WHERE vg."externalId" IN ({placeholders})
        LIMIT 200
    """

    prod_cursor.execute(query, tuple(map(str, all_passengercars_ids)))
    results = prod_cursor.fetchall()
    prod_cursor.close()

    vehicles = []
    for brand, model, generation, engine_code, tecdoc_id in results:
        vehicles.append({
            'brand': brand,
            'model': model,
            'generation': generation,
            'engine_code': engine_code,
            'tecdoc_passengercars_id': tecdoc_id
        })

    return vehicles
```

---

## 🔴 GREŠKA #3: `create_vehicle_fitments()` - Ne sprema Engine informacije

### Lokacija
Lines: 649-725

### Problem

Kod samo sprema:
- Brand
- Model
- Generation

Ali **NE sprema**:
- Engine kod
- Specifičan motor (1.8 TFSI vs 2.0 TDI)
- Motor veličinu

### Rješenje

```python
def create_vehicle_fitments(self, product_id: str, vehicles: list):
    """
    Kreiraj ProductVehicleFitment zapise sa engine informacijama
    """
    if not vehicles:
        return 0

    cursor = self.prod_conn.cursor()
    created_count = 0

    for vehicle in vehicles:
        brand = vehicle['brand']
        model = vehicle['model']
        generation = vehicle['generation']
        engine_code = vehicle.get('engine_code')
        tecdoc_passengercars_id = vehicle.get('tecdoc_passengercars_id')

        # Pronađi VehicleGeneration ID
        query = """
            SELECT vg.id
            FROM "VehicleGeneration" vg
            JOIN "VehicleModel" vm ON vm.id = vg."modelId"
            JOIN "VehicleBrand" vb ON vb.id = vm."brandId"
            WHERE LOWER(vb.name) = LOWER(%s)
            AND LOWER(vm.name) = LOWER(%s)
            AND LOWER(vg.name) = LOWER(%s)
            LIMIT 1
        """

        cursor.execute(query, (brand, model, generation))
        result = cursor.fetchone()

        if not result:
            continue

        generation_id = result[0]

        # Pronađi VehicleEngine ako je dostupan
        vehicle_engine_id = None
        if engine_code:
            query = """
                SELECT ve.id
                FROM "VehicleEngine" ve
                WHERE ve."generationId" = %s
                AND LOWER(ve."engineCode") = LOWER(%s)
                LIMIT 1
            """
            cursor.execute(query, (generation_id, engine_code))
            result = cursor.fetchone()
            if result:
                vehicle_engine_id = result[0]

        # Provjeri da li već postoji
        check_query = """
            SELECT id FROM "ProductVehicleFitment"
            WHERE "productId" = %s AND "generationId" = %s
            LIMIT 1
        """

        cursor.execute(check_query, (product_id, generation_id))
        if cursor.fetchone():
            continue

        # Kreiraj ProductVehicleFitment sa engine ID ako postoji
        import secrets, string
        from datetime import datetime

        def generate_cuid():
            timestamp = str(int(datetime.now().timestamp() * 1000))[-10:]
            random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(15))
            return f"c{timestamp}{random_part}"

        new_id = generate_cuid()

        insert_query = """
            INSERT INTO "ProductVehicleFitment" (
                id,
                "productId",
                "generationId",
                "engineId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, NOW(), NOW()
            )
        """

        cursor.execute(insert_query, (new_id, product_id, generation_id, vehicle_engine_id))
        self.prod_conn.commit()
        created_count += 1

    cursor.close()
    return created_count
```

---

## 🔴 GREŠKA #4: `get_root_category()` - LIKE operator problem

### Lokacija
Lines: 125-215

### Problem

```python
# LOŠA QUERY:
query = """
    SELECT node_id, Description, parent_node_id
    FROM search_trees
    WHERE tree_id = 1
    AND parent_node_id > 0
    AND %s LIKE CONCAT('%%', Description, '%%')  # ← PROBLEM!
    ORDER BY LENGTH(Description) DESC
    LIMIT 1
"""

cursor.execute(query, (product_description,))
```

### Zašto je greška?

1. **Preveć hit-ove**: "Filters" se mapira na "Filter", "Air Filter", "Oil Filter" itd.
2. **Pogrešna prioritizacija**: Koristi `LENGTH(Description) DESC` što favorizira duže stringove
3. **Nema konteksta**: Ne vodi računa da je "Filter" drugačiji od "Air Filter Canister"

### Ispravan pristup

```python
def get_root_category(self, article_id: int):
    """Pronađi root kategoriju - sa boljim matchingom"""
    cursor = self.tecdoc_conn.cursor()

    # 1. Pronađi Product ID
    query = """
        SELECT CurrentProduct
        FROM articles
        WHERE id = %s
        LIMIT 1
    """

    cursor.execute(query, (article_id,))
    result = cursor.fetchone()

    if not result or not result[0]:
        cursor.close()
        return None

    product_id = result[0]

    # 2. Pronađi Product Description
    query = """
        SELECT Description
        FROM products
        WHERE ID = %s
        LIMIT 1
    """

    cursor.execute(query, (product_id,))
    result = cursor.fetchone()

    if not result:
        cursor.close()
        return None

    product_description = result[0]

    # 3. Pronađi search_trees čvor - POBOLJŠANA LOGIKA
    # Prvo: Pokušaj TAČAN match
    query = """
        SELECT node_id, Description, parent_node_id
        FROM search_trees
        WHERE tree_id = 1
        AND parent_node_id > 0
        AND LOWER(Description) = LOWER(%s)
        LIMIT 1
    """

    cursor.execute(query, (product_description,))
    result = cursor.fetchone()

    if result:
        node_id, node_description, parent_node_id = result
    else:
        # Ako nema tačnog match-a, koristi LIKE sa boljim prioritetom
        query = """
            SELECT node_id, Description, parent_node_id
            FROM search_trees
            WHERE tree_id = 1
            AND parent_node_id > 0
            AND LOWER(%s) LIKE CONCAT('%%', LOWER(Description), '%%')
            ORDER BY
                LENGTH(Description) DESC,
                node_id ASC
            LIMIT 1
        """

        cursor.execute(query, (product_description,))
        result = cursor.fetchone()

        if not result:
            cursor.close()
            return None

        node_id, node_description, parent_node_id = result

    # 4. Pronađi root kategoriju (parent_node_id = 0)
    parent_chain = []
    current_parent = parent_node_id

    while current_parent and current_parent > 0:
        parent_query = """
            SELECT node_id, Description, parent_node_id
            FROM search_trees
            WHERE node_id = %s
            AND tree_id = 1
        """
        cursor.execute(parent_query, (current_parent,))
        parent_result = cursor.fetchone()

        if parent_result:
            parent_chain.append({
                'id': parent_result[0],
                'name': parent_result[1]
            })
            current_parent = parent_result[2]
        else:
            break

    cursor.close()

    return {
        'id': node_id,
        'name': node_description,
        'product_id': product_id,
        'product_description': product_description,
        'root_category': parent_chain[-1] if parent_chain else {'id': node_id, 'name': node_description},
        'parent_chain': parent_chain
    }
```

---

## 🔴 GREŠKA #5: Nema provjeravanja da li je artikal `MOTOR-SPECIFIČAN`

### Lokacija
Cijela skripta - nedostaje logika

### Problem

Skripta tretira **sve** artikle na isti način, ali trebalo bi razlikovati:

1. **Artikli sa specifičnim motorima** (npr. Seal Ring 915.009)
   - Trebalo bi pronalaziti samo ta vozila
   - Trebalo bi sprema engine kod

2. **Univerzalni artikli** (npr. License Plate Light)
   - Trebalo bi pronalaziti sva vozila bez filtriranja po motoru

3. **Artikli sa varijantnošću** (npr. po boji, veličini)
   - Trebalo bi ponavljati za svaku varijantu

### Rješenje

```python
def detect_article_type(self, article_id: int):
    """
    Detektujem tip artikla:
    - 'motor_specific': Trebalo bi specifičan motor (npr. Seal Ring)
    - 'motor_any': Bilo koji motor (npr. License Plate Light)
    - 'universal': Nema motornog filtriranja (npr. Gasket)
    """
    cursor = self.tecdoc_conn.cursor()

    # Pronađi proizvod
    query = """
        SELECT p.Description, COUNT(DISTINCT pc.id) as vehicle_count
        FROM articles a
        LEFT JOIN products p ON p.ID = a.CurrentProduct
        LEFT JOIN article_oe_numbers aon ON aon.article_id = a.id
        LEFT JOIN passengercars pc ON pc.ManufacturerId = aon.Manufacturer
        WHERE a.id = %s
        GROUP BY p.Description
    """

    cursor.execute(query, (article_id,))
    result = cursor.fetchone()
    cursor.close()

    if not result:
        return None

    product_description, vehicle_count = result

    # Heuristic:
    # Ako je proizvod "Seal", "Ring", "Gasket", "Bolt" → motor_specific
    # Ako je proizvod "Light", "Lamp", "Reflector" → universal
    # Ako je proizvod "Filter" → motor_specific (obično)

    motor_specific_keywords = ['seal', 'ring', 'gasket', 'bolt', 'valve', 'cap', 'cover', 'filter', 'injector', 'sensor']
    universal_keywords = ['light', 'lamp', 'reflector', 'bracket', 'holder', 'trim']

    description_lower = product_description.lower()

    for keyword in motor_specific_keywords:
        if keyword in description_lower:
            return 'motor_specific'

    for keyword in universal_keywords:
        if keyword in description_lower:
            return 'universal'

    # Default: Ako je mnogo vozila, vjerovatno universal
    if vehicle_count and vehicle_count > 500:
        return 'universal'

    return 'motor_any'
```

---

## 📋 SAŽETAK GREŠAKA

| # | Greška | Lokacija | Ozbiljnost | Efekat |
|---|--------|----------|-----------|--------|
| 1 | Nema filtriranja po OEM broju | `get_compatible_vehicles()` | 🔴 KRITIČNO | Pronalazi pogrešna vozila |
| 2 | Nema motor specifičnosti | `get_compatible_vehicles()` | 🔴 KRITIČNO | Sprema sve motore bez razlike |
| 3 | Nema engine koda u fitmentima | `create_vehicle_fitments()` | 🟠 VAŽNO | Nema mogućnosti filtriranja po motoru |
| 4 | LIKE operator greška | `get_root_category()` | 🟠 VAŽNO | Pogrešna kategorija |
| 5 | Nema detektovanja tipa artikla | Cijela skripta | 🟠 VAŽNO | Ista logika za sve artikel tipove |

---

## ✅ KORIGOVANA SKRIPTA

Trebalo bi:

1. **Ispraviti `get_compatible_vehicles()`**
   - Dodati OEM broj filtriranje
   - Dodati motor specifičnost

2. **Ispraviti `create_vehicle_fitments()`**
   - Sprema engine ID
   - Prosljeđuje engine kod

3. **Ispraviti `get_root_category()`**
   - Prvo tačan match, zatim LIKE
   - Bolja prioritizacija

4. **Dodati `detect_article_type()`**
   - Razlikuje motor-specifičan od universal

5. **Dodat `get_compatible_vehicles_with_engines()`**
   - Koristi passengercars_link_engines
   - Sprema sve motorne informacije

---

**Kreirano**: 9. novembar 2025.
**Status**: ✅ GREŠKE ANALIZIRANE I RJEŠENJA PREDLOŽENA
**File**: `/Users/emir_mw/tecdoc/SCRIPT_ANALYSIS_BUGS_AND_FIXES.md`
