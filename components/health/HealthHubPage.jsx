"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter } from "@/hooks/useProgressRouter";
import HealthSidebar, {
  HEALTH_SECTIONS,
  VALID_HEALTH_SECTION_IDS,
  resolveHealthSubSection,
} from "@/components/health/HealthSidebar";
import NutritionSection from "@/components/health/NutritionSection";
import WaterSection from "@/components/health/WaterSection";
import FitnessSection from "@/components/health/FitnessSection";

export default function HealthHubPage({ defaultSection = "nutrition", defaultSub = null }) {
  const router = useProgressRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSection = searchParams.get("section");
  const activeSection = VALID_HEALTH_SECTION_IDS.has(rawSection)
    ? rawSection
    : VALID_HEALTH_SECTION_IDS.has(defaultSection)
      ? defaultSection
      : "nutrition";

  const rawSub = searchParams.get("sub");
  const activeSubSection = resolveHealthSubSection(activeSection, rawSub || defaultSub);

  const activeMeta =
    HEALTH_SECTIONS.find((s) => s.id === activeSection) || HEALTH_SECTIONS[0];

  const handleSelectSection = (sectionId, subId = null) => {
    if (!VALID_HEALTH_SECTION_IDS.has(sectionId)) return;
    const resolvedSub = resolveHealthSubSection(sectionId, subId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    if (resolvedSub) {
      params.set("sub", resolvedSub);
    } else {
      params.delete("sub");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6">
        <HealthSidebar
          activeSection={activeSection}
          activeSubSection={activeSubSection}
          onSelectSection={handleSelectSection}
        />

        <section
          aria-label={activeMeta.label}
          className="flex-1 min-w-0"
        >
          {activeSection === "nutrition" && (
            <NutritionSection
              subSection={activeSubSection || "log"}
              onSelectSubSection={(nextSub) => handleSelectSection("nutrition", nextSub)}
            />
          )}
          {activeSection === "water" && <WaterSection />}
          {activeSection === "fitness" && (
            <FitnessSection subSection={activeSubSection || "workouts"} />
          )}
        </section>
      </div>
    </div>
  );
}
