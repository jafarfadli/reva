"use client";

import { useMemo } from "react";
import { getDateOptions, getTimeSlotsForDate } from "@/lib/schedule";

type Props = {
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
};

export default function TimePicker({ date, time, onChange }: Props) {
  const dateOptions = useMemo(() => getDateOptions(), []);
  const timeSlots = useMemo(() => getTimeSlotsForDate(date), [date]);

  const handleDateChange = (newDate: string) => {
    const slotsForNewDate = getTimeSlotsForDate(newDate);
    const stillValid = slotsForNewDate.some((s) => s.value === time);
    const newTime = stillValid ? time : (slotsForNewDate[0]?.value ?? "10:00");
    onChange(newDate, newTime);
  };

  return (
    <div className="bg-white border border-border-warm rounded-lg p-5 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
            Tanggal
          </label>
          <select
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-cream-light border border-border-warm rounded-md text-espresso focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition appearance-none text-sm font-medium"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5544' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              paddingRight: "2rem",
            }}
          >
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
            Jam mulai
          </label>
          <select
            value={time}
            onChange={(e) => onChange(date, e.target.value)}
            disabled={timeSlots.length === 0}
            className="w-full px-3 py-2.5 bg-cream-light border border-border-warm rounded-md text-espresso focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition appearance-none disabled:opacity-50 text-sm font-medium"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5544' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              paddingRight: "2rem",
            }}
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
      <p className="text-xs text-taupe mt-3 italic">
        Durasi reservasi: 3 jam · Restoran buka 10:00–22:00
      </p>
    </div>
  );
}