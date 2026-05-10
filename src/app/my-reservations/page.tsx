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

  // Pisahkan upcoming vs past
  const now = Date.now();
  const upcoming = reservations.filter((r) => r.endTime.getTime() >= now);
  const past = reservations.filter((r) => r.endTime.getTime() < now);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/" className="text-sm text-green-700 hover:underline">
            ← Kembali ke layout
          </Link>
          <h1 className="text-3xl font-bold mt-1">Reservasi Saya</h1>
          <p className="text-gray-600 text-sm">
            Daftar reservasi yang Anda buat
          </p>
        </div>
        <AuthButton />
      </header>

      {reservations.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-gray-500">Belum ada reservasi.</p>
          <Link
            href="/"
            className="inline-block mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Buat reservasi pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-900">
                Akan datang ({upcoming.length})
              </h2>
              <ReservationList reservations={upcoming} canCancel />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-700">
                Riwayat ({past.length})
              </h2>
              <ReservationList reservations={past} canCancel={false} />
            </section>
          )}
        </div>
      )}
    </main>
  );
}