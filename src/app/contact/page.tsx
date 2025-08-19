import { ContactForm } from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-app relative">
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="glass-card rounded-2xl p-8 mb-8">
            <h1 className="text-5xl font-bold accent-text mb-4">
              Kontaktirajte nas
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Imate pitanja o našim proizvodima ili želite postati B2B partner? 
              Slobodno nas kontaktirajte - tu smo da vam pomognemo!
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
