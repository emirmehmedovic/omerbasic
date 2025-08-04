import { db } from './db';
import { Category } from '@/generated/prisma/client';

// Definiramo tip koji uključuje kategoriju i njene pretke
export type CategoryWithAncestors = Category & {
  ancestors: Category[];
};

/**
 * Dohvaća kategoriju po ID-u i sve njene nadređene kategorije (pretke).
 * @param categoryId - ID kategorije za koju se traže preci.
 * @returns - Objekt koji sadrži traženu kategoriju i listu njenih predaka, ili null ako kategorija nije pronađena.
 */
export async function getCategoryWithAncestors(categoryId: string): Promise<CategoryWithAncestors | null> {
  const ancestors: Category[] = [];
  let currentId: string | null = categoryId;

  // Pronalazimo prvu, originalnu kategoriju
  const originalCategory = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!originalCategory) {
    return null; // Ako originalna kategorija ne postoji, vraćamo null
  }

  // Ako originalna kategorija ima roditelja, počinjemo petlju
  if (originalCategory.parentId) {
    currentId = originalCategory.parentId;

    while (currentId) {
      const parent: Category | null = await db.category.findUnique({
        where: { id: currentId },
      });

      if (parent) {
        ancestors.unshift(parent); // Dodajemo roditelja na početak liste
        currentId = parent.parentId;
      } else {
        currentId = null; // Prekidamo petlju ako roditelj nije pronađen
      }
    }
  }

  return { ...originalCategory, ancestors };
}
