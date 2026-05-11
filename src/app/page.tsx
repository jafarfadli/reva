import TimelineExplorer from "@/components/TimelineExplorer";
import AuthButton from "@/components/AuthButton";
import { auth } from "@/auth";
import { getTablesWithReservations } from "@/lib/availability";
import { RESERVATION_DAYS_AHEAD } from "@/lib/schedule";

export default async function Home() {
  const session = await auth();

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + RESERVATION_DAYS_AHEAD + 1);

  const { tables, reservations } = await getTablesWithReservations(
    windowStart,
    windowEnd,
  );

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      }
    : null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border-warm bg-cream-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-espresso tracking-tight">
              Reva
            </h1>
            <p className="text-xs sm:text-sm text-mocha mt-0.5">
              Reservasi meja restoran, transparan & real-time
            </p>
          </div>
          <AuthButton />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TimelineExplorer
          tables={tables}
          reservations={reservations}
          currentUser={currentUser}
        />
      </div>
    </main>
  );
}