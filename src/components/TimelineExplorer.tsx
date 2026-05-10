"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Table, Reservation } from "@prisma/client";
import { computeOccupancy } from "@/lib/occupancy";
import TableLayoutViewer from "./TableLayoutViewer";
import ReservationModal from "./ReservationModal";
import TimePicker from "./TimePicker";
import {
  getDateOptions,
  getTimeSlotsForDate,
  combineDateTime,
} from "@/lib/schedule";
import type { TableWithStatus } from "@/lib/types";

type Props = {
  tables: Table[];
  reservations: Reservation[];
  currentUser: { name: string; email: string } | null;
};

export default function TimelineExplorer({
  tables,
  reservations: rawReservations,
  currentUser,
}: Props) {
  const router = useRouter();

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

  // Default: hari ini, slot terdekat dari sekarang
  const [date, setDate] = useState(() => getDateOptions()[0].value);
  const [time, setTime] = useState(() => {
    const slots = getTimeSlotsForDate(getDateOptions()[0].value);
    return slots[0]?.value ?? "10:00";
  });

  const [activeTable, setActiveTable] = useState<TableWithStatus | null>(null);

  const selectedDate = useMemo(() => combineDateTime(date, time), [date, time]);

  const tablesWithStatus = useMemo(
    () => computeOccupancy(tables, reservations, selectedDate),
    [tables, reservations, selectedDate],
  );

  const occupiedCount = tablesWithStatus.filter((t) => t.isOccupied).length;
  const freeCount = tablesWithStatus.length - occupiedCount;

  const fmtSelected = selectedDate.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <TimePicker
        date={date}
        time={time}
        onChange={(d, t) => {
          setDate(d);
          setTime(t);
        }}
      />

      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="text-sm text-gray-600">
          Status meja pada{" "}
          <span className="font-semibold text-gray-900">{fmtSelected}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Kosong: {freeCount}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Terisi: {occupiedCount}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 px-1">
        Klik meja hijau untuk reservasi pada waktu yang dipilih.
      </p>

      <TableLayoutViewer
        tables={tablesWithStatus}
        onTableClick={(t) => setActiveTable(t)}
      />

      {activeTable && (
        <ReservationModal
          table={activeTable}
          startTime={selectedDate}
          currentUser={currentUser}
          onClose={() => setActiveTable(null)}
          onSuccess={() => {
            setActiveTable(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}