"use client";

import { useState, useMemo } from "react";
import Modal from "./Modal";
import AppleWheelPicker from "./WheelPicker";
import { Clock, Check, X } from "lucide-react";

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value?: string | null; // "HH:MM" 24-hour format
  onChange: (timeStr: string) => void;
  title?: string;
}

export default function TimePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
  title = "تحديد الوقت",
}: TimePickerModalProps) {
  const initial = useMemo(() => {
    let h24 = 9;
    let m = 0;
    if (value && value.includes(":")) {
      const [hStr, mStr] = value.split(":");
      const parsedH = parseInt(hStr, 10);
      const parsedM = parseInt(mStr, 10);
      if (!isNaN(parsedH)) h24 = Math.max(0, Math.min(23, parsedH));
      if (!isNaN(parsedM)) m = Math.max(0, Math.min(59, parsedM));
    }
    const isPm = h24 >= 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, minute: m, period: isPm ? "PM" : "AM" };
  }, [value]);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period as "AM" | "PM");
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setHour(initial.hour);
      setMinute(initial.minute);
      setPeriod(initial.period as "AM" | "PM");
    }
  }

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, "0"),
      })),
    []
  );

  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, "0"),
      })),
    []
  );

  const periodOptions = [
    { value: "AM" as const, label: "ص" },
    { value: "PM" as const, label: "م" },
  ];

  const handleApply = () => {
    let h24 = Number(hour);
    if (period === "PM" && h24 < 12) h24 += 12;
    if (period === "AM" && h24 === 12) h24 = 0;
    onChange(`${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    onClose();
  };

  const previewText = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period === "AM" ? "صباحاً" : "مساءً"}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-zinc-100">{title}</h3>
              <p className="text-[11px] font-mono text-indigo-300 mt-0.5">{previewText}</p>
            </div>
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

        {/* Columns (RTL): Period (right) | Minute (center) | Hour (left) */}
        <div dir="rtl">
          <AppleWheelPicker
            columns={[
              {
                label: "الفترة",
                options: periodOptions,
                value: period,
                onChange: (v) => setPeriod(v as "AM" | "PM"),
                flex: 0.75,
                align: "center",
              },
              {
                label: "الدقيقة",
                options: minuteOptions,
                value: minute,
                onChange: (v) => setMinute(Number(v)),
                flex: 1,
                align: "center",
              },
              {
                label: "الساعة",
                options: hourOptions,
                value: hour,
                onChange: (v) => setHour(Number(v)),
                flex: 1,
                align: "center",
              },
            ]}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
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
            <span>تأكيد الوقت</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
