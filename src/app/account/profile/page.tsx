import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/app/account/profile/_components/ProfileClient';
import { db } from '@/lib/db';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const addresses = await db.address.findMany({
    where: {
      userId: user.id,
    },
  });

  return (
    <ProfileClient user={user} addresses={addresses} />
  );
}
