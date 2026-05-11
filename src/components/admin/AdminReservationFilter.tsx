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
  startTime: string;
  endTime: string;
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
      <div className="bg-white border border-border-warm rounded-lg p-4 flex items-center gap-3 flex-wrap shadow-sm">
        <label className="text-xs font-semibold text-mocha uppercase tracking-wide">
          Filter tanggal
        </label>
        <input
          type="date"
          value={activeDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="flex-1 sm:flex-none px-3 py-2 bg-cream-light border border-border-warm rounded-md text-sm text-espresso focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition font-medium"
        />
        <button
          type="button"
          onClick={() => handleDateChange(formatToday())}
          className="text-xs text-terracotta hover:text-terracotta-dark transition font-medium w-full sm:w-auto sm:ml-auto text-left sm:text-right"
        >
          Reset ke hari ini →
        </button>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white border border-border-warm border-dashed rounded-lg p-12 text-center">
          <p className="text-mocha text-sm">
            Tidak ada reservasi pada tanggal ini.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-border-warm rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-light border-b border-border-warm">
                  <tr>
                    <Th>Waktu</Th>
                    <Th>Meja</Th>
                    <Th>Pemesan</Th>
                    <Th>Akun</Th>
                    <Th>Status</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {reservations.map((r) => (
                    <ReservationTableRow key={r.id} reservation={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {reservations.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        </>
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
      className={`px-4 py-3 text-xs font-semibold text-mocha uppercase tracking-wide text-${align}`}
    >
      {children}
    </th>
  );
}

function getStatus(start: Date, end: Date) {
  const now = Date.now();
  const isOngoing = start.getTime() <= now && end.getTime() > now;
  const isUpcoming = start.getTime() > now;
  const isPast = end.getTime() <= now;

  const status = isOngoing
    ? {
        label: "Berlangsung",
        color: "bg-caramel-subtle text-cocoa border-caramel/40",
      }
    : isUpcoming
    ? {
        label: "Akan datang",
        color: "bg-sage-subtle text-sage-dark border-sage/30",
      }
    : { label: "Selesai", color: "bg-cream-dark text-mocha border-border-warm" };

  return { status, isPast };
}

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });

function useCancelHandler() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = (id: string, tableLabel: string) => {
    if (!confirm(`Batalkan reservasi meja ${tableLabel}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelReservation(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return { handleCancel, error, isPending };
}

function ReservationTableRow({
  reservation,
}: {
  reservation: ReservationRow;
}) {
  const { handleCancel, error, isPending } = useCancelHandler();
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const { status, isPast } = getStatus(start, end);

  return (
    <>
      <tr
        className={
          isPast
            ? "bg-cream-light/50 text-taupe"
            : "hover:bg-cream-light/40 transition"
        }
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-mono text-sm font-medium text-espresso">
            {fmtTime(start)} – {fmtTime(end)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-semibold text-espresso">
            {reservation.tableLabel}
          </div>
          <div className="text-xs text-taupe">
            {reservation.tableSeats} kursi
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-espresso">
            {reservation.customerName}
          </div>
          {reservation.customerPhone && (
            <div className="text-xs text-taupe">
              {reservation.customerPhone}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-mocha">
            {reservation.userEmail ?? (
              <span className="italic text-taupe">tanpa akun</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${status.color}`}
          >
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {!isPast && (
            <button
              type="button"
              onClick={() =>
                handleCancel(reservation.id, reservation.tableLabel)
              }
              disabled={isPending}
              className="px-3 py-1.5 text-xs border border-clay/30 text-clay-dark rounded-md hover:bg-clay-subtle transition font-medium disabled:opacity-50 min-h-[36px]"
            >
              {isPending ? "..." : "Batalkan"}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="px-4 py-2 bg-clay-subtle">
            <div className="text-sm text-clay-dark">{error}</div>
          </td>
        </tr>
      )}
    </>
  );
}

function ReservationCard({ reservation }: { reservation: ReservationRow }) {
  const { handleCancel, error, isPending } = useCancelHandler();
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const { status, isPast } = getStatus(start, end);

  return (
    <div
      className={`bg-white border border-border-warm rounded-lg p-4 shadow-sm ${
        isPast ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-serif text-lg font-semibold text-espresso">
            Meja {reservation.tableLabel}
          </div>
          <div className="text-xs text-taupe">
            {reservation.tableSeats} kursi
          </div>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${status.color} whitespace-nowrap`}
        >
          {status.label}
        </span>
      </div>

      <div className="font-mono text-sm text-espresso mb-2">
        {fmtTime(start)} – {fmtTime(end)}
      </div>

      <div className="text-sm space-y-0.5 mb-3">
        <div className="font-medium text-espresso">
          {reservation.customerName}
        </div>
        {reservation.customerPhone && (
          <div className="text-xs text-taupe">{reservation.customerPhone}</div>
        )}
        <div className="text-xs text-mocha pt-1">
          {reservation.userEmail ?? (
            <span className="italic text-taupe">tanpa akun</span>
          )}
        </div>
      </div>

      {!isPast && (
        <button
          type="button"
          onClick={() => handleCancel(reservation.id, reservation.tableLabel)}
          disabled={isPending}
          className="w-full px-3 py-2 text-sm border border-clay/30 text-clay-dark rounded-md hover:bg-clay-subtle transition font-medium disabled:opacity-50 min-h-[44px]"
        >
          {isPending ? "Membatalkan..." : "Batalkan"}
        </button>
      )}

      {error && (
        <div className="mt-2 text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-2.5">
          {error}
        </div>
      )}
    </div>
  );
}

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}