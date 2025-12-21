# 🚀 Performance Optimization Plan - Products Page

## Datum: 21. Decembar 2025

## 🔴 Kritični Problem Identificiran

### Problem: N+1 Query Pattern
- **Broj API poziva**: 1 (listing) + 24 (pojedinačni proizvodi) = **25 poziva**
- **Vrijeme učitavanja**: 1.1s (API) + 24×200ms (avg) = **~6+ sekundi**
- **Uzrok**: `ProductBrandSummary` poziva `/api/products/{productId}` za svaki proizvod

### Dokaz iz Network Logs
```
✅ /api/products?categoryId=...&page=1&limit=24  (1.1s)
❌ /api/products/cmhqilidi06gcomc39xay9k6f    (blocking)
❌ /api/products/cmhqilidi06g7omc33g4rt7u1    (blocking)
... (22 more requests)
```

---

## 🎯 RJEŠENJA (Po Prioritetu)

### **Optimizacija #1: Include vehicleFitments u Listing API** ⭐⭐⭐⭐⭐
**Prioritet**: NAJVIŠI  
**Impact**: Eliminiše 24 API poziva  
**Effort**: Nizak  
**Risk**: Nizak

#### Promjene:
1. **File**: `src/app/api/products/route.ts`
   - Dodati `vehicleFitments` u `select` objekt
   - Uključiti nested `generation`, `model`, `brand` podatke
   
2. **Rezultat**:
   - Jedan API poziv vraća SVE potrebne podatke
   - `ProductBrandSummary` koristi podatke iz propsa umjesto poziva API-ja
   - Smanjenje sa 25 na **1 API poziv**

#### Implementacija:
```typescript
// U productFindManyArgs.select dodati:
vehicleFitments: {
  select: {
    id: true,
    isUniversal: true,
    generation: {
      select: {
        id: true,
        name: true,
        model: {
          select: {
            id: true,
            name: true,
            brand: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    },
    engine: {
      select: {
        id: true,
        code: true,
        power: true,
        capacity: true,
      }
    }
  }
}
```

#### Izmjene Komponenti:
```typescript
// ProductCard.tsx - dodati prop
interface ProductCardProps {
  product: Product & { 
    vehicleFitments?: VehicleFitment[];
    // ... ostalo
  };
}

// ProductBrandSummary.tsx - dodati prop
interface ProductBrandSummaryProps {
  productId: string;
  vehicleFitments?: VehicleFitment[]; // NOVO!
  maxInline?: number;
}

// Ukloniti useEffect fetch ako je vehicleFitments proslijeđen
```

---

### **Optimizacija #2: Lazy Load ProductBrandSummary** ⭐⭐⭐⭐
**Prioritet**: Visok  
**Impact**: Poboljšava percipiranu brzinu  
**Effort**: Nizak  
**Risk**: Nizak

#### Implementacija:
```typescript
// ProductCard.tsx
import dynamic from 'next/dynamic';

const ProductBrandSummary = dynamic(
  () => import('@/components/ProductBrandSummary'),
  { 
    loading: () => (
      <div className="flex gap-2 mt-1">
        <span className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
        <span className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
      </div>
    ),
    ssr: false // Client-side only ako nije kritično za SEO
  }
);
```

---

### **Optimizacija #3: Batch API Endpoint** ⭐⭐⭐
**Prioritet**: Srednji (fallback ako #1 ne uspije)  
**Impact**: Smanjuje broj poziva  
**Effort**: Srednji  
**Risk**: Nizak

#### Kreirati novi endpoint:
```typescript
// src/app/api/products/batch/route.ts
export async function POST(req: Request) {
  const { productIds } = await req.json();
  
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: {
      vehicleFitments: {
        include: {
          generation: {
            include: {
              model: { include: { brand: true } }
            }
          },
          engine: true,
        }
      }
    }
  });
  
  return NextResponse.json(products);
}
```

#### Izmjena komponente:
```typescript
// ProductsResults.tsx
useEffect(() => {
  const ids = products.map(p => p.id);
  
  fetch('/api/products/batch', {
    method: 'POST',
    body: JSON.stringify({ productIds: ids })
  })
    .then(res => res.json())
    .then(detailedProducts => {
      // Merge sa existing products
      setProductsWithDetails(detailedProducts);
    });
}, [products]);
```

**Rezultat**: 25 poziva → 2 poziva (listing + batch)

---

### **Optimizacija #4: Database Query Optimization** ⭐⭐⭐
**Prioritet**: Srednji  
**Impact**: Brži query  
**Effort**: Nizak  
**Risk**: Nizak

#### Dodati composite indexe:
```prisma
// schema.prisma - ProductVehicleFitment model
@@index([productId, generationId])
@@index([productId, engineId])
```

```sql
-- Migration
CREATE INDEX "ProductVehicleFitment_productId_generationId_idx" 
  ON "ProductVehicleFitment"("productId", "generationId");
  
CREATE INDEX "ProductVehicleFitment_productId_engineId_idx" 
  ON "ProductVehicleFitment"("productId", "engineId");
```

---

### **Optimizacija #5: Response Caching** ⭐⭐
**Prioritet**: Nizak  
**Impact**: Brži ponovljeni upiti  
**Effort**: Nizak  
**Risk**: Srednji (invalidacija cache-a)

#### Implementacija:
```typescript
// src/app/api/products/route.ts
export const revalidate = 60; // ISR - već postoji!

// Dodati response headers
const res = NextResponse.json(sortedItems);
res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
return res;
```

---

### **Optimizacija #6: Image Loading Optimization** ⭐⭐
**Prioritet**: Nizak  
**Impact**: Brže renderovanje  
**Effort**: Nizak  
**Risk**: Nizak

#### Izmjene:
```typescript
// OptimizedImage.tsx - dodati loading="lazy" za non-critical slike
<Image
  {...imageProps}
  loading={priority ? 'eager' : 'lazy'}
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>
```

```typescript
// ProductCard.tsx - samo prva 4 proizvoda eager
<OptimizedImage
  src={imageUrl}
  alt={product.name}
  fill
  priority={index < 4} // Prvi red eager, ostalo lazy
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 z-0"
/>
```

---

## 📊 Očekivani Rezultati

### Prije Optimizacije:
- **API pozivi**: 25 (1 listing + 24 pojedinačna)
- **Vrijeme učitavanja**: ~6-8 sekundi
- **First Contentful Paint**: ~2s
- **Time to Interactive**: ~8s

### Nakon Optimizacije #1:
- **API pozivi**: 1 (samo listing)
- **Vrijeme učitavanja**: ~1.5 sekundi ⚡
- **First Contentful Paint**: ~0.5s
- **Time to Interactive**: ~1.5s
- **Poboljšanje**: **~80% brže** 🎉

### Nakon Svih Optimizacija:
- **API pozivi**: 1
- **Vrijeme učitavanja**: ~1 sekunda
- **First Contentful Paint**: ~0.3s
- **Time to Interactive**: ~1s
- **Poboljšanje**: **~85% brže** 🚀

---

## ✅ Redoslijed Implementacije

1. **ODMAH**: Optimizacija #1 (Include vehicleFitments)
2. **ODMAH**: Optimizacija #4 (Database indexi)
3. **Nakon testiranja**: Optimizacija #2 (Lazy loading)
4. **Nakon testiranja**: Optimizacija #6 (Image optimization)
5. **Opcionalno**: Optimizacija #5 (Caching)
6. **Fallback**: Optimizacija #3 (Batch API)

---

## 🧪 Testiranje

### Lokalno:
```bash
# Prije optimizacije
curl -w "\nTotal time: %{time_total}s\n" \
  "http://localhost:3000/api/products?categoryId=xxx&page=1&limit=24"

# Brojanje network poziva u DevTools
```

### Production:
```bash
# Nakon deployment-a
curl -w "\nTotal time: %{time_total}s\n" \
  "https://tpomerbasic.ba/api/products?categoryId=xxx&page=1&limit=24"

# Lighthouse audit
# GTmetrix analiza
```

---

## 📝 Dodatne Napomene

### Potencijalni Trade-offs:
1. **Veličina Response-a**: Uključivanje `vehicleFitments` će povećati payload
   - **Rješenje**: Gzip compression (Next.js već radi)
   - **Impact**: Minimalan (~20% veći payload, ali 95% manje poziva)

2. **Memory Usage**: Više podataka u memoriji
   - **Rješenje**: Pagination već implementirana (24 proizvoda po stranici)
   - **Impact**: Zanemariv

3. **Cache Invalidation**: Promjene u fitments neće biti odmah vidljive
   - **Rješenje**: `revalidate = 60` već postoji
   - **Impact**: Prihvatljiv za business case

---

## 🎓 Naučene Lekcije

1. **Uvijek uključuj potrebne podatke u listing API-je**
2. **Izbjegavaj N+1 query pattern na frontendu**
3. **Koristi React DevTools Profiler za identifikaciju bottlenecka**
4. **Monitor network requests u produkciji**
5. **Composite indexi su ključni za nested queries**

---

## 👥 Kontakt za Pitanja

Emir MW - emir_mw@example.com

---

**Status**: 🟡 Plan Kreiran - Čeka Implementaciju  
**Last Updated**: 2025-12-21 19:40 CET



