import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = {
  title: 'Kontakt | TP Omerbašić – Autodijelovi Tešanj',
  description:
    'Kontakt TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice. Rosulje bb, Jelah (Tešanj). Telefon: 032/666-658, 061-962-359. Radno vrijeme: 08:00–18:00.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-app relative">
      <PageContainer maxWidth="adaptive" padding="md" className="relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative overflow-hidden rounded-3xl p-8 mb-8 bg-gradient-to-br from-primary via-primary-dark to-[#0F1F35] shadow-2xl">
            {/* Texture overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)',
                backgroundSize: '32px 32px, 100% 100%',
              }}
            />

            {/* Decorative glow effect */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-white mb-4">
                Kontaktirajte nas
              </h1>
              <p className="text-lg text-white/90 max-w-2xl mx-auto">
                Imate pitanja o našim proizvodima ili želite postati B2B partner?
                Slobodno nas kontaktirajte - tu smo da vam pomognemo!
              </p>
            </div>
          </div>
        </div>

        <ContactForm />
      </PageContainer>
    </div>
  );
}
