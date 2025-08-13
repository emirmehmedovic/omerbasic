import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

type VehicleEngineInput = {
  engineType: string;
  enginePowerKW?: number | null;
  enginePowerHP?: number | null;
  engineCapacity?: number | null;
  engineCode?: string | null;
  description?: string | null;
};

type VehicleGenerationInput = {
  name: string;
  period?: string | null;
  bodyStyles?: string[];
  engines?: VehicleEngineInput[];
};

type VehicleModelInput = {
  name: string;
  generations?: VehicleGenerationInput[];
};

type VehicleBrandInput = {
  name: string;
  type: 'PASSENGER' | 'COMMERCIAL';
  models?: VehicleModelInput[];
};

async function upsertBrand(brand: VehicleBrandInput) {
  // Upsert by unique (name) if you have it; otherwise findFirst
  let dbBrand = await db.vehicleBrand.findUnique({ where: { name: brand.name } }).catch(() => null);
  if (!dbBrand) {
    // If schema uses composite uniqueness (name+type), fall back to findFirst
    dbBrand = await db.vehicleBrand.findFirst({ where: { name: brand.name, type: brand.type } });
  }

  if (!dbBrand) {
    dbBrand = await db.vehicleBrand.create({ data: { name: brand.name, type: brand.type as any } });
    console.log(`Created brand: ${brand.name} (${brand.type})`);
  } else if (dbBrand.type !== brand.type) {
    // Keep name stable, update type if different
    dbBrand = await db.vehicleBrand.update({ where: { id: dbBrand.id }, data: { type: brand.type as any } });
    console.log(`Updated brand type: ${brand.name} -> ${brand.type}`);
  }

  return dbBrand;
}

async function upsertModel(brandId: string, model: VehicleModelInput) {
  let dbModel = await db.vehicleModel.findFirst({ where: { name: model.name, brandId } });
  if (!dbModel) {
    dbModel = await db.vehicleModel.create({ data: { name: model.name, brandId } });
    console.log(`  Created model: ${model.name}`);
  }
  return dbModel;
}

async function upsertGeneration(modelId: string, gen: VehicleGenerationInput) {
  let dbGen = await db.vehicleGeneration.findFirst({ where: { name: gen.name, modelId } });
  const bodyStyles: any = (gen.bodyStyles && gen.bodyStyles.length > 0) ? gen.bodyStyles : null;

  if (!dbGen) {
    dbGen = await db.vehicleGeneration.create({
      data: {
        name: gen.name,
        period: gen.period ?? null,
        bodyStyles: bodyStyles,
        modelId,
      },
    });
    console.log(`    Created generation: ${gen.name}`);
  } else {
    dbGen = await db.vehicleGeneration.update({
      where: { id: dbGen.id },
      data: {
        period: gen.period ?? null,
        bodyStyles: bodyStyles,
      },
    });
    console.log(`    Updated generation: ${gen.name}`);
  }

  return dbGen;
}

async function upsertEngine(generationId: string, engine: VehicleEngineInput) {
  const matchByCode = engine.engineCode ? { generationId, engineCode: engine.engineCode } : null;

  let dbEngine = matchByCode
    ? await db.vehicleEngine.findFirst({ where: matchByCode })
    : await db.vehicleEngine.findFirst({
        where: {
          generationId,
          engineType: engine.engineType,
          engineCapacity: engine.engineCapacity ?? null,
          enginePowerKW: engine.enginePowerKW ?? null,
        },
      });

  const data = {
    generationId,
    engineType: engine.engineType as any,
    enginePowerKW: engine.enginePowerKW ?? null,
    enginePowerHP: engine.enginePowerHP ?? null,
    engineCapacity: engine.engineCapacity ?? null,
    engineCode: engine.engineCode ?? null,
    description: engine.description ?? null,
  } as const;

  if (!dbEngine) {
    await db.vehicleEngine.create({ data });
    console.log(`      Created engine: ${engine.engineCode ?? `${engine.engineType} ${engine.engineCapacity ?? ''}cc ${engine.enginePowerKW ?? ''}kW`}`);
  } else {
    await db.vehicleEngine.update({ where: { id: dbEngine.id }, data });
    console.log(`      Updated engine: ${engine.engineCode ?? dbEngine.id}`);
  }
}

async function importFromFile(filePath: string) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = readFileSync(fullPath, 'utf-8');
  const parsed = JSON.parse(raw) as any[];

  for (const brand of parsed) {
    const mappedBrand: VehicleBrandInput = {
      name: brand.name,
      type: brand.type,
      models: (brand.models ?? []).map((m: any) => ({
        name: m.name,
        generations: (m.generations ?? []).map((g: any) => ({
          name: g.name,
          period: g.period ?? null,
          bodyStyles: g.bodyStyles ?? undefined,
          // engines will be normalized later when inserting
          engines: (g.engines ?? []) as any,
        })),
      })),
    };

    const dbBrand = await upsertBrand(mappedBrand);
    if (!mappedBrand.models?.length) continue;

    for (const model of mappedBrand.models) {
      const dbModel = await upsertModel(dbBrand.id, model);
      if (!model.generations?.length) continue;

      for (const gen of model.generations) {
        const dbGen = await upsertGeneration(dbModel.id, gen);
        if (!gen.engines || (gen.engines as any[]).length === 0) continue;

        // Normalize engines: map snake_case fields and expand arrays
        const normalized: VehicleEngineInput[] = [];
        for (const e of gen.engines as any[]) {
          const engineType = e.engineType as string;
          const capacity = (e.engineCapacity_cm3 ?? e.engineCapacity) as number | null | undefined;
          const desc = (e.description ?? null) as string | null;
          const codes: (string | null)[] = Array.isArray(e.engineCodes)
            ? (e.engineCodes as string[])
            : [e.engineCode ?? null];

          const pKW = e.enginePower_kW ?? e.enginePowerKW ?? null;
          const pHP = e.enginePower_HP ?? e.enginePowerHP ?? null;

          // Cases:
          // 1) Arrays for power and codes of equal length -> zip by index
          if (Array.isArray(pKW) || Array.isArray(pHP)) {
            const arrKW: (number | null)[] = Array.isArray(pKW) ? pKW : new Array((Array.isArray(pHP) ? pHP.length : (codes.filter(Boolean).length || 1))).fill(pKW ?? null);
            const arrHP: (number | null)[] = Array.isArray(pHP) ? pHP : new Array(arrKW.length).fill(pHP ?? null);
            const length = Math.max(arrKW.length, arrHP.length, codes.length);
            for (let i = 0; i < length; i++) {
              normalized.push({
                engineType,
                engineCapacity: capacity ?? null,
                enginePowerKW: arrKW[i] ?? null,
                enginePowerHP: arrHP[i] ?? null,
                engineCode: (codes[i] ?? codes[0] ?? null) as string | null,
                description: desc,
              });
            }
          } else if (codes.length > 1) {
            // 2) Multiple codes with single power values -> one per code
            for (const c of codes) {
              normalized.push({
                engineType,
                engineCapacity: capacity ?? null,
                enginePowerKW: (pKW as number | null) ?? null,
                enginePowerHP: (pHP as number | null) ?? null,
                engineCode: c,
                description: desc,
              });
            }
          } else {
            // 3) Single entry
            normalized.push({
              engineType,
              engineCapacity: capacity ?? null,
              enginePowerKW: (pKW as number | null) ?? null,
              enginePowerHP: (pHP as number | null) ?? null,
              engineCode: (codes[0] ?? null) as string | null,
              description: desc,
            });
          }
        }

        for (const eng of normalized) {
          await upsertEngine(dbGen.id, eng);
        }
      }
    }
  }
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npx tsx scripts/import-vehicles.ts <path-to-json>');
    process.exit(1);
  }
  console.log(`Importing vehicles from: ${fileArg}`);
  await importFromFile(fileArg);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
