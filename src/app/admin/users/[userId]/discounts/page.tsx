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
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Heading
            title="Popusti po kategorijama"
            description={`Upravljanje popustima za korisnika ${user.name || user.email}`}
          />
          <Separator />
          <div className="bg-destructive/10 p-4 rounded-md">
            <p className="text-destructive font-medium">
              Ovaj korisnik nije B2B korisnik. Popusti po kategorijama dostupni su samo za B2B korisnike.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Popusti po kategorijama"
          description={`Upravljanje popustima za B2B korisnika ${user.companyName || user.name || user.email}`}
        />
        <Separator />
        <Suspense fallback={<DiscountManagerSkeleton />}>
          <CategoryDiscountManager userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}

function DiscountManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
