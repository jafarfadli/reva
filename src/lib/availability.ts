import { prisma } from "@/lib/prisma";
import type { TableWithStatus } from "@/lib/types";
import type { Table, Reservation } from "@prisma/client";

/**
 * Ambil semua meja dengan status occupied/free pada waktu tertentu.
 * Meja "occupied" jika ada reservasi yang overlap dengan `at`.
 */
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
 * Client akan hitung occupancy per waktu yang dipilih dropdown.
 */
export async function getTablesWithReservations(
  windowStart: Date,
  windowEnd: Date,
): Promise<{ tables: Table[]; reservations: Reservation[] }> {
  const [tables, reservations] = await Promise.all([
    prisma.table.findMany({ orderBy: { label: "asc" } }),
    prisma.reservation.findMany({
      where: {
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return { tables, reservations };
}

/**
 * Ambil daftar reservasi milik seorang user, beserta info meja.
 */
export async function getUserReservations(userId: string) {
  return prisma.reservation.findMany({
    where: { userId },
    include: {
      table: { select: { label: true, seats: true } },
    },
    orderBy: { startTime: "desc" },
  });
}

/**
 * Ambil semua reservasi dalam rentang tanggal, beserta info meja & user.
 * Dipakai admin dashboard.
 */
export async function getAllReservations(
  rangeStart: Date,
  rangeEnd: Date,
) {
  return prisma.reservation.findMany({
    where: {
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
    },
    include: {
      table: { select: { label: true, seats: true } },
      user: { select: { email: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getTablesWithActiveReservation(at: Date) {
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
    include: {
      reservations: {
        where: {
          startTime: { lte: at },
          endTime: { gt: at },
        },
        select: { id: true, customerName: true, endTime: true },
        take: 1,
      },
    },
  });

  return tables.map(({ reservations, ...table }) => ({
    ...table,
    isOccupied: reservations.length > 0,
    activeReservation: reservations[0]
      ? {
          id: reservations[0].id,
          customerName: reservations[0].customerName,
          endTime: reservations[0].endTime.toISOString(),
        }
      : null,
  }));
}