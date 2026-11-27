"use client";

import { Suspense } from "react";
import HealthHubPage from "@/components/health/HealthHubPage";

export default function GymPage() {
  return (
    <Suspense fallback={null}>
      <HealthHubPage defaultSection="fitness" />
    </Suspense>
  );
}
