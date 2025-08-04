const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-admin-password.js <email> <newPassword>');
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log(`Lozinka za korisnika '${email}' je uspješno promijenjena.`);

  } catch (e) {
    console.error('Došlo je do greške prilikom promjene lozinke:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
