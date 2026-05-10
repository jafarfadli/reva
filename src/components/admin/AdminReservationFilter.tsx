"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReservation } from "@/app/actions/reservations";

type ReservationRow = {
  id: string;
  tableLabel: string;
  tableSeats: number;
  customerName: string;
  customerPhone: string | null;
  userEmail: string | null;
  startTime: string; // ISO
  endTime: string;   // ISO
};

type Props = {
  activeDate: string;
  reservations: ReservationRow[];
};

export default function AdminReservationFilter({
  activeDate,
  reservations,
}: Props) {
  const router = useRouter();

  const handleDateChange = (date: string) => {
    router.push(`/admin?date=${date}`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">
          Filter tanggal:
        </label>
        <input
          type="date"
          value={activeDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => handleDateChange(formatToday())}
          className="text-xs text-green-700 hover:underline ml-auto"
        >
          Reset ke hari ini
        </button>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white border border-dashed rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">
            Tidak ada reservasi pada tanggal ini.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <Th>Waktu</Th>
                  <Th>Meja</Th>
                  <Th>Pemesan</Th>
                  <Th>Akun</Th>
                  <Th>Status</Th>
                  <Th align="right">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r) => (
                  <ReservationRow key={r.id} reservation={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide text-${align}`}
    >
      {children}
    </th>
  );
}

function ReservationRow({ reservation }: { reservation: ReservationRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const now = Date.now();

  const isOngoing = start.getTime() <= now && end.getTime() > now;
  const isUpcoming = start.getTime() > now;
  const isPast = end.getTime() <= now;

  const status = isOngoing
    ? { label: "Berlangsung", color: "bg-amber-100 text-amber-800" }
    : isUpcoming
    ? { label: "Akan datang", color: "bg-green-100 text-green-800" }
    : { label: "Selesai", color: "bg-gray-100 text-gray-600" };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCancel = () => {
    if (!confirm(`Batalkan reservasi meja ${reservation.tableLabel}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelReservation(reservation.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <>
      <tr className={isPast ? "bg-gray-50/50" : ""}>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-mono text-sm font-medium text-gray-900">
            {fmtTime(start)} – {fmtTime(end)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-semibold text-gray-900">
            {reservation.tableLabel}
          </div>
          <div className="text-xs text-gray-500">
            {reservation.tableSeats} kursi
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">
            {reservation.customerName}
          </div>
          {reservation.customerPhone && (
            <div className="text-xs text-gray-500">
              {reservation.customerPhone}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-gray-600">
            {reservation.userEmail ?? <span className="italic">tanpa akun</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}
          >
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {!isPast && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="px-3 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {isPending ? "..." : "Batalkan"}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="px-4 py-2 bg-red-50">
            <div className="text-sm text-red-700">{error}</div>
          </td>
        </tr>
      )}
    </>
  );
}

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}