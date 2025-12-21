
# SEO STRATEGIJA ZA WEBSHOP AUTODIJELOVA (24.000 PROIZVODA)

Domen: https://tpomerbasic.ba  
Tech stack: Next.js / React / Node.js / PostgreSQL  
Status: Novi webshop (~1 mjesec)

---

## 1. KLJUČNA REALNOST

- Ne optimizirati svih 24.000 proizvoda odjednom
- Fokus: TOP 300–500 proizvoda
- OEM i kataloški brojevi = najveća SEO prednost
- Vrijeme + struktura = rezultat

---

## 2. URL & SLUG STRATEGIJA (KRITIČNO)

### ❌ Trenutni problem
Slug se generiše iz title-a koji sadrži:
- OEM brojeve
- kataloške brojeve
- interne oznake (DX, KPL, VIJCI)

Primjer:
```
/products/as-metal-kugla-golf-4-dx-octavia-kpl-vijci-10vw1501
```

Ovo je loše za:
- CTR
- čitljivost
- Google semantiku

---

### ✅ ISPRAVNA SLUG STRATEGIJA

Slug mora sadržavati SAMO:
- naziv dijela
- model vozila

Bez:
- OEM brojeva
- kataloških brojeva
- pakovanja
- strana (L/D)

#### ✅ Ispravan primjer:
```
/products/kugla-spone-vw-golf-4
```

---

## 3. KAKO RAZDVOJITI: SLUG vs TITLE

### Slug (čist, kratak)
Generiše se iz:
- osnovnog naziva dijela
- modela vozila

### Title (SEO optimizovan)
Sadrži:
- naziv
- model
- JEDAN OEM broj

Primjer:
```
Kugla spone VW Golf 4 – OEM 14440 | Tp Omerbašić
```

---

## 4. PREPORUČENA LOGIKA ZA GENERISANJE SLUGA

### Python primjer (slug clean-up)

```python
import re
from slugify import slugify

STOP_WORDS = [
    "oem", "dx", "sx", "l", "r", "kpl", "komplet", "vijci",
    "set", "kit"
]

def clean_name(name):
    name = name.lower()
    name = re.sub(r"\b\d+\b", "", name)
    for word in STOP_WORDS:
        name = name.replace(word, "")
    return slugify(name)

print(clean_name("AS METAL Kugla Golf 4 DX Octavia KPL Vijci 10VW1501"))
# kugla-golf-4-octavia
```

➡️ Idealno dalje filtrirati po glavnom modelu.

---

## 5. IDEALNA STRUKTURA PRODUCT STRANICE

### URL
```
/products/kugla-spone-vw-golf-4
```

### Title
```
Kugla spone VW Golf 4 – OEM 14440 | Tp Omerbašić
```

### H1
```
Kugla spone za VW Golf 4 (OEM 14440)
```

---

## 6. OEM / KATALOŠKI BROJEVI (OBAVEZNO)

Posebna sekcija, NIKAD u slug.

```html
<section>
  <h2>OEM i kataloški brojevi</h2>
  <ul>
    <li>OEM VW: 14440</li>
    <li>AS Metal: 10VW1501</li>
  </ul>
</section>
```

---

## 7. OPIS PROIZVODA (150–300 RIJEČI)

Opis mora:
- objašnjavati funkciju dijela
- navesti modele i motore
- prirodno spomenuti OEM broj

---

## 8. INTERNA STRUKTURA (ZA 24K PROIZVODA)

Napraviti landing stranice:
```
/vw-golf-4-autodijelovi
/vw-golf-4-ovjes
```

I sa njih linkati proizvode.

---

## 9. AUTOMATIZACIJA (PYTHON)

### Automatski title & H1

```python
title = f"{name} {model} – OEM {main_oem} | Tp Omerbašić"
h1 = f"{name} za {model} (OEM {main_oem})"
```

### Automatski opis (fallback)

```python
def generate_description(p):
    return f"Ova {p['name']} odgovara za {p['model']} i zamjenjuje OEM {p['oem']}."
```

---

## 10. STRUCTURED DATA (Next.js)

Koristiti schema.org/Product:
- sku
- mpn (OEM)

---

## 11. OČEKIVANJA

- 1–2 mjeseca: OEM long-tail
- 3–6 mjeseci: srednji pojmovi
- 6–12 mjeseci: glavni pojmovi

---

## 12. ZAKLJUČAK

✔ Slug = čist i kratak  
✔ Title = SEO optimizovan  
✔ OEM brojevi = konkurentska prednost  
✔ Automatizacija je OBAVEZNA  

Dokument prilagođen za tpomerbasic.ba
