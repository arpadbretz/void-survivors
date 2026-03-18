// ============================================================
// Void Survivors — Achievement System
// ============================================================

export interface TrailReward {
  type: 'trail_color';
  value: string;
  name: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: AchievementStats) => boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  reward?: TrailReward;
}

export interface AchievementStats {
  score: number;
  kills: number;
  wave: number;
  level: number;
  combo: number;
  timeSurvived: number;
  gamesPlayed: number;
  totalKills: number;
  totalPlaytime: number;
  bossesKilled: number;
  // New stat fields for boss variants, hazards, abilities, etc.
  titanKills?: number;
  harbingerKills?: number;
  nexusKills?: number;
  bossesKilledThisRun?: number;
  activeHazards?: number;
  phantomKills?: number;
  hasGravityWell?: boolean;
  hasEvolution?: boolean;
  activeAbilities?: number;
  dailyChallengesCompleted?: number;
  dailyChallengeScore?: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // Kill milestones
  { id: 'first_blood', name: 'First Blood', description: 'Kill your first enemy', icon: '\u{1F5E1}\u{FE0F}', tier: 'bronze', condition: (s) => s.kills >= 1 },
  { id: 'exterminator', name: 'Exterminator', description: 'Kill 50 enemies in one run', icon: '\u{1F480}', tier: 'bronze', condition: (s) => s.kills >= 50, reward: { type: 'trail_color', value: '#ff2222', name: 'Crimson Trail' } },
  { id: 'massacre', name: 'Massacre', description: 'Kill 200 enemies in one run', icon: '\u{2620}\u{FE0F}', tier: 'silver', condition: (s) => s.kills >= 200 },
  { id: 'void_cleaner', name: 'Void Cleaner', description: 'Kill 500 enemies in one run', icon: '\u{1F525}', tier: 'gold', condition: (s) => s.kills >= 500, reward: { type: 'trail_color', value: '#9933ff', name: 'Violet Trail' } },

  // Wave milestones
  { id: 'wave_3', name: 'Getting Started', description: 'Reach wave 3', icon: '\u{1F30A}', tier: 'bronze', condition: (s) => s.wave >= 3 },
  { id: 'wave_5', name: 'Survivor', description: 'Reach wave 5', icon: '\u{1F6E1}\u{FE0F}', tier: 'silver', condition: (s) => s.wave >= 5, reward: { type: 'trail_color', value: '#ffd700', name: 'Golden Trail' } },
  { id: 'wave_10', name: 'Veteran', description: 'Reach wave 10', icon: '\u{2B50}', tier: 'gold', condition: (s) => s.wave >= 10 },
  { id: 'wave_15', name: 'Void Walker', description: 'Reach wave 15', icon: '\u{1F451}', tier: 'platinum', condition: (s) => s.wave >= 15 },

  // Combo milestones
  { id: 'combo_10', name: 'Combo Starter', description: 'Reach a 10x combo', icon: '\u{26A1}', tier: 'bronze', condition: (s) => s.combo >= 10 },
  { id: 'combo_25', name: 'Combo Master', description: 'Reach a 25x combo', icon: '\u{1F4A5}', tier: 'silver', condition: (s) => s.combo >= 25 },
  { id: 'combo_50', name: 'Unstoppable', description: 'Reach a 50x combo', icon: '\u{1F31F}', tier: 'gold', condition: (s) => s.combo >= 50, reward: { type: 'trail_color', value: 'prismatic', name: 'Prismatic Trail' } },

  // Score milestones
  { id: 'score_1k', name: 'Score Hunter', description: 'Score 1,000 points', icon: '\u{1F3AF}', tier: 'bronze', condition: (s) => s.score >= 1000 },
  { id: 'score_5k', name: 'High Roller', description: 'Score 5,000 points', icon: '\u{1F48E}', tier: 'silver', condition: (s) => s.score >= 5000 },
  { id: 'score_10k', name: 'Legend', description: 'Score 10,000 points', icon: '\u{1F3C6}', tier: 'gold', condition: (s) => s.score >= 10000 },

  // Time milestones
  { id: 'survive_2min', name: 'Two Minutes', description: 'Survive for 2 minutes', icon: '\u{23F1}\u{FE0F}', tier: 'bronze', condition: (s) => s.timeSurvived >= 120 },
  { id: 'survive_5min', name: 'Endurance', description: 'Survive for 5 minutes', icon: '\u{23F0}', tier: 'silver', condition: (s) => s.timeSurvived >= 300 },
  { id: 'survive_10min', name: 'Marathon', description: 'Survive for 10 minutes', icon: '\u{1F550}', tier: 'gold', condition: (s) => s.timeSurvived >= 600 },

  // Level milestones
  { id: 'level_5', name: 'Leveling Up', description: 'Reach level 5', icon: '\u{1F4C8}', tier: 'bronze', condition: (s) => s.level >= 5 },
  { id: 'level_10', name: 'Powered Up', description: 'Reach level 10', icon: '\u{1F4AA}', tier: 'silver', condition: (s) => s.level >= 10 },
  { id: 'level_20', name: 'Maximum Power', description: 'Reach level 20', icon: '\u{1F680}', tier: 'gold', condition: (s) => s.level >= 20 },

  // Lifetime milestones
  { id: 'games_5', name: 'Regular', description: 'Play 5 games', icon: '\u{1F3AE}', tier: 'bronze', condition: (s) => s.gamesPlayed >= 5 },
  { id: 'games_25', name: 'Dedicated', description: 'Play 25 games', icon: '\u{1F3B2}', tier: 'silver', condition: (s) => s.gamesPlayed >= 25 },
  { id: 'total_kills_500', name: 'Serial Killer', description: 'Kill 500 enemies total', icon: '\u{2694}\u{FE0F}', tier: 'silver', condition: (s) => s.totalKills >= 500 },
  { id: 'total_kills_2000', name: 'Death Machine', description: 'Kill 2,000 enemies total', icon: '\u{1F52B}', tier: 'gold', condition: (s) => s.totalKills >= 2000 },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Kill a boss', icon: '\u{1F479}', tier: 'silver', condition: (s) => s.bossesKilled >= 1, reward: { type: 'trail_color', value: '#ff6600', name: 'Inferno Trail' } },

  // Boss variant achievements
  { id: 'titan_slayer', name: 'Titan Slayer', description: 'Defeat a Titan boss', icon: '\u{1F9BE}', tier: 'silver', condition: (s) => (s.titanKills ?? 0) >= 1 },
  { id: 'harbinger_end', name: "Harbinger's End", description: 'Defeat a Harbinger boss', icon: '\u{1F30C}', tier: 'silver', condition: (s) => (s.harbingerKills ?? 0) >= 1 },
  { id: 'nexus_destroyer', name: 'Nexus Destroyer', description: 'Defeat a Nexus boss', icon: '\u{1F4A0}', tier: 'gold', condition: (s) => (s.nexusKills ?? 0) >= 1 },
  { id: 'boss_rush', name: 'Boss Rush', description: 'Defeat 3 bosses in a single run', icon: '\u{1F3C3}', tier: 'gold', condition: (s) => (s.bossesKilledThisRun ?? 0) >= 3 },

  // Hazard achievements
  { id: 'danger_zone', name: 'Danger Zone', description: 'Survive while 3+ hazards are active', icon: '\u{26A0}\u{FE0F}', tier: 'bronze', condition: (s) => (s.activeHazards ?? 0) >= 3 },
  { id: 'untouchable', name: 'Untouchable', description: 'Reach wave 5 without dying', icon: '\u{1F6E1}\u{FE0F}', tier: 'silver', condition: (s) => s.wave >= 5 },

  // Combat achievements
  { id: 'phantom_hunter', name: 'Phantom Hunter', description: 'Kill 20 phantoms total', icon: '\u{1F47B}', tier: 'silver', condition: (s) => (s.phantomKills ?? 0) >= 20 },
  { id: 'gravity_master', name: 'Gravity Master', description: 'Have Gravity Well ability', icon: '\u{1F300}', tier: 'silver', condition: (s) => s.hasGravityWell === true },
  { id: 'evolution_complete', name: 'Evolution Complete', description: 'Evolve a weapon', icon: '\u{1F9EC}', tier: 'gold', condition: (s) => s.hasEvolution === true },
  { id: 'full_arsenal', name: 'Full Arsenal', description: 'Have 5+ abilities simultaneously', icon: '\u{1F52E}', tier: 'gold', condition: (s) => (s.activeAbilities ?? 0) >= 5 },

  // Daily challenge achievements
  { id: 'daily_player', name: 'Daily Player', description: 'Complete a daily challenge', icon: '\u{1F4C5}', tier: 'bronze', condition: (s) => (s.dailyChallengesCompleted ?? 0) >= 1 },
  { id: 'daily_dedicated', name: 'Dedicated', description: 'Complete 10 daily challenges', icon: '\u{1F4C6}', tier: 'silver', condition: (s) => (s.dailyChallengesCompleted ?? 0) >= 10 },
  { id: 'score_chaser', name: 'Score Chaser', description: 'Score over 10,000 in a daily challenge', icon: '\u{1F3AF}', tier: 'gold', condition: (s) => (s.dailyChallengeScore ?? 0) >= 10000 },

  // Mastery achievements
  { id: 'veteran', name: 'Veteran', description: 'Play 50 total games', icon: '\u{1F396}\u{FE0F}', tier: 'silver', condition: (s) => s.gamesPlayed >= 50 },
  { id: 'void_master', name: 'Void Master', description: 'Reach wave 20', icon: '\u{1F3C5}', tier: 'platinum', condition: (s) => s.wave >= 20, reward: { type: 'trail_color', value: '#2a0040', name: 'Void Trail' } },
];

const STORAGE_KEY = 'void-survivors-achievements';

export class AchievementManager {
  private unlocked: Map<string, UnlockedAchievement> = new Map();
  private pendingNotifications: Achievement[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: UnlockedAchievement[] = JSON.parse(raw);
        for (const u of parsed) {
          this.unlocked.set(u.id, u);
        }
      }
    } catch {
      // ignore
    }
  }

  private save(): void {
    try {
      const arr = Array.from(this.unlocked.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }

  /** Check all achievements against current stats, returns newly unlocked ones */
  check(stats: AchievementStats): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (this.unlocked.has(achievement.id)) continue;

      if (achievement.condition(stats)) {
        this.unlocked.set(achievement.id, {
          id: achievement.id,
          unlockedAt: new Date().toISOString(),
        });
        newlyUnlocked.push(achievement);
        this.pendingNotifications.push(achievement);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
    }

    return newlyUnlocked;
  }

  /** Get next pending notification (for toast display) */
  popNotification(): Achievement | null {
    return this.pendingNotifications.shift() ?? null;
  }

  /** Check if there are pending notifications */
  hasPendingNotifications(): boolean {
    return this.pendingNotifications.length > 0;
  }

  /** Get all achievements with unlock status */
  getAll(): (Achievement & { unlocked: boolean })[] {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: this.unlocked.has(a.id),
    }));
  }

  /** Count unlocked achievements */
  getUnlockedCount(): number {
    return this.unlocked.size;
  }

  /** Total achievement count */
  getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }

  /** Get all unlocked trail rewards */
  getUnlockedTrailRewards(): { reward: TrailReward; achievementName: string }[] {
    const results: { reward: TrailReward; achievementName: string }[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.reward && this.unlocked.has(achievement.id)) {
        results.push({ reward: achievement.reward, achievementName: achievement.name });
      }
    }
    return results;
  }

  /** Get all trail rewards with unlock status */
  getAllTrailRewards(): { reward: TrailReward; achievementName: string; unlocked: boolean }[] {
    const results: { reward: TrailReward; achievementName: string; unlocked: boolean }[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.reward) {
        results.push({
          reward: achievement.reward,
          achievementName: achievement.name,
          unlocked: this.unlocked.has(achievement.id),
        });
      }
    }
    return results;
  }

  /** Get tier color */
  static tierColor(tier: Achievement['tier']): string {
    switch (tier) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
    }
  }
}
