import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Provjera starih kategorija za brisanje...\n');

  // Pronađi kategorije koje nisu TecDoc kategorije (nemaju externalId)
  // i nisu "Putnička vozila" ili "Teretna vozila"
  const oldCategories = await prisma.category.findMany({
    where: {
      AND: [
        { externalId: null },
        { parentId: null },
        {
          name: {
            notIn: ['Putnička vozila', 'Teretna vozila']
          }
        }
      ]
    },
    include: {
      _count: {
        select: { 
          products: true,
          children: true 
        }
      }
    }
  });

  if (oldCategories.length === 0) {
    console.log('✅ Nema starih kategorija za brisanje.');
    return;
  }

  console.log(`📋 Pronađeno ${oldCategories.length} starih kategorija:\n`);

  for (const cat of oldCategories) {
    console.log(`📁 ${cat.name}`);
    console.log(`   ID: ${cat.id}`);
    console.log(`   Proizvoda: ${cat._count.products}`);
    console.log(`   Podkategorija: ${cat._count.children}`);
    
    if (cat._count.products > 0) {
      console.log(`   ⚠️  NE MOŽE SE OBRISATI - ima proizvode!`);
    } else if (cat._count.children > 0) {
      console.log(`   ⚠️  NE MOŽE SE OBRISATI - ima podkategorije!`);
    } else {
      console.log(`   ✅ Može se sigurno obrisati`);
    }
    console.log('');
  }

  // Pitaj korisnika da li želi obrisati
  console.log('\n⚠️  UPOZORENJE: Ova skripta samo prikazuje kategorije.');
  console.log('Za brisanje, dodaj --delete flag:\n');
  console.log('  npm run cleanup:categories -- --delete\n');

  // Provjeri da li je proslijeđen --delete flag
  const shouldDelete = process.argv.includes('--delete');

  if (shouldDelete) {
    console.log('🗑️  Brisanje praznih kategorija...\n');
    
    let deleted = 0;
    let skipped = 0;

    for (const cat of oldCategories) {
      if (cat._count.products === 0 && cat._count.children === 0) {
        try {
          await prisma.category.delete({
            where: { id: cat.id }
          });
          console.log(`✅ Obrisana: ${cat.name}`);
          deleted++;
        } catch (error) {
          console.error(`❌ Greška pri brisanju ${cat.name}:`, error);
          skipped++;
        }
      } else {
        console.log(`⏭️  Preskočena: ${cat.name} (ima proizvode ili podkategorije)`);
        skipped++;
      }
    }

    console.log(`\n📊 Rezultat:`);
    console.log(`   ✅ Obrisano: ${deleted}`);
    console.log(`   ⏭️  Preskočeno: ${skipped}`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Greška:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
