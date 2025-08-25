import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Shared types to match the import script expectations
export type VehicleEngine = {
  engineType: string;
  enginePowerKW?: number | null;
  enginePowerHP?: number | null;
  engineCapacity?: number | null;
  engineCode?: string | null;
  description?: string | null;
  // Optional alternative input keys we may normalize from
  enginePower_kW?: number | number[] | null;
  enginePower_HP?: number | number[] | null;
  engineCapacity_cm3?: number | null;
  engineCodes?: string[];
};

export type VehicleGeneration = {
  name: string;
  period?: string | null;
  bodyStyles?: string[];
  engines?: VehicleEngine[];
};

export type VehicleModel = {
  name: string;
  generations?: VehicleGeneration[];
};

export type VehicleBrand = {
  name: string;
  type: 'PASSENGER' | 'COMMERCIAL';
  models?: VehicleModel[];
};

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function normalizeEngineInputs(e: any): VehicleEngine[] {
  const engineType = e.engineType as string;
  const capacity = (e.engineCapacity_cm3 ?? e.engineCapacity) as number | null | undefined;
  const desc = (e.description ?? null) as string | null;
  const codes: (string | null)[] = Array.isArray(e.engineCodes) ? (e.engineCodes as string[]) : [e.engineCode ?? null];

  const pKW = e.enginePower_kW ?? e.enginePowerKW ?? null;
  const pHP = e.enginePower_HP ?? e.enginePowerHP ?? null;

  const normalized: VehicleEngine[] = [];

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
    normalized.push({
      engineType,
      engineCapacity: capacity ?? null,
      enginePowerKW: (pKW as number | null) ?? null,
      enginePowerHP: (pHP as number | null) ?? null,
      engineCode: (codes[0] ?? null) as string | null,
      description: desc,
    });
  }

  return normalized;
}

function keyModel(name: string) {
  return name.trim();
}

function keyGeneration(name: string) {
  return name.trim();
}

function keyEngine(e: VehicleEngine) {
  if (e.engineCode && e.engineCode.trim().length > 0) {
    return `code::${e.engineCode.trim()}`;
  }
  const t = (e.engineType || '').trim();
  const c = e.engineCapacity ?? null;
  const k = e.enginePowerKW ?? null;
  return `spec::${t}::${c ?? 'null'}::${k ?? 'null'}`;
}

function unionUnique<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
  const arr = [...(a ?? []), ...(b ?? [])];
  if (arr.length === 0) return undefined;
  return Array.from(new Set(arr));
}

function mergeEngines(a: VehicleEngine[] | undefined, b: VehicleEngine[] | undefined): VehicleEngine[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])];
  if (all.length === 0) return undefined;
  const byKey = new Map<string, VehicleEngine>();
  for (const e of all) {
    const normList = normalizeEngineInputs(e);
    for (const n of normList) {
      const k = keyEngine(n);
      if (!byKey.has(k)) {
        byKey.set(k, n);
      } else {
        // Prefer entries that have description or engineCode or HP values
        const prev = byKey.get(k)!;
        const better: VehicleEngine = {
          engineType: n.engineType || prev.engineType,
          engineCapacity: n.engineCapacity ?? prev.engineCapacity ?? null,
          enginePowerKW: n.enginePowerKW ?? prev.enginePowerKW ?? null,
          enginePowerHP: n.enginePowerHP ?? prev.enginePowerHP ?? null,
          engineCode: n.engineCode ?? prev.engineCode ?? null,
          description: n.description ?? prev.description ?? null,
        };
        byKey.set(k, better);
      }
    }
  }
  return Array.from(byKey.values());
}

function mergeGenerations(a: VehicleGeneration[] | undefined, b: VehicleGeneration[] | undefined): VehicleGeneration[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])];
  if (all.length === 0) return undefined;
  const byName = new Map<string, VehicleGeneration>();
  for (const g of all) {
    const k = keyGeneration(g.name);
    if (!byName.has(k)) {
      byName.set(k, {
        name: g.name.trim(),
        period: g.period ?? null,
        bodyStyles: g.bodyStyles && g.bodyStyles.length ? Array.from(new Set(g.bodyStyles)) : undefined,
        engines: mergeEngines(undefined, g.engines),
      });
    } else {
      const prev = byName.get(k)!;
      byName.set(k, {
        name: prev.name,
        period: prev.period ?? g.period ?? null,
        bodyStyles: unionUnique(prev.bodyStyles, g.bodyStyles),
        engines: mergeEngines(prev.engines, g.engines),
      });
    }
  }
  return Array.from(byName.values());
}

function mergeModels(a: VehicleModel[] | undefined, b: VehicleModel[] | undefined): VehicleModel[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])];
  if (all.length === 0) return undefined;
  const byName = new Map<string, VehicleModel>();
  for (const m of all) {
    const k = keyModel(m.name);
    if (!byName.has(k)) {
      byName.set(k, {
        name: m.name.trim(),
        generations: mergeGenerations(undefined, m.generations),
      });
    } else {
      const prev = byName.get(k)!;
      byName.set(k, {
        name: prev.name,
        generations: mergeGenerations(prev.generations, m.generations),
      });
    }
  }
  return Array.from(byName.values());
}

function mergeBrands(brands: VehicleBrand[]): VehicleBrand[] {
  const byBrand = new Map<string, VehicleBrand>();
  for (const b of brands) {
    const key = `${b.name.trim()}::${b.type}`;
    if (!byBrand.has(key)) {
      byBrand.set(key, {
        name: b.name.trim(),
        type: b.type,
        models: mergeModels(undefined, b.models),
      });
    } else {
      const prev = byBrand.get(key)!;
      byBrand.set(key, {
        name: prev.name,
        type: prev.type,
        models: mergeModels(prev.models, b.models),
      });
    }
  }
  return Array.from(byBrand.values());
}

function readVehicleFiles(files: string[]): VehicleBrand[] {
  const allBrands: VehicleBrand[] = [];
  for (const f of files) {
    const full = path.resolve(process.cwd(), f);
    const raw = readFileSync(full, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) allBrands.push(item as VehicleBrand);
    } else if (parsed) {
      allBrands.push(parsed as VehicleBrand);
    }
  }
  return allBrands;
}

function main() {
  // CLI: tsx scripts/merge-vehicles.ts --out vozila/brand-merged.json <file1> <file2> ...
  const args = process.argv.slice(2);
  if (args.length < 3 || args[0] !== '--out') {
    console.error('Usage: npx tsx scripts/merge-vehicles.ts --out <output.json> <input1.json> <input2.json> ...');
    process.exit(1);
  }
  const outPath = args[1];
  const inputs = args.slice(2);

  const brands = readVehicleFiles(inputs);
  if (brands.length === 0) {
    console.error('No brands found in input files.');
    process.exit(1);
  }

  const merged = mergeBrands(brands);

  writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`Merged ${inputs.length} files into ${outPath}`);
}

if (require.main === module) {
  main();
}
