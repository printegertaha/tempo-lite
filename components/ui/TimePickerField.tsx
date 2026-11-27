"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import TimePickerModal from "./TimePickerModal";

interface TimePickerFieldProps {
  id?: string;
  value?: string | null;
  onChange: (timeStr: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  hideIcon?: boolean;
}

function formatArabicTime12(val?: string | null): string | null {
  if (!val || !val.includes(":")) return null;
  const [hStr, mStr] = val.split(":");
  const h24 = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h24) || isNaN(m)) return null;
  const isPm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${isPm ? "م" : "ص"}`;
}

export default function TimePickerField({
  id,
  value,
  onChange,
  placeholder = "اختر الوقت",
  title = "تحديد الوقت",
  disabled = false,
  className = "",
  ariaLabel,
  hideIcon = false,
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const formatted = formatArabicTime12(value);

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel || title}
        className={`flex items-center justify-between gap-2 text-right cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className={`font-mono truncate ${formatted ? "text-zinc-100" : "text-zinc-500"}`}>
          {formatted || placeholder}
        </span>
        {!hideIcon && <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
      </button>

      <TimePickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        title={title}
      />
    </>
  );
}
