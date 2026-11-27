"use client";

export function computePomodoroCycles(
  totalMinutes: number | null | undefined,
  workCycle: number,
  breakCycle: number
): Array<{ work: number; breakAfter: number }> {
  const safeWork = Math.max(1, workCycle || 25);
  const safeBreak = Math.max(1, breakCycle || 5);
  if (!totalMinutes || totalMinutes <= 0) {
    return [{ work: safeWork, breakAfter: safeBreak }];
  }

  const cycles: Array<{ work: number; breakAfter: number }> = [];
  let remaining = totalMinutes;
  while (remaining > 0 && cycles.length < 12) {
    const chunk = Math.min(safeWork, remaining);
    remaining -= chunk;
    cycles.push({
      work: chunk,
      breakAfter: remaining > 0 ? safeBreak : 0,
    });
  }
  return cycles;
}

interface PomodoroConfigPickerProps {
  isPomodoro: boolean;
  onToggle: (checked: boolean) => void;
  workCycle: number;
  breakCycle: number;
  onSelectPreset: (work: number, breakMins: number) => void;
  durationMinutes?: number | null;
}

export default function PomodoroConfigPicker({
  isPomodoro,
  onToggle,
  workCycle,
  breakCycle,
  onSelectPreset,
}: PomodoroConfigPickerProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
      {/* Top Toggle Row */}
      <div className="flex items-center justify-start gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={isPomodoro}
          onClick={() => onToggle(!isPomodoro)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            isPomodoro ? "bg-violet-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
              isPomodoro ? "-translate-x-5.5" : "-translate-x-1"
            }`}
          />
        </button>

        <span className="text-base leading-none shrink-0" aria-hidden="true">
          🍅
        </span>
        <span className="text-xs font-bold text-zinc-100 whitespace-nowrap">
          تفعيل نظام بومودورو
        </span>
      </div>

      {/* Inline Work & Break Inputs only */}
      {isPomodoro && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 text-right">
            <label className="block text-[11px] font-medium text-zinc-300">
              وقت الشغل
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={workCycle}
              onChange={(e) => {
                const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                onSelectPreset(val, breakCycle);
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950/70 border border-violet-500/35 text-xs font-mono text-zinc-100 focus:outline-none focus:border-violet-500 text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-1 text-right">
            <label className="block text-[11px] font-medium text-emerald-400">
              الراحة
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={breakCycle}
              onChange={(e) => {
                const val = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                onSelectPreset(workCycle, val);
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950/70 border border-emerald-500/35 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-400 text-left"
              dir="ltr"
            />
          </div>
        </div>
      )}
    </div>
  );
}
