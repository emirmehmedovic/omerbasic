import { UserRole } from '@/generated/prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      companyName?: string | null;
      taxId?: string | null;
      discountPercentage: number;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
    companyName?: string | null;
    taxId?: string | null;
    discountPercentage?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    companyName?: string | null;
    taxId?: string | null;
    discountPercentage?: number;
  }
}
