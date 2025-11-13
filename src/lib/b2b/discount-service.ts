import { db } from '@/lib/db';
import type {
  B2BDiscountStackingStrategy,
  B2BGroupCategoryManufacturerDiscount,
} from '@/generated/prisma/client';

export type DiscountSource =
  | 'BASE'
  | 'USER_CATEGORY'
  | 'GROUP_CATEGORY'
  | 'GROUP_MANUFACTURER'
  | 'GROUP_CATEGORY_MANUFACTURER';

export interface UserDiscountProfile {
  userId: string;
  baseDiscount: number;
  userCategoryDiscounts: Record<string, number>;
  groups: Array<{
    id: string;
    priority: number;
    stackingStrategy: B2BDiscountStackingStrategy;
    categoryDiscounts: Record<string, number>;
    manufacturerDiscounts: Record<string, number>;
    categoryManufacturerDiscounts: Record<string, Record<string, number>>;
  }>;
}

export function calculateB2BPrice(
  basePrice: number,
  profile: UserDiscountProfile | null | undefined,
  context: DiscountResolutionContext
): B2BPricingResolution | null {
  if (!profile) {
    return null;
  }

  const { bestDiscount, source } = resolveEffectiveDiscount(profile, context);

  if (!bestDiscount || bestDiscount <= 0) {
    return null;
  }

  const discountedPrice = Math.max(0, parseFloat((basePrice * (1 - bestDiscount / 100)).toFixed(2)));

  return {
    price: discountedPrice,
    discountPercentage: bestDiscount,
    source,
  };
}

export interface DiscountResolutionContext {
  categoryId?: string | null;
  manufacturerId?: string | null;
}

export interface DiscountResolutionResult {
  baseDiscount: number;
  categoryDiscount: number;
  manufacturerDiscount: number;
  bestDiscount: number;
  source: DiscountSource;
}

export interface B2BPricingResolution {
  price: number;
  discountPercentage: number;
  source: DiscountSource;
}

export async function getUserDiscountProfile(userId: string): Promise<UserDiscountProfile | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      discountPercentage: true,
      categoryDiscounts: {
        select: {
          categoryId: true,
          discountPercentage: true,
        },
      },
      discountGroupMemberships: {
        select: {
          group: {
            select: {
              id: true,
              priority: true,
              stackingStrategy: true,
              categoryDiscounts: {
                select: {
                  categoryId: true,
                  discountPercentage: true,
                },
              },
              manufacturerDiscounts: {
                select: {
                  manufacturerId: true,
                  discountPercentage: true,
                },
              },
              categoryManufacturerDiscounts: {
                select: {
                  categoryId: true,
                  manufacturerId: true,
                  discountPercentage: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const userCategoryDiscounts = Object.fromEntries(
    user.categoryDiscounts.map((cd) => [cd.categoryId, cd.discountPercentage])
  );

  const groups = user.discountGroupMemberships
    .map((membership) => membership.group)
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)
    .map((group) => ({
      id: group.id,
      priority: group.priority,
      stackingStrategy: group.stackingStrategy,
      categoryDiscounts: Object.fromEntries(
        group.categoryDiscounts.map((cd) => [cd.categoryId, cd.discountPercentage])
      ),
      manufacturerDiscounts: Object.fromEntries(
        group.manufacturerDiscounts.map((md) => [md.manufacturerId, md.discountPercentage])
      ),
      categoryManufacturerDiscounts: (() => {
        const acc: Record<string, Record<string, number>> = {};
        for (const cmd of group.categoryManufacturerDiscounts as B2BGroupCategoryManufacturerDiscount[]) {
          if (!acc[cmd.categoryId]) {
            acc[cmd.categoryId] = {};
          }
          acc[cmd.categoryId][cmd.manufacturerId] = cmd.discountPercentage;
        }
        return acc;
      })(),
    }));

  return {
    userId,
    baseDiscount: user.discountPercentage ?? 0,
    userCategoryDiscounts,
    groups,
  };
}

const applyGroupingStrategy = (
  current: number,
  value: number,
  strategy: B2BDiscountStackingStrategy
) => {
  switch (strategy) {
    case 'ADDITIVE':
      return Math.min(100, current + value);
    case 'MAX':
      return Math.max(current, value);
    case 'PRIORITY':
      return current === -1 ? value : current;
    default:
      return Math.max(current, value);
  }
};

const resolveGroupDiscount = (
  groups: UserDiscountProfile['groups'],
  key: string | null | undefined,
  type: 'category' | 'manufacturer'
): number => {
  if (!key) return 0;

  let result = 0;
  let hasValue = false;

  for (const group of groups) {
    const value =
      type === 'category'
        ? group.categoryDiscounts[key] ?? null
        : group.manufacturerDiscounts[key] ?? null;

    if (value === null || value === undefined) {
      continue;
    }

    if (group.stackingStrategy === 'PRIORITY') {
      if (!hasValue) {
        result = value;
        hasValue = true;
      }
      break;
    }

    result = applyGroupingStrategy(hasValue ? result : 0, value, group.stackingStrategy);
    hasValue = true;
  }

  return hasValue ? result : 0;
};

const resolveGroupCategoryManufacturerDiscount = (
  groups: UserDiscountProfile['groups'],
  categoryId?: string | null,
  manufacturerId?: string | null
) => {
  if (!categoryId || !manufacturerId) return 0;

  const discounts: Array<{ value: number; strategy: B2BDiscountStackingStrategy }> = [];

  for (const group of groups) {
    const entry = group.categoryManufacturerDiscounts[categoryId]?.[manufacturerId];
    if (entry !== undefined) {
      discounts.push({ value: entry, strategy: group.stackingStrategy });
      if (group.stackingStrategy === 'PRIORITY') {
        break;
      }
    }
  }

  if (!discounts.length) return 0;

  let result = discounts[0].strategy === 'PRIORITY' ? discounts[0].value : 0;
  let hasValue = discounts[0].strategy === 'PRIORITY';

  for (const { value, strategy } of discounts) {
    if (strategy === 'PRIORITY') {
      return value;
    }
    result = applyGroupingStrategy(hasValue ? result : 0, value, strategy);
    hasValue = true;
  }

  return hasValue ? result : 0;
};

export function resolveEffectiveDiscount(
  profile: UserDiscountProfile,
  context: DiscountResolutionContext
): DiscountResolutionResult {
  const { categoryId, manufacturerId } = context;

  const baseDiscount = profile.baseDiscount ?? 0;

  const userCategoryDiscount = categoryId
    ? profile.userCategoryDiscounts[categoryId] ?? 0
    : 0;

  const groupCategoryDiscount = resolveGroupDiscount(profile.groups, categoryId, 'category');
  const groupManufacturerDiscount = resolveGroupDiscount(
    profile.groups,
    manufacturerId,
    'manufacturer'
  );

  const groupCategoryManufacturerDiscount = resolveGroupCategoryManufacturerDiscount(
    profile.groups,
    categoryId,
    manufacturerId
  );

  const categoryDiscount = Math.max(userCategoryDiscount, groupCategoryDiscount);
  const manufacturerDiscount = groupManufacturerDiscount;
  const categoryManufacturerDiscount = groupCategoryManufacturerDiscount;

  const bestDiscount = Math.max(
    baseDiscount,
    categoryManufacturerDiscount,
    categoryDiscount,
    manufacturerDiscount
  );

  let source: DiscountSource = 'BASE';

  if (bestDiscount === categoryManufacturerDiscount && categoryManufacturerDiscount > 0) {
    source = 'GROUP_CATEGORY_MANUFACTURER';
  } else if (bestDiscount === manufacturerDiscount && manufacturerDiscount > 0) {
    source = 'GROUP_MANUFACTURER';
  } else if (bestDiscount === groupCategoryDiscount && groupCategoryDiscount > 0) {
    source = 'GROUP_CATEGORY';
  } else if (bestDiscount === userCategoryDiscount && userCategoryDiscount > 0) {
    source = 'USER_CATEGORY';
  } else if (bestDiscount === baseDiscount && baseDiscount > 0) {
    source = 'BASE';
  }

  return {
    baseDiscount,
    categoryDiscount,
    manufacturerDiscount,
    bestDiscount,
    source,
  };
}
