"use client";

import { useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { 
  Droplets, 
  Utensils, 
  Plus, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Clock, 
  PieChart,
  Trash2,
  X,
  Coffee,
  Apple,
  Sun,
  Moon
} from "lucide-react";

export default function NutritionPage() {
  const { nutritionData, addWater, addMeal, showToast } = useAthar();
  const [mealModalOpen, setMealModalOpen] = useState(false);
  
  const [mealType, setMealType] = useState("lunch"); // 'breakfast', 'lunch', 'dinner', 'snacks'
  const [newMeal, setNewMeal] = useState({
    title: "",
    mealType: "lunch",
    time: "13:30",
    description: "",
    calories: "650",
    protein: "45",
    carbs: "70",
    fat: "15",
    notes: "",
  });

  const { dailyTargets, todayLogged, meals } = nutritionData;

  const calPercent = Math.min(100, Math.round((todayLogged.calories / dailyTargets.calories) * 100));
  const proPercent = Math.min(100, Math.round((todayLogged.protein / dailyTargets.protein) * 100));
  const carbPercent = Math.min(100, Math.round((todayLogged.carbs / dailyTargets.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((todayLogged.fat / dailyTargets.fat) * 100));
  const waterPercent = Math.min(100, Math.round((todayLogged.waterLiters / dailyTargets.waterLiters) * 100));

  const mealCategories = [
    { id: "breakfast", label: "إفطار الصباح", icon: Coffee, color: "text-amber-400" },
    { id: "lunch", label: "وجبة الغداء", icon: Sun, color: "text-orange-400" },
    { id: "dinner", label: "وجبة العشاء", icon: Moon, color: "text-indigo-400" },
    { id: "snacks", label: "سناكس ووجبات خفيفة", icon: Apple, color: "text-lime-400" },
  ];

  const handleMealSubmit = (e) => {
    e.preventDefault();
    if (!newMeal.title.trim()) return;

    addMeal({
      name: newMeal.title.trim(),
      mealType,
      time: newMeal.time || "13:00",
      description: newMeal.description.trim() || newMeal.title.trim(),
      calories: Number(newMeal.calories || 0),
      protein: Number(newMeal.protein || 0),
      carbs: Number(newMeal.carbs || 0),
      fat: Number(newMeal.fat || 0),
      notes: newMeal.notes.trim(),
      items: newMeal.description ? newMeal.description.split(",").map((s) => s.trim()) : [newMeal.title],
    });

    setNewMeal({ title: "", mealType: "lunch", time: "13:30", description: "", calories: "650", protein: "45", carbs: "70", fat: "15", notes: "" });
    setMealModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">سجل التغذية وترطيب الجسم</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25">
                اليوم
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              توثيق وجبات الإفطار والغداء والعشاء والسناكس مع توزيع السعرات وشرب الماء
            </p>
          </div>
        </div>

        <button
          onClick={() => setMealModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل وجبة جديدة</span>
        </button>
      </div>

      {/* 2. Hydration Water Gauge Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c151c] to-[#0c0e17] border border-teal-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/15 border-2 border-teal-400 text-teal-300">
            <Droplets className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-100">مستوى شرب الماء اليوم</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300">
                {waterPercent}%
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              شربت <span className="font-mono text-teal-300 font-bold">{todayLogged.waterLiters} لتر</span> من أصل المستهدف ({dailyTargets.waterLiters} لتر)
            </p>
          </div>
        </div>

        {/* Quick add water buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => addWater(0.25)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+250 مل (كوب)</span>
          </button>
          <button
            onClick={() => addWater(0.5)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+500 مل (قارورة)</span>
          </button>
        </div>
      </div>

      {/* 3. Calories & Macros 4 Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">إجمالي السعرات الحرارية</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-zinc-100">{todayLogged.calories}</span>
            <span className="text-xs font-mono text-zinc-500">من {dailyTargets.calories} kcal</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${calPercent}%` }} />
          </div>
        </div>

        {/* Protein */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">البروتين (لبناء واستشفاء العضلات)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-emerald-400">{todayLogged.protein} جم</span>
            <span className="text-xs font-mono text-zinc-500">من {dailyTargets.protein} جم</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proPercent}%` }} />
          </div>
        </div>

        {/* Carbs */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">الكاربوهيدرات (طاقة العمل والتمرين)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-cyan-400">{todayLogged.carbs} جم</span>
            <span className="text-xs font-mono text-zinc-500">من {dailyTargets.carbs} جم</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${carbPercent}%` }} />
          </div>
        </div>

        {/* Fat */}
        <div className="p-5 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-lg">
          <span className="text-xs text-zinc-400 font-medium">الدهون الصحية (الهرمونات)</span>
          <div className="flex items-baseline justify-between my-2">
            <span className="text-2xl font-black font-mono text-orange-400">{todayLogged.fat} جم</span>
            <span className="text-xs font-mono text-zinc-500">من {dailyTargets.fat} جم</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${fatPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 4. Complete Meal Tracking Sections: Breakfast, Lunch, Dinner, Snacks */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100">سجل الوجبات اليومية (إفطار، غداء، عشاء، سناكس)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">توزيع الأطعمة والماكروز وساعات الأكل على مدار اليوم</p>
          </div>
          <span className="text-xs font-mono text-teal-400 font-bold bg-teal-500/10 px-3 py-1 rounded-xl border border-teal-500/20">
            {meals.length} وجبات مسجلة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meals.map((meal) => (
            <div key={meal.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                      {meal.time}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-100">{meal.name}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-zinc-800 text-zinc-200">
                    {meal.calories} kcal
                  </span>
                </div>

                <ul className="text-xs text-zinc-300 space-y-1 my-3 pr-2 list-disc list-inside">
                  {meal.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>

                {meal.notes && (
                  <p className="text-[11px] text-zinc-400 italic mb-2">
                    ملاحظة: {meal.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>بروتين: <b className="text-emerald-400">{meal.protein}g</b></span>
                <span>كارب: <b className="text-cyan-400">{meal.carbs}g</b></span>
                <span>دهون: <b className="text-orange-400">{meal.fat}g</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Add Meal Modal (Requirement 4: Breakfast, Lunch, Dinner, Snacks, Meal Time, Description, Notes) */}
      {mealModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setMealModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-[#0e111a] border border-teal-500/30 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-teal-400" />
                <span>توثيق وجبة غذائية</span>
              </h3>
              <button onClick={() => setMealModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMealSubmit} className="space-y-4 mt-4">
              {/* Category picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">نوع الوجبة</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {mealCategories.map((c) => {
                    const isSelected = mealType === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setMealType(c.id);
                          setNewMeal({ ...newMeal, mealType: c.id, title: c.label });
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-200"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{c.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم الوجبة</label>
                  <input
                    type="text"
                    value={newMeal.title}
                    onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
                    placeholder="مثال: غداء صدور دجاج مشوية مع أرز"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">توقيت الوجبة</label>
                  <input
                    type="time"
                    value={newMeal.time}
                    onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">وصف المكونات (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={newMeal.description}
                  onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                  placeholder="250 جم دجاج، كوب أرز بني، صحن سلطة بزيت زيتون"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  required
                />
              </div>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">السعرات (kcal)</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    placeholder="650"
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">بروتين (g)</label>
                  <input
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    placeholder="45"
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">كارب (g)</label>
                  <input
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    placeholder="70"
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">دهون (g)</label>
                  <input
                    type="number"
                    value={newMeal.fat}
                    onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                    placeholder="15"
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  placeholder="مثال: وجبة خفيفة ومريحة للهضم قبل تمرين الجيم بساعتين"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMealModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30"
                >
                  حفظ الوجبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
