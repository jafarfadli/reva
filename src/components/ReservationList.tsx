"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReservation } from "@/app/actions/reservations";

type ReservationItem = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  table: { label: string; seats: number };
};

type Props = {
  reservations: ReservationItem[];
  canCancel: boolean;
};

export default function ReservationList({ reservations, canCancel }: Props) {
  return (
    <ul className="space-y-3">
      {reservations.map((r) => (
        <ReservationCard key={r.id} reservation={r} canCancel={canCancel} />
      ))}
    </ul>
  );
}

function ReservationCard({
  reservation,
  canCancel,
}: {
  reservation: ReservationItem;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const isUpcoming = start.getTime() > Date.now();
  const isOngoing = start.getTime() <= Date.now() && end.getTime() > Date.now();

  const status = isOngoing
    ? { label: "Sedang berlangsung", color: "bg-amber-100 text-amber-800" }
    : isUpcoming
    ? { label: "Akan datang", color: "bg-green-100 text-green-800" }
    : { label: "Selesai", color: "bg-gray-100 text-gray-600" };

  const handleCancel = () => {
    if (!confirm("Yakin batalkan reservasi ini?")) return;
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
    <li className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900">
              Meja {reservation.table.label}
            </span>
            <span className="text-xs text-gray-500">
              · {reservation.table.seats} kursi
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${status.color}`}
            >
              {status.label}
            </span>
          </div>
          <div className="text-sm text-gray-700 space-y-0.5">
            <div>
              <span className="text-gray-500">Mulai:</span>{" "}
              <span className="font-medium">{fmt(start)}</span>
            </div>
            <div>
              <span className="text-gray-500">Selesai:</span>{" "}
              <span className="font-medium">{fmt(end)}</span>
            </div>
            <div className="text-xs text-gray-500 pt-1">
              Atas nama: {reservation.customerName}
              {reservation.customerPhone && ` · ${reservation.customerPhone}`}
            </div>
          </div>
        </div>
        {canCancel && isUpcoming && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="px-3 py-1.5 text-sm border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-50 shrink-0"
          >
            {isPending ? "Membatalkan..." : "Batalkan"}
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
    </li>
  );
}