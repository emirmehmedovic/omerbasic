import { db } from '@/lib/db';
import VehicleProductLinker from './_components/VehicleProductLinker';

export const dynamic = 'force-dynamic';

interface LinkPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LinkPage({ searchParams }: LinkPageProps) {
  const params = await searchParams;
  const generationId = (params?.generationId as string) || '';

  const generation = generationId
    ? await db.vehicleGeneration.findUnique({
        where: { id: generationId },
        include: { model: { include: { brand: true } } },
      })
    : null;

  const engines = generationId
    ? await db.vehicleEngine.findMany({ where: { generationId }, orderBy: { createdAt: 'desc' } })
    : [];

  return (
    <div className="p-6 space-y-6">
      <VehicleProductLinker
        initialGeneration={generation ? {
          id: generation.id,
          name: generation.name,
          model: { id: generation.model.id, name: generation.model.name, brand: { id: generation.model.brand.id, name: generation.model.brand.name } },
        } : null}
        initialEngines={engines.map(e => ({
          id: e.id,
          code: e.engineCode,
          label: e.engineCode || e.description || e.id,
          description: e.description,
          enginePowerKW: e.enginePowerKW,
          enginePowerHP: e.enginePowerHP,
          engineCapacity: e.engineCapacity,
          engineType: e.engineType,
        }))}
      />
    </div>
  );
}
