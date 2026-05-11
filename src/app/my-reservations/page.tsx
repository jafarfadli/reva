import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserReservations } from "@/lib/availability";
import AuthButton from "@/components/AuthButton";
import ReservationList from "@/components/ReservationList";

export default async function MyReservationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const reservations = await getUserReservations(session.user.id);

  const now = Date.now();
  const upcoming = reservations.filter((r) => r.endTime.getTime() >= now);
  const past = reservations.filter((r) => r.endTime.getTime() < now);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border-warm bg-cream-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link
              href="/"
              className="text-sm text-mocha hover:text-terracotta transition"
            >
              ← Kembali
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl text-espresso font-semibold mt-1 tracking-tight">
              Reservasi Saya
            </h1>
            <p className="text-xs sm:text-sm text-mocha mt-0.5">
              Daftar reservasi yang Anda buat
            </p>
          </div>
          <AuthButton />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {reservations.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white border border-border-warm border-dashed rounded-xl">
            <div className="font-serif text-lg sm:text-xl text-espresso mb-1">
              Belum ada reservasi
            </div>
            <p className="text-sm text-mocha mb-5 px-4">
              Reservasi yang kamu buat akan tampil di sini.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 text-sm bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-medium shadow-sm"
            >
              Buat reservasi pertama →
            </Link>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-7">
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-serif text-lg sm:text-xl text-espresso font-semibold mb-3">
                  Akan datang{" "}
                  <span className="text-mocha font-normal text-base">
                    ({upcoming.length})
                  </span>
                </h2>
                <ReservationList reservations={upcoming} canCancel />
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="font-serif text-lg sm:text-xl text-mocha font-semibold mb-3">
                  Riwayat{" "}
                  <span className="font-normal text-base">({past.length})</span>
                </h2>
                <ReservationList reservations={past} canCancel={false} />
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}