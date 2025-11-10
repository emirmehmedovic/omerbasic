import { PrismaClient, VehicleType } from '@/generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CategoryData {
  externalId: string;
  name: string;
}

/**
 * Parsira .md fajl i izvlači kategorije
 */
function parseMdFile(filePath: string): CategoryData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const categories: CategoryData[] = [];
  
  // Regex za parsiranje tabele: | **100001** | Karoserija vozila |
  const regex = /\|\s*\*\*(\d+)\*\*\s*\|\s*([^|]+)\s*\|/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const externalId = match[1].trim();
    const name = match[2].trim();
    
    if (externalId && name) {
      categories.push({ externalId, name });
    }
  }
  
  return categories;
}

/**
 * Importuje kategorije za određeni tip vozila
 */
async function importCategories(
  filePath: string,
  vehicleType: VehicleType,
  parentCategoryName: string
) {
  console.log(`\n📂 Parsiranje fajla: ${filePath}`);
  const categories = parseMdFile(filePath);
  console.log(`✅ Pronađeno ${categories.length} kategorija\n`);

  // Pronađi ili kreiraj parent kategoriju
  let parentCategory = await prisma.category.findFirst({
    where: { name: parentCategoryName, parentId: null }
  });

  if (!parentCategory) {
    console.log(`📝 Kreiranje parent kategorije: ${parentCategoryName}`);
    parentCategory = await prisma.category.create({
      data: {
        name: parentCategoryName,
        level: 1,
      }
    });
  } else {
    console.log(`✓ Parent kategorija već postoji: ${parentCategoryName} (ID: ${parentCategory.id})`);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const cat of categories) {
    try {
      // Provjeri da li kategorija već postoji sa istim externalId
      const existingByExternalId = await prisma.category.findFirst({
        where: { externalId: cat.externalId }
      });

      if (existingByExternalId) {
        // Ažuriraj postojeću kategoriju
        await prisma.category.update({
          where: { id: existingByExternalId.id },
          data: {
            name: cat.name,
            parentId: parentCategory.id,
            level: 2,
          }
        });
        console.log(`🔄 Ažurirana: ${cat.name} (ID: ${cat.externalId})`);
        updated++;
        continue;
      }

      // Provjeri da li kategorija postoji sa istim imenom i parentom
      const existingByName = await prisma.category.findFirst({
        where: {
          name: cat.name,
          parentId: parentCategory.id
        }
      });

      if (existingByName) {
        // Ažuriraj externalId
        await prisma.category.update({
          where: { id: existingByName.id },
          data: {
            externalId: cat.externalId,
            level: 2,
          }
        });
        console.log(`🔄 Ažuriran externalId: ${cat.name} (ID: ${cat.externalId})`);
        updated++;
      } else {
        // Kreiraj novu kategoriju
        await prisma.category.create({
          data: {
            name: cat.name,
            externalId: cat.externalId,
            parentId: parentCategory.id,
            level: 2,
          }
        });
        console.log(`✨ Kreirana: ${cat.name} (ID: ${cat.externalId})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Greška za ${cat.name}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Statistika za ${parentCategoryName}:`);
  console.log(`   ✨ Kreirano: ${created}`);
  console.log(`   🔄 Ažurirano: ${updated}`);
  console.log(`   ⏭️  Preskočeno: ${skipped}`);
  console.log(`   📝 Ukupno: ${categories.length}\n`);
}

async function main() {
  console.log('🚀 Pokretanje importa TecDoc kategorija...\n');

  const rootDir = path.resolve(__dirname, '..');

  // Import kategorija za putnička vozila
  const putnickaVozilaPath = path.join(rootDir, 'putnička-vozila.md');
  if (fs.existsSync(putnickaVozilaPath)) {
    await importCategories(
      putnickaVozilaPath,
      VehicleType.PASSENGER,
      'Putnička vozila'
    );
  } else {
    console.log(`⚠️  Fajl nije pronađen: ${putnickaVozilaPath}`);
  }

  // Import kategorija za teretna vozila
  const teretnaVozilaPath = path.join(rootDir, 'teretna-vozila.md');
  if (fs.existsSync(teretnaVozilaPath)) {
    await importCategories(
      teretnaVozilaPath,
      VehicleType.COMMERCIAL,
      'Teretna vozila'
    );
  } else {
    console.log(`⚠️  Fajl nije pronađen: ${teretnaVozilaPath}`);
  }

  console.log('✅ Import završen!');
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
