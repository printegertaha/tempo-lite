"use client";

import Link from "next/link";
import { 
  Flame, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Timer, 
  CheckCircle2, 
  Clock, 
  Dumbbell, 
  BookMarked, 
  Wallet, 
  BarChart3, 
  Compass, 
  Layers,
  ChevronRight,
  Star
} from "lucide-react";

export default function LandingPage() {
  const pillars = [
    {
      title: "تحليلات مستوحاة من أسواق المال",
      desc: "رسوم بيانية حية، مؤشرات تقدم، كشف فترات الانتكاس والتعافي، ومؤشر مركب لأثرك اليومي بدون نقاط عشوائية خادعة.",
      icon: TrendingUp,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      tag: "ATHAR.INDEX",
    },
    {
      title: "مؤقت عمل عميق وبرمجة حقيقي",
      desc: "ليس مجرد خانة اختيار. مؤقت يعتمد على التوقيت الزمني الدقيق (Timestamps) لا يتأثر بإغلاق الصفحة، مع حوار تأكيد المدة وتدوين الملاحظات.",
      icon: Timer,
      accent: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      tag: "DEEP WORK",
    },
    {
      title: "مصفوفة الصلوات الخمس واليقظة الروحية",
      desc: "تتبع مواقيت الصلاة في المسجد أو البيت، تسجيل الحضور في الوقت المحدد أو أسباب التأخير، وتعديل الجدول الفلكي بدقة.",
      icon: Flame,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      tag: "5 PRAYERS",
    },
    {
      title: "دفتر اليوميات والخط الزمني",
      desc: "سجل متدفق يوثق كل إنجاز، وجبة، جلسة تدريب، وتحديث نفسي بترتيب زمني طبيعي مع تقويم شهري تفاعلي سريع.",
      icon: BookMarked,
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      tag: "DAILY CHRONICLE",
    },
    {
      title: "لياقة بدنية وحساب مسافات الجري",
      desc: "تتبع تمارين القوة بالمجموعات والأوزان، وسجل مسافات الركض مع حساب معدل السرعة (Pace min/km) التلقائي.",
      icon: Dumbbell,
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      tag: "FITNESS & RUNNING",
    },
    {
      title: "السيادة الكاملة والخصوصية المطلقة",
      desc: "بياناتك لا تغادر متصفحك أبداً. تخزين محلي 100% مع إمكانية التصدير الكامل كملف JSON بنقرة واحدة وفي أي وقت.",
      icon: ShieldCheck,
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      tag: "100% LOCAL PRIVACY",
    },
  ];

  const highlights = [
    { label: "أنماط تتبع متخصصة", value: "٦ أنواع", note: "مدة، مسافة، عداد، إنجاز، أحداث" },
    { label: "الخصوصية وسرية البيانات", value: "محلياً 100%", note: "بدون خوادم طرف ثالث" },
    { label: "دقة التوقيت والمؤقت", value: "ثوانٍ حقيقية", note: "مقاوم للتحديث والتنقل" },
    { label: "المؤشرات والرسوم", value: "SVG خفيف", note: "مستوحى من منصات التداول" },
  ];

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 selection:bg-violet-600/30 selection:text-white">
      
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden border-b border-zinc-800/60">
        
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-violet-600/20 via-indigo-600/15 to-transparent blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[250px] bg-emerald-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-violet-500/30 text-violet-300 text-xs font-medium shadow-xl shadow-black/50 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>الإصدار 2.0 الجديد • منظومة إتقان العادات وعمارة الوقت</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Main Title */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-100 leading-[1.25]">
              لا تكتفِ بتسجيل المهام.. <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                ابنِ أثراً حقيقياً ومحكماً في كل يوم
              </span>
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
              منصة الحياة المتكاملة للمطورين وصناع الأثر: مؤقت عمل عميق حقيقي، مصفوفة صلوات تفصيلية، رسوم بيانية مستوحاة من أسواق المال، ودفتر يوميات رقمي فائق الخصوصية.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              <span>فتح لوحة القيادة الحية</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-bold text-sm border border-zinc-750 hover:border-zinc-600 transition-all duration-200 shadow-md"
            >
              <span>إنشاء حساب جديد</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-zinc-400 hover:text-zinc-200 font-medium text-xs transition-colors"
            >
              <span>تسجيل الدخول للمنظومة</span>
            </Link>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10">
            {highlights.map((h, i) => (
              <div key={i} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm text-center">
                <span className="text-xs text-zinc-400 block mb-1 font-medium">{h.label}</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-zinc-100 block">{h.value}</span>
                <span className="text-[10px] text-zinc-400 mt-1 block font-mono">{h.note}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 2. Philosophy & Why Athar */}
      <section className="py-20 border-b border-zinc-800/60 bg-[#0a0c13]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest block">
              فلسفة التصميم • The Philosophy
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-100">
              لماذا أثـر يختلف عن أي تطبيق عادات آخر؟
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              العادات تختلف في طبيعتها النفسية والزمنية. حصرها في خانة اختيار (Checkbox) هو تفريط في فهم سياق يومك.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold font-mono text-lg">
                01
              </div>
              <h3 className="text-lg font-bold text-zinc-100">لا تشويه للأرقام (No Vanity Metrics)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                لا نبتكر درجات أداء وهمية أو نقاط ألعاب تخدعك. كل مؤشر يعكس أرقاماً سجلتها بيدك، ونوضح دائماً الفرق بين نسبة الإنجاز والبيانات الفعلية.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono text-lg">
                02
              </div>
              <h3 className="text-lg font-bold text-zinc-100">تجارب تتبع ملائمة لكل نشاط</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                البرمجة تحتاج مؤقت جلسات عميقة، الصلاة تحتاج تسجيل المسجد والمواقيت، الجري يتطلب حساب المسافة ومعدل السرعة، والتدخين يتطلب تتبع المحفزات بدون وصم أو إحباط.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono text-lg">
                03
              </div>
              <h3 className="text-lg font-bold text-zinc-100">الهدوء البصري والتركيز الصارم</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                واجهة كلاسيكية متقنة مستوحاة من دفاتر الملاحظات الرقمية الفاخرة وشاشات بلومبيرغ المالية، تمنحك صفاءً ذهنياً يساعدك على الإنجاز.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Feature Pillars Grid */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
            المزايا الأساسية • Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-zinc-100">
            أدوات متكاملة لإدارة أبعاد يومك
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pil, idx) => {
            const Icon = pil.icon;
            return (
              <div 
                key={idx} 
                className="group p-7 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-300 shadow-xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${pil.accent}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {pil.tag}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">
                    {pil.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {pil.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* 4. Poetic Wisdom Banner */}
      <section className="py-16 border-y border-zinc-800/60 bg-gradient-to-r from-violet-950/20 via-[#0c0e17] to-indigo-950/20">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Flame className="w-5 h-5 fill-violet-400" />
          </div>
          <blockquote className="text-xl sm:text-2xl font-serif text-zinc-200 italic leading-relaxed">
            «وما من كاتب إلا سيفنى .. ويُبقي الدهر ما كتبت يداه»
          </blockquote>
          <p className="text-xs text-zinc-400 font-sans max-w-lg mx-auto">
            اليوم هو الوحدة البنائية لحياتك كلها. عندما تصون ساعاته وتستثمر في عاداته، فإنك تصنع الأثر الذي يدوم.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all"
            >
              <span>انتقل مباشرة إلى التطبيق</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

