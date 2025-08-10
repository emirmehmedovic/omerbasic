import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stringify } from 'csv-stringify/sync';

export async function GET(req: Request) {
  try {
    // Dohvati sve proizvode s njihovim relacijama
    const products = await db.product.findMany({
      include: {
        category: true,
        vehicleFitments: {
          include: {
            generation: {
              include: {
                model: {
                  include: {
                    brand: true
                  }
                }
              }
            },
            engine: true
          }
        },
        attributeValues: {
          include: {
            attribute: true
          }
        },
        originalReferences: true,
        replacementFor: true
      }
    });

    // Transformiraj podatke u format pogodan za CSV
    const csvData = products.map(product => {
      // Pripremi tehnicalSpecs i dimensions kao JSON string
      const technicalSpecs = product.technicalSpecs ? 
        JSON.stringify(product.technicalSpecs) : '';
      
      const dimensions = product.dimensions ? 
        JSON.stringify(product.dimensions) : '';
      
      // Pripremi standards kao string listu
      const standards = product.standards && product.standards.length > 0 ? 
        `[${product.standards.join(',')}]` : '';
      
      // Pripremi vehicleFitments kao JSON string
      const vehicleFitments = product.vehicleFitments.map(fitment => ({
        generationId: fitment.generationId,
        engineId: fitment.engineId,
        fitmentNotes: fitment.fitmentNotes,
        position: fitment.position,
        bodyStyles: fitment.bodyStyles,
        yearFrom: fitment.yearFrom,
        yearTo: fitment.yearTo,
        isUniversal: fitment.isUniversal,
        // Dodaj informacije o vozilu za lakšu identifikaciju pri importu
        vehicleInfo: {
          brand: fitment.generation.model.brand.name,
          model: fitment.generation.model.name,
          generation: fitment.generation.name,
          engine: fitment.engine ? 
            `${fitment.engine.engineType} ${fitment.engine.engineCapacity}ccm ${fitment.engine.enginePowerKW}kW` : null
        }
      }));

      // Pripremi attributeValues kao JSON string
      const attributeValues = product.attributeValues.map(av => ({
        attributeId: av.attributeId,
        value: av.value,
        // Dodaj informacije o atributu za lakšu identifikaciju pri importu
        attributeInfo: {
          name: av.attribute.name,
          label: av.attribute.label
        }
      }));

      // Pripremi crossReferences kao JSON string
      const crossReferences = [
        ...product.originalReferences.map(ref => ({
          referenceType: ref.referenceType,
          referenceNumber: ref.referenceNumber,
          manufacturer: ref.manufacturer,
          notes: ref.notes
        })),
        ...product.replacementFor.map(ref => ({
          referenceType: ref.referenceType,
          referenceNumber: ref.referenceNumber,
          manufacturer: ref.manufacturer,
          notes: ref.notes
        }))
      ];

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        imageUrl: product.imageUrl || '',
        stock: product.stock,
        catalogNumber: product.catalogNumber,
        oemNumber: product.oemNumber || '',
        isFeatured: product.isFeatured,
        isArchived: product.isArchived,
        categoryId: product.categoryId,
        technicalSpecs,
        dimensions,
        standards,
        vehicleFitments: JSON.stringify(vehicleFitments),
        attributeValues: JSON.stringify(attributeValues),
        crossReferences: JSON.stringify(crossReferences)
      };
    });

    // Generiraj CSV string
    const csvString = stringify(csvData, {
      header: true,
      columns: [
        'id', 'name', 'description', 'price', 'imageUrl', 'stock', 
        'catalogNumber', 'oemNumber', 'isFeatured', 'isArchived', 
        'categoryId', 'technicalSpecs', 'dimensions', 'standards', 
        'vehicleFitments', 'attributeValues', 'crossReferences'
      ]
    });

    // Postavi odgovarajuće headere za download CSV datoteke
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv; charset=utf-8');
    headers.append('Content-Disposition', 'attachment; filename=products.csv');

    return new NextResponse(csvString, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[PRODUCTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
