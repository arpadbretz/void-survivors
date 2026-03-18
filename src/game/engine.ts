// ============================================================
// Void Survivors — Main Game Engine
// ============================================================

import {
  GameState,
  Player,
  Enemy,
  Projectile,
  XPOrb,
  Hazard,
  LootDrop,
  Camera,
  InputState,
} from './types';
import {
  vec2,
  sub,
  normalize,
  distance,
  clamp,
  lerp,
  angle,
} from './math';
import { Renderer } from './renderer';
import { ParticleSystem } from './particles';
import {
  EnemyManager,
  updateEnemies,
  shouldSpawnBoss,
  createSplitEnemies,
  createEnemy,
} from './enemies';
import {
  getRandomUpgradeChoices,
  applyUpgradeChoice,
  getAbilityDescription,
  createStarterAbility,
  createAutoCannonAbility,
  createAbilityById,
  detectActiveSynergies,
  computeSynergyBonuses,
  getSynergyCompletions,
} from './abilities';
import { AudioManager } from './audio';
import { loadMeta, getMetaBonuses, MetaBonuses } from './meta';
import { getCharacter, CharacterDef } from './characters';
import { DailyModifier, getModifierValue } from './daily';
import { Difficulty, DifficultyConfig, getDifficultyConfig, getWaveScaling } from './difficulty';

// ── Constants ───────────────────────────────────────────────────

const WORLD_SIZE = 4000;
const MAX_DELTA = 0.05;
const WAVE_DURATION = 30;
const BASE_MAGNET_RANGE = 50;
const HUD_UPDATE_INTERVAL = 0.1; // seconds between HUD callback fires

// ── Callback types matching the React UI ────────────────────────

interface EngineCallbacks {
  onStateChange: (state: {
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
    enemiesKilled: number;
  }) => void;
  onLevelUp: (
    choices: {
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
    }[]
  ) => void;
  onGameOver: (stats: {
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
  }) => void;
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

// ── Engine ──────────────────────────────────────────────────────

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: Renderer | null = null;
  private particles: ParticleSystem;
  private enemyManager: EnemyManager;
  private audio: AudioManager;

  private state!: GameState;
  private input: InputState;
  private callbacks: EngineCallbacks | null = null;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private running: boolean = false;
  private soundEnabled: boolean = true;

  private enemiesKilled: number = 0;
  private bossesKilled: number = 0;
  private titanKills: number = 0;
  private harbingerKills: number = 0;
  private nexusKills: number = 0;
  private phantomKillsThisRun: number = 0;
  private lastHudUpdate: number = 0;
  private lastAchievementCheck: number = 0;

  // Enhanced run stats tracking
  private damageDealt: number = 0;
  private damageTaken: number = 0;
  private xpCollected: number = 0;
  private elitesKilled: number = 0;
  private lootCollected: number = 0;
  private longestCombo: number = 0;

  // Combo / kill streak tracking
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private maxCombo: number = 0;
  private readonly COMBO_TIMEOUT = 2.0;

  /** Returns a color string based on current combo count (matches renderer combo colors) */
  private getComboColor(): string | undefined {
    if (this.comboCount >= 100) return '#ffd700';
    if (this.comboCount >= 50) return '#ff00ff';
    if (this.comboCount >= 25) return '#ff3344';
    if (this.comboCount >= 10) return '#ff8800';
    if (this.comboCount >= 5) return '#ffdd00';
    return undefined; // no combo active — use default
  }

  /** Resolve the active trail color, cycling hue for prismatic */
  private resolveTrailColor(defaultColor: string): string {
    if (!this.trailColor) return defaultColor;
    if (this.trailColor === 'prismatic') {
      // Cycle through hues
      this.prismaticHue = (this.prismaticHue + 3) % 360;
      return `hsl(${this.prismaticHue}, 100%, 60%)`;
    }
    return this.trailColor;
  }

  // Dash state
  private dashCooldown: number = 0;
  private dashTimer: number = 0;
  private dashDirection: { x: number; y: number } = { x: 0, y: 0 };
  private readonly DASH_SPEED = 800;
  private readonly DASH_DURATION = 0.15; // seconds
  private readonly DASH_COOLDOWN = 1.5; // seconds

  // Tutorial triggers
  private tutorialTriggered: Set<string> = new Set();

  // Character selection
  private characterId: string = 'void_walker';
  private characterDef: CharacterDef = getCharacter('void_walker');

  // Hazard spawn timers
  private lastVoidRiftSpawn: number = 0;
  private lastGravityAnomalySpawn: number = 0;
  private hazardIdCounter: number = 0;

  // Daily challenge modifiers
  private dailyModifiers: DailyModifier[] = [];

  // Difficulty settings
  private difficulty: Difficulty = 'normal';
  private difficultyConfig: DifficultyConfig = getDifficultyConfig('normal');

  // Meta-progression bonuses applied at game start
  private metaBonuses: MetaBonuses = {
    maxHealthBonus: 0,
    damageMultiplier: 1,
    speedMultiplier: 1,
    armorBonus: 0,
    xpMultiplier: 1,
  };

  // Trail color override from achievement rewards
  private trailColor: string | null = null;
  private prismaticHue: number = 0;

  // Bound event handlers for cleanup
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  constructor() {
    this.particles = new ParticleSystem();
    this.enemyManager = new EnemyManager();
    this.audio = AudioManager.getInstance();

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      mouseX: 0,
      mouseY: 0,
      mouseWorldX: 0,
      mouseWorldY: 0,
    };
  }

  // ── Public API (matches GameEngineInterface) ──────────────────

  start(canvas: HTMLCanvasElement, callbacks: EngineCallbacks): void {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.callbacks = callbacks;

    this.audio.init();
    if (!this.soundEnabled) this.audio.mute();
    else this.audio.unmute();
    this.audio.startMusic();

    this.initState();
    this.attachListeners();
    this.running = true;

    // Tutorial: movement hint
    setTimeout(() => {
      this.renderer?.showTutorialHint('move', 'Use WASD or Arrow Keys to move');
    }, 1000);
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  cleanup(): void {
    this.running = false;
    this.audio.stopMusic();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.detachListeners();
    this.canvas = null;
    this.renderer = null;
    this.callbacks = null;
  }

  resume(): void {
    if (this.state) {
      this.state.paused = false;
      this.state.showUpgradeScreen = false;
    }
  }

  pause(): void {
    if (this.state) {
      this.state.paused = true;
    }
  }

  selectUpgrade(index: number): void {
    if (!this.state || !this.state.showUpgradeScreen) return;
    if (index < 0 || index >= this.state.upgradeChoices.length) return;

    const choice = this.state.upgradeChoices[index];
    applyUpgradeChoice(this.state.player, choice);

    // Check for newly activated synergies
    this.checkSynergies();

    this.state.showUpgradeScreen = false;
    this.state.upgradeChoices = [];
  }

  restart(): void {
    this.detachListeners();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.running = false;
  }

  setCharacter(characterId: string): void {
    this.characterId = characterId;
    this.characterDef = getCharacter(characterId);
  }

  setDailyModifiers(modifiers: DailyModifier[]): void {
    this.dailyModifiers = modifiers;
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    this.difficultyConfig = getDifficultyConfig(d);
    this.enemyManager.setDifficultyConfig(this.difficultyConfig);
  }

  setTrailColor(color: string | null): void {
    this.trailColor = color;
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (enabled) this.audio.unmute();
    else this.audio.mute();
  }

  applyDisplaySettings(settings: { showFps: boolean; showMinimap: boolean; screenShake: boolean; tutorialHints: boolean }): void {
    if (this.renderer) {
      this.renderer.showFps = settings.showFps;
      this.renderer.showMinimap = settings.showMinimap;
      this.renderer.screenShakeEnabled = settings.screenShake;
      this.renderer.tutorialHintsEnabled = settings.tutorialHints;
    }
  }

  startAttractMode(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.running = true;
    this.attractLoop();
  }

  stopAttractMode(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ── State Initialization ──────────────────────────────────────

  private initState(): void {
    const center = WORLD_SIZE / 2;
    const charDef = this.characterDef;

    const player: Player = {
      id: 'player',
      pos: vec2(center, center),
      vel: vec2(0, 0),
      radius: 16,
      health: charDef.baseHealth,
      maxHealth: charDef.baseHealth,
      type: 'player',
      color: charDef.color,
      glowColor: charDef.glowColor,
      active: true,
      xp: 0,
      level: 1,
      speed: charDef.baseSpeed,
      damage: 10,
      abilities: [],
      invincibleUntil: 2, // 2 seconds of initial invincibility
      lastDamageTime: 0,
    };

    // Give player starting ability based on character
    const startingAbility = createAbilityById(charDef.startingAbilityId);
    if (startingAbility) {
      player.abilities.push(startingAbility);
    } else {
      player.abilities.push(createStarterAbility());
    }

    const camera: Camera = {
      x: center,
      y: center,
      targetX: center,
      targetY: center,
      shakeX: 0,
      shakeY: 0,
    };

    this.state = {
      player,
      enemies: [],
      projectiles: [],
      particles: [],
      xpOrbs: [],
      score: 0,
      time: 0,
      wave: 1,
      paused: false,
      gameOver: false,
      upgradeChoices: [],
      showUpgradeScreen: false,
      screenShake: 0,
      camera,
      hazards: [],
      lootDrops: [],
      activeSynergies: [],
    };

    // Apply meta-progression bonuses
    const meta = loadMeta();
    const bonuses = getMetaBonuses(meta);
    this.metaBonuses = bonuses;
    this.state.player.maxHealth += bonuses.maxHealthBonus;
    this.state.player.health = this.state.player.maxHealth;
    this.state.player.speed *= bonuses.speedMultiplier;

    // Apply daily challenge modifiers to player stats
    if (this.dailyModifiers.length > 0) {
      const healthMult = getModifierValue(this.dailyModifiers, 'health_mult');
      const speedMult = getModifierValue(this.dailyModifiers, 'speed_mult');
      this.state.player.maxHealth = Math.floor(this.state.player.maxHealth * healthMult);
      this.state.player.health = this.state.player.maxHealth;
      this.state.player.speed *= speedMult;
    }

    // Apply difficulty config to enemy manager
    this.enemyManager.setDifficultyConfig(this.difficultyConfig);

    this.enemiesKilled = 0;
    this.bossesKilled = 0;
    this.titanKills = 0;
    this.harbingerKills = 0;
    this.nexusKills = 0;
    this.phantomKillsThisRun = 0;
    this.lastHudUpdate = 0;
    this.lastAchievementCheck = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.xpCollected = 0;
    this.elitesKilled = 0;
    this.lootCollected = 0;
    this.longestCombo = 0;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashDirection = { x: 0, y: 0 };
    this.enemyManager.reset();
    this.tutorialTriggered = new Set();
    this.lastVoidRiftSpawn = 0;
    this.lastGravityAnomalySpawn = 0;
    this.hazardIdCounter = 0;

    // Reset input
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
  }

  // ── Game Loop ─────────────────────────────────────────────────

  private gameLoop = (timestamp: number): void => {
    if (!this.running) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(rawDt, MAX_DELTA);

    if (
      !this.state.paused &&
      !this.state.gameOver &&
      !this.state.showUpgradeScreen
    ) {
      this.update(dt);
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  // ── Attract Mode Loop ────────────────────────────────────────

  private attractLoop = (): void => {
    if (!this.running || !this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const t = performance.now() * 0.001;

    // Floating neon particles
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const x = w * 0.5 + Math.cos(t * 0.3 + i * 0.52) * w * 0.35;
      const y = h * 0.5 + Math.sin(t * 0.4 + i * 0.45) * h * 0.3;
      const r = 2 + Math.sin(t * 2 + i) * 1.5;

      const colors = ['#00f0ff', '#ff00aa', '#ffdd00', '#00ff88'];
      const color = colors[i % colors.length];

      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4 + Math.sin(t + i) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    this.animationFrameId = requestAnimationFrame(this.attractLoop);
  };

  // ── Update ────────────────────────────────────────────────────

  private update(dt: number): void {
    const s = this.state;
    s.time += dt;

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0 && this.comboCount > 0) {
        this.comboCount = 0;
      }
    }

    // 1. Player movement
    this.updatePlayer(dt);

    // 2. Abilities
    this.updateAbilities(dt);

    // 3. Enemy spawning (daily spawn_rate_mult speeds up the timer)
    const dailySpawnMult = getModifierValue(this.dailyModifiers, 'spawn_rate_mult');
    const newEnemies = this.enemyManager.updateSpawning(
      dt * dailySpawnMult,
      s.wave,
      s.player.pos,
      WORLD_SIZE,
      s.enemies
    );
    const dailyEnemyHealthMult = getModifierValue(this.dailyModifiers, 'enemy_health_mult');
    for (const e of newEnemies) {
      e.spawnTime = s.time;
      if (dailyEnemyHealthMult !== 1) {
        e.maxHealth = Math.floor(e.maxHealth * dailyEnemyHealthMult);
        e.health = e.maxHealth;
      }
    }
    s.enemies.push(...newEnemies);

    // Check for boss spawn on milestone waves
    const waveScaling = getWaveScaling(s.wave);
    const activeBossCount = s.enemies.filter((e) => e.enemyType === 'boss' && e.active).length;
    if (
      shouldSpawnBoss(s.wave) &&
      activeBossCount < waveScaling.bossCount
    ) {
      const bossEnemies = this.enemyManager.spawnWave(
        s.wave,
        s.player.pos,
        WORLD_SIZE,
        s.enemies
      );
      if (bossEnemies.length > 0) {
        for (const e of bossEnemies) {
          e.spawnTime = s.time;
          if (dailyEnemyHealthMult !== 1) {
            e.maxHealth = Math.floor(e.maxHealth * dailyEnemyHealthMult);
            e.health = e.maxHealth;
          }
        }
        s.enemies.push(...bossEnemies);
        this.audio.playBossSpawn();
      }
    }

    // 4. Enemy AI
    const enemyProj = updateEnemies(s.enemies, s.player, dt, s.time, this.enemyManager.waveSpeedMultiplier);
    s.projectiles.push(...enemyProj);

    // 4a. Handle harbinger boss spawned enemies
    for (const enemy of s.enemies) {
      if (enemy.active && enemy._spawnedEnemies && enemy._spawnedEnemies.length > 0) {
        for (const spawnPos of enemy._spawnedEnemies) {
          const chaser = createEnemy('chaser', spawnPos, s.wave, this.difficultyConfig);
          chaser.spawnTime = s.time;
          s.enemies.push(chaser);
        }
        enemy._spawnedEnemies = [];
      }
    }

    // 4b. Boss enrage: if a boss has been alive > 45 seconds, enrage it
    for (const enemy of s.enemies) {
      if (
        enemy.active &&
        enemy.enemyType === 'boss' &&
        !enemy.isEnraged &&
        enemy.spawnTime !== undefined &&
        s.time - enemy.spawnTime > 45
      ) {
        enemy.isEnraged = true;
        enemy.speed *= 1.5;
        enemy.damage = Math.floor(enemy.damage * 1.3);
        this.renderer?.announceStreak('BOSS ENRAGED!', '#ff2200');
        this.particles.emitExplosion(enemy.pos.x, enemy.pos.y, '#ff2200', 20);
      }
    }

    // 4c. Gravity well effects: pull enemies and deal tick damage
    for (const proj of s.projectiles) {
      if (!proj.active || !proj.isGravityWell) continue;
      for (const enemy of s.enemies) {
        if (!enemy.active) continue;
        const dist = distance(enemy.pos, proj.pos);
        if (dist < proj.radius) {
          const dirToWell = normalize(sub(proj.pos, enemy.pos));
          const pullStrength = 200 * (1 - dist / proj.radius);
          enemy.vel.x += dirToWell.x * pullStrength * dt;
          enemy.vel.y += dirToWell.y * pullStrength * dt;
          // Tick damage (with synergy bonus)
          const gwSynergyBonuses = computeSynergyBonuses(this.state.activeSynergies);
          enemy.health -= proj.damage * dt * gwSynergyBonuses.damageMult;
          if (enemy.health <= 0) {
            this.killEnemy(enemy);
          }
        }
      }
    }

    // 5. Update projectiles
    this.updateProjectiles(dt);

    // 6. Collisions
    this.checkCollisions();

    // 7. Particles
    this.particles.update(dt);

    // 7b. Hazards
    this.updateHazards(dt);

    // 8. XP orbs
    this.updateXPOrbs(dt);

    // 8b. Loot drops
    this.updateLootDrops(dt);

    // 9. Level up check
    this.checkLevelUp();

    // 10. Wave progression
    this.checkWaveProgression();

    // 11. Camera
    this.updateCamera(dt);

    // 12. Screen shake decay
    if (s.screenShake > 0 && this.renderer?.screenShakeEnabled !== false) {
      s.screenShake *= 0.9;
      if (s.screenShake < 0.1) s.screenShake = 0;
      s.camera.shakeX = (Math.random() - 0.5) * s.screenShake;
      s.camera.shakeY = (Math.random() - 0.5) * s.screenShake;
    } else {
      s.screenShake = 0;
      s.camera.shakeX = 0;
      s.camera.shakeY = 0;
    }

    // 13. Clean up dead entities and cap counts for performance
    s.enemies = s.enemies.filter((e) => e.active);
    s.projectiles = s.projectiles.filter((p) => p.active);
    s.xpOrbs = s.xpOrbs.filter((o) => o.active);
    s.lootDrops = s.lootDrops.filter((l) => l.active);

    // Hard caps to prevent unbounded growth
    if (s.projectiles.length > 300) {
      s.projectiles = s.projectiles.slice(-300);
    }
    if (s.xpOrbs.length > 100) {
      // Remove oldest orbs
      s.xpOrbs = s.xpOrbs.slice(-100);
    }

    // 14. Pass kill count and combo to state for renderer
    s.enemiesKilled = this.enemiesKilled;
    s.combo = this.comboCount;
    s.comboTimer = this.comboTimer;

    // Compute combo multiplier for HUD display
    let comboMult = 1;
    if (this.comboCount >= 100) comboMult = 5;
    else if (this.comboCount >= 50) comboMult = 3;
    else if (this.comboCount >= 25) comboMult = 2;
    else if (this.comboCount >= 10) comboMult = 1.5;
    s.comboMultiplier = comboMult;

    // 15. Game over
    if (s.player.health <= 0 && !s.gameOver) {
      this.triggerGameOver();
    }

    // 16. Push HUD state to React (throttled)
    if (s.time - this.lastHudUpdate >= HUD_UPDATE_INTERVAL) {
      this.lastHudUpdate = s.time;
      this.pushHudState();
    }

    // 17. Achievement check (every 2 seconds)
    if (s.time - this.lastAchievementCheck >= 2.0) {
      this.lastAchievementCheck = s.time;
      if (this.callbacks?.onAchievementCheck) {
        this.callbacks.onAchievementCheck({
          score: s.score,
          kills: this.enemiesKilled,
          wave: s.wave,
          level: s.player.level,
          combo: this.maxCombo,
          timeSurvived: s.time,
          activeHazards: this.state.hazards?.filter(h => h.active).length || 0,
          activeAbilities: this.state.player.abilities?.length || 0,
          bossesKilledThisRun: this.bossesKilled,
          hasEvolution: this.state.player.abilities?.some(a => a.evolved) || false,
          hasGravityWell: this.state.player.abilities?.some(a => a.id === 'gravity_well') || false,
          phantomKills: this.phantomKillsThisRun,
          titanKills: this.titanKills,
          harbingerKills: this.harbingerKills,
          nexusKills: this.nexusKills,
        });
      }
    }
  }

  // ── Player ────────────────────────────────────────────────────

  private updatePlayer(dt: number): void {
    const p = this.state.player;
    let dx = 0;
    let dy = 0;

    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    // Decrement dash cooldowns
    this.dashCooldown -= dt;
    this.dashTimer -= dt;

    // During dash, override velocity with dash speed
    if (this.dashTimer > 0) {
      p.vel.x = this.DASH_SPEED * this.dashDirection.x;
      p.vel.y = this.DASH_SPEED * this.dashDirection.y;

      // Emit extra trail particles during dash
      this.particles.emitTrail(p.pos.x, p.pos.y, this.resolveTrailColor('#00ffff'));
      this.particles.emitTrail(
        p.pos.x + (Math.random() - 0.5) * 10,
        p.pos.y + (Math.random() - 0.5) * 10,
        this.resolveTrailColor('#88eeff')
      );
    } else {
      const speedSynBonuses = computeSynergyBonuses(this.state.activeSynergies);
      const effectiveSpeed = p.speed * speedSynBonuses.speedMult;
      p.vel.x = dx * effectiveSpeed;
      p.vel.y = dy * effectiveSpeed;
    }

    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;

    p.pos.x = clamp(p.pos.x, p.radius, WORLD_SIZE - p.radius);
    p.pos.y = clamp(p.pos.y, p.radius, WORLD_SIZE - p.radius);

    if (dx !== 0 || dy !== 0) {
      this.particles.emitTrail(p.pos.x, p.pos.y, this.resolveTrailColor('#00aacc'));
    }

    // Passive health regeneration: 1 HP per 3 seconds + character bonus + synergy regen
    if (p.health < p.maxHealth) {
      const baseRegen = 1 / 3; // HP per second
      const charRegen = this.characterDef.healthRegen; // additional HP per second
      const synBonuses = computeSynergyBonuses(this.state.activeSynergies);
      p.health = Math.min(p.maxHealth, p.health + (baseRegen + charRegen + synBonuses.healthRegen) * dt);
    }

    // Passive XP trickle: earn small XP just for surviving (scales with wave)
    const xpPerSecond = 0.5 + this.state.wave * 0.3;
    const dailyXpMult = getModifierValue(this.dailyModifiers, 'xp_mult');
    const trickleXp = xpPerSecond * dt * this.metaBonuses.xpMultiplier * this.characterDef.xpMultiplier * dailyXpMult * this.difficultyConfig.xpMult;
    p.xp += trickleXp;
    this.xpCollected += trickleXp;
  }

  private updateAbilities(dt: number): void {
    const s = this.state;
    const synBonuses = computeSynergyBonuses(s.activeSynergies);
    for (const ability of s.player.abilities) {
      // Apply synergy cooldown multiplier and character cooldown reduction multiplicatively
      const originalCooldown = ability.cooldown;
      ability.cooldown *= synBonuses.cooldownMult * this.characterDef.cooldownReduction;

      const newProj = ability.onUpdate(
        s.player,
        s.enemies,
        s.projectiles,
        this.particles,
        dt,
        s.time
      );

      // Restore original cooldown
      ability.cooldown = originalCooldown;

      if (newProj && newProj.length > 0) {
        s.projectiles.push(...newProj);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const proj of this.state.projectiles) {
      if (!proj.active) continue;

      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      proj.lifetime -= dt;

      if (
        proj.lifetime <= 0 ||
        proj.pos.x < -50 ||
        proj.pos.x > WORLD_SIZE + 50 ||
        proj.pos.y < -50 ||
        proj.pos.y > WORLD_SIZE + 50
      ) {
        proj.active = false;
      }
    }
  }

  private updateXPOrbs(dt: number): void {
    const p = this.state.player;

    const magnetAbility = p.abilities.find((a) => a.id === 'xp_magnet');
    const magnetRange =
      BASE_MAGNET_RANGE + (magnetAbility ? magnetAbility.level * 40 : 0);

    for (const orb of this.state.xpOrbs) {
      if (!orb.active) continue;

      const dist = distance(p.pos, orb.pos);

      if (dist < magnetRange) {
        const dir = normalize(sub(p.pos, orb.pos));
        const pullSpeed = 300 * (1 - dist / magnetRange);
        orb.pos.x += dir.x * pullSpeed * dt;
        orb.pos.y += dir.y * pullSpeed * dt;
      }

      if (dist < p.radius + orb.radius) {
        orb.active = false;
        const dailyXpMult = getModifierValue(this.dailyModifiers, 'xp_mult');
        const xpSynergyBonuses = computeSynergyBonuses(this.state.activeSynergies);
        const xpGain = Math.floor(orb.value * this.metaBonuses.xpMultiplier * this.characterDef.xpMultiplier * dailyXpMult * this.difficultyConfig.xpMult * xpSynergyBonuses.xpMult);
        p.xp += xpGain;
        this.xpCollected += xpGain;
        this.state.score += Math.floor(orb.value * this.difficultyConfig.scoreMult);
        this.particles.emitXPPickup(orb.pos.x, orb.pos.y);
        this.audio.playPickup();
      }
    }
  }

  // ── Loot Drops ──────────────────────────────────────────────────

  private nextLootId: number = 0;

  private spawnLootDrop(x: number, y: number): void {
    const types: LootDrop['type'][] = ['health', 'bomb', 'magnet', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.state.lootDrops.push({
      id: `loot_${this.nextLootId++}`,
      pos: { x, y },
      type,
      active: true,
      spawnTime: this.state.time,
      lifetime: 15,
    });
  }

  private updateLootDrops(_dt: number): void {
    const s = this.state;
    const p = s.player;

    for (const loot of s.lootDrops) {
      if (!loot.active) continue;

      // Expire after lifetime
      if (s.time - loot.spawnTime >= loot.lifetime) {
        loot.active = false;
        continue;
      }

      // Check player pickup collision (radius 20 for loot)
      const dist = distance(p.pos, loot.pos);
      if (dist < p.radius + 20) {
        loot.active = false;
        this.lootCollected++;
        this.applyLootEffect(loot.type);
        this.particles.emitExplosion(loot.pos.x, loot.pos.y, this.getLootColor(loot.type), 15);
        this.audio.playPickup();
      }
    }
  }

  private getLootColor(type: LootDrop['type']): string {
    switch (type) {
      case 'health': return '#00ff44';
      case 'bomb': return '#ff2222';
      case 'magnet': return '#2288ff';
      case 'shield': return '#ffdd00';
    }
  }

  private applyLootEffect(type: LootDrop['type']): void {
    const s = this.state;
    const p = s.player;

    switch (type) {
      case 'health':
        // Restore 30% max health
        p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.3);
        this.particles.emit(p.pos.x, p.pos.y, 12, '#00ff44', 80, 0.5);
        break;
      case 'bomb':
        // Kill all enemies on screen
        for (const enemy of s.enemies) {
          if (!enemy.active) continue;
          // Only kill enemies within viewport range (~600px of player)
          const dist = distance(p.pos, enemy.pos);
          if (dist < 800) {
            this.killEnemy(enemy);
          }
        }
        this.particles.emitExplosion(p.pos.x, p.pos.y, '#ff4444', 30);
        s.screenShake = 12;
        break;
      case 'magnet':
        // Pull all XP orbs to player instantly
        for (const orb of s.xpOrbs) {
          if (!orb.active) continue;
          orb.pos.x = p.pos.x + (Math.random() - 0.5) * 10;
          orb.pos.y = p.pos.y + (Math.random() - 0.5) * 10;
        }
        this.particles.emit(p.pos.x, p.pos.y, 15, '#2288ff', 120, 0.4);
        break;
      case 'shield':
        // 5 seconds of invincibility
        p.invincibleUntil = Math.max(p.invincibleUntil, s.time + 5);
        this.particles.emit(p.pos.x, p.pos.y, 12, '#ffdd00', 80, 0.5);
        break;
    }
  }

  // ── Collisions ────────────────────────────────────────────────

  private checkCollisions(): void {
    const s = this.state;

    // Player projectiles vs enemies
    for (const proj of s.projectiles) {
      if (!proj.active || proj.owner !== 'player') continue;
      // Gravity wells handle damage via tick system, skip normal collisions
      if (proj.isGravityWell) continue;

      for (const enemy of s.enemies) {
        if (!enemy.active) continue;

        // Skip damage to phantoms in invisible/fading_out states (they are phased out)
        if (
          enemy.enemyType === 'phantom' &&
          enemy.phaseState !== 'visible' &&
          enemy.phaseState !== 'fading_in'
        ) {
          continue;
        }

        const dist = distance(proj.pos, enemy.pos);
        if (dist < proj.radius + enemy.radius) {
          const dailyDamageMult = getModifierValue(this.dailyModifiers, 'damage_mult');
          const synergyBonuses = computeSynergyBonuses(this.state.activeSynergies);
          let actualDamage = Math.floor(proj.damage * this.metaBonuses.damageMultiplier * this.characterDef.damageMultiplier * dailyDamageMult * synergyBonuses.damageMult);

          // Check if enemy is within any shielder's aura (50% damage reduction)
          let shielded = false;
          for (const other of s.enemies) {
            if (!other.active || other.enemyType !== 'shielder' || other.id === enemy.id) continue;
            if (other.shieldAuraRadius && distance(enemy.pos, other.pos) < other.shieldAuraRadius) {
              shielded = true;
              break;
            }
          }
          if (shielded) {
            actualDamage = Math.floor(actualDamage * 0.5);
            // Blue particle cue for shielded damage
            this.particles.emit(enemy.pos.x, enemy.pos.y, 2, '#44aaff', 40, 0.15);
          }

          enemy.health -= actualDamage;
          this.damageDealt += actualDamage;
          this.particles.emitDamageNumber(
            enemy.pos.x,
            enemy.pos.y,
            actualDamage,
            this.getComboColor()
          );
          this.particles.emit(proj.pos.x, proj.pos.y, 4, enemy.color, 60, 0.2);
          this.audio.playHit();

          // AoE explosion (e.g. Nova Burst)
          if (proj.aoe) {
            const aoeDamage = Math.floor(actualDamage * proj.aoe.damageFraction);
            for (const other of s.enemies) {
              if (!other.active || other.id === enemy.id) continue;
              const aoeDist = distance(proj.pos, other.pos);
              if (aoeDist < proj.aoe.radius) {
                other.health -= aoeDamage;
                this.damageDealt += aoeDamage;
                this.particles.emitDamageNumber(other.pos.x, other.pos.y, aoeDamage, this.getComboColor());
                this.particles.emit(other.pos.x, other.pos.y, 3, proj.color, 40, 0.15);
                if (other.health <= 0) {
                  this.killEnemy(other);
                }
              }
            }
            this.particles.emitExplosion(proj.pos.x, proj.pos.y, proj.color, 8);
          }

          if (proj.piercing <= 0) {
            proj.active = false;
          } else {
            proj.piercing--;
          }

          if (enemy.health <= 0) {
            this.killEnemy(enemy);
          }

          break;
        }
      }
    }

    // Enemy projectiles vs player
    for (const proj of s.projectiles) {
      if (!proj.active || proj.owner !== 'enemy') continue;

      const dist = distance(proj.pos, s.player.pos);
      if (dist < proj.radius + s.player.radius) {
        proj.active = false;
        this.damagePlayer(proj.damage);
      }
    }

    // Enemy bodies vs player
    for (const enemy of s.enemies) {
      if (!enemy.active) continue;

      const dist = distance(enemy.pos, s.player.pos);
      if (dist < enemy.radius + s.player.radius) {
        this.damagePlayer(enemy.damage);

        const pushDir = normalize(sub(enemy.pos, s.player.pos));
        enemy.pos.x += pushDir.x * 5;
        enemy.pos.y += pushDir.y * 5;
      }
    }
  }

  private damagePlayer(amount: number): void {
    const p = this.state.player;
    if (this.state.time < p.invincibleUntil) return;

    const reducedAmount = Math.max(1, amount - this.metaBonuses.armorBonus - this.characterDef.baseArmor);
    p.health -= reducedAmount;
    this.damageTaken += reducedAmount;
    p.lastDamageTime = this.state.time;
    p.invincibleUntil = this.state.time + 1.0;
    this.state.screenShake = Math.min(15, 4 + amount * 0.5);

    this.particles.emit(p.pos.x, p.pos.y, 10, '#ff3344', 100, 0.4);
    this.audio.playDamage();

    // Tutorial: dash hint on first damage
    if (!this.tutorialTriggered.has('dash')) {
      this.tutorialTriggered.add('dash');
      this.renderer?.showTutorialHint('dash', 'Press SPACE while moving to dash!', 5);
    }

    if (p.health <= 0) {
      p.health = 0;
    }
  }

  private killEnemy(enemy: Enemy): void {
    enemy.active = false;

    // Shielder: blue burst of particles (shield breaking effect)
    if (enemy.enemyType === 'shielder') {
      this.particles.emitExplosion(enemy.pos.x, enemy.pos.y, '#44aaff', 12);
      this.particles.emit(enemy.pos.x, enemy.pos.y, 8, '#2288dd', 80, 0.4);
    }

    // Splitter: spawn mini enemies on death
    if (enemy.enemyType === 'splitter') {
      const splits = createSplitEnemies(enemy.pos, this.state.wave, this.difficultyConfig);
      for (const e of splits) e.spawnTime = this.state.time;
      this.state.enemies.push(...splits);
    }

    this.enemiesKilled++;
    this.renderer?.flashKillCount(1);

    // Track elite kills (boss, tank, splitter are elite-tier enemies)
    if (enemy.enemyType === 'boss' || enemy.enemyType === 'tank' || enemy.enemyType === 'splitter') {
      this.elitesKilled++;
    }

    // Combo tracking
    this.comboCount++;
    this.comboTimer = this.COMBO_TIMEOUT;
    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
      this.longestCombo = this.comboCount;
    }

    // Score multiplier based on combo (enhanced tiers)
    let scoreMultiplier = 1;
    if (this.comboCount >= 100) scoreMultiplier = 5;
    else if (this.comboCount >= 50) scoreMultiplier = 3;
    else if (this.comboCount >= 25) scoreMultiplier = 2;
    else if (this.comboCount >= 10) scoreMultiplier = 1.5;

    this.state.score += Math.floor(enemy.xpValue * 2 * scoreMultiplier * this.difficultyConfig.scoreMult);

    // Combo milestone effects with scaled particle bursts
    const comboMilestones: [number, number, number][] = [
      [100, 60, 1.5],  // [threshold, particles, lifetime multiplier]
      [50, 40, 1.2],
      [25, 25, 1.0],
      [10, 15, 1.0],
      [5, 10, 1.0],
    ];
    for (const [threshold, particleCount, lifeMult] of comboMilestones) {
      if (this.comboCount === threshold) {
        // Gold particle burst from player
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
          const speed = 60 + Math.random() * 180;
          const px = this.state.player.pos.x;
          const py = this.state.player.pos.y;
          this.particles.emitExplosion(
            px + Math.cos(angle) * 5,
            py + Math.sin(angle) * 5,
            threshold >= 50 ? '#ffd700' : '#ffdd00',
            1
          );
        }
        // Play combo milestone sound
        this.audio.playComboMilestone(threshold);

        // Kill streak announcements
        if (threshold === 10) {
          this.renderer?.announceStreak('KILLING SPREE', '#ff8800');
        } else if (threshold === 25) {
          this.renderer?.announceStreak('RAMPAGE', '#ff3344');
        } else if (threshold === 50) {
          this.renderer?.announceStreak('UNSTOPPABLE', '#ff00ff');
        } else if (threshold === 100) {
          this.renderer?.announceStreak('GODLIKE', '#ffd700');
        }

        break;
      }
    }
    // Legacy small milestone at combo 5 (keep existing chime)
    if (this.comboCount === 5) {
      this.audio.playPickup();
    }

    this.particles.emitExplosion(enemy.pos.x, enemy.pos.y, enemy.color, 15);
    this.audio.playExplosion();

    if (enemy.enemyType === 'phantom') {
      this.phantomKillsThisRun++;
    }

    if (enemy.enemyType === 'boss') {
      this.bossesKilled++;
      if (enemy.bossVariant === 'titan') this.titanKills++;
      else if (enemy.bossVariant === 'harbinger') this.harbingerKills++;
      else if (enemy.bossVariant === 'nexus') this.nexusKills++;
      this.particles.emitExplosion(
        enemy.pos.x,
        enemy.pos.y,
        '#ffdd00',
        30
      );
      this.state.screenShake = 15;

      // Drop random loot
      this.spawnLootDrop(enemy.pos.x, enemy.pos.y);
    }

    // Spawn 2-3 XP orbs spread around the death position
    const orbCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const orbValue = Math.max(1, Math.floor(enemy.xpValue / orbCount));
    for (let i = 0; i < orbCount; i++) {
      const spreadX = enemy.pos.x + (Math.random() - 0.5) * 20;
      const spreadY = enemy.pos.y + (Math.random() - 0.5) * 20;
      this.state.xpOrbs.push({
        pos: { x: spreadX, y: spreadY },
        value: i === 0 ? enemy.xpValue - orbValue * (orbCount - 1) : orbValue,
        radius: 6,
        magnetRadius: BASE_MAGNET_RANGE,
        active: true,
      });
    }

    // 10% chance to spawn a plasma pool on enemy death
    if (Math.random() < 0.10) {
      this.spawnHazard('plasma_pool', enemy.pos.x, enemy.pos.y);
    }
  }

  // ── Hazards ──────────────────────────────────────────────────

  private spawnHazard(type: 'void_rift' | 'plasma_pool' | 'gravity_anomaly', x: number, y: number): void {
    const s = this.state;

    let radius: number;
    let damage: number;
    let lifetime: number;

    switch (type) {
      case 'void_rift':
        radius = 60 + Math.random() * 40;
        damage = 15;
        lifetime = 12;
        break;
      case 'plasma_pool':
        radius = 40 + Math.random() * 30;
        damage = 20;
        lifetime = 8;
        break;
      case 'gravity_anomaly':
        radius = 80 + Math.random() * 40;
        damage = 0;
        lifetime = 15;
        break;
    }

    // Enforce max 5 hazards — remove oldest if exceeded
    while (s.hazards.length >= 5) {
      s.hazards.shift();
    }

    s.hazards.push({
      id: `hazard_${this.hazardIdCounter++}`,
      pos: { x, y },
      radius,
      type,
      damage,
      active: true,
      spawnTime: s.time,
      lifetime,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  private updateHazards(dt: number): void {
    const s = this.state;

    // Spawn void rifts starting from wave 3, every 15 seconds
    if (s.wave >= 3 && s.time - this.lastVoidRiftSpawn >= 15) {
      this.lastVoidRiftSpawn = s.time;
      const margin = 200;
      const hx = margin + Math.random() * (WORLD_SIZE - margin * 2);
      const hy = margin + Math.random() * (WORLD_SIZE - margin * 2);
      this.spawnHazard('void_rift', hx, hy);
    }

    // Spawn gravity anomalies starting from wave 6, every 20 seconds
    if (s.wave >= 6 && s.time - this.lastGravityAnomalySpawn >= 20) {
      this.lastGravityAnomalySpawn = s.time;
      const margin = 200;
      const hx = margin + Math.random() * (WORLD_SIZE - margin * 2);
      const hy = margin + Math.random() * (WORLD_SIZE - margin * 2);
      this.spawnHazard('gravity_anomaly', hx, hy);
    }

    // Update hazard timers and apply effects
    for (const hazard of s.hazards) {
      if (!hazard.active) continue;

      const age = s.time - hazard.spawnTime;
      if (age >= hazard.lifetime) {
        hazard.active = false;
        continue;
      }

      // Warning phase: first 1 second, no effects
      if (age < 1.0) continue;

      // Player collision
      const playerDist = distance(s.player.pos, hazard.pos);
      if (playerDist < hazard.radius + s.player.radius) {
        if (hazard.damage > 0) {
          this.damagePlayer(hazard.damage * dt);
        }
        // Gravity anomaly pushes player away
        if (hazard.type === 'gravity_anomaly') {
          const pushStrength = 150 * (1 - playerDist / hazard.radius);
          if (playerDist > 0) {
            const pushDir = normalize(sub(s.player.pos, hazard.pos));
            s.player.pos.x += pushDir.x * pushStrength * dt;
            s.player.pos.y += pushDir.y * pushStrength * dt;
          }
        }
      }

      // Enemy interactions
      for (const enemy of s.enemies) {
        if (!enemy.active) continue;
        const enemyDist = distance(enemy.pos, hazard.pos);
        if (enemyDist >= hazard.radius + enemy.radius) continue;

        switch (hazard.type) {
          case 'void_rift':
            enemy.health -= 5 * dt;
            if (enemy.health <= 0) {
              this.killEnemy(enemy);
            }
            break;
          case 'plasma_pool': {
            const slowFactor = Math.max(0, 1 - 0.5 * dt * 10);
            enemy.vel.x *= slowFactor;
            enemy.vel.y *= slowFactor;
            break;
          }
          case 'gravity_anomaly':
            if (enemyDist > 0) {
              const pushStrength = 150 * (1 - enemyDist / hazard.radius);
              const pushDir = normalize(sub(enemy.pos, hazard.pos));
              enemy.pos.x += pushDir.x * pushStrength * dt;
              enemy.pos.y += pushDir.y * pushStrength * dt;
            }
            break;
        }
      }

      // Gravity anomaly also affects projectiles
      if (hazard.type === 'gravity_anomaly') {
        for (const proj of s.projectiles) {
          if (!proj.active) continue;
          const projDist = distance(proj.pos, hazard.pos);
          if (projDist < hazard.radius && projDist > 0) {
            const pushStrength = 150 * (1 - projDist / hazard.radius);
            const pushDir = normalize(sub(proj.pos, hazard.pos));
            proj.vel.x += pushDir.x * pushStrength * dt;
            proj.vel.y += pushDir.y * pushStrength * dt;
          }
        }
      }
    }

    // Clean up inactive hazards
    s.hazards = s.hazards.filter(h => h.active);
  }

  // ── Level Up ──────────────────────────────────────────────────

  private xpForLevel(level: number): number {
    return level * 25 + level * level * 5;
  }

  private checkLevelUp(): void {
    const p = this.state.player;
    const needed = this.xpForLevel(p.level);

    if (p.xp >= needed) {
      p.xp -= needed;
      p.level++;
      p.maxHealth += 10;
      p.health = Math.min(p.health + 20, p.maxHealth);

      this.particles.emitLevelUp(p.pos.x, p.pos.y);
      this.audio.playLevelUp();

      // Generate upgrade choices
      const choices = getRandomUpgradeChoices(p, 3);
      this.state.upgradeChoices = choices;
      this.state.showUpgradeScreen = true;

      // Tutorial: upgrade hint
      if (!this.tutorialTriggered.has('upgrade')) {
        this.tutorialTriggered.add('upgrade');
        this.renderer?.showTutorialHint('upgrade', 'Press 1, 2, or 3 to choose an upgrade');
      }

      // Notify React UI
      if (this.callbacks) {
        const currentAbilityIds = this.state.player.abilities.map(a => a.id);
        this.callbacks.onLevelUp(
          choices.map((c) => {
            const completions = getSynergyCompletions(currentAbilityIds, c.id);
            return {
              id: c.id,
              name: c.name,
              description: getAbilityDescription(c, c.level),
              icon: c.icon,
              level: c.level,
              maxLevel: c.maxLevel,
              color: c.color,
              synergy: completions.length > 0 ? {
                name: completions[0].name,
                icon: completions[0].icon,
                color: completions[0].color,
              } : undefined,
            };
          })
        );
      }
    }
  }

  // ── Synergy Detection ──────────────────────────────────────────

  private checkSynergies(): void {
    const abilityIds = this.state.player.abilities.map(a => a.id);
    const nowActive = detectActiveSynergies(abilityIds);
    const previousIds = new Set(this.state.activeSynergies.map(as => as.synergy.id));

    // Find newly activated synergies
    for (const syn of nowActive) {
      if (!previousIds.has(syn.id)) {
        // New synergy activated!
        this.state.activeSynergies.push({
          synergy: syn,
          activatedAt: this.state.time,
        });

        // Show notification via renderer
        this.renderer?.showSynergyNotification(syn.icon, syn.name, syn.description, syn.color);

        // Play achievement sound
        this.audio.playAchievement();

        // Emit particles at player
        this.particles.emit(
          this.state.player.pos.x,
          this.state.player.pos.y,
          20, syn.color, 120, 0.6
        );
      }
    }
  }

  // ── Wave Progression ──────────────────────────────────────────

  private getWaveEventName(wave: number): string | undefined {
    // Swarm Rush: waves 3, 7, 11, ... (every 4 starting at 3)
    if (wave >= 3 && (wave - 3) % 4 === 0) return 'SWARM RUSH';
    // Tank Parade: waves 4, 8, 12, ... (every 4 starting at 4)
    if (wave >= 4 && (wave - 4) % 4 === 0) return 'TANK PARADE';
    // Speed Frenzy: waves 6, 10, 14, ... (every 4 starting at 6)
    if (wave >= 6 && (wave - 6) % 4 === 0) return 'SPEED FRENZY';
    return undefined;
  }

  private getWavePreview(wave: number): string {
    const enemies: string[] = ['Chasers', 'Shooters'];
    if (wave >= 2) enemies.push('Swarms');
    if (wave >= 3) enemies.push('Tanks');
    if (wave >= 3) enemies.push('Splitters');
    if (wave >= 4) enemies.push('Shielders');
    if (wave >= 5) enemies.push('Phantoms');
    if (wave >= 5) enemies.push('BOSS');
    return enemies.join(' · ');
  }

  private checkWaveProgression(): void {
    const expectedWave = Math.floor(this.state.time / WAVE_DURATION) + 1;
    if (expectedWave > this.state.wave) {
      this.state.wave = expectedWave;

      // Wave survival bonus XP
      const waveBonus = 10 + (expectedWave - 1) * 5;
      this.state.player.xp += waveBonus;
      this.xpCollected += waveBonus;
      this.state.score += waveBonus * 2;
      this.particles.emit(
        this.state.player.pos.x,
        this.state.player.pos.y,
        8, '#00ff88', 80, 0.4
      );

      // Reset speed multiplier each wave
      this.enemyManager.setWaveSpeedMultiplier(1);

      // Determine wave event
      const eventName = this.getWaveEventName(expectedWave);
      const wavePreview = this.getWavePreview(expectedWave);
      this.renderer?.announceWave(expectedWave, eventName, wavePreview);
      this.audio.setMusicIntensity(this.state.wave / 10);

      // Apply wave events
      if (eventName === 'SWARM RUSH') {
        this.enemyManager.activateSwarmRush();
      } else if (eventName === 'TANK PARADE') {
        const tanks = this.enemyManager.spawnTankParade(
          expectedWave,
          this.state.player.pos,
          WORLD_SIZE
        );
        for (const e of tanks) e.spawnTime = this.state.time;
        this.state.enemies.push(...tanks);
      } else if (eventName === 'SPEED FRENZY') {
        this.enemyManager.setWaveSpeedMultiplier(1.5);
      }

      // Tutorial: combo hint when wave 2 starts
      if (expectedWave === 2 && !this.tutorialTriggered.has('combo')) {
        this.tutorialTriggered.add('combo');
        this.renderer?.showTutorialHint('combo', 'Kill enemies quickly to build combos for bonus score!', 5);
      }
    }
  }

  // ── Camera ────────────────────────────────────────────────────

  private updateCamera(dt: number): void {
    const cam = this.state.camera;
    cam.targetX = this.state.player.pos.x;
    cam.targetY = this.state.player.pos.y;

    cam.x = lerp(cam.x, cam.targetX, 1 - Math.pow(0.001, dt));
    cam.y = lerp(cam.y, cam.targetY, 1 - Math.pow(0.001, dt));
  }

  // ── Render ────────────────────────────────────────────────────

  private render(): void {
    if (!this.renderer) return;

    const s = this.state;
    const r = this.renderer;

    r.clear();
    r.applyCamera(s.camera);

    r.drawGrid(s.camera);
    r.drawWorldBounds(WORLD_SIZE);

    const cam = s.camera;

    // Draw hazards on the ground layer (before entities)
    for (const hazard of s.hazards) {
      if (hazard.active && r.isVisible(hazard.pos.x, hazard.pos.y, hazard.radius, cam))
        r.drawHazard(hazard, s.time);
    }

    for (const orb of s.xpOrbs) {
      if (orb.active && r.isVisible(orb.pos.x, orb.pos.y, orb.radius, cam))
        r.drawXPOrb(orb, s.time);
    }

    for (const loot of s.lootDrops) {
      if (loot.active && r.isVisible(loot.pos.x, loot.pos.y, 30, cam))
        r.drawLootDrop(loot, s.time);
    }

    for (const enemy of s.enemies) {
      if (enemy.active && r.isVisible(enemy.pos.x, enemy.pos.y, enemy.radius * 3, cam))
        r.drawEnemy(enemy, s.time);
    }

    for (const proj of s.projectiles) {
      if (proj.active && r.isVisible(proj.pos.x, proj.pos.y, 20, cam))
        r.drawProjectile(proj);
    }

    if (s.player.active) {
      r.drawPlayer(s.player, s.time);
      r.drawOrbitShield(s.player, s.player.abilities, s.time);
    }

    const activeParticles = this.particles.getParticles();
    for (const p of activeParticles) {
      if (r.isVisible(p.pos.x, p.pos.y, p.size, cam))
        r.drawParticle(p);
    }

    r.resetCamera();

    // Screen flash
    if (s.screenShake > 1) {
      r.drawScreenFlash(s.screenShake / 15, '#ff3344');
    }

    // Canvas HUD overlay
    r.drawHUD(s, WORLD_SIZE);

    // Subtle CRT scanline overlay (last visual layer)
    r.drawScanlines();

    // Upgrade screen
    if (s.showUpgradeScreen && s.upgradeChoices.length > 0) {
      r.drawUpgradeScreen(s.upgradeChoices, s.time);
    }

    // Game over screen
    if (s.gameOver) {
      r.drawGameOver(s);
    }
  }

  // ── Push HUD State to React ───────────────────────────────────

  private pushHudState(): void {
    if (!this.callbacks) return;

    const p = this.state.player;
    this.callbacks.onStateChange({
      health: p.health,
      maxHealth: p.maxHealth,
      level: p.level,
      wave: this.state.wave,
      score: this.state.score,
      xp: p.xp,
      xpToNext: this.xpForLevel(p.level),
      time: this.state.time,
      paused: this.state.paused,
      abilities: p.abilities.map((a) => ({
        icon: a.icon,
        name: a.name,
        level: a.level,
        color: a.color,
      })),
      combo: this.comboCount,
      maxCombo: this.maxCombo,
      dashCooldown: Math.max(0, this.dashCooldown),
      enemiesKilled: this.enemiesKilled,
    });
  }

  // ── Game Over ─────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.state.gameOver = true;
    this.audio.stopMusic();
    this.audio.playGameOver();
    this.particles.emitExplosion(
      this.state.player.pos.x,
      this.state.player.pos.y,
      '#00eeff',
      40
    );

    // Staggered death explosions
    for (let i = 1; i <= 3; i++) {
      setTimeout(() => {
        this.particles.emitExplosion(
          this.state.player.pos.x + (Math.random() - 0.5) * 40,
          this.state.player.pos.y + (Math.random() - 0.5) * 40,
          ['#00eeff', '#ff00aa', '#ffdd00'][i - 1],
          25
        );
      }, i * 150);
    }
    this.state.screenShake = 20;

    if (this.callbacks) {
      this.callbacks.onGameOver({
        timeSurvived: this.state.time,
        score: this.state.score,
        level: this.state.player.level,
        enemiesKilled: this.enemiesKilled,
        wavesSurvived: this.state.wave,
        maxCombo: this.maxCombo,
        bossesKilled: this.bossesKilled,
        titanKills: this.titanKills,
        harbingerKills: this.harbingerKills,
        nexusKills: this.nexusKills,
        phantomKills: this.phantomKillsThisRun,
        difficulty: this.difficultyConfig.name,
        scoreMult: this.difficultyConfig.scoreMult,
        damageDealt: this.damageDealt,
        damageTaken: this.damageTaken,
        xpCollected: this.xpCollected,
        elitesKilled: this.elitesKilled,
        longestCombo: this.longestCombo,
        abilitiesUsed: this.state.player.abilities.map((a) => a.name),
        lootCollected: this.lootCollected,
      });
    }
  }

  // ── Input Handling ────────────────────────────────────────────

  private attachListeners(): void {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundTouchMove = ((e: TouchEvent) => {
      this.handleTouchMove(e);
    }) as (e: TouchEvent) => void;
    this.boundTouchStart = ((e: TouchEvent) => {
      this.handleTouchStart(e);
    }) as (e: TouchEvent) => void;
    this.boundTouchEnd = this.handleTouchEnd.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas?.addEventListener('mousemove', this.boundMouseMove);
    this.canvas?.addEventListener('touchmove', this.boundTouchMove!, {
      passive: false,
    });
    this.canvas?.addEventListener('touchstart', this.boundTouchStart!, {
      passive: false,
    });
    this.canvas?.addEventListener('touchend', this.boundTouchEnd);
  }

  private detachListeners(): void {
    if (this.boundKeyDown)
      window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp)
      window.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundMouseMove)
      this.canvas?.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundTouchMove)
      this.canvas?.removeEventListener('touchmove', this.boundTouchMove);
    if (this.boundTouchStart)
      this.canvas?.removeEventListener('touchstart', this.boundTouchStart);
    if (this.boundTouchEnd)
      this.canvas?.removeEventListener('touchend', this.boundTouchEnd);

    this.boundKeyDown = null;
    this.boundKeyUp = null;
    this.boundMouseMove = null;
    this.boundTouchMove = null;
    this.boundTouchStart = null;
    this.boundTouchEnd = null;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'Escape':
        if (this.state.showUpgradeScreen) return;
        this.state.paused = !this.state.paused;
        this.pushHudState();
        break;
      case 'Digit1':
        this.selectUpgrade(0);
        break;
      case 'Digit2':
        this.selectUpgrade(1);
        break;
      case 'Digit3':
        this.selectUpgrade(2);
        break;
      case 'Enter':
        if (this.state.gameOver) {
          this.initState();
        }
        break;
      case 'KeyM':
        if (this.audio.isMuted()) {
          this.audio.unmute();
          this.soundEnabled = true;
        } else {
          this.audio.mute();
          this.soundEnabled = false;
        }
        break;
      case 'Space':
        if (
          this.dashCooldown <= 0 &&
          (this.input.up || this.input.down || this.input.left || this.input.right)
        ) {
          // Calculate dash direction from current input
          let dashDx = 0;
          let dashDy = 0;
          if (this.input.up) dashDy -= 1;
          if (this.input.down) dashDy += 1;
          if (this.input.left) dashDx -= 1;
          if (this.input.right) dashDx += 1;
          const dashLen = Math.sqrt(dashDx * dashDx + dashDy * dashDy);
          if (dashLen > 0) {
            dashDx /= dashLen;
            dashDy /= dashLen;
          }

          this.dashTimer = this.DASH_DURATION;
          this.dashCooldown = this.DASH_COOLDOWN;
          this.dashDirection = { x: dashDx, y: dashDy };

          // Grant invincibility during dash
          this.state.player.invincibleUntil = Math.max(
            this.state.player.invincibleUntil,
            this.state.time + this.DASH_DURATION
          );

          // Sound and particle burst
          this.audio.playShoot();
          this.particles.emit(
            this.state.player.pos.x,
            this.state.player.pos.y,
            8,
            '#00ffff',
            120,
            0.3
          );
        }
        break;
    }

    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.input.mouseX = e.clientX - rect.left;
    this.input.mouseY = e.clientY - rect.top;
    if (this.renderer) {
      this.input.mouseWorldX =
        this.input.mouseX + this.state.camera.x - this.renderer.width / 2;
      this.input.mouseWorldY =
        this.input.mouseY + this.state.camera.y - this.renderer.height / 2;
    }
  }

  private touchJoystickCenter: { x: number; y: number } | null = null;

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0 && this.canvas) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchJoystickCenter = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchJoystickCenter || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = this.canvas!.getBoundingClientRect();
    const tx = touch.clientX - rect.left;
    const ty = touch.clientY - rect.top;

    const dx = tx - this.touchJoystickCenter.x;
    const dy = ty - this.touchJoystickCenter.y;
    const deadzone = 10;

    this.input.left = dx < -deadzone;
    this.input.right = dx > deadzone;
    this.input.up = dy < -deadzone;
    this.input.down = dy > deadzone;
  }

  private handleTouchEnd(): void {
    this.touchJoystickCenter = null;
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
  }
}
