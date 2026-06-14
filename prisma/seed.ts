import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Hapus data lama biar idempotent
  // Seed menu items
  await prisma.reservationItem.deleteMany();
  await prisma.menuItem.deleteMany();

  await prisma.menuItem.createMany({
    data: [
      // FOOD
      { name: "Nasi Goreng Spesial", price: 28000, section: "FOOD", stock: 50 },
      { name: "Mie Ayam Bakso", price: 25000, section: "FOOD", stock: 40 },
      { name: "Ayam Bakar Madu", price: 35000, section: "FOOD", stock: 30 },
      { name: "Gado-Gado", price: 22000, section: "FOOD", stock: 25 },
      { name: "Sate Ayam (10 tusuk)", price: 30000, section: "FOOD", stock: 35 },
      // DRINK
      { name: "Es Teh Manis", price: 8000, section: "DRINK", stock: 100 },
      { name: "Es Jeruk", price: 10000, section: "DRINK", stock: 80 },
      { name: "Kopi Susu", price: 18000, section: "DRINK", stock: 60 },
      { name: "Jus Alpukat", price: 20000, section: "DRINK", stock: 40 },
      { name: "Air Mineral", price: 5000, section: "DRINK", stock: 200 },
    ],
  });

  console.log("Seed menu selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());