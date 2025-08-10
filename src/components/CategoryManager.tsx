'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { categoryFormSchema } from '@/lib/validations/category';
import type { Category as PrismaCategory } from '@/generated/prisma/client';

// Proširujemo tip da uključuje djecu za rekurzivni prikaz
export type CategoryWithChildren = PrismaCategory & {
  children?: CategoryWithChildren[];
};

type CategoryManagerProps = {
  initialCategories: CategoryWithChildren[];
};



export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryWithChildren[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);

            // Tip za podatke kakvi dolaze iz forme (prije transformacije)
  type CategoryFormInput = z.input<typeof categoryFormSchema>;
  // Tip za podatke nakon Zod validacije i transformacije
  type CategoryFormOutput = z.output<typeof categoryFormSchema>;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      parentId: '',
    },
  });

  const openModalForNew = () => {
    setEditingCategory(null);
    reset({ name: '', parentId: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = (category: CategoryWithChildren) => {
    setEditingCategory(category);
    reset({ name: category.name, parentId: category.parentId ?? '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const refreshCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast.error('Greška pri osvježavanju kategorija.');
    }
  };

            const onSave = async (data: CategoryFormOutput) => {
    const apiEndpoint = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Došlo je do greške.');
      }

      toast.success(`Kategorija uspješno ${editingCategory ? 'ažurirana' : 'kreirana'}.`);
      await refreshCategories();
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const onDelete = async (categoryId: string) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovu kategoriju?')) return;

    try {
      const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Greška pri brisanju.');
      }
      toast.success('Kategorija obrisana.');
      await refreshCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filtriramo samo top-level kategorije za početni render
  const topLevelCategories = categories.filter(c => !c.parentId);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Upravljanje kategorijama</h1>
        <button onClick={openModalForNew} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
          Dodaj novu kategoriju
        </button>
      </div>

      <div className="space-y-2">
        {topLevelCategories.map(category => (
          <CategoryItem 
            key={category.id} 
            category={category} 
            onEdit={openModalForEdit} 
            onDelete={onDelete} 
            level={0} 
          />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingCategory ? 'Uredi kategoriju' : 'Dodaj novu kategoriju'}</h2>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Naziv</label>
                <input {...register('name')} id="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Nadređena kategorija</label>
                <select {...register('parentId')} id="parentId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="">-- Nema nadređene --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} disabled={cat.id === editingCategory?.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Odustani</button>
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Spremanje...' : 'Spremi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Pomoćna rekurzivna komponenta za prikaz stavke stabla
function CategoryItem({ category, onEdit, onDelete, level }: {
  category: CategoryWithChildren;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (id: string) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="flex flex-col">
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
        <div className="flex items-center">
          {hasChildren ? (
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 mr-1"></div> // Placeholder for alignment
          )}
          <span className="ml-1">{category.name}</span>
        </div>
        <div className="space-x-2">
          <button onClick={() => onEdit(category)} className="text-sm text-blue-600 hover:underline">Uredi</button>
          <button onClick={() => onDelete(category.id)} className="text-sm text-red-600 hover:underline">Obriši</button>
          <Link href={`/admin/categories/${category.id}/attributes`} className="text-sm text-green-600 hover:underline flex items-center">
            <Settings className="h-3 w-3 mr-1" /> Atributi
          </Link>
        </div>
      </div>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {category.children?.map(child => (
            <CategoryItem key={child.id} category={child} onEdit={onEdit} onDelete={onDelete} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
