"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Mail, Phone, MapPin, Building2, User, MessageSquare, Send, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Schema za kontakt formu
const contactSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
  email: z.string().email("Unesite valjanu email adresu"),
  phone: z.string().min(1, "Telefon je obavezan"),
  subject: z.string().min(5, "Naslov mora imati najmanje 5 znakova"),
  message: z.string().min(10, "Poruka mora imati najmanje 10 znakova"),
});

// Schema za B2B aplikaciju
const b2bSchema = z.object({
  companyName: z.string().min(2, "Naziv tvrtke mora imati najmanje 2 znaka"),
  contactPerson: z.string().min(2, "Ime kontakt osobe mora imati najmanje 2 znaka"),
  email: z.string().email("Unesite valjanu email adresu"),
  phone: z.string().min(1, "Telefon je obavezan"),
  address: z.string().min(5, "Adresa mora imati najmanje 5 znakova"),
  city: z.string().min(2, "Grad mora imati najmanje 2 znaka"),
  businessType: z.string().min(1, "Odaberite tip poslovanja"),
  description: z.string().min(20, "Opis mora imati najmanje 20 znakova"),
});

type ContactFormData = z.infer<typeof contactSchema>;
type B2BFormData = z.infer<typeof b2bSchema>;

export function ContactForm() {
  const [activeTab, setActiveTab] = useState("contact");
  const [loading, setLoading] = useState(false);

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const b2bForm = useForm<B2BFormData>({
    resolver: zodResolver(b2bSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      businessType: "",
      description: "",
    },
  });

  const onSubmitContact = async (data: ContactFormData) => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Greška pri slanju");
      }

      toast.success("Poruka uspješno poslana! Odgovorit ćemo vam u najkraćem mogućem roku.");
      contactForm.reset();
    } catch (error) {
      toast.error("Greška pri slanju poruke. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitB2B = async (data: B2BFormData) => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/b2b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Greška pri slanju");
      }

      toast.success("B2B aplikacija uspješno poslana! Kontaktirat ćemo vas u najkraćem mogućem roku.");
      b2bForm.reset();
    } catch (error) {
      toast.error("Greška pri slanju aplikacije. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Kontakt informacije */}
      <div className="lg:col-span-1">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
            <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-sunfire-400" />
            </div>
            <h3 className="text-xl font-bold accent-text">Kontakt informacije</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
                <Mail className="w-5 h-5 text-sunfire-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Email</h3>
                <p className="text-slate-400">info@omerbasic.ba</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
                <Phone className="w-5 h-5 text-sunfire-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Telefon</h3>
                <p className="text-slate-400">+387 33 123 456</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
                <MapPin className="w-5 h-5 text-sunfire-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Adresa</h3>
                <p className="text-slate-400">Sarajevo, Bosna i Hercegovina</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
                <Building2 className="w-5 h-5 text-sunfire-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Radno vrijeme</h3>
                <p className="text-slate-400">Pon-Pet: 08:00 - 17:00</p>
                <p className="text-slate-400">Sub: 08:00 - 14:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forme */}
      <div className="lg:col-span-2">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
            <div className="p-2 bg-gradient-to-r from-sunfire-500/20 to-sunfire-600/20 border border-sunfire-500/30 rounded-lg">
              <Send className="w-5 h-5 text-sunfire-400" />
            </div>
            <h3 className="text-xl font-bold accent-text">Pošaljite nam poruku</h3>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass-card rounded-xl p-1">
              <TabsTrigger 
                value="contact" 
                className="text-slate-300 hover:text-white data-[state=active]:accent-bg data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                Kontakt forma
              </TabsTrigger>
              <TabsTrigger 
                value="b2b" 
                className="text-slate-300 hover:text-white data-[state=active]:accent-bg data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                B2B Partnerstvo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4">
              <form onSubmit={contactForm.handleSubmit(onSubmitContact)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Ime i prezime *</label>
                    <Input
                      {...contactForm.register("name")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Vaše ime i prezime"
                    />
                    {contactForm.formState.errors.name && (
                      <p className="text-red-400 text-xs mt-1">{contactForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Email *</label>
                    <Input
                      {...contactForm.register("email")}
                      type="email"
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="vaš@email.com"
                    />
                    {contactForm.formState.errors.email && (
                      <p className="text-red-400 text-xs mt-1">{contactForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Telefon *</label>
                    <Input
                      {...contactForm.register("phone")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="+387 33 123 456"
                    />
                    {contactForm.formState.errors.phone && (
                      <p className="text-red-400 text-xs mt-1">{contactForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Naslov *</label>
                    <Input
                      {...contactForm.register("subject")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Naslov poruke"
                    />
                    {contactForm.formState.errors.subject && (
                      <p className="text-red-400 text-xs mt-1">{contactForm.formState.errors.subject.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Poruka *</label>
                  <Textarea
                    {...contactForm.register("message")}
                    rows={5}
                    className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500 resize-none"
                    placeholder="Vaša poruka..."
                  />
                  {contactForm.formState.errors.message && (
                    <p className="text-red-400 text-xs mt-1">{contactForm.formState.errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full accent-bg text-white hover:opacity-90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                >
                  {loading ? "Slanje..." : "Pošaljite poruku"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="b2b" className="space-y-4">
              <div className="glass-card rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-sunfire-400" />
                  <h3 className="font-medium text-slate-200">Postanite B2B partner</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Želite postati naš B2B partner? Ispunite formu ispod i mi ćemo vas kontaktirati 
                  s detaljima o partnerstvu i pristupu našem katalogu.
                </p>
              </div>

              <form onSubmit={b2bForm.handleSubmit(onSubmitB2B)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Naziv tvrtke *</label>
                    <Input
                      {...b2bForm.register("companyName")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Naziv vaše tvrtke"
                    />
                    {b2bForm.formState.errors.companyName && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Kontakt osoba *</label>
                    <Input
                      {...b2bForm.register("contactPerson")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Ime i prezime kontakt osobe"
                    />
                    {b2bForm.formState.errors.contactPerson && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.contactPerson.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Email *</label>
                    <Input
                      {...b2bForm.register("email")}
                      type="email"
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="kontakt@tvrtka.com"
                    />
                    {b2bForm.formState.errors.email && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Telefon *</label>
                    <Input
                      {...b2bForm.register("phone")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="+387 33 123 456"
                    />
                    {b2bForm.formState.errors.phone && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Adresa *</label>
                    <Input
                      {...b2bForm.register("address")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Ulica i broj"
                    />
                    {b2bForm.formState.errors.address && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Grad *</label>
                    <Input
                      {...b2bForm.register("city")}
                      className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500"
                      placeholder="Grad"
                    />
                    {b2bForm.formState.errors.city && (
                      <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.city.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Tip poslovanja *</label>
                  <select
                    {...b2bForm.register("businessType")}
                    className="w-full bg-slate-800/50 border border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 p-3"
                  >
                    <option value="">Odaberite tip poslovanja</option>
                    <option value="autoservis">Autoservis</option>
                    <option value="trgovina">Trgovina auto dijelovima</option>
                    <option value="distribucija">Distribucija</option>
                    <option value="proizvodnja">Proizvodnja</option>
                    <option value="ostalo">Ostalo</option>
                  </select>
                  {b2bForm.formState.errors.businessType && (
                    <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.businessType.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Opis poslovanja *</label>
                  <Textarea
                    {...b2bForm.register("description")}
                    rows={4}
                    className="bg-slate-800/50 border-slate-600 focus:border-sunfire-500 rounded-lg transition-all duration-200 text-slate-200 placeholder:text-slate-500 resize-none"
                    placeholder="Kratko opišite vaše poslovanje i zašto želite postati naš partner..."
                  />
                  {b2bForm.formState.errors.description && (
                    <p className="text-red-400 text-xs mt-1">{b2bForm.formState.errors.description.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full accent-bg text-white hover:opacity-90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
                >
                  {loading ? "Slanje..." : "Pošaljite B2B aplikaciju"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
