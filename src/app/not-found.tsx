import type { Metadata } from "next";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-12">
      <Card className="w-full max-w-lg p-6 text-center sm:p-8">
        <MapPinOff
          className="mx-auto text-slate-400"
          size={30}
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em]">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
          This address does not point to a SetBook screen. Your local songs and
          setlists are still safe on this device.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <Link href="/help">Open help</Link>
          </Button>
          <Button asChild>
            <Link href="/library">Back to library</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
