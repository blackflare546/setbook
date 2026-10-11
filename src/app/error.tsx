"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected application error", error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-12">
      <Card className="w-full max-w-lg p-6 text-center sm:p-8">
        <AlertTriangle
          className="mx-auto text-amber-500"
          size={30}
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em]">
          This screen could not be opened
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your local songs and setlists were not changed. Try this screen again,
          or return to your library.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-500">
            Error reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <Link href="/library">Back to library</Link>
          </Button>
          <Button type="button" onClick={retry}>
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
