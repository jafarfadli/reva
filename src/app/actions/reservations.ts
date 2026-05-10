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

export type CancelReservationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelReservation(
  reservationId: string,
): Promise<CancelReservationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Anda harus login." };
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, startTime: true },
    });

    if (!reservation) {
      return { ok: false, error: "Reservasi tidak ditemukan." };
    }

    // Hanya pemilik atau admin yang bisa cancel
    const isOwner = reservation.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return { ok: false, error: "Anda tidak punya akses untuk membatalkan reservasi ini." };
    }

    // Admin boleh cancel kapan pun. Customer tidak bisa cancel reservasi yang sudah mulai.
    if (!isAdmin && reservation.startTime.getTime() < Date.now()) {
      return { ok: false, error: "Reservasi yang sudah berlangsung tidak bisa dibatalkan." };
    }

    await prisma.reservation.delete({ where: { id: reservationId } });

    revalidatePath("/");
    revalidatePath("/my-reservations");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("Cancel error:", err);
    return { ok: false, error: "Gagal membatalkan reservasi." };
  }
}

export type CreateWalkInInput = {
  tableId: string;
  customerName: string;
  customerPhone?: string;
  durationHours: number;
};

export async function createWalkInReservation(
  input: CreateWalkInInput,
): Promise<CreateReservationResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Akses ditolak. Hanya admin yang bisa assign walk-in." };
  }

  if (!input.tableId || !input.customerName.trim()) {
    return { ok: false, error: "Data tidak lengkap." };
  }

  if (input.durationHours < 1 || input.durationHours > 6) {
    return { ok: false, error: "Durasi harus 1–6 jam." };
  }

  // Walk-in mulai SEKARANG (dibulatkan ke menit penuh biar rapi)
  const startTime = new Date();
  startTime.setSeconds(0, 0);
  const endTime = new Date(startTime.getTime() + input.durationHours * 60 * 60 * 1000);

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
          userId: null, // walk-in tidak terkait akun customer
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          startTime,
          endTime,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/walk-in");
    return { ok: true, reservationId: reservation.id };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "TABLE_NOT_FOUND") return { ok: false, error: "Meja tidak ditemukan." };
      if (err.message === "CONFLICT") return { ok: false, error: "Meja sedang terisi atau ada reservasi yang akan datang dalam durasi tersebut." };
      if (err.message.includes("no_overlap_per_table") || err.message.includes("23P01")) {
        return { ok: false, error: "Meja sedang terisi atau ada konflik reservasi." };
      }
    }
    console.error("Walk-in error:", err);
    return { ok: false, error: "Gagal membuat walk-in reservation." };
  }
}

const WALK_IN_DEFAULT_HOURS = 3;

export async function quickAssignWalkIn(
  tableId: string,
): Promise<CreateReservationResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Akses ditolak." };
  }

  const startTime = new Date();
  startTime.setSeconds(0, 0);
  const endTime = new Date(
    startTime.getTime() + WALK_IN_DEFAULT_HOURS * 60 * 60 * 1000,
  );

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId },
        select: { id: true, label: true },
      });
      if (!table) throw new Error("TABLE_NOT_FOUND");

      const conflict = await tx.reservation.findFirst({
        where: {
          tableId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true, startTime: true },
      });
      if (conflict) throw new Error("CONFLICT");

      return await tx.reservation.create({
        data: {
          tableId,
          userId: null,
          customerName: "Walk-in",
          customerPhone: null,
          startTime,
          endTime,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/walk-in");
    return { ok: true, reservationId: reservation.id };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "TABLE_NOT_FOUND")
        return { ok: false, error: "Meja tidak ditemukan." };
      if (err.message === "CONFLICT")
        return {
          ok: false,
          error: `Meja akan terpakai reservasi lain dalam ${WALK_IN_DEFAULT_HOURS} jam ke depan.`,
        };
      if (err.message.includes("23P01")) {
        return { ok: false, error: "Konflik dengan reservasi lain." };
      }
    }
    console.error("Quick assign error:", err);
    return { ok: false, error: "Gagal assign walk-in." };
  }
}

export async function releaseTable(
  tableId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Akses ditolak." };
  }

  try {
    const now = new Date();
    const active = await prisma.reservation.findFirst({
      where: {
        tableId,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      select: { id: true },
    });

    if (!active) {
      return { ok: false, error: "Tidak ada reservasi aktif di meja ini." };
    }

    await prisma.reservation.delete({ where: { id: active.id } });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/walk-in");
    return { ok: true };
  } catch (err) {
    console.error("Release table error:", err);
    return { ok: false, error: "Gagal membebaskan meja." };
  }
}

type ActionResult = { ok: true } | { ok: false; error: string };