/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client timeout for API requests in ms (default 4000). */
  readonly VITE_API_TIMEOUT_MS?: string;
  /** "true" only in the e2e build (`--mode e2e`): exposes window.__PIRATE_TEST__. */
  readonly VITE_ENABLE_TEST_HOOKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
