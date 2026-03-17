"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  abilities: { icon: string; name: string; level: number; color: string }[];
  combo: number;
  maxCombo: number;
  dashCooldown: number;
}

interface GameOverStats {
  timeSurvived: number;
  score: number;
  level: number;
  enemiesKilled: number;
  wavesSurvived: number;
  maxCombo: number;
  bossesKilled: number;
}

interface AchievementToast {
  id: string;
  name: string;
  icon: string;
  tier: string;
  expiresAt: number;
}

type GameScreen = "menu" | "playing" | "paused" | "upgrade" | "gameover";

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
}

// We expect GameEngine from @/game/engine to follow this interface:
interface GameEngineInterface {
  start: (canvas: HTMLCanvasElement, callbacks: EngineCallbacks) => void;
  cleanup: () => void;
  resume: () => void;
  pause: () => void;
  selectUpgrade: (index: number) => void;
  restart: () => void;
  setSoundEnabled: (enabled: boolean) => void;
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
  });
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeChoice[]>([]);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(
    null
  );
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
  const audioRef = useRef<import("@/game/audio").AudioManager | null>(null);

  // Joystick state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickDelta, setJoystickDelta] = useState({ x: 0, y: 0 });
  const joystickCenter = useRef({ x: 0, y: 0 });

  // -----------------------------------------------------------------------
  // Load high scores, achievements, and stats on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    const scores = loadHighScores();
    setHighScores(scores);
    if (scores.length > 0) {
      setPersonalBest(scores[0].score);
    }

    // Load achievement manager and lifetime stats
    Promise.all([
      import("@/game/achievements"),
      import("@/game/stats"),
      import("@/game/audio"),
    ]).then(([achMod, statsMod, audioMod]) => {
      const mgr = new achMod.AchievementManager();
      achievementManagerRef.current = mgr;
      setAchievementCount({ unlocked: mgr.getUnlockedCount(), total: mgr.getTotalCount() });

      const stats = statsMod.loadLifetimeStats();
      setLifetimeStats(stats);

      audioRef.current = audioMod.AudioManager.getInstance();
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
    setScreen("upgrade");
  }, []);

  const handleGameOver = useCallback(async (stats: GameOverStats) => {
    setGameOverStats(stats);
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
      });
      statsMod.saveLifetimeStats(updated);
      setLifetimeStats(updated);

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

    setScreen("gameover");
  }, []);

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
  }) => {
    const mgr = achievementManagerRef.current;
    if (!mgr) return;

    const lt = lifetimeStats || { gamesPlayed: 0, totalKills: 0, totalPlaytime: 0, bossesKilled: 0 };

    mgr.check({
      ...stats,
      gamesPlayed: lt.gamesPlayed,
      totalKills: lt.totalKills + stats.kills,
      totalPlaytime: lt.totalPlaytime + stats.timeSurvived,
      bossesKilled: lt.bossesKilled,
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
    engineRef.current.start(canvasRef.current, {
      onStateChange: handleStateChange,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
      onAchievementCheck: handleAchievementCheck,
    });
    engineRef.current.setSoundEnabled(soundEnabled);
    setScreen("playing");
  }, [handleStateChange, handleLevelUp, handleGameOver, handleAchievementCheck, soundEnabled]);

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
    engineRef.current?.start(canvasRef.current!, {
      onStateChange: handleStateChange,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
      onAchievementCheck: handleAchievementCheck,
    });
    setScreen("playing");
  }, [handleStateChange, handleLevelUp, handleGameOver, handleAchievementCheck]);

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
      const maxDist = 38;
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
      const maxDist = 38;
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

            <button
              onClick={startGame}
              className="btn-neon-filled animate-pulse-glow"
              style={{ marginTop: 40, fontSize: "1.4rem", padding: "18px 64px" }}
            >
              PLAY
            </button>

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

            <button
              onClick={toggleSound}
              style={{
                marginTop: 16,
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(224, 224, 240, 0.5)",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {soundEnabled ? "\u{1F50A} Sound On" : "\u{1F507} Sound Off"}
            </button>
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
              minWidth: 180,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
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
              fontSize: "1.1rem",
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
                fontSize: "0.9rem",
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

          {/* Left side: Ability icons */}
          {hud.abilities.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 12,
                top: 80,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {hud.abilities.map((ab, i) => (
                <div
                  key={i}
                  className="hud-panel"
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    borderColor: ab.color,
                    padding: 0,
                  }}
                  title={`${ab.name} (Lv.${ab.level})`}
                >
                  <span style={{ fontSize: "1.2rem" }}>{ab.icon}</span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      background: ab.color,
                      color: "#0a0a12",
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      borderRadius: 4,
                      padding: "0 3px",
                      lineHeight: "14px",
                    }}
                  >
                    {ab.level}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Dash cooldown indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 44,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
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
              <div
                className="virtual-joystick-knob"
                style={{
                  transform: `translate(calc(-50% + ${joystickDelta.x * 38}px), calc(-50% + ${joystickDelta.y * 38}px))`,
                }}
              />
            </div>
          )}
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
            {upgradeChoices.map((choice, i) => (
              <button
                key={choice.id}
                className="upgrade-card animate-slide-up"
                style={{
                  animationDelay: `${i * 100}ms`,
                  opacity: 0,
                  width: "clamp(200px, 30vw, 240px)",
                  textAlign: "center",
                  borderColor: choice.color,
                }}
                onClick={() => selectUpgrade(i)}
              >
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
                    fontSize: "0.8rem",
                    color: "rgba(224,224,240,0.6)",
                    lineHeight: 1.4,
                    marginBottom: 8,
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
                  Lv.{choice.level} → Lv.
                  {Math.min(choice.level + 1, choice.maxLevel)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============== Pause Menu Overlay ============== */}
      {screen === "paused" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.75)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="animate-scale-in" style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4rem)",
                fontWeight: 900,
                color: "#00f0ff",
                letterSpacing: "0.15em",
                marginBottom: 48,
                textShadow: `
                  0 0 10px #00f0ff,
                  0 0 30px #00f0ff,
                  0 0 60px rgba(0,240,255,0.4)
                `,
              }}
            >
              PAUSED
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                alignItems: "center",
              }}
            >
              <button
                className="btn-neon-filled"
                onClick={resumeGame}
                style={{ fontSize: "1.2rem", padding: "14px 56px", minWidth: 220 }}
              >
                RESUME
              </button>
              <button
                className="btn-neon"
                onClick={restartGame}
                style={{ fontSize: "1rem", padding: "12px 48px", minWidth: 220 }}
              >
                RESTART
              </button>
              <button
                className="btn-neon"
                onClick={backToMenu}
                style={{ fontSize: "1rem", padding: "12px 48px", minWidth: 220 }}
              >
                MAIN MENU
              </button>
              <button
                onClick={toggleSound}
                style={{
                  marginTop: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "rgba(224, 224, 240, 0.6)",
                  padding: "10px 24px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  minWidth: 220,
                  backdropFilter: "blur(4px)",
                }}
              >
                {soundEnabled ? "\u{1F50A} Sound On" : "\u{1F507} Sound Off"}
              </button>
            </div>

            <p
              style={{
                color: "rgba(224, 224, 240, 0.3)",
                fontSize: "0.8rem",
                marginTop: 32,
                letterSpacing: "0.08em",
              }}
            >
              Press ESC to resume
            </p>
          </div>
        </div>
      )}

      {/* ============== Game Over Overlay ============== */}
      {screen === "gameover" && gameOverStats && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            background: "rgba(10, 10, 18, 0.85)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="animate-scale-in" style={{ textAlign: "center" }}>
            <h2
              className="glow-red"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4rem)",
                fontWeight: 900,
                color: "#ff2244",
                letterSpacing: "0.1em",
                marginBottom: 32,
              }}
            >
              GAME OVER
            </h2>

            <div
              className="glass"
              style={{
                display: "inline-grid",
                gridTemplateColumns: "auto auto",
                gap: "8px 24px",
                padding: "24px 36px",
                borderRadius: 12,
                textAlign: "left",
                fontSize: "0.95rem",
              }}
            >
              <span style={{ color: "rgba(224,224,240,0.5)" }}>
                Time Survived
              </span>
              <span
                style={{
                  color: "#00f0ff",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {formatTime(gameOverStats.timeSurvived)}
              </span>

              <span style={{ color: "rgba(224,224,240,0.5)" }}>Score</span>
              <span
                style={{
                  color: "#00f0ff",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {gameOverStats.score.toLocaleString()}
              </span>

              <span style={{ color: "rgba(224,224,240,0.5)" }}>
                Level Reached
              </span>
              <span
                style={{
                  color: "#ffd700",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {gameOverStats.level}
              </span>

              <span style={{ color: "rgba(224,224,240,0.5)" }}>
                Enemies Killed
              </span>
              <span
                style={{
                  color: "#ff00aa",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {gameOverStats.enemiesKilled.toLocaleString()}
              </span>

              <span style={{ color: "rgba(224,224,240,0.5)" }}>
                Waves Survived
              </span>
              <span
                style={{
                  color: "#00ff88",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {gameOverStats.wavesSurvived}
              </span>

              <span style={{ color: "rgba(224,224,240,0.5)" }}>
                Best Combo
              </span>
              <span
                style={{
                  color: "#ffdd00",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {gameOverStats.maxCombo}x
              </span>
            </div>

            {/* High Scores */}
            {highScores.length > 0 && (
              <div
                className="glass"
                style={{
                  marginTop: 24,
                  padding: "16px 28px",
                  borderRadius: 12,
                  display: "inline-block",
                }}
              >
                <h3
                  style={{
                    color: "#ffd700",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    marginBottom: 12,
                    textShadow: "0 0 8px rgba(255,215,0,0.4)",
                  }}
                >
                  HIGH SCORES
                </h3>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.8rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "rgba(224,224,240,0.4)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.1em",
                      }}
                    >
                      <th style={{ padding: "2px 8px", textAlign: "left" }}>#</th>
                      <th style={{ padding: "2px 8px", textAlign: "right" }}>SCORE</th>
                      <th style={{ padding: "2px 8px", textAlign: "right" }}>LVL</th>
                      <th style={{ padding: "2px 8px", textAlign: "right" }}>TIME</th>
                      <th style={{ padding: "2px 8px", textAlign: "left" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {highScores.map((entry, i) => {
                      const isNew = i === newHighScoreRank;
                      return (
                        <tr
                          key={i}
                          style={{
                            color: isNew ? "#ffd700" : "rgba(224,224,240,0.7)",
                          }}
                        >
                          <td style={{ padding: "3px 8px", textAlign: "left" }}>
                            {i + 1}
                          </td>
                          <td
                            style={{
                              padding: "3px 8px",
                              textAlign: "right",
                              color: isNew ? "#ffd700" : "#00f0ff",
                            }}
                          >
                            {entry.score.toLocaleString()}
                          </td>
                          <td style={{ padding: "3px 8px", textAlign: "right" }}>
                            {entry.level}
                          </td>
                          <td style={{ padding: "3px 8px", textAlign: "right" }}>
                            {formatTime(entry.time)}
                          </td>
                          <td style={{ padding: "3px 8px", textAlign: "left" }}>
                            {isNew && (
                              <span
                                style={{
                                  color: "#ffd700",
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  letterSpacing: "0.05em",
                                  textShadow: "0 0 6px rgba(255,215,0,0.6)",
                                }}
                              >
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
              <div
                style={{
                  marginTop: 20,
                  fontSize: "0.8rem",
                  color: "rgba(224,224,240,0.4)",
                  letterSpacing: "0.1em",
                }}
              >
                Achievements: {achievementCount.unlocked} / {achievementCount.total}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 24,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button className="btn-neon-filled" onClick={restartGame}>
                PLAY AGAIN
              </button>
              <button className="btn-neon" onClick={backToMenu}>
                MAIN MENU
              </button>
            </div>
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
