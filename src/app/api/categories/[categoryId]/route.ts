import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/lib/db';
import { updateCategorySchema } from '@/lib/validations/category';

interface IParams {
  params: {
    categoryId: string;
  };
}

export async function PATCH(req: Request, { params }: IParams) {
  try {
    const { categoryId } = params;
    const body = await req.json();

    const { name, parentId } = updateCategorySchema.parse(body);

    // Prevent a category from being its own parent
    if (parentId === categoryId) {
      return new NextResponse('Kategorija ne može biti sama sebi nadređena.', { status: 400 });
    }

    // Check for duplicates with the new parent
    if (name) {
        const existingCategory = await db.category.findFirst({
            where: {
                name: name,
                parentId: parentId === undefined ? null : parentId, // Handle case where parentId is not being changed
                NOT: {
                    id: categoryId,
                },
            },
        });

        if (existingCategory) {
            return new NextResponse('Kategorija s ovim imenom već postoji unutar iste nadređene kategorije.', { status: 409 });
        }
    }

    const category = await db.category.update({
      where: { id: categoryId },
      data: {
        name,
        parentId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    console.error('[CATEGORY_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: IParams) {
  try {
    const { categoryId } = params;

    // Optional: Check if the category has products associated with it
    const categoryWithProducts = await db.category.findUnique({
        where: { id: categoryId },
        include: { products: true, children: true },
    });

    if (!categoryWithProducts) {
        return new NextResponse('Kategorija nije pronađena.', { status: 404 });
    }

    if (categoryWithProducts.products.length > 0) {
        return new NextResponse('Ne možete obrisati kategoriju koja sadrži proizvode.', { status: 400 });
    }

    if (categoryWithProducts.children.length > 0) {
        return new NextResponse('Ne možete obrisati kategoriju koja ima podkategorije.', { status: 400 });
    }

    await db.category.delete({
      where: { id: categoryId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[CATEGORY_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
