import fs from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

/**
 * Merge models like "A3 8L" into base model "A3" by creating/using generation "8L"
 * and migrating generations, engines, and fitments accordingly.
 *
 * Usage:
 *   npx tsx scripts/merge-models-into-base.ts --dry-run --report merge-audit.csv
 *   npx tsx scripts/merge-models-into-base.ts --brand Audi --report audi-merge.csv
 */

type CliOptions = {
  brand?: string | null;
  report?: string | null;
  dryRun: boolean;
};

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { brand: null, report: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--brand' && args[i + 1]) opts.brand = args[++i];
    else if (a === '--report' && args[i + 1]) opts.report = args[++i];
    else if (a === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

function stripParens(s: string) { return s.replace(/[()]/g, '').trim(); }

// Token pattern for generation codes: Bx(.x)?, Mkx(.x)?, Roman numerals, platform codes like 8L/8P/1U, etc.
const TOKEN = '(?:B\\d(?:\\.\\d)?|Mk\\d(?:\\.\\d+)?|[IVX]{1,4}|[A-Z]?\\d[A-Z0-9]{1,3}|\\([^)]*\\))';
const MODEL_WITH_TOKENS = new RegExp(`^(.*?)\\s+(${TOKEN}(?:\\s*\\/\\s*${TOKEN})*)$`, 'i');

function decompose(name: string): { base: string; tokens: string[] } | null {
  const n = name.trim();
  const m = n.match(MODEL_WITH_TOKENS);
  if (!m) return null;
  const base = m[1].trim();
  const tokens = m[2].split('/').map(t => stripParens(t.trim())).filter(Boolean);
  if (!base || !tokens.length) return null;
  return { base, tokens };
}

function norm(s: string) { return s.replace(/\s+/g, '').toUpperCase(); }

type Row = { action: string; brand: string; fromModel: string; toModel: string; genFrom: string; genTo: string; enginesMoved: number; fitmentsMoved: number; note?: string };

function writeReport(file: string, rows: Row[]) {
  const header = 'action,brand,fromModel,toModel,genFrom,genTo,enginesMoved,fitmentsMoved,note\n';
  const body = rows.map(r => [r.action, r.brand, r.fromModel, r.toModel, r.genFrom, r.genTo, r.enginesMoved, r.fitmentsMoved, r.note ?? ''].map(v => String(v).replace(/"/g, '""')).join(',')).join('\n');
  fs.writeFileSync(path.resolve(process.cwd(), file), header + body);
}

async function run() {
  const opts = parseCli();
  console.log(`Merging embedded-generation models${opts.brand ? ` for brand=${opts.brand}` : ''}${opts.dryRun ? ' [DRY-RUN]' : ''}...`);

  const models = await db.vehicleModel.findMany({
    where: opts.brand ? { brand: { name: { equals: opts.brand } } } : undefined,
    select: { id: true, name: true, brandId: true, brand: { select: { name: true } }, generations: { select: { id: true, name: true } } }
  });

  const candidates = models.filter(m => !!decompose(m.name));
  const rows: Row[] = [];

  // Build quick lookup for base model existence per brand
  const byBrandBase = new Map<string, Set<string>>();
  for (const m of models) {
    const set = byBrandBase.get(m.brandId) || new Set<string>();
    set.add(m.name.trim());
    byBrandBase.set(m.brandId, set);
  }

  // Augment candidates with a fallback split on last space if base exists under same brand
  for (const bad of models) {
    if (candidates.find(c => c.id === bad.id)) continue;
    const parts = bad.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const base = parts.slice(0, -1).join(' ');
      const token = parts[parts.length - 1];
      const baseSet = byBrandBase.get(bad.brandId);
      if (baseSet && baseSet.has(base)) {
        candidates.push(bad);
      }
    }
  }

  for (const bad of candidates) {
    let d = decompose(bad.name);
    if (!d) {
      // Fallback decomposition on last space
      const parts = bad.name.trim().split(/\s+/);
      const base = parts.slice(0, -1).join(' ');
      const token = parts[parts.length - 1];
      d = { base, tokens: [stripParens(token)] };
    }
    if (!d) continue;
    const brandName = bad.brand.name;

    // Find or create base model under same brand
    let baseModel = await db.vehicleModel.findFirst({ where: { name: d.base, brandId: bad.brandId } });
    if (!baseModel) {
      if (opts.dryRun) {
        rows.push({ action: 'create_base_model', brand: brandName, fromModel: bad.name, toModel: d.base, genFrom: '', genTo: '', enginesMoved: 0, fitmentsMoved: 0 });
      } else {
        baseModel = await db.vehicleModel.create({ data: { name: d.base, brandId: bad.brandId } });
      }
    }
    if (!baseModel) continue; // in dry-run we continue migration planning below but skip writes

    // Prepare target generations under base model
    const targetGens: Record<string, { id: string; name: string }> = {};
    for (const tok of d.tokens) {
      const exists = await db.vehicleGeneration.findFirst({ where: { modelId: baseModel.id, name: tok } });
      if (exists) targetGens[tok] = { id: exists.id, name: exists.name };
      else if (opts.dryRun) {
        rows.push({ action: 'create_generation', brand: brandName, fromModel: bad.name, toModel: d.base, genFrom: '', genTo: tok, enginesMoved: 0, fitmentsMoved: 0 });
      } else {
        const created = await db.vehicleGeneration.create({ data: { modelId: baseModel.id, name: tok } });
        targetGens[tok] = { id: created.id, name: created.name };
      }
    }

    // Load full generations and engines/fitments for bad model
    const fullBad = await db.vehicleModel.findUnique({
      where: { id: bad.id },
      select: {
        id: true,
        name: true,
        brand: { select: { name: true } },
        generations: { select: { id: true, name: true, vehicleEngines: { select: { id: true } }, productFitments: { select: { id: true, productId: true, engineId: true } } } }
      }
    });
    if (!fullBad) continue;

    for (const g of fullBad.generations) {
      // Choose target generation: if name matches one of tokens -> that one, else fallback to first token
      const matchTok = d.tokens.find(t => norm(t) === norm(g.name)) || d.tokens[0];
      const target = targetGens[matchTok];
      if (!target) continue;

      // Move engines
      let enginesMoved = 0;
      if (!opts.dryRun) {
        await db.vehicleEngine.updateMany({ where: { generationId: g.id }, data: { generationId: target.id } });
      }
      enginesMoved = g.vehicleEngines.length;

      // Move fitments: update generationId to target; avoid duplicates
      let fitmentsMoved = 0;
      if (!opts.dryRun) {
        for (const f of g.productFitments) {
          // Check duplicate
          const exists = await db.productVehicleFitment.findFirst({ where: { productId: f.productId, generationId: target.id, engineId: f.engineId ?? undefined } });
          if (exists) {
            // Remove current duplicate fitment
            await db.productVehicleFitment.delete({ where: { id: f.id } });
          } else {
            await db.productVehicleFitment.update({ where: { id: f.id }, data: { generationId: target.id } });
            fitmentsMoved++;
          }
        }
      } else {
        fitmentsMoved = g.productFitments.length;
      }

      rows.push({ action: 'migrate_generation', brand: brandName, fromModel: bad.name, toModel: d.base, genFrom: g.name, genTo: target.name, enginesMoved, fitmentsMoved });
    }

    // Delete bad model (will cascade delete its now-empty generations if any remain)
    if (opts.dryRun) {
      rows.push({ action: 'delete_model', brand: brandName, fromModel: bad.name, toModel: d.base, genFrom: '', genTo: '', enginesMoved: 0, fitmentsMoved: 0 });
    } else {
      await db.vehicleModel.delete({ where: { id: bad.id } });
    }
  }

  console.log(`Processed ${candidates.length} models.`);
  if (opts.report) {
    writeReport(opts.report, rows);
    console.log(`Report written: ${opts.report}`);
  }
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
