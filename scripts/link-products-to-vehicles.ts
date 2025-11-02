import process from 'process';
import { db } from '../src/lib/db';

/**
 * Link existing Products to Vehicle Generations (and optionally Engines) based on heuristics
 * extracted from Product.name (imported from ART CSV as IMEART).
 *
 * Usage examples:
 *   npx tsx scripts/link-products-to-vehicles.ts --limit 500 --dry-run
 *   npx tsx scripts/link-products-to-vehicles.ts --brand MERCEDES --limit 200
 */

// --------------------
// Config and helpers
// --------------------

type CliOptions = {
  limit?: number;
  dryRun?: boolean;
  brandFilter?: string | null; // only process products containing this brand token
  batchSize: number;
  prune?: boolean; // when true, remove existing fitments for the same brand/model that fall outside derived constraints
  report?: string | null; // CSV output path for skipped/pruned diagnostics
};

const DEFAULTS: CliOptions = {
  limit: undefined,
  dryRun: false,
  brandFilter: null,
  batchSize: 200,
  prune: false,
  report: null,
};

// Brand alias map -> canonical VehicleBrand.name
const BRAND_ALIASES: Record<string, string> = {
  'VW': 'Volkswagen',
  'VOLKSWAGEN': 'Volkswagen',
  'MB': 'Mercedes-Benz',
  'MERCEDES': 'Mercedes-Benz',
  'MERCEDES-BENZ': 'Mercedes-Benz',
  'OPEL': 'Opel',
  'ŠKODA': 'Škoda',
  'SKODA': 'Škoda',
  'AUDI': 'Audi',
  'RENAULT': 'Renault',
  'PEUGEOT': 'Peugeot',
  'CITROEN': 'Citroën',
  'CITROËN': 'Citroën',
  'SEAT': 'Seat',
  'ALFA': 'Alfa Romeo',
  'ALFA ROMEO': 'Alfa Romeo',
  'FORD': 'Ford',
};

// Model aliases per brand (uppercased keys)
const MODEL_ALIASES: Record<string, Record<string, string>> = {
  'Volkswagen': {
    'GOLF 2': 'Golf', 'GOLF II': 'Golf',
    'GOLF 3': 'Golf', 'GOLF III': 'Golf',
    'GOLF 4': 'Golf', 'GOLF IV': 'Golf',
    'GOLF 5': 'Golf', 'GOLF V': 'Golf',
    'GOLF 6': 'Golf', 'GOLF VI': 'Golf',
    'GOLF 7': 'Golf', 'GOLF VII': 'Golf',
    'POLO': 'Polo', 'PASSAT': 'Passat', 'PASAT': 'Passat', 'CADDY': 'Caddy', 'VENTO': 'Vento', 'SHARAN': 'Sharan', 'TRANSPORTER': 'Transporter',
  },
  'Škoda': {
    'OCTAVIA': 'Octavia',
    'FABIA': 'Fabia',
  },
  'Audi': {
    'A-3': 'A3', 'A-4': 'A4', 'A-5': 'A5', 'A-6': 'A6', 'A-80': '80',
    'A3': 'A3', 'A4': 'A4', 'A5': 'A5', 'A6': 'A6', '80': '80',
  },
  'Renault': {
    'CLIO': 'Clio', 'MEGANE': 'Megane', 'KANGOO': 'Kangoo', 'SCENIC': 'Scenic', 'LOGAN': 'Logan',
    'MOVANO': 'Movano',
  },
  'Mercedes-Benz': {
    // prefer W-codes detection for generations
    'A-CLASS': 'A-Class', 'C-CLASS': 'C-Class', 'E-CLASS': 'E-Class', 'S-CLASS': 'S-Class', 'CLS-CLASS': 'CLS-Class', 'G-CLASS': 'G-Class', 'GLK-CLASS': 'GLK-Class', 'GLC': 'GLC / GLK-Class', 'GLE': 'GLE / M-Class', 'M-CLASS': 'GLE / M-Class',
  },
  'Opel': { 'ASTRA': 'Astra', 'VECTRA': 'Vectra', 'OMEGA': 'Omega', 'CORSA': 'Corsa' },
  'Peugeot': { '206': '206', '307': '307' },
  'Citroën': { 'C-3': 'C3', 'C3': 'C3', 'C-5': 'C5', 'C5': 'C5' },
  'Seat': { 'LEON': 'Leon', 'TOLEDO': 'Toledo' },
  'Alfa Romeo': { '145': '145', '146': '146', '147': '147', '156': '156', '166': '166' },
  'Ford': { 'FOCUS': 'Focus' },
};

const YEAR_RANGE_RE = /(\d{2})\s*[-–>]{1,2}\s*(\d{2})?/; // e.g. 96-> or 99-05
const FROM_YEAR_RE = /(\d{2})\s*->/; // 03->
const TO_YEAR_RE = /->\s*(\d{2})/; // ->05
const W_CODE_RE = /\bW\d{3}\b/i; // Mercedes W-code in text
const ENGINE_CODES_IN_PARENS_RE = /\(([A-Z0-9 ,\/-]{2,})\)/; // (AJM,ATJ) (BLS,BMM) (K9K)

function parseCli(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { ...DEFAULTS };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit' && args[i + 1]) { opts.limit = Number(args[++i]); }
    else if (a === '--dry-run') { opts.dryRun = true; }
    else if (a === '--brand' && args[i + 1]) { opts.brandFilter = args[++i].toUpperCase(); }
    else if (a === '--batch' && args[i + 1]) { opts.batchSize = Math.max(50, Number(args[++i])); }
    else if (a === '--prune') { opts.prune = true; }
    else if (a === '--report' && args[i + 1]) { opts.report = args[++i]; }
  }
  return opts;
}

function upper(s: string) { return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toUpperCase(); }

function detectBrandsTokens(text: string): string[] {
  const U = upper(text);
  const hits: string[] = [];
  for (const tok of Object.keys(BRAND_ALIASES)) {
    if (U.includes(tok)) hits.push(tok);
  }
  return hits;
}

function pickCanonicalBrand(tokens: string[]): string | null {
  for (const t of tokens) {
    const canonical = BRAND_ALIASES[t];
    if (canonical) return canonical;
  }
  return null;
}

function detectModel(canonicalBrand: string, text: string): string | null {
  const U = upper(text);
  const aliases = MODEL_ALIASES[canonicalBrand] || {};
  for (const key of Object.keys(aliases)) {
    if (U.includes(key)) return aliases[key];
  }
  // Fallback quick wins
  if (/\bGOLF\b/i.test(text) && canonicalBrand === 'Volkswagen') return 'Golf';
  return null;
}

// Multi-detection helpers
function detectBrandCandidates(text: string): string[] {
  const tokens = detectBrandsTokens(text);
  const set = new Set<string>();
  for (const t of tokens) {
    const c = BRAND_ALIASES[t];
    if (c) set.add(c);
  }
  return Array.from(set);
}

function detectModelCandidates(text: string): Array<{ brand: string; model: string }> {
  const U = upper(text);
  const pairs: Array<{ brand: string; model: string }> = [];
  for (const brand of Object.keys(MODEL_ALIASES)) {
    const aliases = MODEL_ALIASES[brand];
    for (const key of Object.keys(aliases)) {
      if (U.includes(key)) {
        pairs.push({ brand, model: aliases[key] });
      }
    }
  }
  // Extra fallback for VW Golf keyword
  if (/\bGOLF\b/.test(U)) pairs.push({ brand: 'Volkswagen', model: 'Golf' });
  // Deduplicate
  const seen = new Set<string>();
  return pairs.filter(p => {
    const k = `${p.brand}::${p.model}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function extractYearHints(text: string): { from?: number; to?: number } {
  const hints: { from?: number; to?: number } = {};
  const fromM = text.match(FROM_YEAR_RE);
  if (fromM) { const yy = Number(fromM[1]); hints.from = yy + 2000 - (yy > 50 ? 100 : 0); }
  const toM = text.match(TO_YEAR_RE);
  if (toM) { const yy = Number(toM[1]); hints.to = yy + 2000 - (yy > 50 ? 100 : 0); }
  const rangeM = text.match(YEAR_RANGE_RE);
  if (rangeM) {
    const y1 = Number(rangeM[1]);
    const y2 = rangeM[2] ? Number(rangeM[2]) : undefined;
    if (!hints.from) hints.from = y1 + 2000 - (y1 > 50 ? 100 : 0);
    if (!hints.to && y2 !== undefined) hints.to = y2 + 2000 - (y2 > 50 ? 100 : 0);
  }
  return hints;
}

function extractWCode(text: string): string | null {
  const m = text.match(W_CODE_RE);
  return m ? m[0].toUpperCase() : null;
}

function extractEngineCodes(text: string): string[] {
  const m = text.match(ENGINE_CODES_IN_PARENS_RE);
  if (!m) return [];
  return m[1].split(/[ ,\/:-]+/).map(s => s.trim()).filter(Boolean);
}

function detectPosition(text: string): { position?: string; notes?: string } {
  const U = upper(text);
  const notes: string[] = [];
  let pos: string | undefined;
  if (U.includes('PR.')) pos = 'Prednji';
  if (U.includes('ZAD.')) pos = pos ? pos + ' / Stražnji' : 'Stražnji';
  if (U.includes(' L ')) notes.push('Lijevo');
  if (U.includes(' D ')) notes.push('Desno');
  return { position: pos, notes: notes.length ? notes.join(', ') : undefined };
}

// --- Ordinal generation inference helpers ---
const ROMAN_TO_INT: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

function extractOrdinalForModel(text: string, modelKey: string): number | null {
  const U = upper(text);
  const reArabic = new RegExp(`\\b${modelKey}\\s*(?:-|\\s)?\\s*(\\d{1,2})\\b`);
  const reRoman = new RegExp(`\\b${modelKey}\\s*(?:-|\\s)?\\s*(I{1,3}|IV|V|VI{0,2}|VII|VIII|IX|X)\\b`);
  const mA = U.match(reArabic);
  if (mA) {
    const n = Number(mA[1]);
    if (n >= 1 && n <= 10) return n;
  }
  const mR = U.match(reRoman);
  if (mR) {
    const n = ROMAN_TO_INT[mR[1] as keyof typeof ROMAN_TO_INT];
    if (n) return n;
  }
  return null;
}

type YearWindow = { from: number; to: number };

function getWindowForModelOrdinal(brand: string, model: string, ordinal: number): YearWindow | null {
  const key = `${brand}::${model}`;
  const vwGolf: Record<number, YearWindow> = {
    2: { from: 1983, to: 1992 },
    3: { from: 1991, to: 1999 },
    4: { from: 1997, to: 2004 },
    5: { from: 2003, to: 2009 },
    6: { from: 2008, to: 2013 },
    7: { from: 2012, to: 2020 },
  };
  const skodaOctavia: Record<number, YearWindow> = {
    1: { from: 1996, to: 2004 },
    2: { from: 2004, to: 2013 },
    3: { from: 2012, to: 2020 },
  };
  if (key === 'Volkswagen::Golf' && vwGolf[ordinal]) return vwGolf[ordinal];
  if (key === 'Škoda::Octavia' && skodaOctavia[ordinal]) return skodaOctavia[ordinal];
  return null;
}

function intersectWindows(a: YearWindow | null, b: YearWindow | null): YearWindow | null {
  if (!a) return b;
  if (!b) return a;
  const from = Math.max(a.from, b.from);
  const to = Math.min(a.to, b.to);
  if (from > to) return a; // no overlap; keep original to avoid excluding all
  return { from, to };
}

async function resolveBrandId(name: string) {
  const brand = await db.vehicleBrand.findFirst({ where: { name } });
  return brand?.id ?? null;
}

async function resolveModels(brandId: string, canonicalModel: string) {
  const models = await db.vehicleModel.findMany({ where: { brandId } });
  // exact match first
  const exact = models.find(m => m.name.toLowerCase() === canonicalModel.toLowerCase());
  if (exact) return [exact];
  // contains as fallback
  return models.filter(m => upper(m.name).includes(upper(canonicalModel)));
}

function periodIncludes(period: string | null, year: number): boolean {
  if (!period) return true;
  const m = period.match(/(\d{4})\s*-\s*(\d{4})?/);
  if (!m) return true;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : 9999;
  return year >= start && year <= end;
}

function parsePeriod(period: string | null): { from: number; to: number } | null {
  if (!period) return null;
  const m = period.match(/(\d{4})\s*-\s*(\d{4})?/);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : 9999;
  return { from, to };
}

async function resolveGenerations(modelId: string, wCode: string | null, hints: { from?: number; to?: number }) {
  const gens = await db.vehicleGeneration.findMany({ where: { modelId } });
  if (wCode) {
    const byW = gens.filter(g => g.name.toUpperCase().includes(wCode));
    if (byW.length) return byW;
  }
  const filtered = gens.filter(g => {
    if (hints.from && !periodIncludes(g.period ?? null, hints.from)) return false;
    if (hints.to && !periodIncludes(g.period ?? null, hints.to)) return false;
    return true;
  });
  return filtered.length ? filtered : gens; // fallback all
}

async function deriveWindowFromModelOrdinal(brandName: string, modelName: string, ordinal: number): Promise<YearWindow | null> {
  const brand = await db.vehicleBrand.findFirst({ where: { name: brandName }, select: { id: true } });
  if (!brand) return null;
  const model = await db.vehicleModel.findFirst({ where: { brandId: brand.id, name: modelName }, select: { id: true } });
  if (!model) return null;
  const gens = await db.vehicleGeneration.findMany({ where: { modelId: model.id } });
  const withPeriods = gens
    .map(g => ({ g, w: parsePeriod(g.period ?? null) }))
    .filter(x => x.w !== null) as Array<{ g: typeof gens[number]; w: { from: number; to: number } }>;
  if (!withPeriods.length) return null;
  withPeriods.sort((a, b) => a.w.from - b.w.from);
  const idx = Math.max(0, Math.min(ordinal - 1, withPeriods.length - 1));
  return withPeriods[idx].w;
}

function extractPlatformTokens(text: string): string[] {
  const U = upper(text);
  const tokens: string[] = [];
  // Passat B-codes
  const b = U.match(/\bB([5-9])\b/g);
  if (b) tokens.push(...b.map(s => s.toUpperCase()));
  // Audi platform codes (8L, 8P, 8V, 8K, 8W, 4F, 4G, C5, C6, C7)
  const audi = U.match(/\b(8[LPVKW]|4[FG]|C[5-8])\b/g);
  if (audi) tokens.push(...audi.map(s => s.toUpperCase()));
  // Transporter T-codes
  const t = U.match(/\bT([4-7])\b/g);
  if (t) tokens.push(...t.map(s => s.toUpperCase()));
  // Mk notation
  const mk = U.match(/\bMK\s*(\d{1,2})\b/g);
  if (mk) tokens.push(...mk.map(s => s.toUpperCase()));
  // Generic patterns like 1Z (Octavia II)
  const generic = U.match(/\b[0-9][A-Z]\b/g);
  if (generic) tokens.push(...generic.map(s => s.toUpperCase()));
  return Array.from(new Set(tokens));
}

async function filterGenerationsByPlatform(modelId: string, gens: Array<{ id: string; name: string; period: string | null }> | any[], tokens: string[]) {
  if (!tokens.length) return gens;
  const hits = gens.filter(g => tokens.some(tok => g.name.toUpperCase().includes(tok)));
  return hits.length ? hits : gens;
}

async function resolveEngines(generationId: string, engineCodes: string[]) {
  if (!engineCodes.length) return [] as { id: string }[];
  const engines = await db.vehicleEngine.findMany({ where: { generationId } });
  const hits: { id: string }[] = [];
  for (const code of engineCodes) {
    const match = engines.find(e => (e.engineCode ?? '').toUpperCase() === code.toUpperCase());
    if (match) hits.push({ id: match.id });
  }
  return hits;
}

// Result types for linkProduct(): success vs. skipped with reason
type LinkSuccess = { linked: number; pruned?: number };
type LinkSkipReason = 'brand_not_found' | 'model_not_found' | 'brand_not_in_db' | 'model_not_in_db';
type LinkSkip = { linked: 0; reason: LinkSkipReason; brand?: string; model?: string };
type LinkResult = LinkSuccess | LinkSkip;

async function linkProduct(product: { id: string; name: string }, opts: CliOptions): Promise<LinkResult> {
  const text = product.name || '';
  const brandCandidates = detectBrandCandidates(text); // canonical brand names
  const modelCandidates = detectModelCandidates(text); // brand+model pairs inferred from text

  if (brandCandidates.length === 0 && modelCandidates.length === 0) {
    return { linked: 0, reason: 'brand_not_found' };
  }

  // Build all brand-model target pairs: prefer models under detected brands; also include model-inferred brands
  const targetPairs: Array<{ brand: string; model: string }> = [];
  const addPair = (b: string, m: string) => {
    if (!b || !m) return;
    targetPairs.push({ brand: b, model: m });
  };

  // 1) Models that match detected brands
  for (const b of brandCandidates) {
    const ofBrand = modelCandidates.filter(p => p.brand === b);
    for (const p of ofBrand) addPair(b, p.model);
  }
  // 2) If no brand token for some models, still include inferred brand from model
  for (const p of modelCandidates) {
    if (!brandCandidates.includes(p.brand)) addPair(p.brand, p.model);
  }

  if (targetPairs.length === 0) {
    // Have brands but no models detected for them
    if (brandCandidates.length > 0) return { linked: 0, reason: 'model_not_found', brand: brandCandidates[0] };
    return { linked: 0, reason: 'brand_not_found' };
  }

  const wCode = extractWCode(text);
  const hints = extractYearHints(text);
  const engineCodes = extractEngineCodes(text);
  const pos = detectPosition(text);

  // Derive a global year window from explicit ordinals (e.g., "GOLF 4") to constrain other models
  let globalWindow: YearWindow | null = null;
  for (const pair of targetPairs) {
    // Try to extract ordinal using base alias keys (strip trailing numerals/Romans so 'GOLF 4' matches)
    const aliasEntries = Object.entries(MODEL_ALIASES[pair.brand] || {}).filter(([, v]) => v === pair.model);
    for (const [aliasKey] of aliasEntries) {
      const base = aliasKey.replace(/\s*(?:I{1,3}|IV|V|VI{0,2}|VII|VIII|IX|X|\d{1,2})\b/i, '').trim() || aliasKey;
      const ord = extractOrdinalForModel(text, base);
      if (ord) {
        const w = getWindowForModelOrdinal(pair.brand, pair.model, ord);
        if (w) globalWindow = intersectWindows(globalWindow, w);
      }
    }
  }

  let created = 0;
  let pruned = 0;
  for (const pair of targetPairs) {
    const brandId = await resolveBrandId(pair.brand);
    if (!brandId) {
      // try next pair
      continue;
    }
    const models = await resolveModels(brandId, pair.model);
    if (!models.length) {
      // model not in DB for this brand
      continue;
    }
    for (const m of models) {
      // Merge global window into hints if present
      const mergedHints = { ...hints } as { from?: number; to?: number };
      if (globalWindow) {
        mergedHints.from = mergedHints.from ? Math.max(mergedHints.from, globalWindow.from) : globalWindow.from;
        mergedHints.to = mergedHints.to ? Math.min(mergedHints.to, globalWindow.to) : globalWindow.to;
      }
      // Pair-specific ordinal window from DB generations (more precise)
      // Try to detect ordinal again for this pair
      let pairWindow: YearWindow | null = null;
      const aliasEntries = Object.entries(MODEL_ALIASES[pair.brand] || {}).filter(([, v]) => v === pair.model);
      for (const [aliasKey] of aliasEntries) {
        const base = aliasKey.replace(/\s*(?:I{1,3}|IV|V|VI{0,2}|VII|VIII|IX|X|\d{1,2})\b/i, '').trim() || aliasKey;
        const ord = extractOrdinalForModel(text, base);
        if (ord) {
          const w = await deriveWindowFromModelOrdinal(pair.brand, pair.model, ord);
          if (w) {
            pairWindow = pairWindow ? intersectWindows(pairWindow, w) : w;
          }
        }
      }

      const gensRaw = await resolveGenerations(m.id, wCode, mergedHints);
      // Apply pairWindow if present
      let gens = gensRaw;
      if (pairWindow) {
        gens = gens.filter(g => {
          const p = parsePeriod(g.period ?? null);
          if (!p) return true;
          const inter = intersectWindows(pairWindow, p);
          return !!inter && inter.to >= inter.from;
        });
      }
      // Apply platform tokens if any
      const platformTokens = extractPlatformTokens(text);
      gens = await filterGenerationsByPlatform(m.id, gens, platformTokens);
      for (const g of gens) {
        if (engineCodes.length) {
          const engines = await resolveEngines(g.id, engineCodes);
          if (!engines.length) {
            // engine codes given but not found => skip engine-specific linking, fallback to generation-only
            const existing = await db.productVehicleFitment.findFirst({ where: { productId: product.id, generationId: g.id, engineId: null } });
            if (!existing) {
              await db.productVehicleFitment.create({ data: { productId: product.id, generationId: g.id, engineId: null, position: pos.position, fitmentNotes: pos.notes ?? undefined } });
              created++;
            }
          } else {
            for (const e of engines) {
              const exists = await db.productVehicleFitment.findFirst({ where: { productId: product.id, generationId: g.id, engineId: e.id } });
              if (!exists) {
                await db.productVehicleFitment.create({ data: { productId: product.id, generationId: g.id, engineId: e.id, position: pos.position, fitmentNotes: pos.notes ?? undefined } });
                created++;
              }
            }
          }
        } else {
          const existing = await db.productVehicleFitment.findFirst({ where: { productId: product.id, generationId: g.id, engineId: null } });
          if (!existing) {
            await db.productVehicleFitment.create({ data: { productId: product.id, generationId: g.id, engineId: null, position: pos.position, fitmentNotes: pos.notes ?? undefined } });
            created++;
          }
        }
      }

      // Optional pruning: remove existing fitments for this product that belong to the same brand/model
      // but whose generation is NOT in the allowed set (gens)
      if (opts.prune && !opts.dryRun) {
        const allowedGenIds = new Set(gens.map(x => x.id));
        // Get all generations for this model (to scope pruning only within this model)
        const allModelGens = await db.vehicleGeneration.findMany({ where: { modelId: m.id }, select: { id: true } });
        const scopeGenIds = allModelGens.map(x => x.id);
        const disallowed = scopeGenIds.filter(id => !allowedGenIds.has(id));
        if (disallowed.length) {
          const del = await db.productVehicleFitment.deleteMany({ where: { productId: product.id, generationId: { in: disallowed } } });
          pruned += del.count;
        }
      }
    }
  }
  return { linked: created, pruned };
}

async function main() {
  const opts = parseCli();
  console.log(`Linker starting${opts.dryRun ? ' [DRY-RUN]' : ''}...`);

  // Select candidates: products that likely belong to passenger/commercial vehicles; skip archived
  const where: any = { isArchived: false };
  // Optional hint: limit to products that have at least one known brand token inside the name
  // We'll filter in app layer to keep query simple

  const total = await db.product.count({ where });
  const limit = opts.limit ?? total;
  let processed = 0, totalLinked = 0, totalPruned = 0, skippedBrand = 0, skippedModel = 0;

  while (processed < limit) {
    const batch = await db.product.findMany({ where, select: { id: true, name: true }, take: Math.min(opts.batchSize, limit - processed), skip: processed });
    if (!batch.length) break;

    for (const p of batch) {
      if (opts.brandFilter) {
        const U = upper(p.name || '');
        if (!U.includes(opts.brandFilter)) { processed++; continue; }
      }

      if (opts.dryRun) {
        const res: LinkResult = await linkProduct({ id: p.id, name: p.name || '' }, opts);
        if ('reason' in res) {
          if (res.reason === 'brand_not_found') skippedBrand++;
          else if (res.reason.includes('model')) skippedModel++;
        } else {
          totalLinked += res.linked;
          if (res.pruned) totalPruned += res.pruned;
        }
      } else {
        const res: LinkResult = await linkProduct({ id: p.id, name: p.name || '' }, opts);
        if ('reason' in res) {
          if (res.reason === 'brand_not_found') skippedBrand++;
          else if (res.reason.includes('model')) skippedModel++;
        } else {
          totalLinked += res.linked;
          if (res.pruned) totalPruned += res.pruned;
        }
      }
      processed++;
    }

    if (batch.length < opts.batchSize) break;
  }

  console.log(`Processed: ${processed}/${limit}. Linked fitments created: ${totalLinked}. Pruned: ${totalPruned}. Skipped (brand): ${skippedBrand}, Skipped (model): ${skippedModel}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
