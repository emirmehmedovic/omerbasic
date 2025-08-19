import { VehiclesClient } from './_components/VehiclesClient';
import { db } from '@/lib/db';
import { VehicleBrand, VehicleModel, VehicleGeneration } from '@/types/vehicle';

export const dynamic = 'force-dynamic';

async function getData() {
  const dbVehicleBrands = await db.vehicleBrand.findMany({
    include: {
      models: {
        include: {
          generations: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  // Mapiranje podataka iz baze u tipove koje očekuje komponenta
  const vehicleBrands: VehicleBrand[] = dbVehicleBrands.map(brand => ({
    ...brand,
    models: brand.models.map(model => ({
      ...model,
      generations: model.generations.map(gen => ({
        ...gen,
        // Konverzija string datuma u Date objekte ako postoje
        productionStart: gen.productionStart ? new Date(gen.productionStart) : null,
        productionEnd: gen.productionEnd ? new Date(gen.productionEnd) : null
      }))
    }))
  }));

  return { vehicleBrands };
}

export default async function VehiclesPage() {
  const { vehicleBrands } = await getData();

  return (
    <div className="p-6 space-y-6">
      <VehiclesClient initialVehicleBrands={vehicleBrands} />
    </div>
  );
}
