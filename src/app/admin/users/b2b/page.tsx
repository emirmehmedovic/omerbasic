import { format } from 'date-fns';
import { db } from '@/lib/db';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function B2BUsersPage() {
  // Dohvati sve B2B korisnike
  const b2bUsers = await db.user.findMany({
    where: {
      role: 'B2B',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="B2B korisnici"
            description="Upravljanje B2B korisnicima i njihovim popustima"
          />
          <Link href="/admin/users/new-b2b">
            <Button>Dodaj novog B2B korisnika</Button>
          </Link>
        </div>
        <Separator />

        <div className="rounded-md border">
          <div className="p-4">
            <div className="grid grid-cols-5 font-medium">
              <div>Naziv firme</div>
              <div>Email</div>
              <div>Opći popust</div>
              <div>Datum registracije</div>
              <div>Akcije</div>
            </div>
          </div>
          <Separator />
          {b2bUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nema B2B korisnika.
            </div>
          ) : (
            <div>
              {b2bUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-5 p-4 items-center">
                  <div>{user.companyName || 'Nije uneseno'}</div>
                  <div>{user.email}</div>
                  <div>{user.discountPercentage ? `${user.discountPercentage}%` : '0%'}</div>
                  <div>{format(new Date(user.createdAt), 'dd.MM.yyyy.')}</div>
                  <div className="flex space-x-2">
                    <Link href={`/admin/users/${user.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Uredi
                      </Button>
                    </Link>
                    <Link href={`/admin/users/${user.id}/discounts`}>
                      <Button variant="secondary" size="sm">
                        Popusti po kategorijama
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
