import { MUSICAL_KEYS } from "@/core/chords/keys";
import { cn } from "@/lib/utils";

export function MusicalKeySelect({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-medium text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950 sm:h-10 sm:text-sm",
        className,
      )}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Not set</option>
      <optgroup label="Major keys">
        {MUSICAL_KEYS.filter((key) => key.mode === "major").map((key) => (
          <option key={key.value} value={key.value}>
            {key.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Minor keys">
        {MUSICAL_KEYS.filter((key) => key.mode === "minor").map((key) => (
          <option key={key.value} value={key.value}>
            {key.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
