import type { TutorialId } from "@/core/tutorials/types";

export const TUTORIAL_COMPLETED_EVENT = "setbook:tutorial-completed";

export interface TutorialCompletedDetail {
  id: TutorialId;
  forced: boolean;
}
