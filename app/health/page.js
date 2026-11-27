"use client";

import { Suspense } from "react";
import HealthHubPage from "@/components/health/HealthHubPage";

export default function HealthPage() {
  return (
    <Suspense fallback={null}>
      <HealthHubPage defaultSection="nutrition" />
    </Suspense>
  );
}
