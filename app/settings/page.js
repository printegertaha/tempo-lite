"use client";

import { useState, useEffect, useTransition } from "react";
import { useAthar } from "@/components/context/AtharContext";
import { useSession } from "@/lib/auth-client";
import { getUserSettings, updateUserSettings } from "@/actions/settings";
import { getLifeAreas } from "@/actions/life-areas";
import LifeAreasManager from "@/components/settings/LifeAreasManager";
import Link from "next/link";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Flame, 
  Download, 
  RotateCcw, 
  Check, 
  Moon, 
  ShieldCheck,
  Save,
  Sparkles,
  MapPin,
  Clock,
  Palette,
  Volume2,
  Sliders,
  AlertTriangle,
  X,
  Calendar,
  Globe,
  Loader2,
  LogIn
} from "lucide-react";

export default function SettingsPage() {
  const { 
    habits, 
    journalData, 
    expensesData, 
    nutritionData, 
    gymData, 
    prayerSchedule, 
    openPrayerScheduleModal, 
    showToast,
    appState
  } = useAthar();

  const { data: sessionData, isPending: sessionPending } = useSession();
  const [isPending, startTransition] = useTransition();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [lifeAreas, setLifeAreas] = useState([]);

  // User Profile & System Preferences State
  const [profile, setProfile] = useState({
    name: "مستخدم أثـر",
    tagline: "باحث عن الأثر الحقيقي وعمارة الوقت",
    email: "",
    role: "مهتم بالإنتاجية والانضباط",
    avatarColor: "violet",
    
    // Location Settings
    country: "المملكة العربية السعودية",
    city: "الرياض",
    timezone: "Asia/Riyadh",
    prayerCalc: "أم القرى - مكة المكرمة",
    asrMethod: "standard", // standard (Shafi'i/Hanbali/Maliki) or hanafi
    
    // System Preferences
    weekStartDay: 6, // 6 = Saturday (السبت)
    themeAccent: "violet",
    density: "comfortable",
    soundEffects: true,
    reminders: true,
    dailyQuote: true,
  });

  // Load preferences from Server (if logged in) or LocalStorage (if guest)
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (sessionData?.user) {
        // 1. Authenticated User: Load from Database via Server Actions
        try {
          const [settingsRes, areasRes] = await Promise.all([
            getUserSettings(),
            getLifeAreas(true),
          ]);

          if (isCancelled) return;

          if (settingsRes.success && settingsRes.data) {
            const dbSettings = settingsRes.data;
            const cfg = dbSettings.dashboardConfig || {};

            setProfile((prev) => ({
              ...prev,
              name: sessionData.user.name || prev.name,
              email: sessionData.user.email || prev.email,
              timezone: dbSettings.timezone || prev.timezone,
              weekStartDay: dbSettings.weekStartDay ?? prev.weekStartDay,
              themeAccent: dbSettings.themeAccent || prev.themeAccent,
              country: cfg.country || prev.country,
              city: cfg.city || prev.city,
              prayerCalc: cfg.prayerCalc || prev.prayerCalc,
              asrMethod: cfg.asrMethod || prev.asrMethod,
              density: cfg.density || prev.density,
              soundEffects: cfg.soundEffects ?? prev.soundEffects,
              dailyQuote: cfg.dailyQuote ?? prev.dailyQuote,
              tagline: cfg.tagline || prev.tagline,
              role: cfg.role || prev.role,
            }));
            setServerLoaded(true);
          }

          if (areasRes.success && areasRes.data) {
            setLifeAreas(areasRes.data);
          }
        } catch (err) {
          console.error("Error loading server settings:", err);
        }
      } else if (!sessionPending) {
        // 2. Guest User: Fallback to localStorage
        try {
          const saved = localStorage.getItem("athar_user_settings");
          if (saved) {
            setProfile((prev) => ({ ...prev, ...JSON.parse(saved) }));
          }
        } catch {}
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [sessionData, sessionPending]);

  // Save Settings
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    startTransition(async () => {
      if (sessionData?.user) {
        // Save to PostgreSQL via Server Action
        const payload = {
          timezone: profile.timezone,
          language: "ar",
          weekStartDay: Number(profile.weekStartDay),
          themeAccent: profile.themeAccent,
          dashboardConfig: {
            density: profile.density,
            soundEffects: Boolean(profile.soundEffects),
            dailyQuote: Boolean(profile.dailyQuote),
            country: profile.country,
            city: profile.city,
            prayerCalc: profile.prayerCalc,
            asrMethod: profile.asrMethod,
            tagline: profile.tagline,
            role: profile.role,
            timeFormat: "12h",
          },
        };

        const res = await updateUserSettings(payload);
        if (res.success) {
          showToast("تم حفظ الإعدادات في قاعدة البيانات السحابية بنجاح ✨", "success");
        } else {
          showToast(res.error || "تعذر حفظ الإعدادات على الخادم", "error");
        }
      } else {
        // Guest mode fallback
        try {
          localStorage.setItem("athar_user_settings", JSON.stringify(profile));
        } catch {}
        showToast("تم حفظ الإعدادات محلياً في هذا المتصفح ✨", "success");
      }
    });
  };

  // Export all user records across all domains as a unified JSON backup
  const handleExportData = () => {
    const backupData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        platform: "Athar Life Tracker (أثـر)",
        version: "2.0.0",
        author: profile.name,
      },
      userSettings: profile,
      lifeAreas: lifeAreas,
      prayerSchedule: prayerSchedule,
      appState: appState,
      habits: habits,
      journal: journalData,
      expenses: expensesData,
      nutrition: nutritionData,
      gymWorkouts: gymData,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `athar-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("تم تصدير ملف النسخة الاحتياطية الكاملة (JSON) بنجاح 📁", "success");
  };

  // Confirm Reset Modal action
  const handleConfirmReset = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      showToast("تم مسح السجلات بنجاح وإعادة ضبط النظام", "info");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const themeOptions = [
    { id: "violet", label: "بنفسجي أثيري", bg: "bg-violet-600", border: "border-violet-500" },
    { id: "emerald", label: "زمردي هادئ", bg: "bg-emerald-600", border: "border-emerald-500" },
    { id: "amber", label: "كهرماني مشرق", bg: "bg-amber-600", border: "border-amber-500" },
    { id: "cyan", label: "سيان تقني", bg: "bg-cyan-600", border: "border-cyan-500" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 text-violet-400 shadow-inner">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">إعدادات المنظومة وتخصيص التجربة</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                {sessionData?.user ? "مزامنة سحابية" : "تفضيلات محلية"}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              إدارة الهوية، مجالات الحياة الحرة، الموقع الجغرافي، والتفضيلات التقنية
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}</span>
        </button>
      </div>

      {/* Guest Mode Banner */}
      {!sessionPending && !sessionData?.user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="text-xs font-medium">
              أنت تستخدم المنظومة في وضع المعاينة المؤقت. سجّل الدخول بحساب Google لحفظ مجالاتك وإعداداتك بشكل دائم في قاعدة البيانات السحابية.
            </span>
          </div>
          <Link
            href="/login?returnTo=/settings"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </Link>
        </div>
      )}

      {/* 2. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Section: Profile Details */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-zinc-100">الملف التعريفي والهوية</h3>
              </div>
              <span className="text-xs text-zinc-400">
                {sessionData?.user ? "موثق بواسطة Google" : "هوية محلية"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="relative group">
                {sessionData?.user?.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sessionData.user.image}
                    alt={sessionData.user.name || "المستخدم"}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl border-2 border-violet-400/40 object-cover shadow-lg shadow-violet-600/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-600/30 border-2 border-violet-400/40">
                    {profile.name?.charAt(0) || "أ"}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-right">
                <h4 className="text-sm font-bold text-zinc-100">{profile.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {profile.role || "مهتم بالإنتاجية"} {profile.email ? `• ${profile.email}` : ""}
                </p>
                {profile.tagline && (
                  <p className="text-[11px] text-zinc-400 mt-1 italic font-sans">{profile.tagline}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">الاسم المعروض</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  placeholder="اسمك الكامل"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  disabled={Boolean(sessionData?.user)}
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المسمى أو التخصص</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  placeholder="مثال: مطور برمجيات، كاتب، طالب..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">الشعار الشخصي أو الأثر المستهدف</label>
                <input
                  type="text"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  placeholder="شعارك أو حكمتك المفضلة"
                />
              </div>
            </div>
          </div>

          {/* Section: LIFE AREAS MANAGEMENT HUB (Dynamic Multi-User) */}
          <LifeAreasManager
            initialAreas={lifeAreas}
            onToast={showToast}
          />

          {/* Section: Location & Timezone Settings */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-zinc-100">إعدادات الموقع الجغرافي والمنطقة الزمنية</h3>
              </div>
              <span className="text-xs text-zinc-400">تُستخدم لتحديد أوقات الصلوات والتقويم</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">الدولة</label>
                <select
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="المملكة العربية السعودية">المملكة العربية السعودية</option>
                  <option value="جمهورية مصر العربية">جمهورية مصر العربية</option>
                  <option value="الإمارات العربية المتحدة">الإمارات العربية المتحدة</option>
                  <option value="الأردن">المملكة الأردنية الهاشمية</option>
                  <option value="قطر">دولة قطر</option>
                  <option value="الكويت">دولة الكويت</option>
                  <option value="تركيا">الجمهورية التركية</option>
                  <option value="المغرب">المملكة المغربية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المدينة الرئيسية</label>
                <select
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="الرياض">الرياض</option>
                  <option value="مكة المكرمة">مكة المكرمة</option>
                  <option value="المدينة المنورة">المدينة المنورة</option>
                  <option value="جدة">جدة</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="دبي">دبي</option>
                  <option value="أبوظبي">أبوظبي</option>
                  <option value="عمان">عمان</option>
                  <option value="الدوحة">الدوحة</option>
                  <option value="إسطنبول">إسطنبول</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">المنطقة الزمنية (Timezone)</label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 font-mono">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <select
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="bg-transparent border-none text-zinc-200 focus:outline-none text-xs w-full cursor-pointer"
                  >
                    <option value="Asia/Riyadh" className="bg-zinc-900">Asia/Riyadh (الرياض GMT+3)</option>
                    <option value="Africa/Cairo" className="bg-zinc-900">Africa/Cairo (القاهرة GMT+2)</option>
                    <option value="Asia/Dubai" className="bg-zinc-900">Asia/Dubai (دبي GMT+4)</option>
                    <option value="Asia/Amman" className="bg-zinc-900">Asia/Amman (عمان GMT+3)</option>
                    <option value="Asia/Kuwait" className="bg-zinc-900">Asia/Kuwait (الكويت GMT+3)</option>
                    <option value="Asia/Qatar" className="bg-zinc-900">Asia/Qatar (الدوحة GMT+3)</option>
                    <option value="Africa/Casablanca" className="bg-zinc-900">Africa/Casablanca (الدار البيضاء GMT+1)</option>
                    <option value="UTC" className="bg-zinc-900">UTC (توقيت غرينتش)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">بداية الأسبوع في التقويم</label>
                <select
                  value={profile.weekStartDay}
                  onChange={(e) => setProfile({ ...profile, weekStartDay: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value={6}>السبت (المعتمد في العالم العربي والإسلامي)</option>
                  <option value={0}>الأحد (التقويم المالي والدولي)</option>
                  <option value={1}>الاثنين (المعيار الدولي ISO 8601)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Configurable Prayer Schedule & Method */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-zinc-100">جدول ومواقيت الصلاة المعتمدة</h3>
                  <p className="text-xs text-zinc-400">المواقيت المحسوبة حالياً لليوم مع إمكانية التعديل اليدوي الدقيق</p>
                </div>
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

            {/* Quick Preview Table for 5 Prayers */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { 
                  key: "fajr", 
                  name: "الفجر", 
                  time: prayerSchedule?.fajr?.scheduledTime || (typeof prayerSchedule?.fajr === "string" ? prayerSchedule.fajr : "04:52")
                },
                { 
                  key: "dhuhr", 
                  name: "الظهر", 
                  time: prayerSchedule?.dhuhr?.scheduledTime || (typeof prayerSchedule?.dhuhr === "string" ? prayerSchedule.dhuhr : "11:48")
                },
                { 
                  key: "asr", 
                  name: "العصر", 
                  time: prayerSchedule?.asr?.scheduledTime || (typeof prayerSchedule?.asr === "string" ? prayerSchedule.asr : "14:52")
                },
                { 
                  key: "maghrib", 
                  name: "المغرب", 
                  time: prayerSchedule?.maghrib?.scheduledTime || (typeof prayerSchedule?.maghrib === "string" ? prayerSchedule.maghrib : "17:10")
                },
                { 
                  key: "isha", 
                  name: "العشاء", 
                  time: prayerSchedule?.isha?.scheduledTime || (typeof prayerSchedule?.isha === "string" ? prayerSchedule.isha : "18:28")
                },
              ].map((p) => (
                <div key={p.key} className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <span className="text-xs text-zinc-400 block mb-1">{p.name}</span>
                  <span className="text-base font-black font-mono text-amber-300">{p.time}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">الهيئة الحسابية الفلكية</label>
                <select
                  value={profile.prayerCalc}
                  onChange={(e) => setProfile({ ...profile, prayerCalc: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200"
                >
                  <option value="أم القرى - مكة المكرمة">أم القرى - مكة المكرمة (السعودية والخليج)</option>
                  <option value="الهيئة المصرية العامة للمساحة">الهيئة المصرية العامة للمساحة (مصر وأفريقيا)</option>
                  <option value="رابطة العالم الإسلامي">رابطة العالم الإسلامي</option>
                  <option value="جامعة العلوم الإسلامية بكراتشي">جامعة العلوم الإسلامية بكراتشي</option>
                  <option value="الاتحاد الإسلامي بأمريكا الشمالية ISNA">الاتحاد الإسلامي بأمريكا الشمالية (ISNA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">طريقة حساب وقت صلاة العصر</label>
                <select
                  value={profile.asrMethod}
                  onChange={(e) => setProfile({ ...profile, asrMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-200"
                >
                  <option value="standard">الجمهور (الشافعي، الحنبلي، المالكي - ظل مثله)</option>
                  <option value="hanafi">المذهب الحنفي (ظل مثليه)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1 col): System Preferences & Data Management */}
        <div className="space-y-8">
          
          {/* Preferences Box */}
          <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-800">
              <Sliders className="w-5 h-5 text-violet-400" />
              <h3 className="text-base font-bold text-zinc-100">تفضيلات الواجهة والتنبيهات</h3>
            </div>

            {/* Accent Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">لون النمط الأساسي (Theme Accent)</label>
              <div className="grid grid-cols-2 gap-2">
                {themeOptions.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      setProfile({ ...profile, themeAccent: th.id });
                      showToast(`تم تعيين المظهر إلى ${th.label}`, "info");
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      profile.themeAccent === th.id
                        ? "bg-zinc-800 text-white border-zinc-600 shadow-md"
                        : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${th.bg}`} />
                    <span className="truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Density Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">كثافة عرض المحتوى</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, density: "comfortable" })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                    profile.density === "comfortable"
                      ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  مريح (Comfortable)
                </button>
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, density: "compact" })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                    profile.density === "compact"
                      ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  مدمج (Compact)
                </button>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-zinc-200">التذكيرات اليومية الذكية</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.reminders}
                  onChange={(e) => setProfile({ ...profile, reminders: e.target.checked })}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-zinc-200">المؤثرات الصوتية عند الإنجاز</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.soundEffects}
                  onChange={(e) => setProfile({ ...profile, soundEffects: e.target.checked })}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-zinc-200">عرض الحكمة اليومية في اليوميات</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.dailyQuote}
                  onChange={(e) => setProfile({ ...profile, dailyQuote: e.target.checked })}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Data Export & Reset */}
          <div className="p-6 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">السيادة على البيانات</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {sessionData?.user ? "سحابي ومحلي" : "محلي في المتصفح"}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              تُحفظ سجلاتك وبياناتك تحت سيطرتك الكاملة. يمكنك تحميل نسخة احتياطية كاملة (JSON) لمجالاتك وعاداتك في أي لحظة.
            </p>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 text-xs font-bold border border-zinc-700 transition-all cursor-pointer shadow-md hover:border-cyan-500/40"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>تصدير نسخة احتياطية كاملة (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-xs font-bold border border-rose-800/30 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>مسح البيانات وإعادة الضبط الافتراضي</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal for Resetting Local Data */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setResetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0f111a] border border-rose-500/30 p-6 sm:p-7 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">تأكيد مسح كافة البيانات المحلية</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  هذا الإجراء سيقوم بحذف كافة السجلات المخزنة في المتصفح بما في ذلك جلسات العمل العميق، العادات، والمصاريف واليوميات. لن تتمكن من التراجع عن هذا الإجراء إلا إذا كنت قد حمّلت نسخة JSON احتياطية مسبقاً.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  handleConfirmReset();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                تأكيد المسح وإعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
