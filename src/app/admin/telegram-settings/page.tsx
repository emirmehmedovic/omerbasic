import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/client';
import { TelegramSettingsClient } from './_components/TelegramSettingsClient';

export default async function TelegramSettingsPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== UserRole.ADMIN) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telegram Notifikacije</h1>
        <p className="text-gray-600 mt-1">
          Konfiguriši Telegram bot za automatske notifikacije o narudžbama i zalihama
        </p>
      </div>
      <TelegramSettingsClient />
    </div>
  );
}
