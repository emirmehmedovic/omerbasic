const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/promote-to-admin.js <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Greška: Korisnik s emailom '${email}' nije pronađen.`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { email: email },
      data: { role: 'ADMIN' },
    });

    console.log(`Korisnik '${email}' je uspješno promoviran u administratora.`);

  } catch (e) {
    console.error('Došlo je do greške prilikom promjene uloge:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
