import { prisma } from "@/lib/prisma";
import LayoutEditor from "@/components/admin/LayoutEditor";

export default async function AdminLayoutEditorPage() {
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Layout Meja</h1>
        <p className="text-sm text-gray-600">
          Editor visual untuk mengatur posisi, ukuran, dan jumlah meja
        </p>
      </div>
      <LayoutEditor initialTables={tables} />
    </div>
  );
}