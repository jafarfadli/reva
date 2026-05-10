import { auth } from "@/auth";
import TimelineExplorer from "@/components/TimelineExplorer";
import AuthButton from "@/components/AuthButton";
import { getTablesWithReservations } from "@/lib/availability";
import { RESERVATION_DAYS_AHEAD } from "@/lib/schedule";

export default async function Home() {
  const session = await auth();
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + RESERVATION_DAYS_AHEAD + 1);

  const { tables, reservations } = await getTablesWithReservations(windowStart, windowEnd);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reva</h1>
          <p className="text-gray-600">Restaurant reservation system</p>
        </div>
        <AuthButton />
      </header>
      <TimelineExplorer
        tables={tables}
        reservations={reservations}
        currentUser={session?.user ? { name: session.user.name ?? "", email: session.user.email ?? "" } : null}
      />
    </main>
  );
}