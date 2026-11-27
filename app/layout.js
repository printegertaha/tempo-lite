import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import GlobalTaskTimerBar from "@/components/timer/GlobalTaskTimerBar";
import NavigationProgressBar from "@/components/NavigationProgressBar";
import { AtharProvider } from "@/components/context/AtharContext";
import Toast from "@/components/Toast";
import PwaRegister from "@/components/pwa/PwaRegister";
import GuestImportModal from "@/components/auth/GuestImportModal";
import OnboardingGate from "@/components/auth/OnboardingGate";
import "./globals.css";

export const metadata = {
  title: "Athar - أثـر ",
  description:
    "دوّن وتابع مسار حياتك كلها في مكان واحد، واجعل من أيامك وعاداتك أثراً باقياً واستثماراً في ذاتك.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "أثـر",
  },
};

export const viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      className="dark scroll-smooth"
    >
      <body
        className="min-h-screen bg-[#08090d] text-zinc-100 antialiased selection:bg-violet-500/25 selection:text-violet-200 flex flex-col relative overflow-x-hidden"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif",
        }}
      >
        <AtharProvider>
          <Suspense fallback={null}>
            <NavigationProgressBar />
          </Suspense>
          {/* Atmospheric ambient glow layers */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-violet-600/7 rounded-full blur-[140px]" />
            <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 right-10 w-[600px] h-[600px] bg-emerald-600/4 rounded-full blur-[150px]" />
            <div 
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          <OnboardingGate>
            <div className="relative z-10 flex flex-col min-h-screen">
              <Suspense fallback={<div className="h-16 sm:h-20 w-full bg-[#090b11]" />}>
                <Navbar />
              </Suspense>
              <GlobalTaskTimerBar />
              <main className="flex-1 pb-24 lg:pb-16">
                {children}
              </main>
              {/* Mobile Bottom Navigation */}
              <Suspense fallback={null}>
                <MobileBottomNav />
              </Suspense>
            </div>
          </OnboardingGate>

          <Toast />
          <PwaRegister />
          <GuestImportModal />
        </AtharProvider>
      </body>
    </html>
  );
}
