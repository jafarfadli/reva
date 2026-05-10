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

  // Default: hari ini
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

  // Stats
  const total = reservations.length;
  const upcoming = reservations.filter(
    (r) => r.startTime.getTime() > Date.now(),
  ).length;
  const ongoing = reservations.filter(
    (r) =>
      r.startTime.getTime() <= Date.now() && r.endTime.getTime() > Date.now(),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reservasi</h1>
        <p className="text-sm text-gray-600">
          Semua reservasi pelanggan, dapat difilter per tanggal
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total hari ini" value={total} />
        <StatCard label="Akan datang" value={upcoming} accent="green" />
        <StatCard label="Berlangsung" value={ongoing} accent="amber" />
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
  accent?: "green" | "amber";
}) {
  const accentColor =
    accent === "green"
      ? "text-green-700"
      : accent === "amber"
      ? "text-amber-700"
      : "text-gray-900";

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-3xl font-bold mt-1 ${accentColor}`}>{value}</div>
    </div>
  );
}

function formatDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}