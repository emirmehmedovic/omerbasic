import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/client';

export type AdminSession = {
  id: string;
  role: UserRole;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return null;
  }
  return {
    id: session.user.id,
    role: session.user.role,
  };
}
