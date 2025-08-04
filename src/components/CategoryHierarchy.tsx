'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  iconUrl?: string | null;
  children: Category[];
}

interface CategoryHierarchyProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategoryId?: string;
}

export default function CategoryHierarchy({ onCategorySelect, selectedCategoryId }: CategoryHierarchyProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Dohvat kategorija
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories/hierarchy');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        console.log('Categories data:', data); // Debug
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCategories();
  }, []);

  // Funkcija za proširivanje/skupljanje kategorije
  const toggleExpand = (categoryId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Spriječi da se aktivira onCategorySelect
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Loading stanje
  if (loading) {
    return (
      <div className="category-hierarchy">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
          <h3 className="font-medium text-slate-700">Kategorije</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-slate-200/50 rounded-xl w-24 inline-block mr-2"></div>
          ))}
        </div>
      </div>
    );
  }

  // Ako nema kategorija
  if (categories.length === 0) {
    return (
      <div className="category-hierarchy">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
          <h3 className="font-medium text-slate-700">Kategorije</h3>
        </div>
        <p className="text-sm text-slate-500">Nema dostupnih kategorija</p>
      </div>
    );
  }

  // Filtriramo glavne kategorije (one bez parentId)
  const mainCategories = categories.filter(cat => cat.parentId === null);
  console.log('Main categories:', mainCategories); // Debug
  
  return (
    <div className="category-hierarchy">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <h3 className="font-medium text-slate-700">Kategorije</h3>
        <button 
          onClick={() => onCategorySelect('')}
          className="text-xs text-orange hover:text-brown transition-colors"
        >
          Prikaži sve
        </button>
      </div>
      
      {/* Prikaz glavnih kategorija */}
      <div className="flex flex-wrap gap-2 mb-4">
        {mainCategories.map(category => {
          const isSelected = category.id === selectedCategoryId;
          const isExpanded = expandedCategories[category.id] || false;
          const hasChildren = category.children && category.children.length > 0;
          
          return (
            <div key={category.id} className="inline-block mb-3 mr-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCategorySelect(category.id)}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${isSelected 
                    ? 'bg-gradient-to-r from-orange to-brown text-white shadow-md' 
                    : 'bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm hover:shadow'}`}
                >
                  {category.name}
                </button>
                
                {hasChildren && (
                  <button 
                    onClick={(e) => toggleExpand(category.id, e)}
                    className="p-1 rounded-full bg-white/70 hover:bg-white/90 shadow-sm"
                  >
                    {isExpanded ? 
                      <ChevronDown className="h-4 w-4 text-slate-600" /> : 
                      <ChevronRight className="h-4 w-4 text-slate-600" />}
                  </button>
                )}
              </div>
              
              {/* Podkategorije */}
              {isExpanded && hasChildren && (
                <div className="mt-2 ml-4 pl-2 border-l-2 border-orange/20">
                  <div className="flex flex-wrap gap-2">
                    {category.children.map(subCategory => (
                      <button
                        key={subCategory.id}
                        onClick={() => onCategorySelect(subCategory.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${subCategory.id === selectedCategoryId 
                          ? 'bg-gradient-to-r from-orange/20 to-brown/20 text-slate-800 font-medium' 
                          : 'bg-white/50 hover:bg-white/80'}`}
                      >
                        {subCategory.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
