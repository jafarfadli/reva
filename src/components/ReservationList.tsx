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
    ? {
        label: "Sedang berlangsung",
        color: "bg-caramel-subtle text-cocoa border-caramel/40",
      }
    : isUpcoming
    ? {
        label: "Akan datang",
        color: "bg-sage-subtle text-sage-dark border-sage/30",
      }
    : { label: "Selesai", color: "bg-cream-dark text-mocha border-border-warm" };

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
    <li className="bg-white border border-border-warm rounded-lg p-5 shadow-sm hover:shadow transition">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-serif text-xl font-semibold text-espresso">
              Meja {reservation.table.label}
            </span>
            <span className="text-xs text-taupe">
              · {reservation.table.seats} kursi
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium border ${status.color}`}
            >
              {status.label}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex gap-2">
              <span className="text-taupe min-w-[60px]">Mulai</span>
              <span className="font-medium text-espresso">{fmt(start)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-taupe min-w-[60px]">Selesai</span>
              <span className="font-medium text-espresso">{fmt(end)}</span>
            </div>
            <div className="text-xs text-taupe pt-1 italic">
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
            className="px-3 py-1.5 text-sm border border-clay/30 text-clay-dark rounded-md hover:bg-clay-subtle transition font-medium disabled:opacity-50 shrink-0"
          >
            {isPending ? "Membatalkan..." : "Batalkan"}
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3 text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-2.5">
          {error}
        </div>
      )}
    </li>
  );
}