import { getCurrentUser } from '@/lib/session';
import { CheckoutClient } from './_components/CheckoutClient';

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  return <CheckoutClient user={user || null} />;
}
