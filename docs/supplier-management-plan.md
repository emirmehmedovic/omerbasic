# Plan implementacije sustava za upravljanje dobavljačima i narudžbenicama

## Pregled

Ovaj dokument opisuje plan implementacije sustava za upravljanje dobavljačima i narudžbenicama u postojeću aplikaciju. Sustav će omogućiti:

1. Upravljanje dobavljačima (CRUD operacije)
2. Povezivanje dobavljača s kategorijama i proizvodima
3. Kreiranje narudžbenica prema dobavljačima
4. Izvoz narudžbenica u PDF format
5. Praćenje statusa narudžbi
6. Analitiku i statistiku narudžbi

## 1. Modeliranje podataka

### 1.1 Model dobavljača (Supplier)

```prisma
model Supplier {
  id          String   @id @default(uuid())
  name        String
  companyName String
  address     String
  city        String
  postalCode  String
  country     String
  email       String
  phone       String
  contactPerson String?
  taxId       String?
  notes       String?   @db.Text
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relacije
  categories  SupplierCategory[]
  products    SupplierProduct[]
  orders      PurchaseOrder[]
}
```

### 1.2 Veza dobavljača s kategorijama

```prisma
model SupplierCategory {
  id          String   @id @default(uuid())
  supplierId  String
  categoryId  String
  priority    Int      @default(1) // Prioritet dobavljača za ovu kategoriju
  notes       String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relacije
  supplier    Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  @@unique([supplierId, categoryId])
}
```

### 1.3 Veza dobavljača s proizvodima

```prisma
model SupplierProduct {
  id          String   @id @default(uuid())
  supplierId  String
  productId   String
  supplierSku String?  // Šifra proizvoda kod dobavljača
  priority    Int      @default(1) // Prioritet dobavljača za ovaj proizvod
  price       Decimal  @db.Decimal(10, 2) // Nabavna cijena
  minOrderQty Int?     // Minimalna količina za narudžbu
  leadTime    Int?     // Vrijeme isporuke u danima
  notes       String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relacije
  supplier    Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([supplierId, productId])
}
```

### 1.4 Model narudžbenice (PurchaseOrder)

```prisma
model PurchaseOrder {
  id            String   @id @default(uuid())
  orderNumber   String   @unique // Automatski generirani broj narudžbe
  supplierId    String
  status        PurchaseOrderStatus @default(DRAFT)
  orderDate     DateTime @default(now())
  expectedDeliveryDate DateTime?
  deliveryDate  DateTime?
  subtotal      Decimal  @db.Decimal(10, 2)
  taxAmount     Decimal  @db.Decimal(10, 2)
  totalAmount   Decimal  @db.Decimal(10, 2)
  notes         String?  @db.Text
  createdById   String
  updatedById   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relacije
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  items         PurchaseOrderItem[]
  statusHistory PurchaseOrderStatusHistory[]
  comments      PurchaseOrderComment[]
  createdBy     User     @relation("CreatedPurchaseOrders", fields: [createdById], references: [id])
  updatedBy     User?    @relation("UpdatedPurchaseOrders", fields: [updatedById], references: [id])
}

enum PurchaseOrderStatus {
  DRAFT
  SENT
  CONFIRMED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

### 1.5 Model stavki narudžbenice

```prisma
model PurchaseOrderItem {
  id            String   @id @default(uuid())
  purchaseOrderId String
  productId     String
  quantity      Int
  unitPrice     Decimal  @db.Decimal(10, 2)
  totalPrice    Decimal  @db.Decimal(10, 2)
  receivedQty   Int      @default(0)
  notes         String?  @db.Text
  
  // Relacije
  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])
}
```

### 1.6 Model povijesti statusa narudžbenice

```prisma
model PurchaseOrderStatusHistory {
  id            String   @id @default(uuid())
  purchaseOrderId String
  status        PurchaseOrderStatus
  changedById   String
  changedAt     DateTime @default(now())
  notes         String?  @db.Text
  
  // Relacije
  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  changedBy     User     @relation(fields: [changedById], references: [id])
}
```

### 1.7 Model komentara na narudžbenici

```prisma
model PurchaseOrderComment {
  id            String   @id @default(uuid())
  purchaseOrderId String
  comment       String   @db.Text
  createdById   String
  createdAt     DateTime @default(now())
  
  // Relacije
  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  createdBy     User     @relation(fields: [createdById], references: [id])
}
```

### 1.8 Ažuriranje User modela

```prisma
model User {
  // Postojeća polja...
  
  // Dodati nove relacije
  createdPurchaseOrders PurchaseOrder[] @relation("CreatedPurchaseOrders")
  updatedPurchaseOrders PurchaseOrder[] @relation("UpdatedPurchaseOrders")
  purchaseOrderStatusChanges PurchaseOrderStatusHistory[]
  purchaseOrderComments PurchaseOrderComment[]
}
```

## 2. Backend implementacija

### 2.1 API rute za dobavljače

#### 2.1.1 CRUD operacije za dobavljače

- `GET /api/suppliers` - Dohvat svih dobavljača
- `GET /api/suppliers/[id]` - Dohvat jednog dobavljača
- `POST /api/suppliers` - Kreiranje novog dobavljača
- `PUT /api/suppliers/[id]` - Ažuriranje dobavljača
- `DELETE /api/suppliers/[id]` - Brisanje dobavljača

#### 2.1.2 API za kategorije i proizvode dobavljača

- `GET /api/suppliers/[id]/categories` - Dohvat kategorija dobavljača
- `POST /api/suppliers/[id]/categories` - Dodavanje kategorije dobavljaču
- `DELETE /api/suppliers/[id]/categories/[categoryId]` - Uklanjanje kategorije od dobavljača
- `GET /api/suppliers/[id]/products` - Dohvat proizvoda dobavljača
- `POST /api/suppliers/[id]/products` - Dodavanje proizvoda dobavljaču
- `PUT /api/suppliers/[id]/products/[productId]` - Ažuriranje podataka o proizvodu dobavljača
- `DELETE /api/suppliers/[id]/products/[productId]` - Uklanjanje proizvoda od dobavljača

### 2.2 API rute za narudžbenice

#### 2.2.1 CRUD operacije za narudžbenice

- `GET /api/purchase-orders` - Dohvat svih narudžbenica
- `GET /api/purchase-orders/[id]` - Dohvat jedne narudžbenice
- `POST /api/purchase-orders` - Kreiranje nove narudžbenice
- `PUT /api/purchase-orders/[id]` - Ažuriranje narudžbenice
- `DELETE /api/purchase-orders/[id]` - Brisanje narudžbenice (samo u statusu DRAFT)

#### 2.2.2 API za upravljanje statusom narudžbenice

- `PUT /api/purchase-orders/[id]/status` - Promjena statusa narudžbenice
- `GET /api/purchase-orders/[id]/status-history` - Dohvat povijesti statusa

#### 2.2.3 API za komentare na narudžbenici

- `GET /api/purchase-orders/[id]/comments` - Dohvat komentara
- `POST /api/purchase-orders/[id]/comments` - Dodavanje komentara
- `DELETE /api/purchase-orders/[id]/comments/[commentId]` - Brisanje komentara

#### 2.2.4 API za izvoz narudžbenice

- `GET /api/purchase-orders/[id]/export/pdf` - Izvoz narudžbenice u PDF format

### 2.3 API rute za statistiku narudžbi

- `GET /api/purchase-orders/statistics` - Dohvat statistike narudžbi
- `GET /api/purchase-orders/statistics/by-supplier` - Statistika po dobavljačima
- `GET /api/purchase-orders/statistics/by-status` - Statistika po statusima
- `GET /api/purchase-orders/statistics/by-date` - Statistika po datumima

## 3. Frontend implementacija

### 3.1 Komponente za upravljanje dobavljačima

#### 3.1.1 Pregled dobavljača

- `SupplierList.tsx` - Prikaz liste svih dobavljača
- `SupplierCard.tsx` - Kartica za prikaz osnovnih podataka o dobavljaču
- `SupplierFilter.tsx` - Komponenta za filtriranje dobavljača

#### 3.1.2 Forme za dobavljače

- `SupplierForm.tsx` - Forma za kreiranje/uređivanje dobavljača
- `SupplierCategoryForm.tsx` - Forma za dodavanje kategorija dobavljaču
- `SupplierProductForm.tsx` - Forma za dodavanje proizvoda dobavljaču

### 3.2 Komponente za upravljanje narudžbenicama

#### 3.2.1 Pregled narudžbenica

- `PurchaseOrderList.tsx` - Prikaz liste svih narudžbenica
- `PurchaseOrderCard.tsx` - Kartica za prikaz osnovnih podataka o narudžbenici
- `PurchaseOrderFilter.tsx` - Komponenta za filtriranje narudžbenica

#### 3.2.2 Forme za narudžbenice

- `PurchaseOrderForm.tsx` - Forma za kreiranje/uređivanje narudžbenice
- `PurchaseOrderItemForm.tsx` - Forma za dodavanje stavki u narudžbenicu
- `PurchaseOrderStatusForm.tsx` - Forma za promjenu statusa narudžbenice
- `PurchaseOrderCommentForm.tsx` - Forma za dodavanje komentara

#### 3.2.3 Detalji narudžbenice

- `PurchaseOrderDetails.tsx` - Detaljan prikaz narudžbenice
- `PurchaseOrderItems.tsx` - Prikaz stavki narudžbenice
- `PurchaseOrderStatusHistory.tsx` - Prikaz povijesti statusa
- `PurchaseOrderComments.tsx` - Prikaz i dodavanje komentara

### 3.3 Komponente za statistiku narudžbi

- `PurchaseOrderStatistics.tsx` - Glavni kontejner za statistiku
- `PurchaseOrderCharts.tsx` - Grafikoni za prikaz statistike
- `PurchaseOrderStatisticsFilter.tsx` - Filtriranje statistike po različitim parametrima

### 3.4 Stranice

- `/admin/suppliers` - Pregled svih dobavljača
- `/admin/suppliers/new` - Kreiranje novog dobavljača
- `/admin/suppliers/[id]` - Detalji dobavljača
- `/admin/suppliers/[id]/edit` - Uređivanje dobavljača
- `/admin/purchase-orders` - Pregled svih narudžbenica
- `/admin/purchase-orders/new` - Kreiranje nove narudžbenice
- `/admin/purchase-orders/[id]` - Detalji narudžbenice
- `/admin/purchase-orders/[id]/edit` - Uređivanje narudžbenice
- `/admin/purchase-orders/statistics` - Statistika narudžbi

## 4. Funkcionalnost izvoza u PDF

### 4.1 Implementacija generiranja PDF-a

Koristit ćemo biblioteku `react-pdf` ili `pdfmake` za generiranje PDF dokumenata na klijentskoj strani:

```typescript
// Primjer funkcije za generiranje PDF-a
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generatePurchaseOrderPDF = (purchaseOrder: PurchaseOrder) => {
  const doc = new jsPDF();
  
  // Dodavanje zaglavlja
  doc.setFontSize(20);
  doc.text('Narudžbenica', 14, 22);
  doc.setFontSize(12);
  doc.text(`Broj: ${purchaseOrder.orderNumber}`, 14, 30);
  doc.text(`Datum: ${format(new Date(purchaseOrder.orderDate), 'dd.MM.yyyy')}`, 14, 38);
  
  // Podaci o dobavljaču
  doc.setFontSize(14);
  doc.text('Dobavljač:', 14, 50);
  doc.setFontSize(12);
  doc.text(purchaseOrder.supplier.name, 14, 58);
  doc.text(purchaseOrder.supplier.address, 14, 66);
  doc.text(`${purchaseOrder.supplier.postalCode} ${purchaseOrder.supplier.city}`, 14, 74);
  
  // Tablica sa stavkama
  const tableColumn = ["R.br.", "Proizvod", "Količina", "Cijena", "Ukupno"];
  const tableRows = purchaseOrder.items.map((item, index) => [
    index + 1,
    item.product.name,
    item.quantity,
    formatPrice(item.unitPrice),
    formatPrice(item.totalPrice)
  ]);
  
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 90,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
  });
  
  // Ukupni iznosi
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Ukupno bez PDV-a: ${formatPrice(purchaseOrder.subtotal)}`, 120, finalY);
  doc.text(`PDV: ${formatPrice(purchaseOrder.taxAmount)}`, 120, finalY + 8);
  doc.text(`Ukupno s PDV-om: ${formatPrice(purchaseOrder.totalAmount)}`, 120, finalY + 16);
  
  // Potpisi
  doc.text('Izradio:', 14, finalY + 40);
  doc.text('Odobrio:', 120, finalY + 40);
  
  // Spremanje PDF-a
  doc.save(`Narudzbenica-${purchaseOrder.orderNumber}.pdf`);
};
```

### 4.2 Integracija u korisničko sučelje

Dodati gumb za izvoz PDF-a na stranici s detaljima narudžbenice:

```tsx
<Button 
  onClick={() => generatePurchaseOrderPDF(purchaseOrder)}
  variant="outline"
>
  <FileText className="mr-2 h-4 w-4" />
  Izvezi PDF
</Button>
```

## 5. Plan implementacije

### 5.1 Faza 1: Modeliranje podataka i backend (1-2 tjedna)

1. Kreiranje Prisma modela za dobavljače i narudžbenice
2. Migracija baze podataka
3. Implementacija API ruta za dobavljače (CRUD)
4. Implementacija API ruta za povezivanje dobavljača s kategorijama i proizvodima
5. Implementacija API ruta za narudžbenice (CRUD)
6. Implementacija API ruta za upravljanje statusom i komentarima

### 5.2 Faza 2: Upravljanje dobavljačima (1 tjedan)

1. Implementacija stranice za pregled dobavljača
2. Implementacija forme za kreiranje/uređivanje dobavljača
3. Implementacija komponenti za povezivanje dobavljača s kategorijama
4. Implementacija komponenti za povezivanje dobavljača s proizvodima

### 5.3 Faza 3: Upravljanje narudžbenicama (1-2 tjedna)

1. Implementacija stranice za pregled narudžbenica
2. Implementacija forme za kreiranje narudžbenice
3. Implementacija komponenti za dodavanje stavki u narudžbenicu
4. Implementacija komponenti za upravljanje statusom narudžbenice
5. Implementacija komponenti za komentare na narudžbenici

### 5.4 Faza 4: Izvoz u PDF i statistika (1 tjedan)

1. Implementacija funkcionalnosti za izvoz narudžbenice u PDF
2. Implementacija stranice za statistiku narudžbi
3. Implementacija grafikona za vizualizaciju statistike

### 5.5 Faza 5: Testiranje i optimizacija (1 tjedan)

1. Testiranje svih funkcionalnosti
2. Optimizacija performansi
3. Ispravljanje grešaka
4. Finalno testiranje

## 6. Tehnologije i biblioteke

- **Backend**: Next.js API routes, Prisma ORM
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **PDF generiranje**: jsPDF, pdfmake ili react-pdf
- **Grafikoni**: Recharts
- **Validacija**: Zod
- **Forme**: React Hook Form

## 7. Zaključak

Implementacija sustava za upravljanje dobavljačima i narudžbenicama značajno će unaprijediti proces nabave. Sustav će omogućiti:

1. Centralizirano upravljanje dobavljačima
2. Efikasno kreiranje i praćenje narudžbenica
3. Profesionalan izvoz narudžbenica u PDF format
4. Detaljnu analitiku i statistiku nabave

Ukupno vrijeme implementacije procjenjuje se na 4-6 tjedana, ovisno o kompleksnosti i dodatnim zahtjevima koji se mogu pojaviti tijekom razvoja.
