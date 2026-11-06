// Mock data and state definitions for Athar Life Tracking Platform

export const INITIAL_HABITS = [
  {
    slug: "prayer",
    name: "الصلوات الخمس والسنن",
    shortName: "الصلاة",
    category: "spiritual",
    categoryLabel: "روحانية وإيمانية",
    type: "prayer",
    iconName: "Flame",
    color: "emerald",
    accentColor: "#10b981",
    tagline: "عماد الدين وبوصلة اليوم وبركة الوقت",
    streak: 42,
    longestStreak: 84,
    monthlyRate: 98,
    unit: "فروض",
    targetValue: 5,
    todayValue: 5,
    isCompletedToday: true,
    todayDetails: [
      { id: "fajr", name: "الفجر", time: "04:52", done: true, inJamaah: true, sunnah: true },
      { id: "dhuhr", name: "الظهر", time: "11:48", done: true, inJamaah: true, sunnah: true },
      { id: "asr", name: "العصر", time: "14:52", done: true, inJamaah: true, sunnah: false },
      { id: "maghrib", name: "المغرب", time: "17:10", done: true, inJamaah: true, sunnah: true },
      { id: "isha", name: "العشاء", time: "18:28", done: true, inJamaah: false, sunnah: true },
    ],
    history: [
      { date: "2026-11-05", value: "5/5", score: 100, note: "جميع الفروض في وقتها وسنن الرواتب كاملة بفضل الله" },
      { date: "2026-11-04", value: "5/5", score: 100, note: "حضور تكبيرة الإحرام في الفجر والظهر" },
      { date: "2026-11-03", value: "5/5", score: 95, note: "العصر منفرداً لانشغال طارئ" },
      { date: "2026-11-02", value: "5/5", score: 100, note: "قيام ركعتين قبل الفجر" },
      { date: "2026-11-01", value: "5/5", score: 100, note: "بداية شهر مباركة" },
      { date: "2026-10-31", value: "4/5", score: 80, note: "فاتتني جماعة العشاء" },
      { date: "2026-10-30", value: "5/5", score: 100, note: "يوم الجمعة وقراءة الكهف" },
    ],
    chartData: [
      { day: "السبت", val: 100 },
      { day: "الأحد", val: 100 },
      { day: "الاثنين", val: 100 },
      { day: "الثلاثاء", val: 95 },
      { day: "الأربعاء", val: 100 },
      { day: "الخميس", val: 100 },
      { day: "اليوم", val: 100 },
    ],
    totalLogged: "492 فرض هذا العام",
    settings: {
      reminders: true,
      calcMethod: "أم القرى - مكة المكرمة",
      trackSunnah: true,
      trackJamaah: true,
    }
  },
  {
    slug: "gym",
    name: "تمرين الحديد والقوة",
    shortName: "الجيم",
    category: "health",
    categoryLabel: "صحة ولياقة",
    type: "sets_reps",
    iconName: "Dumbbell",
    color: "orange",
    accentColor: "#f97316",
    tagline: "بناء البنية الجسدية والقوة الوظيفية",
    streak: 12,
    longestStreak: 26,
    monthlyRate: 88,
    unit: "تمرين",
    targetValue: "جلسة دفع (Push Day)",
    todayValue: "85%",
    isCompletedToday: true,
    routineToday: "دفع (Push Day) - صدر وأكتاف وترايسبس",
    exercises: [
      { name: "Bench Press (بار مستوي)", sets: "4 جولات × 8-10 عدات (85 كجم)" },
      { name: "Incline Dumbbell Press (تجميع علوي)", sets: "3 جولات × 10 عدات (28 كجم)" },
      { name: "Overhead Military Press", sets: "3 جولات × 8 عدات (50 كجم)" },
      { name: "Cable Lateral Raises", sets: "4 جولات × 15 عدة" },
      { name: "Dips / Triceps Pushdown", sets: "3 جولات × 12 عدة" },
    ],
    history: [
      { date: "2026-11-05", value: "Push Day", score: 90, note: "كسرت رقم شخصي في البنش برس 85 كجم × 9 عدات" },
      { date: "2026-11-04", value: "Pull Day", score: 85, note: "تركيز على عضلات الظهر العريضة والعقلة" },
      { date: "2026-11-02", value: "Leg Day", score: 95, note: "سكوات عميق 110 كجم مع استشفاء ممتاز" },
      { date: "2026-10-31", value: "Push Day", score: 80, note: "جلسة مسائية متوسطة الكثافة" },
    ],
    chartData: [
      { day: "السبت", val: 80 },
      { day: "الأحد", val: 0 },
      { day: "الاثنين", val: 95 },
      { day: "الثلاثاء", val: 0 },
      { day: "الأربعاء", val: 85 },
      { day: "الخميس", val: 90 },
      { day: "اليوم", val: 90 },
    ],
    totalLogged: "78 جلسة تمرين",
    settings: {
      split: "Push / Pull / Legs",
      weeklyTargetDays: 5,
      restTimerSec: 90,
    }
  },
  {
    slug: "running",
    name: "الجري وتحمل القلب (Cardio)",
    shortName: "الجري",
    category: "health",
    categoryLabel: "صحة ولياقة",
    type: "distance_duration",
    iconName: "Footprints",
    color: "lime",
    accentColor: "#84cc16",
    tagline: "تحسين لياقة الـ VO2 Max وتصفية الذهن",
    streak: 8,
    longestStreak: 21,
    monthlyRate: 85,
    unit: "كم",
    targetValue: "5.0 كم",
    todayValue: "5.2 كم",
    isCompletedToday: true,
    runStatsToday: {
      distance: "5.20 كم",
      duration: "27:40 دقيقة",
      pace: "5'19\" /كم",
      calories: "385 سعرة",
      heartRateAvg: "152 نبضة/د",
    },
    history: [
      { date: "2026-11-05", value: "5.2 كم", score: 100, note: "جري صباحي مع شروق الشمس، رتم ثابت مريح" },
      { date: "2026-11-03", value: "7.0 كم", score: 100, note: "تمرين مسافة طويلة في حديقة الحي" },
      { date: "2026-11-01", value: "4.5 كم", score: 90, note: "تسخين وسبرنتات قصيرة" },
      { date: "2026-10-29", value: "5.0 كم", score: 100, note: "تحسن في وتيرة التنفس" },
    ],
    chartData: [
      { day: "السبت", val: 5.0 },
      { day: "الأحد", val: 0 },
      { day: "الاثنين", val: 4.5 },
      { day: "الثلاثاء", val: 0 },
      { day: "الأربعاء", val: 7.0 },
      { day: "الخميس", val: 0 },
      { day: "اليوم", val: 5.2 },
    ],
    totalLogged: "246 كم إجمالي المسافة",
    settings: {
      weeklyDistanceGoalKm: 20,
      targetPaceMin: "5:30",
    }
  },
  {
    slug: "programming",
    name: "البرمجة والعمل العميق (Deep Work)",
    shortName: "البرمجة",
    category: "intellect",
    categoryLabel: "تطوير ومهارات",
    type: "duration_timer",
    iconName: "Code2",
    color: "cyan",
    accentColor: "#06b6d4",
    tagline: "بناء المنتجات وحل المشكلات الهندسية دون مشتتات",
    streak: 28,
    longestStreak: 45,
    monthlyRate: 92,
    unit: "ساعات",
    targetValue: "3.5 ساعات",
    todayValue: "4.2 ساعات",
    isCompletedToday: true,
    activeSession: {
      inProgress: false,
      projectName: "منصة أثـر v2 (Next.js)",
      currentSprintMins: 45,
    },
    history: [
      { date: "2026-11-05", value: "4.2 ساعات", score: 100, note: "إتمام معمارية واجهة اليوميات ونظام التتبع المتخصص" },
      { date: "2026-11-04", value: "3.5 ساعات", score: 100, note: "برمجة مكونات البطاقات التفاعلية وإحصائيات العادات" },
      { date: "2026-11-03", value: "4.0 ساعات", score: 100, note: "تصميم واجهة لوحة التحكم وهيكل البيانات" },
      { date: "2026-11-02", value: "2.5 ساعات", score: 80, note: "حل أخطاء في الـ SSR والـ hydration" },
      { date: "2026-11-01", value: "3.5 ساعات", score: 100, note: "تطوير مسار التقويم الشهري" },
    ],
    chartData: [
      { day: "السبت", val: 3.5 },
      { day: "الأحد", val: 4.0 },
      { day: "الاثنين", val: 2.5 },
      { day: "الثلاثاء", val: 3.5 },
      { day: "الأربعاء", val: 4.0 },
      { day: "الخميس", val: 3.5 },
      { day: "اليوم", val: 4.2 },
    ],
    totalLogged: "318 ساعة عمل عميق",
    settings: {
      pomodoroWorkMin: 50,
      pomodoroBreakMin: 10,
      dailyGoalHours: 3.5,
    }
  },
  {
    slug: "reading",
    name: "القراءة والاطلاع المعرفي",
    shortName: "القراءة",
    category: "intellect",
    categoryLabel: "تطوير ومهارات",
    type: "pages_counter",
    iconName: "BookMarked",
    color: "violet",
    accentColor: "#8b5cf6",
    tagline: "تغذية العقل وتوسيع المدارك في العلوم والأفكار",
    streak: 19,
    longestStreak: 30,
    monthlyRate: 90,
    unit: "صفحة",
    targetValue: "30 صفحة",
    todayValue: "35 صفحة",
    isCompletedToday: true,
    currentBook: {
      title: "العادات الذرية (Atomic Habits)",
      author: "جيمس كلير",
      currentPage: 168,
      totalPages: 320,
    },
    history: [
      { date: "2026-11-05", value: "35 صفحة", score: 100, note: "فصل: كيف تجعل العادة جذابة وسهلة التنفيذ" },
      { date: "2026-11-04", value: "30 صفحة", score: 100, note: "أهمية البيئة المحيطة في توجيه السلوكيات التلقائية" },
      { date: "2026-11-03", value: "32 صفحة", score: 100, note: "قاعدة الدقيقتين لبدء أي عادة جديدة" },
      { date: "2026-11-02", value: "25 صفحة", score: 85, note: "قراءة ليلية هادئة قبل النوم" },
    ],
    chartData: [
      { day: "السبت", val: 30 },
      { day: "الأحد", val: 25 },
      { day: "الاثنين", val: 35 },
      { day: "الثلاثاء", val: 30 },
      { day: "الأربعاء", val: 32 },
      { day: "الخميس", val: 30 },
      { day: "اليوم", val: 35 },
    ],
    totalLogged: "14 كتاباً مقروءاً",
    settings: {
      dailyPageTarget: 30,
      preferredTime: "بعد صلاة الفجر أو قبل النوم",
    }
  },
  {
    slug: "social-media",
    name: "ترشيد السوشيال ميديا والتشتت",
    shortName: "السوشيال ميديا",
    category: "discipline",
    categoryLabel: "انضباط وسلوك",
    type: "limit_avoidance",
    iconName: "Smartphone",
    color: "pink",
    accentColor: "#ec4899",
    tagline: "حماية الانتباه والتركيز من خوارزميات الاستهلاك السلبي",
    streak: 9,
    longestStreak: 24,
    monthlyRate: 80,
    unit: "دقيقة كحد أقصى",
    targetValue: "أقل من 60 دقيقة",
    todayValue: "42 دقيقة مستهلكة",
    isCompletedToday: true,
    screenTimeBreakdown: [
      { app: "X (تويتر)", mins: 18, limit: 25 },
      { app: "يوتيوب المعرفي", mins: 16, limit: 30 },
      { app: "إنستغرام", mins: 8, limit: 15 },
      { app: "تيك توك", mins: 0, limit: 0, note: "محذوف تماماً" },
    ],
    history: [
      { date: "2026-11-05", value: "42 دقيقة", score: 100, note: "أقل من الحد الأقصى بـ 18 دقيقة، نجاح ممتاز" },
      { date: "2026-11-04", value: "55 دقيقة", score: 90, note: "تصفح سريع للأخبار التقنية فقط" },
      { date: "2026-11-03", value: "48 دقيقة", score: 100, note: "إيقاف الإشعارات أثناء جلسات العمل" },
      { date: "2026-11-02", value: "72 دقيقة", score: 60, note: "تجاوز طفيف في المساء بسبب متابعة حدث بث مباشر" },
    ],
    chartData: [
      { day: "السبت", val: 50 },
      { day: "الأحد", val: 45 },
      { day: "الاثنين", val: 72 },
      { day: "الثلاثاء", val: 48 },
      { day: "الأربعاء", val: 55 },
      { day: "الخميس", val: 60 },
      { day: "اليوم", val: 42 },
    ],
    totalLogged: "توفير 142 ساعة تشتت هذا العام",
    settings: {
      dailyLimitMins: 60,
      downtimeStart: "22:00",
      downtimeEnd: "08:00",
    }
  },
  {
    slug: "smoking",
    name: "التعافي التام من التدخين",
    shortName: "التدخين",
    category: "discipline",
    categoryLabel: "انضباط وسلوك",
    type: "abstinence",
    iconName: "CigaretteOff",
    color: "rose",
    accentColor: "#f43f5e",
    tagline: "رئة نقية، صحة قلب مثالية، وحرية واستقلال عن الإدمان",
    streak: 90,
    longestStreak: 90,
    monthlyRate: 100,
    unit: "يوم تعافي",
    targetValue: "0 سجائر (صفر)",
    todayValue: "0 سجائر",
    isCompletedToday: true,
    sobrietyMetrics: {
      daysFree: 90,
      cigarettesAvoided: 1800,
      moneySavedSAR: 2700,
      cravingsResistedToday: 2,
      lungCapacityImprovement: "30%",
    },
    history: [
      { date: "2026-11-05", value: "0 سجائر", score: 100, note: "إكمال 90 يوماً من النقاء! شعور بالفخر العظيم والتنفس العميق" },
      { date: "2026-11-04", value: "0 سجائر", score: 100, note: "شعور برغبة طفيفة بعد القهوة، استبدلتها بالمشي وشرب الماء" },
      { date: "2026-11-03", value: "0 سجائر", score: 100, note: "يوم هادئ ومريح دون أي ضغوط" },
      { date: "2026-11-02", value: "0 سجائر", score: 100, note: "مقاومة رغبة التدخين مع الزملاء" },
    ],
    chartData: [
      { day: "السبت", val: 0 },
      { day: "الأحد", val: 0 },
      { day: "الاثنين", val: 0 },
      { day: "الثلاثاء", val: 0 },
      { day: "الأربعاء", val: 0 },
      { day: "الخميس", val: 0 },
      { day: "اليوم", val: 0 },
    ],
    totalLogged: "90 يوماً متواصلاً بدون أي انتكاسة",
    settings: {
      quitDate: "2026-08-07",
      cigarettesPerPack: 20,
      packCostSAR: 30,
      formerDailyPacks: 1,
    }
  },
  {
    slug: "expenses",
    name: "إدارة المصاريف والميزانية",
    shortName: "المصاريف",
    category: "discipline",
    categoryLabel: "انضباط وسلوك",
    type: "currency_budget",
    iconName: "Wallet",
    color: "amber",
    accentColor: "#f59e0b",
    tagline: "وعي مالي كامل واستثمار في الأولويات والأصول",
    streak: 16,
    longestStreak: 40,
    monthlyRate: 94,
    unit: "ريال",
    targetValue: "180 ر.س حد يومي",
    todayValue: "95 ر.س مسجلة",
    isCompletedToday: true,
    budgetToday: {
      dailyLimit: 180,
      spentToday: 95,
      remaining: 85,
      monthlySpent: 3420,
      monthlyBudget: 5500,
    },
    todayTransactions: [
      { id: 1, title: "قهوة الصباح المختصة وتمرة", amount: 18, category: "طعام وقهوة", time: "07:30" },
      { id: 2, title: "غداء صحي بروتيني", amount: 45, category: "طعام وقهوة", time: "14:15" },
      { id: 3, title: "بنزين السيارة", amount: 32, category: "مواصلات", time: "18:00" },
    ],
    history: [
      { date: "2026-11-05", value: "95 ر.س", score: 100, note: "ضمن الميزانية تماماً، توفير 85 ريالاً" },
      { date: "2026-11-04", value: "140 ر.س", score: 100, note: "شراء مكمل غذائي بروتيني" },
      { date: "2026-11-03", value: "85 ر.س", score: 100, note: "يوم اقتصادي ممتاز" },
      { date: "2026-11-02", value: "210 ر.س", score: 80, note: "تجاوز بسيط بسبب فاتورة صيانة دورية" },
    ],
    chartData: [
      { day: "السبت", val: 120 },
      { day: "الأحد", val: 85 },
      { day: "الاثنين", val: 210 },
      { day: "الثلاثاء", val: 85 },
      { day: "الأربعاء", val: 140 },
      { day: "الخميس", val: 110 },
      { day: "اليوم", val: 95 },
    ],
    totalLogged: "تتبع مالي متواصل لـ 11 شهراً",
    settings: {
      currency: "ر.س",
      monthlyBudget: 5500,
      dailyTargetLimit: 180,
    }
  },
  {
    slug: "sleep",
    name: "النوم المبكر واستيقاظ الفجر",
    shortName: "النوم المبكر",
    category: "health",
    categoryLabel: "صحة ولياقة",
    type: "sleep_schedule",
    iconName: "Moon",
    color: "sky",
    accentColor: "#0284c7",
    tagline: "الاستيقاظ قبل الفجر بحيوية وذهن صافٍ",
    streak: 6,
    longestStreak: 18,
    monthlyRate: 82,
    unit: "ساعات نوم",
    targetValue: "7.5 ساعات",
    todayValue: "7.0 ساعات",
    isCompletedToday: true,
    sleepData: {
      bedTime: "22:15",
      wakeTime: "05:15",
      deepSleepHrs: "2h 10m",
      remSleepHrs: "1h 45m",
      efficiencyScore: 89,
    },
    history: [
      { date: "2026-11-05", value: "7.0 ساعات", score: 92, note: "نوم هادئ واستيقاظ تلقائي بنشاط قبل المنبه" },
      { date: "2026-11-04", value: "6.8 ساعات", score: 85, note: "تأخرت 20 دقيقة في القراءة قبل النوم" },
      { date: "2026-11-03", value: "7.2 ساعات", score: 95, note: "نوم عميق بعد تمرين السكوات" },
    ],
    chartData: [
      { day: "السبت", val: 7.5 },
      { day: "الأحد", val: 6.5 },
      { day: "الاثنين", val: 7.2 },
      { day: "الثلاثاء", val: 7.0 },
      { day: "الأربعاء", val: 6.8 },
      { day: "الخميس", val: 7.0 },
      { day: "اليوم", val: 7.0 },
    ],
    totalLogged: "متوسط 7.1 ساعة أسبوعياً",
    settings: {
      targetBedtime: "22:00",
      targetWakeTime: "05:00",
      idealHours: 7.5,
    }
  },
  {
    slug: "nutrition",
    name: "التغذية الصحية وشرب الماء",
    shortName: "التغذية",
    category: "health",
    categoryLabel: "صحة ولياقة",
    type: "macros_calories",
    iconName: "Sparkles",
    color: "teal",
    accentColor: "#14b8a6",
    tagline: "إمداد الجسم بالطاقة النظيفة والبروتين والترطيب الكافي",
    streak: 15,
    longestStreak: 33,
    monthlyRate: 91,
    unit: "سعرات / لتر",
    targetValue: "2400 سعرة / 3.5 لتر",
    todayValue: "2150 سعرة / 3.0 لتر",
    isCompletedToday: true,
    nutritionData: {
      caloriesTarget: 2400,
      caloriesConsumed: 2150,
      proteinTargetG: 160,
      proteinConsumedG: 148,
      carbsTargetG: 260,
      carbsConsumedG: 220,
      fatTargetG: 65,
      fatConsumedG: 55,
      waterTargetL: 3.5,
      waterConsumedL: 3.0,
    },
    history: [
      { date: "2026-11-05", value: "2150 سعرة", score: 95, note: "148 جم بروتين + 3 لتر ماء" },
      { date: "2026-11-04", value: "2350 سعرة", score: 98, note: "تغذية متكاملة قبل وبعد التمرين" },
      { date: "2026-11-03", value: "2200 سعرة", score: 90, note: "شرب 3.5 لتر ماء بالكامل" },
    ],
    chartData: [
      { day: "السبت", val: 2300 },
      { day: "الأحد", val: 2400 },
      { day: "الاثنين", val: 2100 },
      { day: "الثلاثاء", val: 2250 },
      { day: "الأربعاء", val: 2350 },
      { day: "الخميس", val: 2200 },
      { day: "اليوم", val: 2150 },
    ],
    totalLogged: "متوسط 150 جم بروتين يومياً",
    settings: {
      targetCalories: 2400,
      targetProtein: 160,
      targetWaterLiters: 3.5,
    }
  }
];

// Rich Journal Database with chronological entries across dates
export const INITIAL_JOURNAL_DATABASE = {
  "2026-11-05": {
    date: "2026-11-05",
    hijriDate: "٢٥ جمادى الأولى ١٤٤٨ هـ",
    dayLabel: "الخميس",
    rating: 9.4,
    focusHours: 4.2,
    mood: "great",
    moodLabel: "منجز ومطمئن النفس",
    moodEmoji: "🔥",
    summary: "يوم استثنائي في الإنتاجية والصفاء الذهني. أتممت 90 يوماً في التعافي من التدخين، وحققت تقدماً هندسياً كبيراً في تطبيق أثر.",
    sections: {
      spiritual: [
        { id: "s1", time: "05:00", title: "صلاة الفجر جماعة في المسجد", note: "جلسة ذكر وقراءة سورة يس حتى الشروق، مع ركعتي الضحى.", verified: true },
        { id: "s2", time: "11:55", title: "صلاة الظهر وركعات السنة القبلية والبعدية", note: "حضور القلب وسكون بعد الصلاة.", verified: true },
        { id: "s3", time: "17:15", title: "صلاة المغرب وأذكار المساء", note: "قراءة ورد القرآن اليومي (حزب كامل).", verified: true },
      ],
      deepWork: [
        { id: "w1", time: "06:30 - 08:30", title: "جلسة العمل العميق الأولى (البرمجة)", note: "إتمام مكونات التتبع المتخصصة ومعمارية الـ State في تطبيق أثر v2 بدون أي مشتتات.", duration: "ساعتان", tag: "Frontend" },
        { id: "w2", time: "10:00 - 11:30", title: "جلسة العمل المعرفي الثانية", note: "مراجعة كود التوثيق وتنسيق تصاميم الهواتف الذكية.", duration: "ساعة ونصف", tag: "Design" },
        { id: "w3", time: "19:30 - 20:15", title: "القراءة التخصصية", note: "قراءة 35 صفحة من كتاب العادات الذرية وكتابة ملخص في الملاحظات.", duration: "45 دقيقة", tag: "Learning" },
      ],
      healthFitness: [
        { id: "h1", time: "05:45", title: "تمرين الجري الصباحي (Cardio)", note: "مسافة 5.2 كم بوتيرة 5'19\" مع طقس عليل.", metric: "5.2 كم" },
        { id: "h2", time: "16:00", title: "جلسة الجيم - تمرين الدفع (Push Day)", note: "بنش برس 85 كجم × 9 عدات، مع تركيز عالي على التحكم في النزول السلبي.", metric: "65 دقيقة" },
        { id: "h3", time: "طوال اليوم", title: "الترطيب وشرب الماء", note: "3.0 لتر ماء موزع على 6 قوارير زجاجية.", metric: "3.0 لتر" },
      ],
      expenses: [
        { id: "e1", time: "07:30", title: "قهوة الصباح المختصة V60", amount: 18, category: "طعام وقهوة" },
        { id: "e2", time: "14:15", title: "غداء دجاج مشوي مع أرز بني", amount: 45, category: "طعام وقهوة" },
        { id: "e3", time: "18:00", title: "بنزين السيارة", amount: 32, category: "مواصلات" },
      ],
      reflections: [
        { id: "r1", time: "21:30", title: "تأمل المساء وأثر اليوم", content: "بلوغ 90 يوماً بدون تدخين ليس مجرد رقم؛ إنه استرداد للسيطرة على النفس وحرية الإرادة. عندما تلتزم بالفجر وبناء العادات الصغيرة، يصبح اليوم كله مباركاً ومنظماً بصورة تلقائية." }
      ]
    }
  },
  "2026-11-04": {
    date: "2026-11-04",
    hijriDate: "٢٤ جمادى الأولى ١٤٤٨ هـ",
    dayLabel: "الأربعاء",
    rating: 8.8,
    focusHours: 3.5,
    mood: "focused",
    moodLabel: "تركيز عميق وعمل دؤوب",
    moodEmoji: "⚡",
    summary: "يوم تدريبي قوي في الجيم مع جلسة سحب (Pull Day) ممتازة و3.5 ساعات كود متواصلة.",
    sections: {
      spiritual: [
        { id: "s1", time: "04:55", title: "صلاة الفجر في المسجد", note: "حضور تكبيرة الإحرام والجلوس للأذكار.", verified: true },
        { id: "s2", time: "12:00", title: "صلاة الظهر وسنة الرواتب", note: "صلاة في مسجد الحي.", verified: true },
        { id: "s3", time: "18:30", title: "صلاة العشاء جماعة", note: "حضور درس علمي قصير بعد الصلاة.", verified: true },
      ],
      deepWork: [
        { id: "w1", time: "09:00 - 12:30", title: "تطوير لوحة البيانات في أثر", note: "بناء الرسوم البيانية المتفاعلة وتنسيق الحالات الخالية.", duration: "3.5 ساعات", tag: "Code" },
      ],
      healthFitness: [
        { id: "h1", time: "16:30", title: "جلسة الجيم - سحب (Pull Day)", note: "عقلة بأوزان إضافية + ديدليفت وسحب كابل.", metric: "75 دقيقة" },
      ],
      expenses: [
        { id: "e1", time: "12:45", title: "مكمل غذائي بروتيني وي أيزوليت", amount: 140, category: "صحة ولياقة" },
        { id: "e2", time: "15:00", title: "وجبة خفيفة وموز", amount: 15, category: "طعام" },
      ],
      reflections: [
        { id: "r1", time: "22:00", title: "خاطرة حول الانضباط", content: "الانضباط هو الجسر بين ما تريده اليوم وما تريده في نهاية حياتك. لا تنتظر الشغف ليحركك، بل ابدأ الحركة ليتبعك الشغف." }
      ]
    }
  },
  "2026-11-03": {
    date: "2026-11-03",
    hijriDate: "٢٣ جمادى الأولى ١٤٤٨ هـ",
    dayLabel: "الثلاثاء",
    rating: 8.5,
    focusHours: 4.0,
    mood: "peaceful",
    moodLabel: "هادئ ومتزن ومستقر",
    moodEmoji: "🌿",
    summary: "جري 7 كم لمسافة طويلة مع طقس رائع، والتزام كامل بالصلوات والميزانية المالية.",
    sections: {
      spiritual: [
        { id: "s1", time: "05:00", title: "صلاة الفجر في المسجد", note: "أذكار الصباح في هدوء السحر.", verified: true },
        { id: "s2", time: "15:00", title: "صلاة العصر", note: "صلاة في مصلى المكتب.", verified: true },
      ],
      deepWork: [
        { id: "w1", time: "08:30 - 12:30", title: "جلسة العمل العميق الصباحية", note: "كتابة منطق إدارة المهام والمزامنة بدون خادم.", duration: "4.0 ساعات", tag: "Engineering" },
      ],
      healthFitness: [
        { id: "h1", time: "17:00", title: "جري المسافات الطويلة", note: "7 كم متواصلة بمعدل نبض 148.", metric: "7.0 كم" },
      ],
      expenses: [
        { id: "e1", time: "13:30", title: "غداء عمل صحي", amount: 48, category: "طعام" },
        { id: "e2", time: "18:30", title: "مستلزمات منزلية", amount: 37, category: "مستلزمات" },
      ],
      reflections: [
        { id: "r1", time: "21:45", title: "راحة البال في القناعة", content: "تخفيف الالتزامات السطحية يعطي عمقاً استثنائياً لكل ما تفعله." }
      ]
    }
  }
};

// Gym Routines and Workout Exercises
export const GYM_WORKOUTS_DATA = {
  currentSplit: "Push / Pull / Legs",
  lastWorkout: "Push Day (دفع)",
  stats: {
    totalWorkoutsThisMonth: 16,
    benchMaxKg: 105,
    squatMaxKg: 140,
    deadliftMaxKg: 165,
    weeklyConsistency: 92,
  },
  todayWorkoutPlan: {
    title: "تمارين الدفع - الصدر والأكتاف والترايسبس (Push Day)",
    estimatedDuration: "60-70 دقيقة",
    exercises: [
      {
        id: "ex1",
        name: "Barbell Bench Press (ضغط صدر بار مستوي)",
        targetMuscles: "الصدر الأوسط والترايسبس",
        sets: [
          { set: 1, weight: 60, reps: 12, completed: true, rpe: 7 },
          { set: 2, weight: 75, reps: 10, completed: true, rpe: 8 },
          { set: 3, weight: 85, reps: 9, completed: true, rpe: 9, isPR: true },
          { set: 4, weight: 85, reps: 7, completed: true, rpe: 9.5 },
        ]
      },
      {
        id: "ex2",
        name: "Incline Dumbbell Press (تجميع دنبل علوي)",
        targetMuscles: "الصدر العلوي والأكتاف الأمامية",
        sets: [
          { set: 1, weight: 24, reps: 10, completed: true, rpe: 8 },
          { set: 2, weight: 28, reps: 10, completed: true, rpe: 8.5 },
          { set: 3, weight: 28, reps: 8, completed: true, rpe: 9 },
        ]
      },
      {
        id: "ex3",
        name: "Standing Overhead Military Press (ضغط كتف بالبار)",
        targetMuscles: "عضلة الكتف الأمامية والجانبية",
        sets: [
          { set: 1, weight: 40, reps: 10, completed: true, rpe: 7.5 },
          { set: 2, weight: 50, reps: 8, completed: true, rpe: 8.5 },
          { set: 3, weight: 50, reps: 8, completed: true, rpe: 9 },
        ]
      },
      {
        id: "ex4",
        name: "Cable Lateral Raises (رفرفة كتف جانبي كابل)",
        targetMuscles: "الكتف الجانبي (عرض الكتف)",
        sets: [
          { set: 1, weight: 7.5, reps: 15, completed: true, rpe: 8 },
          { set: 2, weight: 10, reps: 12, completed: true, rpe: 8.5 },
          { set: 3, weight: 10, reps: 12, completed: true, rpe: 9 },
        ]
      },
      {
        id: "ex5",
        name: "Rope Triceps Pushdown (سحب حبل ترايسبس)",
        targetMuscles: "الرأس الخارجي للترايسبس",
        sets: [
          { set: 1, weight: 22.5, reps: 15, completed: true, rpe: 8 },
          { set: 2, weight: 25, reps: 12, completed: true, rpe: 8.5 },
          { set: 3, weight: 27.5, reps: 10, completed: true, rpe: 9 },
        ]
      }
    ]
  },
  muscleRecovery: [
    { muscle: "الصدر (Chest)", recoveryPercent: 35, status: "مجهد (تمرين اليوم)", color: "text-rose-400 bg-rose-500/10" },
    { muscle: "الأكتاف (Shoulders)", recoveryPercent: 40, status: "مجهد (تمرين اليوم)", color: "text-rose-400 bg-rose-500/10" },
    { muscle: "الترايسبس (Triceps)", recoveryPercent: 45, status: "مجهد (تمرين اليوم)", color: "text-amber-400 bg-amber-500/10" },
    { muscle: "الظهر (Back & Lats)", recoveryPercent: 85, status: "مستشفى تماماً", color: "text-emerald-400 bg-emerald-500/10" },
    { muscle: "البايسبس (Biceps)", recoveryPercent: 90, status: "مستشفى تماماً", color: "text-emerald-400 bg-emerald-500/10" },
    { muscle: "الأرجل (Legs & Quads)", recoveryPercent: 95, status: "جاهز لتمرين الغد", color: "text-emerald-400 bg-emerald-500/10" },
  ]
};

// Nutrition Database
export const NUTRITION_DATA = {
  dailyTargets: {
    calories: 2400,
    protein: 160,
    carbs: 260,
    fat: 65,
    waterLiters: 3.5,
  },
  todayLogged: {
    calories: 2150,
    protein: 148,
    carbs: 220,
    fat: 55,
    waterLiters: 3.0,
  },
  meals: [
    {
      id: "m1",
      name: "إفطار الأبطال الصباحي",
      time: "07:00",
      calories: 550,
      protein: 36,
      carbs: 60,
      fat: 18,
      items: ["4 بيضات بلدي (2 كاملة + 2 بياض)", "شوفان كامل الحبة مع حليب لوز وقرفة", "موزة طازجة وملعقة عسل نحل"]
    },
    {
      id: "m2",
      name: "غداء عالي البروتين بعد العمل",
      time: "13:30",
      calories: 780,
      protein: 58,
      carbs: 85,
      fat: 22,
      items: ["250 جم صدر دجاج متبل مشوي", "كوب أرز بسمتي بني", "صحن سلطة خضراء غنية بزيت الزيتون"]
    },
    {
      id: "m3",
      name: "وجبة ما قبل التمرين (Pre-Workout)",
      time: "15:15",
      calories: 280,
      protein: 14,
      carbs: 45,
      fat: 4,
      items: ["شريحة خبز حبوب كاملة مع زبدة فول سوداني", "قهوة سوداء سادة (إسبريسو)"]
    },
    {
      id: "m4",
      name: "عشاء الاستشفاء الليلي",
      time: "20:00",
      calories: 540,
      protein: 40,
      carbs: 30,
      fat: 11,
      items: ["علبة تونة بالماء مع ليمون وكمون", "جبن قريش طبيعي بزيت حبة البركة", "خيار وطماطم وخس"]
    }
  ]
};

// Expenses Database
export const EXPENSES_DATA = {
  monthlyBudget: 5500,
  monthlySpent: 3420,
  dailyAverageSpent: 114,
  todaySpent: 95,
  categories: [
    { name: "طعام ومطاعم", spent: 1420, budget: 1800, color: "#f97316", percent: 78 },
    { name: "صحة ومكملات وجيم", spent: 680, budget: 900, color: "#10b981", percent: 75 },
    { name: "مواصلات ووقود", spent: 480, budget: 700, color: "#06b6d4", percent: 68 },
    { name: "تطوير واشتراكات تقنية", spent: 390, budget: 500, color: "#8b5cf6", percent: 78 },
    { name: "فواتير ومستلزمات", spent: 450, budget: 600, color: "#eab308", percent: 75 },
  ],
  transactions: [
    { id: 101, title: "قهوة الصباح المختصة V60 وتمرة", amount: 18, category: "طعام ومطاعم", date: "2026-11-05", time: "07:30" },
    { id: 102, title: "وجبة غداء صحي بروتيني", amount: 45, category: "طعام ومطاعم", date: "2026-11-05", time: "14:15" },
    { id: 103, title: "تعبئة وقود بنزين", amount: 32, category: "مواصلات ووقود", date: "2026-11-05", time: "18:00" },
    { id: 104, title: "مكمل غذائي بروتيني وي أيزوليت", amount: 140, category: "صحة ومكملات وجيم", date: "2026-11-04", time: "12:45" },
    { id: 105, title: "اشتراك سحابي GitHub Copilot / Cursor", amount: 75, category: "تطوير واشتراكات تقنية", date: "2026-11-03", time: "11:00" },
    { id: 106, title: "مشتريات بقالة أسبوعية صحية", amount: 210, category: "طعام ومطاعم", date: "2026-11-02", time: "19:00" },
  ]
};

// Life Analytics Correlations and Metrics
export const LIFE_ANALYTICS_DATA = {
  overallLifeScore: 92,
  pillars: [
    { name: "الروحانية والعبادات", score: 98, status: "استثنائي", color: "emerald" },
    { name: "اللياقة والصحة الجسدية", score: 91, status: "ممتاز", color: "orange" },
    { name: "العمل العميق والإنتاجية", score: 89, status: "مرتفع جداً", color: "cyan" },
    { name: "الانضباط ومقاومة العادات", score: 95, status: "مثالي", color: "rose" },
    { name: "الوعي المالي والميزانية", score: 88, status: "منضبط", color: "amber" },
  ],
  correlations: [
    {
      title: "صلاة الفجر في المسجد ↔ ساعات العمل العميق",
      impact: "+42%",
      description: "في الأيام التي تحضر فيها الفجر جماعة وتبدأ باكراً، يزيد متوسط ساعات برمجتك المركزة بنسبة 42% مع انعدام التسويف.",
      positive: true,
    },
    {
      title: "جلسة تمرين الجيم قبل 4 عصراً ↔ جودة النوم الليلي",
      impact: "+35%",
      description: "التمرين في وقت مبكر من اليوم يرفع نسبة النوم العميق بمقدار ساعة إضافية مقارنة بالتمارين الليلية المتأخرة.",
      positive: true,
    },
    {
      title: "التعافي من التدخين ↔ استقرار سرعة الجري وضربات القلب",
      impact: "+28%",
      description: "بعد إتمام 90 يوماً من النقاء، تحسنت وتيرة الجري بمعدل 45 ثانية للكيلومتر مع انخفاض متوسط ضربات القلب بـ 12 نبضة/د.",
      positive: true,
    },
    {
      title: "إغلاق السوشيال ميديا بعد 9 مساءً ↔ سهولة الاستيقاظ",
      impact: "+50%",
      description: "الابتعاد عن شاشات الهاتف قبل النوم بساعة يقلل وقت الاستغراق في النوم إلى 8 دقائق فقط.",
      positive: true,
    }
  ],
  weeklyTimeDistribution: [
    { category: "عمل وبرمجة عميقة", hours: 26, percent: 35, color: "#06b6d4" },
    { category: "رياضة وجيم وجري", hours: 11, percent: 15, color: "#f97316" },
    { category: "عبادات وأذكار", hours: 9, percent: 12, color: "#10b981" },
    { category: "قراءة وتطوير ذاتي", hours: 6, percent: 8, color: "#8b5cf6" },
    { category: "نوم واستشفاء", hours: 50, percent: 67, color: "#0284c7" },
  ]
};

