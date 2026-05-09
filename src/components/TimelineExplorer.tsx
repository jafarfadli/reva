"use client";

import { useMemo, useState } from "react";
import type { Table, Reservation } from "@prisma/client";
import { computeOccupancy } from "@/lib/occupancy";
import TableLayoutViewer from "./TableLayoutViewer";

type Props = {
  tables: Table[];
  reservations: Reservation[];
  windowStart: string; // ISO string (Date tidak bisa di-serialize dari server component)
  windowEnd: string;
};

export default function TimelineExplorer({
  tables,
  reservations: rawReservations,
  windowStart,
  windowEnd,
}: Props) {
  // Re-hydrate Date objects (Prisma Date di-serialize jadi string saat ke client)
  const reservations = useMemo<Reservation[]>(
    () =>
      rawReservations.map((r) => ({
        ...r,
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
        createdAt: new Date(r.createdAt),
      })),
    [rawReservations],
  );

  const startMs = new Date(windowStart).getTime();
  const endMs = new Date(windowEnd).getTime();

  // Default: posisi slider = "sekarang" (clamp ke window kalau perlu)
  const nowMs = Math.min(Math.max(Date.now(), startMs), endMs);
  const [selectedMs, setSelectedMs] = useState(nowMs);

  const selectedDate = new Date(selectedMs);
  const tablesWithStatus = useMemo(
    () => computeOccupancy(tables, reservations, selectedDate),
    [tables, reservations, selectedDate],
  );

  const occupiedCount = tablesWithStatus.filter((t) => t.isOccupied).length;
  const freeCount = tablesWithStatus.length - occupiedCount;

  // Format waktu di WIB
  const formatted = selectedDate.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isNow = Math.abs(selectedMs - Date.now()) < 60_000; // dalam 1 menit dari sekarang

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Free: {freeCount}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Occupied: {occupiedCount}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedMs(Date.now())}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Jump to now
        </button>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600">Showing availability at:</span>
          <span className="font-mono text-lg font-semibold">
            {formatted} {isNow && <span className="text-xs text-green-600 ml-1">● live</span>}
          </span>
        </div>
        <input
          type="range"
          min={startMs}
          max={endMs}
          step={15 * 60 * 1000} // 15 menit
          value={selectedMs}
          onChange={(e) => setSelectedMs(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {new Date(startMs).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>
            {new Date(endMs).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <TableLayoutViewer tables={tablesWithStatus} />
    </div>
  );
}