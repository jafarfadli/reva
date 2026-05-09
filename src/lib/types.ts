import type { Table, Reservation } from "@prisma/client";

export type TableWithStatus = Table & {
  isOccupied: boolean;
};

export type { Table, Reservation };