import { cn } from "@/lib/utils";

type SetBookMarkProps = {
  className?: string;
  title?: string;
};

export function SetBookMark({ className, title }: SetBookMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="1" width="46" height="46" rx="10.5" fill="#f7f3ea" />
      <path
        d="M5 8.5C11.6 8.5 17.7 10.2 22 13.4V39.8C17.7 36.6 11.6 34.9 5 34.9V8.5Z"
        stroke="#5656d8"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M43 8.5C36.4 8.5 30.3 10.2 26 13.4V39.8C30.3 36.6 36.4 34.9 43 34.9V8.5Z"
        stroke="#5656d8"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 15.1C12.85 15.45 16.05 16.35 18.75 17.75"
        stroke="#5656d8"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M9.25 21.1C12.85 21.45 16.05 22.35 18.75 23.75"
        stroke="#5656d8"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M9.25 27.1C12.85 27.45 16.05 28.35 18.75 29.75"
        stroke="#5656d8"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M30 16.1C32.85 14.95 35.9 14.25 39 14.05V18.25C35.9 18.45 32.85 19.15 30 20.3V16.1Z"
        fill="var(--setbook-mark-accent, #ff5a47)"
      />
      <path
        d="M30 23.25C32.85 22.1 35.9 21.4 39 21.2V25.4C35.9 25.6 32.85 26.3 30 27.45V23.25Z"
        fill="var(--setbook-mark-accent, #ff5a47)"
      />
      <path
        d="M30 30.4C32.85 29.25 35.9 28.55 39 28.35V32.55C35.9 32.75 32.85 33.45 30 34.6V30.4Z"
        fill="var(--setbook-mark-accent, #ff5a47)"
      />
    </svg>
  );
}

type SetBookLogoProps = SetBookMarkProps & {
  compact?: boolean;
};

export function SetBookLogo({
  className,
  compact = false,
  title,
}: SetBookLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SetBookMark className="h-9 w-9" title={title} />
      <span
        className={cn(
          "text-[1.05rem] font-extrabold tracking-[-0.035em]",
          compact && "hidden min-[360px]:inline",
        )}
      >
        Set<span className="text-[#f04f3d]">Book</span>
      </span>
    </span>
  );
}
