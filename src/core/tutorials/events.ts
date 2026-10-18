import type { TutorialId } from "@/core/tutorials/types";

export const TUTORIAL_COMPLETED_EVENT = "setbook:tutorial-completed";
export const SWIPE_TUTORIAL_STORAGE_KEY =
  "setbook:performance-swipe-tutorial-seen-v1";

export interface TutorialCompletedDetail {
  id: TutorialId;
  forced: boolean;
}
