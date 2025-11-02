import fs from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

/**
 * Importer: Read products-linking/*.json and upsert VehicleBrand/Model/Generation/Engine,
 * then link Products by OEM to generations/engines.
 *
 * Usage examples:
 *   npx tsx scripts/import-products-linking.ts --dry-run --report import-report.csv
 *   npx tsx scripts/import-products-linking.ts --create-missing
 */

type CliOptions = {
  dryRun: boolean;
  createMissing: boolean;
  reportPath: string | null;
  brandFilter: string | null;
  oemRegex: string | null;
  oemSource: 'both' | 'product' | 'crossref';
  limit?: number;
  applyModelEnginesToGens: boolean;
};

const DEFAULTS: CliOptions = {
  dryRun: false,
  createMissing: true,
  reportPath: null,
  brandFilter: null,
  oemRegex: null,
  oemSource: 'both',
  limit: undefined,
  applyModelEnginesToGens: false,
};

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { ...DEFAULTS };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-create-missing') opts.createMissing = false;
    else if (a === '--create-missing') opts.createMissing = true;
    else if (a === '--report' && args[i + 1]) opts.reportPath = args[++i];
    else if (a === '--brand' && args[i + 1]) opts.brandFilter = args[++i].toUpperCase();
    else if (a === '--oem' && args[i + 1]) opts.oemRegex = args[++i];
    else if (a === '--oem-source' && args[i + 1]) {
      const v = (args[++i] as any) as CliOptions['oemSource'];
      if (v === 'both' || v === 'product' || v === 'crossref') opts.oemSource = v;
    }
    else if (a === '--limit' && args[i + 1]) opts.limit = Number(args[++i]);
    else if (a === '--apply-model-engines-to-gens') opts.applyModelEnginesToGens = true;
  }
  return opts;
}

// Extract base model and embedded generation tokens from model name.
// Examples:
//  - "Passat B3/B4" -> model: "Passat", gens: ["B3", "B4"]
//  - "Golf Mk2/Mk3" -> model: "Golf", gens: ["Mk2", "Mk3"]
//  - "A4" -> model: "A4", gens: []
function decomposeModelAndGenerations(modelName: string): { model: string; gens: string[] } {
  const name = modelName.trim();
  // Pattern: <base> <genTokens joined by />
  // genToken := B\d(\.\d)? | Mk\d(\.\d+)? | [IVX]{1,4} | platform code like 8L/8P/9N/6N2/W203/T5
  const token = '(?:B\\d(?:\\.\\d)?|Mk\\d(?:\\.\\d+)?|[IVX]{1,4}|[A-Z]?\\d[A-Z0-9]{0,3})';
  const m = name.match(new RegExp(`^(.*?)\\s+((${token})(?:\\s*\\/\\s*${token})+)$$`, 'i'));
  if (m) {
    const base = m[1].trim();
    const gens = m[2].split('/').map(s => s.trim()).filter(Boolean);
    return { model: base || name, gens };
  }
  // Pattern: <base> <single genToken> (e.g., "Tiguan II")
  const m2 = name.match(new RegExp(`^(.*?)\\s+(${token})$`, 'i'));
  if (m2) {
    const base = m2[1].trim();
    const gen = m2[2].trim();
    // Require non-empty base; otherwise treat whole name as model (e.g., 'A4' should remain model 'A4')
    if (base) {
      return { model: base, gens: [gen] };
    }
  }
  return { model: name, gens: [] };
}

function upper(s: string) { return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toUpperCase(); }

function brandAcronym(name: string): string {
  const u = upper(name);
  // Take first letter of each alphanumeric cluster split by space/hyphen
  const parts = u.split(/[\s-]+/).filter(Boolean);
  return parts.map(p => p[0]).join('');
}

const BRAND_ALIAS: Record<string, string[]> = {
  'VW': ['VOLKSWAGEN'],
  'VAG': ['VOLKSWAGEN', 'AUDI', 'SEAT', 'SKODA'],
  'MB': ['MERCEDES', 'MERCEDES BENZ', 'MERCEDES-BENZ'],
  'MERCEDES': ['MERCEDES-BENZ', 'MERCEDES BENZ'],
  'SKODA': ['ŠKODA', 'SKODA'],
};

function matchesBrandFilter(brandName: string, filterUpper: string): boolean {
  if (!filterUpper) return true;
  const bU = upper(brandName);
  if (bU.includes(filterUpper)) return true;
  if (brandAcronym(brandName) === filterUpper) return true;
  const aliasTargets = BRAND_ALIAS[filterUpper];
  if (aliasTargets) {
    for (const t of aliasTargets) {
      if (bU.includes(t)) return true;
    }
  }
  return false;
}

// IO helpers
function listJsonFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) continue;
    if (e.isFile() && p.endsWith('.json')) files.push(p);
  }
  return files.sort();
}

function readJsonFile<T = any>(file: string): T | null {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    return data as T;
  } catch (e) {
    console.error(`Failed to read JSON ${file}:`, (e as Error).message);
    return null;
  }
}

// Normalizers
function normalizeOEMToken(tok: string): string {
  return tok.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function splitOEMField(field: string): string[] {
  if (!field) return [];
  return field
    .split(/[\/,|]|\s{2,}|\s-\s|\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeOEMToken)
    .filter(Boolean);
}

function splitCombinedGenerations(name: string): string[] {
  const n = name.trim();
  // e.g., "B6/B7", "Mk2 / Mk3", "B5 / B5.5"
  if (/[\/]/.test(n)) {
    return n.split('/').map(s => s.trim()).filter(Boolean);
  }
  return [n];
}

function parsePeriod(period?: string | null): { from?: number; to?: number } {
  if (!period) return {};
  const p = period.replace(/–/g, '-');
  const m = p.match(/(\d{4})\s*-\s*(\d{2,4})?/);
  if (!m) return {};
  const from = Number(m[1]);
  let to: number | undefined;
  if (m[2]) {
    const raw = m[2];
    to = raw.length === 2 ? Number('20' + raw) : Number(raw);
  }
  return { from, to };
}

// DB helpers
async function upsertBrand(name: string, vtype: 'PASSENGER' | 'COMMERCIAL', createMissing: boolean) {
  const brand = await db.vehicleBrand.findFirst({ where: { name } });
  if (brand) return brand;
  if (!createMissing) return null;
  return await db.vehicleBrand.create({ data: { name, type: vtype } });
}

async function upsertModel(brandId: string, name: string, createMissing: boolean) {
  const existing = await db.vehicleModel.findFirst({ where: { brandId, name } });
  if (existing) return existing;
  if (!createMissing) return null;
  return await db.vehicleModel.create({ data: { brandId, name } });
}

async function upsertGeneration(modelId: string, name: string, period?: string | null, bodyStyles?: string[] | null) {
  const existing = await db.vehicleGeneration.findFirst({ where: { modelId, name } });
  if (existing) return existing;
  return await db.vehicleGeneration.create({ data: { modelId, name, period: period ?? null, bodyStyles: bodyStyles ?? undefined } });
}

async function upsertEngine(generationId: string, payload: { engineType?: string | null; engineCapacity_cm3?: number | null; enginePower_kW?: number | number[] | null; enginePower_HP?: number | number[] | null; engineCode?: string | null; description?: string | null; }) {
  const code = (payload.engineCode || '') as string;
  if (!code) return null;
  const found = await db.vehicleEngine.findFirst({ where: { generationId, engineCode: code } });
  if (found) {
    const desiredKW = Array.isArray(payload.enginePower_kW) ? payload.enginePower_kW[0] : payload.enginePower_kW;
    const desiredHP = Array.isArray(payload.enginePower_HP) ? payload.enginePower_HP[0] : payload.enginePower_HP;
    const needsUpdate = (
      (!found.description && payload.description) ||
      (!found.enginePowerKW && desiredKW != null) ||
      (!found.enginePowerHP && desiredHP != null) ||
      (!found.engineCapacity && payload.engineCapacity_cm3 != null) ||
      (!found.engineType && payload.engineType != null)
    );
    if (needsUpdate) {
      return await db.vehicleEngine.update({ where: { id: found.id }, data: {
        description: found.description ?? (payload.description ?? undefined),
        enginePowerKW: found.enginePowerKW ?? (desiredKW ?? undefined),
        enginePowerHP: found.enginePowerHP ?? (desiredHP ?? undefined),
        engineCapacity: found.engineCapacity ?? (payload.engineCapacity_cm3 ?? undefined),
        engineType: found.engineType ?? (payload.engineType ?? undefined),
      } });
    }
    return found;
  }
  return await db.vehicleEngine.create({ data: {
    generationId,
    engineCode: code,
    engineType: payload.engineType ?? 'UNKNOWN',
    engineCapacity: payload.engineCapacity_cm3 ?? undefined,
    enginePowerKW: Array.isArray(payload.enginePower_kW) ? payload.enginePower_kW[0] : payload.enginePower_kW ?? undefined,
    enginePowerHP: Array.isArray(payload.enginePower_HP) ? payload.enginePower_HP[0] : payload.enginePower_HP ?? undefined,
    description: payload.description ?? undefined,
  } });
}

async function findProductsByOEM(tokens: string[], source: CliOptions['oemSource']) {
  const productIds = new Set<string>();
  // Product.oemNumber
  if (source === 'both' || source === 'product') {
    if (tokens.length) {
      const byProduct = await db.product.findMany({ where: { oemNumber: { in: tokens } }, select: { id: true } });
      for (const p of byProduct) productIds.add(p.id);
    }
  }
  // ProductCrossReference
  if (source === 'both' || source === 'crossref') {
    if (tokens.length) {
      const xrefs = await db.productCrossReference.findMany({ where: { referenceType: 'OEM', referenceNumber: { in: tokens } }, select: { productId: true } });
      for (const x of xrefs) productIds.add(x.productId);
    }
  }
  if (!productIds.size) return [] as { id: string }[];
  return Array.from(productIds).map(id => ({ id }));
}

type ReportRow = {
  oem: string;
  productId: string;
  brand: string;
  model: string;
  generation: string;
  period?: string;
  engineCode?: string;
  action: 'linked' | 'skipped' | 'created_entities' | 'no_product' | 'no_entities';
  reason?: string;
};

function writeReport(pathname: string, rows: ReportRow[]) {
  const header = 'oem,productId,brand,model,generation,period,engineCode,action,reason\n';
  const lines = rows.map(r => [r.oem, r.productId, r.brand, r.model, r.generation, r.period ?? '', r.engineCode ?? '', r.action, r.reason ?? ''].map(v => String(v).replace(/"/g, '""')).join(','));
  fs.writeFileSync(pathname, header + lines.join('\n'));
}

async function processFile(file: string, opts: CliOptions, rows: ReportRow[]) {
  const data = readJsonFile<any[]>(file);
  if (!data) return { linked: 0, createdEntities: 0, skipped: 0 };
  let linked = 0, createdEntities = 0, skipped = 0;

  for (const item of data) {
    const rawOEM = String(item.oemNumber || '').trim();
    const oemTokens = splitOEMField(rawOEM);
    const fitmentNotes = String(item.partDescription || '').trim() || undefined;
    if (opts.oemRegex) {
      const re = new RegExp(opts.oemRegex, 'i');
      if (!rawOEM || !re.test(rawOEM)) continue;
    }

    const products = await findProductsByOEM(oemTokens, opts.oemSource);
    if (!products.length) {
      rows.push({ oem: rawOEM, productId: '', brand: '', model: '', generation: '', action: 'no_product', reason: 'no_product_found_for_oem' });
      skipped++;
      continue;
    }

    const vehicles = Array.isArray(item.compatibleVehicles) ? item.compatibleVehicles : [];
    for (const v of vehicles) {
      const brandName = String(v.name || '').trim();
      if (!brandName) continue;
      if (opts.brandFilter && !matchesBrandFilter(brandName, opts.brandFilter)) continue;
      const vtype = String(v.type || 'PASSENGER').toUpperCase() === 'COMMERCIAL' ? 'COMMERCIAL' : 'PASSENGER';

      const brand = await upsertBrand(brandName, vtype as any, opts.createMissing);
      if (!brand) {
        rows.push({ oem: rawOEM, productId: products.map(p => p.id).join('|'), brand: brandName, model: '', generation: '', action: 'no_entities', reason: 'brand_missing_and_create_disabled' });
        skipped++;
        continue;
      }

      const models = Array.isArray(v.models) ? v.models : [];
      for (const m of models) {
        const modelName = String(m.name || '').trim();
        if (!modelName) continue;
        const decomp = decomposeModelAndGenerations(modelName);
        const model = await upsertModel(brand.id, decomp.model, opts.createMissing);
        if (!model) {
          rows.push({ oem: rawOEM, productId: products.map(p => p.id).join('|'), brand: brandName, model: modelName, generation: '', action: 'no_entities', reason: 'model_missing_and_create_disabled' });
          skipped++;
          continue;
        }

        // Merge generations from explicit JSON with any extracted from model name.
        const explicitGens = Array.isArray(m.generations) ? m.generations : [];
        const extractedGens = decomp.gens.length ? decomp.gens.map(gname => ({ name: gname, period: null, bodyStyles: null })) : [];
        let gens = [...extractedGens, ...explicitGens];
        // If still none, but engines are provided at model level, decide what to do based on flag and existing DB generations
        const modelLevelEngines = Array.isArray((m as any).engines) ? (m as any).engines : [];
        if (!gens.length) {
          if (modelLevelEngines.length && opts.applyModelEnginesToGens) {
            // Look up existing generations for this model in DB and apply engines there if any exist
            const existingGens = await db.vehicleGeneration.findMany({ where: { modelId: model.id } });
            if (existingGens.length) {
              gens = existingGens.map(g => ({ name: g.name, period: null, bodyStyles: null, engines: modelLevelEngines } as any));
            } else {
              gens = [ { name: 'General', period: null, bodyStyles: null, engines: modelLevelEngines } as any ];
            }
          } else if (modelLevelEngines.length) {
            gens = [ { name: 'General', period: null, bodyStyles: null, engines: modelLevelEngines } as any ];
          } else {
            gens = [ { name: 'General', period: null, bodyStyles: null } as any ];
          }
        }
        // If generations exist and model-level engines are provided, optionally apply them to all generations.
        else if (gens.length && modelLevelEngines.length && opts.applyModelEnginesToGens) {
          gens = gens.map(g => ({ ...g, engines: [ ...(Array.isArray((g as any).engines) ? (g as any).engines : []), ...modelLevelEngines ] }));
        }
        for (const g of gens) {
          const gnames = g && g.name ? splitCombinedGenerations(String(g.name)) : ['General'];
          const period = g ? g.period : null;
          const bodyStyles = (g && Array.isArray(g.bodyStyles)) ? g.bodyStyles : null;

          for (const gname of gnames) {
            const genName = gname.trim() || 'General';
            const gen = await upsertGeneration(model.id, genName, period, bodyStyles || undefined);
            if (gen && gen.createdAt && gen.updatedAt && gen.createdAt.getTime() === gen.updatedAt.getTime()) createdEntities++;

            // engines
            const engines = (g && Array.isArray((g as any).engines)) ? (g as any).engines : [];
            const engineIds: string[] = [];
            for (const e of engines) {
              const codes = Array.isArray(e.engineCodes) ? e.engineCodes : [];
              if (!codes.length) continue;
              for (const code of codes) {
                const created = await upsertEngine(gen.id, { engineCode: String(code), engineType: e.engineType, engineCapacity_cm3: e.engineCapacity_cm3, enginePower_kW: e.enginePower_kW, enginePower_HP: e.enginePower_HP, description: e.description });
                if (created) engineIds.push(created.id);
              }
            }

            // link to products
            for (const p of products) {
              if (engineIds.length) {
                for (const engineId of engineIds) {
                  const exists = await db.productVehicleFitment.findFirst({ where: { productId: p.id, generationId: gen.id, engineId } });
                  if (!exists && !opts.dryRun) {
                    await db.productVehicleFitment.create({ data: { productId: p.id, generationId: gen.id, engineId, yearFrom: parsePeriod(period).from, yearTo: parsePeriod(period).to, fitmentNotes } });
                    linked++;
                    rows.push({ oem: rawOEM, productId: p.id, brand: brandName, model: modelName, generation: genName, period: period ?? undefined, engineCode: undefined, action: 'linked' });
                  } else if (!exists && opts.dryRun) {
                    linked++;
                    rows.push({ oem: rawOEM, productId: p.id, brand: brandName, model: modelName, generation: genName, period: period ?? undefined, engineCode: undefined, action: 'linked' });
                  }
                }
              } else {
                const exists = await db.productVehicleFitment.findFirst({ where: { productId: p.id, generationId: gen.id, engineId: null } });
                if (!exists && !opts.dryRun) {
                  await db.productVehicleFitment.create({ data: { productId: p.id, generationId: gen.id, engineId: null, yearFrom: parsePeriod(period).from, yearTo: parsePeriod(period).to, fitmentNotes } });
                  linked++;
                  rows.push({ oem: rawOEM, productId: p.id, brand: brandName, model: modelName, generation: genName, period: period ?? undefined, engineCode: undefined, action: 'linked' });
                } else if (!exists && opts.dryRun) {
                  linked++;
                  rows.push({ oem: rawOEM, productId: p.id, brand: brandName, model: modelName, generation: genName, period: period ?? undefined, engineCode: undefined, action: 'linked' });
                }
              }
            }
          }
        }
      }
    }
  }

  return { linked, createdEntities, skipped };
}

async function main() {
  const opts = parseCli();
  console.log(`Importer starting${opts.dryRun ? ' [DRY-RUN]' : ''}...`);

  const baseDir = path.resolve(process.cwd(), 'products-linking');
  if (!fs.existsSync(baseDir)) {
    console.error('Directory not found:', baseDir);
    process.exit(1);
  }

  const files = listJsonFiles(baseDir);
  const rows: ReportRow[] = [];
  let totalLinked = 0, totalCreatedEntities = 0, totalSkipped = 0;
  let processedFiles = 0;

  for (const f of files) {
    const res = await processFile(f, opts, rows);
    totalLinked += res.linked;
    totalCreatedEntities += res.createdEntities;
    totalSkipped += res.skipped;
    processedFiles++;
    if (opts.limit && processedFiles >= opts.limit) break;
  }

  if (opts.reportPath) {
    writeReport(path.resolve(process.cwd(), opts.reportPath), rows);
    console.log(`Report written: ${opts.reportPath} (${rows.length} rows)`);
  }

  console.log(`Processed files: ${processedFiles}/${files.length}. Linked fitments: ${totalLinked}. Created entities: ${totalCreatedEntities}. Skipped: ${totalSkipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
