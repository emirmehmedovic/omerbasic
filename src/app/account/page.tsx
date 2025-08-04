import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { ManageAddresses } from '@/components/ManageAddresses';
import { BillingInfoForm } from '@/components/BillingInfoForm';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/account');
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-gray-900">Moj nalog</h1>
      <div className="space-y-8">
        <ChangePasswordForm />
        <ManageAddresses />
        <BillingInfoForm />
      </div>
    </div>
  );
}
