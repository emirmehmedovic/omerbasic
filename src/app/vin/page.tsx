import dynamic from 'next/dynamic';

const VinClient = dynamic(() => import('./_components/VinClient'), { ssr: false });

export default function VinPage() {
  return <VinClient />;
}
