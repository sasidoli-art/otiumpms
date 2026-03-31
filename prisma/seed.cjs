const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('Otium2025!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@otiumweek.it' },
    update: {},
    create: {
      email: 'admin@otiumweek.it',
      password,
      nome: 'Admin',
      cognome: 'Otium',
      role: 'ADMIN',
    },
  })
  console.log('Admin creato:', admin.email)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
