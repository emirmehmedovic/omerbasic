import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          taxId: user.taxId,
          discountPercentage: user.discountPercentage || 0,
        } as any;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role;
        (session.user as any).companyName = (token as any).companyName;
        (session.user as any).taxId = (token as any).taxId;
        (session.user as any).discountPercentage = (token as any).discountPercentage || 0;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).companyName = (user as any).companyName;
        (token as any).taxId = (user as any).taxId;
        (token as any).discountPercentage = (user as any).discountPercentage || 0;
      }
      return token;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
