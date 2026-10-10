import type { Metadata } from "next";
import { BookOpenCheck, MessageSquareText } from "lucide-react";
import { FeedbackForm } from "@/components/help/feedback-form";
import { PageHeader } from "@/components/ui/page-header";
import { TutorialControls } from "@/components/help/tutorial-controls";

export const metadata: Metadata = { title: "Help" };

const sections = [
  {
    title: "Getting started",
    steps: [
      "Open SetBook and choose Add song.",
      "Enter the song information and paste your chord sheet into Smart Paste.",
      "Review the chart if you want to inspect the detected sections and chords.",
      "Save the song to your local library.",
    ],
  },
  {
    title: "Creating a song",
    body: "Add the title, artist, original key, and optional capo. Paste or type the chart in Smart Paste, then save. Review Chart is available when you want to inspect the result, but it is not required before saving.",
  },
  {
    title: "Smart Paste",
    body: "Paste chord sheets with chords above lyrics, inline chords, section headings, or intentional spacing. SetBook detects the chart structure and keeps chord placement separate from the lyrics.",
  },
  {
    title: "Song Library",
    body: "Search by title, artist, or tag, then open a song to read it. Lists load progressively as you scroll, while search still checks the whole library. Use the song actions to edit, duplicate, share, or delete a chart.",
  },
  {
    title: "Sharing one song offline",
    steps: [
      "Choose Show QR from a song or its Library actions.",
      "On the receiving device, choose Scan song QR in the Song Library and scan with the camera or upload the QR image.",
      "Review the song before importing it. SetBook skips exact duplicates and asks before replacing or keeping a changed match.",
    ],
    note: "The song is stored inside the QR and is not uploaded. If a chart is too large for one QR, download the single-song SetBook file and import it from the same scanner. Back up and Restore backup remain full-library tools.",
  },
  {
    title: "Creating a setlist",
    steps: [
      "Create and name a setlist.",
      "Search for songs and add them.",
      "Arrange the running order.",
      "Choose an independent Performance Key when needed, then save.",
    ],
  },
  {
    title: "Performance View",
    body: "Move through songs with Previous and Next. Use the performance menu for the running order, Band Notes, theme, section/chord/lyric sizes, line height, and chart layout. Transpose controls change the displayed performance key without changing the master song. On supported larger screens, use Fullscreen for a focused chart.",
  },
  {
    title: "Sharing a setlist",
    steps: [
      "Open a setlist and publish it.",
      "Copy the public link or show its QR code to your musicians.",
      "Musicians can scan the QR directly from the Setlists page, then follow the setlist.",
      "After making changes, use Update published setlist to update the same link.",
    ],
    note: "Shared setlists are read-only. Update replaces only the followed shared copy; songs enter a private library only after an explicit Import action.",
  },
  {
    title: "Display settings",
    body: "Choose Light, Dark, or System theme. Adjust section, chord, and lyric sizes, line height, and Auto, 1 Column, or 2 Columns chart layout from the chart appearance controls.",
  },
];

export default function HelpPage() {
  return (
    <main className="px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:py-12 lg:pb-16">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="How to use SetBook"
          description="A practical guide to getting your charts ready for rehearsal and the stage."
          actions={
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
              <BookOpenCheck size={22} aria-hidden="true" />
            </span>
          }
        />

        <div className="grid border-y border-slate-200 md:grid-cols-2 dark:border-slate-800">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border-b border-slate-200 py-7 md:px-7 md:[&:nth-child(odd)]:border-r dark:border-slate-800"
            >
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
                {section.title}
              </h2>
              {section.body && (
                <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
                  {section.body}
                </p>
              )}
              {section.steps && (
                <ol className="mt-4 space-y-3">
                  {section.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-950 font-mono text-[10px] font-semibold text-white dark:bg-slate-800 dark:text-slate-100">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {section.note && (
                <p className="mt-4 rounded-r-lg border-l-2 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-100">
                  {section.note}
                </p>
              )}
            </section>
          ))}
        </div>

        <TutorialControls />

        <section
          className="scroll-mt-24 py-16 sm:py-20"
          aria-labelledby="feedback-heading"
        >
          <div className="mb-7 flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
              <MessageSquareText size={22} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="feedback-heading"
                className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
              >
                Help improve SetBook
              </h2>
              <p className="mt-2 max-w-2xl leading-7 text-slate-600 dark:text-slate-300">
                Found a problem or have an idea? Share what is on your mind.
              </p>
            </div>
          </div>
          <FeedbackForm />
        </section>
      </div>
    </main>
  );
}
