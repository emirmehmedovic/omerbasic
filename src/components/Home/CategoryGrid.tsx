import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export interface SimpleCategory {
  id: string;
  name: string;
}

export function CategoryGrid({
  categories,
  images,
}: {
  categories: SimpleCategory[];
  images: Record<string, string>;
}) {
  const top = categories.slice(0, 4);
  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Kategorije</h2>
        <Link href="/products" className="text-sunfire-700 hover:underline font-medium">
          Sve kategorije
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {top.map((category) => (
          <Link
            key={category.id}
            href={`/products?categoryId=${category.id}`}
            className="group relative flex gap-4 items-center rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="relative w-40 h-32 flex-shrink-0">
              <Image
                src={images[category.name] || "/images/placeholder.jpg"}
                alt={category.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-5 pr-10">
              <h3 className="text-xl font-semibold text-slate-900">{category.name}</h3>
              <p className="text-slate-600 text-sm mt-1">Pregledajte ponudu i dostupne brendove.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-sunfire-700 font-medium">
                Otvori kategoriju
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
