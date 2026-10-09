import Link from "next/link";
import { SetBookLogo } from "@/components/brand/setbook-logo";
import { Button } from "@/components/ui/button";
export default function SharedNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white">
      <div className="max-w-md">
        <SetBookLogo className="mb-8 justify-center text-white" />
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          Setlist not found
        </h1>
        <p className="mt-3 leading-6 text-slate-400">
          This link may be incorrect or the setlist is no longer published.
        </p>
        <Button asChild className="mt-6 dark:bg-white dark:text-slate-950">
          <Link href="/">Open SetBook</Link>
        </Button>
      </div>
    </main>
  );
}
