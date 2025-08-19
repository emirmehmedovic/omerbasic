import { db } from '@/lib/db';
import { EngineClient } from '../_components/EngineClient';

export const dynamic = 'force-dynamic';

interface EnginePageProps {
  params: Promise<{
    generationId: string;
  }>;
}

async function getData(generationId: string) {
  const generation = await db.vehicleGeneration.findUnique({
    where: { id: generationId },
    include: {
      model: {
        include: {
          brand: true
        }
      }
    }
  });

  if (!generation) {
    throw new Error('Generacija vozila nije pronađena');
  }

  const engines = await db.vehicleEngine.findMany({
    where: { generationId },
    orderBy: { createdAt: 'desc' }
  });
  
  // Konvertiranje Date objekata u stringove za kompatibilnost s VehicleEngine tipom
  const formattedEngines = engines.map(engine => ({
    ...engine,
    createdAt: engine.createdAt.toISOString(),
    updatedAt: engine.updatedAt.toISOString()
  }));

  return { generation, engines: formattedEngines };
}

export default async function EnginePage({ params }: EnginePageProps) {
  const { generationId } = await params;
  const { generation, engines } = await getData(generationId);

  return (
    <div className="p-6 space-y-6">
      <EngineClient 
        initialEngines={engines}
        generation={generation}
        brandId={generation.model.brand.id}
        modelId={generation.model.id}
        generationId={generation.id}
      />
    </div>
  );
}
