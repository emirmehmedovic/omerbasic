#!/usr/bin/env node
/*
  Analiza grupa iz proizvodi-2.csv i poređenje sa kategorijama.

  Usage:
    node scripts/analyze-proizvodi2-groups.js \
      --products "/Users/emir_mw/omerbasic/proizvodi-csv/proizvodi-2.csv" \
      --categories "/Users/emir_mw/omerbasic/categoryID-csv/Category.csv" \
      --out "scripts/out/groups-analysis.json"
*/

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function tokenize(text) {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[\"'()\[\],.%/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return [];
  const words = s.split(' ');
  return words.filter((w) => w && w.length >= 2 && !stopwords.has(w));
}

const stopwords = new Set([
  'i','za','od','na','u','sa','se','dx','lx','zd','pr','kpl','set','kom','mm','cm','kg','g','x','-','+',
  'svjetlo','svjetla','svijetlo','led','komplet','kpl.','pribor','ulja','ulje','guma','filter','filt','ploca','ploča','disk','kocnica','kočnica',
  'auto','vozila','vozilo','original','zamjenski','univerzalno','prednji','zadnji','lijevi','desni','golf','passat','audi','vw','bmw','mercedes','opel',
]);

function topN(map, n) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ term: k, count: v }));
}

function buildCategoryTree(categories) {
  const byId = new Map();
  const children = new Map();
  for (const c of categories) {
    byId.set(c.id, c);
    if (!children.has(c.parentId || null)) children.set(c.parentId || null, []);
    children.get(c.parentId || null).push(c);
  }
  return { byId, children };
}

function flatNames(categories) {
  // returns lowercase names => ids (multiple ids per name)
  const nameToIds = new Map();
  for (const c of categories) {
    const key = String(c.name || '').toLowerCase();
    if (!nameToIds.has(key)) nameToIds.set(key, []);
    nameToIds.get(key).push(c.id);
  }
  return nameToIds;
}

function main() {
  const productsCsv = argValue('--products') || 'proizvodi-csv/proizvodi-2.csv';
  const categoriesCsv = argValue('--categories') || 'categoryID-csv/Category.csv';
  const outPath = argValue('--out') || 'scripts/out/groups-analysis.json';

  if (!fs.existsSync(productsCsv)) {
    console.error(`Products CSV not found: ${productsCsv}`);
    process.exit(1);
  }
  if (!fs.existsSync(categoriesCsv)) {
    console.error(`Categories CSV not found: ${categoriesCsv}`);
    process.exit(1);
  }

  const productsRaw = fs.readFileSync(productsCsv, 'utf8');
  const products = parse(productsRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
  });

  const catsRaw = fs.readFileSync(categoriesCsv, 'utf8');
  const categories = parse(catsRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ',',
  }).map((r) => ({ id: r.id, name: r.name, parentId: r.parentId || null, level: r.level }));

  const catFlatNameIndex = flatNames(categories);

  const byGroup = new Map();
  for (const r of products) {
    const g = r.grupa || 'UNKNOWN';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  }

  const summary = [];
  for (const [group, rows] of byGroup.entries()) {
    const tokenFreq = new Map();
    for (const r of rows) {
      for (const t of tokenize(r.IMEART)) {
        tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
      }
    }
    const samples = rows.slice(0, 8).map((r) => r.IMEART);

    // naive suggestions by keyword presence
    const kws = topN(tokenFreq, 12).map((x) => x.term);
    const suggestions = [];
    const pushIf = (kw, catName) => {
      if (kws.some((t) => t.includes(kw))) suggestions.push(catName);
    };
    pushIf('filter', 'Filteri');
    pushIf('zrak', 'Filter zraka');
    pushIf('ulj', 'Filter ulja');
    pushIf('goriv', 'Filter goriva');
    pushIf('amort', 'Amortizer');
    pushIf('oprug', 'Opruge');
    pushIf('koc', 'Kočioni sistem');
    pushIf('disk', 'Disk kočnica');
    pushIf('ploc', 'Kočne obloge (pločice) / čeljust');
    pushIf('klijes', 'Kočno sedlo (kliješta) / pribor');
    pushIf('pum', 'Pumpa za vodu / brtva');
    pushIf('termost', 'Termostat / brtva termostata');
    pushIf('senz', 'Senzori');
    pushIf('svjec', 'Svjećice / bobine');
    pushIf('akumul', 'Akumulator');
    pushIf('kvac', 'Kvačilo / priključni dijelovi');
    pushIf('remen', 'Remenski pogon');
    pushIf('branik', 'Karoserija');
    pushIf('blatobran', 'Karoserija');
    pushIf('retro', 'Ostakljenje / retrovizori');
    pushIf('svjet', 'Svjetla (vanjska rasvjeta)');
    pushIf('guma', 'Kotači i gume');
    pushIf('ulje', 'Ulja i maziva');

    // link suggestions to category IDs by name match (best effort)
    const matchedCategoryIds = [];
    for (const s of suggestions) {
      const ids = catFlatNameIndex.get(String(s).toLowerCase()) || [];
      for (const id of ids) matchedCategoryIds.push({ name: s, id });
    }

    summary.push({
      group,
      count: rows.length,
      topTokens: topN(tokenFreq, 20),
      sampleNames: samples,
      nameSuggestions: suggestions,
      matchedCategories: matchedCategoryIds,
    });
  }

  summary.sort((a, b) => b.count - a.count);

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    source: {
      productsCsv,
      categoriesCsv,
    },
    totals: {
      groups: summary.length,
      rows: products.length,
    },
    summary,
  }, null, 2));

  console.log(`Wrote ${outPath}. Top 10 groups:`);
  for (const g of summary.slice(0, 10)) {
    console.log(`- grupa ${g.group}: ${g.count} artikala; npr: ${g.sampleNames[0]}`);
  }
}

main();
