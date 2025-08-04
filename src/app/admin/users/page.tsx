import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <UsersClient data={safeUsers} />
    </div>
  );
}
