"use client";

import dynamic from "next/dynamic";
import type { Table } from "@prisma/client";

const LayoutEditor = dynamic(() => import("./LayoutEditor"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="bg-white border border-border-warm rounded-lg p-4 shadow-sm">
        <div className="text-mocha text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
          Memuat editor layout...
        </div>
      </div>
    </div>
  ),
});

type Props = {
  initialTables: Table[];
};

export default function LayoutEditorWrapper(props: Props) {
  return <LayoutEditor {...props} />;
}