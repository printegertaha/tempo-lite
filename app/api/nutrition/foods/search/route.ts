import { NextRequest, NextResponse } from "next/server";
import type { FoodCatalogItem } from "@/lib/nutrition/food-catalog";

const FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MAX_CACHE_ENTRIES = 150;

const searchCache = new Map<
  string,
  { expiresAt: number; items: FoodCatalogItem[]; sourceNote: string }
>();

function extractNutrient(foodNutrients: any[], numbers: string[], ids: number[]): number {
  if (!Array.isArray(foodNutrients)) return 0;
  for (const n of foodNutrients) {
    const num = String(n?.nutrientNumber ?? "");
    const id = Number(n?.nutrientId);
    if (numbers.includes(num) || ids.includes(id)) {
      const val = Number(n?.value);
      if (Number.isFinite(val) && val >= 0) return Math.round(val * 100) / 100;
    }
  }
  return 0;
}

function mapFdcFoodToCatalogItem(f: any): FoodCatalogItem {
  const nutrients = Array.isArray(f?.foodNutrients) ? f.foodNutrients : [];
  const calories = extractNutrient(nutrients, ["208", "957", "958"], [1008, 2047, 2048]);
  const protein = extractNutrient(nutrients, ["203"], [1003]);
  const carbs = extractNutrient(nutrients, ["205"], [1005]);
  const fat = extractNutrient(nutrients, ["204"], [1004]);
  const fiber = extractNutrient(nutrients, ["291"], [1079]);
  const sodiumMg = extractNutrient(nutrients, ["307"], [1093]);

  const dataType = String(f?.dataType || "USDA");
  const desc = String(f?.description || "USDA Food");
  const brand = f?.brandOwner ? ` (${f.brandOwner})` : "";

  return {
    id: `usda_fdc_${f.fdcId}`,
    nameAr: `${desc}${brand}`,
    nameEn: desc,
    synonyms: [desc, f?.foodCategory || "", f?.brandOwner || ""].filter(Boolean),
    category: "grains_starches",
    preparationState: dataType,
    preparationLabelAr: dataType,
    per100g: {
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
      fiber,
      sodiumMg,
    },
    source: {
      database: "USDA FoodData Central",
      fdcId: f.fdcId,
      dataType,
      publishedDate: f?.publishedDate || null,
      verificationStatus: "verified",
    },
  };
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const includeBranded = req.nextUrl.searchParams.get("branded") === "true";

  if (q.length < 2) {
    return NextResponse.json(
      { success: false, error: "يرجى إدخال كلمتين أو حرفين على الأقل للبحث في USDA." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const dataTypes = includeBranded
    ? "Foundation,SR Legacy,Survey (FNDDS),Branded"
    : "Foundation,SR Legacy,Survey (FNDDS)";
  const cacheKey = `${q.toLowerCase()}::${dataTypes}`;
  const now = Date.now();

  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(
      {
        success: true,
        cached: true,
        items: cached.items,
        sourceNote: cached.sourceNote,
      },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  }

  const apiKey = process.env.FDC_API_KEY || process.env.USDA_API_KEY || "DEMO_KEY";
  const usingDemoKey = apiKey === "DEMO_KEY";

  try {
    const url = new URL(FDC_BASE_URL);
    url.searchParams.set("query", q);
    url.searchParams.set("dataType", dataTypes);
    url.searchParams.set("pageSize", "15");
    url.searchParams.set("api_key", apiKey);

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (upstream.status === 429) {
      return NextResponse.json(
        {
          success: false,
          rateLimited: true,
          error: usingDemoKey
            ? "تم تجاوز حد البحث المؤقت لمفتاح USDA التجريبي (DEMO_KEY). يمكنك استخدام القائمة المحلية الموثقة أو إضافة FDC_API_KEY في الخادم."
            : "تم تجاوز حد الطلبات المؤقت لخدمة USDA FoodData Central. يرجى المحاولة لاحقاً.",
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `تعذر جلب البيانات من USDA FoodData Central (HTTP ${upstream.status}).`,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const json = await upstream.json();
    const rawFoods = Array.isArray(json?.foods) ? json.foods : [];
    const items = rawFoods.map(mapFdcFoodToCatalogItem);
    const sourceNote = usingDemoKey
      ? "USDA FoodData Central API (DEMO_KEY)"
      : "USDA FoodData Central API";

    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      items,
      sourceNote,
    });

    return NextResponse.json(
      {
        success: true,
        cached: false,
        items,
        sourceNote,
      },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        offlineOrTimeout: true,
        error: err?.message || "تعذر الاتصال بخدمة USDA FoodData Central.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
