'use client';

import { useMemo, useState } from 'react';
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
  _count?: {
    products: number;
  };
};

type CategoryManagerProps = {
  initialCategories: CategoryWithChildren[];
};



export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryWithChildren[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

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

  const openModalForNew = (parentId?: string) => {
    setEditingCategory(null);
    reset({ name: '', parentId: parentId ?? '' });
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

  // Funkcija za brojanje svih kategorija (rekurzivno)
  const countAllCategories = (cats: CategoryWithChildren[]): number => {
    return cats.reduce((total, cat) => {
      return total + 1 + (cat.children ? countAllCategories(cat.children) : 0);
    }, 0);
  };

  const totalCategories = countAllCategories(categories);
  const displayedCategories = showAllCategories ? categories : topLevelCategories;

  // Flatten all categories for the parent selector with indentation by level
  type FlatCategory = { id: string; name: string; level: number };
  const flattenCategories = (cats: CategoryWithChildren[], level = 0): FlatCategory[] => {
    const result: FlatCategory[] = [];
    for (const c of cats) {
      result.push({ id: c.id, name: c.name, level });
      if (c.children && c.children.length > 0) {
        result.push(...flattenCategories(c.children, level + 1));
      }
    }
    return result;
  };

  const flattenedForSelect = useMemo(() => flattenCategories(topLevelCategories), [categories]);

  return (
    <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm">
      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Kategorije ({showAllCategories ? totalCategories : topLevelCategories.length})
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAllCategories(!showAllCategories)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                  showAllCategories 
                    ? 'bg-gradient-to-r from-amber via-orange to-brown text-white shadow-sm' 
                    : 'bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 border border-amber/30 hover:border-amber/50'
                }`}
              >
                {showAllCategories ? 'Samo glavne' : 'Sve kategorije'}
              </button>
              <span className="text-xs text-gray-500">
                {showAllCategories ? `${topLevelCategories.length} glavnih, ${totalCategories - topLevelCategories.length} podkategorija` : `${totalCategories} ukupno`}
              </span>
            </div>
          </div>
          <button 
            onClick={() => openModalForNew()} 
            className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Dodaj novu kategoriju
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-2">
          {displayedCategories.map(category => (
            <CategoryItem 
              key={category.id} 
              category={category} 
              onEdit={openModalForEdit} 
              onDelete={onDelete} 
              onAddSubcategory={openModalForNew}
              level={0} 
            />
          ))}
        </div>
        
        {displayedCategories.length === 0 && (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
                <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Nema kategorija</p>
              <p className="text-gray-500 text-sm">Dodajte prvu kategoriju da počnete organizaciju</p>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {editingCategory ? 'Uredi kategoriju' : 'Dodaj novu kategoriju'}
              </h2>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Naziv kategorije</label>
                <input 
                  {...register('name')} 
                  id="name" 
                  className="w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500 px-3 py-2" 
                  placeholder="Unesite naziv kategorije"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-2">Nadređena kategorija</label>
                <select 
                  {...register('parentId')} 
                  id="parentId" 
                  className="w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                >
                  <option value="">-- Nema nadređene kategorije --</option>
                  {flattenedForSelect.map(cat => (
                    <option key={cat.id} value={cat.id} disabled={cat.id === editingCategory?.id}>
                      {`${'— '.repeat(cat.level)}${cat.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm px-4 py-2"
                >
                  Odustani
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100"
                >
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
function CategoryItem({ category, onEdit, onDelete, onAddSubcategory, level }: {
  category: CategoryWithChildren;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (id: string) => void;
  onAddSubcategory: (parentId?: string) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="flex flex-col">
      <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/10 hover:border-amber/30 hover:bg-gradient-to-r hover:from-white hover:to-gray-50 transition-all duration-200 ${hasChildren ? 'hover:shadow-md' : ''}`}>
        <div 
          className={`flex items-center flex-1 ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }} 
              className="p-1 rounded-full hover:bg-sunfire/10 transition-colors text-sunfire-600"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 mr-1"></div> // Placeholder for alignment
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-medium">{category.name}</span>
            <div className="flex items-center gap-1">
              {category._count && category._count.products > 0 && (
                <span 
                  className="px-2 py-1 text-xs rounded-full font-medium border shadow-sm"
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderColor: '#3b82f6'
                  }}
                >
                  {category._count.products} proizvoda
                </span>
              )}
              {hasChildren && (
                <span 
                  className="px-2 py-1 text-xs rounded-full font-medium border shadow-sm"
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderColor: '#f59e0b'
                  }}
                >
                  {category.children?.length} podkategorija
                </span>
              )}
              {hasChildren && (
                <span className="text-xs text-gray-400 ml-1">
                  (klikni za proširenje)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onEdit(category)} 
            className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-200"
          >
            Uredi
          </button>
          <button
            onClick={() => onAddSubcategory(category.id)}
            className="text-sm bg-gradient-to-r from-amber/90 via-orange/90 to-brown/90 text-white hover:from-amber hover:via-orange hover:to-brown px-2 py-1 rounded-lg transition-all duration-200 shadow-sm"
          >
            Dodaj podkategoriju
          </button>
          <Link
            href={`/admin/categories/${category.id}/assign-products`}
            className="text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-lg transition-all duration-200"
          >
            Poveži proizvode
          </Link>
          <button 
            onClick={() => onDelete(category.id)} 
            className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition-all duration-200"
          >
            Obriši
          </button>
          <Link 
            href={`/admin/categories/${category.id}/attributes`} 
            className="text-sm text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition-all duration-200 flex items-center"
          >
            <Settings className="h-3 w-3 mr-1" /> Atributi
          </Link>
        </div>
      </div>
      {isOpen && (
        <div className="mt-2 space-y-2 ml-4">
          {category.children?.map(child => (
            <CategoryItem key={child.id} category={child} onEdit={onEdit} onDelete={onDelete} onAddSubcategory={onAddSubcategory} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
