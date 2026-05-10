"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

const RESERVATION_HOURS = 3;

export type CreateReservationInput = {
  tableId: string;
  customerName: string;
  customerPhone?: string;
  startTime: string;
};

export type CreateReservationResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Anda harus login untuk reservasi." };
  }

  if (!input.tableId || !input.customerName.trim() || !input.startTime) {
    return { ok: false, error: "Data reservasi tidak lengkap." };
  }

  const startTime = new Date(input.startTime);
  if (isNaN(startTime.getTime())) {
    return { ok: false, error: "Format waktu tidak valid." };
  }
  if (startTime.getTime() < Date.now() - 5 * 60 * 1000) {
    return { ok: false, error: "Waktu reservasi tidak boleh di masa lalu." };
  }

  const endTime = new Date(startTime.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: input.tableId },
        select: { id: true },
      });
      if (!table) throw new Error("TABLE_NOT_FOUND");

      const conflict = await tx.reservation.findFirst({
        where: {
          tableId: input.tableId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("CONFLICT");

      return await tx.reservation.create({
        data: {
          tableId: input.tableId,
          userId: session.user.id,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          startTime,
          endTime,
        },
      });
    });

    revalidatePath("/");
    return { ok: true, reservationId: reservation.id };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "TABLE_NOT_FOUND") return { ok: false, error: "Meja tidak ditemukan." };
      if (err.message === "CONFLICT") return { ok: false, error: "Meja sudah dipesan pada waktu tersebut." };
      if (err.message.includes("no_overlap_per_table") || err.message.includes("23P01")) {
        return { ok: false, error: "Meja sudah dipesan pada waktu tersebut." };
      }
    }
    console.error("Reservation error:", err);
    return { ok: false, error: "Gagal membuat reservasi. Coba lagi." };
  }
}