"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Accessible modal built on the native <dialog> element (focus trap and Esc for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id={titleId} className="font-display text-lg font-bold">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-0.5 text-sm text-slate-600">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close dialog"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
