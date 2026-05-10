"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TableLayoutViewer from "@/components/TableLayoutViewer";
import {
  quickAssignWalkIn,
  releaseTable,
} from "@/app/actions/reservations";
import type { TableWithStatus } from "@/lib/types";

type TableWithActiveReservation = TableWithStatus & {
  activeReservation: {
    id: string;
    customerName: string;
    endTime: string; // ISO
  } | null;
};

type Props = {
  tables: TableWithActiveReservation[];
  fetchedAt: string;
};

export default function WalkInPanel({ tables, fetchedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh tiap 30 detik
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30 * 1000);
    return () => clearInterval(id);
  }, [router]);

  const occupiedCount = tables.filter((t) => t.isOccupied).length;
  const freeCount = tables.length - occupiedCount;

  const fetchedTime = new Date(fetchedAt).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const handleTableClick = (rawTable: TableWithStatus) => {
    setError(null);
    // Cari data lengkap dengan activeReservation
    const table = tables.find((t) => t.id === rawTable.id);
    if (!table) return;

    if (!table.isOccupied) {
      // Assign walk-in 3 jam
      const ok = confirm(
        `Assign walk-in di Meja ${table.label} (${table.seats} kursi) selama 3 jam?`,
      );
      if (!ok) return;
      startTransition(async () => {
        const result = await quickAssignWalkIn(table.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    } else {
      // Release
      const endTime = table.activeReservation
        ? new Date(table.activeReservation.endTime).toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      const customerName = table.activeReservation?.customerName ?? "-";
      const ok = confirm(
        `Bebaskan Meja ${table.label}?\n\nAtas nama: ${customerName}\nSampai jam: ${endTime}`,
      );
      if (!ok) return;
      startTransition(async () => {
        const result = await releaseTable(table.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
          <span>Last fetched: {fetchedTime}</span>
          {isPending && (
            <span className="text-xs text-amber-600">Memproses...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={() => router.refresh()}
            className="px-3 py-1.5 text-xs font-medium border rounded hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <TableLayoutViewer tables={tables} onTableClick={handleTableClick} allowClickOccupied={true}/>
    </div>
  );
}