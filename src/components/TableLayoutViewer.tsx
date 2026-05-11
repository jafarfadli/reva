"use client";

import dynamic from "next/dynamic";
import type { TableWithStatus } from "@/lib/types";

const TableLayoutViewerInner = dynamic(
  () => import("./TableLayoutViewerInner"),
  {
    ssr: false,
    loading: () => (
      <div className="border border-border-warm rounded-lg bg-cream-light shadow-sm w-full aspect-[8/5] flex items-center justify-center">
        <div className="text-mocha text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
          Memuat layout meja...
        </div>
      </div>
    ),
  },
);

type Props = {
  tables: TableWithStatus[];
  onTableClick?: (table: TableWithStatus) => void;
  allowClickOccupied?: boolean;
};

export default function TableLayoutViewer(props: Props) {
  return <TableLayoutViewerInner {...props} />;
}