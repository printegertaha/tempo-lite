"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import DatePickerModal from "./DatePickerModal";

interface DatePickerFieldProps {
  id?: string;
  value?: string | null;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  title?: string;
  minDate?: string;
  maxDate?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  hideIcon?: boolean;
}

export default function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "اختر التاريخ",
  title = "تحديد التاريخ",
  minDate,
  maxDate,
  minYear,
  maxYear,
  disabled = false,
  className = "",
  ariaLabel,
  hideIcon = false,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

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
        <span className={`font-mono truncate ${value ? "text-zinc-100" : "text-zinc-500"}`}>
          {value || placeholder}
        </span>
        {!hideIcon && <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
      </button>

      <DatePickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
        title={title}
        minDate={minDate}
        maxDate={maxDate}
        minYear={minYear}
        maxYear={maxYear}
      />
    </>
  );
}
