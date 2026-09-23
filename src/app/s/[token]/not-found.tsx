import Link from "next/link";
export default function SharedNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">Setlist not found</h1>
        <p className="mt-2 text-slate-400">
          This link may be incorrect or the setlist is no longer published.
        </p>
        <Link
          className="mt-5 inline-block text-sm font-semibold text-indigo-400"
          href="/"
        >
          Open SetBook
        </Link>
      </div>
    </main>
  );
}
