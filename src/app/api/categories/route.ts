import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { categoryFormSchema } from '@/lib/validations/category';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        children: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, parentId } = categoryFormSchema.parse(body);

    // Check if a category with the same name and same parent already exists
    const existingCategory = await db.category.findFirst({
      where: {
        name: name,
        parentId: parentId,
      },
    });

    if (existingCategory) {
      return new NextResponse('Kategorija s ovim imenom već postoji unutar iste nadređene kategorije.', { status: 409 });
    }

    const category = await db.category.create({
      data: {
        name,
        parentId,
      },
    });
    try {
      revalidateTag('categories');
      revalidateTag('products'); // UIs may display counts per category
    } catch {}
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
