// Complete Quran Surahs Dataset (114 Surahs) with Anatomical Heart Mapping
export interface Surah {
  id: number;
  name: string;
  englishName: string;
  ayahCount: number;
  type: "مكية" | "مدنية";
  juz: number;
  zone: string;
  pos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export const QURAN_SURAHS: Surah[] = [
  {
    "id": 1,
    "name": "الفاتحة",
    "englishName": "Al-Fatihah",
    "ayahCount": 7,
    "type": "مكية",
    "juz": 1,
    "zone": "aorta_left",
    "pos": {
      "x": 165,
      "y": 220,
      "w": 70,
      "h": 38
    }
  },
  {
    "id": 2,
    "name": "البقرة",
    "englishName": "Al-Baqarah",
    "ayahCount": 286,
    "type": "مدنية",
    "juz": 1,
    "zone": "aorta_center",
    "pos": {
      "x": 295,
      "y": 205,
      "w": 80,
      "h": 48
    }
  },
  {
    "id": 3,
    "name": "آل عمران",
    "englishName": "Aal-Imran",
    "ayahCount": 200,
    "type": "مدنية",
    "juz": 3,
    "zone": "aorta_left",
    "pos": {
      "x": 185,
      "y": 260,
      "w": 75,
      "h": 36
    }
  },
  {
    "id": 4,
    "name": "النساء",
    "englishName": "An-Nisa",
    "ayahCount": 176,
    "type": "مدنية",
    "juz": 4,
    "zone": "aorta_center",
    "pos": {
      "x": 295,
      "y": 255,
      "w": 78,
      "h": 42
    }
  },
  {
    "id": 5,
    "name": "المائدة",
    "englishName": "Al-Ma'idah",
    "ayahCount": 120,
    "type": "مدنية",
    "juz": 6,
    "zone": "aorta_center",
    "pos": {
      "x": 375,
      "y": 245,
      "w": 68,
      "h": 38
    }
  },
  {
    "id": 6,
    "name": "الأنعام",
    "englishName": "Al-An'am",
    "ayahCount": 165,
    "type": "مكية",
    "juz": 7,
    "zone": "aorta_right",
    "pos": {
      "x": 445,
      "y": 230,
      "w": 76,
      "h": 42
    }
  },
  {
    "id": 7,
    "name": "الأعراف",
    "englishName": "Al-A'raf",
    "ayahCount": 206,
    "type": "مكية",
    "juz": 8,
    "zone": "atrium_left",
    "pos": {
      "x": 280,
      "y": 300,
      "w": 68,
      "h": 32
    }
  },
  {
    "id": 8,
    "name": "الأنفال",
    "englishName": "Al-Anfal",
    "ayahCount": 75,
    "type": "مدنية",
    "juz": 9,
    "zone": "atrium_left",
    "pos": {
      "x": 335,
      "y": 300,
      "w": 58,
      "h": 30
    }
  },
  {
    "id": 9,
    "name": "التوبة",
    "englishName": "At-Tawbah",
    "ayahCount": 129,
    "type": "مدنية",
    "juz": 10,
    "zone": "atrium_left",
    "pos": {
      "x": 115,
      "y": 335,
      "w": 54,
      "h": 32
    }
  },
  {
    "id": 10,
    "name": "يونس",
    "englishName": "Yunus",
    "ayahCount": 109,
    "type": "مكية",
    "juz": 11,
    "zone": "atrium_left",
    "pos": {
      "x": 168,
      "y": 318,
      "w": 52,
      "h": 30
    }
  },
  {
    "id": 11,
    "name": "هود",
    "englishName": "Hud",
    "ayahCount": 123,
    "type": "مكية",
    "juz": 11,
    "zone": "atrium_left",
    "pos": {
      "x": 215,
      "y": 315,
      "w": 48,
      "h": 30
    }
  },
  {
    "id": 12,
    "name": "يوسف",
    "englishName": "Yusuf",
    "ayahCount": 111,
    "type": "مكية",
    "juz": 12,
    "zone": "atrium_left",
    "pos": {
      "x": 255,
      "y": 335,
      "w": 52,
      "h": 30
    }
  },
  {
    "id": 13,
    "name": "الرعد",
    "englishName": "Ar-Ra'd",
    "ayahCount": 43,
    "type": "مدنية",
    "juz": 13,
    "zone": "atrium_center",
    "pos": {
      "x": 308,
      "y": 328,
      "w": 52,
      "h": 28
    }
  },
  {
    "id": 14,
    "name": "إبراهيم",
    "englishName": "Ibrahim",
    "ayahCount": 52,
    "type": "مكية",
    "juz": 13,
    "zone": "atrium_right",
    "pos": {
      "x": 368,
      "y": 325,
      "w": 55,
      "h": 28
    }
  },
  {
    "id": 15,
    "name": "الحجر",
    "englishName": "Al-Hijr",
    "ayahCount": 99,
    "type": "مكية",
    "juz": 14,
    "zone": "atrium_right",
    "pos": {
      "x": 420,
      "y": 330,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 16,
    "name": "النحل",
    "englishName": "An-Nahl",
    "ayahCount": 128,
    "type": "مكية",
    "juz": 14,
    "zone": "atrium_center",
    "pos": {
      "x": 280,
      "y": 362,
      "w": 54,
      "h": 28
    }
  },
  {
    "id": 17,
    "name": "الإسراء",
    "englishName": "Al-Isra",
    "ayahCount": 111,
    "type": "مكية",
    "juz": 15,
    "zone": "atrium_right",
    "pos": {
      "x": 338,
      "y": 355,
      "w": 56,
      "h": 28
    }
  },
  {
    "id": 18,
    "name": "الكهف",
    "englishName": "Al-Kahf",
    "ayahCount": 110,
    "type": "مكية",
    "juz": 15,
    "zone": "atrium_right",
    "pos": {
      "x": 395,
      "y": 350,
      "w": 52,
      "h": 28
    }
  },
  {
    "id": 19,
    "name": "مريم",
    "englishName": "Maryam",
    "ayahCount": 98,
    "type": "مكية",
    "juz": 16,
    "zone": "atrium_right",
    "pos": {
      "x": 345,
      "y": 380,
      "w": 52,
      "h": 25
    }
  },
  {
    "id": 20,
    "name": "طه",
    "englishName": "Ta-Ha",
    "ayahCount": 135,
    "type": "مكية",
    "juz": 16,
    "zone": "center",
    "pos": {
      "x": 300,
      "y": 400,
      "w": 48,
      "h": 30
    }
  },
  {
    "id": 21,
    "name": "الأنبياء",
    "englishName": "Al-Anbiya",
    "ayahCount": 112,
    "type": "مكية",
    "juz": 17,
    "zone": "atrium_right",
    "pos": {
      "x": 368,
      "y": 405,
      "w": 52,
      "h": 28
    }
  },
  {
    "id": 22,
    "name": "الحج",
    "englishName": "Al-Hajj",
    "ayahCount": 78,
    "type": "مدنية",
    "juz": 17,
    "zone": "atrium_right",
    "pos": {
      "x": 415,
      "y": 380,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 23,
    "name": "المؤمنون",
    "englishName": "Al-Mu'minun",
    "ayahCount": 118,
    "type": "مكية",
    "juz": 18,
    "zone": "atrium_right",
    "pos": {
      "x": 420,
      "y": 412,
      "w": 55,
      "h": 26
    }
  },
  {
    "id": 24,
    "name": "النور",
    "englishName": "An-Nur",
    "ayahCount": 64,
    "type": "مدنية",
    "juz": 18,
    "zone": "atrium_right",
    "pos": {
      "x": 465,
      "y": 375,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 25,
    "name": "الفرقان",
    "englishName": "Al-Furqan",
    "ayahCount": 77,
    "type": "مكية",
    "juz": 18,
    "zone": "atrium_right",
    "pos": {
      "x": 468,
      "y": 405,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 26,
    "name": "الشعراء",
    "englishName": "Ash-Shu'ara",
    "ayahCount": 227,
    "type": "مكية",
    "juz": 19,
    "zone": "pulmonary",
    "pos": {
      "x": 518,
      "y": 395,
      "w": 52,
      "h": 36
    }
  },
  {
    "id": 27,
    "name": "النمل",
    "englishName": "An-Naml",
    "ayahCount": 93,
    "type": "مكية",
    "juz": 19,
    "zone": "ventricle_left",
    "pos": {
      "x": 80,
      "y": 400,
      "w": 46,
      "h": 32
    }
  },
  {
    "id": 28,
    "name": "القصص",
    "englishName": "Al-Qasas",
    "ayahCount": 88,
    "type": "مكية",
    "juz": 20,
    "zone": "ventricle_left",
    "pos": {
      "x": 115,
      "y": 395,
      "w": 46,
      "h": 30
    }
  },
  {
    "id": 29,
    "name": "العنكبوت",
    "englishName": "Al-Ankabut",
    "ayahCount": 69,
    "type": "مكية",
    "juz": 20,
    "zone": "ventricle_left",
    "pos": {
      "x": 165,
      "y": 380,
      "w": 54,
      "h": 28
    }
  },
  {
    "id": 30,
    "name": "الروم",
    "englishName": "Ar-Rum",
    "ayahCount": 60,
    "type": "مكية",
    "juz": 21,
    "zone": "ventricle_left",
    "pos": {
      "x": 215,
      "y": 375,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 31,
    "name": "لقمان",
    "englishName": "Luqman",
    "ayahCount": 34,
    "type": "مكية",
    "juz": 21,
    "zone": "ventricle_left",
    "pos": {
      "x": 255,
      "y": 385,
      "w": 45,
      "h": 26
    }
  },
  {
    "id": 32,
    "name": "السجدة",
    "englishName": "As-Sajdah",
    "ayahCount": 30,
    "type": "مكية",
    "juz": 21,
    "zone": "center",
    "pos": {
      "x": 322,
      "y": 410,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 33,
    "name": "الأحزاب",
    "englishName": "Al-Ahzab",
    "ayahCount": 73,
    "type": "مدنية",
    "juz": 21,
    "zone": "ventricle_right",
    "pos": {
      "x": 385,
      "y": 440,
      "w": 52,
      "h": 26
    }
  },
  {
    "id": 34,
    "name": "سبأ",
    "englishName": "Saba",
    "ayahCount": 54,
    "type": "مكية",
    "juz": 22,
    "zone": "ventricle_right",
    "pos": {
      "x": 485,
      "y": 432,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 35,
    "name": "فاطر",
    "englishName": "Fatir",
    "ayahCount": 45,
    "type": "مكية",
    "juz": 22,
    "zone": "ventricle_right",
    "pos": {
      "x": 495,
      "y": 460,
      "w": 42,
      "h": 26
    }
  },
  {
    "id": 36,
    "name": "يس",
    "englishName": "Ya-Sin",
    "ayahCount": 83,
    "type": "مكية",
    "juz": 22,
    "zone": "ventricle_right",
    "pos": {
      "x": 540,
      "y": 445,
      "w": 45,
      "h": 32
    }
  },
  {
    "id": 37,
    "name": "الصافات",
    "englishName": "As-Saffat",
    "ayahCount": 182,
    "type": "مكية",
    "juz": 23,
    "zone": "center",
    "pos": {
      "x": 245,
      "y": 425,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 38,
    "name": "ص",
    "englishName": "Sad",
    "ayahCount": 88,
    "type": "مكية",
    "juz": 23,
    "zone": "ventricle_left",
    "pos": {
      "x": 205,
      "y": 430,
      "w": 40,
      "h": 26
    }
  },
  {
    "id": 39,
    "name": "الزمر",
    "englishName": "Az-Zumar",
    "ayahCount": 75,
    "type": "مكية",
    "juz": 23,
    "zone": "center",
    "pos": {
      "x": 280,
      "y": 435,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 40,
    "name": "غافر",
    "englishName": "Ghafir",
    "ayahCount": 85,
    "type": "مكية",
    "juz": 24,
    "zone": "center",
    "pos": {
      "x": 345,
      "y": 450,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 41,
    "name": "فصلت",
    "englishName": "Fussilat",
    "ayahCount": 54,
    "type": "مكية",
    "juz": 24,
    "zone": "ventricle_right",
    "pos": {
      "x": 410,
      "y": 475,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 42,
    "name": "الشورى",
    "englishName": "Ash-Shura",
    "ayahCount": 53,
    "type": "مكية",
    "juz": 25,
    "zone": "ventricle_right",
    "pos": {
      "x": 455,
      "y": 460,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 43,
    "name": "الزخرف",
    "englishName": "Az-Zukhruf",
    "ayahCount": 89,
    "type": "مكية",
    "juz": 25,
    "zone": "ventricle_right",
    "pos": {
      "x": 480,
      "y": 488,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 44,
    "name": "الدخان",
    "englishName": "Ad-Dukhan",
    "ayahCount": 59,
    "type": "مكية",
    "juz": 25,
    "zone": "ventricle_left",
    "pos": {
      "x": 52,
      "y": 455,
      "w": 44,
      "h": 30
    }
  },
  {
    "id": 45,
    "name": "الجاثية",
    "englishName": "Al-Jathiyah",
    "ayahCount": 37,
    "type": "مكية",
    "juz": 25,
    "zone": "ventricle_left",
    "pos": {
      "x": 105,
      "y": 450,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 46,
    "name": "الأحقاف",
    "englishName": "Al-Ahqaf",
    "ayahCount": 35,
    "type": "مكية",
    "juz": 26,
    "zone": "ventricle_left",
    "pos": {
      "x": 155,
      "y": 435,
      "w": 52,
      "h": 30
    }
  },
  {
    "id": 47,
    "name": "محمد",
    "englishName": "Muhammad",
    "ayahCount": 38,
    "type": "مدنية",
    "juz": 26,
    "zone": "center",
    "pos": {
      "x": 235,
      "y": 460,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 48,
    "name": "الفتح",
    "englishName": "Al-Fath",
    "ayahCount": 29,
    "type": "مدنية",
    "juz": 26,
    "zone": "center",
    "pos": {
      "x": 305,
      "y": 468,
      "w": 55,
      "h": 32
    }
  },
  {
    "id": 49,
    "name": "الحجرات",
    "englishName": "Al-Hujurat",
    "ayahCount": 18,
    "type": "مدنية",
    "juz": 26,
    "zone": "center",
    "pos": {
      "x": 350,
      "y": 492,
      "w": 54,
      "h": 28
    }
  },
  {
    "id": 50,
    "name": "ق",
    "englishName": "Qaf",
    "ayahCount": 45,
    "type": "مكية",
    "juz": 26,
    "zone": "ventricle_right",
    "pos": {
      "x": 425,
      "y": 510,
      "w": 44,
      "h": 28
    }
  },
  {
    "id": 51,
    "name": "الذاريات",
    "englishName": "Adh-Dhariyat",
    "ayahCount": 60,
    "type": "مكية",
    "juz": 26,
    "zone": "ventricle_right",
    "pos": {
      "x": 480,
      "y": 518,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 52,
    "name": "الطور",
    "englishName": "At-Tur",
    "ayahCount": 49,
    "type": "مكية",
    "juz": 27,
    "zone": "ventricle_left",
    "pos": {
      "x": 55,
      "y": 495,
      "w": 44,
      "h": 30
    }
  },
  {
    "id": 53,
    "name": "النجم",
    "englishName": "An-Najm",
    "ayahCount": 62,
    "type": "مكية",
    "juz": 27,
    "zone": "ventricle_left",
    "pos": {
      "x": 105,
      "y": 485,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 54,
    "name": "القمر",
    "englishName": "Al-Qamar",
    "ayahCount": 55,
    "type": "مكية",
    "juz": 27,
    "zone": "ventricle_left",
    "pos": {
      "x": 150,
      "y": 478,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 55,
    "name": "الرحمن",
    "englishName": "Ar-Rahman",
    "ayahCount": 78,
    "type": "مدنية",
    "juz": 27,
    "zone": "center",
    "pos": {
      "x": 195,
      "y": 485,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 56,
    "name": "الواقعة",
    "englishName": "Al-Waqi'ah",
    "ayahCount": 96,
    "type": "مكية",
    "juz": 27,
    "zone": "center",
    "pos": {
      "x": 255,
      "y": 502,
      "w": 52,
      "h": 28
    }
  },
  {
    "id": 57,
    "name": "الحديد",
    "englishName": "Al-Hadid",
    "ayahCount": 29,
    "type": "مدنية",
    "juz": 27,
    "zone": "center",
    "pos": {
      "x": 380,
      "y": 535,
      "w": 50,
      "h": 28
    }
  },
  {
    "id": 58,
    "name": "المجادلة",
    "englishName": "Al-Mujadila",
    "ayahCount": 22,
    "type": "مدنية",
    "juz": 28,
    "zone": "ventricle_right",
    "pos": {
      "x": 440,
      "y": 545,
      "w": 52,
      "h": 26
    }
  },
  {
    "id": 59,
    "name": "الحشر",
    "englishName": "Al-Hashr",
    "ayahCount": 24,
    "type": "مدنية",
    "juz": 28,
    "zone": "ventricle_right",
    "pos": {
      "x": 475,
      "y": 560,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 60,
    "name": "الممتحنة",
    "englishName": "Al-Mumtahanah",
    "ayahCount": 13,
    "type": "مدنية",
    "juz": 28,
    "zone": "ventricle_left",
    "pos": {
      "x": 115,
      "y": 530,
      "w": 52,
      "h": 28
    }
  },
  {
    "id": 61,
    "name": "الصف",
    "englishName": "As-Saff",
    "ayahCount": 14,
    "type": "مدنية",
    "juz": 28,
    "zone": "ventricle_left",
    "pos": {
      "x": 60,
      "y": 555,
      "w": 42,
      "h": 28
    }
  },
  {
    "id": 62,
    "name": "الجمعة",
    "englishName": "Al-Jumu'ah",
    "ayahCount": 11,
    "type": "مدنية",
    "juz": 28,
    "zone": "center_left",
    "pos": {
      "x": 175,
      "y": 525,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 63,
    "name": "المنافقون",
    "englishName": "Al-Munafiqun",
    "ayahCount": 11,
    "type": "مدنية",
    "juz": 28,
    "zone": "center",
    "pos": {
      "x": 240,
      "y": 538,
      "w": 56,
      "h": 26
    }
  },
  {
    "id": 64,
    "name": "التغابن",
    "englishName": "At-Taghabun",
    "ayahCount": 18,
    "type": "مدنية",
    "juz": 28,
    "zone": "center",
    "pos": {
      "x": 300,
      "y": 545,
      "w": 50,
      "h": 28
    }
  },
  {
    "id": 65,
    "name": "الطلاق",
    "englishName": "At-Talaq",
    "ayahCount": 12,
    "type": "مدنية",
    "juz": 28,
    "zone": "center",
    "pos": {
      "x": 340,
      "y": 565,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 66,
    "name": "التحريم",
    "englishName": "At-Tahrim",
    "ayahCount": 12,
    "type": "مدنية",
    "juz": 28,
    "zone": "ventricle_right",
    "pos": {
      "x": 410,
      "y": 630,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 67,
    "name": "الملك",
    "englishName": "Al-Mulk",
    "ayahCount": 30,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_right",
    "pos": {
      "x": 455,
      "y": 595,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 68,
    "name": "القلم",
    "englishName": "Al-Qalam",
    "ayahCount": 52,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_left",
    "pos": {
      "x": 72,
      "y": 600,
      "w": 42,
      "h": 28
    }
  },
  {
    "id": 69,
    "name": "الحاقة",
    "englishName": "Al-Haqqah",
    "ayahCount": 52,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_left",
    "pos": {
      "x": 118,
      "y": 580,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 70,
    "name": "المعارج",
    "englishName": "Al-Ma'arij",
    "ayahCount": 44,
    "type": "مكية",
    "juz": 29,
    "zone": "center_left",
    "pos": {
      "x": 170,
      "y": 570,
      "w": 50,
      "h": 28
    }
  },
  {
    "id": 71,
    "name": "نوح",
    "englishName": "Nuh",
    "ayahCount": 28,
    "type": "مكية",
    "juz": 29,
    "zone": "center",
    "pos": {
      "x": 230,
      "y": 575,
      "w": 45,
      "h": 30
    }
  },
  {
    "id": 72,
    "name": "الجن",
    "englishName": "Al-Jinn",
    "ayahCount": 28,
    "type": "مكية",
    "juz": 29,
    "zone": "center",
    "pos": {
      "x": 290,
      "y": 585,
      "w": 44,
      "h": 28
    }
  },
  {
    "id": 73,
    "name": "المزمل",
    "englishName": "Al-Muzzammil",
    "ayahCount": 20,
    "type": "مكية",
    "juz": 29,
    "zone": "center",
    "pos": {
      "x": 335,
      "y": 598,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 74,
    "name": "المدثر",
    "englishName": "Al-Muddaththir",
    "ayahCount": 56,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_right",
    "pos": {
      "x": 435,
      "y": 615,
      "w": 50,
      "h": 26
    }
  },
  {
    "id": 75,
    "name": "القيامة",
    "englishName": "Al-Qiyamah",
    "ayahCount": 40,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_right",
    "pos": {
      "x": 380,
      "y": 600,
      "w": 50,
      "h": 26
    }
  },
  {
    "id": 76,
    "name": "الإنسان",
    "englishName": "Al-Insan",
    "ayahCount": 31,
    "type": "مدنية",
    "juz": 29,
    "zone": "ventricle_left",
    "pos": {
      "x": 95,
      "y": 635,
      "w": 48,
      "h": 28
    }
  },
  {
    "id": 77,
    "name": "المرسلات",
    "englishName": "Al-Mursalat",
    "ayahCount": 50,
    "type": "مكية",
    "juz": 29,
    "zone": "ventricle_left",
    "pos": {
      "x": 140,
      "y": 648,
      "w": 54,
      "h": 28
    }
  },
  {
    "id": 78,
    "name": "النبأ",
    "englishName": "An-Naba",
    "ayahCount": 40,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 185,
      "y": 622,
      "w": 46,
      "h": 28
    }
  },
  {
    "id": 79,
    "name": "النازعات",
    "englishName": "An-Nazi'at",
    "ayahCount": 46,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 230,
      "y": 625,
      "w": 50,
      "h": 26
    }
  },
  {
    "id": 80,
    "name": "عبس",
    "englishName": "Abasa",
    "ayahCount": 42,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 272,
      "y": 632,
      "w": 42,
      "h": 26
    }
  },
  {
    "id": 81,
    "name": "التكوير",
    "englishName": "At-Takwir",
    "ayahCount": 29,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 310,
      "y": 638,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 82,
    "name": "الانفطار",
    "englishName": "Al-Infitar",
    "ayahCount": 19,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 365,
      "y": 635,
      "w": 50,
      "h": 26
    }
  },
  {
    "id": 83,
    "name": "المطففين",
    "englishName": "Al-Mutaffifin",
    "ayahCount": 36,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 415,
      "y": 565,
      "w": 52,
      "h": 26
    }
  },
  {
    "id": 84,
    "name": "الانشقاق",
    "englishName": "Al-Inshiqaq",
    "ayahCount": 25,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 455,
      "y": 645,
      "w": 50,
      "h": 26
    }
  },
  {
    "id": 85,
    "name": "البروج",
    "englishName": "Al-Buruj",
    "ayahCount": 22,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 130,
      "y": 680,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 86,
    "name": "الطارق",
    "englishName": "At-Tariq",
    "ayahCount": 17,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 182,
      "y": 672,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 87,
    "name": "الأعلى",
    "englishName": "Al-A'la",
    "ayahCount": 19,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 190,
      "y": 715,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 88,
    "name": "الغاشية",
    "englishName": "Al-Ghashiyah",
    "ayahCount": 26,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 140,
      "y": 725,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 89,
    "name": "الفجر",
    "englishName": "Al-Fajr",
    "ayahCount": 30,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 235,
      "y": 670,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 90,
    "name": "البلد",
    "englishName": "Al-Balad",
    "ayahCount": 20,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 235,
      "y": 705,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 91,
    "name": "الشمس",
    "englishName": "Ash-Shams",
    "ayahCount": 15,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 345,
      "y": 670,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 92,
    "name": "الليل",
    "englishName": "Al-Layl",
    "ayahCount": 21,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 385,
      "y": 678,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 93,
    "name": "الضحى",
    "englishName": "Ad-Duha",
    "ayahCount": 11,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 435,
      "y": 690,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 94,
    "name": "الشرح",
    "englishName": "Ash-Sharh",
    "ayahCount": 8,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 150,
      "y": 760,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 95,
    "name": "التين",
    "englishName": "At-Tin",
    "ayahCount": 8,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 210,
      "y": 740,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 96,
    "name": "العلق",
    "englishName": "Al-Alaq",
    "ayahCount": 19,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 280,
      "y": 692,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 97,
    "name": "القدر",
    "englishName": "Al-Qadr",
    "ayahCount": 5,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 325,
      "y": 708,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 98,
    "name": "البينة",
    "englishName": "Al-Bayyinah",
    "ayahCount": 8,
    "type": "مدنية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 410,
      "y": 735,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 99,
    "name": "الزلزلة",
    "englishName": "Az-Zalzalah",
    "ayahCount": 8,
    "type": "مدنية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 365,
      "y": 722,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 100,
    "name": "العاديات",
    "englishName": "Al-Adiyat",
    "ayahCount": 11,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 175,
      "y": 785,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 101,
    "name": "القارعة",
    "englishName": "Al-Qari'ah",
    "ayahCount": 11,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 232,
      "y": 770,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 102,
    "name": "التكاثر",
    "englishName": "At-Takathur",
    "ayahCount": 8,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 305,
      "y": 745,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 103,
    "name": "العصر",
    "englishName": "Al-Asr",
    "ayahCount": 3,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 360,
      "y": 760,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 104,
    "name": "الهمزة",
    "englishName": "Al-Humazah",
    "ayahCount": 9,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 282,
      "y": 785,
      "w": 46,
      "h": 26
    }
  },
  {
    "id": 105,
    "name": "الفيل",
    "englishName": "Al-Fil",
    "ayahCount": 5,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 340,
      "y": 795,
      "w": 44,
      "h": 26
    }
  },
  {
    "id": 106,
    "name": "قريش",
    "englishName": "Quraysh",
    "ayahCount": 4,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 400,
      "y": 790,
      "w": 42,
      "h": 26
    }
  },
  {
    "id": 107,
    "name": "الماعون",
    "englishName": "Al-Ma'un",
    "ayahCount": 7,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 210,
      "y": 815,
      "w": 48,
      "h": 26
    }
  },
  {
    "id": 108,
    "name": "الكوثر",
    "englishName": "Al-Kawthar",
    "ayahCount": 3,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 265,
      "y": 825,
      "w": 42,
      "h": 24
    }
  },
  {
    "id": 109,
    "name": "الكافرون",
    "englishName": "Al-Kafirun",
    "ayahCount": 6,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 310,
      "y": 835,
      "w": 48,
      "h": 24
    }
  },
  {
    "id": 110,
    "name": "النصر",
    "englishName": "An-Nasr",
    "ayahCount": 3,
    "type": "مدنية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 368,
      "y": 830,
      "w": 42,
      "h": 24
    }
  },
  {
    "id": 111,
    "name": "المسد",
    "englishName": "Al-Masad",
    "ayahCount": 5,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 220,
      "y": 842,
      "w": 42,
      "h": 24
    }
  },
  {
    "id": 112,
    "name": "الإخلاص",
    "englishName": "Al-Ikhlas",
    "ayahCount": 4,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 255,
      "y": 852,
      "w": 44,
      "h": 24
    }
  },
  {
    "id": 113,
    "name": "الفلق",
    "englishName": "Al-Falaq",
    "ayahCount": 5,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 280,
      "y": 870,
      "w": 42,
      "h": 24
    }
  },
  {
    "id": 114,
    "name": "الناس",
    "englishName": "An-Nas",
    "ayahCount": 6,
    "type": "مكية",
    "juz": 30,
    "zone": "apex_zone",
    "pos": {
      "x": 330,
      "y": 872,
      "w": 42,
      "h": 24
    }
  }
];

export const TOTAL_QURAN_AYAHS = 6236;
export const TOTAL_QURAN_SURAHS = 114;
