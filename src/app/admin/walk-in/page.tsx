import { getTablesWithActiveReservation } from "@/lib/availability";
import WalkInPanel from "@/components/admin/WalkInPanel";

export default async function AdminWalkInPage() {
  const now = new Date();
  const tables = await getTablesWithActiveReservation(now);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Walk-in & Live Control</h1>
        <p className="text-sm text-gray-600">
          Klik meja <span className="text-green-700 font-semibold">hijau</span> untuk
          assign walk-in (3 jam). Klik meja{" "}
          <span className="text-red-700 font-semibold">merah</span> untuk
          membebaskan.
        </p>
      </div>
      <WalkInPanel tables={tables} fetchedAt={now.toISOString()} />
    </div>
  );
}