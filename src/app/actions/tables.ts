"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { TableShape } from "@prisma/client";

async function requireAdminAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ===== CREATE =====
export type CreateTableInput = {
  label: string;
  seats: number;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function createTable(
  input: CreateTableInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminAction();

    if (!input.label.trim()) return { ok: false, error: "Label wajib diisi." };
    if (input.seats < 1 || input.seats > 20)
      return { ok: false, error: "Jumlah kursi 1–20." };

    const table = await prisma.table.create({
      data: {
        label: input.label.trim(),
        seats: input.seats,
        shape: input.shape,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/layout");
    return { ok: true, data: { id: table.id } };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Create table error:", err);
    return { ok: false, error: "Gagal membuat meja." };
  }
}

// ===== UPDATE =====
export type UpdateTableInput = {
  id: string;
  label?: string;
  seats?: number;
  shape?: TableShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export async function updateTable(
  input: UpdateTableInput,
): Promise<ActionResult> {
  try {
    await requireAdminAction();

    const data: Record<string, unknown> = {};
    if (input.label !== undefined) {
      if (!input.label.trim())
        return { ok: false, error: "Label tidak boleh kosong." };
      data.label = input.label.trim();
    }
    if (input.seats !== undefined) {
      if (input.seats < 1 || input.seats > 20)
        return { ok: false, error: "Jumlah kursi 1–20." };
      data.seats = input.seats;
    }
    if (input.shape !== undefined) data.shape = input.shape;
    if (input.x !== undefined) data.x = input.x;
    if (input.y !== undefined) data.y = input.y;
    if (input.width !== undefined) data.width = input.width;
    if (input.height !== undefined) data.height = input.height;

    await prisma.table.update({ where: { id: input.id }, data });

    revalidatePath("/");
    revalidatePath("/admin/layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Update table error:", err);
    return { ok: false, error: "Gagal mengupdate meja." };
  }
}

// ===== DELETE =====
export async function deleteTable(id: string): Promise<ActionResult> {
  try {
    await requireAdminAction();

    // Cek reservasi upcoming yang akan terhapus (untuk informasi user, bukan blocker)
    const upcomingCount = await prisma.reservation.count({
      where: { tableId: id, endTime: { gt: new Date() } },
    });

    await prisma.table.delete({ where: { id } });
    // Cascade delete reservations otomatis terjadi karena schema kita pakai onDelete: Cascade

    revalidatePath("/");
    revalidatePath("/admin/layout");
    revalidatePath("/admin");

    if (upcomingCount > 0) {
      return {
        ok: true,
        // Kasih warning meski sukses
      };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Delete table error:", err);
    return { ok: false, error: "Gagal menghapus meja." };
  }
}

// ===== Action khusus: hitung reservasi terkait (sebelum delete) =====
export async function countUpcomingReservations(
  tableId: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdminAction();
    const count = await prisma.reservation.count({
      where: { tableId, endTime: { gt: new Date() } },
    });
    return { ok: true, data: { count } };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    return { ok: false, error: "Gagal mengecek reservasi." };
  }
}