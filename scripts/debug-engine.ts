import { db } from '../src/lib/db';

async function main() {
  const externalId = process.argv[2];
  if (!externalId) {
    console.error('Usage: tsx scripts/debug-engine.ts <engine-external-id>');
    process.exit(1);
  }

  const engines = await db.vehicleEngine.findMany({
    where: { externalId },
    include: {
      generation: {
        include: {
          model: {
            select: {
              id: true,
              name: true,
              externalId: true,
            },
          },
        },
      },
    },
  });

  if (engines.length === 0) {
    console.log(`No engines found for externalId ${externalId}`);
  } else {
    console.log(JSON.stringify(engines, null, 2));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
