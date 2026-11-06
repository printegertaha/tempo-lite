"use client";

import { useState } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  X,
  PieChart
} from "lucide-react";

export default function ExpensesPage() {
  const { expensesData, addExpense, deleteExpense } = useAthar();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "طعام ومطاعم",
  });

  const { monthlyBudget, monthlySpent, dailyAverageSpent, todaySpent, categories, transactions } = expensesData;
  const remainingBudget = monthlyBudget - monthlySpent;
  const monthlyPercent = Math.min(100, Math.round((monthlySpent / monthlyBudget) * 100));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    addExpense(form);
    setForm({ title: "", amount: "", category: "طعام ومطاعم" });
    setModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">إدارة المصاريف والميزانية</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                ر.س (SAR)
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              تتبع الصرف اليومي والشهري بدقة والالتزام بحدود الميزانية المالية
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل عملية دفع</span>
        </button>
      </div>

      {/* 2. Monthly Budget Progress Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1c1409] via-[#120e06] to-[#0c0e17] border border-amber-500/30 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">الميزانية الشهرية (نوفمبر)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-black font-mono text-zinc-100">{monthlySpent} ر.س</h2>
              <span className="text-sm text-zinc-400 font-mono">/ {monthlyBudget} ر.س</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              المتبقي للشهر: <span className="font-mono text-emerald-400 font-bold">{remainingBudget} ر.س</span> • تم استهلاك {monthlyPercent}% من الميزانية
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-0.5">صرف اليوم</span>
              <span className="text-xl font-black font-mono text-amber-400">{todaySpent} ر.س</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-0.5">المعدل اليومي</span>
              <span className="text-xl font-black font-mono text-zinc-200">{dailyAverageSpent} ر.س</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-zinc-900 mt-6 overflow-hidden border border-zinc-800">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" 
            style={{ width: `${monthlyPercent}%` }} 
          />
        </div>
      </div>

      {/* 3. Category Breakdown */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">توزيع المصاريف حسب الأبواب</h3>
          <span className="text-xs text-zinc-400">٥ أبواب ميزانية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-zinc-200">{cat.name}</span>
                <span className="font-mono text-zinc-400">{cat.spent} / {cat.budget} ر.س</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} 
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                <span>{cat.percent}% مستهلك</span>
                <span>باقي {cat.budget - cat.spent} ر.س</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Transactions Ledger */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">سجل المعاملات والمدفوعات الأخيرة</h3>
          <span className="text-xs font-mono text-zinc-400">{transactions.length} عمليات</span>
        </div>

        <div className="divide-y divide-zinc-850 mt-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 group">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-200">{tx.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-zinc-500">{tx.date} • {tx.time}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {tx.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-black text-amber-400">
                  -{tx.amount} ر.س
                </span>
                <button
                  onClick={() => deleteExpense(tx.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-opacity"
                  title="حذف المصروف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Add Expense Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-[#0e111a] border border-zinc-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>تسجيل مصروف جديد</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">وصف المصروف</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: وجبة غداء، فاتورة إنترنت، بنزين"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">المبلغ (ر.س)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">التصنيف</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                >
                  <option value="طعام ومطاعم">طعام ومطاعم</option>
                  <option value="صحة ومكملات وجيم">صحة ومكملات وجيم</option>
                  <option value="مواصلات ووقود">مواصلات ووقود</option>
                  <option value="تطوير واشتراكات تقنية">تطوير واشتراكات تقنية</option>
                  <option value="فواتير ومستلزمات">فواتير ومستلزمات</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

