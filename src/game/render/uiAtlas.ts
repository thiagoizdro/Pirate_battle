import type { Spritesheet } from 'pixi.js';

export interface LogicalRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRect(value: unknown): value is LogicalRect {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.w === 'number' &&
    typeof value.h === 'number'
  );
}

/**
 * Reads `ui.layout.fill_rect` of a health bar frame from the UI atlas JSON. The atlas stores it
 * in logical (1x) units relative to the sprite's top-left corner, which is also the unit PixiJS
 * uses for frames of a scale-2 sheet. Throws if the metadata is missing, so a broken atlas fails
 * at load time instead of drawing an empty bar.
 */
export function readFillRect(sheet: Spritesheet, frame: string): LogicalRect {
  const frameData: unknown = sheet.data.frames[frame];
  const ui = isRecord(frameData) ? frameData.ui : undefined;
  const layout = isRecord(ui) ? ui.layout : undefined;
  const fillRect = isRecord(layout) ? layout.fill_rect : undefined;
  if (!isRect(fillRect)) throw new Error(`Frame "${frame}" has no ui.layout.fill_rect`);
  return fillRect;
}
