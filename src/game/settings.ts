// ============================================================
// Void Survivors — Game Settings (persisted to localStorage)
// ============================================================

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  screenShake: boolean;
  tutorialHints: boolean;
  showFps: boolean;
  showMinimap: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 1.0,
  muted: false,
  screenShake: true,
  tutorialHints: true,
  showFps: false,
  showMinimap: true,
};

const SETTINGS_KEY = 'void-survivors-settings';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable — silently ignore
  }
}
