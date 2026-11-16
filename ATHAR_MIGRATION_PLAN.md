# خطة ترحيل البيانات وتوحيد الأنظمة (Athar Migration Plan)

**الإصدار:** 1.0.0-PROD  
**تاريخ التحديث:** 9 نوفمبر 2026  

---

## 1. أهداف خطة الترحيل ومبادئ الأمان (Core Safety Principles)

1. **حظر الحذف العشوائي (Zero Data Loss):**
   - لا يتم حذف أي بيانات موجودة للمستخدم (سواء في التخزين القديم `localStorage` أو قاعدة البيانات أو حسابات الضيوف).
2. **الترحيل التراكمي الشفاف (Idempotent Migration):**
   - كل سكريبت ترحيل مصمم للعمل أكثر من مرة دون تكرار السجلات أو إتلاف العلاقات.
3. **التراجع الآمن (Safe Fallback):**
   - تظل البيانات القديمة محفوظة كنسخة احتياطية حتى يكتمل التحقق من نجاح قراءتها في النظام الحديث.

---

## 2. خريطة مسارات الترحيل (Migration Matrix)

```
[Legacy Layer]                                    [Target Modern Layer]
localStorage: athar_state_v1                -->   IndexedDB: athar_local_v2 (tasks, trackers)
localStorage: athar_gym                     -->   IndexedDB: gym_workouts & PostgreSQL GymWorkout
localStorage: athar_nutrition               -->   IndexedDB: meal_entries & PostgreSQL MealEntry
localStorage: athar_expenses                -->   IndexedDB: expense_entries & PostgreSQL ExpenseEntry
Heuristic Tracker Prayer Queries            -->   Dedicated Table: PrayerRecord
Guest IndexedDB Data                        -->   Server Sync via Guest Import Transaction
```

---

## 3. تفاصيل مراحل الترحيل

### 3.1 ترحيل التخزين المحلي القديم (LocalStorage to IndexedDB Migration)
- **الكاشف التلقائي (Automatic Bridge):**
  عند بدء تشغيل التطبيق، تقوم دالة `migrateLegacyStorage()` بفحص مفاتيح التخزين القديمة:
  - `athar_state_v1`
  - `athar_gym`
  - `athar_nutrition`
  - `athar_expenses`
- **آلية الترحيل:**
  1. قراءة الكائنات وتحويل بنيتها إلى الشكل القياسي الحديث.
  2. إدخال السجلات في مخازن `IndexedDB` المعنية.
  3. جدولة عمليات المزامنة في `outbox` للمستخدم المسجل.
  4. تعليم علامة الترحيل `athar_legacy_migrated: true` في `localStorage` مع الاحتفاظ بنسخة أرشيفية تحت اسم `athar_backup_legacy`.

### 3.2 ترحيل بيانات الصلوات إلى الكيان المستقل (`PrayerRecord`)
- **الوضع الحالي:** الصلوات تُسجل كمدخلات عامة داخل متعقب عادي يحمل اسم "صلاة" أو "prayer" دون قيد يمنع التكرار ودون دعم للضيف.
- **الإجراء:**
  1. إنشاء جدول `prayer_record` ومخزن `prayer_records` في `IndexedDB` مع قيد فريد: `[userId, date, prayerKey]`.
  2. سكريبت استخلاص ذكي يقرأ التدوينات السابقة المرتبطة بتلك المتعقبات ويحولها إلى سجلات صلاة نظامية.
  3. اعتماد واجهة الصلوات الجديدة كلياً على الكيان الجديد المخصص.

### 3.3 ترحيل بيانات الضيف عند تسجيل الدخول (Guest Data Import)
- **السيناريو:** مستخدم استعمل الموقع كضيف وأنشأ مهاماً وصلوات وعادات، ثم قام بإنشاء حساب أو تسجيل الدخول.
- **آلية العمل:**
  1. رصد وجود سجلات بـ `userId: "guest"` في `IndexedDB`.
  2. إظهار نافذة تأكيد غير معطلة للعمل: "لديك X مهام و Y صلوات تم إنشاؤها كضيف. هل ترغب في ضمها لحسابك الجديد؟".
  3. عند الموافقة، ترسل البيانات في دفعة استيراد آمنة إلى الخادم (`actions/guest-import.ts`) الذي يربطها بالـ `userId` الفعلي.
  4. بعد التحقق من استجابة الخادم بالنجاح، تُحدث السجلات المحلية بالمعرف الجديد وتُنظف سجلات الضيف.

