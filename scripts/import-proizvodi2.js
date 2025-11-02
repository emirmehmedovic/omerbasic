#!/usr/bin/env node
/*
  Usage:
    node scripts/import-proizvodi2.js --file "/Users/emir_mw/omerbasic/proizvodi-csv/proizvodi-2.csv" --category <CUID_KATEGORIJE> --dry-run

  Options:
    --file       Putanja do proizvodi-2.csv (obavezno)
    --category   defaultCategoryId za nove proizvode (obavezno za create)
    --dry-run    Ako je prisutno, ne piše u bazu
*/

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();
// Učitaj pravila mapiranja kategorija
let rules = null;
try {
  const rulesPath = path.join(__dirname, 'category-mapping.rules.json');
  if (fs.existsSync(rulesPath)) {
    rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  }
} catch (e) {
  // Ignoriši grešku; ako nema pravila, oslanjamo se na --category ili fallback
}

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function toNum(val) {
  if (val === undefined || val === null || val === '') return undefined;
  // U nekim poljima točka je separator tisuća, a zarez decimalni
  const s = String(val).replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

function containsOne(text, arr) {
  if (!text) return false;
  const s = String(text).toLowerCase();
  return arr.some((m) => s.includes(m.toLowerCase()));
}

function decideSegment(name) {
  if (!rules) return 'passenger';
  if (containsOne(name, rules.keywords?.truckMarkers || [])) return 'truck';
  return 'passenger';
}

function isTireName(name) {
  if (!name) return false;
  const s = String(name).toUpperCase();
  // Look for common tire size patterns: 205/55R16, 215/60 R16, 31x10.50R15, 195/65-15
  const patterns = [
    /\b\d{3}\s*\/\s*\d{2}\s*[R-]?\s*\d{2}\b/i, // 205/55R16 or 205/55-16
    /\b\d{2}x\d{2}\.\d{2}R\d{2}\b/i,              // 31x10.50R15
    /\b\d{3}\s*\/\s*\d{2}\s*ZR\s*\d{2}\b/i,    // 225/40 ZR18
  ];
  if (patterns.some((re) => re.test(s))) return true;
  // Keywords that strongly indicate tires
  if (s.includes(' GUMA ') || s.startsWith('GUMA ') || s.includes(' GUME ') || s.includes(' PNEU')) return true;
  return false;
}

function pickTopLevelByName(name) {
  if (!rules) return null;
  const kw = rules.keywords || {};
  if (isTireName(name)) return rules.topLevel?.gumeCategoryId || null;
  if (containsOne(name, kw.uljaMarkers || [])) return rules.topLevel?.uljaMazivaCategoryId || null;
  if (containsOne(name, kw.adrMarkers || [])) return rules.topLevel?.adrRootId || null;
  return null;
}

function pickSpecificByName(name) {
  if (!rules) return null;
  const kw = rules.keywords || {};
  const spec = rules.specific || {};
  if (containsOne(name, kw.bodyworkMarkers || [])) return spec.bodyworkPassengerId || null;
  if (containsOne(name, kw.coolingHosesMarkers || [])) return spec.coolingHosesPassengerId || null;
  if (containsOne(name, kw.waterPumpMarkers || [])) return spec.waterPumpPassengerId || null;
  if (containsOne(name, kw.lightsMarkers || [])) return spec.lightsPassengerId || null;
  if (containsOne(name, kw.filtersAir || [])) return (rules.groups?.['38']?.passenger) || null;
  if (containsOne(name, kw.filtersCabin || [])) return (rules.groups?.['39']?.passenger) || null;
  if (containsOne(name, kw.filtersFuel || [])) return (rules.groups?.['37']?.passenger) || null;
  if (containsOne(name, kw.filtersOil || [])) return (rules.groups?.['36']?.passenger) || null;
  if (containsOne(name, kw.brakesPads || [])) return (rules.groups?.['50']?.passenger) || null;
  if (containsOne(name, kw.amortizers || [])) return (rules.groups?.['71']?.passenger) || null;
  if (containsOne(name, kw.egrDpf || [])) return (rules.groups?.['160']?.passenger) || null;
  return null;
}

function pickCategoryIdForCreate(rec) {
  // 1) Top-level brzi slučajevi (Gume, Ulja/maziva, ADR)
  const tl = pickTopLevelByName(rec.name);
  if (tl) return tl;

  // 2) Grana: putničko vs teretno
  const segment = decideSegment(rec.name);

  // 3) Pokušaj po grupi
  if (rules && rec._group && rules.groups && rules.groups[rec._group]) {
    const g = rules.groups[rec._group];
    if (segment === 'truck' && g.truck) return g.truck;
    if (g.passenger) return g.passenger;
  }

  // 4) Specifične heuristike po imenu
  const spec = pickSpecificByName(rec.name);
  if (spec) return spec;

  // 5) Fallback
  return (rules && rules.topLevel && rules.topLevel.ostaloCategoryId) || null;
}

async function main() {
  const filePath = argValue('--file');
  const defaultCategoryId = argValue('--category');
  const dryRun = hasFlag('--dry-run');
  const outPath = argValue('--out');
  const previewLimit = Number(argValue('--preview-limit') || '25');

  if (!filePath) {
    console.error('Greška: nedostaje --file <putanja-do-CSV>.');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Greška: datoteka ne postoji: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  const raw = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  });

  const first = raw[0] || {};
  const hasCoreHeaders = ['IMEART', 'katbro', 'CIJART'].every((k) => Object.prototype.hasOwnProperty.call(first, k));
  if (!hasCoreHeaders) {
    console.error('Greška: CSV nema očekovane kolone (potrebno: IMEART, katbro, CIJART).');
    process.exit(1);
  }

  const mapped = raw.map((r) => {
    const name = (r.IMEART ?? '').toString();
    const imemal = (r.imemal ?? '').toString();
    return {
      name,
      description: imemal || undefined,
      price: toNum(r.CIJART) ?? 0,
      catalogNumber: (r.katbro ?? '').toString(),
      oemNumber: r.oem ? r.oem.toString() : undefined,
      unitOfMeasure: r.JEDMJE ? r.JEDMJE.toString() : undefined,
      purchasePrice: toNum(r.CIJNAB),
      sku: r.SIFART ? r.SIFART.toString() : undefined,
      _imemal: imemal,
      _group: r.grupa ? String(r.grupa) : undefined,
    };
  });

  const results = {
    total: mapped.length,
    success: 0,
    failed: 0,
    errors: [],
    created: [],
    updated: [],
    dryRun,
    preview: [],
  };

  for (let i = 0; i < mapped.length; i++) {
    const rec = mapped[i];
    const rowNo = i + 2; // +2 zbog headera i 0-indexa

    try {
      if (!rec.name || !rec.catalogNumber) {
        throw new Error('Nedostaju obavezna polja (IMEART/katbro).');
      }
      if (!rec.price || !(rec.price > 0)) {
        throw new Error('CIJART mora biti > 0.');
      }

      const existing = await prisma.product.findUnique({
        where: { catalogNumber: rec.catalogNumber },
        select: { id: true, description: true, catalogNumber: true, categoryId: true },
      });

      const data = {
        name: rec.name,
        description: rec.description,
        price: rec.price,
        catalogNumber: rec.catalogNumber,
        oemNumber: rec.oemNumber,
        unitOfMeasure: rec.unitOfMeasure,
        purchasePrice: rec.purchasePrice,
        sku: rec.sku,
        // Kategorija: za update je ne diramo, za create je obavezna
      };

      if (existing) {
        // Append imemal u description ako već ne postoji
        let newDesc = data.description;
        if (rec._imemal) {
          const alreadyHas = (existing.description || '').includes(rec._imemal);
          if (!alreadyHas) {
            newDesc = [existing.description, rec._imemal].filter(Boolean).join('\n');
          } else {
            newDesc = existing.description || data.description;
          }
        }

        if (!dryRun) {
          await prisma.product.update({
            where: { id: existing.id },
            data: { ...data, description: newDesc },
          });
        }
        results.updated.push(rec.catalogNumber);
      } else {
        // Odredi kategoriju: pravila -> --category -> Ostalo
        let chosenCategoryId = pickCategoryIdForCreate({ name: rec.name, _group: rec._group });
        if (!chosenCategoryId) {
          chosenCategoryId = defaultCategoryId || (rules?.topLevel?.ostaloCategoryId || null);
        }
        if (!chosenCategoryId) {
          throw new Error('Nije moguće odrediti kategoriju (ni pravila ni --category).');
        }
        const createData = {
          ...data,
          categoryId: chosenCategoryId,
        };
        if (!dryRun) {
          await prisma.product.create({ data: createData });
        }
        results.created.push(rec.catalogNumber);
      }

      results.success++;
      if (results.preview.length < previewLimit) {
        results.preview.push({
          action: existing ? 'update' : 'create',
          catalogNumber: rec.catalogNumber,
          name: rec.name,
          price: rec.price,
          purchasePrice: rec.purchasePrice ?? null,
          unitOfMeasure: rec.unitOfMeasure ?? null,
          sku: rec.sku ?? null,
          oemNumber: rec.oemNumber ?? null,
          group: rec._group || null,
          categoryId: existing ? (existing.categoryId || null) : (pickCategoryIdForCreate({ name: rec.name, _group: rec._group }) || defaultCategoryId || (rules?.topLevel?.ostaloCategoryId || null)),
        });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ row: rowNo, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (outPath) {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Dry-run summary: total=${results.total}, success=${results.success}, failed=${results.failed}, created=${results.created.length}, updated=${results.updated.length}`);
    console.log(`Full results written to ${outPath}`);
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
