const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('Admin korisnik uspješno kreiran:', admin);
  } catch (e) {
    if (e.code === 'P2002') {
      console.error(`Greška: Korisnik s emailom '${email}' već postoji.`);
    } else {
      console.error('Došlo je do greške:', e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

