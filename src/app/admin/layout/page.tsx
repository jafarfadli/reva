import { prisma } from "@/lib/prisma";
import LayoutEditorWrapper from "@/components/admin/LayoutEditorWrapper";

export default async function AdminLayoutEditorPage() {
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-espresso font-semibold tracking-tight">
          Layout Meja
        </h1>
        <p className="text-xs sm:text-sm text-mocha mt-1">
          Editor visual untuk mengatur posisi, ukuran, dan jumlah meja
        </p>
      </div>
      <LayoutEditorWrapper initialTables={tables} />
    </div>
  );
}