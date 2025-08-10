import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateProductSchema } from '@/lib/validations/product';
import { z } from 'zod';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { 
        category: true,
        vehicleFitments: {
          include: {
            generation: {
              include: {
                model: {
                  include: {
                    brand: true,
                  },
                },
              },
            },
            engine: true,
          },
        },
        attributeValues: {
          include: {
            attribute: true,
          },
        },
        originalReferences: true,
        replacementFor: true,
      },
    });

    if (!product) {
      return new NextResponse('Proizvod nije pronađen', { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('[PRODUCT_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await req.json();

    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.flatten()), { status: 400 });
    }

    const { 
      generationIds,
      categoryAttributes,
      weight,
      width,
      height,
      length,
      yearOfManufacture,
      vehicleBrand,
      vehicleModel,
      engineType,
      unitOfMeasure,
      ...otherData 
    } = validation.data;

    // Pripremamo dimensions JSON objekt ako su dostavljene dimenzije
    const dimensionsUpdate = (weight !== undefined || width !== undefined || height !== undefined || length !== undefined) ? {
      dimensions: {
        weight: weight ?? undefined,
        width: width ?? undefined,
        height: height ?? undefined,
        length: length ?? undefined
      }
    } : {};
    
    // Pripremamo technicalSpecs JSON objekt ako su dostavljene tehničke specifikacije
    const techSpecsUpdate = (yearOfManufacture !== undefined || vehicleBrand !== undefined || 
                            vehicleModel !== undefined || engineType !== undefined || unitOfMeasure !== undefined) ? {
      technicalSpecs: {
        yearOfManufacture: yearOfManufacture ?? undefined,
        vehicleBrand: vehicleBrand ?? undefined,
        vehicleModel: vehicleModel ?? undefined,
        engineType: engineType ?? undefined,
        unitOfMeasure: unitOfMeasure ?? undefined
      }
    } : {};

    // Ne koristimo direktnu vezu s vehicleGenerations, već ProductVehicleFitment model
    const vehicleUpdate = {}; // Prazno, jer ćemo ažurirati ProductVehicleFitment zapise nakon ažuriranja proizvoda

    // Ažuriramo proizvod
    const product = await db.product.update({
      where: { id: productId },
      data: {
        ...otherData,
        ...dimensionsUpdate,
        ...techSpecsUpdate,
        ...vehicleUpdate
      },
    });
    
    // Ako su dostavljeni generationIds, ažuriramo ProductVehicleFitment zapise
    if (generationIds !== undefined) {
      try {
        // Prvo obrišemo sve postojeće ProductVehicleFitment zapise za ovaj proizvod
        await db.productVehicleFitment.deleteMany({
          where: { productId }
        });
        
        // Zatim kreiramo nove ProductVehicleFitment zapise za svaki generationId
        if (generationIds && generationIds.length > 0) {
          for (const generationId of generationIds) {
            await db.productVehicleFitment.create({
              data: {
                productId,
                generationId,
                isUniversal: false
              }
            });
          }
        }
      } catch (error) {
        console.error('Error updating product vehicle fitments:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri ažuriranju fitment zapisa
      }
    }

    // Ako postoje dinamički atributi kategorije, ažuriramo ih
    if (categoryAttributes && Object.keys(categoryAttributes).length > 0) {
      try {
        // Dohvatimo sve atribute kategorije
        const categoryAttrs = await db.categoryAttribute.findMany({
          where: { categoryId: product.categoryId }
        });
        
        // Dohvatimo postojeće vrijednosti atributa za ovaj proizvod
        const existingAttrValues = await db.productAttributeValue.findMany({
          where: { productId }
        });
        
        // Za svaki atribut u categoryAttributes, ažuriramo ili kreiramo zapis
        for (const [attrName, attrValue] of Object.entries(categoryAttributes)) {
          // Pronađi atribut kategorije po imenu
          const attribute = categoryAttrs.find(attr => attr.name === attrName);
          
          if (attribute) {
            // Pronađi postojeću vrijednost atributa
            const existingValue = existingAttrValues.find(v => v.attributeId === attribute.id);
            
            if (existingValue) {
              // Ažuriraj postojeću vrijednost
              await db.productAttributeValue.update({
                where: { id: existingValue.id },
                data: { value: attrValue || '' }
              });
            } else if (attrValue) {
              // Kreiraj novu vrijednost
              await db.productAttributeValue.create({
                data: {
                  value: attrValue,
                  productId,
                  attributeId: attribute.id
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating product attribute values:', error);
        // Ne prekidamo izvršavanje ako dođe do greške pri ažuriranju atributa
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error('[PRODUCT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    await db.product.delete({
      where: { id: productId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[PRODUCT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
