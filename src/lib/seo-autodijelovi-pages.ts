export type SeoAutodijeloviPageType = "group" | "brand" | "model" | "category" | "query";

export type SeoAutodijeloviPage = {
  slug: string;
  type: SeoAutodijeloviPageType;
  title: string;
  description: string;
  h1: string;
  query?: string;
  brand?: string;
  label?: string;
  categoryPath?: string[];
};

const modelPage = (slug: string, label: string, brand: string, query: string): SeoAutodijeloviPage => ({
  slug,
  type: "model",
  title: `Autodijelovi za ${label} | TP Omerbašić`,
  description: `Autodijelovi za ${label} – veliki izbor, brza dostava širom BiH i stručna pomoć. TP Omerbašić, Jelah (Tešanj).`,
  h1: `Autodijelovi za ${label}`,
  query,
  brand,
  label,
});

const brandPage = (slug: string, label: string, query: string): SeoAutodijeloviPage => ({
  slug,
  type: "brand",
  title: `Autodijelovi ${label} | TP Omerbašić`,
  description: `Autodijelovi ${label} – originalni i zamjenski dijelovi, brza isporuka širom BiH. TP Omerbašić, Jelah (Tešanj).`,
  h1: `Autodijelovi ${label}`,
  query,
  brand: label,
  label,
});

const queryPage = (slug: string, label: string, query: string): SeoAutodijeloviPage => ({
  slug,
  type: "query",
  title: `${label} | TP Omerbašić`,
  description: `${label} – provjerite dostupnost, kompatibilnost i ponudu iz našeg kataloga. Brza isporuka širom BiH.`,
  h1: label,
  query,
  label,
});

export const seoAutodijeloviPages: SeoAutodijeloviPage[] = [
  {
    slug: "vag-grupacija",
    type: "group",
    title: "Autodijelovi VAG grupacija | TP Omerbašić",
    description:
      "Autodijelovi za VAG grupaciju (Volkswagen, Audi, Škoda, SEAT). Pogledajte ponudu i brzu isporuku širom BiH.",
    h1: "Autodijelovi za VAG grupaciju",
  },

  brandPage("volkswagen", "Volkswagen", "volkswagen"),
  brandPage("audi", "Audi", "audi"),
  brandPage("skoda", "Škoda", "skoda"),
  brandPage("seat", "SEAT", "seat"),

  modelPage("vw-golf-4", "VW Golf 4", "Volkswagen", "golf 4"),
  modelPage("vw-golf-5", "VW Golf 5", "Volkswagen", "golf 5"),
  modelPage("vw-golf-6", "VW Golf 6", "Volkswagen", "golf 6"),
  modelPage("vw-golf-7", "VW Golf 7", "Volkswagen", "golf 7"),
  modelPage("vw-golf-8", "VW Golf 8", "Volkswagen", "golf 8"),

  modelPage("vw-passat-5", "VW Passat 5", "Volkswagen", "passat 5"),
  modelPage("vw-passat-6", "VW Passat 6", "Volkswagen", "passat 6"),
  modelPage("vw-passat-7", "VW Passat 7", "Volkswagen", "passat 7"),
  modelPage("vw-passat-8", "VW Passat 8", "Volkswagen", "passat 8"),

  modelPage("audi-a3", "Audi A3", "Audi", "audi a3"),
  modelPage("audi-a4", "Audi A4", "Audi", "audi a4"),
  modelPage("audi-a5", "Audi A5", "Audi", "audi a5"),
  modelPage("audi-a6", "Audi A6", "Audi", "audi a6"),

  modelPage("vw-polo", "VW Polo", "Volkswagen", "polo"),
  modelPage("vw-tiguan", "VW Tiguan", "Volkswagen", "tiguan"),
  modelPage("vw-touran", "VW Touran", "Volkswagen", "touran"),
  modelPage("vw-caddy", "VW Caddy", "Volkswagen", "caddy"),

  {
    slug: "filteri-goriva",
    type: "category",
    title: "Filteri goriva | TP Omerbašić",
    description:
      "Filteri goriva – pouzdani dijelovi za redovno održavanje, dostupni odmah i uz brzu isporuku širom BiH.",
    h1: "Filteri goriva",
    categoryPath: ["Putnička vozila", "Filteri", "Filter goriva"],
    query: "filter goriva",
  },
  {
    slug: "filteri-ulja",
    type: "category",
    title: "Filteri ulja | TP Omerbašić",
    description:
      "Filteri ulja za putnička vozila – kvalitetan izbor, stručna podrška i brza isporuka. TP Omerbašić, Jelah.",
    h1: "Filteri ulja",
    categoryPath: ["Putnička vozila", "Filteri", "Filter ulja"],
    query: "filter ulja",
  },
  {
    slug: "filteri-mjenjaca",
    type: "category",
    title: "Filteri mjenjača | TP Omerbašić",
    description:
      "Filteri mjenjača za pouzdan rad transmisije. Dostava širom BiH i provjera kompatibilnosti.",
    h1: "Filteri mjenjača",
    categoryPath: ["Putnička vozila", "Filteri", "Filter mjenjača"],
    query: "filter mjenjaca",
  },

  modelPage("skoda-octavia", "Škoda Octavia", "Škoda", "octavia"),
  modelPage("skoda-superb", "Škoda Superb", "Škoda", "superb"),
  modelPage("skoda-fabia", "Škoda Fabia", "Škoda", "fabia"),

  modelPage("seat-leon", "SEAT Leon", "SEAT", "leon"),
  modelPage("seat-ibiza", "SEAT Ibiza", "SEAT", "ibiza"),

  queryPage("zadnji-most-golf-4", "Zadnji most Golf 4", "zadnji most golf 4"),
  queryPage("vodena-pumpa-golf-4", "Vodena pumpa Golf 4", "vodena pumpa golf 4"),
  queryPage("racva-vode-golf-5", "Račva vode Golf 5", "racva vode golf 5"),
  queryPage("filter-nafte", "Filter nafte", "filter nafte"),
  queryPage("filter-nafte-golf-2", "Filter nafte Golf 2", "filter nafte golf 2"),
  queryPage("filter-goriva-golf-5", "Filter goriva Golf 5", "filter goriva golf 5"),
  queryPage("selen-blok-golf-6", "Selen blok Golf 6", "selen blok golf 6"),
  queryPage("semering-golf-7", "Semering Golf 7", "semering golf 7"),
  queryPage("antifriz-g48", "Antifriz G48", "antifriz g48"),
  queryPage("gumice-stabilizatora", "Gumice stabilizatora", "gumice stabilizatora"),
];

export const seoAutodijeloviSlugs = seoAutodijeloviPages.map((page) => page.slug);

export const getSeoAutodijeloviPage = (slug: string) =>
  seoAutodijeloviPages.find((page) => page.slug === slug);

export const getModelPagesByBrand = (brand: string) =>
  seoAutodijeloviPages.filter((page) => page.type === "model" && page.brand === brand);

export const getBrandPages = () =>
  seoAutodijeloviPages.filter((page) => page.type === "brand");
