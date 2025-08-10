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

    // Parsiraj CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

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
    };

    // Obradi svaki red
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
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
          technicalSpecs: validatedData.technicalSpecs ? JSON.parse(validatedData.technicalSpecs) : undefined,
          dimensions: validatedData.dimensions ? JSON.parse(validatedData.dimensions) : undefined,
          standards: validatedData.standards ? 
            JSON.parse(validatedData.standards.replace(/^\[(.*)\]$/, '[$1]').replace(/'/g, '"')) : [],
        };

        // Kreiraj ili ažuriraj proizvod
        let product;
        if (existingProduct) {
          product = await db.product.update({
            where: { id: existingProduct.id },
            data: productData,
          });
          results.updated.push(product.catalogNumber);
        } else {
          product = await db.product.create({
            data: productData,
          });
          results.created.push(product.catalogNumber);
        }

        // Obradi vehicleFitments ako postoje
        if (validatedData.vehicleFitments) {
          const fitments = JSON.parse(validatedData.vehicleFitments);
          
          // Prvo obriši postojeće fitmente za ovaj proizvod
          if (existingProduct) {
            await db.productVehicleFitment.deleteMany({
              where: { productId: product.id },
            });
          }
          
          // Dodaj nove fitmente
          for (const fitment of fitments) {
            await db.productVehicleFitment.create({
              data: {
                productId: product.id,
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
        if (validatedData.attributeValues) {
          const attributes = JSON.parse(validatedData.attributeValues);
          
          // Prvo obriši postojeće vrijednosti atributa za ovaj proizvod
          if (existingProduct) {
            await db.productAttributeValue.deleteMany({
              where: { productId: product.id },
            });
          }
          
          // Dodaj nove vrijednosti atributa
          for (const attr of attributes) {
            await db.productAttributeValue.create({
              data: {
                productId: product.id,
                attributeId: attr.attributeId,
                value: attr.value,
              },
            });
          }
        }

        // Obradi crossReferences ako postoje
        if (validatedData.crossReferences) {
          const references = JSON.parse(validatedData.crossReferences);
          
          // Prvo obriši postojeće reference za ovaj proizvod
          if (existingProduct) {
            await db.productCrossReference.deleteMany({
              where: { productId: product.id },
            });
          }
          
          // Dodaj nove reference
          for (const ref of references) {
            await db.productCrossReference.create({
              data: {
                productId: product.id,
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
