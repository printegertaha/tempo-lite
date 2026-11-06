"use client";

import { useState } from "react";
import { useAthar } from "./context/AtharContext";
import { 
  X, 
  Flame, 
  Code2, 
  Dumbbell, 
  Droplets, 
  Footprints, 
  Smartphone, 
  Cigarette, 
  Check, 
  Plus, 
  Clock, 
  Sparkles,
  MapPin,
  Play
} from "lucide-react";

export default function QuickLogModal() {
  const { 
    quickLogModalOpen, 
    closeQuickLog, 
    quickLogInitialTab,
    getDayRecords,
    selectedDate,
    togglePrayerQuick,
    openPrayerDetail,
    startTimer,
    addWaterCup,
    addGymSession,
    addRunningSession,
    addSocialMediaSession,
    addSmokingEvent,
    prayerSchedule,
    showToast
  } = useAthar();

  const [activeTab, setActiveTab] = useState(quickLogInitialTab || "prayer");

  // Local tab forms
  const [workForm, setWorkForm] = useState({ projectName: "منصة أثر v2", durationHours: "1.5", task: "برمجة الواجهة" });
  const [gymForm, setGymForm] = useState({ gymName: "Fitness Time", workoutType: "Push Day", durationMinutes: "60", notes: "" });
  const [runForm, setRunForm] = useState({ distanceKm: "5.0", durationMinutes: "28", location: "حديقة الحي" });
  const [socialForm, setSocialForm] = useState({ platform: "Instagram", durationMinutes: "20", reason: "ترفيه" });
  const [smokeForm, setSmokeForm] = useState({ count: 1, location: "خارج العمل", trigger: "توتر وضغط عمل" });

  if (!quickLogModalOpen) return null;

  const dayRecords = getDayRecords(selectedDate);
  const prayers = dayRecords.prayers || {};
  const prayerKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  const handleWorkSubmit = (e) => {
    e.preventDefault();
    const durationSeconds = Math.round(Number(workForm.durationHours || 1) * 3600);
    startTimer("programming", workForm.projectName, { task: workForm.task });
    closeQuickLog();
  };

  const handleGymSubmit = (e) => {
    e.preventDefault();
    addGymSession({
      gymName: gymForm.gymName,
      workoutType: gymForm.workoutType,
      durationMinutes: Number(gymForm.durationMinutes) || 60,
      startTime: new Date(Date.now() - (Number(gymForm.durationMinutes) || 60) * 60000).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      endTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      notes: gymForm.notes,
    });
    closeQuickLog();
  };

  const handleRunSubmit = (e) => {
    e.preventDefault();
    const dist = Number(runForm.distanceKm) || 5;
    const durSecs = (Number(runForm.durationMinutes) || 28) * 60;
    const paceMins = Math.floor(durSecs / dist / 60);
    const paceSecs = Math.round((durSecs / dist) % 60);

    addRunningSession({
      distanceKm: dist,
      durationSeconds: durSecs,
      pace: `${paceMins}'${String(paceSecs).padStart(2, "0")}" /كم`,
      startTime: "06:00",
      endTime: "06:28",
      location: runForm.location,
      calories: Math.round(dist * 72),
    });
    closeQuickLog();
  };

  const handleSocialSubmit = (e) => {
    e.preventDefault();
    addSocialMediaSession({
      platform: socialForm.platform,
      durationMinutes: Number(socialForm.durationMinutes) || 15,
      startTime: "12:00",
      endTime: "12:15",
      reason: socialForm.reason,
    });
    closeQuickLog();
  };

  const handleSmokeSubmit = (e) => {
    e.preventDefault();
    addSmokingEvent({
      count: Number(smokeForm.count) || 1,
      time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      location: smokeForm.location,
      trigger: smokeForm.trigger,
      durationMinutes: 7,
    });
    closeQuickLog();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeQuickLog}
    >
      <div 
        className="relative w-full max-w-xl rounded-3xl bg-[#0e111a] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">تسجيل أثر فوري</h3>
              <p className="text-zinc-400 text-xs">سجّل نشاطك الحالي بلمسة واحدة دون مغادرة صفحتك</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={closeQuickLog}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 p-2 bg-zinc-950/60 border-b border-zinc-800/60 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("prayer")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "prayer" 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>الصلاة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("work")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "work" 
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>برمجة وعمل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gym")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "gym" 
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>جيم</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("run")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "run" 
                ? "bg-lime-500/15 text-lime-400 border border-lime-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>جري</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("social")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "social" 
                ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>سوشيال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("smoke")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "smoke" 
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cigarette className="w-3.5 h-3.5" />
            <span>تدخين</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("water")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "water" 
                ? "bg-teal-500/15 text-teal-400 border border-teal-500/30" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>ماء</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto">
          {/* TAB 1: PRAYER */}
          {activeTab === "prayer" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">الصلوات الخمس المقررة</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {prayerKeys.filter(k => prayers[k]?.done).length}/5 مكتمل
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prayerKeys.map((key) => {
                  const p = prayers[key] || {};
                  const sched = prayerSchedule[key] || { name: key, scheduledTime: "12:00" };
                  const isDone = Boolean(p.done);

                  return (
                    <div 
                      key={key}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isDone 
                          ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-100" 
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => togglePrayerQuick(key)}
                          className={`flex items-center justify-center w-7 h-7 rounded-xl border transition-transform active:scale-90 cursor-pointer ${
                            isDone 
                              ? "bg-emerald-500 text-zinc-950 border-emerald-400" 
                              : "border-zinc-700 bg-zinc-800/80 text-transparent"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                        <div>
                          <span className="text-sm font-bold block">{sched.name}</span>
                          <span className="text-xs text-zinc-400 font-mono">{sched.scheduledTime}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          closeQuickLog();
                          openPrayerDetail(key);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1"
                      >
                        تعديل التفاصيل
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={closeQuickLog}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WORK / CODING */}
          {activeTab === "work" && (
            <form onSubmit={handleWorkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المشروع</label>
                <input 
                  type="text" 
                  value={workForm.projectName} 
                  onChange={(e) => setWorkForm({ ...workForm, projectName: e.target.value })}
                  placeholder="مثال: منصة أثر، تعلم Rust"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المهمة</label>
                <input 
                  type="text" 
                  value={workForm.task} 
                  onChange={(e) => setWorkForm({ ...workForm, task: e.target.value })}
                  placeholder="المهمة الهندسية المحددة"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>بدء مؤقت الجلسة الفعلي</span>
              </button>
            </form>
          )}

          {/* TAB 3: GYM */}
          {activeTab === "gym" && (
            <form onSubmit={handleGymSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم النادي</label>
                <input 
                  type="text" 
                  value={gymForm.gymName} 
                  onChange={(e) => setGymForm({ ...gymForm, gymName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">نوع التمرين</label>
                <input 
                  type="text" 
                  value={gymForm.workoutType} 
                  onChange={(e) => setGymForm({ ...gymForm, workoutType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المدة (دقائق)</label>
                <input 
                  type="number" 
                  value={gymForm.durationMinutes} 
                  onChange={(e) => setGymForm({ ...gymForm, durationMinutes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-600/30"
              >
                توثيق تمرين الجيم
              </button>
            </form>
          )}

          {/* TAB 4: RUNNING */}
          {activeTab === "run" && (
            <form onSubmit={handleRunSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المسافة (كم)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={runForm.distanceKm} 
                    onChange={(e) => setRunForm({ ...runForm, distanceKm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">المدة (دقائق)</label>
                  <input 
                    type="number" 
                    value={runForm.durationMinutes} 
                    onChange={(e) => setRunForm({ ...runForm, durationMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المكان</label>
                <input 
                  type="text" 
                  value={runForm.location} 
                  onChange={(e) => setRunForm({ ...runForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-lime-600 to-emerald-600 text-zinc-950 font-black text-xs shadow-lg shadow-lime-600/30"
              >
                توثيق تمرين الجري
              </button>
            </form>
          )}

          {/* TAB 5: SOCIAL MEDIA */}
          {activeTab === "social" && (
            <form onSubmit={handleSocialSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المنصة</label>
                <select 
                  value={socialForm.platform} 
                  onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-150"
                >
                  <option value="TikTok">تيك توك</option>
                  <option value="Instagram">إنستغرام</option>
                  <option value="YouTube">يوتيوب</option>
                  <option value="X (Twitter)">إكس (تويتر)</option>
                  <option value="Facebook">فيسبوك</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المدة (دقائق)</label>
                <input 
                  type="number" 
                  value={socialForm.durationMinutes} 
                  onChange={(e) => setSocialForm({ ...socialForm, durationMinutes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-600/30"
              >
                توثيق جلسة السوشيال ميديا
              </button>
            </form>
          )}

          {/* TAB 6: SMOKING */}
          {activeTab === "smoke" && (
            <form onSubmit={handleSmokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">عدد السجائر</label>
                <input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={smokeForm.count} 
                  onChange={(e) => setSmokeForm({ ...smokeForm, count: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المحفز أو الدافع</label>
                <input 
                  type="text" 
                  value={smokeForm.trigger} 
                  onChange={(e) => setSmokeForm({ ...smokeForm, trigger: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                تسجيل الحدث بخصوصية
              </button>
            </form>
          )}

          {/* TAB 7: WATER */}
          {activeTab === "water" && (
            <div className="space-y-4 text-center py-2">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Droplets className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <h4 className="text-zinc-100 font-bold text-sm">ترطيب الجسم وشرب الماء</h4>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { addWaterCup(1); closeQuickLog(); }}
                  className="p-4 rounded-2xl bg-zinc-900 hover:bg-teal-950/40 border border-zinc-800 hover:border-teal-500/40 text-zinc-200 transition-all cursor-pointer"
                >
                  <span className="text-xl font-bold font-mono text-teal-400 block">+250 مل</span>
                  <span className="text-xs text-zinc-400">كوب ماء</span>
                </button>
                <button
                  type="button"
                  onClick={() => { addWaterCup(2); closeQuickLog(); }}
                  className="p-4 rounded-2xl bg-zinc-900 hover:bg-teal-950/40 border border-zinc-800 hover:border-teal-500/40 text-zinc-200 transition-all cursor-pointer"
                >
                  <span className="text-xl font-bold font-mono text-teal-400 block">+500 مل</span>
                  <span className="text-xs text-zinc-400">قارورة كاملة</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
