import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { updateProductSchema } from '@/lib/validations/product';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Nakon ažuriranja fitmenata vratimo proizvod sa fitmentima radi provjere
    const productWithFitments = await db.product.findUnique({
      where: { id: productId },
      include: {
        vehicleFitments: {
          include: {
            generation: { include: { model: { include: { brand: true } } } },
            engine: true,
          }
        }
      }
    });

    // Pricing: featured override, otherwise B2B
    const session = await getServerSession(authOptions);
    const isB2B = (session as any)?.user?.role === 'B2B';
    const discountPercentage = isB2B ? ((session as any)?.user?.discountPercentage || 0) : 0;

    const base = (productWithFitments ?? product)! as any;
    let priced = base;
    try {
      const f = await db.featuredProduct.findFirst({ where: { productId, isActive: true } });
      const now = new Date();
      if (f && (f as any).isDiscountActive) {
        const startsAt = (f as any).startsAt;
        const endsAt = (f as any).endsAt;
        const notStarted = startsAt && now < new Date(startsAt);
        const expired = endsAt && now > new Date(endsAt);
        const discountType = (f as any).discountType;
        const discountValue = (f as any).discountValue;
        if (!notStarted && !expired && discountType && discountValue && discountValue > 0) {
          let newPrice = base.price as number;
          if (discountType === 'PERCENTAGE') newPrice = base.price * (1 - discountValue / 100);
          else if (discountType === 'FIXED') newPrice = base.price - discountValue;
          newPrice = Math.max(newPrice, 0);
          priced = { ...base, originalPrice: base.price, price: parseFloat(newPrice.toFixed(2)), pricingSource: 'FEATURED' };
        }
      }
    } catch {}
    if (priced === base && isB2B && discountPercentage > 0) {
      const newPrice = parseFloat((base.price * (1 - discountPercentage / 100)).toFixed(2));
      priced = { ...base, originalPrice: base.price, price: newPrice, pricingSource: 'B2B' };
    }

    return NextResponse.json(priced);
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

    // Debug log za generationIds
    try { console.log('[PRODUCT_PATCH] generationIds:', generationIds); } catch {}

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
    
    // Ako su dostavljeni generationIds, ažuriramo ProductVehicleFitment zapise (podržava genId ili genId-engineId)
    if (generationIds !== undefined) {
      try {
        // Prvo obrišemo sve postojeće ProductVehicleFitment zapise za ovaj proizvod
        await db.productVehicleFitment.deleteMany({
          where: { productId }
        });
        
        // Zatim kreiramo nove ProductVehicleFitment zapise za svaki generationId
        if (generationIds && generationIds.length > 0) {
          for (const composite of generationIds) {
            let generationId = String(composite);
            let engineId: string | undefined;
            if (String(composite).includes('::')) {
              [generationId, engineId] = String(composite).split('::');
            } else if (String(composite).includes('-')) {
              [generationId, engineId] = String(composite).split('-');
            }
            await db.productVehicleFitment.create({
              data: {
                productId,
                generationId,
                engineId: engineId || null,
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

    try { revalidateTag('products'); } catch {}
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
    try { revalidateTag('products'); revalidateTag('categories'); } catch {}
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[PRODUCT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
