"use client";

import { useState, useMemo } from "react";
import Modal from "./Modal";
import AppleWheelPicker from "./WheelPicker";
import { Calendar, Check, X } from "lucide-react";
import { getLocalDateString } from "@/lib/dates";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: string | null; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  title?: string;
  minDate?: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function DatePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  title = "تحديد التاريخ",
}: DatePickerModalProps) {
  const initial = useMemo(() => {
    const today = getLocalDateString();
    const dStr = value || today;
    const parts = dStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, [value]);

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setYear(initial.year);
      setMonth(initial.month);
      setDay(initial.day);
    }
  }

  const maxDays = useMemo(() => getDaysInMonth(Number(year), Number(month)), [year, month]);

  if (day > maxDays) {
    setDay(maxDays);
  }

  /* ── Options ────────────────────────────────────────────────── */
  const currentYear = new Date().getFullYear();

  const dayOptions = useMemo(
    () =>
      Array.from({ length: maxDays }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, "0"),
      })),
    [maxDays]
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, "0"),
      })),
    []
  );

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 10; y++) {
      years.push({ value: y, label: String(y) });
    }
    return years;
  }, [currentYear]);

  /* ── Apply ──────────────────────────────────────────────────── */
  const handleApply = () => {
    const yStr = String(year);
    const mStr = String(month).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    onChange(`${yStr}-${mStr}-${dStr}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-bold text-zinc-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/*
          Apple-style unified picker
          RTL order: Day (right) → Month (center) → Year (left)
        */}
        <div dir="rtl">
          <AppleWheelPicker
            columns={[
              {
                options: dayOptions,
                value: day,
                onChange: (v) => setDay(Number(v)),
                flex: 1,
                align: "center",
              },
              {
                options: monthOptions,
                value: month,
                onChange: (v) => setMonth(Number(v)),
                flex: 1,
                align: "center",
              },
              {
                options: yearOptions,
                value: year,
                onChange: (v) => setYear(Number(v)),
                flex: 1.3,
                align: "center",
              },
            ]}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد التاريخ</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
