import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FeedbackToast({
  message,
  tone = "success",
}: {
  message: string | null;
  tone?: "success" | "error";
}) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`pointer-events-none fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-white shadow-2xl md:bottom-6 ${tone === "error" ? "border-rose-500 bg-rose-600 dark:border-rose-400 dark:bg-rose-700" : "border-slate-700 bg-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
    >
      {tone === "error" ? (
        <AlertCircle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}
      {message}
    </div>
  );
}
