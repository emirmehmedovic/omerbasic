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
    <footer className="relative bg-app border-t border-white/10 mt-20">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-orange/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="container mx-auto px-4 py-16">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber via-orange to-brown p-3">
                <Car className="w-full h-full text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">TP Omerbašić</h3>
                <p className="text-slate-400 text-sm">Autodijelovi – Putnička i Teretna vozila, ADR, Autopraonice</p>
              </div>
            </div>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              Vaš pouzdani partner za kvalitetne autodijelove. Pružamo stručnu podršku i brzu dostavu za sve vaše potrebe.
            </p>
            
            <div className="flex space-x-4">
              <a href="#" className="group relative w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-amber hover:via-orange hover:to-brown hover:border-white/40">
                <Facebook className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-amber hover:via-orange hover:to-brown hover:border-white/40">
                <Instagram className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-amber hover:via-orange hover:to-brown hover:border-white/40">
                <Linkedin className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white relative">
              Brze veze
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-gradient-to-r from-amber to-orange rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="group flex items-center text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white relative">
              Kategorije
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-gradient-to-r from-amber to-orange rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              {mainCategories.map((category) => (
                <li key={category.name}>
                  <Link 
                    href={category.href}
                    className="group flex items-center text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white relative">
              Kontakt
              <div className="absolute -bottom-2 left-0 w-8 h-1 bg-gradient-to-r from-amber to-orange rounded-full"></div>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                  <MapPin className="w-4 h-4 text-amber" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Rosulje bb, Jelah</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                  <Phone className="w-4 h-4 text-amber" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">
                    <a href="tel:+38732666658" className="hover:text-white transition-colors">032/666-658</a>
                    {' '}•{' '}
                    <a href="tel:+38761962359" className="hover:text-white transition-colors">061-962-359</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                  <Mail className="w-4 h-4 text-amber" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">
                    <a href="mailto:veleprodajatpo@gmail.com" className="hover:text-white transition-colors">veleprodajatpo@gmail.com</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="mt-1 p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                  <Clock className="w-4 h-4 text-amber" />
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Radno vrijeme: 08:00 – 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="border-t border-white/10 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-full bg-gradient-to-br from-amber to-orange">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-300">Brza dostava</span>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-full bg-gradient-to-br from-amber to-orange">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-300">Sigurna kupovina</span>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-full bg-gradient-to-br from-amber to-orange">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-300">Stručna podrška</span>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-full bg-gradient-to-br from-amber to-orange">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-300">Originalni dijelovi</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-slate-400 text-sm">
              © 2025 TP Omerbašić. Sva prava zadržana.
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm">
              {companyLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  className="text-slate-400 hover:text-white transition-colors duration-300"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
