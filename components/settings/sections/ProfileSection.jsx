"use client";

import { useState, useEffect, useRef, useId } from "react";
import {
  User,
  Camera,
  Trash2,
  Save,
  Loader2,
  Pencil,
  Check,
  Mail,
} from "lucide-react";
import {
  SALUTATIONS,
  RELIGIONS,
  normalizeSalutation,
  normalizeReligion,
} from "@/lib/onboarding";

const MAX_NAME_LENGTH = 30;

/**
 * Profile & identity settings section (avatar with action menu, inline-editable display name up to 10 chars, read-only email, save/cancel).
 */
export default function ProfileSection({
  profile,
  sessionUser,
  isPending,
  isProfileLoading = false,
  onSaveProfile,
  onProcessAvatarFile,
  onError,
}) {
  const savedName = profile.name || "";
  const savedImage =
    profile.image !== undefined
      ? profile.image || null
      : sessionUser?.image || null;
  const savedSalutation = normalizeSalutation(profile.salutation) || "بشمهندس";
  const savedReligion = normalizeReligion(profile.religion) || "muslim";

  const [draftName, setDraftName] = useState(undefined);
  const [draftImage, setDraftImage] = useState(undefined);
  const [draftSalutation, setDraftSalutation] = useState(undefined);
  const [draftReligion, setDraftReligion] = useState(undefined);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameBeforeEdit, setNameBeforeEdit] = useState("");
  const [nameError, setNameError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const currentName = draftName !== undefined ? draftName : savedName;
  const currentImage = draftImage !== undefined ? draftImage : savedImage;
  const currentSalutation =
    draftSalutation !== undefined ? draftSalutation : savedSalutation;
  const currentReligion =
    draftReligion !== undefined ? draftReligion : savedReligion;

  const avatarContainerRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const avatarMenuId = useId();
  const nameInputId = useId();
  const nameErrorId = useId();

  // Focus and select name input when opening inline edit
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Close avatar menu on outside pointerdown or Escape
  useEffect(() => {
    if (!avatarMenuOpen) return;

    const handlePointerDown = (e) => {
      if (
        avatarContainerRef.current &&
        !avatarContainerRef.current.contains(e.target)
      ) {
        setAvatarMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAvatarMenuOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [avatarMenuOpen]);

  const hasAvatar = Boolean(currentImage);
  const displayEmail = profile.email || sessionUser?.email || "";
  const hasChanges =
    currentName.trim() !== savedName.trim() ||
    (currentImage || null) !== (savedImage || null) ||
    currentSalutation !== savedSalutation ||
    currentReligion !== savedReligion;

  const handleOpenNameEdit = () => {
    setNameBeforeEdit(currentName);
    setNameError("");
    setIsEditingName(true);
  };

  const handleConfirmNameEdit = () => {
    const trimmed = currentName.trim();
    if (!trimmed) {
      setNameError(`يرجى إدخال اسم لا يتجاوز ${MAX_NAME_LENGTH} حرفاً`);
      nameInputRef.current?.focus();
      return;
    }
    setDraftName(trimmed.slice(0, MAX_NAME_LENGTH));
    setNameError("");
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmNameEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftName(nameBeforeEdit);
      setNameError("");
      setIsEditingName(false);
    }
  };

  const handleAvatarMenuKeyDown = (e) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = [
      ...(avatarContainerRef.current?.querySelectorAll('[role="menuitem"]') ||
        []),
    ];
    if (!items.length) return;
    e.preventDefault();
    const current = items.indexOf(document.activeElement);
    let next = 0;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown")
      next = current < 0 ? 0 : (current + 1) % items.length;
    else if (e.key === "ArrowUp")
      next = current <= 0 ? items.length - 1 : current - 1;
    items[next]?.focus();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = onProcessAvatarFile
        ? await onProcessAvatarFile(file)
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("تعذر قراءة ملف الصورة"));
            reader.readAsDataURL(file);
          });
      if (processed) {
        setDraftImage(processed);
      }
    } catch (err) {
      onError?.(err?.message || "تعذر معالجة الصورة المختارة");
    } finally {
      e.target.value = "";
    }
  };

  const handleCancel = () => {
    setDraftName(undefined);
    setDraftImage(undefined);
    setDraftSalutation(undefined);
    setDraftReligion(undefined);
    setNameError("");
    setIsEditingName(false);
    setAvatarMenuOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = currentName.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) {
      setIsEditingName(true);
      setNameError(`يرجى إدخال اسم لا يتجاوز ${MAX_NAME_LENGTH} حرفاً`);
      setTimeout(() => nameInputRef.current?.focus(), 0);
      return;
    }
    setNameError("");
    setIsEditingName(false);
    setAvatarMenuOpen(false);
    setDraftName(undefined);
    setDraftImage(undefined);
    setDraftSalutation(undefined);
    setDraftReligion(undefined);
    onSaveProfile?.({
      name: trimmed,
      image: currentImage || null,
      salutation: currentSalutation,
      religion: currentReligion,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-8 rounded-3xl bg-[#0c0e17]/90 border border-zinc-800/80 shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              الملف التعريفي والهوية
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              تحديث اسمك وصورتك الشخصية
            </p>
          </div>
        </div>
      </div>

      {/* Vertical Profile Identity Card */}
      <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        {/* Avatar with click-to-open action menu */}
        <div ref={avatarContainerRef} className="relative shrink-0">
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={() => setAvatarMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={avatarMenuOpen}
            aria-controls={avatarMenuId}
            aria-label="خيارات الصورة الشخصية"
            className="relative group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e17] cursor-pointer"
          >
            {isProfileLoading ? (
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 animate-pulse border-2 border-zinc-700/60" />
            ) : hasAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentImage}
                alt={currentName || "المستخدم"}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl border-2 border-violet-400/40 object-cover shadow-lg shadow-violet-600/30 transition-opacity group-hover:opacity-90"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-600/30 border-2 border-violet-400/40">
                {currentName?.charAt(0) || "أ"}
              </div>
            )}

            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 -left-1.5 w-8 h-8 rounded-xl bg-violet-600 group-hover:bg-violet-500 border-2 border-[#0c0e17] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            >
              <Camera className="w-4 h-4" />
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {avatarMenuOpen && (
            <div
              id={avatarMenuId}
              role="menu"
              aria-label="خيارات الصورة الشخصية"
              onKeyDown={handleAvatarMenuKeyDown}
              className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 z-30 min-w-[170px] p-1.5 rounded-2xl bg-[#121524] border border-zinc-700/80 shadow-2xl shadow-black/60 space-y-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-100 hover:bg-violet-600/20 hover:text-violet-200 focus-visible:outline-none focus-visible:bg-violet-600/25 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-violet-400 shrink-0" />
                <span>تغيير الصورة</span>
              </button>

              {hasAvatar && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDraftImage(null);
                    setAvatarMenuOpen(false);
                    avatarButtonRef.current?.focus();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 focus-visible:outline-none focus-visible:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>حذف الصورة</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Name (max 10 chars, inline edit via pencil on the left) */}
        <div className="w-full max-w-xs space-y-1.5">
          {isProfileLoading ? (
            <div className="relative flex items-center justify-center min-h-[44px] px-10 py-2 rounded-xl bg-zinc-950/50 border border-zinc-800/90">
              <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
            </div>
          ) : isEditingName ? (
            <div className="space-y-1">
              <div className="relative flex items-center">
                <label htmlFor={nameInputId} className="sr-only">
                  اسم المستخدم (بحد أقصى 10 أحرف)
                </label>
                <input
                  ref={nameInputRef}
                  id={nameInputId}
                  type="text"
                  name="displayName"
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  enterKeyHint="done"
                  value={currentName}
                  onChange={(e) => {
                    setDraftName(e.target.value.slice(0, MAX_NAME_LENGTH));
                    if (nameError) setNameError("");
                  }}
                  onKeyDown={handleNameKeyDown}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? nameErrorId : undefined}
                  placeholder="الاسم (10 أحرف كحد أقصى)"
                  className="w-full min-h-[44px] pr-3.5 pl-11 py-2 rounded-xl bg-zinc-950/80 border border-violet-500/70 text-base sm:text-sm font-bold text-zinc-100 text-center focus:outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={handleConfirmNameEdit}
                  aria-label="تأكيد الاسم"
                  title="تأكيد الاسم"
                  className="absolute left-1.5 w-8 h-8 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                <span>بحد أقصى {MAX_NAME_LENGTH} أحرف</span>
                <span className="font-mono" dir="ltr">
                  {currentName.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
              {nameError && (
                <p
                  id={nameErrorId}
                  className="text-[11px] text-rose-400 font-medium"
                >
                  {nameError}
                </p>
              )}
            </div>
          ) : (
            <div className="relative flex items-center justify-center min-h-[44px] px-10 py-2 rounded-xl bg-zinc-950/50 border border-zinc-800/90">
              <span className="text-sm font-bold text-zinc-100 truncate">
                {currentName || "مستخدم أثـر"}
              </span>
              <button
                type="button"
                onClick={handleOpenNameEdit}
                aria-label="تعديل الاسم"
                title="تعديل الاسم"
                className="absolute left-1.5 w-8 h-8 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-violet-500/15 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Non-editable Email */}
        {isProfileLoading ? (
          <div className="flex items-center justify-center">
            <div className="h-3.5 w-44 rounded bg-zinc-800/70 animate-pulse" />
          </div>
        ) : (
          displayEmail && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 select-all">
              <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span dir="ltr" className="font-mono truncate max-w-full">
                {displayEmail}
              </span>
            </div>
          )
        )}
      </div>

      {/* Personalization Controls: Salutation & Religion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-300 block">
           النوع
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SALUTATIONS.map((item) => {
              const selected = currentSalutation === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDraftSalutation(item.value)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selected
                      ? "bg-violet-600/20 border-violet-500 text-violet-200 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-300 block">الديانة</span>
          <div className="grid grid-cols-3 gap-2">
            {RELIGIONS.map((item) => {
              const selected = currentReligion === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDraftReligion(item.value)}
                  data-testid={`settings-religion-${item.value}`}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selected
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-500">
            تغيير هذا الخيار يحدث الواجهة فوراً مع حفظ كافة سجلاتك السابقة دون
            حذف.
          </p>
        </div>
      </div>

      {/* Footer Actions: Cancel on the right, Save Changes on the left (in RTL) */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending || !hasChanges}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          إلغاء
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}</span>
        </button>
      </div>
    </form>
  );
}
