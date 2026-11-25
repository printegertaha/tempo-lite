"use client";

import { useMemo } from "react";
import { MapPin, Save, Loader2 } from "lucide-react";
import SearchableCombobox from "@/components/ui/SearchableCombobox";
import {
  COUNTRIES,
  CURRENCIES,
  applyCountrySelectionToPreferences,
  applyGovernorateSelectionToPreferences,
  buildTimezoneOptions,
  getCountryByCodeOrName,
  getDefaultCurrencyForCountry,
  getRegionsForCountry,
} from "@/lib/localization";

/**
 * Location, administrative region, IANA timezone, currency, and week start settings section.
 */
export default function LocalizationSection({
  profile,
  setProfile,
  isPending,
  onSave,
}) {
  const timezoneOptions = useMemo(
    () =>
      buildTimezoneOptions().map((tz) => ({
        value: tz.id,
        label: tz.labelAr,
        sublabel: tz.id,
        badge: tz.offsetLabel,
        searchText: tz.searchTerms,
      })),
    []
  );

  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: c.nameAr,
        sublabel: c.nameEn,
        badge: c.code,
        searchText: `${c.nameAr} ${c.nameEn} ${c.code}`,
      })),
    []
  );

  const regionOptions = useMemo(
    () =>
      getRegionsForCountry(profile.countryCode || profile.country).map((r) => ({
        value: r.nameAr,
        label: r.nameAr,
        sublabel: r.nameEn,
        searchText: `${r.nameAr} ${r.nameEn}`,
      })),
    [profile.countryCode, profile.country]
  );

  const currencyOptions = useMemo(
    () =>
      CURRENCIES.map((c) => ({
        value: c.code,
        label: `${c.nameAr} (${c.code})`,
        sublabel: c.nameEn,
        badge: c.symbolAr,
        searchText: `${c.code} ${c.nameAr} ${c.nameEn}`,
      })),
    []
  );

  const defaultCountryCurrency = getDefaultCurrencyForCountry(profile.countryCode);

  return (
    <form
      onSubmit={onSave}
      className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              إعدادات الموقع الجغرافي والمنطقة الزمنية
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              تحدد تلقائياً المحافظات، التوقيت المحلي، والعملة الافتراضية
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SearchableCombobox
          id="settings-country-select"
          label="الدولة (Country)"
          value={profile.countryCode}
          options={countryOptions}
          onChange={(nextCode) =>
            setProfile((prev) => applyCountrySelectionToPreferences(prev, nextCode))
          }
          placeholder="اختر الدولة..."
          searchPlaceholder="ابحث باسم الدولة (عربي أو English)..."
          emptyText="لم يتم العثور على دولة مطابقة"
        />

        <SearchableCombobox
          id="settings-governorate-select"
          label="المحافظة / المنطقة الإدارية"
          value={profile.governorate}
          options={regionOptions}
          onChange={(nextGov) =>
            setProfile((prev) => applyGovernorateSelectionToPreferences(prev, nextGov))
          }
          placeholder="اختر المحافظة أو المنطقة..."
          searchPlaceholder="ابحث عن المحافظة (عربي أو English)..."
          emptyText="لا توجد مناطق مطابقة لهذه الدولة"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="settings-city-input"
            className="block text-xs text-slate-400 font-bold mb-2"
          >
            المدينة أو الحي (اختياري)
          </label>
          <input
            id="settings-city-input"
            type="text"
            value={profile.city || ""}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            placeholder="مثال: مدينة نصر، المعادي، الشيخ زايد..."
            className="w-full px-4 py-3 rounded-xl bg-[#0f111a] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <SearchableCombobox
            id="settings-timezone-select"
            label="المنطقة الزمنية (IANA Timezone)"
            value={profile.timezone}
            options={timezoneOptions}
            onChange={(nextTz) =>
              setProfile((prev) => ({
                ...prev,
                timezone: nextTz,
                timezoneAuto: false,
              }))
            }
            placeholder="اختر المنطقة الزمنية..."
            searchPlaceholder="ابحث مثل Africa/Cairo أو القاهرة أو London..."
            emptyText="لا توجد منطقة زمنية مطابقة"
          />
          {!profile.timezoneAuto && (
            <button
              type="button"
              onClick={() => {
                const country = getCountryByCodeOrName(profile.countryCode);
                if (country) {
                  setProfile((prev) => ({
                    ...prev,
                    timezone: country.defaultTimezone,
                    timezoneAuto: true,
                  }));
                }
              }}
              className="mt-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              استعادة توقيت الدولة ({getCountryByCodeOrName(profile.countryCode)?.defaultTimezone})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/70">
        <div>
          <SearchableCombobox
            id="settings-currency-select"
            label="العملة الافتراضية للمعاملات المالية"
            value={profile.currency}
            options={currencyOptions}
            onChange={(nextCode) =>
              setProfile((prev) => ({
                ...prev,
                currency: nextCode,
                currencyAuto: false,
              }))
            }
            placeholder="اختر العملة..."
            searchPlaceholder="ابحث بالكود EGP / SAR / USD أو اسم العملة..."
            emptyText="لا توجد عملة مطابقة"
          />
          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px]">
            <span className="text-zinc-400">
              {profile.currencyAuto
                ? "تُحدَّد تلقائياً عند تغيير الدولة"
                : "عملة مخصصة يدوياً (لن تتغير عند تغيير الدولة)"}
            </span>
            {(!profile.currencyAuto || profile.currency !== defaultCountryCurrency) && (
              <button
                type="button"
                onClick={() =>
                  setProfile((prev) => ({
                    ...prev,
                    currency: defaultCountryCurrency,
                    currencyAuto: true,
                  }))
                }
                className="text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer"
              >
                استعادة عملة الدولة الافتراضية ({defaultCountryCurrency})
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-bold mb-2">
            بداية الأسبوع في التقويم
          </label>
          <select
            value={profile.weekStartDay}
            onChange={(e) =>
              setProfile({ ...profile, weekStartDay: Number(e.target.value) })
            }
            className="w-full px-4 py-3 rounded-xl bg-[#0f111a] border border-white/10 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value={6}>السبت (المعتمد في العالم العربي)</option>
            <option value={0}>الأحد (التقويم المالي والدولي)</option>
            <option value={1}>الاثنين (المعيار الدولي ISO 8601)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-800/80">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isPending ? "جارٍ الحفظ..." : "حفظ إعدادات الموقع والعملة"}</span>
        </button>
      </div>
    </form>
  );
}
