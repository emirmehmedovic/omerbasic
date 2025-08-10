import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }>}
) {
  try {
    const { categoryId } = await params;

    // Provjera je li categoryId validan
    if (!categoryId) {
      return new NextResponse('Category ID is required', { status: 400 });
    }

    // Dohvati sve proizvode u kategoriji
    const products = await db.product.findMany({
      where: {
        categoryId,
        technicalSpecs: {
          not: {
            equals: null
          }
        }
      },
      select: {
        technicalSpecs: true
      }
    });

    // Izvuci jedinstvene specifikacije iz svih proizvoda
    const allSpecs: Record<string, Set<string>> = {};
    
    products.forEach(product => {
      if (product.technicalSpecs) {
        const specs = product.technicalSpecs as Record<string, any>;
        
        Object.entries(specs).forEach(([key, value]) => {
          if (!allSpecs[key]) {
            allSpecs[key] = new Set();
          }
          
          // Ako je vrijednost array, dodaj sve vrijednosti
          if (Array.isArray(value)) {
            value.forEach(v => allSpecs[key].add(String(v)));
          } else {
            allSpecs[key].add(String(value));
          }
        });
      }
    });

    // Pretvori Set u Array za JSON odgovor
    const result: Record<string, string[]> = {};
    Object.entries(allSpecs).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet);
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CATEGORY_SPECS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
