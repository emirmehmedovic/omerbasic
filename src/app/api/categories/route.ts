import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { categoryFormSchema } from '@/lib/validations/category';

export async function GET() {
  try {
    const flatCategories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    type CategoryWithChildren = (typeof flatCategories)[number] & { children: CategoryWithChildren[] };

    const byId = new Map<string, CategoryWithChildren>();
    flatCategories.forEach((category) => {
      byId.set(category.id, { ...category, children: [] });
    });

    const roots: CategoryWithChildren[] = [];

    byId.forEach((category) => {
      if (category.parentId) {
        const parent = byId.get(category.parentId);
        if (parent) {
          parent.children = [...parent.children, category];
        } else {
          roots.push(category);
        }
      } else {
        roots.push(category);
      }
    });

    const sortChildrenRecursively = (categories: CategoryWithChildren[]) => {
      categories.sort((a, b) => a.name.localeCompare(b.name));
      categories.forEach((category) => {
        if (category.children.length > 0) {
          sortChildrenRecursively(category.children);
        }
      });
    };

    sortChildrenRecursively(roots);

    return NextResponse.json(roots);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, parentId, imageUrl } = categoryFormSchema.parse(body);

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
        imageUrl: imageUrl ?? null,
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
