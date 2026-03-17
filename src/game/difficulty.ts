// ============================================================
// Void Survivors — Difficulty System
// ============================================================

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface DifficultyConfig {
  name: string;
  description: string;
  color: string;
  enemyHealthMult: number;
  enemyDamageMult: number;
  enemySpeedMult: number;
  spawnRateMult: number;
  xpMult: number;
  scoreMult: number;
  eliteChanceMult: number;
  bossHealthMult: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    description: 'Relaxed combat for casual play',
    color: '#00ff88',
    enemyHealthMult: 0.6,
    enemyDamageMult: 0.7,
    enemySpeedMult: 0.9,
    spawnRateMult: 0.8,
    xpMult: 1.2,
    scoreMult: 0.5,
    eliteChanceMult: 0.5,
    bossHealthMult: 0.7,
  },
  normal: {
    name: 'Normal',
    description: 'The standard experience',
    color: '#00f0ff',
    enemyHealthMult: 1.0,
    enemyDamageMult: 1.0,
    enemySpeedMult: 1.0,
    spawnRateMult: 1.0,
    xpMult: 1.0,
    scoreMult: 1.0,
    eliteChanceMult: 1.0,
    bossHealthMult: 1.0,
  },
  hard: {
    name: 'Hard',
    description: 'Tougher enemies, better rewards',
    color: '#ff8800',
    enemyHealthMult: 1.5,
    enemyDamageMult: 1.3,
    enemySpeedMult: 1.1,
    spawnRateMult: 1.2,
    xpMult: 0.8,
    scoreMult: 1.5,
    eliteChanceMult: 1.5,
    bossHealthMult: 1.3,
  },
  nightmare: {
    name: 'Nightmare',
    description: 'Only the worthy survive',
    color: '#ff2244',
    enemyHealthMult: 2.5,
    enemyDamageMult: 1.8,
    enemySpeedMult: 1.2,
    spawnRateMult: 1.5,
    xpMult: 0.6,
    scoreMult: 3.0,
    eliteChanceMult: 2.0,
    bossHealthMult: 2.0,
  },
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

const DIFFICULTY_KEY = 'void-survivors-difficulty';

export function loadDifficulty(): Difficulty {
  try {
    const saved = localStorage.getItem(DIFFICULTY_KEY);
    if (saved && saved in DIFFICULTY_CONFIGS) return saved as Difficulty;
  } catch { /* ignore */ }
  return 'normal';
}

export function saveDifficulty(difficulty: Difficulty): void {
  try {
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
  } catch { /* ignore */ }
}

// ── Endless Wave Scaling ─────────────────────────────────────

export interface WaveScaling {
  hpScale: number;
  speedScale: number;
  spawnRateScale: number;
  bossHpScale: number;
  bossCount: number;
  minEliteChance: number;
}

export function getWaveScaling(wave: number): WaveScaling {
  // Base scaling starts after wave 5
  const extraWaves = Math.max(0, wave - 5);

  // HP: 1.15x per wave after 5
  const hpScale = Math.pow(1.15, extraWaves);

  // Speed: 1.02x per wave after 5
  const speedScale = Math.pow(1.02, extraWaves);

  // Spawn rate: 5% faster per wave after 5
  const spawnRateScale = Math.pow(1.05, extraWaves);

  // Boss HP: 1.3x per wave after 5
  const bossHpScale = Math.pow(1.3, extraWaves);

  // Wave 20+: spawn 2 bosses simultaneously
  const bossCount = wave >= 20 ? 2 : 1;

  // Wave 30+: minimum 15% elite chance
  const minEliteChance = wave >= 30 ? 0.15 : 0;

  return {
    hpScale,
    speedScale,
    spawnRateScale,
    bossHpScale,
    bossCount,
    minEliteChance,
  };
}
