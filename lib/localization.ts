export interface AdminRegion {
  nameAr: string;
  nameEn: string;
  timezone?: string;
}

export interface CountryDefinition {
  code: string; // ISO 3166-1 alpha-2
  nameAr: string;
  nameEn: string;
  defaultCurrency: string; // ISO 4217
  defaultTimezone: string; // Canonical IANA
  defaultPrayerCalc: string;
  defaultRegion: string;
  regions: AdminRegion[];
}

export interface CurrencyDefinition {
  code: string; // ISO 4217
  nameAr: string;
  nameEn: string;
  symbolAr: string;
  symbolEn: string;
  decimals: number;
}

export interface TimezoneOption {
  id: string;
  labelAr: string;
  labelEn: string;
  regionLabel: string;
  offsetLabel: string;
  searchTerms: string;
}

export interface LocalizationPreferences {
  countryCode: string;
  country: string;
  governorate: string;
  city: string;
  timezone: string;
  timezoneAuto: boolean;
  currency: string;
  currencyAuto: boolean;
  prayerCalc: string;
  prayerTrackingEnabled: boolean;
  prayerPreferenceConfigured: boolean;
}

export const CURRENCIES: CurrencyDefinition[] = [
  { code: "EGP", nameAr: "جنيه مصري", nameEn: "Egyptian Pound", symbolAr: "ج.م", symbolEn: "E£", decimals: 2 },
  { code: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", symbolAr: "ر.س", symbolEn: "SAR", decimals: 2 },
  { code: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", symbolAr: "د.إ", symbolEn: "AED", decimals: 2 },
  { code: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", symbolAr: "ر.ق", symbolEn: "QAR", decimals: 2 },
  { code: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbolAr: "د.ك", symbolEn: "KWD", decimals: 3 },
  { code: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", symbolAr: "د.ب", symbolEn: "BHD", decimals: 3 },
  { code: "OMR", nameAr: "ريال عُماني", nameEn: "Omani Rial", symbolAr: "ر.ع", symbolEn: "OMR", decimals: 3 },
  { code: "JOD", nameAr: "دينار أردني", nameEn: "Jordanian Dinar", symbolAr: "د.أ", symbolEn: "JOD", decimals: 3 },
  { code: "USD", nameAr: "دولار أمريكي", nameEn: "US Dollar", symbolAr: "$", symbolEn: "$", decimals: 2 },
  { code: "EUR", nameAr: "يورو", nameEn: "Euro", symbolAr: "€", symbolEn: "€", decimals: 2 },
  { code: "GBP", nameAr: "جنيه إسترليني", nameEn: "British Pound", symbolAr: "£", symbolEn: "£", decimals: 2 },
  { code: "MAD", nameAr: "درهم مغربي", nameEn: "Moroccan Dirham", symbolAr: "د.م", symbolEn: "MAD", decimals: 2 },
  { code: "TND", nameAr: "دينار تونسي", nameEn: "Tunisian Dinar", symbolAr: "د.ت", symbolEn: "TND", decimals: 3 },
  { code: "DZD", nameAr: "دينار جزائري", nameEn: "Algerian Dinar", symbolAr: "د.ج", symbolEn: "DZD", decimals: 2 },
  { code: "IQD", nameAr: "دينار عراقي", nameEn: "Iraqi Dinar", symbolAr: "د.ع", symbolEn: "IQD", decimals: 0 },
  { code: "LBP", nameAr: "ليرة لبنانية", nameEn: "Lebanese Pound", symbolAr: "ل.ل", symbolEn: "LBP", decimals: 0 },
  { code: "LYD", nameAr: "دينار ليبي", nameEn: "Libyan Dinar", symbolAr: "د.ل", symbolEn: "LYD", decimals: 3 },
  { code: "SDG", nameAr: "جنيه سوداني", nameEn: "Sudanese Pound", symbolAr: "ج.س", symbolEn: "SDG", decimals: 2 },
  { code: "SYP", nameAr: "ليرة سورية", nameEn: "Syrian Pound", symbolAr: "ل.س", symbolEn: "SYP", decimals: 0 },
  { code: "YER", nameAr: "ريال يمني", nameEn: "Yemeni Rial", symbolAr: "ر.ي", symbolEn: "YER", decimals: 0 },
  { code: "TRY", nameAr: "ليرة تركية", nameEn: "Turkish Lira", symbolAr: "₺", symbolEn: "₺", decimals: 2 },
  { code: "CAD", nameAr: "دولار كندي", nameEn: "Canadian Dollar", symbolAr: "C$", symbolEn: "C$", decimals: 2 },
  { code: "AUD", nameAr: "دولار أسترالي", nameEn: "Australian Dollar", symbolAr: "A$", symbolEn: "A$", decimals: 2 },
  { code: "CHF", nameAr: "فرنك سويسري", nameEn: "Swiss Franc", symbolAr: "CHF", symbolEn: "CHF", decimals: 2 },
  { code: "MYR", nameAr: "رينغيت ماليزي", nameEn: "Malaysian Ringgit", symbolAr: "RM", symbolEn: "RM", decimals: 2 },
  { code: "IDR", nameAr: "روبية إندونيسية", nameEn: "Indonesian Rupiah", symbolAr: "Rp", symbolEn: "Rp", decimals: 0 },
  { code: "PKR", nameAr: "روبية باكستانية", nameEn: "Pakistani Rupee", symbolAr: "Rs", symbolEn: "PKR", decimals: 0 },
  { code: "INR", nameAr: "روبية هندية", nameEn: "Indian Rupee", symbolAr: "₹", symbolEn: "₹", decimals: 2 },
  { code: "JPY", nameAr: "ين ياباني", nameEn: "Japanese Yen", symbolAr: "¥", symbolEn: "¥", decimals: 0 },
  { code: "CNY", nameAr: "يوان صيني", nameEn: "Chinese Yuan", symbolAr: "¥", symbolEn: "CN¥", decimals: 2 },
];

export const CURRENCY_MAP: Record<string, CurrencyDefinition> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

export const COUNTRIES: CountryDefinition[] = [
  {
    code: "EG",
    nameAr: "جمهورية مصر العربية",
    nameEn: "Egypt",
    defaultCurrency: "EGP",
    defaultTimezone: "Africa/Cairo",
    defaultPrayerCalc: "الهيئة المصرية العامة للمساحة",
    defaultRegion: "القاهرة",
    regions: [
      { nameAr: "القاهرة", nameEn: "Cairo" },
      { nameAr: "الجيزة", nameEn: "Giza" },
      { nameAr: "الإسكندرية", nameEn: "Alexandria" },
      { nameAr: "المنوفية", nameEn: "Monufia" },
      { nameAr: "الشرقية", nameEn: "Sharqia" },
      { nameAr: "القليوبية", nameEn: "Qalyubia" },
      { nameAr: "الدقهلية", nameEn: "Dakahlia" },
      { nameAr: "البحيرة", nameEn: "Beheira" },
      { nameAr: "الغربية", nameEn: "Gharbia" },
      { nameAr: "كفر الشيخ", nameEn: "Kafr El Sheikh" },
      { nameAr: "دمياط", nameEn: "Damietta" },
      { nameAr: "بورسعيد", nameEn: "Port Said" },
      { nameAr: "الإسماعيلية", nameEn: "Ismailia" },
      { nameAr: "السويس", nameEn: "Suez" },
      { nameAr: "الفيوم", nameEn: "Faiyum" },
      { nameAr: "بني سويف", nameEn: "Beni Suef" },
      { nameAr: "المنيا", nameEn: "Minya" },
      { nameAr: "أسيوط", nameEn: "Asyut" },
      { nameAr: "سوهاج", nameEn: "Sohag" },
      { nameAr: "قنا", nameEn: "Qena" },
      { nameAr: "الأقصر", nameEn: "Luxor" },
      { nameAr: "أسوان", nameEn: "Aswan" },
      { nameAr: "البحر الأحمر", nameEn: "Red Sea" },
      { nameAr: "الوادي الجديد", nameEn: "New Valley" },
      { nameAr: "مطروح", nameEn: "Matrouh" },
      { nameAr: "شمال سيناء", nameEn: "North Sinai" },
      { nameAr: "جنوب سيناء", nameEn: "South Sinai" },
    ],
  },
  {
    code: "SA",
    nameAr: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    defaultCurrency: "SAR",
    defaultTimezone: "Asia/Riyadh",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "الرياض",
    regions: [
      { nameAr: "الرياض", nameEn: "Riyadh" },
      { nameAr: "مكة المكرمة", nameEn: "Makkah" },
      { nameAr: "المدينة المنورة", nameEn: "Madinah" },
      { nameAr: "المنطقة الشرقية", nameEn: "Eastern Province" },
      { nameAr: "عسير", nameEn: "Asir" },
      { nameAr: "تبوك", nameEn: "Tabuk" },
      { nameAr: "القصيم", nameEn: "Qassim" },
      { nameAr: "حائل", nameEn: "Hail" },
      { nameAr: "جازان", nameEn: "Jazan" },
      { nameAr: "نجران", nameEn: "Najran" },
      { nameAr: "الباحة", nameEn: "Al-Baha" },
      { nameAr: "الجوف", nameEn: "Al-Jouf" },
      { nameAr: "الحدود الشمالية", nameEn: "Northern Borders" },
    ],
  },
  {
    code: "AE",
    nameAr: "الإمارات العربية المتحدة",
    nameEn: "United Arab Emirates",
    defaultCurrency: "AED",
    defaultTimezone: "Asia/Dubai",
    defaultPrayerCalc: "دبي / الشارقة",
    defaultRegion: "دبي",
    regions: [
      { nameAr: "أبوظبي", nameEn: "Abu Dhabi" },
      { nameAr: "دبي", nameEn: "Dubai" },
      { nameAr: "الشارقة", nameEn: "Sharjah" },
      { nameAr: "عجمان", nameEn: "Ajman" },
      { nameAr: "أم القيوين", nameEn: "Umm Al Quwain" },
      { nameAr: "رأس الخيمة", nameEn: "Ras Al Khaimah" },
      { nameAr: "الفجيرة", nameEn: "Fujairah" },
    ],
  },
  {
    code: "QA",
    nameAr: "قطر",
    nameEn: "Qatar",
    defaultCurrency: "QAR",
    defaultTimezone: "Asia/Qatar",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "الدوحة",
    regions: [
      { nameAr: "الدوحة", nameEn: "Doha" },
      { nameAr: "الريان", nameEn: "Al Rayyan" },
      { nameAr: "الوكرة", nameEn: "Al Wakrah" },
      { nameAr: "الخور", nameEn: "Al Khor" },
      { nameAr: "أم صلال", nameEn: "Umm Salal" },
      { nameAr: "الضعاين", nameEn: "Al Daayen" },
      { nameAr: "الشمال", nameEn: "Al Shamal" },
      { nameAr: "الشيحانية", nameEn: "Al-Shahaniya" },
    ],
  },
  {
    code: "KW",
    nameAr: "الكويت",
    nameEn: "Kuwait",
    defaultCurrency: "KWD",
    defaultTimezone: "Asia/Kuwait",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "العاصمة",
    regions: [
      { nameAr: "العاصمة", nameEn: "Al Asimah" },
      { nameAr: "حولي", nameEn: "Hawalli" },
      { nameAr: "الفروانية", nameEn: "Farwaniya" },
      { nameAr: "الجهراء", nameEn: "Jahra" },
      { nameAr: "الأحمدي", nameEn: "Ahmadi" },
      { nameAr: "مبارك الكبير", nameEn: "Mubarak Al-Kabeer" },
    ],
  },
  {
    code: "BH",
    nameAr: "البحرين",
    nameEn: "Bahrain",
    defaultCurrency: "BHD",
    defaultTimezone: "Asia/Bahrain",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "العاصمة",
    regions: [
      { nameAr: "العاصمة", nameEn: "Capital" },
      { nameAr: "المحرق", nameEn: "Muharraq" },
      { nameAr: "الشمالية", nameEn: "Northern" },
      { nameAr: "الجنوبية", nameEn: "Southern" },
    ],
  },
  {
    code: "OM",
    nameAr: "سلطنة عُمان",
    nameEn: "Oman",
    defaultCurrency: "OMR",
    defaultTimezone: "Asia/Muscat",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "مسقط",
    regions: [
      { nameAr: "مسقط", nameEn: "Muscat" },
      { nameAr: "ظفار", nameEn: "Dhofar" },
      { nameAr: "الداخلية", nameEn: "Ad Dakhiliyah" },
      { nameAr: "شمال الباطنة", nameEn: "Al Batinah North" },
      { nameAr: "جنوب الباطنة", nameEn: "Al Batinah South" },
      { nameAr: "شمال الشرقية", nameEn: "Ash Sharqiyah North" },
      { nameAr: "جنوب الشرقية", nameEn: "Ash Sharqiyah South" },
      { nameAr: "الظاهرة", nameEn: "Ad Dhahirah" },
      { nameAr: "البريمي", nameEn: "Al Buraimi" },
      { nameAr: "مسندم", nameEn: "Musandam" },
      { nameAr: "الوسطى", nameEn: "Al Wusta" },
    ],
  },
  {
    code: "JO",
    nameAr: "الأردن",
    nameEn: "Jordan",
    defaultCurrency: "JOD",
    defaultTimezone: "Asia/Amman",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "عمّان",
    regions: [
      { nameAr: "عمّان", nameEn: "Amman" },
      { nameAr: "إربد", nameEn: "Irbid" },
      { nameAr: "الزرقاء", nameEn: "Zarqa" },
      { nameAr: "البلقاء", nameEn: "Balqa" },
      { nameAr: "المفرق", nameEn: "Mafraq" },
      { nameAr: "الكرك", nameEn: "Karak" },
      { nameAr: "العقبة", nameEn: "Aqaba" },
      { nameAr: "مادبا", nameEn: "Madaba" },
      { nameAr: "جرش", nameEn: "Jerash" },
      { nameAr: "عجلون", nameEn: "Ajloun" },
      { nameAr: "معان", nameEn: "Ma'an" },
      { nameAr: "الطفيلة", nameEn: "Tafilah" },
    ],
  },
  {
    code: "PS",
    nameAr: "فلسطين",
    nameEn: "Palestine",
    defaultCurrency: "JOD",
    defaultTimezone: "Asia/Hebron",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "القدس",
    regions: [
      { nameAr: "القدس", nameEn: "Jerusalem" },
      { nameAr: "رام الله والبيرة", nameEn: "Ramallah and Al-Bireh" },
      { nameAr: "الخليل", nameEn: "Hebron" },
      { nameAr: "نابلس", nameEn: "Nablus" },
      { nameAr: "غزة", nameEn: "Gaza" },
      { nameAr: "بيت لحم", nameEn: "Bethlehem" },
      { nameAr: "جنين", nameEn: "Jenin" },
      { nameAr: "طولكرم", nameEn: "Tulkarm" },
      { nameAr: "قلقيلية", nameEn: "Qalqilya" },
      { nameAr: "أريحا", nameEn: "Jericho" },
    ],
  },
  {
    code: "LB",
    nameAr: "لبنان",
    nameEn: "Lebanon",
    defaultCurrency: "LBP",
    defaultTimezone: "Asia/Beirut",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "بيروت",
    regions: [
      { nameAr: "بيروت", nameEn: "Beirut" },
      { nameAr: "جبل لبنان", nameEn: "Mount Lebanon" },
      { nameAr: "الشمال", nameEn: "North" },
      { nameAr: "الجنوب", nameEn: "South" },
      { nameAr: "البقاع", nameEn: "Beqaa" },
      { nameAr: "النبطية", nameEn: "Nabatieh" },
    ],
  },
  {
    code: "IQ",
    nameAr: "العراق",
    nameEn: "Iraq",
    defaultCurrency: "IQD",
    defaultTimezone: "Asia/Baghdad",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "بغداد",
    regions: [
      { nameAr: "بغداد", nameEn: "Baghdad" },
      { nameAr: "البصرة", nameEn: "Basra" },
      { nameAr: "نينوى", nameEn: "Nineveh" },
      { nameAr: "أربيل", nameEn: "Erbil" },
      { nameAr: "النجف", nameEn: "Najaf" },
      { nameAr: "كربلاء", nameEn: "Karbala" },
      { nameAr: "السليمانية", nameEn: "Sulaymaniyah" },
      { nameAr: "الأنبار", nameEn: "Anbar" },
      { nameAr: "بابل", nameEn: "Babylon" },
      { nameAr: "كركوك", nameEn: "Kirkuk" },
    ],
  },
  {
    code: "MA",
    nameAr: "المغرب",
    nameEn: "Morocco",
    defaultCurrency: "MAD",
    defaultTimezone: "Africa/Casablanca",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "الرباط - سلا - القنيطرة",
    regions: [
      { nameAr: "الرباط - سلا - القنيطرة", nameEn: "Rabat-Salé-Kénitra" },
      { nameAr: "الدار البيضاء - سطات", nameEn: "Casablanca-Settat" },
      { nameAr: "مراكش - آسفي", nameEn: "Marrakesh-Safi" },
      { nameAr: "فاس - مكناس", nameEn: "Fès-Meknès" },
      { nameAr: "طنجة - تطوان - الحسيمة", nameEn: "Tanger-Tétouan-Al Hoceïma" },
      { nameAr: "سوس - ماسة", nameEn: "Souss-Massa" },
      { nameAr: "الشرق", nameEn: "Oriental" },
    ],
  },
  {
    code: "DZ",
    nameAr: "الجزائر",
    nameEn: "Algeria",
    defaultCurrency: "DZD",
    defaultTimezone: "Africa/Algiers",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "الجزائر",
    regions: [
      { nameAr: "الجزائر", nameEn: "Algiers" },
      { nameAr: "وهران", nameEn: "Oran" },
      { nameAr: "قسنطينة", nameEn: "Constantine" },
      { nameAr: "عنابة", nameEn: "Annaba" },
      { nameAr: "سطيف", nameEn: "Sétif" },
      { nameAr: "البليدة", nameEn: "Blida" },
      { nameAr: "تلمسان", nameEn: "Tlemcen" },
    ],
  },
  {
    code: "TN",
    nameAr: "تونس",
    nameEn: "Tunisia",
    defaultCurrency: "TND",
    defaultTimezone: "Africa/Tunis",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "تونس",
    regions: [
      { nameAr: "تونس", nameEn: "Tunis" },
      { nameAr: "صفاقس", nameEn: "Sfax" },
      { nameAr: "سوسة", nameEn: "Sousse" },
      { nameAr: "أريانة", nameEn: "Ariana" },
      { nameAr: "بن عروس", nameEn: "Ben Arous" },
      { nameAr: "نابل", nameEn: "Nabeul" },
    ],
  },
  {
    code: "LY",
    nameAr: "ليبيا",
    nameEn: "Libya",
    defaultCurrency: "LYD",
    defaultTimezone: "Africa/Tripoli",
    defaultPrayerCalc: "الهيئة المصرية العامة للمساحة",
    defaultRegion: "طرابلس",
    regions: [
      { nameAr: "طرابلس", nameEn: "Tripoli" },
      { nameAr: "بنغازي", nameEn: "Benghazi" },
      { nameAr: "مصراتة", nameEn: "Misrata" },
      { nameAr: "الزاوية", nameEn: "Zawiya" },
      { nameAr: "سبها", nameEn: "Sabha" },
    ],
  },
  {
    code: "SD",
    nameAr: "السودان",
    nameEn: "Sudan",
    defaultCurrency: "SDG",
    defaultTimezone: "Africa/Khartoum",
    defaultPrayerCalc: "الهيئة المصرية العامة للمساحة",
    defaultRegion: "الخرطوم",
    regions: [
      { nameAr: "الخرطوم", nameEn: "Khartoum" },
      { nameAr: "الجزيرة", nameEn: "Gezira" },
      { nameAr: "البحر الأحمر", nameEn: "Red Sea" },
      { nameAr: "نهر النيل", nameEn: "River Nile" },
      { nameAr: "كسلا", nameEn: "Kassala" },
    ],
  },
  {
    code: "SY",
    nameAr: "سوريا",
    nameEn: "Syria",
    defaultCurrency: "SYP",
    defaultTimezone: "Asia/Damascus",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "دمشق",
    regions: [
      { nameAr: "دمشق", nameEn: "Damascus" },
      { nameAr: "حلب", nameEn: "Aleppo" },
      { nameAr: "حمص", nameEn: "Homs" },
      { nameAr: "اللاذقية", nameEn: "Latakia" },
      { nameAr: "حماة", nameEn: "Hama" },
    ],
  },
  {
    code: "YE",
    nameAr: "اليمن",
    nameEn: "Yemen",
    defaultCurrency: "YER",
    defaultTimezone: "Asia/Aden",
    defaultPrayerCalc: "أم القرى - مكة المكرمة",
    defaultRegion: "صنعاء",
    regions: [
      { nameAr: "صنعاء", nameEn: "Sanaa" },
      { nameAr: "عدن", nameEn: "Aden" },
      { nameAr: "تعز", nameEn: "Taiz" },
      { nameAr: "حضرموت", nameEn: "Hadhramaut" },
      { nameAr: "إب", nameEn: "Ibb" },
    ],
  },
  {
    code: "TR",
    nameAr: "تركيا",
    nameEn: "Turkey",
    defaultCurrency: "TRY",
    defaultTimezone: "Europe/Istanbul",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "إسطنبول",
    regions: [
      { nameAr: "إسطنبول", nameEn: "Istanbul" },
      { nameAr: "أنقرة", nameEn: "Ankara" },
      { nameAr: "إزمير", nameEn: "Izmir" },
      { nameAr: "أنطاليا", nameEn: "Antalya" },
      { nameAr: "بورصة", nameEn: "Bursa" },
      { nameAr: "قونية", nameEn: "Konya" },
    ],
  },
  {
    code: "US",
    nameAr: "الولايات المتحدة",
    nameEn: "United States",
    defaultCurrency: "USD",
    defaultTimezone: "America/New_York",
    defaultPrayerCalc: "ISNA - أمريكا الشمالية",
    defaultRegion: "نيويورك",
    regions: [
      { nameAr: "نيويورك", nameEn: "New York", timezone: "America/New_York" },
      { nameAr: "كاليفورنيا", nameEn: "California", timezone: "America/Los_Angeles" },
      { nameAr: "تكساس", nameEn: "Texas", timezone: "America/Chicago" },
      { nameAr: "فلوريدا", nameEn: "Florida", timezone: "America/New_York" },
      { nameAr: "إلينوي", nameEn: "Illinois", timezone: "America/Chicago" },
      { nameAr: "ميشيغان", nameEn: "Michigan", timezone: "America/Detroit" },
      { nameAr: "ماساتشوستس", nameEn: "Massachusetts", timezone: "America/New_York" },
      { nameAr: "واشنطن", nameEn: "Washington", timezone: "America/Los_Angeles" },
    ],
  },
  {
    code: "GB",
    nameAr: "المملكة المتحدة",
    nameEn: "United Kingdom",
    defaultCurrency: "GBP",
    defaultTimezone: "Europe/London",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "لندن الكبرى",
    regions: [
      { nameAr: "لندن الكبرى", nameEn: "Greater London" },
      { nameAr: "مانشستر الكبرى", nameEn: "Greater Manchester" },
      { nameAr: "ويست ميدلاندز (برمنغهام)", nameEn: "West Midlands" },
      { nameAr: "اسكتلندا (إدنبرة)", nameEn: "Scotland" },
      { nameAr: "ويلز (كارديف)", nameEn: "Wales" },
      { nameAr: "أيرلندا الشمالية", nameEn: "Northern Ireland" },
    ],
  },
  {
    code: "DE",
    nameAr: "ألمانيا",
    nameEn: "Germany",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "برلين",
    regions: [
      { nameAr: "برلين", nameEn: "Berlin" },
      { nameAr: "بافاريا (ميونخ)", nameEn: "Bavaria" },
      { nameAr: "شمال الراين-وستفاليا", nameEn: "North Rhine-Westphalia" },
      { nameAr: "هامبورغ", nameEn: "Hamburg" },
      { nameAr: "هيسن (فرانكفورت)", nameEn: "Hesse" },
      { nameAr: "بادن-فورتمبيرغ", nameEn: "Baden-Württemberg" },
    ],
  },
  {
    code: "FR",
    nameAr: "فرنسا",
    nameEn: "France",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Paris",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "إيل دو فرانس (باريس)",
    regions: [
      { nameAr: "إيل دو فرانس (باريس)", nameEn: "Île-de-France" },
      { nameAr: "أوفرن-رون ألب (ليون)", nameEn: "Auvergne-Rhône-Alpes" },
      { nameAr: "بروفانس ألب كوت دازور (مارسيليا)", nameEn: "Provence-Alpes-Côte d'Azur" },
      { nameAr: "أوكسيتانيا (تولوز)", nameEn: "Occitanie" },
      { nameAr: "أوت دو فرانس", nameEn: "Hauts-de-France" },
    ],
  },
  {
    code: "ES",
    nameAr: "إسبانيا",
    nameEn: "Spain",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Madrid",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "مدريد",
    regions: [
      { nameAr: "مدريد", nameEn: "Madrid" },
      { nameAr: "كتالونيا (برشلونة)", nameEn: "Catalonia" },
      { nameAr: "الأندلس (إشبيلية)", nameEn: "Andalusia" },
      { nameAr: "فالنسيا", nameEn: "Valencia" },
    ],
  },
  {
    code: "IT",
    nameAr: "إيطاليا",
    nameEn: "Italy",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Rome",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "لاتسيو (روما)",
    regions: [
      { nameAr: "لاتسيو (روما)", nameEn: "Lazio" },
      { nameAr: "لومبارديا (ميلانو)", nameEn: "Lombardy" },
      { nameAr: "توسكانا (فلورنسا)", nameEn: "Tuscany" },
      { nameAr: "كامبانيا (نابولي)", nameEn: "Campania" },
    ],
  },
  {
    code: "NL",
    nameAr: "هولندا",
    nameEn: "Netherlands",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Amsterdam",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "شمال هولندا (أمستردام)",
    regions: [
      { nameAr: "شمال هولندا (أمستردام)", nameEn: "North Holland" },
      { nameAr: "جنوب هولندا (روتردام)", nameEn: "South Holland" },
      { nameAr: "أوترخت", nameEn: "Utrecht" },
      { nameAr: "شمال برابنت", nameEn: "North Brabant" },
    ],
  },
  {
    code: "CA",
    nameAr: "كندا",
    nameEn: "Canada",
    defaultCurrency: "CAD",
    defaultTimezone: "America/Toronto",
    defaultPrayerCalc: "ISNA - أمريكا الشمالية",
    defaultRegion: "أونتاريو (تورونتو)",
    regions: [
      { nameAr: "أونتاريو (تورونتو)", nameEn: "Ontario", timezone: "America/Toronto" },
      { nameAr: "كيبك (مونتريال)", nameEn: "Quebec", timezone: "America/Toronto" },
      { nameAr: "كولومبيا البريطانية (فانكوفر)", nameEn: "British Columbia", timezone: "America/Vancouver" },
      { nameAr: "ألبرتا (كالغاري)", nameEn: "Alberta", timezone: "America/Edmonton" },
    ],
  },
  {
    code: "AU",
    nameAr: "أستراليا",
    nameEn: "Australia",
    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "نيو ساوث ويلز (سيدني)",
    regions: [
      { nameAr: "نيو ساوث ويلز (سيدني)", nameEn: "New South Wales", timezone: "Australia/Sydney" },
      { nameAr: "فيكتوريا (ملبورن)", nameEn: "Victoria", timezone: "Australia/Melbourne" },
      { nameAr: "كوينزلاند (بريزبان)", nameEn: "Queensland", timezone: "Australia/Brisbane" },
      { nameAr: "أستراليا الغربية (بيرث)", nameEn: "Western Australia", timezone: "Australia/Perth" },
    ],
  },
  {
    code: "MY",
    nameAr: "ماليزيا",
    nameEn: "Malaysia",
    defaultCurrency: "MYR",
    defaultTimezone: "Asia/Kuala_Lumpur",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "كوالالمبور",
    regions: [
      { nameAr: "كوالالمبور", nameEn: "Kuala Lumpur" },
      { nameAr: "سيلانغور", nameEn: "Selangor" },
      { nameAr: "بينانغ", nameEn: "Penang" },
      { nameAr: "جوهور", nameEn: "Johor" },
    ],
  },
  {
    code: "ID",
    nameAr: "إندونيسيا",
    nameEn: "Indonesia",
    defaultCurrency: "IDR",
    defaultTimezone: "Asia/Jakarta",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "جاكرتا",
    regions: [
      { nameAr: "جاكرتا", nameEn: "Jakarta", timezone: "Asia/Jakarta" },
      { nameAr: "جاوة الغربية", nameEn: "West Java", timezone: "Asia/Jakarta" },
      { nameAr: "جاوة الشرقية", nameEn: "East Java", timezone: "Asia/Jakarta" },
      { nameAr: "بالي", nameEn: "Bali", timezone: "Asia/Makassar" },
    ],
  },
  {
    code: "PK",
    nameAr: "باكستان",
    nameEn: "Pakistan",
    defaultCurrency: "PKR",
    defaultTimezone: "Asia/Karachi",
    defaultPrayerCalc: "جامعة العلوم الإسلامية - كراتشي",
    defaultRegion: "إسلام آباد",
    regions: [
      { nameAr: "إسلام آباد", nameEn: "Islamabad" },
      { nameAr: "البنجاب (لاهور)", nameEn: "Punjab" },
      { nameAr: "السند (كراتشي)", nameEn: "Sindh" },
      { nameAr: "خيبر بختونخوا", nameEn: "Khyber Pakhtunkhwa" },
    ],
  },
  {
    code: "CH",
    nameAr: "سويسرا",
    nameEn: "Switzerland",
    defaultCurrency: "CHF",
    defaultTimezone: "Europe/Zurich",
    defaultPrayerCalc: "رابطة العالم الإسلامي",
    defaultRegion: "زيورخ",
    regions: [
      { nameAr: "زيورخ", nameEn: "Zurich" },
      { nameAr: "جنيف", nameEn: "Geneva" },
      { nameAr: "برن", nameEn: "Bern" },
      { nameAr: "بازل", nameEn: "Basel" },
    ],
  },
];

export const COUNTRY_BY_CODE: Record<string, CountryDefinition> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

const CURATED_TIMEZONE_LABELS: Record<string, { labelAr: string; labelEn: string }> = {
  "Africa/Cairo": { labelAr: "القاهرة — مصر", labelEn: "Cairo — Egypt" },
  "Asia/Riyadh": { labelAr: "الرياض — السعودية", labelEn: "Riyadh — Saudi Arabia" },
  "Asia/Dubai": { labelAr: "دبي — الإمارات", labelEn: "Dubai — UAE" },
  "Asia/Qatar": { labelAr: "الدوحة — قطر", labelEn: "Doha — Qatar" },
  "Asia/Kuwait": { labelAr: "الكويت — الكويت", labelEn: "Kuwait — Kuwait" },
  "Asia/Bahrain": { labelAr: "المنامة — البحرين", labelEn: "Bahrain" },
  "Asia/Muscat": { labelAr: "مسقط — عُمان", labelEn: "Muscat — Oman" },
  "Asia/Amman": { labelAr: "عمّان — الأردن", labelEn: "Amman — Jordan" },
  "Asia/Hebron": { labelAr: "الخليل / القدس — فلسطين", labelEn: "Hebron / Jerusalem — Palestine" },
  "Asia/Gaza": { labelAr: "غزة — فلسطين", labelEn: "Gaza — Palestine" },
  "Asia/Beirut": { labelAr: "بيروت — لبنان", labelEn: "Beirut — Lebanon" },
  "Asia/Baghdad": { labelAr: "بغداد — العراق", labelEn: "Baghdad — Iraq" },
  "Asia/Damascus": { labelAr: "دمشق — سوريا", labelEn: "Damascus — Syria" },
  "Asia/Aden": { labelAr: "عدن / صنعاء — اليمن", labelEn: "Aden — Yemen" },
  "Africa/Casablanca": { labelAr: "الدار البيضاء — المغرب", labelEn: "Casablanca — Morocco" },
  "Africa/Algiers": { labelAr: "الجزائر — الجزائر", labelEn: "Algiers — Algeria" },
  "Africa/Tunis": { labelAr: "تونس — تونس", labelEn: "Tunis — Tunisia" },
  "Africa/Tripoli": { labelAr: "طرابلس — ليبيا", labelEn: "Tripoli — Libya" },
  "Africa/Khartoum": { labelAr: "الخرطوم — السودان", labelEn: "Khartoum — Sudan" },
  "Europe/Istanbul": { labelAr: "إسطنبول — تركيا", labelEn: "Istanbul — Turkey" },
  "Europe/London": { labelAr: "لندن — المملكة المتحدة", labelEn: "London — UK" },
  "Europe/Paris": { labelAr: "باريس — فرنسا", labelEn: "Paris — France" },
  "Europe/Berlin": { labelAr: "برلين — ألمانيا", labelEn: "Berlin — Germany" },
  "Europe/Madrid": { labelAr: "مدريد — إسبانيا", labelEn: "Madrid — Spain" },
  "Europe/Rome": { labelAr: "روما — إيطاليا", labelEn: "Rome — Italy" },
  "Europe/Amsterdam": { labelAr: "أمستردام — هولندا", labelEn: "Amsterdam — Netherlands" },
  "Europe/Zurich": { labelAr: "زيورخ — سويسرا", labelEn: "Zurich — Switzerland" },
  "America/New_York": { labelAr: "نيويورك (الساحل الشرقي) — أمريكا", labelEn: "New York (Eastern Time) — US" },
  "America/Chicago": { labelAr: "شيكاغو (الوسطى) — أمريكا", labelEn: "Chicago (Central Time) — US" },
  "America/Detroit": { labelAr: "ديترويت — أمريكا", labelEn: "Detroit — US" },
  "America/Los_Angeles": { labelAr: "لوس أنجلوس (المحيط الهادئ) — أمريكا", labelEn: "Los Angeles (Pacific Time) — US" },
  "America/Toronto": { labelAr: "تورونتو — كندا", labelEn: "Toronto — Canada" },
  "America/Vancouver": { labelAr: "فانكوفر — كندا", labelEn: "Vancouver — Canada" },
  "America/Edmonton": { labelAr: "إدمونتون — كندا", labelEn: "Edmonton — Canada" },
  "Australia/Sydney": { labelAr: "سيدني — أستراليا", labelEn: "Sydney — Australia" },
  "Australia/Melbourne": { labelAr: "ملبورن — أستراليا", labelEn: "Melbourne — Australia" },
  "Asia/Kuala_Lumpur": { labelAr: "كوالالمبور — ماليزيا", labelEn: "Kuala Lumpur — Malaysia" },
  "Asia/Jakarta": { labelAr: "جاكرتا — إندونيسيا", labelEn: "Jakarta — Indonesia" },
  "Asia/Karachi": { labelAr: "كراتشي — باكستان", labelEn: "Karachi — Pakistan" },
  UTC: { labelAr: "التوقيت العالمي المنسق (UTC)", labelEn: "Coordinated Universal Time (UTC)" },
};

const TIMEZONE_TO_COUNTRY_CODE: Record<string, string> = {
  "Africa/Cairo": "EG",
  "Asia/Riyadh": "SA",
  "Asia/Dubai": "AE",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Amman": "JO",
  "Asia/Hebron": "PS",
  "Asia/Gaza": "PS",
  "Asia/Jerusalem": "PS",
  "Asia/Beirut": "LB",
  "Asia/Baghdad": "IQ",
  "Africa/Casablanca": "MA",
  "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN",
  "Africa/Tripoli": "LY",
  "Africa/Khartoum": "SD",
  "Asia/Damascus": "SY",
  "Asia/Aden": "YE",
  "Europe/Istanbul": "TR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Detroit": "US",
  "America/Los_Angeles": "US",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Karachi": "PK",
  "Europe/Zurich": "CH",
};

/**
 * Normalize text for bilingual search (handles Arabic alef/teh marbuta variations and Latin lowercase).
 */
export function normalizeSearchText(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function getCountryByCodeOrName(input?: string | null): CountryDefinition | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  const upper = trimmed.toUpperCase();
  if (COUNTRY_BY_CODE[upper]) return COUNTRY_BY_CODE[upper];

  const norm = normalizeSearchText(trimmed);
  const exact = COUNTRIES.find(
    (c) =>
      normalizeSearchText(c.nameAr) === norm ||
      normalizeSearchText(c.nameEn) === norm ||
      (c.code === "EG" && (norm === "مصر" || norm === "egypt")) ||
      (c.code === "SA" && (norm === "السعوديه" || norm === "ksa" || norm === "saudi")) ||
      (c.code === "AE" && (norm === "الامارات" || norm === "uae"))
  );
  return exact || null;
}

export function getRegionsForCountry(countryCodeOrName?: string | null): AdminRegion[] {
  const country = getCountryByCodeOrName(countryCodeOrName);
  return country ? country.regions : [];
}

export function getDefaultCurrencyForCountry(countryCodeOrName?: string | null): string {
  const country = getCountryByCodeOrName(countryCodeOrName);
  return country ? country.defaultCurrency : "USD";
}

export function getCurrencyDefinition(code?: string | null): CurrencyDefinition {
  const normalized = String(code || "").trim().toUpperCase();
  return (
    CURRENCY_MAP[normalized] || {
      code: normalized || "USD",
      nameAr: normalized || "دولار أمريكي",
      nameEn: normalized || "US Dollar",
      symbolAr: normalized || "$",
      symbolEn: normalized || "$",
      decimals: 2,
    }
  );
}

/**
 * Infer a country definition from a canonical IANA timezone when no explicit country is stored.
 */
export function getCountryFromTimezone(timezone?: string | null): CountryDefinition | null {
  if (!timezone) return null;
  const code = TIMEZONE_TO_COUNTRY_CODE[timezone.trim()];
  if (!code) return null;
  return COUNTRY_BY_CODE[code] || null;
}

/**
 * Compute live DST-aware GMT offset label via Intl.DateTimeFormat without hardcoded offsets.
 */
export function getTimezoneOffsetLabel(timezone: string, atDate: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(atDate);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
    return tzPart || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getTimezoneLabel(timezone: string): { labelAr: string; labelEn: string } {
  const curated = CURATED_TIMEZONE_LABELS[timezone];
  if (curated) return curated;
  const parts = timezone.split("/");
  const city = (parts[parts.length - 1] || timezone).replace(/_/g, " ");
  const region = parts.length > 1 ? parts[0] : "";
  return {
    labelAr: region ? `${city} (${region})` : city,
    labelEn: timezone.replace(/_/g, " "),
  };
}

let cachedTimezoneIds: string[] | null = null;

export function getSupportedTimezoneIds(): string[] {
  if (cachedTimezoneIds) return cachedTimezoneIds;
  const curatedKeys = Object.keys(CURATED_TIMEZONE_LABELS);
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      const supported = Intl.supportedValuesOf("timeZone");
      const set = new Set<string>([...curatedKeys, ...supported]);
      cachedTimezoneIds = Array.from(set);
      return cachedTimezoneIds;
    }
  } catch {
    // Fallback below
  }
  cachedTimezoneIds = curatedKeys;
  return cachedTimezoneIds;
}

export function buildTimezoneOptions(atDate: Date = new Date()): TimezoneOption[] {
  return getSupportedTimezoneIds().map((id) => {
    const { labelAr, labelEn } = getTimezoneLabel(id);
    const offsetLabel = getTimezoneOffsetLabel(id, atDate);
    const regionLabel = id.split("/")[0] || "Other";
    return {
      id,
      labelAr,
      labelEn,
      regionLabel,
      offsetLabel,
      searchTerms: `${id} ${labelAr} ${labelEn} ${offsetLabel}`,
    };
  });
}

/**
 * Format a numeric monetary value using Intl.NumberFormat with the transaction/selected currency.
 * Never defaults blindly to SAR or converts amounts silently.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode?: string | null,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showCode?: boolean;
  }
): string {
  const numeric = Number(amount);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  const currency = getCurrencyDefinition(currencyCode || "EGP");
  const locale = options?.locale || "ar-u-nu-latn";

  const hasFraction = Math.abs(safeValue % 1) > 0.0001;
  const minFrac = options?.minimumFractionDigits ?? (hasFraction ? Math.min(2, currency.decimals) : 0);
  const maxFrac = options?.maximumFractionDigits ?? currency.decimals;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: minFrac,
      maximumFractionDigits: Math.max(minFrac, maxFrac),
    }).format(safeValue);
    return options?.showCode && !formatted.includes(currency.code)
      ? `${formatted} (${currency.code})`
      : formatted;
  } catch {
    const numStr = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: Math.max(minFrac, maxFrac),
    }).format(safeValue);
    return `${numStr} ${currency.symbolAr}`;
  }
}

/**
 * Resolve neutral / detected default preferences (prefers Egypt/Cairo/EGP only when detected or fallback neutral).
 */
export function buildDefaultLocalizationPreferences(detectedTimezone?: string | null): LocalizationPreferences {
  const effectiveTz = detectedTimezone && detectedTimezone !== "UTC" ? detectedTimezone : "Africa/Cairo";
  const detectedCountry = getCountryFromTimezone(effectiveTz) || COUNTRY_BY_CODE["EG"];
  const tz = effectiveTz && isValidIanaTimezone(effectiveTz)
    ? effectiveTz
    : detectedCountry.defaultTimezone;

  return {
    countryCode: detectedCountry.code,
    country: detectedCountry.nameAr,
    governorate: detectedCountry.defaultRegion,
    city: "",
    timezone: tz,
    timezoneAuto: true,
    currency: detectedCountry.defaultCurrency,
    currencyAuto: true,
    prayerCalc: detectedCountry.defaultPrayerCalc,
    prayerTrackingEnabled: true,
    prayerPreferenceConfigured: false,
  };
}

/**
 * Pure transition helper when changing Country.
 * Rules:
 * 1. Recalculate valid administrative regions for the new country.
 * 2. If the current governorate is NOT valid for the new country (or country actually changed), apply country defaultRegion (e.g. EG -> القاهرة).
 * 3. Update suggested timezone if timezoneAuto !== false (or if country changed and timezone belongs to previous country).
 * 4. Update currency ONLY when currencyAuto is true; preserve explicit manual currency overrides!
 */
export function applyCountrySelectionToPreferences<
  T extends Partial<LocalizationPreferences>
>(prev: T, nextCountryCodeOrName: string): T & LocalizationPreferences {
  const target = getCountryByCodeOrName(nextCountryCodeOrName);
  const base = buildDefaultLocalizationPreferences(prev.timezone);
  const current: T & LocalizationPreferences = {
    ...base,
    ...prev,
  } as T & LocalizationPreferences;

  if (!target) return current;

  const countryChanged =
    normalizeSearchText(current.countryCode || "") !== normalizeSearchText(target.code);

  const validRegionMatch = target.regions.find(
    (r) =>
      normalizeSearchText(r.nameAr) === normalizeSearchText(current.governorate || "") ||
      normalizeSearchText(r.nameEn) === normalizeSearchText(current.governorate || "")
  );

  const nextGovernorate = validRegionMatch
    ? validRegionMatch.nameAr
    : target.defaultRegion;

  // Determine whether to clear stale foreign city
  const nextCity = countryChanged ? "" : current.city || "";

  // Update timezone when still automatic or when country changed and timezone matched previous country
  const shouldUpdateTimezone = current.timezoneAuto !== false;
  const nextTimezone = shouldUpdateTimezone
    ? validRegionMatch?.timezone || target.defaultTimezone
    : current.timezone || target.defaultTimezone;

  // Update currency ONLY if automatic
  const isCurrencyAuto = current.currencyAuto !== false;
  const nextCurrency = isCurrencyAuto
    ? target.defaultCurrency
    : current.currency || target.defaultCurrency;

  return {
    ...current,
    countryCode: target.code,
    country: target.nameAr,
    governorate: nextGovernorate,
    city: nextCity,
    timezone: nextTimezone,
    timezoneAuto: shouldUpdateTimezone,
    currency: nextCurrency,
    currencyAuto: isCurrencyAuto,
    prayerCalc: target.defaultPrayerCalc,
  };
}

/**
 * Pure transition helper when selecting a Governorate / Administrative Region.
 */
export function applyGovernorateSelectionToPreferences<
  T extends Partial<LocalizationPreferences>
>(prev: T, governorateName: string): T {
  const country = getCountryByCodeOrName(prev.countryCode || prev.country);
  const region = country?.regions.find(
    (r) =>
      normalizeSearchText(r.nameAr) === normalizeSearchText(governorateName) ||
      normalizeSearchText(r.nameEn) === normalizeSearchText(governorateName)
  );
  const canonicalRegionName = region ? region.nameAr : governorateName;
  const nextTimezone =
    region?.timezone && prev.timezoneAuto !== false ? region.timezone : prev.timezone;

  return {
    ...prev,
    governorate: canonicalRegionName,
    timezone: nextTimezone,
  };
}
