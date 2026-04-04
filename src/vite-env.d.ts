/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPTIMIZELY_GRAPH_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
