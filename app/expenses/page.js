"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAthar } from "@/components/context/AtharContext";
import {
  Wallet,
  Plus,
  Trash2,
  CreditCard,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Banknote,
  Edit2,
  Check,
} from "lucide-react";
import {
  CURRENCIES,
  formatCurrency,
  getCurrencyDefinition,
} from "@/lib/localization";

const EXPENSE_CATEGORIES = [
  "طعام ومطاعم",
  "صحة ومكملات وجيم",
  "مواصلات ووقود",
  "تطوير واشتراكات تقنية",
  "فواتير ومستلزمات",
  "تسوق ومشتريات",
  "عام",
];

const INCOME_CATEGORIES = ["راتب", "عمل حر ومشاريع", "استثمار", "هدية / دخل آخر"];

export default function ExpensesPage() {
  const { expensesData, addExpense, deleteExpense, userPreferences, updatePreferences, showToast } =
    useAthar();
  const preferredCurrency = userPreferences?.currency || "EGP";
  const preferredCurrencyDef = getCurrencyDefinition(preferredCurrency);
  const monthlySalary = Number(userPreferences?.monthlySalary || 0);

  const [salaryEditing, setSalaryEditing] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "طعام ومطاعم",
    currency: preferredCurrency,
  });

  const transactions = useMemo(
    () => expensesData?.transactions || [],
    [expensesData?.transactions]
  );
  const monthlyBudget = Number(expensesData?.monthlyBudget || 0);

  const handleOpenSalaryEdit = () => {
    setSalaryInput(monthlySalary > 0 ? String(monthlySalary) : "");
    setSalaryEditing(true);
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    const numeric = salaryInput.trim() === "" ? 0 : Number(salaryInput);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    setSavingSalary(true);
    try {
      await updatePreferences({ monthlySalary: numeric });
      setSalaryEditing(false);
      showToast(
        numeric > 0
          ? `تم حفظ الراتب الشهري (${formatCurrency(numeric, preferredCurrency)}) بنجاح`
          : "تم مسح قيمة الراتب الشهري",
        "success"
      );
    } finally {
      setSavingSalary(false);
    }
  };

  const openAddModal = (initialType = "expense") => {
    setForm({
      title: "",
      amount: "",
      type: initialType,
      category: initialType === "income" ? "راتب" : "طعام ومطاعم",
      currency: preferredCurrency,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    addExpense({
      title: form.title.trim(),
      amount: numericAmount,
      type: form.type === "income" ? "income" : "expense",
      category: form.category,
      currency: form.currency || preferredCurrency,
    });
    setForm({
      title: "",
      amount: "",
      type: "expense",
      category: "طعام ومطاعم",
      currency: preferredCurrency,
    });
    setModalOpen(false);
  };

  // Currency-safe aggregations: never mix distinct currencies into one misleading scalar!
  const summary = useMemo(() => {
    const now = new Date();
    const todayPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const monthPrefix = todayPrefix.slice(0, 7);

    const primarySpend = transactions
      .filter(
        (t) =>
          (t.type || "expense") === "expense" &&
          (t.currency || preferredCurrency) === preferredCurrency &&
          (t.date || "").startsWith(monthPrefix)
      )
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const primaryTodaySpend = transactions
      .filter(
        (t) =>
          (t.type || "expense") === "expense" &&
          (t.currency || preferredCurrency) === preferredCurrency &&
          t.date === todayPrefix
      )
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const primaryIncome = transactions
      .filter(
        (t) =>
          t.type === "income" &&
          (t.currency || preferredCurrency) === preferredCurrency &&
          (t.date || "").startsWith(monthPrefix)
      )
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Distinct non-preferred currency totals shown transparently without fake FX conversion
    const otherCurrencyTotals = {};
    for (const tx of transactions) {
      const code = tx.currency || preferredCurrency;
      if (code === preferredCurrency) continue;
      if (!otherCurrencyTotals[code]) {
        otherCurrencyTotals[code] = { expense: 0, income: 0 };
      }
      if (tx.type === "income") {
        otherCurrencyTotals[code].income += Number(tx.amount || 0);
      } else {
        otherCurrencyTotals[code].expense += Number(tx.amount || 0);
      }
    }

    const dayOfMonth = Math.max(1, now.getDate());
    const dailyAverage =
      primarySpend > 0 ? Math.round((primarySpend / dayOfMonth) * 100) / 100 : 0;

    return {
      primarySpend,
      primaryTodaySpend,
      primaryIncome,
      dailyAverage,
      otherCurrencyEntries: Object.entries(otherCurrencyTotals),
    };
  }, [transactions, preferredCurrency]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    for (const tx of transactions) {
      if ((tx.type || "expense") !== "expense") continue;
      const code = tx.currency || preferredCurrency;
      if (code !== preferredCurrency) continue;
      map.set(tx.category, (map.get(tx.category) || 0) + Number(tx.amount || 0));
    }
    return Array.from(map.entries()).map(([name, spent]) => ({ name, spent }));
  }, [transactions, preferredCurrency]);

  const totalMonthlyInflow = monthlySalary + summary.primaryIncome;
  const effectiveCeiling = monthlySalary > 0 ? totalMonthlyInflow : monthlyBudget;
  const hasCeiling = effectiveCeiling > 0;
  const remainingFromCeiling = effectiveCeiling - summary.primarySpend;
  const monthlyPercent = hasCeiling
    ? Math.min(100, Math.round((summary.primarySpend / effectiveCeiling) * 100))
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                إدارة المصاريف والدخل
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {preferredCurrencyDef.nameAr} ({preferredCurrencyDef.code})
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              متابعة عملياتك المالية الفعلية بعملتك الأساسية مع حفظ عملة كل معاملة كما أُنشئت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/settings?section=localization"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تغيير العملة</span>
          </Link>

          <button
            type="button"
            onClick={() => openAddModal("expense")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل عملية مالية</span>
          </button>
        </div>
      </div>

      {/* 2. Real Summary Cards + Monthly Salary */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1c1409] via-[#120e06] to-[#0c0e17] border border-amber-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              ملخص الشهر الحالي ({preferredCurrencyDef.code})
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <h2 className="text-3xl font-black font-mono text-zinc-100">
                {formatCurrency(summary.primarySpend, preferredCurrency)}
              </h2>
              {hasCeiling && (
                <span className="text-sm text-zinc-400 font-mono">
                  / {formatCurrency(effectiveCeiling, preferredCurrency)}
                </span>
              )}
            </div>
            {hasCeiling ? (
              <p className="text-xs text-zinc-400 mt-2">
                {monthlySalary > 0 ? "المتبقي من الراتب والدخل:" : "المتبقي للشهر:"}{" "}
                <span
                  className={`font-mono font-bold ${
                    remainingFromCeiling >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatCurrency(remainingFromCeiling, preferredCurrency)}
                </span>{" "}
                • تم صرف {monthlyPercent}%
              </p>
            ) : (
              <p className="text-xs text-zinc-400 mt-2">
                {transactions.length === 0
                  ? "رصيد البداية نظيف — لم يتم تسجيل مصروفات أو دخل بعد"
                  : `إجمالي الدخل المسجل هذا الشهر: ${formatCurrency(
                      summary.primaryIncome,
                      preferredCurrency
                    )}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Monthly Salary Box */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center flex flex-col items-center justify-center gap-1">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>الراتب الشهري</span>
              </span>
              {!salaryEditing ? (
                <button
                  type="button"
                  onClick={handleOpenSalaryEdit}
                  className="group inline-flex items-center gap-1.5 text-sm sm:text-base font-black font-mono text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  title="تعديل الراتب الشهري"
                >
                  <span>
                    {monthlySalary > 0
                      ? formatCurrency(monthlySalary, preferredCurrency)
                      : "إدخال الراتب"}
                  </span>
                  <Edit2 className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                </button>
              ) : (
                <form onSubmit={handleSaveSalary} className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-24 px-2 py-1 rounded-lg bg-zinc-950 border border-emerald-500/50 text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingSalary}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    title="حفظ الراتب"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryEditing(false)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                    title="إلغاء"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-0.5">صرف اليوم</span>
              <span className="text-lg sm:text-xl font-black font-mono text-amber-400">
                {formatCurrency(summary.primaryTodaySpend, preferredCurrency)}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-0.5">دخل إضافي</span>
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                {formatCurrency(summary.primaryIncome, preferredCurrency)}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 block mb-0.5">المعدل اليومي</span>
              <span className="text-lg sm:text-xl font-black font-mono text-zinc-200">
                {formatCurrency(summary.dailyAverage, preferredCurrency)}
              </span>
            </div>
          </div>
        </div>

        {hasCeiling && (
          <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remainingFromCeiling < 0
                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>
        )}

        {summary.otherCurrencyEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
            <span className="text-zinc-400">عمليات مسجلة بعملات أخرى (محفوظة بعملتها الأصلية):</span>
            {summary.otherCurrencyEntries.map(([code, vals]) => (
              <span
                key={code}
                className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-700/70 font-mono text-[11px]"
              >
                {code}: مصروف {formatCurrency(vals.expense, code)}
                {vals.income > 0 ? ` • دخل ${formatCurrency(vals.income, code)}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Category Breakdown (Shown only when user has recorded expenses) */}
      {categoryTotals.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-100">توزيع المصاريف حسب التصنيف</h3>
            <span className="text-xs text-zinc-400">{categoryTotals.length} تصنيفات نشطة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryTotals.map((cat) => (
              <div
                key={cat.name}
                className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-zinc-200">{cat.name}</span>
                <span className="font-mono text-sm font-bold text-amber-300">
                  {formatCurrency(cat.spent, preferredCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Transactions Ledger OR Clean Empty State */}
      <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">سجل العمليات المالية</h3>
          <span className="text-xs font-mono text-zinc-400">{transactions.length} عمليات</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="text-base font-bold text-zinc-100">لسه مفيش عمليات مالية</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                مساحتك المالية تبدأ نظيفة تماماً دون أي معاملات وهمية. أضف أول مصروف أو دخل لتبدأ التتبع بعملتك ({preferredCurrencyDef.nameAr}).
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => openAddModal("expense")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول مصروف</span>
              </button>
              <button
                type="button"
                onClick={() => openAddModal("income")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل دخل</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-850 mt-2">
            {transactions.map((tx) => {
              const isIncome = tx.type === "income";
              const txCurrency = tx.currency || preferredCurrency;
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
                        isIncome
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : "bg-zinc-900 border-zinc-800 text-amber-400"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-200">{tx.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] font-mono text-zinc-500">
                          {tx.date}
                          {tx.time ? ` • ${tx.time}` : ""}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {tx.category}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                          {txCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-sm font-black ${
                        isIncome ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount, txCurrency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteExpense(tx.id)}
                      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-opacity"
                      title="حذف المعاملة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Add Transaction Modal */}
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
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>تسجيل عملية مالية جديدة</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Transaction Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: "expense",
                      category: EXPENSE_CATEGORIES[0],
                    }))
                  }
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    form.type === "expense"
                      ? "bg-amber-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  مصروف
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: "income",
                      category: INCOME_CATEGORIES[0],
                    }))
                  }
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    form.type === "income"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  دخل / إيراد
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  وصف العملية
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    form.type === "income"
                      ? "مثال: راتب شهري، مشروع مستقل"
                      : "مثال: وجبة غداء، فاتورة إنترنت، مواصلات"
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    المبلغ ({getCurrencyDefinition(form.currency).code})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">العملة</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">التصنيف</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                >
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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
                  حفظ العملية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
