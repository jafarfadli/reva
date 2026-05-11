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

  const [date, setDate] = useState(() => getDateOptions()[0].value);
  const [time, setTime] = useState(() => {
    const slots = getTimeSlotsForDate(getDateOptions()[0].value);
    return slots[0]?.value ?? "10:00";
  });

  const [activeTable, setActiveTable] = useState<TableWithStatus | null>(null);

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

  const fmtTimeLong = selectedDate.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format pendek untuk mobile
  const fmtTimeShort = selectedDate.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startReservationMode = () => {
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
    <div className="space-y-4 sm:space-y-5">
      {/* === MODE BAR === */}
      {mode === "realtime" ? (
        <div className="bg-white border border-border-warm rounded-lg p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-sage-subtle text-sage-dark rounded-full uppercase tracking-wide shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              Live
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-espresso">
                Status meja saat ini
              </div>
              <div className="text-xs text-mocha truncate">
                <span className="sm:hidden">{fmtTimeShort}</span>
                <span className="hidden sm:inline">{fmtTimeLong}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={startReservationMode}
            className="px-4 sm:px-5 py-2.5 bg-terracotta text-white rounded-md font-medium hover:bg-terracotta-dark transition shadow-sm text-sm w-full sm:w-auto min-h-[44px]"
          >
            Buat Reservasi →
          </button>
        </div>
      ) : (
        <>
          <div className="bg-caramel-subtle border border-caramel/40 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-espresso flex-1 min-w-0">
              <strong className="font-semibold">Mode Reservasi.</strong>{" "}
              <span className="hidden sm:inline">
                Pilih tanggal & jam, lalu klik meja hijau untuk reserve.
              </span>
              <span className="sm:hidden">
                Pilih waktu, lalu klik meja hijau.
              </span>
            </div>
            <button
              type="button"
              onClick={exitReservationMode}
              className="px-3 py-2 text-sm border border-caramel/50 text-cocoa rounded-md hover:bg-caramel/20 transition font-medium w-full sm:w-auto min-h-[40px]"
            >
              ← Kembali ke Live
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
        <div className="text-sm text-mocha min-w-0">
          {mode === "reservation" && (
            <>
              Menampilkan untuk{" "}
              <span className="font-semibold text-espresso">
                <span className="sm:hidden">{fmtTimeShort}</span>
                <span className="hidden sm:inline">{fmtTimeLong}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <span className="flex items-center gap-1.5 sm:gap-2 text-cocoa">
            <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-sage inline-block" />
            <span>
              <span className="font-semibold text-espresso">{freeCount}</span>{" "}
              kosong
            </span>
          </span>
          <span className="flex items-center gap-1.5 sm:gap-2 text-cocoa">
            <span className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-clay inline-block" />
            <span>
              <span className="font-semibold text-espresso">
                {occupiedCount}
              </span>{" "}
              terisi
            </span>
          </span>
        </div>
      </div>

      {/* === LAYOUT === */}
      <TableLayoutViewer
        tables={tablesWithStatus}
        onTableClick={
          mode === "reservation"
            ? (t) => {
                if (!t.isOccupied) setActiveTable(t);
              }
            : undefined
        }
      />

      {mode === "realtime" && (
        <p className="text-xs text-taupe px-1 italic">
          Tampilan ini auto-refresh setiap 30 detik.
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