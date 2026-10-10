export const TUTORIAL_IDS = [
  "library",
  "song-editor",
  "setlists",
  "setlist-editor",
  "performance",
] as const;

export type TutorialId = (typeof TUTORIAL_IDS)[number];

export const TUTORIAL_VERSIONS: Record<TutorialId, number> = {
  library: 1,
  "song-editor": 1,
  setlists: 1,
  "setlist-editor": 1,
  performance: 1,
};

export type TutorialVersions = Partial<Record<TutorialId, number>>;
