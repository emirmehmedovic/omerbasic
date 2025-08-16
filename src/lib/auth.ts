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

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            addresses: {
              where: { isDefaultShipping: true },
              take: 1,
            },
          },
        });
        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        const defaultAddress = user.addresses?.[0];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          taxId: user.taxId,
          discountPercentage: user.discountPercentage || 0,
          address: defaultAddress
            ? {
                street: defaultAddress.street,
                city: defaultAddress.city,
                postalCode: defaultAddress.postalCode,
                country: defaultAddress.country,
              }
            : null,
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
        (session.user as any).address = (token as any).address;
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
        (token as any).address = (user as any).address;
      }
      return token;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
