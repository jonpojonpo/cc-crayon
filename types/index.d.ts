export type CrayonPrefs = {
  /** Draw replies with crayon's renderer; off hands every reply back to the engine. */
  isEnabled: boolean
  /** Teach the model the markup through the system prompt. */
  isTeaching: boolean
  /** A palette name from THEMES. */
  theme: string
  /** `auto` follows the /config theme; the others force a background. */
  background: 'auto' | 'dark' | 'light'
}

declare module 'claude-code' {
  interface PluginState {
    crayon: {
      prefs: CrayonPrefs
      /** Whether the /config theme is a light one, read at start and on change. */
      isLightTheme: boolean
      /**
       * Streamed lines whose tags were taken out for the engine's live drawing,
       * by the line as shown (trimmed) to the line as written, so the finished
       * block draws with its tags again.
       */
      lines: Record<string, string>
    }
  }
}
