import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Category } from '@/generated/prisma/client';

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

export async function GET() {
  try {
    // Dohvati sve kategorije
    const allCategories = await db.category.findMany({
      include: {
        children: true,
      },
    });

    // Organiziraj kategorije u hijerarhiju
    const rootCategories = allCategories.filter(cat => cat.parentId === null);
    
    // Funkcija za rekurzivno građenje hijerarhije
    const buildHierarchy = (categories: Category[]): CategoryWithChildren[] => {
      return categories.map(category => {
        const children = allCategories.filter(c => c.parentId === category.id);
        
        return {
          ...category,
          children: children.length > 0 ? buildHierarchy(children) : []
        };
      });
    };

    const categoryHierarchy = buildHierarchy(rootCategories);

    return NextResponse.json(categoryHierarchy);
  } catch (error) {
    console.error('[CATEGORY_HIERARCHY_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
