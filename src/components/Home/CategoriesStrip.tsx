import Link from "next/link";
import Image from "next/image";
import { Box } from "lucide-react";

export interface CategoryLite {
  id: string;
  name: string;
}

export function CategoriesStrip({ categories }: { categories: CategoryLite[] }) {
  // Mapiranje slika na kategorije
  const getCategoryImage = (categoryName: string) => {
    const nameLc = categoryName.toLowerCase();
    if (nameLc.includes('putnič') || nameLc.includes('putnick')) {
      return '/images/putnička1.jpg';
    } else if (nameLc.includes('teret')) {
      return '/images/teretni-1.jpg';
    } else if (nameLc.includes('adr')) {
      return '/images/adr-1.jpg';
    } else if (nameLc.includes('autopraon')) {
      return '/images/autopraonice-1.jpg';
    }
    return null;
  };

  return (
    <section className="relative mb-16">
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl overflow-hidden">
        {/* Tekstura overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
            backgroundSize: '32px 32px, 100% 100%'
          }}
        />
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#FF6B35]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E85A28] to-[#FF6B35] shadow-lg">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-primary">Kategorije proizvoda</h3>
          </div>
          <p className="text-center text-slate-600 font-medium text-lg">Brzo pronađite ono što vam treba</p>
        </div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => {
              const categoryImage = getCategoryImage(category.name);
              
              return (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className="group relative isolate overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] h-48 sm:h-56"
                >
                  {/* Background Image */}
                  {categoryImage && (
                    <Image
                      src={categoryImage}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  
                  {/* Gradient Overlay - samo na dnu za čitljivost teksta */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent group-hover:from-primary-dark/90 group-hover:via-primary-dark/30 transition-all duration-300" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center">
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-2 drop-shadow-lg">
                      {category.name}
                    </h4>
                    <div className="w-12 h-1 bg-gradient-to-r from-[#E85A28] to-[#FF6B35] rounded-full opacity-0 group-hover:opacity-100 group-hover:w-20 transition-all duration-300" />
                  </div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Link>
              );
            })}
        </div>
      </div>
    </section>
  );
}
