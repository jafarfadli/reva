export const OPERATING_HOURS = {
  openHour: 10,        // restoran buka jam 10:00
  lastReservationHour: 19, // slot terakhir mulai jam 19:00 (selesai 22:00)
  slotMinutes: 30,     // kuantisasi 30 menit
  reservationHours: 3,
};

export const RESERVATION_DAYS_AHEAD = 7;

/** Generate semua opsi tanggal: hari ini + 7 hari ke depan */
export function getDateOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < RESERVATION_DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatDateValue(d);
    const label = formatDateLabel(d, i);
    options.push({ value, label });
  }
  return options;
}

/** Generate slot jam dalam satu hari, per 30 menit */
export function getTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  const { openHour, lastReservationHour, slotMinutes } = OPERATING_HOURS;

  for (let h = openHour; h <= lastReservationHour; h++) {
    for (let m = 0; m < 60; m += slotMinutes) {
      if (h === lastReservationHour && m > 0) break; // stop di 19:00 sharp
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return slots;
}

/** Filter slot jam yang sudah lewat untuk hari ini */
export function getTimeSlotsForDate(dateValue: string): { value: string; label: string }[] {
  const allSlots = getTimeSlots();
  const [y, m, d] = dateValue.split("-").map(Number);
  const selected = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selected.getTime() !== today.getTime()) return allSlots;

  // Untuk hari ini, hanya tampilkan slot yang masih akan datang (toleransi 5 menit)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  return allSlots.filter((s) => {
    const [h, mi] = s.value.split(":").map(Number);
    return h * 60 + mi >= nowMinutes - 5;
  });
}

/** Gabungkan tanggal + jam jadi Date object */
export function combineDateTime(dateValue: string, timeValue: string): Date {
  const [y, mo, d] = dateValue.split("-").map(Number);
  const [h, mi] = timeValue.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function formatDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(d: Date, offset: number): string {
  if (offset === 0) return `Hari ini · ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
  if (offset === 1) return `Besok · ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

/** Slot 30 menit terdekat ke depan dari sekarang (untuk reservasi saat live) */
export function getNextReservationSlot(): { date: string; time: string } {
  const now = new Date();
  const slotMin = OPERATING_HOURS.slotMinutes;
  // Bulatkan ke ATAS, bukan ke bawah
  const minutes = Math.ceil(now.getMinutes() / slotMin) * slotMin;
  now.setMinutes(minutes, 0, 0);

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return { date: `${y}-${m}-${d}`, time: `${h}:${mi}` };
}