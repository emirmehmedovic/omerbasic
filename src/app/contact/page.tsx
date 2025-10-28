import { ContactForm } from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative overflow-hidden rounded-2xl p-8 mb-8 bg-white border border-slate-200 shadow-sm">
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-50"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)',
                backgroundSize: '2px 2px',
                maskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 92%, transparent 100%)',
              }}
            />
            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-slate-900 mb-4">
                Kontaktirajte nas
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Imate pitanja o našim proizvodima ili želite postati B2B partner? 
                Slobodno nas kontaktirajte - tu smo da vam pomognemo!
              </p>
            </div>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
