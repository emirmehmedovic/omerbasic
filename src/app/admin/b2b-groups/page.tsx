import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { B2BGroupsClient } from './_components/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/client';

async function getGroups() {
  const groups = await db.b2BDiscountGroup.findMany({
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    include: {
      members: {
        select: {
          id: true,
          assignedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              discountPercentage: true,
            },
          },
        },
      },
      categoryDiscounts: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      manufacturerDiscounts: {
        include: {
          manufacturer: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      categoryManufacturerDiscounts: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          manufacturer: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  const manufacturers = await db.manufacturer.findMany({
    orderBy: { name: 'asc' },
  });

  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      parentId: true,
    },
  });

  const b2bUsers = await db.user.findMany({
    where: { role: UserRole.B2B },
    orderBy: { companyName: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      discountPercentage: true,
    },
  });

  return { groups, manufacturers, categories, b2bUsers };
}

export default async function B2BGroupsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.ADMIN) {
    notFound();
  }

  const data = await getGroups();

  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={<div>Učitavanje...</div>}>
        <B2BGroupsClient
          groups={data.groups}
          manufacturers={data.manufacturers}
          categories={data.categories}
          users={data.b2bUsers}
        />
      </Suspense>
    </div>
  );
}
