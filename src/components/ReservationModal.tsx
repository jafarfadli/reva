"use client";

import { useState, useTransition, useMemo } from "react";
import type { TableWithStatus } from "@/lib/types";
import { createReservation } from "@/app/actions/reservations";
import { MINIMUM_ORDER } from "@/lib/constants";
import type { MenuItemForOrder } from "./TimelineExplorer";

type Props = {
  table: TableWithStatus;
  startTime: Date;
  currentUser: { name: string; email: string } | null;
  menuItems: MenuItemForOrder[];
  onClose: () => void;
  onSuccess: () => void;
};

const SECTION_LABELS: Record<string, string> = {
  FOOD: "Makanan",
  DRINK: "Minuman",
  DESSERT: "Dessert",
  SNACK: "Snack",
};

const SECTION_ORDER = ["FOOD", "DRINK", "DESSERT", "SNACK"];

const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function ReservationModal({
  table,
  startTime,
  currentUser,
  menuItems,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const groupedMenu = useMemo(() => {
    return SECTION_ORDER.map((section) => ({
      section,
      label: SECTION_LABELS[section],
      items: menuItems.filter((m) => m.section === section),
    })).filter((g) => g.items.length > 0);
  }, [menuItems]);

  const { totalItems, totalPrice, orderItems } = useMemo(() => {
    let count = 0;
    let price = 0;
    const items: { menuItemId: string; quantity: number }[] = [];
    for (const [id, qty] of Object.entries(quantities)) {
      if (qty > 0) {
        const menu = menuItems.find((m) => m.id === id);
        if (menu) {
          count += qty;
          price += menu.price * qty;
          items.push({ menuItemId: id, quantity: qty });
        }
      }
    }
    return { totalItems: count, totalPrice: price, orderItems: items };
  }, [quantities, menuItems]);

  const meetsMinimum = totalPrice >= MINIMUM_ORDER;
  const remaining = Math.max(0, MINIMUM_ORDER - totalPrice);

  const setQty = (id: string, qty: number, maxStock: number) => {
    const clamped = Math.max(0, Math.min(qty, maxStock));
    setQuantities((prev) => ({ ...prev, [id]: clamped }));
  };

  if (!currentUser) {
    return (
      <div
        className="fixed inset-0 bg-espresso/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 border border-border-warm max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-serif text-2xl text-espresso mb-2 font-semibold">
            Login diperlukan
          </h2>
          <p className="text-sm text-mocha mb-5 leading-relaxed">
            Silakan login dengan akun Google terlebih dahulu untuk membuat
            reservasi.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border-warm text-cocoa rounded-md hover:bg-cream-dark transition font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    if (!meetsMinimum) {
      setError(
        `Total pre-order minimum ${formatRupiah(MINIMUM_ORDER)}. Kurang ${formatRupiah(remaining)} lagi.`,
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createReservation({
        tableId: table.id,
        customerName: name,
        customerPhone: phone,
        startTime: startTime.toISOString(),
        items: orderItems,
      });
      if (result.ok) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 bg-espresso/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 sm:p-6 border border-border-warm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <div className="text-xs font-semibold text-terracotta uppercase tracking-wider mb-1">
            Reservasi Meja
          </div>
          <h2 className="font-serif text-2xl text-espresso font-semibold">
            Meja {table.label}
          </h2>
          <p className="text-sm text-mocha mt-0.5">
            {table.seats} kursi · Durasi 3 jam
          </p>
        </div>

        <div className="bg-cream-light border border-border-soft rounded-md p-3.5 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-taupe">Mulai</span>
            <span className="font-semibold text-espresso">{fmt(startTime)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-border-soft">
            <span className="text-taupe">Selesai</span>
            <span className="font-semibold text-espresso">{fmt(endTime)}</span>
          </div>
        </div>

        {/* Data diri */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
              Nama <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-cream-light border border-border-warm rounded-md text-espresso placeholder:text-taupe focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition text-sm"
              placeholder="Nama pemesan"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
              No. HP (opsional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-cream-light border border-border-warm rounded-md text-espresso placeholder:text-taupe focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition text-sm"
              placeholder="08xxxxxxxxxx"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Menu selection */}
        {groupedMenu.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-mocha uppercase tracking-wide">
                Pre-order Menu <span className="text-terracotta">*</span>
              </div>
              <div className="text-xs text-mocha">
                Min. {formatRupiah(MINIMUM_ORDER)}
              </div>
            </div>
            <div className="space-y-4">
              {groupedMenu.map((group) => (
                <div key={group.section}>
                  <div className="text-sm font-semibold text-espresso mb-2">
                    {group.label}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const qty = quantities[item.id] ?? 0;
                      const soldOut = item.stock === 0;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-md border ${
                            soldOut
                              ? "border-border-soft bg-cream-light opacity-60"
                              : "border-border-warm bg-white"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-espresso truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-mocha">
                              {formatRupiah(item.price)}
                              {soldOut ? (
                                <span className="text-clay-dark ml-1">
                                  · Habis
                                </span>
                              ) : (
                                <span className="text-taupe ml-1">
                                  · Stok {item.stock}
                                </span>
                              )}
                            </div>
                          </div>
                          {!soldOut && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setQty(item.id, qty - 1, item.stock)
                                }
                                disabled={isPending || qty === 0}
                                className="w-8 h-8 rounded-md border border-border-warm text-espresso hover:bg-cream-dark transition disabled:opacity-30 flex items-center justify-center text-lg leading-none"
                                aria-label="Kurangi"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-sm font-semibold text-espresso">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQty(item.id, qty + 1, item.stock)
                                }
                                disabled={isPending || qty >= item.stock}
                                className="w-8 h-8 rounded-md border border-border-warm text-espresso hover:bg-cream-dark transition disabled:opacity-30 flex items-center justify-center text-lg leading-none"
                                aria-label="Tambah"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total + minimum progress */}
        <div
          className={`rounded-md p-3.5 mb-4 border ${
            meetsMinimum
              ? "bg-sage-subtle border-sage/30"
              : "bg-cream-light border-border-warm"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-cocoa">
              {totalItems > 0 ? `${totalItems} item dipesan` : "Belum ada item"}
            </span>
            <span
              className={`font-serif text-lg font-semibold ${
                meetsMinimum ? "text-sage-dark" : "text-espresso"
              }`}
            >
              {formatRupiah(totalPrice)}
            </span>
          </div>
          {meetsMinimum ? (
            <div className="text-xs text-sage-dark flex items-center gap-1">
              <span>✓</span> Minimum pemesanan terpenuhi
            </div>
          ) : (
            <div className="text-xs text-mocha">
              Kurang{" "}
              <span className="font-semibold text-terracotta-dark">
                {formatRupiah(remaining)}
              </span>{" "}
              lagi untuk mencapai minimum {formatRupiah(MINIMUM_ORDER)}
            </div>
          )}
        </div>

        <p className="text-xs text-taupe italic mb-2">
          Reservasi atas akun:{" "}
          <span className="font-medium text-mocha not-italic">
            {currentUser.email}
          </span>
        </p>

        {error && (
          <div className="mb-4 text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm border border-border-warm text-cocoa rounded-md hover:bg-cream-dark transition font-medium disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !meetsMinimum}
            className="px-5 py-2 text-sm bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isPending
              ? "Memproses..."
              : meetsMinimum
              ? `Konfirmasi · ${formatRupiah(totalPrice)}`
              : "Pesan minimum dulu"}
          </button>
        </div>
      </div>
    </div>
  );
}