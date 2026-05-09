import type { Table, Reservation } from "@prisma/client";
import type { TableWithStatus } from "@/lib/types";

export function computeOccupancy(
  tables: Table[],
  reservations: Reservation[],
  at: Date,
): TableWithStatus[] {
  const atMs = at.getTime();

  return tables.map((table) => {
    const isOccupied = reservations.some(
      (r) =>
        r.tableId === table.id &&
        new Date(r.startTime).getTime() <= atMs &&
        new Date(r.endTime).getTime() > atMs,
    );
    return { ...table, isOccupied };
  });
}