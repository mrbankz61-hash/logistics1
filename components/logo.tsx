import clsx from "clsx";
import { brand } from "@/lib/brand";

/** Placeholder mark: a dotted route between two stops. Swap for the real logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("shrink-0", className ?? "size-9")} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-accent-500)" />
      <path
        d="M8.5 23c0-5.2 4.2-5.6 7.5-6.6s7.5-1.6 7.5-6.9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.1 4.3"
      />
      <circle cx="8.5" cy="23" r="3" fill="#fff" />
      <path d="M23.5 6.2a3.6 3.6 0 0 1 3.6 3.6c0 2.6-3.6 6-3.6 6s-3.6-3.4-3.6-6a3.6 3.6 0 0 1 3.6-3.6z" fill="#fff" />
      <circle cx="23.5" cy="9.8" r="1.3" fill="var(--color-accent-500)" />
    </svg>
  );
}

export function Logo({
  className,
  inverted = false,
  subLabel,
}: {
  className?: string;
  inverted?: boolean;
  /** Small monospace line under the name, e.g. "Courier & dispatch". */
  subLabel?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={clsx(
            "font-display text-lg font-extrabold tracking-tight uppercase",
            inverted ? "text-white" : "text-slate-900",
          )}
        >
          {brand.name}
        </span>
        {subLabel && (
          <span
            className={clsx(
              "mt-1 font-mono text-[10px] tracking-[0.28em] uppercase",
              inverted ? "text-slate-400" : "text-slate-500",
            )}
          >
            {subLabel}
          </span>
        )}
      </span>
    </span>
  );
}
