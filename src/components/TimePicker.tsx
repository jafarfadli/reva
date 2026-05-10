"use client";

import { useMemo } from "react";
import { getDateOptions, getTimeSlotsForDate } from "@/lib/schedule";

type Props = {
  date: string;     // "YYYY-MM-DD"
  time: string;     // "HH:MM"
  onChange: (date: string, time: string) => void;
};

export default function TimePicker({ date, time, onChange }: Props) {
  const dateOptions = useMemo(() => getDateOptions(), []);
  const timeSlots = useMemo(() => getTimeSlotsForDate(date), [date]);

  const handleDateChange = (newDate: string) => {
    const slotsForNewDate = getTimeSlotsForDate(newDate);
    // Kalau jam yang sebelumnya dipilih nggak available di tanggal baru, fallback ke slot pertama
    const stillValid = slotsForNewDate.some((s) => s.value === time);
    const newTime = stillValid ? time : (slotsForNewDate[0]?.value ?? "10:00");
    onChange(newDate, newTime);
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <select
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jam mulai</label>
          <select
            value={time}
            onChange={(e) => onChange(date, e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={timeSlots.length === 0}
          >
            {timeSlots.length === 0 ? (
              <option>Tidak ada slot tersedia hari ini</option>
            ) : (
              timeSlots.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Durasi reservasi: 3 jam. Restoran buka 10:00–22:00.
      </p>
    </div>
  );
}