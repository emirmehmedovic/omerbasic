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
      <div className="w-full mx-auto max-w-full xl:max-w-7xl 2xl:max-w-[2000px] 3xl:max-w-[2400px] px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-8 md:p-10 shadow-2xl">
          {/* Modern texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(27,58,95,0.2) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%)',
              backgroundSize: '32px 32px, 100% 100%',
            }}
          />

          {/* Main Footer Content */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/images/omerbasic.png"
                  alt="Omerbasic Auto Dijelovi Logo"
                  width={180}
                  height={40}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </Link>
            </div>
            
            <p className="text-slate-700 text-sm leading-relaxed">
              Vaš pouzdani partner za kvalitetne autodijelove. Pružamo stručnu podršku i brzu dostavu za sve vaše potrebe.
            </p>
            
            <div className="flex space-x-3">
              <a href="#" className="group relative w-11 h-11 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-[#E85A28] hover:to-[#FF6B35] hover:shadow-lg hover:-translate-y-1">
                <Facebook className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-11 h-11 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-[#E85A28] hover:to-[#FF6B35] hover:shadow-lg hover:-translate-y-1">
                <Instagram className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-11 h-11 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center transition-all duration-300 hover:bg-gradient-to-br hover:from-[#E85A28] hover:to-[#FF6B35] hover:shadow-lg hover:-translate-y-1">
                <Linkedin className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-2 rounded-lg">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-primary">Brze veze</h4>
            </div>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="group flex items-center text-slate-700 hover:text-white hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] px-3 py-2 rounded-lg transition-all duration-300 font-medium"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-2 rounded-lg">
                <Car className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-primary">Kategorije</h4>
            </div>
            <ul className="space-y-3">
              {mainCategories.map((category) => (
                <li key={category.name}>
                  <Link 
                    href={category.href}
                    className="group flex items-center text-slate-700 hover:text-white hover:bg-gradient-to-r hover:from-[#E85A28] hover:to-[#FF6B35] px-3 py-2 rounded-lg transition-all duration-300 font-medium"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-br from-[#E85A28] to-[#FF6B35] p-2 rounded-lg">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-primary">Kontakt</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/60 hover:bg-white/80 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm font-medium">Braće Omerbasić 65, Jelah 74264 Tešanj</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/60 hover:bg-white/80 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm font-medium">
                    <a href="tel:+38732666536" className="hover:text-sunfire-600 transition-colors">032/666-536</a>
                    {' '}•{' '}
                    <a href="tel:+38761847203" className="hover:text-sunfire-600 transition-colors">061/847-203</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/60 hover:bg-white/80 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm font-medium">
                    <a href="mailto:tpomerbasic@bih.net.ba" className="hover:text-sunfire-600 transition-colors">tpomerbasic@bih.net.ba</a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/60 hover:bg-white/80 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-slate-700 text-sm font-medium">Radno vrijeme: 08:00 – 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        

        {/* Bottom Bar */}
        <div className="relative z-10 border-t border-white/40 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-slate-700 text-sm font-medium">
              © 2025 <span className="font-bold text-primary">TP Omerbašić</span>. Sva prava zadržana.
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm">
              {companyLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  className="text-slate-700 hover:text-[#E85A28] transition-colors duration-300 font-medium"
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
