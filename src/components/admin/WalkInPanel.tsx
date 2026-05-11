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
    endTime: string;
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
    const table = tables.find((t) => t.id === rawTable.id);
    if (!table) return;

    if (!table.isOccupied) {
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
      <div className="bg-white border border-border-warm rounded-lg p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-sage-subtle text-sage-dark rounded-full uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
            Live
          </span>
          <span className="text-mocha">Last fetched {fetchedTime}</span>
          {isPending && (
            <span className="text-xs text-caramel italic">Memproses...</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-cocoa">
              <span className="w-3 h-3 rounded-full bg-sage inline-block" />
              <span className="font-semibold text-espresso">{freeCount}</span>{" "}
              kosong
            </span>
            <span className="flex items-center gap-1.5 text-cocoa">
              <span className="w-3 h-3 rounded-full bg-clay inline-block" />
              <span className="font-semibold text-espresso">{occupiedCount}</span>{" "}
              terisi
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="px-3 py-1.5 text-xs font-medium border border-border-warm rounded-md hover:bg-cream-dark transition text-cocoa"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-3">
          {error}
        </div>
      )}

      <TableLayoutViewer
        tables={tables}
        onTableClick={handleTableClick}
        allowClickOccupied={true}
      />
    </div>
  );
}