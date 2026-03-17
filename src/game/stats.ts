// ============================================================
// Void Survivors — Persistent Lifetime Stats
// ============================================================

export interface LifetimeStats {
  gamesPlayed: number;
  totalKills: number;
  totalPlaytime: number; // seconds
  totalScore: number;
  highestWave: number;
  highestLevel: number;
  highestCombo: number;
  highestScore: number;
  bossesKilled: number;
}

const STATS_KEY = 'void-survivors-stats';

const DEFAULT_STATS: LifetimeStats = {
  gamesPlayed: 0,
  totalKills: 0,
  totalPlaytime: 0,
  totalScore: 0,
  highestWave: 0,
  highestLevel: 0,
  highestCombo: 0,
  highestScore: 0,
  bossesKilled: 0,
};

export function loadLifetimeStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveLifetimeStats(stats: LifetimeStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function updateLifetimeStats(
  current: LifetimeStats,
  gameResult: {
    kills: number;
    timeSurvived: number;
    score: number;
    wave: number;
    level: number;
    maxCombo: number;
    bossesKilled: number;
  }
): LifetimeStats {
  return {
    gamesPlayed: current.gamesPlayed + 1,
    totalKills: current.totalKills + gameResult.kills,
    totalPlaytime: current.totalPlaytime + gameResult.timeSurvived,
    totalScore: current.totalScore + gameResult.score,
    highestWave: Math.max(current.highestWave, gameResult.wave),
    highestLevel: Math.max(current.highestLevel, gameResult.level),
    highestCombo: Math.max(current.highestCombo, gameResult.maxCombo),
    highestScore: Math.max(current.highestScore, gameResult.score),
    bossesKilled: current.bossesKilled + gameResult.bossesKilled,
  };
}
