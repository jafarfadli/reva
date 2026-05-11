import { getTablesWithActiveReservation } from "@/lib/availability";
import WalkInPanel from "@/components/admin/WalkInPanel";

export default async function AdminWalkInPage() {
  const now = new Date();
  const tables = await getTablesWithActiveReservation(now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso font-semibold tracking-tight">
          Walk-in & Live Control
        </h1>
        <p className="text-sm text-mocha mt-1">
          Klik meja{" "}
          <span className="text-sage-dark font-semibold">hijau</span> untuk
          assign walk-in (3 jam). Klik meja{" "}
          <span className="text-clay-dark font-semibold">merah</span> untuk
          membebaskan.
        </p>
      </div>
      <WalkInPanel tables={tables} fetchedAt={now.toISOString()} />
    </div>
  );
}