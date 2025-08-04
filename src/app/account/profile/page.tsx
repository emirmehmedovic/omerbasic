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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          Moj profil
        </h1>
        <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-8 border border-white/20">
          <ProfileClient user={user} addresses={addresses} />
        </div>
      </div>
    </div>
  );
}
