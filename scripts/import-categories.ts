import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { db } from '../src/lib/db';

/**
 * This script imports nested categories into the Category table.
 * It ensures a root category (default: "Putnička vozila") exists, then
 * recursively creates child categories from a nested JSON structure.
 *
 * JSON format example (object of name -> children):
 * {
 *   "Elektrika i elektronika": {
 *     "Akumulator": [],
 *     "Svjetla": { "Glavni far": [], "Zadnje svjetlo": [] }
 *   },
 *   "Filteri": { "Filter ulja": [], "Filter zraka": [] }
 * }
 *
 * Usage:
 *   npx ts-node scripts/import-categories.ts <path-to-json> [root-name]
 * or
 *   npx tsx scripts/import-categories.ts <path-to-json> [root-name]
 */

type JsonArray = any[];
interface JsonMap {
  [key: string]: JsonTree;
}
type JsonTree = JsonMap | JsonArray;

async function upsertCategory(name: string, parentId: string | null) {
  // Unique on (name, parentId)
  const existing = await db.category.findFirst({ where: { name, parentId } });
  if (existing) return existing;
  const created = await db.category.create({ data: { name, parentId } });
  console.log(`${parentId ? '  ' : ''}Created category: ${name}${parentId ? '' : ' (root)'}`);
  return created;
}

async function importChildren(parentId: string, node: JsonTree, depth = 1): Promise<void> {
  // If node is an array, create children for string items, and recurse for object items if any
  if (Array.isArray(node)) {
    for (const item of node as any[]) {
      if (typeof item === 'string') {
        await upsertCategory(item, parentId);
      } else if (item && typeof item === 'object') {
        // Rare case: array contains nested objects
        await importChildren(parentId, item as JsonTree, depth + 1);
      }
      // Non-string, non-object items are ignored
    }
    return;
  }

  // Node is an object: keys are category names, values are either [] / array of strings or nested object
  for (const [name, children] of Object.entries(node as JsonMap)) {
    const child = await upsertCategory(name, parentId);
    await importChildren(child.id, children, depth + 1);
  }
}

async function importFromFile(filePath: string, rootName: string) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = readFileSync(fullPath, 'utf-8');
  const parsed = JSON.parse(raw) as JsonTree;

  // Ensure parsed is an object (mapping name -> node)
  if (Array.isArray(parsed)) {
    throw new Error('Expected a JSON object mapping category names to children, but got an array.');
  }

  // Ensure root exists
  let root = await db.category.findFirst({ where: { name: rootName, parentId: null } });
  if (!root) {
    root = await db.category.create({ data: { name: rootName, parentId: null } });
    console.log(`Created root category: ${rootName}`);
  } else {
    console.log(`Using existing root category: ${rootName}`);
  }

  // Import
  await importChildren(root.id, parsed);
}

async function main() {
  const fileArg = process.argv[2];
  const rootName = process.argv[3] || 'Putnička vozila';
  if (!fileArg) {
    console.error('Usage: npx tsx scripts/import-categories.ts <path-to-json> [root-name]');
    console.error('   or: npx ts-node scripts/import-categories.ts <path-to-json> [root-name]');
    process.exit(1);
  }

  console.log(`Importing categories from: ${fileArg}`);
  console.log(`Root category: ${rootName}`);
  await importFromFile(fileArg, rootName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
