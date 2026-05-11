import { getAllReservations } from "@/lib/availability";
import AdminReservationFilter from "@/components/admin/AdminReservationFilter";

type SearchParams = {
  date?: string;
};

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rangeStart: Date;
  let rangeEnd: Date;
  let activeDate: string;

  if (params.date) {
    const [y, m, d] = params.date.split("-").map(Number);
    rangeStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    rangeEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    activeDate = params.date;
  } else {
    rangeStart = today;
    rangeEnd = new Date(today);
    rangeEnd.setHours(23, 59, 59, 999);
    activeDate = formatDateValue(today);
  }

  const reservations = await getAllReservations(rangeStart, rangeEnd);

  const total = reservations.length;
  const upcoming = reservations.filter(
    (r) => r.startTime.getTime() > Date.now(),
  ).length;
  const ongoing = reservations.filter(
    (r) =>
      r.startTime.getTime() <= Date.now() && r.endTime.getTime() > Date.now(),
  ).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-espresso font-semibold tracking-tight">
          Reservasi
        </h1>
        <p className="text-xs sm:text-sm text-mocha mt-1">
          Semua reservasi pelanggan, dapat difilter per tanggal
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Total" value={total} />
        <StatCard label="Akan datang" value={upcoming} accent="sage" />
        <StatCard label="Berlangsung" value={ongoing} accent="caramel" />
      </div>

      <AdminReservationFilter
        activeDate={activeDate}
        reservations={reservations.map((r) => ({
          id: r.id,
          tableLabel: r.table.label,
          tableSeats: r.table.seats,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          userEmail: r.user?.email ?? null,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
        }))}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "sage" | "caramel" | "terracotta";
}) {
  const accentColor =
    accent === "sage"
      ? "text-sage-dark"
      : accent === "caramel"
      ? "text-cocoa"
      : accent === "terracotta"
      ? "text-terracotta-dark"
      : "text-espresso";

  return (
    <div className="bg-white border border-border-warm rounded-lg p-3 sm:p-5 shadow-sm">
      <div className="text-[10px] sm:text-xs text-mocha uppercase tracking-wide font-semibold leading-tight">
        {label}
      </div>
      <div
        className={`font-serif text-2xl sm:text-4xl font-semibold mt-1 ${accentColor}`}
      >
        {value}
      </div>
    </div>
  );
}

function formatDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}