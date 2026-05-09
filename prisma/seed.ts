import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Hapus data lama biar idempotent
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();

  await prisma.table.createMany({
    data: [
      { label: "T1", seats: 2, shape: "CIRCLE", x: 100, y: 100, width: 60, height: 60 },
      { label: "T2", seats: 4, shape: "RECTANGLE", x: 250, y: 100, width: 100, height: 80 },
      { label: "T3", seats: 4, shape: "RECTANGLE", x: 400, y: 100, width: 100, height: 80 },
      { label: "T4", seats: 6, shape: "RECTANGLE", x: 100, y: 250, width: 140, height: 80 },
      { label: "T5", seats: 2, shape: "CIRCLE", x: 320, y: 270, width: 60, height: 60 },
      { label: "T6", seats: 8, shape: "RECTANGLE", x: 450, y: 250, width: 160, height: 100 },
    ],
  });

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());