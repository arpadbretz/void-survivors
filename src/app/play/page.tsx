"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types for the engine callbacks
// ---------------------------------------------------------------------------

interface HUDState {
  health: number;
  maxHealth: number;
  level: number;
  wave: number;
  score: number;
  xp: number;
  xpToNext: number;
  time: number;
  paused: boolean;
  abilities: { icon: string; name: string; level: number; color: string; id: string; maxLevel: number; evolved: boolean }[];
  combo: number;
  maxCombo: number;
  dashCooldown: number;
  enemiesKilled: number;
  dps: number;
  streak: number;
}

interface GameOverStats {
  timeSurvived: number;
  score: number;
  level: number;
  enemiesKilled: number;
  wavesSurvived: number;
  maxCombo: number;
  bossesKilled: number;
  titanKills: number;
  harbingerKills: number;
  nexusKills: number;
  phantomKills: number;
  difficulty: string;
  scoreMult: number;
  damageDealt: number;
  damageTaken: number;
  xpCollected: number;
  elitesKilled: number;
  longestCombo: number;
  abilitiesUsed: string[];
  lootCollected: number;
}

interface AchievementToast {
  id: string;
  name: string;
  icon: string;
  tier: string;
  expiresAt: number;
}

type GameScreen = "menu" | "playing" | "paused" | "upgrade" | "gameover" | "achievements" | "stats" | "shop" | "characters" | "daily" | "settings" | "leaderboard";

interface HighScoreEntry {
  score: number;
  level: number;
  wave: number;
  time: number;
  date: string;
}

const HIGHSCORES_KEY = "void-survivors-highscores";
const MAX_HIGHSCORES = 5;

function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HIGHSCORES);
  } catch {
    return [];
  }
}

function saveHighScore(entry: HighScoreEntry): { scores: HighScoreEntry[]; rank: number | null } {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_HIGHSCORES);
  const rank = trimmed.findIndex(
    (s) => s.score === entry.score && s.date === entry.date
  );
  try {
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable — silently ignore
  }
  return { scores: trimmed, rank: rank !== -1 ? rank : null };
}

interface UpgradeChoice {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  color: string;
  synergy?: {
    name: string;
    icon: string;
    color: string;
  };
}

// We expect GameEngine from @/game/engine to follow this interface:
interface GameEngineInterface {
  start: (canvas: HTMLCanvasElement, callbacks: EngineCallbacks) => void;
  cleanup: () => void;
  resume: () => void;
  pause: () => void;
  selectUpgrade: (index: number) => void;
  rerollUpgradeChoices: () => void;
  restart: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  applyDisplaySettings: (settings: { showFps: boolean; showMinimap: boolean; screenShakeIntensity: number; tutorialHints: boolean; autoCollectXP?: boolean; colorblindMode?: boolean; reducedMotion?: boolean }) => void;
  setCharacter: (characterId: string) => void;
  setDailyModifiers: (modifiers: import("@/game/daily").DailyModifier[]) => void;
  setDifficulty: (difficulty: import("@/game/difficulty").Difficulty) => void;
  setTrailColor: (color: string | null) => void;
  startAttractMode: (canvas: HTMLCanvasElement) => void;
  stopAttractMode: () => void;
}

interface EngineCallbacks {
  onStateChange: (state: HUDState) => void;
  onLevelUp: (choices: UpgradeChoice[]) => void;
  onGameOver: (stats: GameOverStats) => void;
  onAchievementCheck?: (stats: {
    score: number;
    kills: number;
    wave: number;
    level: number;
    combo: number;
    timeSurvived: number;
    activeHazards: number;
    activeAbilities: number;
    bossesKilledThisRun: number;
    hasEvolution: boolean;
    hasGravityWell: boolean;
    phantomKills: number;
    titanKills: number;
    harbingerKills: number;
    nexusKills: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Helper: format seconds to MM:SS
// ---------------------------------------------------------------------------
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Share Card Generator — creates a neon-themed canvas image from run stats
// ---------------------------------------------------------------------------
async function generateShareCard(stats: GameOverStats, characterName: string, characterIcon: string): Promise<Blob | null> {
  const W = 600, H = 340;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#08081a");
  bg.addColorStop(1, "#0e0e24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid pattern
  ctx.strokeStyle = "rgba(0,240,255,0.06)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Decorative shapes
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#ff3344";
  ctx.fillRect(30, 50, 12, 12);
  ctx.fillStyle = "#aa44ff";
  ctx.fillRect(W - 50, H - 70, 10, 10);
  ctx.fillStyle = "#ff8800";
  ctx.fillRect(W - 80, 40, 8, 8);
  ctx.globalAlpha = 1;

  // Title
  ctx.textAlign = "center";
  ctx.font = "900 32px system-ui, -apple-system, sans-serif";
  const titleGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  titleGrad.addColorStop(0, "#00f0ff");
  titleGrad.addColorStop(1, "#ff00aa");
  ctx.fillStyle = titleGrad;
  ctx.fillText("VOID SURVIVORS", W / 2, 42);

  // Character badge
  ctx.font = "600 13px monospace";
  ctx.fillStyle = "rgba(224,224,240,0.5)";
  ctx.fillText(`${characterIcon} ${characterName}`, W / 2, 62);

  // Score (big center number)
  ctx.font = "900 52px monospace";
  ctx.fillStyle = "#00eeff";
  ctx.fillText(stats.score.toLocaleString(), W / 2, 120);

  ctx.font = "700 11px monospace";
  ctx.fillStyle = "rgba(224,224,240,0.35)";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("SCORE", W / 2, 138);

  // Stats grid (2 rows x 3 cols)
  const statItems = [
    { label: "WAVE", value: String(stats.wavesSurvived), color: "#00f0ff" },
    { label: "KILLS", value: stats.enemiesKilled.toLocaleString(), color: "#ff00aa" },
    { label: "TIME", value: formatTime(stats.timeSurvived), color: "#00ff88" },
    { label: "LEVEL", value: String(stats.level), color: "#ffdd00" },
    { label: "COMBO", value: `${stats.longestCombo}x`, color: "#ff8800" },
    { label: "DAMAGE", value: stats.damageDealt.toLocaleString(), color: "#aa66ff" },
  ];

  const cols = 3, startY = 170, rowH = 65, colW = W / 3;
  for (let i = 0; i < statItems.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = colW * col + colW / 2;
    const cy = startY + row * rowH;

    // Value
    ctx.font = "800 22px monospace";
    ctx.fillStyle = statItems[i].color;
    ctx.fillText(statItems[i].value, cx, cy);

    // Label
    ctx.font = "600 9px monospace";
    ctx.fillStyle = "rgba(224,224,240,0.3)";
    ctx.fillText(statItems[i].label, cx, cy + 16);
  }

  // CTA
  ctx.font = "600 13px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(224,224,240,0.45)";
  ctx.fillText("Can you beat my score?", W / 2, H - 32);

  // URL
  ctx.font = "600 11px monospace";
  ctx.fillStyle = "rgba(0,240,255,0.4)";
  ctx.fillText("void-survivors.vercel.app", W / 2, H - 14);

  // Border
  ctx.strokeStyle = "rgba(0,240,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Top accent line
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, "transparent");
  accentGrad.addColorStop(0.3, "#00f0ff");
  accentGrad.addColorStop(0.7, "#ff00aa");
  accentGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = accentGrad;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(W, 1); ctx.stroke();

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// ---------------------------------------------------------------------------
// Loading Tips — shown on game over screen
// ---------------------------------------------------------------------------
const LOADING_TIPS: string[] = [
  "Shielders protect nearby enemies \u2014 take them out first!",
  "Combine Chain Lightning + Frost Aura for the Elemental Storm synergy",
  "Higher difficulty = higher score multiplier",
  "The Arcanist deals 25% more damage but gains XP slower",
  "Evolved abilities unlock at max level \u2014 keep upgrading!",
  "Gravity Well + Chain Lightning activates the Death Zone synergy",
  "Play the Daily Challenge for unique modifiers",
  "Earn Void Essence to buy permanent upgrades in the Shop",
  "Dash through enemies with SPACE to dodge attacks",
  "Orbit Shield orbs deal contact damage to nearby enemies",
  "Boss loot drops include Smart Bombs that clear the screen",
  "Phantoms phase in and out \u2014 time your attacks",
  "Life Drain heals you for each enemy hit \u2014 great for survival",
  "Missile Swarm + Auto Cannon triggers the Bullet Hell synergy",
  "Void Beam pierces through ALL enemies in a line",
  "Mini-bosses spawn at milestone waves \u2014 they always drop loot!",
  "You can reroll upgrade choices up to 2 times per level-up",
  "The Chronomancer slows nearby enemies with a time dilation aura",
  "Elite enemies have unique modifiers: swift, vampiric, armored, and more",
  "Check the mini-map in the corner to track enemies and loot",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngineInterface | null>(null);

  const [screen, setScreen] = useState<GameScreen>("menu");
  const [hud, setHud] = useState<HUDState>({
    health: 100,
    maxHealth: 100,
    level: 1,
    wave: 1,
    score: 0,
    xp: 0,
    xpToNext: 100,
    time: 0,
    paused: false,
    abilities: [],
    combo: 0,
    maxCombo: 0,
    dashCooldown: 0,
    enemiesKilled: 0,
    dps: 0,
    streak: 1,
  });
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeChoice[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState(0);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(
    null
  );
  const [gameOverTipIndex, setGameOverTipIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [newHighScoreRank, setNewHighScoreRank] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  // Achievement & stats state
  const achievementManagerRef = useRef<import("@/game/achievements").AchievementManager | null>(null);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<import("@/game/stats").LifetimeStats | null>(null);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all');
  const [allAchievements, setAllAchievements] = useState<(import("@/game/achievements").Achievement & { unlocked: boolean })[]>([]);
  const audioRef = useRef<import("@/game/audio").AudioManager | null>(null);

  // Trail color cosmetic state
  const TRAIL_STORAGE_KEY = "void-survivors-trail-color";
  const [selectedTrailColor, setSelectedTrailColor] = useState<string | null>(null);
  const [trailRewards, setTrailRewards] = useState<{ reward: import("@/game/achievements").TrailReward; achievementName: string; unlocked: boolean }[]>([]);

  // Meta-progression state
  const [metaData, setMetaData] = useState<import("@/game/meta").MetaProgression | null>(null);
  const [lastEssenceEarned, setLastEssenceEarned] = useState(0);

  // Character selection state
  const [selectedCharacter, setSelectedCharacter] = useState<string>("void_walker");
  const [characterDefs, setCharacterDefs] = useState<import("@/game/characters").CharacterDef[]>([]);

  // Daily challenge state
  const [dailyChallenge, setDailyChallenge] = useState<import("@/game/daily").DailyChallenge | null>(null);
  const [dailyResult, setDailyResult] = useState<import("@/game/daily").DailyResult | null>(null);
  const [isDailyMode, setIsDailyMode] = useState(false);

  // Stats tab state
  const [statsTab, setStatsTab] = useState<"overview" | "history">("overview");

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<{ entries: { name: string; score: number; rank: number }[]; total: number } | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"alltime" | "daily">("alltime");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("void-survivors-player-name") || "";
    }
    return "";
  });

  // Difficulty state
  const [selectedDifficulty, setSelectedDifficulty] = useState<import("@/game/difficulty").Difficulty>("normal");
  const [difficultyConfigs, setDifficultyConfigs] = useState<Record<string, import("@/game/difficulty").DifficultyConfig> | null>(null);

  // PWA install prompt state
  const deferredPromptRef = useRef<Event | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Joystick state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickDelta, setJoystickDelta] = useState({ x: 0, y: 0 });
  const joystickCenter = useRef({ x: 0, y: 0 });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings state
  const [gameSettings, setGameSettings] = useState<import("@/game/settings").GameSettings>({
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
  });
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<GameScreen>("menu");

  // Share score state
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");

  // Player name prompt modal state (shown on first game over)
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingNameInput, setPendingNameInput] = useState("");

  // Global leaderboard rank from score submission
  const [globalRank, setGlobalRank] = useState<{ rank: number; total: number } | null>(null);

  // -----------------------------------------------------------------------
  // Load high scores, achievements, and stats on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    const scores = loadHighScores();
    setHighScores(scores);
    if (scores.length > 0) {
      setPersonalBest(scores[0].score);
    }

    // Load saved character selection
    try {
      const savedChar = localStorage.getItem("void-survivors-character");
      if (savedChar) setSelectedCharacter(savedChar);
    } catch { /* ignore */ }

    // Load run streak for menu display
    try {
      const rawStreak = localStorage.getItem("void-survivors-streak");
      if (rawStreak) {
        const streakData = JSON.parse(rawStreak) as { count: number; lastPlayedDate: string };
        const today = new Date().toISOString().slice(0, 10);
        const last = streakData.lastPlayedDate;
        const lastDate = new Date(last + "T00:00:00");
        const todayDate = new Date(today + "T00:00:00");
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          setHud(prev => ({ ...prev, streak: streakData.count }));
        }
      }
    } catch { /* ignore */ }

    // Load daily challenge
    import("@/game/daily").then((dailyMod) => {
      setDailyChallenge(dailyMod.getTodaysChallenge());
      setDailyResult(dailyMod.loadDailyResult());
    });

    // Load difficulty
    import("@/game/difficulty").then((diffMod) => {
      setSelectedDifficulty(diffMod.loadDifficulty());
      setDifficultyConfigs(diffMod.DIFFICULTY_CONFIGS);
    });

    // Load settings
    import("@/game/settings").then((settingsMod) => {
      const loaded = settingsMod.loadSettings();
      setGameSettings(loaded);
      setSoundEnabled(!loaded.muted);
    });

    // Load achievement manager, lifetime stats, and meta-progression
    Promise.all([
      import("@/game/achievements"),
      import("@/game/stats"),
      import("@/game/audio"),
      import("@/game/meta"),
      import("@/game/characters"),
    ]).then(([achMod, statsMod, audioMod, metaMod, charMod]) => {
      const mgr = new achMod.AchievementManager();
      achievementManagerRef.current = mgr;
      setAchievementCount({ unlocked: mgr.getUnlockedCount(), total: mgr.getTotalCount() });
      setTrailRewards(mgr.getAllTrailRewards());

      // Load saved trail color preference
      try {
        const savedTrail = localStorage.getItem("void-survivors-trail-color");
        if (savedTrail) setSelectedTrailColor(savedTrail);
      } catch { /* ignore */ }

      const stats = statsMod.loadLifetimeStats();
      setLifetimeStats(stats);

      audioRef.current = audioMod.AudioManager.getInstance();

      // Apply saved audio settings
      import("@/game/settings").then((settingsMod) => {
        const s = settingsMod.loadSettings();
        const audio = audioRef.current;
        if (audio) {
          audio.setMasterVolume(s.masterVolume);
          audio.setMusicVolume(s.musicVolume);
          audio.setSfxVolume(s.sfxVolume);
          if (s.muted) audio.mute();
        }
      });

      setMetaData(metaMod.loadMeta());
      setCharacterDefs(charMod.getCharacters());
    });
  }, []);

  // -----------------------------------------------------------------------
  // Detect mobile
  // -----------------------------------------------------------------------
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // -----------------------------------------------------------------------
  // PWA install prompt
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // Hide button if app was installed
    const installed = () => setShowInstallBtn(false);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const handleInstallClick = useCallback(() => {
    const prompt = deferredPromptRef.current as (Event & { prompt: () => void }) | null;
    if (!prompt) return;
    prompt.prompt();
    setShowInstallBtn(false);
    deferredPromptRef.current = null;
  }, []);

  // -----------------------------------------------------------------------
  // Resize canvas
  // -----------------------------------------------------------------------
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // -----------------------------------------------------------------------
  // Engine callbacks
  // -----------------------------------------------------------------------
  const handleStateChange = useCallback((state: HUDState) => {
    setHud(state);
    if (state.paused) {
      setScreen((prev) => (prev === "playing" ? "paused" : prev));
    } else {
      setScreen((prev) => (prev === "paused" ? "playing" : prev));
    }
  }, []);

  const handleLevelUp = useCallback((choices: UpgradeChoice[]) => {
    setUpgradeChoices(choices);
    setRerollsUsed(0);
    setScreen("upgrade");
  }, []);

  const handleGameOver = useCallback(async (stats: GameOverStats) => {
    setGameOverStats(stats);
    setGameOverTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));

    // Save daily challenge result if in daily mode
    if (isDailyMode && dailyChallenge) {
      try {
        const dailyMod = await import("@/game/daily");
        const result: import("@/game/daily").DailyResult = {
          date: dailyChallenge.date,
          score: stats.score,
          wave: stats.wavesSurvived,
          time: stats.timeSurvived,
          completed: true,
        };
        dailyMod.saveDailyResult(result);
        setDailyResult(dailyMod.loadDailyResult());
      } catch {
        // ignore
      }
      setIsDailyMode(false);
    }

    const entry: HighScoreEntry = {
      score: stats.score,
      level: stats.level,
      wave: stats.wavesSurvived,
      time: stats.timeSurvived,
      date: new Date().toISOString(),
    };
    const { scores, rank } = saveHighScore(entry);
    setHighScores(scores);
    setNewHighScoreRank(rank);
    if (scores.length > 0) {
      setPersonalBest(scores[0].score);
    }

    // Update lifetime stats
    try {
      const statsMod = await import("@/game/stats");
      const current = statsMod.loadLifetimeStats();
      const updated = statsMod.updateLifetimeStats(current, {
        kills: stats.enemiesKilled,
        timeSurvived: stats.timeSurvived,
        score: stats.score,
        wave: stats.wavesSurvived,
        level: stats.level,
        maxCombo: stats.maxCombo,
        bossesKilled: stats.bossesKilled,
        titanKills: stats.titanKills,
        harbingerKills: stats.harbingerKills,
        nexusKills: stats.nexusKills,
        phantomKills: stats.phantomKills,
        dailyChallengeCompleted: isDailyMode,
      });
      statsMod.saveLifetimeStats(updated);
      setLifetimeStats(updated);

      // Show PWA install banner after 2nd game over if installable
      if (updated.gamesPlayed >= 2 && deferredPromptRef.current) {
        setTimeout(() => setShowInstallBanner(true), 1500);
      }

      // Save run record for history
      statsMod.saveRunRecord({
        date: new Date().toISOString(),
        score: stats.score,
        wave: stats.wavesSurvived,
        kills: stats.enemiesKilled,
        time: stats.timeSurvived,
        level: stats.level,
        difficulty: isDailyMode ? "daily" : selectedDifficulty,
        character: selectedCharacter,
      });

      // Check achievements
      if (achievementManagerRef.current) {
        const mgr = achievementManagerRef.current;
        mgr.check({
          score: stats.score,
          kills: stats.enemiesKilled,
          wave: stats.wavesSurvived,
          level: stats.level,
          combo: stats.maxCombo,
          timeSurvived: stats.timeSurvived,
          gamesPlayed: updated.gamesPlayed,
          totalKills: updated.totalKills,
          totalPlaytime: updated.totalPlaytime,
          bossesKilled: updated.bossesKilled,
          titanKills: updated.titanKills,
          harbingerKills: updated.harbingerKills,
          nexusKills: updated.nexusKills,
          phantomKills: updated.phantomKills,
          dailyChallengesCompleted: updated.dailyChallengesCompleted,
          dailyChallengeScore: isDailyMode ? stats.score : 0,
          bossesKilledThisRun: stats.bossesKilled,
        });
        setAchievementCount({ unlocked: mgr.getUnlockedCount(), total: mgr.getTotalCount() });

        // Show achievement toasts
        let notification = mgr.popNotification();
        const toasts: AchievementToast[] = [];
        while (notification) {
          toasts.push({
            id: notification.id,
            name: notification.name,
            icon: notification.icon,
            tier: notification.tier,
            expiresAt: Date.now() + 4000 + toasts.length * 1000,
          });
          notification = mgr.popNotification();
        }
        if (toasts.length > 0) {
          setAchievementToasts((prev) => [...prev, ...toasts]);
          audioRef.current?.playAchievement();
          // Auto-remove toasts
          toasts.forEach((t) => {
            setTimeout(() => {
              setAchievementToasts((prev) => prev.filter((x) => x.id !== t.id));
            }, t.expiresAt - Date.now());
          });
        }
      }
    } catch {
      // ignore
    }

    // Earn void essence
    try {
      const metaMod = await import("@/game/meta");
      const currentMeta = metaMod.loadMeta();
      const { updated: updatedMeta, earned } = metaMod.earnEssence(
        currentMeta,
        stats.score,
        stats.enemiesKilled,
        stats.wavesSurvived
      );
      metaMod.saveMeta(updatedMeta);
      setMetaData(updatedMeta);
      setLastEssenceEarned(earned);
    } catch {
      // ignore
    }

    // Submit to global leaderboard
    setGlobalRank(null);
    if (playerName && stats.score > 0) {
      try {
        const res = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: playerName,
            score: stats.score,
            wave: stats.wavesSurvived,
            time: stats.timeSurvived,
            kills: stats.enemiesKilled,
            level: stats.level,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.rank != null && data.totalPlayers != null) {
            setGlobalRank({ rank: data.rank, total: data.totalPlayers });
          }
        }
      } catch {
        // silently fail
      }
    }

    setScreen("gameover");

    // Show name prompt on first game over if no player name is set
    if (!playerName) {
      setShowNamePrompt(true);
      setPendingNameInput("");
    }
  }, [isDailyMode, dailyChallenge, playerName]);

  // -----------------------------------------------------------------------
  // Real-time achievement check (during gameplay)
  // -----------------------------------------------------------------------
  const handleAchievementCheck = useCallback((stats: {
    score: number;
    kills: number;
    wave: number;
    level: number;
    combo: number;
    timeSurvived: number;
    activeHazards: number;
    activeAbilities: number;
    bossesKilledThisRun: number;
    hasEvolution: boolean;
    hasGravityWell: boolean;
    phantomKills: number;
    titanKills: number;
    harbingerKills: number;
    nexusKills: number;
  }) => {
    const mgr = achievementManagerRef.current;
    if (!mgr) return;

    const lt = lifetimeStats || {
      gamesPlayed: 0, totalKills: 0, totalPlaytime: 0, bossesKilled: 0,
      titanKills: 0, harbingerKills: 0, nexusKills: 0, phantomKills: 0, dailyChallengesCompleted: 0,
    };

    mgr.check({
      ...stats,
      gamesPlayed: lt.gamesPlayed,
      totalKills: lt.totalKills + stats.kills,
      totalPlaytime: lt.totalPlaytime + stats.timeSurvived,
      bossesKilled: lt.bossesKilled + stats.bossesKilledThisRun,
      titanKills: lt.titanKills + stats.titanKills,
      harbingerKills: lt.harbingerKills + stats.harbingerKills,
      nexusKills: lt.nexusKills + stats.nexusKills,
      phantomKills: lt.phantomKills + stats.phantomKills,
      dailyChallengesCompleted: lt.dailyChallengesCompleted,
    });

    let notification = mgr.popNotification();
    const toasts: AchievementToast[] = [];
    while (notification) {
      toasts.push({
        id: notification.id,
        name: notification.name,
        icon: notification.icon,
        tier: notification.tier,
        expiresAt: Date.now() + 4000 + toasts.length * 1000,
      });
      notification = mgr.popNotification();
    }
    if (toasts.length > 0) {
      setAchievementToasts((prev) => [...prev, ...toasts]);
      setAchievementCount({ unlocked: mgr.getUnlockedCount(), total: mgr.getTotalCount() });
      audioRef.current?.playAchievement();
      toasts.forEach((t) => {
        setTimeout(() => {
          setAchievementToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, t.expiresAt - Date.now());
      });
    }
  }, [lifetimeStats]);

  // -----------------------------------------------------------------------
  // Load engine dynamically (only on client)
  // -----------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    import("@/game/engine").then((mod) => {
      if (!mounted) return;
      const Engine = mod.GameEngine;
      engineRef.current = new Engine();

      // Start attract mode on the canvas for the menu background
      if (canvasRef.current && screen === "menu") {
        engineRef.current?.startAttractMode(canvasRef.current);
      }
    });

    return () => {
      mounted = false;
      engineRef.current?.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Start game
  // -----------------------------------------------------------------------
  const startGame = useCallback(() => {
    if (!canvasRef.current || !engineRef.current) return;
    engineRef.current.stopAttractMode();
    engineRef.current.setCharacter(selectedCharacter);
    engineRef.current.setDifficulty(selectedDifficulty);
    engineRef.current.setTrailColor(selectedTrailColor);
    engineRef.current.setDailyModifiers([]);
    setIsDailyMode(false);
    engineRef.current.start(canvasRef.current, {
      onStateChange: handleStateChange,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
      onAchievementCheck: handleAchievementCheck,
    });
    engineRef.current.setSoundEnabled(soundEnabled);
    engineRef.current.applyDisplaySettings(gameSettings);
    setScreen("playing");
  }, [handleStateChange, handleLevelUp, handleGameOver, handleAchievementCheck, soundEnabled, selectedCharacter, selectedDifficulty, selectedTrailColor, gameSettings]);

  // -----------------------------------------------------------------------
  // Start daily challenge
  // -----------------------------------------------------------------------
  const startDailyChallenge = useCallback(() => {
    if (!canvasRef.current || !engineRef.current || !dailyChallenge) return;
    engineRef.current.stopAttractMode();
    engineRef.current.setCharacter(selectedCharacter);
    engineRef.current.setTrailColor(selectedTrailColor);
    engineRef.current.setDailyModifiers(dailyChallenge.modifiers);
    engineRef.current.start(canvasRef.current, {
      onStateChange: handleStateChange,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
      onAchievementCheck: handleAchievementCheck,
    });
    engineRef.current.setSoundEnabled(soundEnabled);
    engineRef.current.applyDisplaySettings(gameSettings);
    setIsDailyMode(true);
    setScreen("playing");
  }, [handleStateChange, handleLevelUp, handleGameOver, handleAchievementCheck, soundEnabled, selectedCharacter, dailyChallenge, gameSettings]);

  // -----------------------------------------------------------------------
  // Select upgrade
  // -----------------------------------------------------------------------
  const selectUpgrade = useCallback(
    (index: number) => {
      engineRef.current?.selectUpgrade(index);
      engineRef.current?.resume();
      setScreen("playing");
    },
    []
  );

  // -----------------------------------------------------------------------
  // Restart / back to menu
  // -----------------------------------------------------------------------
  const restartGame = useCallback(() => {
    engineRef.current?.restart();
    engineRef.current?.setCharacter(selectedCharacter);
    engineRef.current?.setDifficulty(selectedDifficulty);
    engineRef.current?.setDailyModifiers([]);
    setIsDailyMode(false);
    engineRef.current?.start(canvasRef.current!, {
      onStateChange: handleStateChange,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
      onAchievementCheck: handleAchievementCheck,
    });
    engineRef.current?.applyDisplaySettings(gameSettings);
    setScreen("playing");
  }, [handleStateChange, handleLevelUp, handleGameOver, handleAchievementCheck, selectedCharacter, selectedDifficulty, gameSettings]);

  const resumeGame = useCallback(() => {
    engineRef.current?.resume();
    setScreen("playing");
  }, []);

  const backToMenu = useCallback(() => {
    engineRef.current?.cleanup();
    setScreen("menu");
    if (canvasRef.current) {
      engineRef.current?.startAttractMode(canvasRef.current);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Leaderboard
  // -----------------------------------------------------------------------
  const fetchLeaderboard = useCallback(async (type: "alltime" | "daily" = "alltime") => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch(`/api/leaderboard?type=${type}&limit=20`);
      if (res.status === 503) {
        setLeaderboardError("Leaderboard coming soon!");
        setLeaderboardData(null);
      } else if (!res.ok) {
        setLeaderboardError("Failed to load leaderboard");
        setLeaderboardData(null);
      } else {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch {
      setLeaderboardError("Connection error");
      setLeaderboardData(null);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const submitScore = useCallback(async (name: string, score: number) => {
    if (!name.trim()) return;
    const cleanName = name.replace(/[^a-zA-Z0-9_ -]/g, "").trim().substring(0, 20);
    localStorage.setItem("void-survivors-player-name", cleanName);
    setPlayerName(cleanName);
    try {
      const postBody: Record<string, unknown> = { name: cleanName, score };
      if (gameOverStats) {
        postBody.wave = gameOverStats.wavesSurvived;
        postBody.time = gameOverStats.timeSurvived;
        postBody.kills = gameOverStats.enemiesKilled;
        postBody.level = gameOverStats.level;
      }
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });
      fetchLeaderboard(leaderboardTab);
    } catch {
      // Silently fail — score is still saved locally
    }
  }, [fetchLeaderboard, leaderboardTab, gameOverStats]);

  // -----------------------------------------------------------------------
  // Share score
  // -----------------------------------------------------------------------
  const handleShareScore = useCallback(async () => {
    if (!gameOverStats) return;

    const charDef = characterDefs.find(c => c.id === selectedCharacter);
    const charName = charDef?.name || "Void Walker";
    const charIcon = charDef?.icon || "\u{1F4A0}";

    const shareText = [
      "\u{1F3AE} Void Survivors",
      `\u2B50 Score: ${gameOverStats.score.toLocaleString()}`,
      `\u{1F30A} Wave ${gameOverStats.wavesSurvived} \u2022 ${formatTime(gameOverStats.timeSurvived)} \u2022 ${gameOverStats.enemiesKilled} kills`,
      "",
      "Can you beat my score?",
      "\u{1F3AE} https://void-survivors.vercel.app",
    ].join("\n");

    // Try image-based sharing first (more engaging on social media)
    const shareBlob = await generateShareCard(gameOverStats, charName, charIcon);

    if (typeof navigator !== "undefined" && navigator.share && shareBlob) {
      const file = new File([shareBlob], "void-survivors-score.png", { type: "image/png" });
      // Check if sharing files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            text: shareText,
            files: [file],
          });
          setShareStatus("shared");
          setTimeout(() => setShareStatus("idle"), 2000);
          return;
        } catch {
          // User cancelled — do nothing
          return;
        }
      }
    }

    // Fallback: text-only share or clipboard
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Void Survivors",
          text: shareText,
          url: "https://void-survivors.vercel.app",
        });
        setShareStatus("shared");
      } catch {
        return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus("copied");
      } catch {
        return;
      }
    }

    setTimeout(() => setShareStatus("idle"), 2000);
  }, [gameOverStats, selectedCharacter, characterDefs]);

  // -----------------------------------------------------------------------
  // Sound toggle
  // -----------------------------------------------------------------------
  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    engineRef.current?.setSoundEnabled(next);
  }, [soundEnabled]);

  // -----------------------------------------------------------------------
  // Joystick handlers
  // -----------------------------------------------------------------------
  const onJoystickStart = useCallback(
    (e: React.TouchEvent) => {
      if (!joystickRef.current) return;
      const rect = joystickRef.current.getBoundingClientRect();
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      setJoystickActive(true);
      const touch = e.touches[0];
      const dx = touch.clientX - joystickCenter.current.x;
      const dy = touch.clientY - joystickCenter.current.y;
      const maxDist = 48;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      setJoystickDelta({
        x: (Math.cos(angle) * dist) / maxDist,
        y: (Math.sin(angle) * dist) / maxDist,
      });
    },
    []
  );

  const onJoystickMove = useCallback(
    (e: React.TouchEvent) => {
      if (!joystickActive) return;
      const touch = e.touches[0];
      const dx = touch.clientX - joystickCenter.current.x;
      const dy = touch.clientY - joystickCenter.current.y;
      const maxDist = 48;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      setJoystickDelta({
        x: (Math.cos(angle) * dist) / maxDist,
        y: (Math.sin(angle) * dist) / maxDist,
      });
    },
    [joystickActive]
  );

  const onJoystickEnd = useCallback(() => {
    setJoystickActive(false);
    setJoystickDelta({ x: 0, y: 0 });
  }, []);

  // -----------------------------------------------------------------------
  // Dash button handler (mobile) — dispatches Space keydown to engine
  // -----------------------------------------------------------------------
  const onDashPress = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true })
    );
  }, []);

  // -----------------------------------------------------------------------
  // Fullscreen toggle
  // -----------------------------------------------------------------------
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          // Fullscreen not supported or denied
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          // Exit fullscreen failed
        });
      }
    } catch {
      // Fullscreen API not available
    }
  }, []);

  // Listen for fullscreen changes (e.g. user presses Escape to exit)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // -----------------------------------------------------------------------
  // Health bar width
  // -----------------------------------------------------------------------
  const healthPct = hud.maxHealth > 0 ? (hud.health / hud.maxHealth) * 100 : 0;
  const xpPct = hud.xpToNext > 0 ? (hud.xp / hud.xpToNext) * 100 : 0;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "#0a0a12",
      }}
    >
      {/* ============== Canvas ============== */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100vw",
          height: "100vh",
          touchAction: "none",
        }}
      />

      {/* ============== Main Menu Overlay ============== */}
      {screen === "menu" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            background: "rgba(10, 10, 18, 0.7)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div className="animate-slide-up" style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 8vw, 5rem)",
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "#00f0ff",
                textShadow: `
                  0 0 10px #00f0ff,
                  0 0 30px #00f0ff,
                  0 0 60px rgba(0,240,255,0.5),
                  0 0 100px rgba(255,0,170,0.3)
                `,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              VOID
              <br />
              SURVIVORS
            </h1>

            <p
              style={{
                color: "rgba(224, 224, 240, 0.6)",
                fontSize: "clamp(0.9rem, 2vw, 1.15rem)",
                marginTop: 16,
                letterSpacing: "0.15em",
                fontStyle: "italic",
              }}
            >
              Survive the void. Become the weapon.
            </p>

            {playerName && (
              <p
                style={{
                  color: "#00f0ff",
                  fontSize: "0.85rem",
                  marginTop: 8,
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-geist-mono), monospace",
                  textShadow: "0 0 6px rgba(0,240,255,0.3)",
                  opacity: 0.8,
                }}
              >
                Welcome back, {playerName}
              </p>
            )}

            {/* Difficulty Selector */}
            {difficultyConfigs && (
              <div style={{ marginTop: 32, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {(["easy", "normal", "hard", "nightmare"] as const).map((diff) => {
                  const cfg = difficultyConfigs[diff];
                  if (!cfg) return null;
                  const isSelected = selectedDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => {
                        setSelectedDifficulty(diff);
                        import("@/game/difficulty").then((m) => m.saveDifficulty(diff));
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? cfg.color : "rgba(224,224,240,0.2)"}`,
                        background: isSelected
                          ? `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`
                          : "rgba(10,10,18,0.6)",
                        color: isSelected ? cfg.color : "rgba(224,224,240,0.5)",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-geist-mono), monospace",
                        letterSpacing: "0.08em",
                        transition: "all 0.2s",
                        textAlign: "center",
                        minWidth: 80,
                        boxShadow: isSelected ? `0 0 12px ${cfg.color}44, inset 0 0 8px ${cfg.color}22` : "none",
                        textShadow: isSelected ? `0 0 8px ${cfg.color}66` : "none",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 2 }}>
                        {cfg.name}
                      </div>
                      <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                        {cfg.description}
                      </div>
                      {cfg.scoreMult !== 1 && (
                        <div style={{ fontSize: "0.6rem", marginTop: 2, color: cfg.color, opacity: 0.8 }}>
                          {cfg.scoreMult}x score
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 20 }}>
              <button
                onClick={startGame}
                className="btn-neon-filled animate-pulse-glow"
                style={{ fontSize: "1.4rem", padding: "18px 64px" }}
              >
                PLAY
              </button>
              {hud.streak > 1 && (
                <div style={{
                  fontSize: "0.72rem",
                  color: "#ff8800",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  opacity: 0.85,
                }}>
                  {"\u{1F525}"} {hud.streak}-day streak &middot; +{Math.min((hud.streak - 1) * 5, 50)}% XP
                </div>
              )}
            </div>

            {/* Daily Challenge Button */}
            {dailyChallenge && (
              <button
                onClick={() => setScreen("daily")}
                style={{
                  marginTop: 16,
                  background: "linear-gradient(135deg, rgba(255,170,0,0.15), rgba(255,136,0,0.08))",
                  border: "1px solid rgba(255,170,0,0.4)",
                  borderRadius: 10,
                  color: "#ffaa00",
                  padding: "12px 32px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.08em",
                  transition: "all 0.2s",
                  textShadow: "0 0 8px rgba(255,170,0,0.4)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#ffaa00";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(255,170,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,170,0,0.4)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span>Daily Challenge: {dailyChallenge.title}</span>
                {dailyResult && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#ffd700",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Today&apos;s Best: {dailyResult.score.toLocaleString()}
                  </span>
                )}
              </button>
            )}

            <p
              style={{
                color: "rgba(224, 224, 240, 0.35)",
                fontSize: "0.85rem",
                marginTop: 28,
                letterSpacing: "0.05em",
              }}
            >
              Controls: WASD to move. Everything else is automatic.
            </p>

            {personalBest !== null && (
              <p
                style={{
                  color: "#ffd700",
                  fontSize: "0.95rem",
                  marginTop: 12,
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-geist-mono), monospace",
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                Personal Best: {personalBest.toLocaleString()}
              </p>
            )}

            {/* Lifetime Stats Summary */}
            {lifetimeStats && lifetimeStats.gamesPlayed > 0 && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 20,
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  color: "rgba(224,224,240,0.35)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                }}
              >
                <span>{lifetimeStats.gamesPlayed} games</span>
                <span>{lifetimeStats.totalKills.toLocaleString()} kills</span>
                <span>{Math.floor(lifetimeStats.totalPlaytime / 60)}m played</span>
              </div>
            )}

            {achievementCount.total > 0 && (
              <p
                style={{
                  color: "rgba(224,224,240,0.3)",
                  fontSize: "0.8rem",
                  marginTop: 8,
                  letterSpacing: "0.08em",
                }}
              >
                Achievements: {achievementCount.unlocked} / {achievementCount.total}
              </p>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  import("@/game/characters").then((mod) => {
                    setCharacterDefs(mod.getCharacters());
                  });
                  setScreen("characters");
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(0,255,136,0.3)",
                  borderRadius: 8,
                  color: "#00ff88",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00ff88";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(0,255,136,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u{1F464}"} Characters
              </button>
              <button
                onClick={() => {
                  if (achievementManagerRef.current) {
                    setAllAchievements(achievementManagerRef.current.getAll());
                    setTrailRewards(achievementManagerRef.current.getAllTrailRewards());
                  }
                  setAchievementFilter('all');
                  setScreen("achievements");
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(0,238,255,0.3)",
                  borderRadius: 8,
                  color: "#00eeff",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00eeff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u{1F3C6}"} Achievements
              </button>
              <button
                onClick={() => {
                  // Reload latest stats
                  import("@/game/stats").then((mod) => {
                    setLifetimeStats(mod.loadLifetimeStats());
                  });
                  setScreen("stats");
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(0,238,255,0.3)",
                  borderRadius: 8,
                  color: "#00eeff",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00eeff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u{1F4CA}"} Stats
              </button>
              <button
                onClick={() => {
                  import("@/game/meta").then((mod) => {
                    setMetaData(mod.loadMeta());
                  });
                  setScreen("shop");
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(170,102,255,0.3)",
                  borderRadius: 8,
                  color: "#aa66ff",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#aa66ff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(170,102,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(170,102,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u{2728}"} Upgrades
              </button>
            </div>

            {/* Leaderboard button */}
            <button
              onClick={() => { setScreen("leaderboard"); fetchLeaderboard(leaderboardTab); }}
              style={{
                marginTop: 12,
                padding: "10px 28px",
                fontSize: "0.95rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                fontFamily: "var(--font-geist-mono), monospace",
                background: "transparent",
                color: "#ffaa00",
                border: "1px solid rgba(255,170,0,0.3)",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s",
                width: "100%",
                maxWidth: 320,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ffaa00";
                e.currentTarget.style.boxShadow = "0 0 12px rgba(255,170,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,170,0,0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {"\u{1F3C6}"} Leaderboard
            </button>

            {/* Void Essence on menu */}
            {metaData && metaData.voidEssence > 0 && (
              <p
                style={{
                  color: "#aa66ff",
                  fontSize: "0.85rem",
                  marginTop: 12,
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-geist-mono), monospace",
                  textShadow: "0 0 8px rgba(170,102,255,0.4)",
                }}
              >
                {"\u{2728}"} {metaData.voidEssence.toLocaleString()} Void Essence
              </p>
            )}

            <button
              onClick={() => {
                setSettingsReturnScreen("menu");
                setScreen("settings");
              }}
              style={{
                marginTop: 16,
                background: "none",
                border: "1px solid rgba(0,238,255,0.3)",
                borderRadius: 8,
                color: "#00eeff",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#00eeff";
                e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {"\u2699\uFE0F"} Settings
            </button>

            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                style={{
                  marginTop: 10,
                  background: "none",
                  border: "1px solid rgba(0,240,255,0.25)",
                  borderRadius: 8,
                  color: "rgba(0,240,255,0.6)",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00f0ff";
                  e.currentTarget.style.color = "#00f0ff";
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(0,240,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)";
                  e.currentTarget.style.color = "rgba(0,240,255,0.6)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Install App
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============== Character Selection ============== */}
      {screen === "characters" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            background: "rgba(10, 10, 18, 0.92)",
            overflow: "auto",
            padding: "40px 16px",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
              fontWeight: 800,
              color: "#00ff88",
              textShadow: "0 0 20px rgba(0,255,136,0.5)",
              marginBottom: 8,
              letterSpacing: "0.1em",
            }}
          >
            {"\u{1F464}"} CHARACTERS
          </h2>
          <p
            style={{
              color: "rgba(224,224,240,0.5)",
              fontSize: "0.9rem",
              marginBottom: 32,
              letterSpacing: "0.05em",
            }}
          >
            Choose your survivor
          </p>

          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 900,
            }}
          >
            {characterDefs.map((char) => {
              const stats = lifetimeStats || { totalKills: 0, gamesPlayed: 0, totalPlaytime: 0, totalScore: 0, highestWave: 0, highestLevel: 0, highestCombo: 0, highestScore: 0, bossesKilled: 0 };
              const unlocked = char.unlockCondition({ totalKills: stats.totalKills, gamesPlayed: stats.gamesPlayed });
              const isSelected = selectedCharacter === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => {
                    if (unlocked) {
                      setSelectedCharacter(char.id);
                      try { localStorage.setItem("void-survivors-character", char.id); } catch { /* ignore */ }
                    }
                  }}
                  style={{
                    width: 250,
                    padding: 20,
                    borderRadius: 12,
                    border: isSelected
                      ? `2px solid ${char.color}`
                      : unlocked
                        ? "1px solid rgba(255,255,255,0.15)"
                        : "1px solid rgba(255,255,255,0.06)",
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${parseInt(char.color.slice(1,3),16)},${parseInt(char.color.slice(3,5),16)},${parseInt(char.color.slice(5,7),16)},0.15), rgba(10,10,18,0.9))`
                      : "rgba(15,15,25,0.8)",
                    cursor: unlocked ? "pointer" : "default",
                    opacity: unlocked ? 1 : 0.5,
                    transition: "all 0.25s ease",
                    boxShadow: isSelected
                      ? `0 0 20px rgba(${parseInt(char.color.slice(1,3),16)},${parseInt(char.color.slice(3,5),16)},${parseInt(char.color.slice(5,7),16)},0.3), inset 0 0 30px rgba(${parseInt(char.color.slice(1,3),16)},${parseInt(char.color.slice(3,5),16)},${parseInt(char.color.slice(5,7),16)},0.05)`
                      : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        fontSize: "0.7rem",
                        color: char.color,
                        fontFamily: "var(--font-geist-mono), monospace",
                        letterSpacing: "0.1em",
                        textShadow: `0 0 8px ${char.color}`,
                      }}
                    >
                      SELECTED
                    </div>
                  )}

                  {/* Icon and name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: "2.2rem", filter: unlocked ? "none" : "grayscale(1)" }}>{char.icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: "1.15rem",
                          fontWeight: 700,
                          color: unlocked ? char.color : "rgba(224,224,240,0.3)",
                          textShadow: unlocked ? `0 0 10px ${char.glowColor}` : "none",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {char.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: unlocked ? "rgba(224,224,240,0.6)" : "rgba(224,224,240,0.25)",
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                      >
                        {char.description}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  {unlocked ? (
                    <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-geist-mono), monospace", lineHeight: 1.8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                        <span>HP</span>
                        <span style={{ color: char.baseHealth > 100 ? "#00ff88" : char.baseHealth < 100 ? "#ff4466" : "rgba(224,224,240,0.7)" }}>
                          {char.baseHealth}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                        <span>Speed</span>
                        <span style={{ color: char.baseSpeed > 200 ? "#00ff88" : char.baseSpeed < 200 ? "#ff4466" : "rgba(224,224,240,0.7)" }}>
                          {char.baseSpeed}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                        <span>Armor</span>
                        <span style={{ color: char.baseArmor > 0 ? "#00ff88" : "rgba(224,224,240,0.7)" }}>
                          {char.baseArmor}
                        </span>
                      </div>
                      {char.damageMultiplier !== 1.0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                          <span>Damage</span>
                          <span style={{ color: "#00ff88" }}>+{Math.round((char.damageMultiplier - 1) * 100)}%</span>
                        </div>
                      )}
                      {char.xpMultiplier !== 1.0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                          <span>XP Gain</span>
                          <span style={{ color: "#00ff88" }}>+{Math.round((char.xpMultiplier - 1) * 100)}%</span>
                        </div>
                      )}
                      {char.healthRegen > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(224,224,240,0.5)" }}>
                          <span>Regen</span>
                          <span style={{ color: "#00ff88" }}>+{(char.healthRegen * 5).toFixed(0)} HP/5s</span>
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(224,224,240,0.4)",
                          fontSize: "0.72rem",
                        }}
                      >
                        Starting ability: <span style={{ color: char.color }}>{char.startingAbilityId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "12px 0",
                        textAlign: "center",
                        fontSize: "0.82rem",
                        color: "#ff6644",
                        fontFamily: "var(--font-geist-mono), monospace",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {"\u{1F512}"} {char.unlockDescription}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setScreen("menu")}
            style={{
              marginTop: 32,
              background: "none",
              border: "1px solid rgba(0,238,255,0.3)",
              borderRadius: 8,
              color: "#00eeff",
              padding: "10px 32px",
              cursor: "pointer",
              fontSize: "1rem",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "0.08em",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00eeff";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* ============== Achievement Gallery ============== */}
      {screen === "achievements" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 20,
            background: "rgba(0,0,0,0.9)",
            overflowY: "auto",
            fontFamily: "var(--font-geist-mono), monospace",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div style={{ width: "100%", maxWidth: 900, padding: "40px 20px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#00eeff",
                  textShadow: "0 0 10px #00eeff, 0 0 30px rgba(0,238,255,0.4)",
                  margin: 0,
                  letterSpacing: "0.1em",
                }}
              >
                ACHIEVEMENTS
              </h2>
              <p style={{ color: "rgba(224,224,240,0.5)", fontSize: "1rem", marginTop: 8 }}>
                {achievementCount.unlocked} / {achievementCount.total} Unlocked
              </p>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              {(["all", "bronze", "silver", "gold", "platinum"] as const).map((tier) => {
                const isActive = achievementFilter === tier;
                const tierColors: Record<string, string> = {
                  all: "#00eeff",
                  bronze: "#cd7f32",
                  silver: "#c0c0c0",
                  gold: "#ffd700",
                  platinum: "#e5e4e2",
                };
                return (
                  <button
                    key={tier}
                    onClick={() => setAchievementFilter(tier)}
                    style={{
                      background: isActive ? `${tierColors[tier]}22` : "transparent",
                      border: `1px solid ${isActive ? tierColors[tier] : "rgba(255,255,255,0.15)"}`,
                      borderRadius: 6,
                      color: isActive ? tierColors[tier] : "rgba(224,224,240,0.4)",
                      padding: "6px 16px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      textTransform: "capitalize",
                      letterSpacing: "0.08em",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>

            {/* Achievement Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {allAchievements
                .filter((a) => achievementFilter === "all" || a.tier === achievementFilter)
                .map((achievement) => {
                  const tierColor = (() => {
                    switch (achievement.tier) {
                      case 'bronze': return '#cd7f32';
                      case 'silver': return '#c0c0c0';
                      case 'gold': return '#ffd700';
                      case 'platinum': return '#e5e4e2';
                    }
                  })();
                  return (
                    <div
                      key={achievement.id}
                      style={{
                        background: achievement.unlocked
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(255,255,255,0.02)",
                        border: `1px solid ${achievement.unlocked ? tierColor : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 10,
                        padding: 16,
                        opacity: achievement.unlocked ? 1 : 0.4,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>
                        {achievement.unlocked ? achievement.icon : "\u{1F512}"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: achievement.unlocked ? tierColor : "rgba(224,224,240,0.4)",
                          marginBottom: 4,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {achievement.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "rgba(224,224,240,0.45)",
                          lineHeight: 1.4,
                        }}
                      >
                        {achievement.unlocked ? achievement.description : "???"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: tierColor,
                          marginTop: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          opacity: achievement.unlocked ? 0.8 : 0.4,
                        }}
                      >
                        {achievement.tier}
                      </div>
                      {achievement.reward && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 8,
                            fontSize: "0.7rem",
                            color: achievement.unlocked ? "#00eeff" : "rgba(224,224,240,0.3)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: achievement.unlocked
                                ? achievement.reward.value === "prismatic"
                                  ? "conic-gradient(#ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000)"
                                  : achievement.reward.value
                                : "rgba(255,255,255,0.15)",
                              flexShrink: 0,
                            }}
                          />
                          {achievement.reward.name}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Trail Rewards Section */}
            <div style={{ marginTop: 40 }}>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "#00eeff",
                  textAlign: "center",
                  marginBottom: 16,
                  letterSpacing: "0.1em",
                }}
              >
                TRAIL COSMETICS
              </h3>
              <p style={{ color: "rgba(224,224,240,0.45)", fontSize: "0.8rem", textAlign: "center", marginBottom: 20 }}>
                Unlock trail colors by earning achievements. Select one to equip.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                {/* Default trail option */}
                <button
                  onClick={() => {
                    setSelectedTrailColor(null);
                    try { localStorage.removeItem(TRAIL_STORAGE_KEY); } catch { /* ignore */ }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: selectedTrailColor === null ? "rgba(0,238,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedTrailColor === null ? "#00eeff" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.8rem",
                    color: selectedTrailColor === null ? "#00eeff" : "rgba(224,224,240,0.6)",
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#00aacc",
                      flexShrink: 0,
                    }}
                  />
                  Default
                </button>

                {trailRewards.map((tr) => {
                  const isSelected = selectedTrailColor === tr.reward.value;
                  const isPrismatic = tr.reward.value === "prismatic";
                  const dotStyle: React.CSSProperties = {
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: tr.unlocked
                      ? isPrismatic
                        ? "conic-gradient(#ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000)"
                        : tr.reward.value
                      : "rgba(255,255,255,0.15)",
                  };
                  return (
                    <button
                      key={tr.reward.value}
                      disabled={!tr.unlocked}
                      onClick={() => {
                        if (!tr.unlocked) return;
                        setSelectedTrailColor(tr.reward.value);
                        try { localStorage.setItem(TRAIL_STORAGE_KEY, tr.reward.value); } catch { /* ignore */ }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: isSelected && tr.unlocked ? "rgba(0,238,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected && tr.unlocked ? "#00eeff" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: tr.unlocked ? "pointer" : "not-allowed",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.8rem",
                        color: tr.unlocked
                          ? isSelected ? "#00eeff" : "rgba(224,224,240,0.6)"
                          : "rgba(224,224,240,0.25)",
                        opacity: tr.unlocked ? 1 : 0.5,
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={dotStyle} />
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span>{tr.reward.name}</span>
                        {!tr.unlocked && (
                          <span style={{ fontSize: "0.65rem", color: "rgba(224,224,240,0.3)" }}>
                            Unlock: {tr.achievementName}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Back Button */}
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button
                onClick={() => setScreen("menu")}
                style={{
                  background: "none",
                  border: "1px solid rgba(0,238,255,0.3)",
                  borderRadius: 8,
                  color: "#00eeff",
                  padding: "10px 32px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  letterSpacing: "0.08em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00eeff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u2190"} Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Stats Dashboard ============== */}
      {screen === "stats" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            background: "rgba(0,0,0,0.9)",
            fontFamily: "var(--font-geist-mono), monospace",
            overflow: "auto",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div style={{ width: "100%", maxWidth: 560, padding: "40px 20px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#00eeff",
                  textShadow: "0 0 10px #00eeff, 0 0 30px rgba(0,238,255,0.4)",
                  margin: 0,
                  letterSpacing: "0.1em",
                }}
              >
                LIFETIME STATS
              </h2>
            </div>

            {/* Tab Buttons */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid rgba(0,238,255,0.15)" }}>
              {(["overview", "history"] as const).map((tab) => {
                const isActive = statsTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatsTab(tab)}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: isActive ? "2px solid #00eeff" : "2px solid transparent",
                      color: isActive ? "#00eeff" : "rgba(224,224,240,0.4)",
                      padding: "8px 24px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "rgba(224,224,240,0.7)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "rgba(224,224,240,0.4)"; }}
                  >
                    {tab === "overview" ? "Overview" : "Run History"}
                  </button>
                );
              })}
            </div>

            {/* Overview Tab */}
            {statsTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(() => {
                const s = lifetimeStats || {
                  gamesPlayed: 0, totalKills: 0, totalPlaytime: 0, totalScore: 0,
                  highestScore: 0, highestWave: 0, highestLevel: 0, highestCombo: 0, bossesKilled: 0,
                };
                const hours = Math.floor(s.totalPlaytime / 3600);
                const mins = Math.floor((s.totalPlaytime % 3600) / 60);
                const secs = Math.floor(s.totalPlaytime % 60);
                const playtimeStr = hours > 0
                  ? `${hours}h ${mins}m ${secs}s`
                  : mins > 0
                  ? `${mins}m ${secs}s`
                  : `${secs}s`;

                // Determine favorite character from run history
                let favoriteCharLabel = "N/A";
                let favoriteCharColor = "#00eeff";
                let favoriteCharIcon = "\u{1F4A0}";
                try {
                  const raw = localStorage.getItem("void-survivors-run-history");
                  if (raw) {
                    const runs = JSON.parse(raw);
                    if (Array.isArray(runs) && runs.length > 0) {
                      const counts: Record<string, number> = {};
                      for (const run of runs) {
                        if (run.character) counts[run.character] = (counts[run.character] || 0) + 1;
                      }
                      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                      if (topId) {
                        const charDef = characterDefs.find(c => c.id === topId);
                        if (charDef) {
                          favoriteCharLabel = `${charDef.name} (${counts[topId]} runs)`;
                          favoriteCharColor = charDef.color;
                          favoriteCharIcon = charDef.icon;
                        } else {
                          favoriteCharLabel = `${topId} (${counts[topId]} runs)`;
                        }
                      }
                    }
                  }
                } catch { /* ignore */ }

                // Synergy tracking placeholder — not yet tracked in lifetime stats
                const synergiesLabel = "Coming soon";

                const stats: { icon: string; label: string; value: string; color: string }[] = [
                  { icon: "\u{1F3AE}", label: "Games Played", value: s.gamesPlayed.toLocaleString(), color: "#00eeff" },
                  { icon: "\u{1F5E1}\u{FE0F}", label: "Total Kills", value: s.totalKills.toLocaleString(), color: "#ff00aa" },
                  { icon: "\u{23F1}\u{FE0F}", label: "Total Playtime", value: playtimeStr, color: "#00ff88" },
                  { icon: "\u{2B50}", label: "Total Score", value: s.totalScore.toLocaleString(), color: "#ffd700" },
                  { icon: "\u{1F3C6}", label: "Highest Score", value: s.highestScore.toLocaleString(), color: "#ffd700" },
                  { icon: "\u{1F30A}", label: "Highest Wave", value: s.highestWave.toLocaleString(), color: "#00f0ff" },
                  { icon: "\u{1F4AA}", label: "Highest Level", value: s.highestLevel.toLocaleString(), color: "#00ff88" },
                  { icon: "\u{26A1}", label: "Highest Combo", value: `${s.highestCombo.toLocaleString()}x`, color: "#ff8800" },
                  { icon: "\u{1F479}", label: "Bosses Killed", value: s.bossesKilled.toLocaleString(), color: "#ff2244" },
                  { icon: favoriteCharIcon, label: "Favorite Character", value: favoriteCharLabel, color: favoriteCharColor },
                  { icon: "\u{1F300}", label: "Total Synergies", value: synergiesLabel, color: "#aa66ff" },
                ];

                return stats.map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${stat.color}18`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "1.2rem" }}>{stat.icon}</span>
                      <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
                        {stat.label}
                      </span>
                    </div>
                    <span
                      style={{
                        color: stat.color,
                        fontSize: "1rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textShadow: `0 0 6px ${stat.color}4d`,
                      }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ));
              })()}
            </div>
            )}

            {/* Run History Tab */}
            {statsTab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {(() => {
                let runHistory: import("@/game/stats").RunRecord[] = [];
                try {
                  const raw = localStorage.getItem("void-survivors-run-history");
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) runHistory = parsed.slice(-20);
                  }
                } catch { /* ignore */ }

                if (runHistory.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(224,224,240,0.4)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: 12 }}>{"\u{1F4CA}"}</div>
                      <div style={{ fontSize: "0.9rem" }}>No runs recorded yet.</div>
                      <div style={{ fontSize: "0.8rem", marginTop: 8 }}>Complete a run to see your history here.</div>
                    </div>
                  );
                }

                const maxScore = Math.max(...runHistory.map(r => r.score), 1);
                const difficultyColor = (d: string) => {
                  switch (d.toLowerCase()) {
                    case "easy": return "#44ff44";
                    case "normal": return "#00eeff";
                    case "hard": return "#ff8800";
                    case "nightmare": return "#ff3344";
                    default: return "#aa66ff";
                  }
                };
                const gridLines = [0.25, 0.5, 0.75];
                const chartHeight = 160;
                const last5 = runHistory.slice(-5).reverse();
                const fmtTime = (t: number) => {
                  const m = Math.floor(t / 60);
                  const s = Math.floor(t % 60);
                  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                };

                return (
                  <>
                    {/* Score Chart */}
                    <div
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(0,238,255,0.12)",
                        borderRadius: 8,
                        padding: "16px 16px 8px",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "rgba(224,224,240,0.4)", marginBottom: 8, letterSpacing: "0.05em" }}>
                        SCORE HISTORY (LAST {runHistory.length} RUNS)
                      </div>
                      {/* Y-axis max label */}
                      <div style={{ fontSize: "0.65rem", color: "rgba(0,238,255,0.35)", marginBottom: 2, textAlign: "right" }}>
                        {maxScore.toLocaleString()}
                      </div>
                      <div
                        style={{
                          position: "relative",
                          height: chartHeight,
                          display: "flex",
                          alignItems: "flex-end",
                          gap: 2,
                          padding: "0 2px",
                        }}
                      >
                        {/* Gridlines */}
                        {gridLines.map((pct) => (
                          <div
                            key={pct}
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: `${pct * 100}%`,
                              height: 1,
                              background: "rgba(0,238,255,0.08)",
                              pointerEvents: "none",
                            }}
                          />
                        ))}
                        {/* Bars */}
                        {runHistory.map((run, i) => {
                          const heightPct = (run.score / maxScore) * 100;
                          const color = difficultyColor(run.difficulty);
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-end",
                                height: "100%",
                                position: "relative",
                              }}
                              title={`Run #${i + 1}: ${run.score.toLocaleString()} pts | Wave ${run.wave} | ${run.difficulty}`}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: `${Math.max(heightPct, 2)}%`,
                                  background: color,
                                  borderRadius: "4px 4px 0 0",
                                  opacity: 0.85,
                                  transition: "height 0.3s ease",
                                  boxShadow: `0 0 4px ${color}40`,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis labels */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "0 2px" }}>
                        <span style={{ fontSize: "0.6rem", color: "rgba(224,224,240,0.25)" }}>1</span>
                        <span style={{ fontSize: "0.6rem", color: "rgba(224,224,240,0.25)" }}>{runHistory.length}</span>
                      </div>
                      {/* Legend */}
                      <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {[["Easy", "#44ff44"], ["Normal", "#00eeff"], ["Hard", "#ff8800"], ["Nightmare", "#ff3344"]].map(([label, c]) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: c as string }} />
                            <span style={{ fontSize: "0.6rem", color: "rgba(224,224,240,0.35)" }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Runs Table */}
                    <div
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(0,238,255,0.12)",
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "rgba(224,224,240,0.4)", marginBottom: 12, letterSpacing: "0.05em" }}>
                        RECENT RUNS
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(0,238,255,0.1)" }}>
                            {["#", "Score", "Wave", "Kills", "Time", "Difficulty"].map((h) => (
                              <th
                                key={h}
                                style={{
                                  textAlign: h === "#" || h === "Score" || h === "Wave" || h === "Kills" ? "right" : "left",
                                  padding: "6px 8px",
                                  color: "rgba(224,224,240,0.35)",
                                  fontWeight: 500,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {last5.map((run, idx) => {
                            const runNum = runHistory.length - idx;
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid rgba(0,238,255,0.05)" }}>
                                <td style={{ padding: "6px 8px", color: "rgba(224,224,240,0.3)", textAlign: "right" }}>{runNum}</td>
                                <td style={{ padding: "6px 8px", color: "#00eeff", fontWeight: 600, textAlign: "right" }}>{run.score.toLocaleString()}</td>
                                <td style={{ padding: "6px 8px", color: "rgba(224,224,240,0.6)", textAlign: "right" }}>{run.wave}</td>
                                <td style={{ padding: "6px 8px", color: "rgba(224,224,240,0.6)", textAlign: "right" }}>{run.kills}</td>
                                <td style={{ padding: "6px 8px", color: "rgba(224,224,240,0.6)", textAlign: "left" }}>{fmtTime(run.time)}</td>
                                <td style={{ padding: "6px 8px", color: difficultyColor(run.difficulty), textAlign: "left", textTransform: "capitalize" }}>{run.difficulty}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
            )}

            {/* Back Button */}
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button
                onClick={() => {
                  setStatsTab("overview");
                  setScreen("menu");
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(0,238,255,0.3)",
                  borderRadius: 8,
                  color: "#00eeff",
                  padding: "10px 32px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  letterSpacing: "0.08em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00eeff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(0,238,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,238,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u2190"} Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== Upgrades Shop ============== */}
      {screen === "shop" && metaData && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            background: "rgba(0,0,0,0.92)",
            fontFamily: "var(--font-geist-mono), monospace",
            overflow: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: 560, padding: "40px 20px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#aa66ff",
                  textShadow: "0 0 10px #aa66ff, 0 0 30px rgba(170,102,255,0.4)",
                  margin: 0,
                  letterSpacing: "0.1em",
                }}
              >
                VOID UPGRADES
              </h2>
              <p
                style={{
                  color: "rgba(224,224,240,0.5)",
                  fontSize: "0.8rem",
                  marginTop: 8,
                  letterSpacing: "0.05em",
                }}
              >
                Permanent upgrades that persist across runs
              </p>
            </div>

            {/* Essence Balance */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 28,
                fontSize: "1.3rem",
                color: "#aa66ff",
                fontWeight: 700,
                textShadow: "0 0 12px rgba(170,102,255,0.5)",
              }}
            >
              {"\u{2728}"} {metaData.voidEssence.toLocaleString()} Void Essence
            </div>

            {/* Upgrade Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(() => {
                // Import synchronously since we loaded on mount
                const definitions = [
                  { id: 'maxHealthBonus' as const, name: 'Void Vitality', description: 'Increase maximum health.', icon: '\u{1F49A}', maxLevel: 10, costs: [50,100,175,275,400,550,725,925,1150,1400], effectPerLevel: '+5 HP' },
                  { id: 'damageBonus' as const, name: 'Void Strike', description: 'Increase all damage dealt.', icon: '\u{2694}\u{FE0F}', maxLevel: 10, costs: [75,150,250,375,525,700,900,1125,1375,1650], effectPerLevel: '+2% Damage' },
                  { id: 'speedBonus' as const, name: 'Void Swiftness', description: 'Increase movement speed.', icon: '\u{1F4A8}', maxLevel: 10, costs: [60,120,200,300,420,560,720,900,1100,1320], effectPerLevel: '+3% Speed' },
                  { id: 'armorBonus' as const, name: 'Void Shell', description: 'Reduce incoming damage.', icon: '\u{1F6E1}\u{FE0F}', maxLevel: 10, costs: [100,200,325,475,650,850,1075,1325,1600,1900], effectPerLevel: '+1 Armor' },
                  { id: 'xpBonus' as const, name: 'Void Wisdom', description: 'Increase XP gained.', icon: '\u{2728}', maxLevel: 10, costs: [80,160,265,395,550,730,935,1165,1420,1700], effectPerLevel: '+5% XP' },
                ];

                return definitions.map((def) => {
                  const currentLevel = metaData.upgrades[def.id];
                  const isMaxed = currentLevel >= def.maxLevel;
                  const cost = isMaxed ? 0 : def.costs[currentLevel];
                  const canAfford = !isMaxed && metaData.voidEssence >= cost;

                  return (
                    <div
                      key={def.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "rgba(170,102,255,0.04)",
                        border: `1px solid ${isMaxed ? "rgba(170,102,255,0.3)" : "rgba(170,102,255,0.12)"}`,
                        borderRadius: 10,
                        gap: 12,
                      }}
                    >
                      {/* Icon and info */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                        <span style={{ fontSize: "1.4rem" }}>{def.icon}</span>
                        <div>
                          <div style={{ color: "#e0e0f0", fontSize: "0.9rem", fontWeight: 700 }}>
                            {def.name}
                          </div>
                          <div style={{ color: "rgba(224,224,240,0.45)", fontSize: "0.72rem", marginTop: 2 }}>
                            {def.description} ({def.effectPerLevel}/level)
                          </div>
                        </div>
                      </div>

                      {/* Level indicator */}
                      <div style={{ display: "flex", gap: 2, marginRight: 8 }}>
                        {Array.from({ length: def.maxLevel }, (_, i) => (
                          <div
                            key={i}
                            style={{
                              width: 5,
                              height: 16,
                              borderRadius: 2,
                              background: i < currentLevel
                                ? "#aa66ff"
                                : "rgba(170,102,255,0.15)",
                              boxShadow: i < currentLevel ? "0 0 4px rgba(170,102,255,0.5)" : "none",
                            }}
                          />
                        ))}
                      </div>

                      {/* Buy button */}
                      {isMaxed ? (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#aa66ff",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            minWidth: 60,
                            textAlign: "center",
                          }}
                        >
                          MAX
                        </span>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={async () => {
                            const metaMod = await import("@/game/meta");
                            const result = metaMod.purchaseUpgrade(metaData, def.id);
                            if (result) {
                              metaMod.saveMeta(result);
                              setMetaData(result);
                            }
                          }}
                          style={{
                            background: canAfford ? "rgba(170,102,255,0.2)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${canAfford ? "rgba(170,102,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 6,
                            color: canAfford ? "#aa66ff" : "rgba(224,224,240,0.25)",
                            padding: "6px 12px",
                            cursor: canAfford ? "pointer" : "not-allowed",
                            fontSize: "0.78rem",
                            fontFamily: "inherit",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            minWidth: 60,
                            transition: "all 0.2s",
                          }}
                        >
                          {cost.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Total Earned */}
            {metaData.totalEssenceEarned > 0 && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  fontSize: "0.72rem",
                  color: "rgba(224,224,240,0.25)",
                  letterSpacing: "0.05em",
                }}
              >
                Total essence earned: {metaData.totalEssenceEarned.toLocaleString()}
              </p>
            )}

            {/* Back Button */}
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button
                onClick={() => setScreen("menu")}
                style={{
                  background: "none",
                  border: "1px solid rgba(170,102,255,0.3)",
                  borderRadius: 8,
                  color: "#aa66ff",
                  padding: "10px 32px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  letterSpacing: "0.08em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#aa66ff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(170,102,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(170,102,255,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {"\u2190"} Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== In-Game HUD ============== */}
      {(screen === "playing" || screen === "paused") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Top-left: Health, Level, Wave */}
          <div
            className="hud-panel"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              minWidth: isMobile ? 140 : 180,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: isMobile ? "0.65rem" : "0.75rem",
                color: "rgba(224,224,240,0.7)",
                marginBottom: 4,
              }}
            >
              <span>
                Lv.{hud.level}
              </span>
              <span>
                Wave {hud.wave}
              </span>
            </div>
            <div className="health-bar">
              <div
                className="health-bar-fill"
                style={{ width: `${healthPct}%` }}
              />
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "rgba(224,224,240,0.4)",
                marginTop: 2,
                textAlign: "right",
              }}
            >
              {Math.ceil(hud.health)} / {hud.maxHealth}
            </div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.6rem",
                marginTop: 3,
                textAlign: "left",
                letterSpacing: "0.05em",
              }}
            >
              <span style={{ color: "#00f0ff" }}>DPS: </span>
              <span style={{ color: "#e0e0f0" }}>{hud.dps.toLocaleString()}</span>
            </div>
          </div>

          {/* Top-center: Timer */}
          <div
            className="hud-panel"
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: isMobile ? "0.85rem" : "1.1rem",
              letterSpacing: "0.1em",
              color: "#00f0ff",
            }}
          >
            {formatTime(hud.time)}
          </div>

          {/* Combo indicator (shown when combo >= 3) */}
          {hud.combo >= 3 && (
            <div
              style={{
                position: "absolute",
                top: 48,
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: hud.combo >= 50 ? "1.4rem" : hud.combo >= 20 ? "1.2rem" : hud.combo >= 10 ? "1.1rem" : "1rem",
                fontWeight: 900,
                letterSpacing: "0.12em",
                color:
                  hud.combo >= 50
                    ? "#ff00ff"
                    : hud.combo >= 20
                      ? "#ff3344"
                      : hud.combo >= 10
                        ? "#ff8800"
                        : hud.combo >= 5
                          ? "#ffdd00"
                          : "#ffffff",
                textShadow:
                  hud.combo >= 10
                    ? `0 0 8px currentColor, 0 0 16px currentColor`
                    : `0 0 6px currentColor`,
                zIndex: 11,
              }}
            >
              COMBO x{hud.combo}
              {hud.combo >= 5 && (
                <span
                  style={{
                    fontSize: "0.7em",
                    marginLeft: 6,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {hud.combo >= 50
                    ? "5x"
                    : hud.combo >= 20
                      ? "3x"
                      : hud.combo >= 10
                        ? "2x"
                        : "1.5x"}
                </span>
              )}
            </div>
          )}

          {/* Top-right: Score + Sound */}
          <div
            className="hud-panel"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: isMobile ? "0.75rem" : "0.9rem",
                color: "#00f0ff",
              }}
            >
              {hud.score.toLocaleString()}
            </span>
            <button
              onClick={toggleSound}
              style={{
                background: "none",
                border: "none",
                color: "rgba(224,224,240,0.5)",
                cursor: "pointer",
                fontSize: "1rem",
                pointerEvents: "auto",
                padding: 0,
              }}
            >
              {soundEnabled ? "\u{1F50A}" : "\u{1F507}"}
            </button>
          </div>

          {/* Ability icons — vertical on desktop, compact horizontal row on mobile */}
          {hud.abilities.length > 0 && (
            <div
              style={{
                position: "absolute",
                ...(isMobile
                  ? { left: 12, right: 12, top: 80, flexDirection: "row" as const, flexWrap: "wrap" as const }
                  : { left: 12, top: 80, flexDirection: "column" as const }),
                display: "flex",
                gap: isMobile ? 4 : 6,
              }}
            >
              {hud.abilities.map((ab, i) => (
                <div
                  key={i}
                  className="hud-panel"
                  style={{
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    borderColor: ab.color,
                    padding: 0,
                  }}
                  title={`${ab.name} (Lv.${ab.level})`}
                >
                  <span style={{ fontSize: isMobile ? "0.9rem" : "1.2rem" }}>{ab.icon}</span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      background: ab.color,
                      color: "#0a0a12",
                      fontSize: isMobile ? "0.45rem" : "0.55rem",
                      fontWeight: 800,
                      borderRadius: 4,
                      padding: "0 3px",
                      lineHeight: isMobile ? "12px" : "14px",
                    }}
                  >
                    {ab.level}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Dash cooldown indicator (desktop only — mobile has dedicated button) */}
          <div
            style={{
              position: "absolute",
              bottom: 44,
              left: "50%",
              transform: "translateX(-50%)",
              display: isMobile ? "none" : "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Background circle */}
              <svg
                width={36}
                height={36}
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                <circle
                  cx={18}
                  cy={18}
                  r={15}
                  fill="rgba(0,0,0,0.4)"
                  stroke="rgba(0,240,255,0.2)"
                  strokeWidth={2}
                />
                {/* Cooldown fill arc */}
                <circle
                  cx={18}
                  cy={18}
                  r={15}
                  fill="none"
                  stroke={hud.dashCooldown <= 0 ? "#00f0ff" : "rgba(0,240,255,0.4)"}
                  strokeWidth={2}
                  strokeDasharray={2 * Math.PI * 15}
                  strokeDashoffset={
                    hud.dashCooldown <= 0
                      ? 0
                      : (hud.dashCooldown / 1.5) * 2 * Math.PI * 15
                  }
                  transform="rotate(-90 18 18)"
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
              </svg>
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: hud.dashCooldown <= 0 ? "#00f0ff" : "rgba(0,240,255,0.35)",
                  textShadow: hud.dashCooldown <= 0 ? "0 0 6px #00f0ff" : "none",
                }}
              >
                {hud.dashCooldown <= 0 ? "DASH" : ""}
              </span>
            </div>
            <span
              style={{
                fontSize: "0.55rem",
                letterSpacing: "0.1em",
                color: "rgba(224,224,240,0.35)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              SPACE
            </span>
          </div>

          {/* Bottom: XP bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0 0 12px 0",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: "0.7rem",
                color: "rgba(0,240,255,0.6)",
                marginBottom: 4,
                letterSpacing: "0.1em",
              }}
            >
              Level {hud.level}
            </div>
            <div className="xp-bar" style={{ margin: "0 12px" }}>
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          {/* Mobile: Virtual Joystick */}
          {isMobile && (
            <div
              ref={joystickRef}
              className="virtual-joystick"
              style={{
                position: "absolute",
                bottom: 40,
                left: 24,
                pointerEvents: "auto",
              }}
              onTouchStart={onJoystickStart}
              onTouchMove={onJoystickMove}
              onTouchEnd={onJoystickEnd}
              onTouchCancel={onJoystickEnd}
            >
              <div className="virtual-joystick-ring" />
              <div
                className="virtual-joystick-knob"
                style={{
                  transform: `translate(calc(-50% + ${joystickDelta.x * 48}px), calc(-50% + ${joystickDelta.y * 48}px))`,
                }}
              />
            </div>
          )}

          {/* Mobile: Dash button */}
          {isMobile && (
            <div
              onTouchStart={(e) => {
                e.stopPropagation();
                onDashPress();
              }}
              style={{
                position: "absolute",
                bottom: 80,
                right: 40,
                width: 80,
                height: 80,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                cursor: "pointer",
                background: hud.dashCooldown > 0 ? "rgba(60,60,80,0.6)" : "rgba(0,240,255,0.12)",
                border: `2px solid ${hud.dashCooldown > 0 ? "rgba(0,240,255,0.15)" : "rgba(0,240,255,0.5)"}`,
                boxShadow: hud.dashCooldown <= 0 ? "0 0 16px rgba(0,240,255,0.3), inset 0 0 12px rgba(0,240,255,0.1)" : "none",
                transition: "all 0.15s ease",
                overflow: "hidden",
                touchAction: "none",
              }}
            >
              {/* Cooldown overlay */}
              {hud.dashCooldown > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${(hud.dashCooldown / 1.5) * 100}%`,
                    background: "rgba(0,0,0,0.4)",
                    transition: "height 0.1s linear",
                    borderRadius: "0 0 50% 50%",
                  }}
                />
              )}
              {/* Cooldown ring SVG */}
              <svg
                width={80}
                height={80}
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                <circle
                  cx={40}
                  cy={40}
                  r={37}
                  fill="none"
                  stroke={hud.dashCooldown <= 0 ? "#00f0ff" : "rgba(0,240,255,0.25)"}
                  strokeWidth={2}
                  strokeDasharray={2 * Math.PI * 37}
                  strokeDashoffset={
                    hud.dashCooldown <= 0
                      ? 0
                      : (hud.dashCooldown / 1.5) * 2 * Math.PI * 37
                  }
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
              </svg>
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: hud.dashCooldown <= 0 ? "#00f0ff" : "rgba(0,240,255,0.3)",
                  textShadow: hud.dashCooldown <= 0 ? "0 0 8px #00f0ff" : "none",
                  fontFamily: "var(--font-geist-mono), monospace",
                  userSelect: "none",
                }}
              >
                DASH
              </span>
            </div>
          )}

          {/* Fullscreen toggle button */}
          <button
            onClick={toggleFullscreen}
            style={{
              position: "absolute",
              top: isMobile ? 10 : 12,
              right: isMobile ? 140 : 160,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(10,10,18,0.5)",
              border: "1px solid rgba(0,240,255,0.2)",
              borderRadius: 6,
              color: "rgba(224,224,240,0.5)",
              cursor: "pointer",
              fontSize: "1rem",
              pointerEvents: "auto",
              padding: 0,
              transition: "all 0.2s",
            }}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? "\u2716" : "\u26F6"}
          </button>
        </div>
      )}

      {/* ============== Upgrade Selection Overlay ============== */}
      {screen === "upgrade" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.8)",
            backdropFilter: "blur(4px)",
          }}
        >
          <h2
            className="glow-gold animate-scale-in"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              color: "#ffd700",
              letterSpacing: "0.1em",
              marginBottom: 32,
            }}
          >
            LEVEL UP!
          </h2>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 800,
              padding: "0 16px",
            }}
          >
            {upgradeChoices.map((choice, i) => {
              const isNew = choice.level === 0;
              return (
              <button
                key={choice.id}
                className="upgrade-card animate-slide-up"
                style={{
                  animationDelay: `${i * 100}ms`,
                  opacity: 0,
                  width: "clamp(200px, 30vw, 240px)",
                  textAlign: "center",
                  borderColor: choice.color,
                  position: "relative",
                }}
                onClick={() => selectUpgrade(i)}
              >
                {isNew && (
                  <div
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      background: "linear-gradient(135deg, #00f0ff, #00bbdd)",
                      color: "#000",
                      fontSize: "0.6rem",
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: 6,
                      letterSpacing: "0.12em",
                      fontFamily: "var(--font-geist-mono), monospace",
                      boxShadow: "0 0 10px rgba(0,240,255,0.5), 0 0 20px rgba(0,240,255,0.2)",
                      zIndex: 2,
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  >
                    NEW
                  </div>
                )}
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>
                  {choice.icon}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: choice.color,
                    marginBottom: 6,
                  }}
                >
                  {choice.name}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "rgba(224,224,240,0.85)",
                    lineHeight: 1.6,
                    marginBottom: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "rgba(0,238,255,0.04)",
                    border: "1px solid rgba(0,238,255,0.08)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    textShadow: "0 0 8px rgba(0,240,255,0.15)",
                  }}
                >
                  {choice.description}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(224,224,240,0.35)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {isNew ? (
                    <span style={{ color: "#00f0ff", fontWeight: 600 }}>New Ability</span>
                  ) : (
                    <>Lv.{choice.level} {"\u2192"} Lv.{Math.min(choice.level + 1, choice.maxLevel)}</>
                  )}
                </div>
                {choice.synergy && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "4px 10px",
                      background: "rgba(255, 215, 0, 0.12)",
                      border: `1px solid ${choice.synergy.color}`,
                      borderRadius: 6,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#ffd700",
                      fontFamily: "var(--font-geist-mono), monospace",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {choice.synergy.icon} SYNERGY: {choice.synergy.name}
                  </div>
                )}
              </button>
              );
            })}
          </div>

          {/* Reroll button — max 2 rerolls per level-up, costs increase */}
          {rerollsUsed < 2 && (
            <button
              onClick={() => {
                if (engineRef.current) {
                  engineRef.current.rerollUpgradeChoices();
                  setRerollsUsed(prev => prev + 1);
                }
              }}
              style={{
                marginTop: 20,
                padding: "8px 24px",
                background: "rgba(255, 170, 0, 0.12)",
                border: "1px solid rgba(255, 170, 0, 0.4)",
                borderRadius: 8,
                color: "#ffaa00",
                fontSize: "0.85rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 170, 0, 0.25)";
                e.currentTarget.style.borderColor = "rgba(255, 170, 0, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 170, 0, 0.12)";
                e.currentTarget.style.borderColor = "rgba(255, 170, 0, 0.4)";
              }}
            >
              {"\u{1F3B2}"} Reroll ({2 - rerollsUsed} left)
            </button>
          )}
        </div>
      )}

      {/* ============== Pause Menu Overlay ============== */}
      {screen === "paused" && (() => {
        const pauseMono = "var(--font-geist-mono), monospace";
        const pauseCyan = "#00f0ff";
        const pauseDimWhite = "rgba(224,224,240,0.55)";
        const pauseSectionStyle: React.CSSProperties = {
          border: "1px solid rgba(0,238,255,0.15)",
          borderRadius: 12,
          padding: isMobile ? "12px 14px" : "14px 20px",
          background: "rgba(0,238,255,0.03)",
          backdropFilter: "blur(4px)",
          width: "100%",
          maxWidth: 380,
        };
        // Detect active synergies from current abilities
        const abilityIds = hud.abilities.map(a => a.id);
        const activeSynergies = (() => {
          try {
            // Inline synergy detection since we can't async-import in render
            const SYNERGY_PAIRS: { name: string; icon: string; color: string; required: string[] }[] = [
              { name: "Elemental Storm", icon: "\u26A1", color: "#00ccff", required: ["chain_lightning", "frost_aura"] },
              { name: "Bullet Hell", icon: "\uD83D\uDD2B", color: "#ff4488", required: ["radial_shot", "auto_cannon"] },
              { name: "Artillery Command", icon: "\uD83C\uDF1F", color: "#ff8800", required: ["missile_swarm", "gravity_well"] },
              { name: "Cosmic Barrier", icon: "\uD83D\uDEE1\uFE0F", color: "#aaddff", required: ["orbit_shield", "frost_aura"] },
              { name: "Rapid Fire", icon: "\u26A1", color: "#ffcc00", required: ["auto_cannon", "xp_magnet"] },
              { name: "Death Zone", icon: "\u2620\uFE0F", color: "#9944ff", required: ["gravity_well", "chain_lightning"] },
              { name: "Nova Cascade", icon: "\uD83D\uDD25", color: "#ff4466", required: ["radial_shot", "plasma_wave"] },
            ];
            const owned = new Set(abilityIds);
            return SYNERGY_PAIRS.filter(s => s.required.every(id => owned.has(id)));
          } catch {
            return [];
          }
        })();
        // Find character info
        const currentChar = characterDefs.find(c => c.id === selectedCharacter);

        return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.82)",
            backdropFilter: "blur(8px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="animate-scale-in" style={{
            textAlign: "center",
            padding: isMobile ? "24px 16px 40px" : "32px 24px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            maxWidth: 420,
            width: "100%",
          }}>
            <h2
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
                fontWeight: 900,
                color: pauseCyan,
                letterSpacing: "0.15em",
                marginBottom: 4,
                textShadow: "0 0 10px #00f0ff, 0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.4)",
              }}
            >
              PAUSED
            </h2>

            {/* Character badge */}
            {currentChar && (
              <div style={{
                fontSize: "0.82rem",
                color: currentChar.color,
                fontFamily: pauseMono,
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{ fontSize: "1.1rem" }}>{currentChar.icon}</span>
                <span style={{ fontWeight: 700 }}>{currentChar.name}</span>
              </div>
            )}

            {/* Run Stats Section */}
            <div style={pauseSectionStyle}>
              <div style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(224,224,240,0.4)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}>
                Run Stats
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                {[
                  { label: "Wave", value: hud.wave, color: pauseCyan },
                  { label: "Level", value: hud.level, color: pauseCyan },
                  { label: "Score", value: hud.score.toLocaleString(), color: "#ffd700" },
                  { label: "Kills", value: hud.enemiesKilled.toLocaleString(), color: "#ff00aa" },
                ].map((stat) => (
                  <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                    <span style={{ color: pauseDimWhite, fontSize: isMobile ? "0.76rem" : "0.82rem" }}>{stat.label}</span>
                    <span style={{ color: stat.color, fontFamily: pauseMono, fontSize: isMobile ? "0.8rem" : "0.88rem", fontWeight: 600 }}>{stat.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", marginTop: 2 }}>
                <span style={{ color: pauseDimWhite, fontSize: isMobile ? "0.76rem" : "0.82rem" }}>Time Survived</span>
                <span style={{ color: pauseCyan, fontFamily: pauseMono, fontSize: isMobile ? "0.8rem" : "0.88rem", fontWeight: 600 }}>{formatTime(hud.time)}</span>
              </div>
            </div>

            {/* Active Abilities */}
            {hud.abilities.length > 0 && (
              <div style={pauseSectionStyle}>
                <div style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "rgba(224,224,240,0.4)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}>
                  Active Abilities
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                }}>
                  {hud.abilities.map((ability, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1px solid ${ability.color}33`,
                      background: `${ability.color}0a`,
                    }}>
                      <span style={{ fontSize: "1rem" }}>{ability.icon}</span>
                      <span style={{
                        fontSize: "0.72rem",
                        color: ability.color,
                        fontFamily: pauseMono,
                        fontWeight: 600,
                      }}>
                        Lv.{ability.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evolution Guide */}
            {(() => {
              const EVOLUTION_INFO: Record<string, { name: string; icon: string; color: string }> = {
                radial_shot: { name: "Nova Burst", icon: "\uD83C\uDF1F", color: "#ff00ff" },
                auto_cannon: { name: "Railgun", icon: "\u26A1", color: "#ffdd00" },
                chain_lightning: { name: "Thunder Storm", icon: "\uD83C\uDF29\uFE0F", color: "#ffffff" },
                missile_swarm: { name: "Void Artillery", icon: "\u2604\uFE0F", color: "#ff0044" },
                gravity_well: { name: "Singularity", icon: "\uD83D\uDD73\uFE0F", color: "#440088" },
                plasma_wave: { name: "Supernova", icon: "\uD83D\uDCA5", color: "#ff88cc" },
                void_beam: { name: "Annihilation Ray", icon: "\u2604\uFE0F", color: "#ff44ff" },
              };
              const evolvableAbilities = hud.abilities.filter(a => a.id in EVOLUTION_INFO);
              if (evolvableAbilities.length === 0) return null;
              return (
                <div style={{
                  ...pauseSectionStyle,
                  borderColor: "rgba(255,215,0,0.18)",
                  background: "rgba(255,215,0,0.02)",
                }}>
                  <div style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "rgba(255,215,0,0.55)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}>
                    Evolution Guide
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {evolvableAbilities.map((ability, i) => {
                      const evo = EVOLUTION_INFO[ability.id];
                      if (!evo) return null;
                      const isEvolved = ability.evolved;
                      return (
                        <div key={i} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.72rem",
                          fontFamily: pauseMono,
                        }}>
                          {isEvolved ? (
                            <>
                              <span style={{ color: "#00ff88", fontWeight: 700 }}>{"\u2713"}</span>
                              <span style={{ color: evo.color, fontWeight: 600 }}>{evo.icon} {evo.name}</span>
                              <span style={{ color: "rgba(0,255,136,0.6)", fontSize: "0.62rem", fontWeight: 700 }}>(EVOLVED)</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: "0.85rem" }}>{ability.icon}</span>
                              <span style={{ color: ability.color }}>{ability.name}</span>
                              <span style={{ color: "rgba(224,224,240,0.35)", fontSize: "0.65rem" }}>(Lv.{ability.level}/{ability.maxLevel})</span>
                              <span style={{ color: "rgba(255,215,0,0.5)" }}>{"\u2192"}</span>
                              <span style={{ color: evo.color, fontWeight: 600 }}>{evo.icon} {evo.name}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Active Synergies */}
            {activeSynergies.length > 0 && (
              <div style={{
                ...pauseSectionStyle,
                borderColor: "rgba(255,215,0,0.2)",
                background: "rgba(255,215,0,0.03)",
              }}>
                <div style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "rgba(255,215,0,0.55)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}>
                  Active Synergies
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  justifyContent: "center",
                }}>
                  {activeSynergies.map((syn, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1px solid ${syn.color}44`,
                      background: `${syn.color}0d`,
                    }}>
                      <span style={{ fontSize: "0.9rem" }}>{syn.icon}</span>
                      <span style={{
                        fontSize: "0.72rem",
                        color: syn.color,
                        fontFamily: pauseMono,
                        fontWeight: 600,
                      }}>
                        {syn.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How to Play */}
            <div style={{
              ...pauseSectionStyle,
              borderColor: "rgba(170,68,255,0.15)",
              background: "rgba(170,68,255,0.03)",
            }}>
              <div style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(170,68,255,0.55)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}>
                Controls
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "4px 12px",
                fontSize: "0.78rem",
              }}>
                {[
                  { key: "WASD", action: "Move" },
                  { key: "SPACE", action: "Dash" },
                  { key: "P / ESC", action: "Pause" },
                ].map(({ key, action }) => (
                  <React.Fragment key={key}>
                    <span style={{
                      color: "#aa44ff",
                      fontFamily: pauseMono,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(170,68,255,0.1)",
                      border: "1px solid rgba(170,68,255,0.2)",
                      textAlign: "center",
                    }}>
                      {key}
                    </span>
                    <span style={{ color: pauseDimWhite, textAlign: "left", lineHeight: "1.8" }}>
                      {action}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <button
                className="btn-neon-filled"
                onClick={resumeGame}
                style={{ fontSize: "1.1rem", padding: "12px 48px", minWidth: 220 }}
              >
                RESUME
              </button>
              <button
                className="btn-neon"
                onClick={restartGame}
                style={{ fontSize: "0.95rem", padding: "10px 40px", minWidth: 220 }}
              >
                RESTART
              </button>
              <button
                className="btn-neon"
                onClick={backToMenu}
                style={{ fontSize: "0.95rem", padding: "10px 40px", minWidth: 220 }}
              >
                MAIN MENU
              </button>
              <button
                className="btn-neon"
                onClick={() => {
                  setSettingsReturnScreen("paused");
                  setScreen("settings");
                }}
                style={{ fontSize: "0.95rem", padding: "10px 40px", minWidth: 220 }}
              >
                SETTINGS
              </button>
              <button
                onClick={toggleSound}
                style={{
                  marginTop: 4,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "rgba(224, 224, 240, 0.6)",
                  padding: "8px 24px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  minWidth: 220,
                  backdropFilter: "blur(4px)",
                }}
              >
                {soundEnabled ? "\u{1F50A} Sound On" : "\u{1F507} Sound Off"}
              </button>
            </div>

            <p
              style={{
                color: "rgba(224, 224, 240, 0.25)",
                fontSize: "0.75rem",
                marginTop: 8,
                letterSpacing: "0.08em",
              }}
            >
              Press ESC to resume
            </p>
          </div>
        </div>
        );
      })()}

      {/* ============== Settings Screen ============== */}
      {screen === "settings" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.92)",
            backdropFilter: "blur(6px)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            className="animate-scale-in"
            style={{
              textAlign: "center",
              maxWidth: 480,
              width: "90%",
              padding: "0 20px",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 900,
                color: "#00f0ff",
                letterSpacing: "0.15em",
                marginBottom: 32,
                textShadow: "0 0 10px #00f0ff, 0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.4)",
              }}
            >
              {"\u2699\uFE0F"} SETTINGS
            </h2>

            {/* Sound Section */}
            <div
              style={{
                background: "rgba(0,238,255,0.04)",
                border: "1px solid rgba(0,238,255,0.15)",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              <h3 style={{ color: "#00eeff", fontSize: "1rem", fontWeight: 700, marginBottom: 16, letterSpacing: "0.1em" }}>
                {"\u{1F50A}"} Sound
              </h3>

              {/* Master Volume */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    Master Volume
                  </label>
                  <span style={{ color: "#00eeff", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono), monospace", minWidth: 36, textAlign: "right" }}>
                    {Math.round(gameSettings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(gameSettings.masterVolume * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    const updated = { ...gameSettings, masterVolume: val };
                    setGameSettings(updated);
                    audioRef.current?.setMasterVolume(val);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  className="settings-slider"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Music Volume */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    Music Volume
                  </label>
                  <span style={{ color: "#00eeff", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono), monospace", minWidth: 36, textAlign: "right" }}>
                    {Math.round(gameSettings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(gameSettings.musicVolume * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    const updated = { ...gameSettings, musicVolume: val };
                    setGameSettings(updated);
                    audioRef.current?.setMusicVolume(val);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  className="settings-slider"
                  style={{ width: "100%" }}
                />
              </div>

              {/* SFX Volume */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    SFX Volume
                  </label>
                  <span style={{ color: "#00eeff", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono), monospace", minWidth: 36, textAlign: "right" }}>
                    {Math.round(gameSettings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(gameSettings.sfxVolume * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    const updated = { ...gameSettings, sfxVolume: val };
                    setGameSettings(updated);
                    audioRef.current?.setSfxVolume(val);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  className="settings-slider"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Mute All */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                  Mute All
                </label>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, muted: !gameSettings.muted };
                    setGameSettings(updated);
                    setSoundEnabled(!updated.muted);
                    if (updated.muted) {
                      audioRef.current?.mute();
                      engineRef.current?.setSoundEnabled(false);
                    } else {
                      audioRef.current?.unmute();
                      engineRef.current?.setSoundEnabled(true);
                    }
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.muted ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.muted ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.muted ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {gameSettings.muted ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Gameplay Section */}
            <div
              style={{
                background: "rgba(0,238,255,0.04)",
                border: "1px solid rgba(0,238,255,0.15)",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              <h3 style={{ color: "#00eeff", fontSize: "1rem", fontWeight: 700, marginBottom: 16, letterSpacing: "0.1em" }}>
                {"\u{1F3AE}"} Gameplay
              </h3>

              {/* Screen Shake Intensity */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    Screen Shake
                  </label>
                  <span style={{ color: "#00eeff", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono), monospace", minWidth: 36, textAlign: "right" }}>
                    {gameSettings.screenShakeIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gameSettings.screenShakeIntensity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const updated = { ...gameSettings, screenShakeIntensity: val };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  className="settings-slider"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Tutorial Hints */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                  Tutorial Hints
                </label>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, tutorialHints: !gameSettings.tutorialHints };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.tutorialHints ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.tutorialHints ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.tutorialHints ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {gameSettings.tutorialHints ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Display Section */}
            <div
              style={{
                background: "rgba(0,238,255,0.04)",
                border: "1px solid rgba(0,238,255,0.15)",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <h3 style={{ color: "#00eeff", fontSize: "1rem", fontWeight: 700, marginBottom: 16, letterSpacing: "0.1em" }}>
                {"\u{1F4F1}"} Display
              </h3>

              {/* Show FPS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                  Show FPS
                </label>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, showFps: !gameSettings.showFps };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.showFps ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.showFps ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.showFps ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {gameSettings.showFps ? "ON" : "OFF"}
                </button>
              </div>

              {/* Show Minimap */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                  Show Minimap
                </label>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, showMinimap: !gameSettings.showMinimap };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.showMinimap ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.showMinimap ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.showMinimap ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {gameSettings.showMinimap ? "ON" : "OFF"}
                </button>
              </div>

              {/* Colorblind Mode */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    Colorblind Mode
                  </label>
                  <p style={{ color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", margin: "2px 0 0 0" }}>
                    Adds shape indicators alongside colors
                  </p>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, colorblindMode: !gameSettings.colorblindMode };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.colorblindMode ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.colorblindMode ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.colorblindMode ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                    marginLeft: 12,
                    flexShrink: 0,
                  }}
                >
                  {gameSettings.colorblindMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* Reduced Motion */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "rgba(224,224,240,0.7)", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                    Reduced Motion
                  </label>
                  <p style={{ color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", margin: "2px 0 0 0" }}>
                    Reduces particles and screen effects
                  </p>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, reducedMotion: !gameSettings.reducedMotion };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.reducedMotion ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.reducedMotion ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.reducedMotion ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                    marginLeft: 12,
                    flexShrink: 0,
                  }}
                >
                  {gameSettings.reducedMotion ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Gameplay Section */}
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ color: "#00eeff", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, opacity: 0.7 }}>Gameplay</h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "rgba(224,224,240,0.85)", fontSize: "0.9rem" }}>
                    Auto-Collect XP
                  </label>
                  <p style={{ color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", margin: "2px 0 0 0" }}>
                    Automatically pulls all XP orbs to you. Recommended for casual play.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...gameSettings, autoCollectXP: !gameSettings.autoCollectXP };
                    setGameSettings(updated);
                    engineRef.current?.applyDisplaySettings(updated);
                    import("@/game/settings").then((m) => m.saveSettings(updated));
                  }}
                  style={{
                    background: gameSettings.autoCollectXP ? "rgba(0,238,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${gameSettings.autoCollectXP ? "#00eeff" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    color: gameSettings.autoCollectXP ? "#00eeff" : "rgba(224,224,240,0.5)",
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-geist-mono), monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {gameSettings.autoCollectXP ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Back Button */}
            <button
              className="btn-neon"
              onClick={() => setScreen(settingsReturnScreen)}
              style={{ fontSize: "1rem", padding: "12px 48px", minWidth: 200 }}
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* ============== Daily Challenge Screen ============== */}
      {screen === "daily" && dailyChallenge && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            background: "rgba(10, 10, 18, 0.92)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 500, padding: "0 20px" }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
                fontWeight: 800,
                color: "#ffaa00",
                textShadow: "0 0 20px rgba(255,170,0,0.5)",
                marginBottom: 8,
                letterSpacing: "0.1em",
              }}
            >
              DAILY CHALLENGE
            </h2>
            <p
              style={{
                color: "rgba(224,224,240,0.4)",
                fontSize: "0.85rem",
                marginBottom: 24,
                letterSpacing: "0.08em",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {dailyChallenge.date}
            </p>

            <div
              style={{
                background: "linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,136,0,0.05))",
                border: "1px solid rgba(255,170,0,0.25)",
                borderRadius: 12,
                padding: "24px 28px",
                marginBottom: 24,
              }}
            >
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#ffcc44",
                  marginBottom: 6,
                  textShadow: "0 0 12px rgba(255,204,68,0.3)",
                }}
              >
                {dailyChallenge.title}
              </h3>
              <p
                style={{
                  color: "rgba(224,224,240,0.5)",
                  fontSize: "0.9rem",
                  marginBottom: 20,
                }}
              >
                {dailyChallenge.description}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dailyChallenge.modifiers.map((mod, i) => {
                  const isPositive = mod.label.startsWith("+");
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: isPositive
                          ? "rgba(0,255,136,0.08)"
                          : "rgba(255,68,68,0.08)",
                        border: isPositive
                          ? "1px solid rgba(0,255,136,0.15)"
                          : "1px solid rgba(255,68,68,0.15)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(224,224,240,0.7)",
                          textTransform: "capitalize",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {mod.type.replace(/_mult$/, "").replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: isPositive ? "#00ff88" : "#ff6666",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {mod.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {dailyResult && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 20px",
                  borderRadius: 8,
                  background: "rgba(255,215,0,0.08)",
                  border: "1px solid rgba(255,215,0,0.2)",
                }}
              >
                <p
                  style={{
                    color: "#ffd700",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "0.05em",
                    margin: 0,
                  }}
                >
                  Today&apos;s Best: {dailyResult.score.toLocaleString()} pts
                </p>
                <p
                  style={{
                    color: "rgba(224,224,240,0.4)",
                    fontSize: "0.75rem",
                    margin: "4px 0 0 0",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  Wave {dailyResult.wave} | {formatTime(dailyResult.time)}
                </p>
              </div>
            )}

            <button
              onClick={startDailyChallenge}
              style={{
                background: "linear-gradient(135deg, #ffaa00, #ff8800)",
                border: "none",
                borderRadius: 10,
                color: "#0a0a12",
                padding: "14px 48px",
                cursor: "pointer",
                fontSize: "1.2rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transition: "all 0.2s",
                boxShadow: "0 0 20px rgba(255,170,0,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 30px rgba(255,170,0,0.5)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(255,170,0,0.3)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {dailyResult ? "Replay Challenge" : "Play Challenge"}
            </button>

            <button
              onClick={() => setScreen("menu")}
              style={{
                marginTop: 16,
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(224, 224, 240, 0.5)",
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: "0.9rem",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* ============== Game Over Overlay ============== */}
      {screen === "gameover" && gameOverStats && (() => {
        const isNewBest = personalBest !== null && gameOverStats.score >= personalBest && newHighScoreRank === 0;
        const comboMultLabel = gameOverStats.longestCombo >= 100 ? "5x"
          : gameOverStats.longestCombo >= 50 ? "3x"
          : gameOverStats.longestCombo >= 25 ? "2x"
          : gameOverStats.longestCombo >= 10 ? "1.5x"
          : "1x";
        const diffColor = gameOverStats.difficulty === "Easy" ? "#00ff88"
          : gameOverStats.difficulty === "Hard" ? "#ff8800"
          : gameOverStats.difficulty === "Nightmare" ? "#ff2244"
          : "#00f0ff";
        const diffGlow = gameOverStats.difficulty === "Easy" ? "rgba(0,255,136,0.4)"
          : gameOverStats.difficulty === "Hard" ? "rgba(255,136,0,0.4)"
          : gameOverStats.difficulty === "Nightmare" ? "rgba(255,34,68,0.4)"
          : "rgba(0,240,255,0.4)";
        const mono = "var(--font-geist-mono), monospace";
        const dimWhite = "rgba(224,224,240,0.55)";
        const cyan = "#00eeff";
        const sectionStyle: React.CSSProperties = {
          border: `1px solid rgba(0,238,255,0.2)`,
          borderRadius: 12,
          padding: isMobile ? "14px 16px" : "16px 24px",
          background: "rgba(0,238,255,0.03)",
          backdropFilter: "blur(4px)",
          width: "100%",
          maxWidth: 380,
        };
        const statRow = (label: string, value: string | number, color: string = cyan) => (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ color: dimWhite, fontSize: isMobile ? "0.78rem" : "0.85rem" }}>{label}</span>
            <span style={{ color, fontFamily: mono, fontSize: isMobile ? "0.82rem" : "0.9rem", fontWeight: 600 }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          </div>
        );
        const goCharDef = characterDefs.find(c => c.id === selectedCharacter);
        // Find the highest-level ability name from the abilitiesUsed list
        // Since we only have names, show the last one (typically highest level acquired last)
        // Use hud.abilities which still has the last state's abilities with levels
        const bestAbility = hud.abilities.length > 0
          ? hud.abilities.reduce((best, cur) => cur.level > best.level ? cur : best, hud.abilities[0])
          : null;

        return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.88)",
            backdropFilter: "blur(8px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <div style={{
            textAlign: "center",
            padding: isMobile ? "28px 16px 40px" : "32px 24px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            maxWidth: 420,
            width: "100%",
            animation: "scaleIn 0.4s ease-out",
          }}>
            {/* Header */}
            <h2
              className="glow-red"
              style={{
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 900,
                color: "#ff2244",
                letterSpacing: "0.1em",
                marginBottom: 0,
              }}
            >
              GAME OVER
            </h2>

            {/* Streak Badge */}
            {hud.streak > 1 && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,136,0,0.4)",
                background: "rgba(255,136,0,0.1)",
                color: "#ff8800",
                fontSize: "0.82rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.05em",
              }}>
                {"\u{1F525}"} {hud.streak}-day streak! +{Math.min((hud.streak - 1) * 5, 50)}% XP
              </div>
            )}

            {/* Character + Difficulty Badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}>
              {goCharDef && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 12px",
                  borderRadius: 8,
                  border: `1px solid ${goCharDef.color}44`,
                  background: `${goCharDef.color}0a`,
                }}>
                  <span style={{ fontSize: "1rem" }}>{goCharDef.icon}</span>
                  <span style={{
                    fontSize: "0.78rem",
                    color: goCharDef.color,
                    fontFamily: mono,
                    fontWeight: 700,
                  }}>
                    {goCharDef.name}
                  </span>
                </div>
              )}
              <div style={{
                padding: "4px 14px",
                borderRadius: 8,
                border: `1px solid ${diffColor}55`,
                background: `${diffColor}0d`,
              }}>
                <span style={{
                  fontSize: "0.78rem",
                  color: diffColor,
                  fontFamily: mono,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textShadow: `0 0 8px ${diffGlow}`,
                }}>
                  {(gameOverStats.difficulty || "Normal").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Run summary line */}
            <div style={{
              fontSize: isMobile ? "0.82rem" : "0.9rem",
              color: "rgba(224,224,240,0.6)",
              fontFamily: mono,
              letterSpacing: "0.05em",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}>
              <span>Wave <span style={{ color: cyan }}>{gameOverStats.wavesSurvived}</span></span>
              <span style={{ opacity: 0.4 }}>{"\u2022"}</span>
              <span><span style={{ color: cyan }}>{formatTime(gameOverStats.timeSurvived)}</span></span>
              <span style={{ opacity: 0.4 }}>{"\u2022"}</span>
              <span>Level <span style={{ color: cyan }}>{gameOverStats.level}</span></span>
            </div>

            {/* Score Section */}
            <div style={{ ...sectionStyle, borderColor: isNewBest ? "rgba(255,215,0,0.4)" : "rgba(0,238,255,0.2)" }}>
              <div style={{
                fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
                fontWeight: 900,
                color: isNewBest ? "#ffd700" : cyan,
                fontFamily: mono,
                textShadow: isNewBest ? "0 0 20px rgba(255,215,0,0.6)" : `0 0 15px rgba(0,238,255,0.4)`,
                letterSpacing: "0.04em",
              }}>
                {gameOverStats.score.toLocaleString()}
              </div>
              {gameOverStats.scoreMult !== 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 4, fontSize: "0.78rem" }}>
                  <span style={{
                    color: diffColor,
                    fontFamily: mono,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    opacity: 0.7,
                  }}>
                    Score Multiplier: {gameOverStats.scoreMult}x
                  </span>
                </div>
              )}
              {isNewBest && (
                <div style={{
                  marginTop: 8,
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#ffd700",
                  letterSpacing: "0.15em",
                  textShadow: "0 0 12px rgba(255,215,0,0.6)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  NEW PERSONAL BEST!
                </div>
              )}
              {personalBest !== null && !isNewBest && (
                <div style={{
                  marginTop: 6,
                  fontSize: "0.75rem",
                  color: "rgba(224,224,240,0.35)",
                  fontFamily: mono,
                }}>
                  Personal Best: {personalBest.toLocaleString()}
                </div>
              )}
            </div>

            {/* Global Leaderboard Rank */}
            {globalRank && (
              <div style={{
                ...sectionStyle,
                borderColor: "rgba(255,170,0,0.3)",
                background: "rgba(255,170,0,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: isMobile ? "10px 16px" : "12px 24px",
              }}>
                <span style={{ fontSize: "1rem" }}>{"\uD83C\uDFC6"}</span>
                <span style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#ffaa00",
                  fontFamily: mono,
                  letterSpacing: "0.04em",
                  textShadow: "0 0 10px rgba(255,170,0,0.4)",
                }}>
                  #{globalRank.rank.toLocaleString()}
                </span>
                <span style={{
                  fontSize: "0.8rem",
                  color: "rgba(224,224,240,0.45)",
                  fontFamily: mono,
                }}>
                  of {globalRank.total.toLocaleString()} players
                </span>
              </div>
            )}

            {/* Combat Stats Section */}
            <div style={sectionStyle}>
              <div style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(224,224,240,0.4)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}>
                Combat Stats
              </div>
              {statRow("Kills", gameOverStats.enemiesKilled, "#ff00aa")}
              {gameOverStats.elitesKilled > 0 && statRow("Elites", gameOverStats.elitesKilled, "#ff8800")}
              {gameOverStats.bossesKilled > 0 && statRow("Bosses", gameOverStats.bossesKilled, "#ffdd00")}
              {statRow("Damage Dealt", gameOverStats.damageDealt)}
              {statRow("Damage Taken", gameOverStats.damageTaken, "#ff4466")}
              {statRow("Best Combo", `${gameOverStats.longestCombo}x (${comboMultLabel})`, "#ffdd00")}
            </div>

            {/* Progression Section */}
            <div style={sectionStyle}>
              <div style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "rgba(224,224,240,0.4)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}>
                Progression
              </div>
              {statRow("XP Collected", gameOverStats.xpCollected, "#00ff88")}
              {statRow("Loot Pickups", gameOverStats.lootCollected, "#2288ff")}
              {gameOverStats.abilitiesUsed.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: dimWhite, fontSize: isMobile ? "0.78rem" : "0.85rem", marginBottom: 4 }}>Abilities</div>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}>
                    {gameOverStats.abilitiesUsed.map((name, i) => (
                      <span key={i} style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(0,238,255,0.25)",
                        background: "rgba(0,238,255,0.06)",
                        color: cyan,
                        fontFamily: mono,
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Best Ability Highlight */}
            {bestAbility && (
              <div style={{
                ...sectionStyle,
                borderColor: "rgba(255,215,0,0.25)",
                background: "linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,170,0,0.02))",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isMobile ? "12px 16px" : "14px 20px",
              }}>
                <span style={{ fontSize: "1.6rem" }}>{bestAbility.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "rgba(255,215,0,0.5)",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}>
                    Best Ability
                  </div>
                  <div style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: bestAbility.color,
                    fontFamily: mono,
                  }}>
                    {bestAbility.name}
                    <span style={{
                      marginLeft: 8,
                      fontSize: "0.78rem",
                      color: "#ffd700",
                      fontWeight: 600,
                    }}>
                      Lv.{bestAbility.level}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Void Essence Earned */}
            {lastEssenceEarned > 0 && (
              <div style={{
                ...sectionStyle,
                borderColor: "rgba(170,102,255,0.3)",
                background: "rgba(170,102,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: isMobile ? "12px 16px" : "14px 24px",
              }}>
                <span style={{ fontSize: "1.2rem" }}>{"\uD83D\uDCB0"}</span>
                <span style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#aa66ff",
                  fontFamily: mono,
                  letterSpacing: "0.06em",
                  textShadow: "0 0 12px rgba(170,102,255,0.5)",
                }}>
                  +{lastEssenceEarned.toLocaleString()} Void Essence
                </span>
              </div>
            )}

            {/* High Scores */}
            {highScores.length > 0 && (
              <div style={{ ...sectionStyle, borderColor: "rgba(255,215,0,0.2)", background: "rgba(255,215,0,0.02)" }}>
                <div style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "rgba(255,215,0,0.6)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}>
                  High Scores
                </div>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontFamily: mono,
                    fontSize: "0.78rem",
                  }}
                >
                  <thead>
                    <tr style={{ color: "rgba(224,224,240,0.35)", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                      <th style={{ padding: "2px 6px", textAlign: "left" }}>#</th>
                      <th style={{ padding: "2px 6px", textAlign: "right" }}>SCORE</th>
                      <th style={{ padding: "2px 6px", textAlign: "right" }}>LVL</th>
                      <th style={{ padding: "2px 6px", textAlign: "right" }}>TIME</th>
                      <th style={{ padding: "2px 6px", textAlign: "left" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {highScores.map((entry, i) => {
                      const isNew = i === newHighScoreRank;
                      return (
                        <tr key={i} style={{ color: isNew ? "#ffd700" : "rgba(224,224,240,0.6)" }}>
                          <td style={{ padding: "2px 6px", textAlign: "left" }}>{i + 1}</td>
                          <td style={{ padding: "2px 6px", textAlign: "right", color: isNew ? "#ffd700" : cyan }}>
                            {entry.score.toLocaleString()}
                          </td>
                          <td style={{ padding: "2px 6px", textAlign: "right" }}>{entry.level}</td>
                          <td style={{ padding: "2px 6px", textAlign: "right" }}>{formatTime(entry.time)}</td>
                          <td style={{ padding: "2px 6px", textAlign: "left" }}>
                            {isNew && (
                              <span style={{
                                color: "#ffd700",
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                letterSpacing: "0.05em",
                                textShadow: "0 0 6px rgba(255,215,0,0.6)",
                              }}>
                                NEW!
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Achievement Progress */}
            {achievementCount.total > 0 && (
              <div style={{
                fontSize: "0.78rem",
                color: "rgba(224,224,240,0.35)",
                letterSpacing: "0.1em",
              }}>
                Achievements: {achievementCount.unlocked} / {achievementCount.total}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                justifyContent: "center",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <button className="btn-neon-filled" onClick={restartGame}>
                PLAY AGAIN
              </button>
              <button
                onClick={handleShareScore}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  transition: "opacity 0.2s, transform 0.2s",
                  opacity: shareStatus !== "idle" ? 0.85 : 1,
                  textShadow: "0 0 8px rgba(139,92,246,0.5)",
                  minWidth: 140,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = shareStatus !== "idle" ? "0.85" : "1"; }}
              >
                {shareStatus === "shared"
                  ? "Shared! \u2713"
                  : shareStatus === "copied"
                  ? "Copied! \u2713"
                  : "\u{1F4F8} Share"}
              </button>
              <button className="btn-neon" onClick={backToMenu}>
                MENU
              </button>
            </div>

            {/* PWA Install Banner */}
            {showInstallBanner && deferredPromptRef.current && (
              <div style={{
                marginTop: 16,
                padding: 2,
                borderRadius: 14,
                background: "linear-gradient(135deg, #00f0ff, #aa44ff)",
                maxWidth: 380,
                width: "100%",
                animation: "scaleIn 0.4s ease-out",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(10, 10, 18, 0.95)",
                  position: "relative",
                }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{"\u{1F4F2}"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.8rem",
                      color: "rgba(224,224,240,0.9)",
                      fontFamily: mono,
                      lineHeight: 1.4,
                    }}>
                      Install Void Survivors for offline play and faster loading
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const prompt = deferredPromptRef.current as (Event & { prompt: () => Promise<{ outcome: string }>; }) | null;
                      if (!prompt) return;
                      prompt.prompt().then((result) => {
                        if (result.outcome === "accepted") {
                          deferredPromptRef.current = null;
                          setShowInstallBtn(false);
                        }
                      });
                      setShowInstallBanner(false);
                    }}
                    style={{
                      padding: "6px 16px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#0a0a12",
                      background: "linear-gradient(135deg, #00f0ff, #aa44ff)",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Install
                  </button>
                  <button
                    onClick={() => setShowInstallBanner(false)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 6,
                      background: "none",
                      border: "none",
                      color: "rgba(224,224,240,0.4)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      lineHeight: 1,
                      padding: "2px 4px",
                    }}
                    aria-label="Dismiss install banner"
                  >
                    {"\u2715"}
                  </button>
                </div>
              </div>
            )}

            {/* Loading Tip */}
            <div style={{
              marginTop: 16,
              padding: "12px 20px",
              borderRadius: 12,
              border: "1px solid rgba(0,240,255,0.18)",
              background: "linear-gradient(135deg, rgba(0,240,255,0.06), rgba(170,102,255,0.04))",
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
            }}>
              <div style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(0,240,255,0.5)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}>
                TIP
              </div>
              <div style={{
                fontSize: isMobile ? "0.76rem" : "0.82rem",
                color: "rgba(224,224,240,0.7)",
                fontFamily: mono,
                lineHeight: 1.5,
                letterSpacing: "0.02em",
              }}>
                {LOADING_TIPS[gameOverTipIndex]}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ============== Leaderboard Screen ============== */}
      {screen === "leaderboard" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 30, background: "rgba(10, 10, 18, 0.92)", backdropFilter: "blur(6px)", animation: "fadeIn 0.3s ease-out" }}>
          <div style={{ textAlign: "center", maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 900, color: "#ffaa00", letterSpacing: "0.12em", marginBottom: 8, textShadow: "0 0 10px rgba(255,170,0,0.6)" }}>
              {"\u{1F3C6}"} LEADERBOARD
            </h2>
            <div style={{ display: "flex", gap: 0, marginBottom: 20, justifyContent: "center" }}>
              {(["alltime", "daily"] as const).map((tab) => {
                const isActive = leaderboardTab === tab;
                return (
                  <button key={tab} onClick={() => { setLeaderboardTab(tab); fetchLeaderboard(tab); }} style={{ padding: "8px 24px", fontSize: "0.85rem", fontWeight: 700, background: "transparent", color: isActive ? "#ffaa00" : "rgba(224,224,240,0.4)", border: "none", borderBottom: isActive ? "2px solid #ffaa00" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.08em" }}>
                    {tab === "alltime" ? "All Time" : "Today"}
                  </button>
                );
              })}
            </div>
            {!playerName && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.8rem", marginBottom: 8 }}>Enter your name to appear on the leaderboard:</p>
                <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).elements.namedItem("pname") as HTMLInputElement; if (input.value.trim()) { const name = input.value.replace(/[^a-zA-Z0-9_ -]/g, "").trim().substring(0, 20); localStorage.setItem("void-survivors-player-name", name); setPlayerName(name); } }} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <input name="pname" type="text" maxLength={20} placeholder="Your name..." style={{ padding: "8px 14px", fontSize: "0.85rem", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 6, color: "#fff", fontFamily: "var(--font-geist-mono), monospace", outline: "none", width: 180 }} />
                  <button type="submit" style={{ padding: "8px 16px", fontSize: "0.85rem", fontWeight: 700, background: "rgba(255,170,0,0.15)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: 6, color: "#ffaa00", cursor: "pointer", fontFamily: "var(--font-geist-mono), monospace" }}>Set</button>
                </form>
              </div>
            )}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,170,0,0.15)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              {leaderboardLoading && <p style={{ color: "rgba(224,224,240,0.5)", fontSize: "0.85rem", padding: 20 }}>Loading...</p>}
              {leaderboardError && <p style={{ color: "rgba(255,170,0,0.6)", fontSize: "0.85rem", padding: 20 }}>{leaderboardError}</p>}
              {!leaderboardLoading && !leaderboardError && leaderboardData && (
                <>
                  {leaderboardData.entries.length === 0 ? (
                    <p style={{ color: "rgba(224,224,240,0.4)", fontSize: "0.85rem", padding: 20 }}>No scores yet. Be the first!</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={{ padding: "6px 8px", textAlign: "left", color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,170,0,0.1)" }}>#</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,170,0,0.1)" }}>PLAYER</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(224,224,240,0.4)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,170,0,0.1)" }}>SCORE</th>
                      </tr></thead>
                      <tbody>
                        {leaderboardData.entries.map((entry) => {
                          const isMe = entry.name === playerName;
                          const rankColor = entry.rank <= 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][entry.rank - 1] : "rgba(224,224,240,0.5)";
                          return (
                            <tr key={entry.rank} style={{ background: isMe ? "rgba(255,170,0,0.08)" : "transparent" }}>
                              <td style={{ padding: "8px", color: rankColor, fontWeight: entry.rank <= 3 ? 800 : 400, fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>{entry.rank <= 3 ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][entry.rank - 1] : entry.rank}</td>
                              <td style={{ padding: "8px", color: isMe ? "#ffaa00" : "rgba(224,224,240,0.8)", fontWeight: isMe ? 700 : 400, fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>{entry.name}{isMe ? " (you)" : ""}</td>
                              <td style={{ padding: "8px", textAlign: "right", color: "#00eeff", fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-geist-mono), monospace" }}>{entry.score.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {leaderboardData.total > 0 && <p style={{ color: "rgba(224,224,240,0.3)", fontSize: "0.7rem", marginTop: 12, textAlign: "center" }}>{leaderboardData.total.toLocaleString()} total players</p>}
                </>
              )}
            </div>
            <button onClick={() => setScreen("menu")} style={{ padding: "10px 32px", fontSize: "0.9rem", fontWeight: 700, background: "transparent", color: "#00eeff", border: "1px solid rgba(0,238,255,0.3)", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.08em" }}>Back to Menu</button>
          </div>
        </div>
      )}

      {/* ============== Player Name Prompt Modal ============== */}
      {showNamePrompt && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            background: "rgba(5, 5, 12, 0.75)",
            backdropFilter: "blur(6px)",
            animation: "fadeIn 0.3s ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNamePrompt(false);
            }
          }}
        >
          <div
            style={{
              background: "rgba(10, 10, 22, 0.95)",
              border: "1px solid rgba(0,240,255,0.25)",
              borderRadius: 16,
              padding: "32px 36px",
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 40px rgba(0,240,255,0.08), 0 0 80px rgba(255,0,170,0.04)",
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div style={{
              fontSize: "1.6rem",
              marginBottom: 8,
            }}>
              {"\uD83C\uDFAE"}
            </div>
            <h3 style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#00f0ff",
              letterSpacing: "0.1em",
              marginBottom: 8,
              textShadow: "0 0 10px rgba(0,240,255,0.4)",
            }}>
              ENTER YOUR NAME
            </h3>
            <p style={{
              fontSize: "0.8rem",
              color: "rgba(224,224,240,0.5)",
              lineHeight: 1.5,
              marginBottom: 20,
            }}>
              Set a name to appear on the global leaderboard and track your scores.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = pendingNameInput.replace(/[^a-zA-Z0-9_ -]/g, "").trim().substring(0, 20);
                if (name) {
                  localStorage.setItem("void-survivors-player-name", name);
                  setPlayerName(name);
                  // Submit score with the new name
                  if (gameOverStats && gameOverStats.score > 0) {
                    fetch("/api/leaderboard", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name,
                        score: gameOverStats.score,
                        wave: gameOverStats.wavesSurvived,
                        time: gameOverStats.timeSurvived,
                        kills: gameOverStats.enemiesKilled,
                        level: gameOverStats.level,
                      }),
                    })
                      .then((res) => res.ok ? res.json() : null)
                      .then((data) => {
                        if (data?.rank != null && data?.totalPlayers != null) {
                          setGlobalRank({ rank: data.rank, total: data.totalPlayers });
                        }
                      })
                      .catch(() => {});
                  }
                }
                setShowNamePrompt(false);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}
            >
              <input
                type="text"
                maxLength={20}
                placeholder="Your name..."
                value={pendingNameInput}
                onChange={(e) => setPendingNameInput(e.target.value)}
                autoFocus
                style={{
                  padding: "10px 16px",
                  fontSize: "1rem",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(0,240,255,0.3)",
                  borderRadius: 8,
                  color: "#fff",
                  fontFamily: "var(--font-geist-mono), monospace",
                  outline: "none",
                  width: "100%",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#00f0ff"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; }}
              />
              <button
                type="submit"
                disabled={!pendingNameInput.trim()}
                style={{
                  padding: "10px 32px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  background: pendingNameInput.trim()
                    ? "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,240,255,0.08))"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${pendingNameInput.trim() ? "#00f0ff" : "rgba(224,224,240,0.15)"}`,
                  borderRadius: 8,
                  color: pendingNameInput.trim() ? "#00f0ff" : "rgba(224,224,240,0.3)",
                  cursor: pendingNameInput.trim() ? "pointer" : "default",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.1em",
                  width: "100%",
                  transition: "all 0.2s",
                  textShadow: pendingNameInput.trim() ? "0 0 8px rgba(0,240,255,0.4)" : "none",
                }}
              >
                SET NAME
              </button>
              <button
                type="button"
                onClick={() => setShowNamePrompt(false)}
                style={{
                  padding: "8px 24px",
                  fontSize: "0.78rem",
                  fontWeight: 400,
                  background: "none",
                  border: "none",
                  color: "rgba(224,224,240,0.35)",
                  cursor: "pointer",
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.08em",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(224,224,240,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(224,224,240,0.35)"; }}
              >
                Skip — play anonymously
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============== Achievement Toast Notifications ============== */}
      {achievementToasts.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {achievementToasts.map((toast) => {
            const tierColor =
              toast.tier === "platinum" ? "#e5e4e2" :
              toast.tier === "gold" ? "#ffd700" :
              toast.tier === "silver" ? "#c0c0c0" : "#cd7f32";
            return (
              <div
                key={toast.id}
                className="animate-slide-up"
                style={{
                  background: "rgba(10, 10, 20, 0.9)",
                  border: `1px solid ${tierColor}`,
                  borderRadius: 10,
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 0 15px ${tierColor}40, 0 0 30px ${tierColor}20`,
                  minWidth: 220,
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>{toast.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      color: tierColor,
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    Achievement Unlocked
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    {toast.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
