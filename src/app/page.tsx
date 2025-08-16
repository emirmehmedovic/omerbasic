import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, ShieldCheck, Wrench, Package, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/ProductCard';

const MAIN_CATEGORIES = ["Teretna vozila", "Putnička vozila", "ADR oprema", "Autopraonice"];

async function getMainCategories() {
  return db.category.findMany({
    where: {
      name: { in: MAIN_CATEGORIES }
    },
  });
}

async function getLatestProducts() {
  return db.product.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });
}

const TrustBadge = ({ icon: Icon, text }: { icon: React.ElementType, text: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
    <div className="p-2 rounded-full bg-accent-gradient">
      <Icon className="h-5 w-5 text-white" />
    </div>
    <span className="font-medium text-slate-800">{text}</span>
  </div>
);

const MainCategoryCard = ({ category, imageUrl }: { category: { id: string; name: string }, imageUrl: string }) => {
  // Određivanje pozadinske boje na temelju imena kategorije
  const getBgGradient = (name: string) => {
    switch(name) {
      case "Teretna vozila": return "from-blue-600/80 via-blue-800/70 to-slate-900/90";
      case "Putnička vozila": return "from-amber/80 via-orange/70 to-brown/90";
      case "ADR oprema": return "from-red-500/80 via-red-700/70 to-red-900/90";
      case "Autopraonice": return "from-cyan-500/80 via-blue-600/70 to-indigo-900/90";
      default: return "from-slate-700/80 via-slate-800/70 to-slate-900/90";
    }
  };

  return (
    <Link 
      href={`/products?categoryId=${category.id}`}
      className="group relative h-80 rounded-3xl shadow-xl transition-all duration-500 ease-in-out hover:shadow-2xl overflow-hidden"
    >
      {/* Pozadinska slika s overlay efektom */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image 
          src={imageUrl} 
          alt={category.name}
          fill
          className="object-cover scale-110 transition-all duration-700 ease-in-out group-hover:scale-125 group-hover:rotate-2"
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${getBgGradient(category.name)} opacity-90 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-95`}></div>
      </div>

      {/* Dekorativni elementi */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-10">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"></div>
      </div>

      {/* Ikona kategorije */}
      <div className="absolute top-6 right-6 z-20">
        <div className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg transform rotate-0 group-hover:rotate-12 transition-all duration-500">
          <div className="absolute inset-0 bg-accent-gradient opacity-0 group-hover:opacity-90 transition-opacity duration-500"></div>
          {category.name === "Teretna vozila" && <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m1.5-9H17V12h4.46L19.5 9.5M6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5M20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3M3 6v9h.76c.55-.61 1.35-1 2.24-1 .89 0 1.69.39 2.24 1H15V6H3z" /></svg>}
          {category.name === "Putnička vozila" && <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M5 11l1.5-4.5h11L19 11m-1.5 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m-11 0c.83 0 1.5-.67 1.5-1.5S8.33 13 7.5 13 6 13.67 6 14.5 6.67 16 7.5 16M18.92 6c-.2-.58-.76-1-1.42-1h-11c-.66 0-1.22.42-1.42 1L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-6z" /></svg>}
          {category.name === "ADR oprema" && <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 10L4 4v8l8 2 8-2V4l-8 6z" /><path d="M4 12v8l8-2 8 2v-8l-8-2-8 2z" /></svg>}
          {category.name === "Autopraonice" && <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3.77l7.11 12.96c.38.69-.11 1.56-.89 1.56H5.78c-.78 0-1.28-.87-.89-1.56L12 3.77M12 .69L3 17.69c-.92 1.67.33 3.73 2.22 3.73h15.56c1.89 0 3.14-2.06 2.22-3.73L12 .69z" /><path d="M12 16c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" /></svg>}
        </div>
      </div>

      {/* Sadržaj kartice */}
      <div className="absolute inset-x-0 bottom-0 p-6 z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-xl transition-all duration-500 group-hover:bg-white/20 group-hover:border-white/30">
          <h3 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">{category.name}</h3>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center text-white/90 font-medium group-hover:text-amber transition-colors duration-300">
              <span>Pregledaj proizvode</span>
              <ChevronRight className="h-5 w-5 ml-1 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
            
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default async function HomePage() {
  const [mainCategories, latestProducts] = await Promise.all([
    getMainCategories(),
    getLatestProducts(),
  ]);

  // Mapiranje slika na kategorije - koristite stvarne URL-ove slika ovdje
  const categoryImages: { [key: string]: string } = {
    "Teretna vozila": "/images/teretna.jpg",
    "Putnička vozila": "/images/putnicka.jpg",
    "ADR oprema": "/images/adr.jpg",
    "Autopraonice": "/images/autopraonice.jpg",
  };

  return (
    <main className="bg-app font-sans min-h-screen">
      {/* Decorative elements */}
      <div className="fixed top-20 left-20 w-72 h-72 bg-amber/20 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-orange/10 rounded-full blur-3xl -z-10"></div>
      <div className="fixed top-1/2 left-1/3 w-64 h-64 bg-brown/10 rounded-full blur-3xl -z-10"></div>
      
      <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
        
        {/* Hero Section - Two Column Layout */}
        <section className="mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Left Main Block (70%) */}
            <div className="relative lg:col-span-7 rounded-3xl p-8 md:p-12 flex flex-col justify-between overflow-hidden h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-r from-amber via-orange to-brown opacity-90 -z-10"></div>
              <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10 -z-10"></div>
              
              <div className="relative z-10">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white drop-shadow-md">
                  Vaš partner za autodijelove.
                </h1>
                <p className="mt-4 text-lg text-white/90 max-w-md">
                  Vrhunska kvaliteta, stručna podrška i brza dostava. Sve što vašem vozilu treba.
                </p>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-brown hover:bg-white/90 rounded-full px-8 py-6 text-base font-semibold shadow-lg">
                  <Link href="/products">Istraži proizvode</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="bg-transparent border-white/40 text-white hover:bg-white/10 rounded-full px-8 py-6 text-base font-semibold">
                  <Link href="/search" className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Pretraži
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column (30%) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Right Top Block */}
              <Link href="/products/vehicle-compatibility" className="group relative glass-card rounded-3xl p-8 flex flex-col justify-between overflow-hidden flex-1">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Provjera kompatibilnosti</h2>
                  <p className="text-slate-400 mt-2">Pronađite dijelove koji odgovaraju vašem vozilu.</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-full p-3 group-hover:bg-sunfire-a40 transition-colors">
                    <ArrowRight className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>

              {/* Right Bottom Block */}
              <Link href="/#trust-bar" className="group relative glass-card rounded-3xl p-8 flex flex-col justify-between overflow-hidden flex-1">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Pouzdanost i podrška</h2>
                  <p className="text-slate-400 mt-2">Brza dostava, sigurna kupovina i stručna pomoć.</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-full p-3 group-hover:bg-sunfire-a40 transition-colors">
                    <ArrowRight className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Main Categories Section */}
        <section className="mb-32">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Kategorije</h2>
            <Button asChild variant="ghost" className="text-orange hover:text-brown hover:bg-orange/5">
              <Link href="/products" className="flex items-center gap-1">
                Sve kategorije
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {mainCategories.map((category) => (
              <MainCategoryCard 
                key={category.id} 
                category={category} 
                imageUrl={categoryImages[category.name] || '/images/placeholder.jpg'} 
              />
            ))}
          </div>
        </section>

        {/* Latest Products Section */}
        <section className="relative">
          <div className="absolute inset-0 -mx-4 bg-gradient-to-t from-black/60 to-transparent rounded-3xl border border-sunfire-500/30 shadow-lg shadow-sunfire-500/10 -z-10"></div>
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-bold tracking-tight text-white">Najnovije u ponudi</h2>
              <Button asChild variant="ghost" className="text-orange hover:text-brown hover:bg-orange/5">
                <Link href="/products" className="flex items-center gap-1">
                  Svi proizvodi
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {latestProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="mb-16 mt-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustBadge icon={Truck} text="Brza dostava" />
            <TrustBadge icon={ShieldCheck} text="Sigurna kupovina" />
            <TrustBadge icon={Wrench} text="Stručna podrška" />
            <TrustBadge icon={Package} text="Originalni dijelovi" />
          </div>
        </section>

      </div>
    </main>
  );
}
