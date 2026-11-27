"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  ListTodo,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { soundManager } from "@/lib/audio";

const NAV_ITEMS = [
  { href: "/", label: "اليوم", icon: Flame },
  { href: "/tasks", label: "المهام", icon: ListTodo },
  { href: "/habits", label: "العادات", icon: Sparkles },
  { href: "/journal", label: "عملت إيه النهارده", icon: BookMarked },
];

const emptySubscribe = () => () => {};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (
    pathname === "/welcome" ||
    pathname?.startsWith("/welcome/") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#0a0c13]/95 border-t border-zinc-800/80 backdrop-blur-xl shadow-2xl pb-safe select-none"
      aria-label="شريط التنقل السفلي للهاتف"
    >
      
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            mounted &&
            (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => soundManager.playClick()}
              className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-150 ${
                isActive
                  ? "text-emerald-400 font-bold scale-105"
                  : "text-zinc-400 hover:text-zinc-200 font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-emerald-400" : "text-zinc-400"
                  }`}
                />
              </div>
              <span className="text-[10px] max-[400px]:text-[9px] tracking-tight whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
