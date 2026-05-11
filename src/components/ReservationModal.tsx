"use client";

import { useState, useTransition } from "react";
import type { TableWithStatus } from "@/lib/types";
import { createReservation } from "@/app/actions/reservations";

type Props = {
  table: TableWithStatus;
  startTime: Date;
  currentUser: { name: string; email: string } | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReservationModal({
  table,
  startTime,
  currentUser,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    setError(null);
    startTransition(async () => {
      const result = await createReservation({
        tableId: table.id,
        customerName: name,
        customerPhone: phone,
        startTime: startTime.toISOString(),
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
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6 border border-border-warm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
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

        <div className="bg-cream-light border border-border-soft rounded-md p-3.5 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-taupe">Mulai</span>
            <span className="font-semibold text-espresso">
              {fmt(startTime)}
            </span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-border-soft">
            <span className="text-taupe">Selesai</span>
            <span className="font-semibold text-espresso">{fmt(endTime)}</span>
          </div>
        </div>

        <div className="space-y-3">
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

        <p className="mt-3 text-xs text-taupe italic">
          Reservasi atas akun:{" "}
          <span className="font-medium text-mocha not-italic">
            {currentUser.email}
          </span>
        </p>

        {error && (
          <div className="mt-4 text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
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
            disabled={isPending}
            className="px-5 py-2 text-sm bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-medium disabled:opacity-50 shadow-sm"
          >
            {isPending ? "Memproses..." : "Konfirmasi Reservasi"}
          </button>
        </div>
      </div>
    </div>
  );
}