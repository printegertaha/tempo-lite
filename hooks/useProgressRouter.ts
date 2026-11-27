"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startNavigation,
  startNavigationForUrl,
} from "@/lib/navigation-progress";

export function useProgressRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push(href: string, options?: Parameters<typeof router.push>[1]) {
        startNavigationForUrl(href);
        router.push(href, options);
      },
      replace(href: string, options?: Parameters<typeof router.replace>[1]) {
        startNavigationForUrl(href);
        router.replace(href, options);
      },
      back() {
        startNavigation();
        router.back();
      },
      forward() {
        startNavigation();
        router.forward();
      },
    }),
    [router]
  );
}
