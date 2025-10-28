import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  ArrowRight,
  Car,
  Truck,
  Shield,
  Wrench
} from 'lucide-react';

const Footer = () => {
  const mainCategories = [
    { name: "Teretna vozila", href: "/products?category=teretna" },
    { name: "Putnička vozila", href: "/products?category=putnicka" },
    { name: "ADR oprema", href: "/products?category=adr" },
    { name: "Autopraonice", href: "/products?category=autopraonice" }
  ];

  const quickLinks = [
    { name: "Pretraži proizvode", href: "/search" },
    { name: "Provjera kompatibilnosti", href: "/products/vehicle-compatibility" },
    { name: "Nalog", href: "/account" },
    { name: "Moje narudžbe", href: "/account/orders" },
    { name: "Korpa", href: "/cart" }
  ];

  const companyLinks = [
    { name: "O nama", href: "/about" },
    { name: "Kontakt", href: "/contact" },
    { name: "Uslovi korišćenja", href: "/terms" },
    { name: "Politika privatnosti", href: "/privacy" },
    { name: "FAQ", href: "/faq" }
  ];

  return (
    <footer className="relative bg-transparent mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 md:p-10">
          {/* Dense grid background overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-65"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(100,116,139,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.12) 1px, transparent 1px)",
              backgroundSize: "4px 4px",
              maskImage: "radial-gradient(ellipse at center, black 90%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 90%, transparent 100%)",
            }}
          />

          {/* Main Footer Content */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2">
                <Image src="/images/omerbasic.png" alt="Omerbasic Auto Dijelovi Logo" width={180} height={40} />
              </Link>
            </div>
            
            <p className="text-slate-700 text-sm leading-relaxed">
              Vaš pouzdani partner za kvalitetne autodijelove. Pružamo stručnu podršku i brzu dostavu za sve vaše potrebe.
            </p>
            
            <div className="flex space-x-4">
              <a href="#" className="group relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center transition-all duration-300 hover:bg-sunfire-50 hover:border-sunfire-200">
                <Facebook className="w-5 h-5 text-slate-600 group-hover:text-sunfire-700 transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center transition-all duration-300 hover:bg-sunfire-50 hover:border-sunfire-200">
                <Instagram className="w-5 h-5 text-slate-600 group-hover:text-sunfire-700 transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center transition-all duration-300 hover:bg-sunfire-50 hover:border-sunfire-200">
                <Linkedin className="w-5 h-5 text-slate-600 group-hover:text-sunfire-700 transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-slate-900 relative">
              Brze veze
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-sunfire-500/70 rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="group flex items-center text-slate-600 hover:text-slate-900 transition-colors duration-300"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 text-sunfire-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-slate-900 relative">
              Kategorije
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-sunfire-500/70 rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {mainCategories.map((category) => (
                <li key={category.name}>
                  <Link 
                    href={category.href}
                    className="group flex items-center text-slate-600 hover:text-slate-900 transition-colors duration-300"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 text-sunfire-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-slate-900 relative">
              Kontakt
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-sunfire-500/70 rounded-full"></div>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-sunfire-100 border border-sunfire-200">
                  <MapPin className="w-4 h-4 text-sunfire-700" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm">Rosulje bb, Jelah</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-sunfire-100 border border-sunfire-200">
                  <Phone className="w-4 h-4 text-sunfire-700" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm">
                    <a href="tel:+38732666658" className="hover:text-sunfire-700 transition-colors">032/666-658</a>
                    {' '}•{' '}
                    <a href="tel:+38761962359" className="hover:text-sunfire-700 transition-colors">061-962-359</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-sunfire-100 border border-sunfire-200">
                  <Mail className="w-4 h-4 text-sunfire-700" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm">
                    <a href="mailto:veleprodajatpo@gmail.com" className="hover:text-sunfire-700 transition-colors">veleprodajatpo@gmail.com</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-sunfire-100 border border-sunfire-200">
                  <Clock className="w-4 h-4 text-sunfire-700" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm">Radno vrijeme: 08:00 – 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        

        {/* Bottom Bar */}
        <div className="relative z-10 border-t border-slate-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-slate-600 text-sm">
              © 2025 TP Omerbašić. Sva prava zadržana.
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm">
              {companyLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  className="text-slate-600 hover:text-slate-900 transition-colors duration-300"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
