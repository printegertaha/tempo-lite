"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trophy,
  History,
  RotateCcw,
  Sparkles,
  Flame,
  Clock,
  Target,
  Trash2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import AbstinenceLiveCounter from "./AbstinenceLiveCounter";
import CreateAbstinenceModal from "./CreateAbstinenceModal";
import LogRelapseModal from "./LogRelapseModal";
import EditStartTimeModal from "./EditStartTimeModal";
import AbstinenceHistoryList from "./AbstinenceHistoryList";
import { deleteAbstinenceTracker, getAbstinenceTrackers } from "@/actions/abstinence";
import { calculateAbstinenceDuration } from "@/lib/dates";

export default function AbstinenceHub({
  initialTrackers = [],
  initialTimezone = "Asia/Riyadh",
}) {
  const [trackers, setTrackers] = useState(initialTrackers);
  const [selectedTrackerId, setSelectedTrackerId] = useState(
    initialTrackers[0]?.id || ""
  );
  const [timezone] = useState(initialTimezone);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [relapseModalOpen, setRelapseModalOpen] = useState(false);
  const [editStartModalOpen, setEditStartModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active selected tracker object
  const selectedTracker =
    trackers.find((t) => t.id === selectedTrackerId) || trackers[0] || null;

  const refreshData = async () => {
    try {
      const res = await getAbstinenceTrackers();
      if (res.success && res.data) {
        setTrackers(res.data);
        if (!selectedTrackerId && res.data.length > 0) {
          setSelectedTrackerId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error refreshing abstinence data:", err);
    }
  };

  const handleCreated = (newTracker) => {
    refreshData();
    if (newTracker?.id) {
      setSelectedTrackerId(newTracker.id);
    }
  };

  const handleDeleteTracker = async () => {
    if (!selectedTracker) return;
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف هدف الامتناع "${selectedTracker.name}" وكل جلساته السابقة؟`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await deleteAbstinenceTracker(selectedTracker.id);
      if (res.success) {
        const next = trackers.filter((t) => t.id !== selectedTracker.id);
        setTrackers(next);
        setSelectedTrackerId(next[0]?.id || "");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute longest streak formatted string
  const longestDur = selectedTracker
    ? calculateAbstinenceDuration(
        new Date(Date.now() - (selectedTracker.longestStreakSeconds || 0) * 1000),
        new Date()
      )
    : null;

  // Compute total abstinent formatted string
  const totalDur = selectedTracker
    ? calculateAbstinenceDuration(
        new Date(Date.now() - (selectedTracker.totalAbstinentSeconds || 0) * 1000),
        new Date()
      )
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام الامتناع والتعافي (Abstinence Tracking)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">
            سجل الامتناع وإدارة الانتكاسات
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            تتبع دقيق مبني على timestamps حقيقية بالثواني، دون عداد منفصل أو وهمي.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/25 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>هدف امتناع جديد</span>
        </button>
      </div>

      {/* Zero State if user has no goals */}
      {trackers.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-zinc-100">
              ابدأ أول هدف امتناع دقيق الآن
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              حدد سلوكاً ترغب في التوقف عنه (مشاهدة الإباحية، التدخين، السكر، إلخ)، وحدد تاريخ ووقت البداية بدقة لمراقبة تقدمك الحقيقي لحظة بلحظة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-xl shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تأسيس هدفي الأول</span>
          </button>
        </div>
      ) : (
        <>
          {/* Goal Selector Switcher if multiple goals exist */}
          {trackers.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {trackers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrackerId(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedTrackerId === t.id
                      ? "bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-md shadow-rose-500/10"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* 2. Hero Live Abstinence Counter */}
          {selectedTracker && (
            <AbstinenceLiveCounter
              tracker={selectedTracker}
              timezone={timezone}
              onOpenRelapseModal={() => setRelapseModalOpen(true)}
              onOpenEditStartModal={() => setEditStartModalOpen(true)}
            />
          )}

          {/* 3. Analytics & Progress Statistics Grid */}
          {selectedTracker && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Longest Streak Record */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span className="font-semibold">أطول مدة امتناع سابقة</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg sm:text-xl font-black text-zinc-100">
                  {longestDur?.formattedArabic || "0 ثانية"}
                </div>
                <p className="text-[11px] text-zinc-500">
                  أفضل رقم قياسي حققته عبر جميع جلساتك
                </p>
              </div>

              {/* Total Time Spent Abstinent */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span className="font-semibold">إجمالي الوقت الممتنع فيه</span>
                  <Clock className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-lg sm:text-xl font-black text-zinc-100">
                  {totalDur?.formattedArabic || "0 ثانية"}
                </div>
                <p className="text-[11px] text-zinc-500">
                  مجموع كل الجلسات النظيفة منذ بداية رحلتك
                </p>
              </div>

              {/* Number of Relapses */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span className="font-semibold">عدد الانتكاسات المسجلة</span>
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-lg sm:text-xl font-black text-zinc-100 font-mono">
                  {selectedTracker.relapseCount || 0}
                </div>
                <p className="text-[11px] text-zinc-500">
                  كل انتكاسة كانت درساً لمواصلة البناء
                </p>
              </div>
            </div>
          )}

          {/* 4. Session History List */}
          {selectedTracker && (
            <div className="space-y-4">
              <AbstinenceHistoryList
                tracker={selectedTracker}
                timezone={timezone}
              />

              {/* Danger zone: delete tracker */}
              <div className="pt-6 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  إدارة الهدف: {selectedTracker.name}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteTracker}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف هذا الهدف وسجلاته</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateAbstinenceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
        timezone={timezone}
      />

      <LogRelapseModal
        isOpen={relapseModalOpen}
        onClose={() => setRelapseModalOpen(false)}
        tracker={selectedTracker}
        timezone={timezone}
        onRelapseLogged={refreshData}
      />

      <EditStartTimeModal
        isOpen={editStartModalOpen}
        onClose={() => setEditStartModalOpen(false)}
        tracker={selectedTracker}
        timezone={timezone}
        onUpdated={refreshData}
      />
    </div>
  );
}

