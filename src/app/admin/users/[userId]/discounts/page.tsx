import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CategoryDiscountManager } from '@/components/admin/CategoryDiscountManager';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
// @ts-ignore - Skeleton komponenta postoji ali TypeScript ne može pronaći deklaraciju tipa
import { Skeleton } from '@/components/ui/skeleton';

export default async function DiscountsPage({ params }: { params: Promise<{ userId: string }> }) {
  // Dohvati params objekt i izvuci userId (Next.js 15 async params)
  const { userId } = await params;
  
  // Dohvati korisnika da provjerimo postoji li i je li B2B
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyName: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Provjeri je li korisnik B2B
  if (user.role !== 'B2B') {
    return (
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
                Popusti po kategorijama
              </h1>
              <p className="text-gray-600 mt-1">
                Upravljanje popustima za korisnika {user.name || user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-red/20 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-red-100 to-red-200 rounded-lg border border-red-300">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Ovaj korisnik nije B2B korisnik</h3>
                <p className="text-red-600 mt-1">Popusti po kategorijama dostupni su samo za B2B korisnike.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-xl border border-amber/30">
            <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber via-orange to-brown bg-clip-text text-transparent">
              Popusti po kategorijama
            </h1>
            <p className="text-gray-600 mt-1">
              Upravljanje popustima za B2B korisnika {user.companyName || user.name || user.email}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<DiscountManagerSkeleton />}>
        <CategoryDiscountManager userId={userId} />
      </Suspense>
    </div>
  );
}

function DiscountManagerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton za formu */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-amber/20 to-orange/20 rounded-lg animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              <div className="h-4 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
          </div>
          <div className="flex justify-end">
            <div className="h-10 w-32 bg-gradient-to-r from-amber/20 to-orange/20 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Skeleton za listu */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-amber/20 to-orange/20 rounded-lg animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 w-56 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              <div className="h-4 w-72 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 border border-amber/20 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-gradient-to-r from-amber/20 to-orange/20 rounded-lg animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-red/20 to-red/30 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
