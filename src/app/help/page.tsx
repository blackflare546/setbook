import type { Metadata } from "next";

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
    body: "Search by title or artist, then open a song to read it. Use the song actions to edit, duplicate, or delete a chart.",
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
      "Copy the public link and send it to your musicians.",
      "Republish after making changes to update the same link.",
    ],
    note: "Shared setlists are read-only. Viewers cannot edit or access the owner's private library.",
  },
  {
    title: "Display settings",
    body: "Choose Light, Dark, or System theme. Adjust section, chord, and lyric sizes, line height, and Auto, 1 Column, or 2 Columns chart layout from the chart appearance controls.",
  },
];

export default function HelpPage() {
  return (
    <main className="px-4 py-10 pb-28 sm:px-6 sm:py-14 lg:pb-14">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
          Help
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          How to use SetBook
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          A practical guide to getting your charts ready for rehearsal and the
          stage.
        </p>

        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-xl font-bold">{section.title}</h2>
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
                      className="flex gap-3 leading-7 text-slate-600 dark:text-slate-300"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {section.note && (
                <p className="mt-4 border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-100">
                  {section.note}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
