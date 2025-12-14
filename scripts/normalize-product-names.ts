import { db } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { nameRules } from './product-name-normalization-rules';

interface NameChange {
  id: string;
  oldName: string;
  newName: string;
  appliedRules: string[];
}

function applyRules(name: string): { newName: string; appliedRules: string[] } {
  let current = name || '';
  const applied: string[] = [];

  for (const rule of nameRules) {
    let ruleApplied = false;
    const next = current.replace(rule.pattern, (match) => {
      ruleApplied = true;
      return rule.replacement;
    });
    if (ruleApplied) {
      applied.push(rule.id);
      current = next;
    }
  }

  return { newName: current, appliedRules: Array.from(new Set(applied)) };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  console.log(`Normalizacija naziva proizvoda. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`Učitano proizvoda: ${products.length}`);

  const changes: NameChange[] = [];

  for (const product of products) {
    const originalName = product.name || '';
    const { newName, appliedRules } = applyRules(originalName);

    if (newName !== originalName && appliedRules.length > 0) {
      changes.push({
        id: product.id,
        oldName: originalName,
        newName,
        appliedRules,
      });
    }
  }

  console.log(`Pronađeno naziva za promjenu: ${changes.length}`);

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `product-name-normalization-${timestamp}.json`);

  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: apply ? 'APPLY' : 'DRY-RUN',
        totalProducts: products.length,
        totalChanged: changes.length,
        changes,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('Izvještaj o promjenama spremljen u:');
  console.log(outFile);

  if (!apply || changes.length === 0) {
    console.log('Dry-run ili nema promjena. Baza nije mijenjana.');
    return;
  }

  console.log('Primjenjujem promjene u bazi...');

  const batchSize = 500;
  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = changes.slice(i, i + batchSize);

    await db.$transaction(
      batch.map((change) =>
        db.product.update({
          where: { id: change.id },
          data: { name: change.newName },
        }),
      ),
    );

    console.log(`Ažurirano ${Math.min(i + batchSize, changes.length)} / ${changes.length}`);
  }

  console.log('Normalizacija naziva završena.');
}

main()
  .catch((error) => {
    console.error('Greška u normalizaciji naziva proizvoda:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
