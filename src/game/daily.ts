// ============================================================
// Void Survivors — Daily Challenge System
// ============================================================

export interface DailyModifier {
  type: 'health_mult' | 'damage_mult' | 'speed_mult' | 'spawn_rate_mult' | 'xp_mult' | 'enemy_health_mult';
  value: number;
  label: string;
}

export interface DailyChallenge {
  seed: number;
  date: string;
  modifiers: DailyModifier[];
  title: string;
  description: string;
}

export interface DailyResult {
  date: string;
  score: number;
  wave: number;
  time: number;
  completed: boolean;
}

// ── Predefined challenge templates ──────────────────────────

interface ChallengeTemplate {
  title: string;
  description: string;
  modifiers: DailyModifier[];
}

const CHALLENGE_POOL: ChallengeTemplate[] = [
  {
    title: 'Glass Cannon',
    description: '2x damage, 50% health',
    modifiers: [
      { type: 'damage_mult', value: 2.0, label: '+100% Damage' },
      { type: 'health_mult', value: 0.5, label: '-50% Health' },
    ],
  },
  {
    title: 'Tank Mode',
    description: '50% damage, 2x health, 70% speed',
    modifiers: [
      { type: 'damage_mult', value: 0.5, label: '-50% Damage' },
      { type: 'health_mult', value: 2.0, label: '+100% Health' },
      { type: 'speed_mult', value: 0.7, label: '-30% Speed' },
    ],
  },
  {
    title: 'Speed Demon',
    description: '1.5x speed, 1.3x enemy spawn rate',
    modifiers: [
      { type: 'speed_mult', value: 1.5, label: '+50% Speed' },
      { type: 'spawn_rate_mult', value: 1.3, label: '+30% Spawn Rate' },
    ],
  },
  {
    title: 'XP Feast',
    description: '2x XP, 1.5x enemy health',
    modifiers: [
      { type: 'xp_mult', value: 2.0, label: '+100% XP' },
      { type: 'enemy_health_mult', value: 1.5, label: '+50% Enemy Health' },
    ],
  },
  {
    title: 'Bullet Hell',
    description: '2x spawn rate, 80% enemy health',
    modifiers: [
      { type: 'spawn_rate_mult', value: 2.0, label: '+100% Spawn Rate' },
      { type: 'enemy_health_mult', value: 0.8, label: '-20% Enemy Health' },
    ],
  },
  {
    title: 'Endurance',
    description: '70% XP, 80% damage, 1.5x health',
    modifiers: [
      { type: 'xp_mult', value: 0.7, label: '-30% XP' },
      { type: 'damage_mult', value: 0.8, label: '-20% Damage' },
      { type: 'health_mult', value: 1.5, label: '+50% Health' },
    ],
  },
  {
    title: 'Berserker',
    description: '1.5x damage, 1.5x speed, 60% health',
    modifiers: [
      { type: 'damage_mult', value: 1.5, label: '+50% Damage' },
      { type: 'speed_mult', value: 1.5, label: '+50% Speed' },
      { type: 'health_mult', value: 0.6, label: '-40% Health' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAILY_RESULT_KEY = 'void-survivors-daily-result';

// ── Public API ──────────────────────────────────────────────

export function getTodaysChallenge(): DailyChallenge {
  const date = getTodayDateString();
  const seed = hashCode(date);
  const index = seed % CHALLENGE_POOL.length;
  const template = CHALLENGE_POOL[index];

  return {
    seed,
    date,
    modifiers: template.modifiers,
    title: template.title,
    description: template.description,
  };
}

export function loadDailyResult(): DailyResult | null {
  try {
    const raw = localStorage.getItem(DAILY_RESULT_KEY);
    if (!raw) return null;
    const result: DailyResult = JSON.parse(raw);
    // Only return if it's for today
    if (result.date !== getTodayDateString()) return null;
    return result;
  } catch {
    return null;
  }
}

export function saveDailyResult(result: DailyResult): void {
  try {
    const existing = loadDailyResult();
    // Keep the best score
    if (existing && existing.score >= result.score) return;
    localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
  } catch {
    // localStorage unavailable
  }
}

export function hasTodaysResult(): boolean {
  return loadDailyResult() !== null;
}

export function getModifierValue(modifiers: DailyModifier[], type: DailyModifier['type']): number {
  const mod = modifiers.find(m => m.type === type);
  return mod ? mod.value : 1;
}
