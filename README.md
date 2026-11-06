# منصة أثـر (Athar) — هندسة العادات والإنتاجية الشخصية

> **أثـر (Athar)** هي منصة سحابية شخصية متطورة لتتبع وتطوير أسلوب الحياة، والعادات اليومية، وجلسات التركيز، والمهام التنفيذية، مبنية بفلسفة الرقعة البيضاء الفارغة (**Zero-Seed Canvas**) وتصميم داكن أنيق (Obsidian Dark Aesthetic) يدعم اللغة العربية واتجاه اليمين إلى اليسار (RTL) بشكل أصيل.

---

## 🌟 الميزات الجوهرية (Core Features)

1. **مبدأ الرقعة البيضاء (Zero-Seed Canvas)**:
   - يبدأ الحساب الجديد نظيفاً تماماً دون أي عادات أو تصنيفات افتراضية مسبقة، لتمكين المستخدم من بناء نظامه الخاص بحرية مطلقة.
2. **7 أنماط تتبع ديناميكية متعددة القياسات (7 Tracking Modalities)**:
   - **`BOOLEAN`**: إنجاز ثنائي يومي (نعم / لا).
   - **`COUNTER`**: عداد تدريجي مرن بخطوات مخصصة (مثل أكواب القهوة أو تكرار الأذكار).
   - **`NUMBER`**: قياسات رقمية بوحدات مخصصة (شرب الماء باللتر، القراءة بالصفحات).
   - **`DURATION`**: جلسات تركيز ودراسة مؤقتة بالدقائق والثواني مع ساعة إيقاف حية (Stopwatch).
   - **`TIME_RANGE`**: نطاق زمني دقيق يبدأ وينتهي بتوقيت محدد ويدعم الأنشطة العابرة لمنتصف الليل (مثل ساعات النوم).
   - **`CHECKLIST`**: قوائم تحقق متعددة البنود لليوم الواحد (مثل الصلوات الخمس).
   - **`AVOIDANCE`**: تتبع الامتناع والتعافي من العادات غير المرغوبة مع توثيق الأيام النظيفة ورصد الزلات ونوبات الرغبة.
3. **نظام مهام وأولويات مستقل (Decoupled Task Management)**:
   - فصل كامل بين المهام التنفيذية الفردية المؤقتة ذات التواريخ المحددة وبين العادات اليومية المتكررة.
   - دعم الأولويات (`URGENT`, `HIGH`, `MEDIUM`, `LOW`)، والتأجيل اليدوي المرن دون تكرار أو نقل قسري.
4. **النظرة اليومية والتاريخية والتقويم (Daily Journal & History Calendar)**:
   - استعراض سجلات أي يوم تاريخي سابق بالتفصيل، وتدوين اليوميات والملاحظات والمشاعر مع حماية كاملة للبيانات.
   - تقويم تفاعلي يعكس الأيام التي تم فيها تدوين أنشطة فعلية دون فرض الفشل عند غياب البيانات.
5. **محرك التحليلات والسلاسل الذكية (Analytics & Meaningful Streaks)**:
   - احتساب دقيق للسلاسل المتصلة (Streaks) يحترم جدول التتبع المخصص لكل عادة ولا يعاقب عطلات نهاية الأسبوع غير المجدولة.
   - رسوم بيانية تفاعلية SVG مدمجة خفيفة الوزن دون أي مكتبات خارجية ثقيلة.

---

## 🛠️ البنية التقنية (Tech Stack)

- **إطار العمل**: [Next.js 16.4.3](https://nextjs.org/) (App Router + Turbopack + React 19).
- **العرض والتقديم**: Server Components مع تقنية **Partial Prerendering (`◐`)** و **Cache Components**.
- **المصادقة والأمان**: [Better Auth 1.7.x](https://better-auth.com/) مع محول Prisma الرسمي ودعم **Google OAuth** حصرياً (`prompt: "select_account"`).
- **قاعدة البيانات**: PostgreSQL سحابية عبر [Supabase](https://supabase.com/) مع مجمع الاتصالات (Connection Pooler).
- **طبقة البيانات (ORM)**: [Prisma 7.10.x](https://www.prisma.io/) مع محول المحرك عالي الأداء `@prisma/adapter-pg`.
- **التحقق وتأكيد البيانات**: [Zod 4](https://zod.dev/) لحماية جميع نقاط الإدخال وإجراءات الخادم.
- **التصميم والأيقونات**: Tailwind CSS v4، أيقونات Lucide React، معالجة خطوط Geist و Vazirmatn العربية.

---

## 🚀 دليل التثبيت والتشغيل المحلي (Local Setup)

### 1. المتطلبات الأساسية
- **Node.js**: الإصدار `v22.x` أو أعلى.
- **npm**: الإصدار `10.x` أو أعلى.

### 2. استنساخ المشروع وتثبيت الحزم
```bash
git clone https://github.com/your-username/athar.git
cd athar
npm install
```

### 3. إعداد متغيرات البيئة (Environment Variables)
انسخ ملف `.env.example` إلى `.env`:
```bash
cp .env.example .env
```

املأ المتغيرات التالية في ملف `.env`:
```env
# رابط مجمع اتصالات Supabase (Transaction mode على المنفذ 6543)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# الحد الأقصى لحجم حوض الاتصالات (10 للإنتاج، 5 للتطوير)
DATABASE_POOL_MAX="10"

# الرابط المباشر لتشغيل الترحيلات البرمجية (Direct connection على المنفذ 5432)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# مفتاح التشفير السري لـ Better Auth (أكثر من 32 حرفاً عشوائياً)
# يمكن توليده عبر: openssl rand -base64 32
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-chars-long"
BETTER_AUTH_URL="http://localhost:3000"

# بيانات اعتماد Google OAuth (من Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 4. إعداد Google OAuth في Google Cloud Console
1. انتقل إلى [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً جديداً.
2. اذهب إلى **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth Client ID**.
3. حدد نوع التطبيق **Web application**.
4. أضف العناوين التالية:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (محلياً)
     - `https://your-domain.com` (في الإنتاج)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (محلياً)
     - `https://your-domain.com/api/auth/callback/google` (في الإنتاج)
5. انسخ `Client ID` و `Client Secret` إلى ملف `.env`.

### 5. ترحيل قاعدة البيانات (Database Migrations)
```bash
# توليد عميل Prisma Client
npm run db:generate

# التحقق من صحة المخطط
npm run db:validate

# تطبيق الترحيلات على قاعدة البيانات
npx prisma migrate deploy
```

### 6. تشغيل خادم التطوير
```bash
npm run dev
```
افتح المتصفح على [http://localhost:3000](http://localhost:3000).

---

## 🧪 الفحص والاختبارات (Verification & Quality Assurance)

تحتوي المنصة على مجموعة فحوصات مؤتمتة متكاملة:

```bash
# 1. فحص الأنواع الصارم (TypeScript)
npx tsc --noEmit

# 2. فحص جودة الكود والتنسيق (ESLint)
npm run lint

# 3. اختبارات الأمان والعزل متعدد المستأجرين (Security & IDOR Suite)
node scratch/test-phase13-security.mjs

# 4. اختبارات قياس الأداء وحساب السلاسل (Performance Benchmarks)
node scratch/benchmark-phase12.mjs

# 5. اختبار بناء الإنتاج المتكامل (Production Build)
npm run build
```

---

## 🌐 دليل النشر في بيئة الإنتاج (Production Deployment)

### النشر عبر منصة Vercel:
1. اربط مستودع GitHub بمنصة [Vercel](https://vercel.com).
2. في إعدادات المشروع (**Settings > Environment Variables**)، أضف المتغيرات التالية:
   - `DATABASE_URL` (مع تضمين `?pgbouncer=true` ومجمع Supabase).
   - `DIRECT_URL` (الاتصال المباشر على المنفذ 5432).
   - `DATABASE_POOL_MAX` (اضبطه على `10`).
   - `BETTER_AUTH_SECRET` (مفتاح تشفير 32+ حرفاً).
   - `BETTER_AUTH_URL` (رابط النطاق النهائي، مثل `https://athar.app`).
   - `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET`.
3. أمر البناء الافتراضي: `npm run build` (يقوم بتنفيذ `prisma generate` تلقائياً عبر `postinstall`).
4. تأكد من تشغيل الترحيل المسبق: `npx prisma migrate deploy`.

---

## 🔒 معايير الأمان والخصوصية (Security & Privacy)

- **عزل المستأجرين بنسبة 100%**: لا يعتمد التطبيق نهائياً على أي معرف مستخدم ممرر من المتصفح؛ تُستخرج الهوية حصراً عبر الجلسة المشفرة على الخادم، وتُقيد كافة الاستعلامات بفهرس `userId`.
- **منع هجمات التوجيه المفتوح (Open Redirects)**: فحص أمني صارم لكافة روابط العودة (`returnTo`) لمنع تحويل المستخدمين إلى مواقع خارجية.
- **واجهات متفائلة آمنة**: استجابة فورية للنقرات مع تراجع تلقائي كامل (Rollback) في حال فشل أي عملية على الخادم.
- **أمان الاتصالات**: تشفير كامل للاتصالات بقاعدة البيانات ومصادقة Google OAuth عبر طبقة SSL/TLS.

---

## 📄 الترخيص (License)
جميع الحقوق محفوظة لمنصة **أثـر (Athar)** © 2026.
