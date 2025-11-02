import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

// Shema za validaciju CSV podataka
const productImportSchema = z.object({
  name: z.string().min(1, "Naziv proizvoda je obavezan"),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive("Cijena mora biti pozitivan broj"),
  imageUrl: z.string().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  catalogNumber: z.string().min(1, "Kataloški broj je obavezan"),
  oemNumber: z.string().optional().nullable(),
  isFeatured: z.coerce.boolean().default(false),
  isArchived: z.coerce.boolean().default(false),
  categoryId: z.string().min(1, "ID kategorije je obavezan"),
  unitOfMeasure: z.string().optional().nullable(),
  purchasePrice: z.coerce.number().optional().nullable(),
  sku: z.string().optional().nullable(),
  technicalSpecs: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  standards: z.string().optional().nullable(),
  vehicleFitments: z.string().optional().nullable(),
  attributeValues: z.string().optional().nullable(),
  crossReferences: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // Provjeri da li je zahtjev multipart/form-data
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Zahtjev mora biti multipart/form-data' }, { status: 400 });
    }

    // Dohvati CSV datoteku iz zahtjeva
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const defaultCategoryId = (formData.get('defaultCategoryId') || formData.get('categoryId')) as string | null;
    const dryRunRaw = formData.get('dryRun');
    const dryRun = typeof dryRunRaw === 'string' ? ['1', 'true', 'yes', 'on'].includes(dryRunRaw.toLowerCase()) : !!dryRunRaw;

    if (!file) {
      return NextResponse.json({ error: 'CSV datoteka nije pronađena' }, { status: 400 });
    }

    // Provjeri da li je datoteka CSV
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Datoteka mora biti CSV format' }, { status: 400 });
    }

    // Čitaj sadržaj datoteke
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);

    // Parsiraj CSV (delimiter ;) i detektuj format kolona
    const rawRecords = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
    }) as any[];

    const records: any[] = [];
    const hasSifart = rawRecords.length > 0 && Object.prototype.hasOwnProperty.call(rawRecords[0], 'SIFART');
    if (hasSifart) {
      // Mapiranje proizvodi-2.csv -> naš import format
      for (const r of rawRecords as any[]) {
        const toNum = (val: any) => {
          if (val === undefined || val === null || val === '') return undefined;
          const s = String(val).replace(/\./g, '').replace(/,/g, '.');
          const n = Number(s);
          return isNaN(n) ? undefined : n;
        };
        const name = (r.IMEART ?? '').toString();
        const imemal = (r.imemal ?? '').toString();
        const baseDesc = imemal ? imemal : undefined;
        records.push({
          name,
          description: baseDesc,
          price: toNum(r.CIJART) ?? 0,
          imageUrl: undefined,
          stock: 0,
          catalogNumber: (r.katbro ?? '').toString(),
          oemNumber: r.oem ? r.oem.toString() : undefined,
          isFeatured: false,
          isArchived: false,
          categoryId: defaultCategoryId || '',
          unitOfMeasure: r.JEDMJE ? r.JEDMJE.toString() : undefined,
          purchasePrice: toNum(r.CIJNAB),
          sku: r.SIFART ? r.SIFART.toString() : undefined,
          _imemal: imemal,
        });
      }
    } else {
      // Pretpostavi stari format (već usklađen sa shemom)
      records.push(...rawRecords);
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV datoteka ne sadrži podatke' }, { status: 400 });
    }

    // Rezultati importa
    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string }[],
      created: [] as string[],
      updated: [] as string[],
      dryRun,
      preview: [] as any[],
    };

    // Obradi svaki red
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Ako je novi CSV i defaultCategoryId nije postavljen, ne možemo kreirati proizvode bez kategorije
        if (!record.categoryId || record.categoryId.length === 0) {
          if (hasSifart && !defaultCategoryId) {
            throw new Error('Nedostaje defaultCategoryId u form-data za dodjelu kategorije novim proizvodima.');
          }
        }

        // Validiraj podatke
        const validatedData = productImportSchema.parse(record);

        // Provjeri da li proizvod već postoji (po kataloškom broju)
        const existingProduct = await db.product.findUnique({
          where: { catalogNumber: validatedData.catalogNumber },
        });

        // Pripremi podatke za bazu
        const productData = {
          name: validatedData.name,
          description: validatedData.description || undefined,
          price: validatedData.price,
          imageUrl: validatedData.imageUrl || undefined,
          stock: validatedData.stock,
          catalogNumber: validatedData.catalogNumber,
          oemNumber: validatedData.oemNumber || undefined,
          isFeatured: validatedData.isFeatured,
          isArchived: validatedData.isArchived,
          categoryId: validatedData.categoryId,
          unitOfMeasure: validatedData.unitOfMeasure || undefined,
          purchasePrice: validatedData.purchasePrice ?? undefined,
          sku: validatedData.sku || undefined,
          technicalSpecs: validatedData.technicalSpecs ? JSON.parse(validatedData.technicalSpecs) : undefined,
          dimensions: validatedData.dimensions ? JSON.parse(validatedData.dimensions) : undefined,
          standards: validatedData.standards ? 
            JSON.parse(validatedData.standards.replace(/^\[(.*)\]$/, '[$1]').replace(/'/g, '"')) : [],
        };

        // Kreiraj ili ažuriraj proizvod
        let product;
        if (existingProduct) {
          // Ako imamo imemal iz CSV-a, dopuni description (ako već ne sadrži)
          let newDescription = productData.description;
          if (record._imemal) {
            const alreadyHas = (existingProduct.description || '').includes(record._imemal);
            if (!alreadyHas) {
              newDescription = [existingProduct.description, record._imemal].filter(Boolean).join('\n');
            } else {
              newDescription = existingProduct.description || productData.description;
            }
          }

          if (!dryRun) {
            product = await db.product.update({
              where: { id: existingProduct.id },
              data: { ...productData, description: newDescription },
            });
          }
          results.updated.push(validatedData.catalogNumber);
        } else {
          // Ako nemamo kategoriju tu, pokušaj koristiti defaultCategoryId iz forme
          const createData = {
            ...productData,
            categoryId: productData.categoryId || defaultCategoryId!,
          };
          if (!dryRun) {
            product = await db.product.create({
              data: createData,
            });
          }
          results.created.push(validatedData.catalogNumber);
        }

        // Obradi vehicleFitments ako postoje
        if (!dryRun && validatedData.vehicleFitments) {
          const fitments = JSON.parse(validatedData.vehicleFitments);
          
          // Prvo obriši postojeće fitmente za ovaj proizvod
          if (existingProduct) {
            await db.productVehicleFitment.deleteMany({
              where: { productId: existingProduct.id },
            });
          }
          
          // Dodaj nove fitmente
          const productIdForChildren = existingProduct ? existingProduct.id : product!.id;
          for (const fitment of fitments) {
            await db.productVehicleFitment.create({
              data: {
                productId: productIdForChildren,
                generationId: fitment.generationId,
                engineId: fitment.engineId || undefined,
                fitmentNotes: fitment.fitmentNotes || undefined,
                position: fitment.position || undefined,
                bodyStyles: fitment.bodyStyles || [],
                yearFrom: fitment.yearFrom || undefined,
                yearTo: fitment.yearTo || undefined,
                isUniversal: fitment.isUniversal || false,
              },
            });
          }
        }

        // Obradi attributeValues ako postoje
        if (!dryRun && validatedData.attributeValues) {
          const attributes = JSON.parse(validatedData.attributeValues);
          
          // Prvo obriši postojeće vrijednosti atributa za ovaj proizvod
          if (existingProduct) {
            await db.productAttributeValue.deleteMany({
              where: { productId: existingProduct.id },
            });
          }
          
          // Dodaj nove vrijednosti atributa
          const productIdForChildren = existingProduct ? existingProduct.id : product!.id;
          for (const attr of attributes) {
            await db.productAttributeValue.create({
              data: {
                productId: productIdForChildren,
                attributeId: attr.attributeId,
                value: attr.value,
              },
            });
          }
        }

        // Obradi crossReferences ako postoje
        if (!dryRun && validatedData.crossReferences) {
          const references = JSON.parse(validatedData.crossReferences);
          
          // Prvo obriši postojeće reference za ovaj proizvod
          if (existingProduct) {
            await db.productCrossReference.deleteMany({
              where: { productId: existingProduct.id },
            });
          }
          
          // Dodaj nove reference
          const productIdForChildren = existingProduct ? existingProduct.id : product!.id;
          for (const ref of references) {
            await db.productCrossReference.create({
              data: {
                productId: productIdForChildren,
                referenceType: ref.referenceType,
                referenceNumber: ref.referenceNumber,
                manufacturer: ref.manufacturer || undefined,
                notes: ref.notes || undefined,
                replacementId: ref.replacementId || undefined,
              },
            });
          }
        }

        results.success++;
        if (results.preview.length < 25) {
          results.preview.push({
            action: existingProduct ? 'update' : 'create',
            catalogNumber: validatedData.catalogNumber,
            name: validatedData.name,
            price: validatedData.price,
            purchasePrice: validatedData.purchasePrice ?? null,
            unitOfMeasure: validatedData.unitOfMeasure ?? null,
            sku: validatedData.sku ?? null,
            oemNumber: validatedData.oemNumber ?? null,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 jer je prvi red zaglavlje, a indeksi kreću od 0
          error: error instanceof Error ? error.message : 'Nepoznata greška',
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[PRODUCTS_IMPORT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
