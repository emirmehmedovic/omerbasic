import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductsResults from "@/components/ProductsResults";
import { db } from "@/lib/db";
import {
  getBrandPages,
  getModelPagesByBrand,
  getSeoAutodijeloviPage,
  seoAutodijeloviSlugs,
} from "@/lib/seo-autodijelovi-pages";

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return seoAutodijeloviSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = getSeoAutodijeloviPage(params.slug);
  if (!page) {
    return {
      title: "Stranica nije pronađena | TP Omerbašić",
      description: "Tražena stranica nije pronađena.",
    };
  }

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `/autodijelovi/${page.slug}`,
    },
  };
}

async function resolveCategoryId(path: string[] | undefined): Promise<string | null> {
  if (!path || path.length === 0) return null;
  let parentId: string | null = null;
  for (const name of path) {
    const category = await db.category.findFirst({
      where: {
        name,
        parentId,
      },
      select: {
        id: true,
      },
    });
    if (!category) return null;
    parentId = category.id;
  }
  return parentId;
}

type FaqItem = { question: string; answer: string };

function getFaqItems(page: NonNullable<ReturnType<typeof getSeoAutodijeloviPage>>): FaqItem[] {
  const label = page.label ?? page.brand ?? "ovaj dio";

  if (page.type === "group") {
    return [
      {
        question: "Koji brendovi spadaju u VAG grupaciju?",
        answer: "Volkswagen, Audi, Škoda i SEAT su glavni brendovi VAG grupacije.",
      },
      {
        question: "Kako da provjerim kompatibilnost dijela?",
        answer: "Pošaljite nam VIN ili podatke o vozilu i provjerićemo odgovara li dio.",
      },
    ];
  }

  if (page.type === "brand") {
    return [
      {
        question: `Koji su najtraženiji modeli ${label}?`,
        answer: "Najčešće traženi modeli su prikazani ispod kao popularni modeli.",
      },
      {
        question: "Da li imate originalne i zamjenske dijelove?",
        answer: "Da, u ponudi su originalni i kvalitetni zamjenski dijelovi.",
      },
    ];
  }

  if (page.type === "model") {
    return [
      {
        question: `Koji su najčešći dijelovi za ${label}?`,
        answer: "Najčešće se traže filteri, dijelovi ovjesa, kočioni dijelovi i dijelovi motora.",
      },
      {
        question: "Kako da potvrdim kompatibilnost?",
        answer: "Najsigurnije je poslati VIN broj ili podatke o motoru i godištu.",
      },
    ];
  }

  if (page.type === "category") {
    return [
      {
        question: `Da li imate više tipova za ${label}?`,
        answer: "Da, dostupni su različiti brendovi i specifikacije, zavisno od vozila.",
      },
      {
        question: "Kako da odaberem tačan filter?",
        answer: "Preporučujemo provjeru po kataloškom broju ili VIN-u vozila.",
      },
    ];
  }

  if (page.type === "query") {
    return [
      {
        question: `Da li imate ${label} na stanju?`,
        answer: "Aktuelno stanje se prikazuje u katalogu. Ako nema, možemo provjeriti dobavu.",
      },
      {
        question: "Kako da naručim?",
        answer: "Pošaljite upit ili nazovite, a mi ćemo pripremiti dio i dostavu.",
      },
    ];
  }

  return [];
}

export default async function AutodijeloviSeoPage({ params }: PageProps) {
  const page = getSeoAutodijeloviPage(params.slug);
  if (!page) notFound();

  const categoryId = await resolveCategoryId(page.categoryPath);

  const brandModels = page.brand ? getModelPagesByBrand(page.brand) : [];
  const brandPages = getBrandPages();
  const relatedModels =
    page.type === "model" && page.brand
      ? getModelPagesByBrand(page.brand).filter((item) => item.slug !== page.slug)
      : [];

  const searchLink = page.query ? `/products?q=${encodeURIComponent(page.query)}` : "/products";
  const listingFilters = categoryId ? { categoryId } : page.query ? { q: page.query } : null;
  const faqItems = getFaqItems(page);

  return (
    <main className="bg-app min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <nav className="mb-3 text-sm text-slate-600 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-primary">
            Početna
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{page.h1}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">{page.h1}</h1>

        <div className="space-y-3 text-slate-700 max-w-3xl text-sm md:text-base">
          <p>
            Ovdje smo izdvojili autodijelove koji se najčešće traže za{" "}
            {page.label ?? page.brand ?? "vozila iz VAG grupacije"}. Pretraga se temelji na
            nazivima artikala i specifikacijama, pa se isplati koristiti i dodatne filtre.
          </p>
          <p>
            Ako vam treba pomoć oko odabira dijela, javite se našem timu iz Jelaha (Tešanj) –
            provjerićemo kompatibilnost prema marki, modelu, generaciji i kodu motora.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={searchLink}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-primary-dark to-primary text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Otvori pretragu proizvoda
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-semibold text-primary border border-primary/20 shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
          >
            Katalog i filteri
          </Link>
        </div>

        {page.type === "group" && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-primary mb-4">VAG brendovi</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {brandPages.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/autodijelovi/${brand.slug}`}
                  className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {brand.h1}
                </Link>
              ))}
            </div>
          </section>
        )}

        {page.type === "brand" && brandModels.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-primary mb-4">Popularni modeli</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brandModels.map((model) => (
                <Link
                  key={model.slug}
                  href={`/autodijelovi/${model.slug}`}
                  className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {model.h1}
                </Link>
              ))}
            </div>
          </section>
        )}

        {page.type === "model" && relatedModels.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-primary mb-4">Slični modeli</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedModels.map((model) => (
                <Link
                  key={model.slug}
                  href={`/autodijelovi/${model.slug}`}
                  className="rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {model.h1}
                </Link>
              ))}
            </div>
          </section>
        )}

        {listingFilters && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-primary mb-4">Proizvodi iz ponude</h2>
            <ProductsResults filters={listingFilters} />
          </section>
        )}

        {faqItems.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-primary mb-4">Česta pitanja</h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.question} className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
