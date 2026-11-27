"use client";

import { Flame, Clock, Save, Loader2 } from "lucide-react";

/**
 * Prayer tracking enable/disable, schedule preview, and calculation method settings section.
 */
export default function PrayersSection({
  profile,
  setProfile,
  prayerSchedule,
  openPrayerScheduleModal,
  isPending,
  onSave,
  onTogglePrayerTracking,
}) {
  const prayerPreviewList = [
    {
      key: "fajr",
      name: "الفجر",
      time:
        prayerSchedule?.fajr?.scheduledTime ||
        (typeof prayerSchedule?.fajr === "string" ? prayerSchedule.fajr : "04:52"),
    },
    {
      key: "dhuhr",
      name: "الظهر",
      time:
        prayerSchedule?.dhuhr?.scheduledTime ||
        (typeof prayerSchedule?.dhuhr === "string" ? prayerSchedule.dhuhr : "11:48"),
    },
    {
      key: "asr",
      name: "العصر",
      time:
        prayerSchedule?.asr?.scheduledTime ||
        (typeof prayerSchedule?.asr === "string" ? prayerSchedule.asr : "14:52"),
    },
    {
      key: "maghrib",
      name: "المغرب",
      time:
        prayerSchedule?.maghrib?.scheduledTime ||
        (typeof prayerSchedule?.maghrib === "string" ? prayerSchedule.maghrib : "17:10"),
    },
    {
      key: "isha",
      name: "العشاء",
      time:
        prayerSchedule?.isha?.scheduledTime ||
        (typeof prayerSchedule?.isha === "string" ? prayerSchedule.isha : "18:28"),
    },
  ];

  return (
    <form
      onSubmit={onSave}
      className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">تتبع الصلوات</h2>
            <p className="text-xs text-zinc-400">
              يمكنك تشغيل أو إخفاء متابعة الصلوات حسب تفضيلاتك.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            role="group"
            aria-label="حالة عرض متابعة الصلوات"
            className="inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            <button
              type="button"
              onClick={() => onTogglePrayerTracking(true)}
              aria-pressed={Boolean(profile.prayerTrackingEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                profile.prayerTrackingEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              إظهار
            </button>
            <button
              type="button"
              onClick={() => onTogglePrayerTracking(false)}
              aria-pressed={!profile.prayerTrackingEnabled}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                !profile.prayerTrackingEnabled
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              إخفاء
            </button>
          </div>

          <button
            type="button"
            onClick={openPrayerScheduleModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>تعديل مواعيد الصلوات</span>
          </button>
        </div>
      </div>

      {!profile.prayerTrackingEnabled && (
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
          متابعة الصلوات مخفية حالياً من الشاشة الرئيسية والتقارير وفقاً لتفضيلك. يتم الحفاظ على أي سجلات صلاة سابقة بأمان ويمكنك تعديل المواعيد أو إعادة التفعيل في أي وقت.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {prayerPreviewList.map((p) => (
              <div
                key={p.key}
                className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center"
              >
                <span className="text-xs text-zinc-400 block mb-1">{p.name}</span>
                <span className="text-base font-black font-mono text-amber-300">
                  {p.time}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                الهيئة الحسابية الفلكية
              </label>
              <select
                value={profile.prayerCalc}
                onChange={(e) => setProfile({ ...profile, prayerCalc: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200"
              >
                <option value="أم القرى - مكة المكرمة">
                  أم القرى - مكة المكرمة (السعودية والخليج)
                </option>
                <option value="الهيئة المصرية العامة للمساحة">
                  الهيئة المصرية العامة للمساحة (مصر وأفريقيا)
                </option>
                <option value="رابطة العالم الإسلامي">رابطة العالم الإسلامي</option>
                <option value="جامعة العلوم الإسلامية بكراتشي">
                  جامعة العلوم الإسلامية بكراتشي
                </option>
                <option value="الاتحاد الإسلامي بأمريكا الشمالية ISNA">
                  الاتحاد الإسلامي بأمريكا الشمالية (ISNA)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                طريقة حساب وقت صلاة العصر
              </label>
              <select
                value={profile.asrMethod}
                onChange={(e) => setProfile({ ...profile, asrMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200"
              >
                <option value="standard">
                  الجمهور (الشافعي، الحنبلي، المالكي - ظل مثله)
                </option>
                <option value="hanafi">المذهب الحنفي (ظل مثليه)</option>
              </select>
            </div>
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
              <span>{isPending ? "جارٍ الحفظ..." : "حفظ إعدادات الصلوات"}</span>
            </button>
          </div>
    </form>
  );
}
