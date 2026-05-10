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

  // Kalau belum login, tampilkan pesan login required
  if (!currentUser) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-2">Login diperlukan</h2>
          <p className="text-sm text-gray-600 mb-4">
            Silakan login dengan akun Google terlebih dahulu untuk membuat reservasi.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-1">Reservasi Meja {table.label}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {table.seats} kursi · Durasi 3 jam
        </p>

        <div className="bg-gray-50 border rounded p-3 mb-4 text-sm space-y-1">
          <div>
            <span className="text-gray-500">Mulai: </span>
            <span className="font-medium">{fmt(startTime)}</span>
          </div>
          <div>
            <span className="text-gray-500">Selesai: </span>
            <span className="font-medium">{fmt(endTime)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Nama pemesan"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              No. HP (opsional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="08xxxxxxxxxx"
              disabled={isPending}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Reservasi atas akun:{" "}
          <span className="font-medium">{currentUser.email}</span>
        </p>

        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "Memproses..." : "Konfirmasi Reservasi"}
          </button>
        </div>
      </div>
    </div>
  );
}