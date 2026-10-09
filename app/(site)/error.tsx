"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { brand, telHref } from "@/lib/brand";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-slate-700">
        Please try again. If it keeps happening, call us on{" "}
        <a href={telHref(brand.phone)} className="font-semibold text-brand-700 hover:underline">
          {brand.phoneDisplay}
        </a>
        .
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
