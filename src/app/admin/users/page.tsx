import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRole, User } from '@/generated/prisma/client';
import { UsersClient } from './_components/client';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== UserRole.ADMIN) {
    // Preusmjeri na početnu stranicu ako korisnik nije admin
    redirect('/');
  }

  const users = await db.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Uklanjamo lozinku prije slanja na klijent
  const safeUsers = users.map(({ password, ...user }: User) => user);

  return (
    <div className="p-6 space-y-6">
      <UsersClient data={safeUsers} />
    </div>
  );
}
