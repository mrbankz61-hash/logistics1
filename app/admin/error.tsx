"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/card";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <ErrorNotice title="This page couldn't load">
        Something went wrong while talking to the database. Check your connection and the Supabase configuration, then
        try again.
        {error.digest && <span className="mt-1 block text-xs text-red-800">Reference: {error.digest}</span>}
      </ErrorNotice>
      <Button variant="outline" onClick={reset}>
        <RotateCcw className="size-4" aria-hidden />
        Try again
      </Button>
    </div>
  );
}
