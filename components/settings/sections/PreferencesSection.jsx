"use client";

import { Sliders, Bell, Volume2, Sparkles, Save, Loader2 } from "lucide-react";

/**
 * UI notifications, sound effects, and daily quote preferences section.
 */
export default function PreferencesSection({
  profile,
  setProfile,
  isPending,
  onSave,
}) {
  return (
    <form
      onSubmit={onSave}
      className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6"
    >
      <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-800">
        <Sliders className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-base font-bold text-zinc-100">تفضيلات الواجهة والتنبيهات</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            تخصيص التذكيرات اليومية، الأصوات، ومحتوى اليوميات
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-zinc-200">
                التذكيرات اليومية الذكية
              </span>
              <span className="block text-[11px] text-zinc-400 mt-0.5">
                إظهار تنبيهات ذكية لمتابعة مهامك وعاداتك
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={profile.reminders}
            onChange={(e) => setProfile({ ...profile, reminders: e.target.checked })}
            className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-zinc-200">
                المؤثرات الصوتية عند الإنجاز
              </span>
              <span className="block text-[11px] text-zinc-400 mt-0.5">
                تشغيل صوت خفيف عند إتمام مهمة أو جلسة تركيز
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={profile.soundEffects}
            onChange={(e) => setProfile({ ...profile, soundEffects: e.target.checked })}
            className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-zinc-200">
                عرض الحكمة اليومية في اليوميات
              </span>
              <span className="block text-[11px] text-zinc-400 mt-0.5">
                إظهار اقتباس ملهم يومياً داخل مساحة التدوين
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={profile.dailyQuote}
            onChange={(e) => setProfile({ ...profile, dailyQuote: e.target.checked })}
            className="w-4 h-4 accent-violet-600 rounded cursor-pointer shrink-0"
          />
        </label>
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-800/80">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isPending ? "جارٍ الحفظ..." : "حفظ التفضيلات"}</span>
        </button>
      </div>
    </form>
  );
}
