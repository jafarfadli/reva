import TimelineExplorer from "@/components/TimelineExplorer";
import { getTablesWithReservations } from "@/lib/availability";

export default async function Home() {
  const now = new Date();
  // Window: 1 jam lalu sampai 7 hari ke depan
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { tables, reservations } = await getTablesWithReservations(windowStart, windowEnd);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Reva</h1>
        <p className="text-gray-600">Restaurant reservation system</p>
      </header>

      <TimelineExplorer
        tables={tables}
        reservations={reservations}
        windowStart={windowStart.toISOString()}
        windowEnd={windowEnd.toISOString()}
      />
    </main>
  );
}