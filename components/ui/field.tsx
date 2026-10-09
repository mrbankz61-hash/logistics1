import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const control =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-xs " +
  "placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25 " +
  "aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/25 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(control, "min-h-20", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={clsx(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/** Builds aria props for a control rendered inside <Field>. */
export function fieldAria(id: string, error?: string, hint?: string) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="text-red-700" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
