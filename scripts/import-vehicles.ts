import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

type VehicleEngineInput = {
  externalId: string;
  engineType: string;
  enginePowerKW?: number | null;
  enginePowerHP?: number | null;
  engineCapacity?: number | null;
  engineCode?: string | null;
  description?: string | null;
  cylinders?: string | null;
  engineCodes?: string[];
  yearFrom?: Date | null;
  yearTo?: Date | null;
  source?: string | null;
};

type VehicleGenerationInput = {
  externalId: string;
  name: string;
  period?: string | null;
  productionStart?: Date | null;
  productionEnd?: Date | null;
  engines?: VehicleEngineInput[];
};

type VehicleModelInput = {
  externalId: string;
  name: string;
  period?: string | null;
  productionStart?: Date | null;
  productionEnd?: Date | null;
  generations: VehicleGenerationInput[];
};

type VehicleBrandInput = {
  name: string;
  externalId: string;
  type: 'PASSENGER' | 'COMMERCIAL';
  source?: string | null;
  models: VehicleModelInput[];
};

type ImportContext = {
  dryRun: boolean;
  limitBrands?: number;
  limitModels?: number;
  limitEngines?: number;
};

const DRY_PREFIX = '__dry__:';

function createStub(id: string, data: Record<string, unknown>) {
  return { id, ...data } as any;
}

function isDryId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(DRY_PREFIX);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePeriod(period: string | null | undefined): { start?: Date | null; end?: Date | null } {
  if (!period) return {};
  const normalized = period.replace(/\s+/g, ' ').trim();
  if (!normalized) return {};
  const [startRaw, endRaw] = normalized.split(/-|–|—/).map(part => part?.trim() ?? '');
  const start = startRaw ? parseDate(`${startRaw}-01-01`) : null;
  const end = endRaw ? parseDate(endRaw === '' ? null : `${endRaw}-01-01`) : null;
  return { start, end };
}

async function upsertBrand(brand: VehicleBrandInput, ctx: ImportContext): Promise<any> {
  const where = brand.externalId ? { externalId: brand.externalId } : { name: brand.name };
  let dbBrand = await db.vehicleBrand.findFirst({ where }).catch(() => null);

  if (!dbBrand) {
    if (ctx.dryRun) {
      console.log(`[dry-run] Would create brand: ${brand.name} (${brand.type}) [ext=${brand.externalId}]`);
      return createStub(`${DRY_PREFIX}brand:${brand.externalId ?? brand.name}`, {
        name: brand.name,
        type: brand.type,
        externalId: brand.externalId,
        source: brand.source ?? null,
      });
    }
    dbBrand = await db.vehicleBrand.create({
      data: {
        name: brand.name,
        type: brand.type as any,
        externalId: brand.externalId,
        source: brand.source ?? null,
      },
    });
    console.log(`Created brand: ${brand.name} (${brand.type}) [ext=${brand.externalId}]`);
  } else {
    const updates: Record<string, unknown> = {};
    if (dbBrand.type !== brand.type) updates.type = brand.type;
    if (brand.externalId && dbBrand.externalId !== brand.externalId) updates.externalId = brand.externalId;
    if (brand.source && dbBrand.source !== brand.source) updates.source = brand.source;

    if (Object.keys(updates).length > 0) {
      if (ctx.dryRun) {
        console.log(`[dry-run] Would update brand ${brand.name}:`, updates);
      } else {
        dbBrand = await db.vehicleBrand.update({ where: { id: dbBrand.id }, data: updates });
        console.log(`Updated brand: ${brand.name}`);
      }
    }
  }

  return dbBrand;
}

async function upsertModel(brandId: string, model: VehicleModelInput, ctx: ImportContext): Promise<any> {
  let dbModel = null as Awaited<ReturnType<typeof db.vehicleModel.findFirst>>;

  if (!(ctx.dryRun && isDryId(brandId))) {
    if (model.externalId) {
      dbModel = await db.vehicleModel.findFirst({
        where: {
          brandId,
          externalId: model.externalId,
        },
      });
    }

    if (!dbModel) {
      dbModel = await db.vehicleModel.findFirst({
        where: {
          brandId,
          name: {
            equals: model.name,
            mode: 'insensitive',
          },
        },
      });
    }
  }

  const data = {
    name: model.name,
    externalId: model.externalId,
    period: model.period ?? null,
    productionStart: model.productionStart ?? null,
    productionEnd: model.productionEnd ?? null,
    brandId,
  };

  if (!dbModel) {
    if (ctx.dryRun) {
      console.log(`[dry-run] Would create model: ${model.name} [ext=${model.externalId}]`);
      return createStub(`${DRY_PREFIX}model:${brandId}:${model.externalId ?? model.name}`, data);
    }
    dbModel = await db.vehicleModel.create({ data });
    console.log(`  Created model: ${model.name} [ext=${model.externalId}]`);
  } else {
    const updates: Record<string, unknown> = {};
    if (dbModel.name !== model.name) updates.name = model.name;
    if (dbModel.externalId !== model.externalId) updates.externalId = model.externalId;
    if (dbModel.period !== model.period) updates.period = model.period ?? null;
    if (dbModel.productionStart?.toISOString() !== model.productionStart?.toISOString()) updates.productionStart = model.productionStart ?? null;
    if (dbModel.productionEnd?.toISOString() !== model.productionEnd?.toISOString()) updates.productionEnd = model.productionEnd ?? null;

    if (Object.keys(updates).length > 0) {
      if (ctx.dryRun) {
        console.log(`[dry-run] Would update model ${model.name}:`, updates);
        dbModel = { ...dbModel, ...updates };
      } else {
        dbModel = await db.vehicleModel.update({ where: { id: dbModel.id }, data: updates });
        console.log(`  Updated model: ${model.name}`);
      }
    }
  }

  return dbModel;
}

async function upsertGeneration(modelId: string, gen: VehicleGenerationInput, ctx: ImportContext): Promise<any> {
  let dbGen = await db.vehicleGeneration.findFirst({
    where: {
      modelId,
      name: {
        equals: gen.name,
        mode: 'insensitive',
      },
    },
  });

  const data = {
    name: gen.name,
    period: gen.period ?? null,
    productionStart: gen.productionStart ? gen.productionStart.toISOString() : null,
    productionEnd: gen.productionEnd ? gen.productionEnd.toISOString() : null,
    modelId,
  };

  if (!dbGen) {
    if (ctx.dryRun) {
      console.log(`[dry-run] Would create generation: ${gen.name}`);
      return createStub(`${DRY_PREFIX}generation:${modelId}:${gen.name}`, data);
    }
    dbGen = await db.vehicleGeneration.create({ data });
    console.log(`    Created generation: ${gen.name}`);
  } else {
    const updates: Record<string, unknown> = {};
    const productionStartStr = gen.productionStart ? gen.productionStart.toISOString() : null;
    const productionEndStr = gen.productionEnd ? gen.productionEnd.toISOString() : null;
    if (dbGen.period !== gen.period) updates.period = gen.period ?? null;
    if (dbGen.productionStart !== productionStartStr) updates.productionStart = productionStartStr;
    if (dbGen.productionEnd !== productionEndStr) updates.productionEnd = productionEndStr;

    if (Object.keys(updates).length > 0) {
      if (ctx.dryRun) {
        console.log(`[dry-run] Would update generation: ${gen.name}`);
        dbGen = { ...dbGen, ...updates };
      } else {
        dbGen = await db.vehicleGeneration.update({ where: { id: dbGen.id }, data: updates });
        console.log(`    Updated generation: ${gen.name}`);
      }
    }
  }

  return dbGen;
}

async function upsertEngine(generationId: string, engine: VehicleEngineInput, ctx: ImportContext): Promise<void> {
  const normalizedType = (engine.engineType ?? 'UNKNOWN').trim().toUpperCase();
  let dbEngine = null as Awaited<ReturnType<typeof db.vehicleEngine.findFirst>>;

  if (!(ctx.dryRun && isDryId(generationId))) {
    if (engine.externalId) {
      dbEngine = await db.vehicleEngine.findFirst({
        where: {
          generationId,
          externalId: engine.externalId,
        },
      });
    }

    if (!dbEngine && engine.engineCode) {
      const candidate = await db.vehicleEngine.findFirst({
        where: {
          generationId,
          engineCode: engine.engineCode,
        },
      });

      if (candidate && (candidate.externalId == null || candidate.externalId === engine.externalId)) {
        dbEngine = candidate;
      }
    }
  }

  const data = {
    generationId,
    engineType: normalizedType,
    enginePowerKW: engine.enginePowerKW ?? null,
    enginePowerHP: engine.enginePowerHP ?? null,
    engineCapacity: engine.engineCapacity ?? null,
    engineCode: engine.engineCode ?? null,
    description: engine.description ?? null,
    externalId: engine.externalId ?? null,
    cylinders: engine.cylinders ?? null,
    engineCodes: engine.engineCodes ?? [],
    yearFrom: engine.yearFrom ?? null,
    yearTo: engine.yearTo ?? null,
    source: engine.source ?? null,
  };

  if (!dbEngine) {
    if (ctx.dryRun) {
      console.log(`[dry-run] Would create engine: ${engine.externalId ?? engine.engineCode ?? normalizedType}`);
    } else {
      await db.vehicleEngine.create({ data });
      console.log(`      Created engine: ${engine.externalId ?? engine.engineCode ?? normalizedType}`);
    }
  } else {
    const updates: Record<string, unknown> = {};
    if (dbEngine.engineType !== normalizedType) updates.engineType = normalizedType;
    if (dbEngine.enginePowerKW !== engine.enginePowerKW) updates.enginePowerKW = engine.enginePowerKW ?? null;
    if (dbEngine.enginePowerHP !== engine.enginePowerHP) updates.enginePowerHP = engine.enginePowerHP ?? null;
    if (dbEngine.engineCapacity !== engine.engineCapacity) updates.engineCapacity = engine.engineCapacity ?? null;
    if (dbEngine.engineCode !== engine.engineCode) updates.engineCode = engine.engineCode ?? null;
    if (dbEngine.description !== engine.description) updates.description = engine.description ?? null;
    if (dbEngine.cylinders !== engine.cylinders) updates.cylinders = engine.cylinders ?? null;
    const existingCodes = Array.isArray(dbEngine.engineCodes) ? dbEngine.engineCodes : [];
    const incomingCodes = engine.engineCodes ?? [];
    const codesDiffer = existingCodes.length !== incomingCodes.length
      || existingCodes.some(code => !incomingCodes.includes(code));
    if (codesDiffer) updates.engineCodes = incomingCodes;
    if (dbEngine.yearFrom?.toISOString() !== engine.yearFrom?.toISOString()) updates.yearFrom = engine.yearFrom ?? null;
    if (dbEngine.yearTo?.toISOString() !== engine.yearTo?.toISOString()) updates.yearTo = engine.yearTo ?? null;
    if (dbEngine.source !== engine.source) updates.source = engine.source ?? null;
    if (dbEngine.externalId !== engine.externalId) updates.externalId = engine.externalId ?? null;

    if (Object.keys(updates).length > 0) {
      if (ctx.dryRun) {
        console.log(`[dry-run] Would update engine: ${engine.externalId ?? dbEngine.id}`, updates);
      } else {
        await db.vehicleEngine.update({ where: { id: dbEngine.id }, data: updates });
        console.log(`      Updated engine: ${engine.externalId ?? dbEngine.id}`);
      }
    }
  }
}

type CatalogManufacturer = {
  name: string;
  type: 'PASSENGER' | 'COMMERCIAL';
  models: CatalogModel[];
};

type CatalogModel = {
  model_id: string;
  name: string;
  period?: string | null;
  engines: CatalogEngine[];
};

type CatalogEngine = {
  engine_id: string;
  engine_type: string;
  engine_capacity?: number | null;
  engine_power_kw?: number | null;
  engine_power_hp?: number | null;
  engine_code?: string | null;
  engine_codes?: string[];
  cylinders?: string | null;
  description?: string | null;
  year_from?: string | null;
  year_to?: string | null;
};

function mapCatalogToImportStructure(raw: any, source: string | null): VehicleBrandInput[] {
  const manufacturers: CatalogManufacturer[] = Array.isArray(raw?.manufacturers) ? raw.manufacturers : [];

  return manufacturers.map((brand) => {
    const models = (brand.models ?? []) as CatalogModel[];
    const normalizedName = brand.name.replace(/\s+/g, ' ').trim();
    const canonicalName = (() => {
      const compact = normalizedName.replace(/[-–—\s]+/g, '').toLowerCase();
      if (compact === 'mercedesbenz') return 'Mercedes-Benz';
      if (compact === 'vauxhall') return 'Opel';
      return normalizedName;
    })();
    return {
      name: canonicalName,
      externalId: canonicalName,
      type: brand.type ?? 'PASSENGER',
      source,
      models: models.map((model) => {
        const periodInfo = parsePeriod(model.period ?? null);
        const generations: VehicleGenerationInput[] = [
          {
            externalId: model.model_id,
            name: model.name,
            period: model.period ?? null,
            productionStart: periodInfo.start ?? null,
            productionEnd: periodInfo.end ?? null,
            engines: (model.engines ?? []).map((engine) => ({
              externalId: engine.engine_id,
              engineType: engine.engine_type ?? 'UNKNOWN',
              engineCapacity: engine.engine_capacity ?? null,
              enginePowerKW: engine.engine_power_kw ?? null,
              enginePowerHP: engine.engine_power_hp ?? null,
              engineCode: engine.engine_code
                ? engine.engine_code.split(',')[0]?.trim() ?? engine.engine_code
                : engine.engine_codes?.[0] ?? null,
              engineCodes: uniqueStrings([
                ...(engine.engine_codes ?? []),
                ...(engine.engine_code ? engine.engine_code.split(',') : []),
              ]),
              description: engine.description ?? null,
              cylinders: engine.cylinders != null ? String(engine.cylinders) : null,
              yearFrom: parseDate(engine.year_from ?? null),
              yearTo: parseDate(engine.year_to ?? null),
              source,
            })),
          },
        ];

        return {
          externalId: model.model_id,
          name: model.name,
          period: model.period ?? null,
          productionStart: periodInfo.start ?? null,
          productionEnd: periodInfo.end ?? null,
          generations,
        };
      }),
    } satisfies VehicleBrandInput;
  });
}

async function importFromFile(filePath: string, ctx: ImportContext) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const rawContent = readFileSync(fullPath, 'utf-8');
  const parsed = JSON.parse(rawContent) as any;
  const source = parsed?.metadata?.source ?? null;
  const brands = mapCatalogToImportStructure(parsed, source);

  let brandCount = 0;
  for (const brand of brands) {
    brandCount += 1;
    if (ctx.limitBrands && brandCount > ctx.limitBrands) break;

    const dbBrand = await upsertBrand(brand, ctx);
    let modelCount = 0;
    for (const model of brand.models) {
      modelCount += 1;
      if (ctx.limitModels && modelCount > ctx.limitModels) break;

      const dbModel = await upsertModel(dbBrand.id, model, ctx);
      for (const generation of model.generations) {
        const dbGen = await upsertGeneration(dbModel.id, generation, ctx);
        if (!dbGen) continue;
        let engineCount = 0;
        for (const engine of generation.engines ?? []) {
          engineCount += 1;
          if (ctx.limitEngines && engineCount > ctx.limitEngines) break;
          await upsertEngine(dbGen.id, engine, ctx);
        }
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(arg => !arg.startsWith('--'));
  if (!fileArg) {
    console.error('Usage: tsx scripts/import-vehicles.ts <path-to-json> [--dry-run]');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const getNumberArg = (flag: string): number | undefined => {
    const prefix = `${flag}=`;
    const raw = args.find(arg => arg.startsWith(prefix));
    if (!raw) return undefined;
    const value = Number(raw.slice(prefix.length));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };

  const ctx: ImportContext = {
    dryRun,
    limitBrands: getNumberArg('--limit-brands'),
    limitModels: getNumberArg('--limit-models'),
    limitEngines: getNumberArg('--limit-engines'),
  };

  if (dryRun) {
    console.log('Running in DRY RUN mode – no database writes will be performed.');
  }
  console.log(`Importing vehicles from: ${fileArg}`);
  await importFromFile(fileArg, ctx);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
