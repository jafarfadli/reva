import { prisma } from "@/lib/prisma";
import type { TableWithStatus } from "@/lib/types";
import type { Table, Reservation } from "@prisma/client";

export async function getTablesAtTime(at: Date): Promise<TableWithStatus[]> {
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
    include: {
      reservations: {
        where: {
          startTime: { lte: at },
          endTime: { gt: at },
        },
        select: { id: true },
      },
    },
  });

  return tables.map(({ reservations, ...table }) => ({
    ...table,
    isOccupied: reservations.length > 0,
  }));
}

/**
 * Ambil semua meja + reservasi dalam window tertentu.
 * Client akan hitung occupancy per waktu yang dipilih slider.
 */
export async function getTablesWithReservations(
  windowStart: Date,
  windowEnd: Date,
): Promise<{ tables: Table[]; reservations: Reservation[] }> {
  const [tables, reservations] = await Promise.all([
    prisma.table.findMany({ orderBy: { label: "asc" } }),
    prisma.reservation.findMany({
      where: {
        // Reservasi yang overlap dengan window
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return { tables, reservations };
}