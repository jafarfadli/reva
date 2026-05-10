"use client";

import { useEffect, useMemo, useState } from "react";
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

type Mode = "realtime" | "reservation";

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

  const [mode, setMode] = useState<Mode>("realtime");

  // Default reservation slot: hari ini, slot pertama yang masih bisa dipesan
  const [date, setDate] = useState(() => getDateOptions()[0].value);
  const [time, setTime] = useState(() => {
    const slots = getTimeSlotsForDate(getDateOptions()[0].value);
    return slots[0]?.value ?? "10:00";
  });

  const [activeTable, setActiveTable] = useState<TableWithStatus | null>(null);

  // Tick supaya "now" di realtime mode auto-update tiap 30 detik
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (mode !== "realtime") return;
    const id = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(id);
  }, [mode]);

  const selectedDate = useMemo(() => {
    if (mode === "realtime") return new Date();
    return combineDateTime(date, time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date, time, tick]);

  const tablesWithStatus = useMemo(
    () => computeOccupancy(tables, reservations, selectedDate),
    [tables, reservations, selectedDate],
  );

  const occupiedCount = tablesWithStatus.filter((t) => t.isOccupied).length;
  const freeCount = tablesWithStatus.length - occupiedCount;

  const fmtTime = selectedDate.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startReservationMode = () => {
    // Reset picker ke slot terdekat
    const slots = getTimeSlotsForDate(getDateOptions()[0].value);
    setDate(getDateOptions()[0].value);
    setTime(slots[0]?.value ?? "10:00");
    setMode("reservation");
  };

  const exitReservationMode = () => {
    setMode("realtime");
    setActiveTable(null);
  };

  return (
    <div className="space-y-4">
      {/* === MODE BAR === */}
      {mode === "realtime" ? (
        <div className="bg-white border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
            <span className="text-sm text-gray-700">
              Status meja sekarang ({fmtTime})
            </span>
          </div>
          <button
            type="button"
            onClick={startReservationMode}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            📅 Buat Reservasi
          </button>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-amber-900">
              <strong>Mode Reservasi</strong> — pilih tanggal dan jam, lalu klik
              meja hijau untuk reserve.
            </div>
            <button
              type="button"
              onClick={exitReservationMode}
              className="px-3 py-1.5 text-sm border border-amber-300 text-amber-800 rounded hover:bg-amber-100"
            >
              ← Kembali ke Live View
            </button>
          </div>

          <TimePicker
            date={date}
            time={time}
            onChange={(d, t) => {
              setDate(d);
              setTime(t);
            }}
          />
        </>
      )}

      {/* === STATUS BAR === */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="text-sm text-gray-700">
          {mode === "reservation" && (
            <>
              Status meja pada{" "}
              <span className="font-semibold text-gray-900">{fmtTime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Kosong: {freeCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Terisi: {occupiedCount}
          </span>
        </div>
      </div>

      {/* === LAYOUT === */}
      <TableLayoutViewer
        tables={tablesWithStatus}
        // Klik meja hanya berfungsi di reservation mode
        onTableClick={
          mode === "reservation"
            ? (t) => {
                if (!t.isOccupied) setActiveTable(t);
              }
            : undefined
        }
      />

      {mode === "realtime" && (
        <p className="text-xs text-gray-500 px-1">
          View ini auto-refresh setiap 30 detik. Klik <strong>Buat Reservasi</strong>{" "}
          untuk memesan meja pada waktu tertentu.
        </p>
      )}

      {activeTable && mode === "reservation" && (
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