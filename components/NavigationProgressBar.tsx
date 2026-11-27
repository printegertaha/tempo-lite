"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  completeNavigation,
  navigationProgress,
  startNavigation,
  startNavigationForUrl,
} from "@/lib/navigation-progress";

function getAnchorHref(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute("href");
  if (!href) return null;
  if (anchor.hasAttribute("download")) return null;

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return null;

  return href;
}

export default function NavigationProgressBar() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchString = searchParams?.toString() ?? "";
  const currentUrl = searchString ? `${pathname}?${searchString}` : pathname;
  const lastCommittedUrlRef = useRef<string>(currentUrl);
  const hasMountedRef = useRef(false);

  // Subscribe directly to the singleton controller and update DOM via ref
  // to avoid React re-renders on every animation frame.
  useEffect(() => {
    const unsubscribe = navigationProgress.subscribe((snapshot) => {
      const el = barRef.current;
      if (!el) return;

      el.style.transform = `scaleX(${snapshot.progress})`;
      el.style.opacity = snapshot.visible ? "1" : "0";
      el.dataset.status = snapshot.status;
    });

    return unsubscribe;
  }, []);

  // Complete navigation whenever the committed App Router URL changes
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastCommittedUrlRef.current = currentUrl;
      return;
    }

    if (lastCommittedUrlRef.current !== currentUrl) {
      lastCommittedUrlRef.current = currentUrl;
      completeNavigation();
    }
  }, [currentUrl]);

  // Global listeners for <Link>, <a>, browser Back/Forward, and native internal <form> submissions
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = getAnchorHref(anchor);
      if (!href) return;

      startNavigationForUrl(href);
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;

      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submitter = event.submitter as
        | HTMLButtonElement
        | HTMLInputElement
        | null;
      const target = submitter?.formTarget || form.getAttribute("target");
      if (target && target !== "_self") return;

      const rawAction =
        submitter?.getAttribute("formaction") ||
        form.getAttribute("action") ||
        window.location.href;

      startNavigationForUrl(rawAction);
    };

    const handlePopState = () => {
      const nextUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== lastCommittedUrlRef.current) {
        startNavigation();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, false);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, false);
      window.removeEventListener("popstate", handlePopState);
      navigationProgress.reset();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 inset-x-0 z-[200] h-[2.5px] pointer-events-none select-none overflow-hidden"
    >
      <div
        ref={barRef}
        className="athar-nav-progress-bar h-full w-full origin-left rtl:origin-right bg-gradient-to-r from-violet-500 via-fuchsia-400 to-indigo-400 shadow-[0_0_10px_rgba(139,92,246,0.7),0_0_4px_rgba(167,139,250,0.45)] opacity-0"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
