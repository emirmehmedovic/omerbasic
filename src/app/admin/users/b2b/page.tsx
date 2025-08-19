import { db } from '@/lib/db';
import { B2BUsersClient } from './_components/client';

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
    <div className="p-6 space-y-6">
      <B2BUsersClient data={b2bUsers} />
    </div>
  );
}
