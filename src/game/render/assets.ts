import { Assets, type Spritesheet, type Texture, type UnresolvedAsset } from 'pixi.js';

/** The three atlases the arena needs. Loaded once and reused by every match (R64). */
export interface GameAssets {
  ships: Spritesheet;
  tiles: Spritesheet;
  ui: Spritesheet;
}

type SheetName = keyof GameAssets;

const SHEET_NAMES: readonly SheetName[] = ['ships', 'tiles', 'ui'];

function sheetUrl(name: SheetName): string {
  return `${import.meta.env.BASE_URL}assets/sheets/${name}.json`;
}

/**
 * Loads all atlases and reports progress from 0 to 1.
 * PixiJS caches what loaded successfully and forgets what failed, so calling this again
 * after an error only retries the missing files.
 */
export async function loadGameAssets(onProgress: (progress: number) => void): Promise<GameAssets> {
  const requests: UnresolvedAsset[] = SHEET_NAMES.map((name) => ({
    alias: name,
    src: sheetUrl(name),
  }));
  const loaded = await Assets.load<Spritesheet>(requests, onProgress);
  const sheet = (name: SheetName): Spritesheet => {
    const value = loaded[name];
    if (!value) throw new Error(`Spritesheet "${name}" did not load`);
    return value;
  };
  return { ships: sheet('ships'), tiles: sheet('tiles'), ui: sheet('ui') };
}

/** Looks up a frame and fails loudly if the name is wrong, instead of drawing an empty sprite. */
export function frameTexture(sheet: Spritesheet, frame: string): Texture {
  const texture = sheet.textures[frame];
  if (!texture) throw new Error(`Missing frame "${frame}"`);
  return texture;
}
