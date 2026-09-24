"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Copy, ListMusic, Plus, Trash2 } from "lucide-react";
import { setlistRepository } from "@/data/repositories/setlist-repository";
import type { Setlist } from "@/core/setlists/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { deletePublishedSetlistByToken } from "@/lib/sharing/published-client";

export function SetlistList() {
  const router = useRouter();
  const setlists = useLiveQuery(() => setlistRepository.list(), []) ?? [];
  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (!feedback || feedback.tone !== "success") return;
    const timeout = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  async function create() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const setlist: Setlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      venue: "",
      notes: "",
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    await setlistRepository.save(setlist);
    setName("");
    router.push(`/setlists/${setlist.id}`);
  }
  async function deleteSetlist(setlist: Setlist) {
    if (!confirm(`Delete “${setlist.name}”?`)) return;
    setDeletingId(setlist.id);
    setFeedback(null);
    try {
      if (setlist.publishToken) {
        await deletePublishedSetlistByToken(setlist.publishToken);
      }
      await setlistRepository.delete(setlist.id);
      setFeedback({ message: "Setlist deleted", tone: "success" });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Setlist could not be deleted. Please try again.",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 pb-24 min-[375px]:px-4 sm:px-6 sm:py-8 lg:py-10">
      <FeedbackToast
        message={feedback?.message ?? null}
        tone={feedback?.tone}
      />
      <div className="mb-7">
        <p className="mb-1 text-sm font-semibold text-indigo-600">
          Plan the show
        </p>
        <h1 className="text-2xl font-bold tracking-tight min-[375px]:text-3xl">
          Setlists
        </h1>
        <p className="mt-1 text-slate-500">
          Build a running order, choose performance keys, and add cues.
        </p>
      </div>
      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row">
        <Input
          placeholder="New setlist name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <Button onClick={() => void create()} disabled={!name.trim()}>
          <Plus size={17} />
          Create setlist
        </Button>
      </Card>
      {setlists.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {setlists.map((setlist) => (
            <Card key={setlist.id} className="group p-5">
              <div className="mb-5 flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ListMusic size={21} />
                </span>
                <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void setlistRepository.duplicate(setlist.id)}
                  >
                    <Copy size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${setlist.name}`}
                    disabled={deletingId === setlist.id}
                    onClick={() => void deleteSetlist(setlist)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <Link href={`/setlists/${setlist.id}`}>
                <h2 className="break-words text-lg font-bold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {setlist.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {setlist.entries.length}{" "}
                  {setlist.entries.length === 1 ? "song" : "songs"}
                  {setlist.venue ? ` · ${setlist.venue}` : ""}
                </p>
                {setlist.date && (
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <CalendarDays size={14} />
                    {new Date(`${setlist.date}T00:00:00`).toLocaleDateString()}
                  </p>
                )}
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid min-h-72 place-items-center p-8 text-center">
          <div>
            <ListMusic className="mx-auto mb-3 text-indigo-500" size={34} />
            <h2 className="font-bold">No setlists yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Name your next show above to get started.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
