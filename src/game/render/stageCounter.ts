/**
 * Number of PixiJS stages (each with its own canvas and ticker) alive right now. Kept outside
 * PixiStage.ts so dev and perf tools can read it without loading PixiJS.
 */
let liveStages = 0;

export function getLiveStageCount(): number {
  return liveStages;
}

export function stageCreated(): void {
  liveStages++;
}

export function stageDestroyed(): void {
  liveStages--;
}
