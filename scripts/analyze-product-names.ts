import { db } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface StatEntry {
  count: number;
  examples: string[];
}

async function main() {
  console.log('🔍 Učitavam nazive proizvoda iz baze...');

  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`✅ Učitano proizvoda: ${products.length}`);

  const tokenStats: Record<string, StatEntry> = {};
  const bigramStats: Record<string, StatEntry> = {};

  for (const product of products) {
    const originalName = (product.name || '').trim();
    if (!originalName) continue;

    const lower = originalName.toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      let tokenEntry = tokenStats[token];
      if (!tokenEntry) {
        tokenEntry = { count: 0, examples: [] };
        tokenStats[token] = tokenEntry;
      }
      tokenEntry.count++;
      if (tokenEntry.examples.length < 5) {
        tokenEntry.examples.push(originalName);
      }

      if (i + 1 < tokens.length) {
        const bigram = token + ' ' + tokens[i + 1];
        let bigramEntry = bigramStats[bigram];
        if (!bigramEntry) {
          bigramEntry = { count: 0, examples: [] };
          bigramStats[bigram] = bigramEntry;
        }
        bigramEntry.count++;
        if (bigramEntry.examples.length < 5) {
          bigramEntry.examples.push(originalName);
        }
      }
    }
  }

  const tokenList = Object.entries(tokenStats)
    .map(([token, entry]) => ({ token, count: entry.count, examples: entry.examples }))
    .sort((a, b) => b.count - a.count);

  const bigramList = Object.entries(bigramStats)
    .map(([phrase, entry]) => ({ phrase, count: entry.count, examples: entry.examples }))
    .sort((a, b) => b.count - a.count);

  const interestingTokens = tokenList
    .filter((t) => /[.\-/]/.test(t.token) || t.token.length <= 4)
    .slice(0, 300);

  const interestingBigrams = bigramList
    .filter((b) => /[.\-/]/.test(b.phrase) || b.phrase.split(' ').some((t) => t.length <= 4))
    .slice(0, 300);

  const output = {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    tokensTopAll: tokenList.slice(0, 300),
    bigramsTopAll: bigramList.slice(0, 300),
    tokensInteresting: interestingTokens,
    bigramsInteresting: interestingBigrams,
  };

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `product-name-analysis-${timestamp}.json`);

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');

  console.log('📄 Izvještaj sa analizom naziva spremljen u:');
  console.log(outFile);
}

main()
  .catch((error) => {
    console.error('❌ Greška u analizi naziva proizvoda:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
