/** Minimal in-memory localStorage, so storage code runs in Node. */
export class MemoryStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

/** Installs a fake `window.localStorage` and returns it. */
export function installMemoryStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  Object.assign(globalThis, { window: { localStorage: storage } });
  return storage;
}
