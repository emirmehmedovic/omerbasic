import { PrismaClient } from '@/generated/prisma';

// Singleton pattern for Prisma Client to prevent connection pool exhaustion
// This is critical in serverless environments (Vercel, AWS Lambda)
// where each function invocation would otherwise create a new connection pool
declare global {
  var prisma: PrismaClient | undefined;
}

// Reuse existing PrismaClient instance or create new one
// This works in both development (HMR) and production (serverless)
const globalForPrisma = global as typeof global & {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// In development, store on global to survive HMR (Hot Module Replacement)
// In production, this ensures singleton across serverless function reuse
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown - disconnect Prisma on process termination
// This prevents idle connections from staying open and consuming RAM
if (process.env.NODE_ENV === 'production') {
  const cleanup = async () => {
    await db.$disconnect();
    console.log('Prisma disconnected gracefully');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', cleanup);
}
