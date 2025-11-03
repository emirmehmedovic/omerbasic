import { Suspense } from 'react';
import VinClient from './_components/VinClient';

export default function VinPage() {
  return (
    <Suspense fallback={null}>
      <VinClient />
    </Suspense>
  );
}
