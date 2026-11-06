"use client";

import { useState } from "react";
import { Smartphone, Check, X, Clock, Sparkles } from "lucide-react";

export default function SocialMediaModal({
  isOpen,
  onSaveSession,
  onClose,
}) {
  const [platform, setPlatform] = useState("Instagram");
  const [durationMinutes, setDurationMinutes] = useState("20");
  const [reason, setReason] = useState("ترفيه");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const platforms = [
    { id: "TikTok", label: "تيك توك", color: "from-pink-500 to-rose-500" },
    { id: "Instagram", label: "إنستغرام", color: "from-purple-500 to-pink-500" },
    { id: "YouTube", label: "يوتيوب", color: "from-red-600 to-red-500" },
    { id: "X (Twitter)", label: "إكس (تويتر)", color: "from-zinc-700 to-zinc-900" },
    { id: "Facebook", label: "فيسبوك", color: "from-blue-600 to-indigo-600" },
    { id: "Reddit", label: "ريديت", color: "from-orange-600 to-amber-600" },
    { id: "Other", label: "أخرى", color: "from-zinc-600 to-zinc-750" },
  ];

  const reasons = [
    "ترفيه وتسلية",
    "متابعة أخبار تقنية",
    "تواصل مع الأصدقاء",
    "تسويف وهروب من مهمة",
    "بحث وتعلم",
    "عادة لا إرادية",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!durationMinutes) return;

    const end = new Date();
    const start = new Date(end.getTime() - Number(durationMinutes) * 60000);

    onSaveSession({
      platform,
      durationMinutes: Number(durationMinutes),
      startTime: start.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      endTime: end.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      reason,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-pink-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-zinc-100 font-bold text-base">توثيق جلسة استخدام سوشيال ميديا</h3>
              <p className="text-zinc-400 text-xs">سجل يدوي لمراقبة وقت الشاشة وزيادة الوعي</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Platform Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              المنصة المستخدمة
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {platforms.map((p) => {
                const isSelected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? "bg-pink-500/20 border-pink-500/50 text-pink-200 shadow-sm"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              المدة المستهلكة (بالدقائق)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 font-mono text-zinc-100 text-sm focus:outline-none focus:border-pink-500"
                required
              />
              <span className="text-xs text-zinc-400 shrink-0">دقيقة</span>
            </div>
          </div>

          {/* Reason / Context */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              السياق أو الدافع
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
            >
              {reasons.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ملاحظة شخصية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: كان بإمكاني استبدالها بالمشي أو قراءة كتاب"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400">
            ℹ️ تنبيه: تطبيق أثر يعتمد على تسجيلك الذاتي لتعزيز وعيك ولا يتجسس على تطبيقات هاتفك.
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>توثيق الجلسة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

