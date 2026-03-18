// ============================================================
// Void Survivors — Game Settings (persisted to localStorage)
// ============================================================

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  screenShakeIntensity: number; // 0–100 (replaces old boolean screenShake)
  tutorialHints: boolean;
  showFps: boolean;
  showMinimap: boolean;
  autoCollectXP: boolean;
  colorblindMode: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 1.0,
  muted: false,
  screenShakeIntensity: 100,
  tutorialHints: true,
  showFps: false,
  showMinimap: true,
  autoCollectXP: false,
  colorblindMode: false,
  reducedMotion: false,
};

const SETTINGS_KEY = 'void-survivors-settings';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);

    // Backward compatibility: convert old boolean screenShake to screenShakeIntensity
    if (typeof parsed.screenShake === 'boolean') {
      parsed.screenShakeIntensity = parsed.screenShake ? 100 : 0;
      delete parsed.screenShake;
    }

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
