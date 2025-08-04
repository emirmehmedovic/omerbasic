'use client';

import { useRouter } from 'next/navigation';
import VehicleSelector from './vehicle-selector';

const VehicleSelectorRedirect = () => {
  const router = useRouter();

  const handleGenerationSelect = (generationId: string) => {
    if (generationId) {
      router.push(`/search?generationId=${generationId}`);
    }
  };

  return <VehicleSelector onGenerationSelect={handleGenerationSelect} />;
};

export default VehicleSelectorRedirect;
