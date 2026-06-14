"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { MenuSection } from "@prisma/client";

async function requireAdminAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export type MenuActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ===== CREATE =====
export type CreateMenuInput = {
  name: string;
  price: number;
  section: MenuSection;
  stock: number;
};

export async function createMenuItem(
  input: CreateMenuInput,
): Promise<MenuActionResult<{ id: string }>> {
  try {
    await requireAdminAction();

    if (!input.name.trim()) return { ok: false, error: "Nama menu wajib diisi." };
    if (input.price < 0) return { ok: false, error: "Harga tidak boleh negatif." };
    if (input.stock < 0) return { ok: false, error: "Stok tidak boleh negatif." };

    const item = await prisma.menuItem.create({
      data: {
        name: input.name.trim(),
        price: Math.round(input.price),
        section: input.section,
        stock: Math.round(input.stock),
        isAvailable: true,
      },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/");
    return { ok: true, data: { id: item.id } };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Create menu error:", err);
    return { ok: false, error: "Gagal membuat menu." };
  }
}

// ===== UPDATE =====
export type UpdateMenuInput = {
  id: string;
  name?: string;
  price?: number;
  section?: MenuSection;
  stock?: number;
  isAvailable?: boolean;
};

export async function updateMenuItem(
  input: UpdateMenuInput,
): Promise<MenuActionResult> {
  try {
    await requireAdminAction();

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) return { ok: false, error: "Nama tidak boleh kosong." };
      data.name = input.name.trim();
    }
    if (input.price !== undefined) {
      if (input.price < 0) return { ok: false, error: "Harga tidak boleh negatif." };
      data.price = Math.round(input.price);
    }
    if (input.section !== undefined) data.section = input.section;
    if (input.stock !== undefined) {
      if (input.stock < 0) return { ok: false, error: "Stok tidak boleh negatif." };
      data.stock = Math.round(input.stock);
    }
    if (input.isAvailable !== undefined) data.isAvailable = input.isAvailable;

    await prisma.menuItem.update({ where: { id: input.id }, data });

    revalidatePath("/admin/menu");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Update menu error:", err);
    return { ok: false, error: "Gagal mengupdate menu." };
  }
}

// ===== DELETE =====
export async function deleteMenuItem(id: string): Promise<MenuActionResult> {
  try {
    await requireAdminAction();

    // Cek apakah menu pernah dipesan
    const orderCount = await prisma.reservationItem.count({
      where: { menuItemId: id },
    });

    if (orderCount > 0) {
      // Jangan hapus, cukup set unavailable (soft delete) untuk jaga riwayat
      await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
      revalidatePath("/admin/menu");
      revalidatePath("/");
      return {
        ok: false,
        error:
          "Menu ini sudah pernah dipesan, jadi tidak bisa dihapus permanen. Status diubah menjadi 'tidak tersedia' agar riwayat reservasi tetap utuh.",
      };
    }

    await prisma.menuItem.delete({ where: { id } });

    revalidatePath("/admin/menu");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return { ok: false, error: "Akses ditolak." };
    }
    console.error("Delete menu error:", err);
    return { ok: false, error: "Gagal menghapus menu." };
  }
}