"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { MINIMUM_ORDER } from "@/lib/constants";

const RESERVATION_HOURS = 3;
const WALK_IN_DEFAULT_HOURS = 3;

function formatRupiahServer(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

// ============================================================
// Types
// ============================================================

export type ReservationItemInput = {
  menuItemId: string;
  quantity: number;
};

export type CreateReservationInput = {
  tableId: string;
  customerName: string;
  customerPhone?: string;
  startTime: string;
  items: ReservationItemInput[];
};

export type CreateReservationResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

export type CancelReservationResult =
  | { ok: true }
  | { ok: false; error: string };

type ActionResult = { ok: true } | { ok: false; error: string };

// ============================================================
// CREATE RESERVATION (customer, dengan pre-order wajib)
// ============================================================

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

  const endTime = new Date(
    startTime.getTime() + RESERVATION_HOURS * 60 * 60 * 1000,
  );

  // Validasi items — pre-order wajib dengan minimum order
  const items = input.items ?? [];
  if (items.length === 0) {
    return {
      ok: false,
      error: `Pre-order menu wajib. Minimum pemesanan ${formatRupiahServer(MINIMUM_ORDER)}.`,
    };
  }
  for (const item of items) {
    if (item.quantity < 1) {
      return { ok: false, error: "Jumlah pesanan menu tidak valid." };
    }
  }

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Cek meja exists
      const table = await tx.table.findUnique({
        where: { id: input.tableId },
        select: { id: true },
      });
      if (!table) throw new Error("TABLE_NOT_FOUND");

      // 2. Cek konflik reservasi (anti double-booking)
      const conflict = await tx.reservation.findFirst({
        where: {
          tableId: input.tableId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("CONFLICT");

      // 3. Validasi & decrement stock untuk tiap menu item
      const orderItemsData: {
        menuItemId: string;
        quantity: number;
        priceAtOrder: number;
      }[] = [];

      for (const item of items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            isAvailable: true,
          },
        });

        if (!menuItem) {
          throw new Error(`MENU_NOT_FOUND:${item.menuItemId}`);
        }
        if (!menuItem.isAvailable) {
          throw new Error(`MENU_UNAVAILABLE:${menuItem.name}`);
        }
        if (menuItem.stock < item.quantity) {
          throw new Error(
            `INSUFFICIENT_STOCK:${menuItem.name}:${menuItem.stock}`,
          );
        }

        // Decrement stock
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { decrement: item.quantity } },
        });

        orderItemsData.push({
          menuItemId: menuItem.id,
          quantity: item.quantity,
          priceAtOrder: menuItem.price, // snapshot harga
        });
      }

      // 3b. Validasi minimum order (pakai harga dari DB, bukan dari client)
      const orderTotal = orderItemsData.reduce(
        (sum, it) => sum + it.priceAtOrder * it.quantity,
        0,
      );
      if (orderTotal < MINIMUM_ORDER) {
        throw new Error(`BELOW_MINIMUM:${orderTotal}`);
      }

      // 4. Create reservation dengan items
      return await tx.reservation.create({
        data: {
          tableId: input.tableId,
          userId: session.user.id,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          startTime,
          endTime,
          items: {
            create: orderItemsData,
          },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true, reservationId: reservation.id };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "TABLE_NOT_FOUND")
        return { ok: false, error: "Meja tidak ditemukan." };
      if (err.message === "CONFLICT")
        return { ok: false, error: "Meja sudah dipesan pada waktu tersebut." };
      if (err.message.startsWith("MENU_NOT_FOUND"))
        return { ok: false, error: "Salah satu menu tidak ditemukan." };
      if (err.message.startsWith("MENU_UNAVAILABLE")) {
        const name = err.message.split(":")[1];
        return { ok: false, error: `Menu "${name}" sedang tidak tersedia.` };
      }
      if (err.message.startsWith("INSUFFICIENT_STOCK")) {
        const [, name, stock] = err.message.split(":");
        return {
          ok: false,
          error: `Stok "${name}" tidak cukup. Tersisa: ${stock}.`,
        };
      }
      if (err.message.startsWith("BELOW_MINIMUM")) {
        const total = parseInt(err.message.split(":")[1]);
        return {
          ok: false,
          error: `Total pre-order ${formatRupiahServer(total)} masih di bawah minimum ${formatRupiahServer(MINIMUM_ORDER)}.`,
        };
      }
      if (
        err.message.includes("no_overlap_per_table") ||
        err.message.includes("23P01")
      ) {
        return { ok: false, error: "Meja sudah dipesan pada waktu tersebut." };
      }
    }
    console.error("Reservation error:", err);
    return { ok: false, error: "Gagal membuat reservasi. Coba lagi." };
  }
}

// ============================================================
// CANCEL RESERVATION (kembalikan stock + hapus)
// ============================================================

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
      select: {
        userId: true,
        startTime: true,
        items: {
          select: { menuItemId: true, quantity: true },
        },
      },
    });

    if (!reservation) {
      return { ok: false, error: "Reservasi tidak ditemukan." };
    }

    const isOwner = reservation.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return {
        ok: false,
        error: "Anda tidak punya akses untuk membatalkan reservasi ini.",
      };
    }

    if (!isAdmin && reservation.startTime.getTime() < Date.now()) {
      return {
        ok: false,
        error: "Reservasi yang sudah berlangsung tidak bisa dibatalkan.",
      };
    }

    // Transaction: kembalikan stock + hapus reservasi
    await prisma.$transaction(async (tx) => {
      for (const item of reservation.items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.reservation.delete({ where: { id: reservationId } });
    });

    revalidatePath("/");
    revalidatePath("/my-reservations");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("Cancel error:", err);
    return { ok: false, error: "Gagal membatalkan reservasi." };
  }
}

// ============================================================
// QUICK ASSIGN WALK-IN (admin, tanpa minimum & tanpa menu)
// ============================================================

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

// ============================================================
// RELEASE TABLE (admin, bebaskan meja yang sedang terisi)
// ============================================================

export async function releaseTable(tableId: string): Promise<ActionResult> {
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
      select: {
        id: true,
        items: { select: { menuItemId: true, quantity: true } },
      },
    });

    if (!active) {
      return { ok: false, error: "Tidak ada reservasi aktif di meja ini." };
    }

    // Transaction: kembalikan stock + hapus reservasi
    await prisma.$transaction(async (tx) => {
      for (const item of active.items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.reservation.delete({ where: { id: active.id } });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/walk-in");
    return { ok: true };
  } catch (err) {
    console.error("Release table error:", err);
    return { ok: false, error: "Gagal membebaskan meja." };
  }
}