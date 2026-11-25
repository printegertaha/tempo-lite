export interface UserFacingAuthError {
  title: string;
  message: string;
  actionHint: string;
  canRetry: boolean;
  categoryLabel: string;
}

const ERROR_CATALOG: Record<string, UserFacingAuthError> = {
  missing_google_credentials: {
    title: "تسجيل الدخول عبر Google غير مهيأ",
    message:
      "تسجيل الدخول عبر Google غير مهيأ بشكل صحيح على الخادم حالياً. يرجى التواصل مع مسؤول التطبيق أو استخدام البريد الإلكتروني.",
    actionHint: "تحقق من إعداد GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في بيئة التشغيل.",
    canRetry: false,
    categoryLabel: "إعدادات Google OAuth",
  },
  redirect_uri_mismatch: {
    title: "عدم تطابق رابط العودة (Redirect URI)",
    message:
      "أرجع Google خطأ في إعدادات OAuth (redirect_uri_mismatch). يحتاج مسؤول التطبيق إلى التحقق من عنوان إعادة التوجيه المعتمد في Google Cloud Console.",
    actionHint: "تأكد من مطابقة BETTER_AUTH_URL مع Authorized Redirect URI في Google Cloud Console.",
    canRetry: false,
    categoryLabel: "إعدادات Google Cloud Console",
  },
  invalid_client: {
    title: "بيانات عميل Google غير صالحة",
    message:
      "رفض Google بيانات تطبيق المصادقة (invalid_client). يحتاج مسؤول التطبيق إلى مراجعة معرف العميل والمفتاح السري.",
    actionHint: "تحقق من صحة GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET.",
    canRetry: false,
    categoryLabel: "إعدادات Google OAuth",
  },
  unauthorized_client: {
    title: "التطبيق غير مصرح له",
    message:
      "هذا التطبيق غير مصرح له بإجراء مصادقة Google بهذه الإعدادات.",
    actionHint: "راجع إعدادات OAuth Client Type وشاشة الموافقة في Google Cloud Console.",
    canRetry: false,
    categoryLabel: "إعدادات Google OAuth",
  },
  access_denied: {
    title: "تم إلغاء أو رفض الإذن من Google",
    message:
      "لم يكتمل تسجيل الدخول عبر Google بسبب إلغاء العملية أو عدم السماح للحساب بالوصول في شاشة الموافقة.",
    actionHint: "إذا كان التطبيق في وضع الاختبار (Testing)، تأكد من إضافة البريد ضمن Test Users.",
    canRetry: true,
    categoryLabel: "موافقة Google",
  },
  state_mismatch: {
    title: "انتهت صلاحية جلسة التحقق",
    message:
      "انتهت صلاحية جلسة المصادقة المؤقتة أو تعذر التحقق من ملفات الارتباط (Cookies). يرجى بدء تسجيل الدخول من جديد.",
    actionHint: "تأكد من تفعيل الكوكيز وعدم فتح أكثر من نافذة تسجيل دخول بالتوازي.",
    canRetry: true,
    categoryLabel: "الجلسة والكوكيز",
  },
  state_security_mismatch: {
    title: "تعذر مطابقة رمز الأمان",
    message:
      "تعذر التحقق من أمان طلب تسجيل الدخول عبر Google (قد يكون بسبب تغير النطاق بين localhost و 127.0.0.1 أو حظر الكوكيز).",
    actionHint: "ابدأ تسجيل الدخول من نفس النطاق الرسمي للتطبيق وأعد المحاولة.",
    canRetry: true,
    categoryLabel: "الجلسة والكوكيز",
  },
  state_not_found: {
    title: "بيانات حالة المصادقة مفقودة",
    message:
      "انتهت صلاحية طلب المصادقة أو فُقدت بيانات التحقق قبل العودة من Google. يرجى البدء من جديد.",
    actionHint: "اضغط إعادة المحاولة لبدء طلب مصادقة جديد.",
    canRetry: true,
    categoryLabel: "الجلسة والكوكيز",
  },
  state_invalid: {
    title: "تعذر فك تشفير حالة المصادقة",
    message:
      "تعذر التحقق من صلاحية جلسة المصادقة المؤقتة. يرجى المحاولة مرة أخرى.",
    actionHint: "تحقق من ثبات BETTER_AUTH_SECRET عبر نسخ الخادم.",
    canRetry: true,
    categoryLabel: "الجلسة والكوكيز",
  },
  invalid_code: {
    title: "تعذر إتمام التبادل مع Google",
    message:
      "انتهت صلاحية رمز التفويض من Google أو تعذر التحقق منه على الخادم.",
    actionHint: "أعد المحاولة؛ وإذا تكرر الخطأ راجع رمز المرجع في سجلات الخادم.",
    canRetry: true,
    categoryLabel: "مصادقة Google",
  },
  no_code: {
    title: "لم يرسل Google رمز التفويض",
    message: "عادت الاستجابة من Google دون رمز تفويض صالح. يرجى المحاولة مجدداً.",
    actionHint: "أعد بدء تسجيل الدخول عبر Google.",
    canRetry: true,
    categoryLabel: "مصادقة Google",
  },
  unable_to_get_user_info: {
    title: "تعذر قراءة بيانات الحساب من Google",
    message:
      "تمت الموافقة في Google لكن تعذر استرجاع بيانات الملف الشخصي أو البريد الإلكتروني.",
    actionHint: "تحقق من صلاحيات openid و email و profile.",
    canRetry: true,
    categoryLabel: "بيانات الحساب",
  },
  email_not_found: {
    title: "البريد الإلكتروني غير متاح",
    message: "لم يوفر حساب Google بريداً إلكترونياً معتمداً لإتمام التسجيل.",
    actionHint: "استخدم حساب Google يحتوي على بريد إلكتروني مفعل.",
    canRetry: true,
    categoryLabel: "بيانات الحساب",
  },
  account_not_linked: {
    title: "الحساب مسجل مسبقاً بطريقة أخرى",
    message:
      "يوجد حساب مسجل مسبقاً بهذا البريد الإلكتروني عبر كلمة المرور ولم يتم ربطه تلقائياً بـ Google لأسباب أمنية.",
    actionHint: "سجل الدخول بالبريد وكلمة المرور المسجلين مسبقاً.",
    canRetry: false,
    categoryLabel: "ربط الحسابات",
  },
  unable_to_create_user: {
    title: "تعذر إنشاء الحساب في قاعدة البيانات",
    message:
      "تعذر إتمام المصادقة بسبب مشكلة مؤقتة في حفظ بيانات الحساب في قاعدة البيانات. يرجى المحاولة لاحقاً.",
    actionHint: "تحقق من اتصال قاعدة البيانات وجدول المستخدمين.",
    canRetry: true,
    categoryLabel: "قاعدة البيانات",
  },
  unable_to_create_session: {
    title: "تعذر حفظ جلسة الدخول",
    message:
      "تعذر إتمام المصادقة لأن الجلسة لم تُحفظ في قاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.",
    actionHint: "تحقق من اتصال PostgreSQL وجدول الجلسات.",
    canRetry: true,
    categoryLabel: "قاعدة البيانات",
  },
  database_error: {
    title: "خطأ في الاتصال بقاعدة البيانات",
    message:
      "تعذر إتمام المصادقة بسبب تعذر الوصول لقاعدة البيانات حالياً. يرجى المحاولة لاحقاً.",
    actionHint: "تحقق من حالة PostgreSQL ورابط DATABASE_URL.",
    canRetry: true,
    categoryLabel: "قاعدة البيانات",
  },
  invalid_origin: {
    title: "النطاق غير مصرح به",
    message:
      "تم رفض طلب المصادقة لأن النطاق الحالي غير مدرج ضمن النطاقات الموثوقة للتطبيق.",
    actionHint: "تأكد من ضبط BETTER_AUTH_URL و trustedOrigins للنطاق الحالي.",
    canRetry: false,
    categoryLabel: "إعدادات التطبيق",
  },
  missing_auth_secret: {
    title: "إعدادات التشفير ناقصة على الخادم",
    message: "إعدادات أمان المصادقة غير مكتملة على الخادم حالياً.",
    actionHint: "اضبط BETTER_AUTH_SECRET في متغيرات بيئة الخادم.",
    canRetry: false,
    categoryLabel: "إعدادات النشر",
  },
};

export function resolveUserFacingAuthError(
  code?: string | null,
  referenceId?: string | null
): UserFacingAuthError & { referenceId: string | null; code: string } {
  const normalizedCode = (code || "unknown_auth_error").trim().toLowerCase();
  const matched = ERROR_CATALOG[normalizedCode];
  const ref = referenceId?.trim() || null;

  if (matched) {
    return {
      ...matched,
      code: normalizedCode,
      referenceId: ref,
    };
  }

  return {
    title: "تعذر إتمام تسجيل الدخول",
    message:
      "حدث خطأ أثناء المصادقة عبر Google. يمكنك المحاولة مرة أخرى أو استخدام تسجيل الدخول بالبريد الإلكتروني.",
    actionHint: "استخدم رقم المرجع للبحث في سجلات الخادم.",
    canRetry: true,
    categoryLabel: "المصادقة",
    code: normalizedCode,
    referenceId: ref,
  };
}
