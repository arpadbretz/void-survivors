// ============================================================
// Void Survivors — Main Game Engine
// ============================================================

import {
  GameState,
  Player,
  Enemy,
  Projectile,
  XPOrb,
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
} from './enemies';
import {
  getRandomUpgradeChoices,
  applyUpgradeChoice,
  getAbilityDescription,
  createStarterAbility,
} from './abilities';
import { AudioManager } from './audio';

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
    abilities: { icon: string; name: string; level: number; color: string }[];
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
    }[]
  ) => void;
  onGameOver: (stats: {
    timeSurvived: number;
    score: number;
    level: number;
    enemiesKilled: number;
    wavesSurvived: number;
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
  private lastHudUpdate: number = 0;

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

    this.initState();
    this.attachListeners();
    this.running = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  cleanup(): void {
    this.running = false;
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

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (enabled) this.audio.unmute();
    else this.audio.mute();
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

    const player: Player = {
      id: 'player',
      pos: vec2(center, center),
      vel: vec2(0, 0),
      radius: 16,
      health: 100,
      maxHealth: 100,
      type: 'player',
      color: '#00eeff',
      glowColor: '#00ddff',
      active: true,
      xp: 0,
      level: 1,
      speed: 200,
      damage: 10,
      abilities: [],
      invincibleUntil: 2, // 2 seconds of initial invincibility
      lastDamageTime: 0,
    };

    // Give player a starting ability
    player.abilities.push(createStarterAbility());

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
    };

    this.enemiesKilled = 0;
    this.lastHudUpdate = 0;
    this.enemyManager.reset();

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

    // 1. Player movement
    this.updatePlayer(dt);

    // 2. Abilities
    this.updateAbilities(dt);

    // 3. Enemy spawning
    const newEnemies = this.enemyManager.updateSpawning(
      dt,
      s.wave,
      s.player.pos,
      WORLD_SIZE,
      s.enemies
    );
    s.enemies.push(...newEnemies);

    // Check for boss spawn on milestone waves
    if (
      shouldSpawnBoss(s.wave) &&
      !s.enemies.some((e) => e.enemyType === 'boss' && e.active)
    ) {
      const bossEnemies = this.enemyManager.spawnWave(
        s.wave,
        s.player.pos,
        WORLD_SIZE,
        s.enemies
      );
      if (bossEnemies.length > 0) {
        s.enemies.push(...bossEnemies);
        this.audio.playBossSpawn();
      }
    }

    // 4. Enemy AI
    const enemyProj = updateEnemies(s.enemies, s.player, dt, s.time);
    s.projectiles.push(...enemyProj);

    // 5. Update projectiles
    this.updateProjectiles(dt);

    // 6. Collisions
    this.checkCollisions();

    // 7. Particles
    this.particles.update(dt);

    // 8. XP orbs
    this.updateXPOrbs(dt);

    // 9. Level up check
    this.checkLevelUp();

    // 10. Wave progression
    this.checkWaveProgression();

    // 11. Camera
    this.updateCamera(dt);

    // 12. Screen shake decay
    if (s.screenShake > 0) {
      s.screenShake *= 0.9;
      if (s.screenShake < 0.1) s.screenShake = 0;
      s.camera.shakeX = (Math.random() - 0.5) * s.screenShake;
      s.camera.shakeY = (Math.random() - 0.5) * s.screenShake;
    } else {
      s.camera.shakeX = 0;
      s.camera.shakeY = 0;
    }

    // 13. Clean up dead entities and cap counts for performance
    s.enemies = s.enemies.filter((e) => e.active);
    s.projectiles = s.projectiles.filter((p) => p.active);
    s.xpOrbs = s.xpOrbs.filter((o) => o.active);

    // Hard caps to prevent unbounded growth
    if (s.projectiles.length > 300) {
      s.projectiles = s.projectiles.slice(-300);
    }
    if (s.xpOrbs.length > 100) {
      // Remove oldest orbs
      s.xpOrbs = s.xpOrbs.slice(-100);
    }

    // 14. Game over
    if (s.player.health <= 0 && !s.gameOver) {
      this.triggerGameOver();
    }

    // 15. Push HUD state to React (throttled)
    if (s.time - this.lastHudUpdate >= HUD_UPDATE_INTERVAL) {
      this.lastHudUpdate = s.time;
      this.pushHudState();
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

    p.vel.x = dx * p.speed;
    p.vel.y = dy * p.speed;

    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;

    p.pos.x = clamp(p.pos.x, p.radius, WORLD_SIZE - p.radius);
    p.pos.y = clamp(p.pos.y, p.radius, WORLD_SIZE - p.radius);

    if (dx !== 0 || dy !== 0) {
      this.particles.emitTrail(p.pos.x, p.pos.y, '#00aacc');
    }
  }

  private updateAbilities(dt: number): void {
    const s = this.state;
    for (const ability of s.player.abilities) {
      const newProj = ability.onUpdate(
        s.player,
        s.enemies,
        s.projectiles,
        this.particles,
        dt,
        s.time
      );
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
        p.xp += orb.value;
        this.state.score += orb.value;
        this.particles.emitXPPickup(orb.pos.x, orb.pos.y);
        this.audio.playPickup();
      }
    }
  }

  // ── Collisions ────────────────────────────────────────────────

  private checkCollisions(): void {
    const s = this.state;

    // Player projectiles vs enemies
    for (const proj of s.projectiles) {
      if (!proj.active || proj.owner !== 'player') continue;

      for (const enemy of s.enemies) {
        if (!enemy.active) continue;

        const dist = distance(proj.pos, enemy.pos);
        if (dist < proj.radius + enemy.radius) {
          enemy.health -= proj.damage;
          this.particles.emitDamageNumber(
            enemy.pos.x,
            enemy.pos.y,
            proj.damage
          );
          this.particles.emit(proj.pos.x, proj.pos.y, 4, enemy.color, 60, 0.2);
          this.audio.playHit();

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

    p.health -= amount;
    p.lastDamageTime = this.state.time;
    p.invincibleUntil = this.state.time + 1.0;
    this.state.screenShake = 8;

    this.particles.emit(p.pos.x, p.pos.y, 10, '#ff3344', 100, 0.4);
    this.audio.playDamage();

    if (p.health <= 0) {
      p.health = 0;
    }
  }

  private killEnemy(enemy: Enemy): void {
    enemy.active = false;
    this.state.score += enemy.xpValue * 2;
    this.enemiesKilled++;

    this.particles.emitExplosion(enemy.pos.x, enemy.pos.y, enemy.color, 15);
    this.audio.playExplosion();

    if (enemy.enemyType === 'boss') {
      this.particles.emitExplosion(
        enemy.pos.x,
        enemy.pos.y,
        '#ffdd00',
        30
      );
      this.state.screenShake = 15;
    }

    this.state.xpOrbs.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      value: enemy.xpValue,
      radius: 6,
      magnetRadius: BASE_MAGNET_RANGE,
      active: true,
    });
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

      // Notify React UI
      if (this.callbacks) {
        this.callbacks.onLevelUp(
          choices.map((c) => ({
            id: c.id,
            name: c.name,
            description: getAbilityDescription(c, c.level),
            icon: c.icon,
            level: c.level,
            maxLevel: c.maxLevel,
            color: c.color,
          }))
        );
      }
    }
  }

  // ── Wave Progression ──────────────────────────────────────────

  private checkWaveProgression(): void {
    const expectedWave = Math.floor(this.state.time / WAVE_DURATION) + 1;
    if (expectedWave > this.state.wave) {
      this.state.wave = expectedWave;
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

    for (const orb of s.xpOrbs) {
      if (orb.active && r.isVisible(orb.pos.x, orb.pos.y, orb.radius, cam))
        r.drawXPOrb(orb, s.time);
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
      abilities: p.abilities.map((a) => ({
        icon: a.icon,
        name: a.name,
        level: a.level,
        color: a.color,
      })),
    });
  }

  // ── Game Over ─────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.state.gameOver = true;
    this.audio.playGameOver();
    this.particles.emitExplosion(
      this.state.player.pos.x,
      this.state.player.pos.y,
      '#00eeff',
      40
    );

    if (this.callbacks) {
      this.callbacks.onGameOver({
        timeSurvived: this.state.time,
        score: this.state.score,
        level: this.state.player.level,
        enemiesKilled: this.enemiesKilled,
        wavesSurvived: this.state.wave,
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
