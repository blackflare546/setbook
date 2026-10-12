import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FeedbackToast({
  message,
  tone = "success",
  actionLabel,
  onAction,
  actionBusy = false,
}: {
  message: string | null;
  tone?: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  actionBusy?: boolean;
}) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`${onAction ? "pointer-events-auto" : "pointer-events-none"} fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-white shadow-2xl md:bottom-6 ${tone === "error" ? "border-rose-500 bg-rose-600 dark:border-rose-400 dark:bg-rose-700" : "border-slate-700 bg-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
    >
      {tone === "error" ? (
        <AlertCircle size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={18} aria-hidden="true" />
      )}
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          className="ml-1 min-h-9 rounded-lg border border-white/40 px-3 text-xs font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
          disabled={actionBusy}
          onClick={onAction}
        >
          {actionBusy ? "Restoring…" : actionLabel}
        </button>
      )}
    </div>
  );
}
