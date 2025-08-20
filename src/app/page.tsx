import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, ShieldCheck, Wrench, Package, Search, ChevronRight, Star, Users, Award, Phone, MessageCircle, Mail, Zap, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/ProductCard';
import { DiscountCarousel } from '@/components/DiscountCarousel';
import { FeaturedBrands } from '@/components/FeaturedBrands';

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

const StatCard = ({ icon: Icon, number, label, trend }: { icon: React.ElementType, number: string, label: string, trend?: string }) => (
  <div className="group relative glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 border border-white/20 bg-white/5 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-br from-sunfire-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <div className="relative z-10 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-amber via-orange to-brown">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white group-hover:text-amber transition-colors duration-300">{number}</div>
        <div className="text-slate-400 text-sm">{label}</div>
        {trend && <div className="text-green-400 text-xs flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>}
      </div>
    </div>
  </div>
);

const QuickActionButton = ({ icon: Icon, text, href, variant = "primary" }: { icon: React.ElementType, text: string, href: string, variant?: "primary" | "secondary" | "accent" }) => {
  const baseClasses = "group relative flex items-center gap-3 px-6 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl";
  const variants = {
    primary: "bg-white text-brown hover:bg-white/90 shadow-lg",
    secondary: "bg-transparent border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60",
    accent: "bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg"
  };
  
  return (
    <Button asChild size="lg" className={cn(baseClasses, variants[variant])}>
      <Link href={href}>
        <Icon className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
        {text}
        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    </Button>
  );
};

const FloatingElement = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <div 
    className="absolute animate-pulse opacity-20 hover:opacity-40 transition-opacity duration-300"
    style={{ 
      animationDelay: `${delay}s`,
      animationDuration: '4s'
    }}
  >
    {children}
  </div>
);

const TestimonialCard = () => (
  <div className="relative glass-card rounded-2xl p-6 border border-white/20 bg-white/5 backdrop-blur-xl">
    <div className="flex items-center gap-1 mb-3">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber text-amber" />
      ))}
    </div>
    <p className="text-slate-300 text-sm mb-4 italic">
      "Odličan servis i brza dostava. Preporučujem svima koji traže kvalitetne autodijelove."
    </p>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber to-orange flex items-center justify-center">
        <span className="text-white font-bold text-sm">MJ</span>
      </div>
      <div>
        <div className="text-white font-medium text-sm">Marko Janković</div>
        <div className="text-slate-400 text-xs">Verifikovani kupac</div>
      </div>
    </div>
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
        
        {/* Enhanced Hero Section */}
        <section className="mb-32 relative">
          {/* Floating Elements */}
          <FloatingElement delay={0}>
            <div className="top-20 left-20 w-16 h-16 rounded-full bg-gradient-to-r from-amber to-orange blur-sm"></div>
          </FloatingElement>
          <FloatingElement delay={1}>
            <div className="top-40 right-32 w-12 h-12 rounded-full bg-gradient-to-r from-orange to-brown blur-sm"></div>
          </FloatingElement>
          <FloatingElement delay={2}>
            <div className="bottom-32 left-1/3 w-8 h-8 rounded-full bg-gradient-to-r from-brown to-amber blur-sm"></div>
          </FloatingElement>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Hero Block (8 cols) */}
            <div className="relative lg:col-span-8 rounded-3xl p-8 md:p-12 flex flex-col justify-between min-h-[600px] [box-shadow:0_0_60px_-15px_theme(colors.sunfire.400)] overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber via-orange to-brown opacity-90 -z-10 rounded-3xl"></div>
              <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10 -z-10 rounded-3xl"></div>
              
              {/* Animated overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent -z-10 rounded-3xl animate-pulse"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber text-amber" />
                    ))}
                  </div>
                  <span className="text-white/90 font-medium">4.9/5 • 1200+ zadovoljnih kupaca</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-md mb-6 leading-tight">
                  Vaš partner za{' '}
                  <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                    autodijelove
                  </span>.
                </h1>
                <p className="text-xl text-white/90 max-w-lg mb-8 leading-relaxed">
                  Vrhunska kvaliteta, stručna podrška i brza dostava. Sve što vašem vozilu treba - na jednom mjestu.
                </p>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                    <Award className="w-4 h-4 text-yellow-300" />
                    <span className="text-white text-sm font-medium">ISO 9001 Certified</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                    <Clock className="w-4 h-4 text-green-300" />
                    <span className="text-white text-sm font-medium">24h dostava</span>
                  </div>
                </div>
              </div>

              {/* Enhanced CTA Buttons */}
              <div className="relative z-10 flex flex-col sm:flex-row gap-4">
                <QuickActionButton icon={Search} text="Istraži proizvode" href="/products" variant="primary" />
                <QuickActionButton icon={Zap} text="Brza pretraga" href="/search" variant="secondary" />
                
                {/* Quick Contact */}
                <div className="flex gap-2">
                  <Button asChild size="lg" className="aspect-square p-0 bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 rounded-full">
                    <Link href="tel:+38761234567">
                      <Phone className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="aspect-square p-0 bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 rounded-full">
                    <Link href="mailto:info@omerbasic.ba">
                      <Mail className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="aspect-square p-0 bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 rounded-full">
                    <Link href="/contact">
                      <MessageCircle className="w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Sidebar (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Package} number="15,000+" label="Proizvoda" trend="+12% mjesečno" />
                <StatCard icon={Users} number="1,200+" label="Kupaca" trend="+25% godišnje" />
                <StatCard icon={Truck} number="98%" label="Na vrijeme" />
                <StatCard icon={Award} number="15+" label="Godina iskustva" />
              </div>

              {/* Compatibility Check */}
              <Link href="/products/vehicle-compatibility" className="group relative glass-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">Provjera kompatibilnosti</h3>
                  <p className="text-slate-400 text-sm">Pronađite dijelove koji odgovaraju vašem vozilu.</p>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-full p-3 group-hover:bg-gradient-to-r group-hover:from-amber group-hover:to-orange transition-all duration-300">
                    <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </Link>

              {/* Customer Testimonial */}
              <TestimonialCard />
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

        {/* Promotions Section - Bento Layout */}
        <section className="mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg">
              <DiscountCarousel />
            </div>
            <div className="flex flex-col gap-8">
              <Link href="/b2b" className="group relative block bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 h-full text-white hover:scale-105 transition-transform duration-300 shadow-lg">
                <h3 className="text-2xl font-bold mb-2">B2B Partnerstvo</h3>
                <p className="text-slate-300 mb-4">Posebne pogodnosti za poslovne korisnike.</p>
                <div className="flex items-center font-medium text-amber">
                  Saznaj više
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/contact" className="group relative block bg-gradient-to-br from-amber via-orange to-brown rounded-2xl p-8 h-full text-white hover:scale-105 transition-transform duration-300 shadow-lg">
                <h3 className="text-2xl font-bold mb-2">Trebate Pomoć?</h3>
                <p className="text-white/90 mb-4">Naš tim stručnjaka je tu za vas.</p>
                <div className="flex items-center font-medium">
                  Kontaktirajte nas
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
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

        {/* Featured Brands Section */}
        <FeaturedBrands />


      </div>
    </main>
  );
}
