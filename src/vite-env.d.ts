/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Om satt (t.ex. `Dev` i dev-deploy) blir tabbtiteln `{prefix} | Högelids …` */
  readonly VITE_BROWSER_TAB_PREFIX?: string
}

declare const __BUILD_ID__: string
