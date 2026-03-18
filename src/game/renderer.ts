// ============================================================
// Void Survivors — Rendering Engine (Canvas 2D, Neon Aesthetic)
// Performance-optimized: no shadowBlur in gameplay rendering
// ============================================================

import {
  Player,
  Enemy,
  Projectile,
  Particle,
  XPOrb,
  Hazard,
  LootDrop,
  Camera,
  Ability,
  GameState,
} from './types';

const GRID_SPACING = 80;

// Margin beyond viewport edges to keep drawing (avoids popping)
const CULL_MARGIN = 80;

// Wave-based background colors { r, g, b }
const WAVE_BG_COLORS: { min: number; max: number; r: number; g: number; b: number }[] = [
  { min: 1, max: 2, r: 10, g: 10, b: 18 },   // Deep blue
  { min: 3, max: 5, r: 12, g: 10, b: 20 },   // Dark purple
  { min: 6, max: 8, r: 18, g: 10, b: 10 },   // Deep red
  { min: 9, max: 999, r: 10, g: 18, b: 10 },  // Dark green
];

// Wave-based grid tint colors (brighter versions of wave bg)
const WAVE_GRID_TINTS: { min: number; max: number; r: number; g: number; b: number }[] = [
  { min: 1, max: 2, r: 30, g: 40, b: 80 },
  { min: 3, max: 5, r: 50, g: 30, b: 80 },
  { min: 6, max: 8, r: 80, g: 30, b: 30 },
  { min: 9, max: 999, r: 30, g: 80, b: 30 },
];

// Wave-based edge glow colors
const WAVE_EDGE_COLORS: { min: number; max: number; r: number; g: number; b: number }[] = [
  { min: 1, max: 2, r: 50, g: 80, b: 255 },
  { min: 3, max: 5, r: 150, g: 50, b: 255 },
  { min: 6, max: 8, r: 255, g: 50, b: 50 },
  { min: 9, max: 999, r: 50, g: 255, b: 80 },
];

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  speed: number;
  dirX: number;
  dirY: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface NebulaClouds {
  x: number;
  y: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  driftSpeed: number;
  dirX: number;
  dirY: number;
}

interface ParallaxStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  speed: number;
  dirX: number;
  dirY: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

function getWaveColor(wave: number, table: { min: number; max: number; r: number; g: number; b: number }[]): { r: number; g: number; b: number } {
  for (const entry of table) {
    if (wave >= entry.min && wave <= entry.max) {
      return { r: entry.r, g: entry.g, b: entry.b };
    }
  }
  return table[table.length - 1];
}

function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public width: number;
  public height: number;

  // Wave announcement state
  private waveAnnounceWave: number = 0;
  private waveAnnounceTime: number = 0; // timestamp when announcement started
  private waveAnnounceDuration: number = 3; // seconds
  private waveAnnounceActive: boolean = false;
  private waveAnnounceSubtitle: string | undefined = undefined;
  private waveAnnouncePreview: string | undefined = undefined;

  // Tutorial hint system
  private tutorialHints: { text: string; time: number; duration: number }[] = [];
  private tutorialShown: Set<string> = new Set();

  // Synergy notification system
  private synergyNotifications: { icon: string; name: string; description: string; color: string; time: number; duration: number }[] = [];

  // Kill counter flash state
  private killFlashEntries: { count: number; time: number }[] = [];

  // Kill streak announcement state
  private streakAnnouncements: { text: string; color: string; time: number }[] = [];

  // Wave pulse effect state
  private wavePulseActive: boolean = false;
  private wavePulseTime: number = 0;
  private readonly wavePulseDuration: number = 0.8;

  // Dynamic background color (lerped per wave)
  private currentBgR: number = 10;
  private currentBgG: number = 10;
  private currentBgB: number = 18;
  private targetBgR: number = 10;
  private targetBgG: number = 10;
  private targetBgB: number = 18;
  private currentGridR: number = 30;
  private currentGridG: number = 40;
  private currentGridB: number = 80;
  private targetGridR: number = 30;
  private targetGridG: number = 40;
  private targetGridB: number = 80;
  private currentEdgeR: number = 50;
  private currentEdgeG: number = 80;
  private currentEdgeB: number = 255;
  private targetEdgeR: number = 50;
  private targetEdgeG: number = 80;
  private targetEdgeB: number = 255;
  private lastWave: number = 0;
  private bgTransitionStart: number = 0;
  private bgTransitionDuration: number = 2; // seconds

  // Background stars
  private stars: BackgroundStar[] = [];
  private starsWorldSize: number = 4000;

  // Nebula clouds
  private nebulae: NebulaClouds[] = [];

  // Parallax star layer (far, slower)
  private parallaxStars: ParallaxStar[] = [];

  // Pre-rendered scanline pattern
  private scanlinePattern: CanvasPattern | null = null;

  // World edge pulse phase
  private edgePulsePhase: number = 0;

  // Star update timing
  private _lastStarUpdate: number = 0;

  // Settings flags
  public showFps: boolean = false;
  public showMinimap: boolean = true;
  public tutorialHintsEnabled: boolean = true;
  public screenShakeEnabled: boolean = true;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private fpsDisplay: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    // Initialize background stars
    this.initStars(4000);

    // Initialize nebula clouds
    this.initNebulae(4000);

    // Initialize parallax star layer
    this.initParallaxStars(4000);

    // Pre-render scanline pattern
    this.initScanlinePattern();
  }

  private initStars(worldSize: number): void {
    this.starsWorldSize = worldSize;
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      this.stars.push({
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.1 + Math.random() * 0.2,
        speed,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.5 + Math.random() * 2,
      });
    }
  }

  private initNebulae(worldSize: number): void {
    // Nebula color palette: deep purples, blues, magentas, teals
    const nebulaColors: [number, number, number][] = [
      [80, 20, 120],   // deep purple
      [20, 40, 120],   // deep blue
      [120, 20, 80],   // magenta
      [20, 100, 100],  // teal
      [60, 10, 100],   // violet
      [20, 60, 110],   // slate blue
    ];
    this.nebulae = [];
    const count = 4 + Math.floor(Math.random() * 3); // 4-6
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const col = nebulaColors[i % nebulaColors.length];
      this.nebulae.push({
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        radius: 300 + Math.random() * 300,
        r: col[0],
        g: col[1],
        b: col[2],
        alpha: 0.02 + Math.random() * 0.02,
        driftSpeed: 2 + Math.random() * 3,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
      });
    }
  }

  private initParallaxStars(worldSize: number): void {
    this.parallaxStars = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.parallaxStars.push({
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        size: 2 + Math.random() * 2,
        baseAlpha: 0.05 + Math.random() * 0.1,
        speed,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.8 + Math.random() * 1.2,
      });
    }
  }

  private initScanlinePattern(): void {
    // Pre-render a small repeating pattern for scanlines (3px period)
    const patCanvas = document.createElement('canvas');
    patCanvas.width = 1;
    patCanvas.height = 3;
    const patCtx = patCanvas.getContext('2d')!;
    // Row 0 and 1: transparent, Row 2: faint black
    patCtx.clearRect(0, 0, 1, 3);
    patCtx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    patCtx.fillRect(0, 2, 1, 1);
    this.scanlinePattern = this.ctx.createPattern(patCanvas, 'repeat');
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  /**
   * Update wave-dependent colors internally. Called from drawHUD each frame.
   */
  private updateWaveColors(wave: number, gameTime: number): void {
    if (wave !== this.lastWave && wave > 0) {
      this.lastWave = wave;
      const bgTarget = getWaveColor(wave, WAVE_BG_COLORS);
      this.targetBgR = bgTarget.r;
      this.targetBgG = bgTarget.g;
      this.targetBgB = bgTarget.b;
      const gridTarget = getWaveColor(wave, WAVE_GRID_TINTS);
      this.targetGridR = gridTarget.r;
      this.targetGridG = gridTarget.g;
      this.targetGridB = gridTarget.b;
      const edgeTarget = getWaveColor(wave, WAVE_EDGE_COLORS);
      this.targetEdgeR = edgeTarget.r;
      this.targetEdgeG = edgeTarget.g;
      this.targetEdgeB = edgeTarget.b;
      this.bgTransitionStart = gameTime;
    }

    // Lerp colors toward target
    const elapsed = gameTime - this.bgTransitionStart;
    const t = Math.min(1, elapsed / this.bgTransitionDuration);
    const lerpSpeed = t < 1 ? 0.02 : 0;
    this.currentBgR = lerpValue(this.currentBgR, this.targetBgR, lerpSpeed);
    this.currentBgG = lerpValue(this.currentBgG, this.targetBgG, lerpSpeed);
    this.currentBgB = lerpValue(this.currentBgB, this.targetBgB, lerpSpeed);
    this.currentGridR = lerpValue(this.currentGridR, this.targetGridR, lerpSpeed);
    this.currentGridG = lerpValue(this.currentGridG, this.targetGridG, lerpSpeed);
    this.currentGridB = lerpValue(this.currentGridB, this.targetGridB, lerpSpeed);
    this.currentEdgeR = lerpValue(this.currentEdgeR, this.targetEdgeR, lerpSpeed);
    this.currentEdgeG = lerpValue(this.currentEdgeG, this.targetEdgeG, lerpSpeed);
    this.currentEdgeB = lerpValue(this.currentEdgeB, this.targetEdgeB, lerpSpeed);

    // Snap when close enough
    if (t >= 1) {
      this.currentBgR = this.targetBgR;
      this.currentBgG = this.targetBgG;
      this.currentBgB = this.targetBgB;
      this.currentGridR = this.targetGridR;
      this.currentGridG = this.targetGridG;
      this.currentGridB = this.targetGridB;
      this.currentEdgeR = this.targetEdgeR;
      this.currentEdgeG = this.targetEdgeG;
      this.currentEdgeB = this.targetEdgeB;
    }

    // Update edge pulse
    this.edgePulsePhase = gameTime;
  }

  clear(): void {
    this.ctx.globalCompositeOperation = 'source-over';
    const r = Math.round(this.currentBgR);
    const g = Math.round(this.currentBgG);
    const b = Math.round(this.currentBgB);
    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  applyCamera(camera: Camera): void {
    this.ctx.save();
    this.ctx.translate(
      -camera.x + this.width / 2 + camera.shakeX,
      -camera.y + this.height / 2 + camera.shakeY
    );
  }

  resetCamera(): void {
    this.ctx.restore();
  }

  // ── Viewport Culling ───────────────────────────────────────

  /**
   * Returns true if a circle at (x,y) with the given radius is
   * within the camera viewport (plus margin). Coordinates are in
   * world space; camera defines the viewport center.
   */
  isVisible(x: number, y: number, radius: number, camera: Camera): boolean {
    const halfW = this.width / 2 + CULL_MARGIN + radius;
    const halfH = this.height / 2 + CULL_MARGIN + radius;
    const dx = x - camera.x;
    const dy = y - camera.y;
    return dx > -halfW && dx < halfW && dy > -halfH && dy < halfH;
  }

  // ── Background Grid ──────────────────────────────────────────

  drawGrid(camera: Camera): void {
    const ctx = this.ctx;
    const now = performance.now() / 1000;
    const dt = now - (this._lastStarUpdate || now);
    this._lastStarUpdate = now;

    const startX =
      Math.floor((camera.x - this.width / 2) / GRID_SPACING) * GRID_SPACING;
    const startY =
      Math.floor((camera.y - this.height / 2) / GRID_SPACING) * GRID_SPACING;
    const endX = camera.x + this.width / 2 + GRID_SPACING;
    const endY = camera.y + this.height / 2 + GRID_SPACING;

    const gr = Math.round(this.currentGridR);
    const gg = Math.round(this.currentGridG);
    const gb = Math.round(this.currentGridB);

    // Camera follows player, so use camera position as proxy
    const px = camera.x;
    const py = camera.y;
    const brightRadius = 300;
    const brightRadiusSq = brightRadius * brightRadius;

    // Draw dim grid lines (further from player)
    ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      const dx = x - px;
      if (dx * dx < brightRadiusSq) continue;
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      const dy = y - py;
      if (dy * dy < brightRadiusSq) continue;
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Draw bright grid lines (near player — "sonar" effect)
    ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      const dx = x - px;
      if (dx * dx >= brightRadiusSq) continue;
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      const dy = y - py;
      if (dy * dy >= brightRadiusSq) continue;
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // ── Grid Intersection Dots ──────────────────────────────────
    ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, 0.1)`;
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      for (let y = startY; y <= endY; y += GRID_SPACING) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // ── Nebula Clouds ─────────────────────────────────────────
    const halfW = this.width / 2 + CULL_MARGIN;
    const halfH = this.height / 2 + CULL_MARGIN;
    const gameTime = now;

    if (dt > 0 && dt < 0.5) {
      const ws = this.starsWorldSize;
      for (const neb of this.nebulae) {
        neb.x += neb.dirX * neb.driftSpeed * dt;
        neb.y += neb.dirY * neb.driftSpeed * dt;
        if (neb.x < -neb.radius) neb.x += ws + neb.radius * 2;
        else if (neb.x > ws + neb.radius) neb.x -= ws + neb.radius * 2;
        if (neb.y < -neb.radius) neb.y += ws + neb.radius * 2;
        else if (neb.y > ws + neb.radius) neb.y -= ws + neb.radius * 2;
      }
    }

    for (const neb of this.nebulae) {
      const ndx = neb.x - camera.x;
      const ndy = neb.y - camera.y;
      if (ndx < -(halfW + neb.radius) || ndx > (halfW + neb.radius) ||
          ndy < -(halfH + neb.radius) || ndy > (halfH + neb.radius)) continue;

      const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
      grad.addColorStop(0, `rgba(${neb.r}, ${neb.g}, ${neb.b}, ${neb.alpha})`);
      grad.addColorStop(0.5, `rgba(${neb.r}, ${neb.g}, ${neb.b}, ${neb.alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${neb.r}, ${neb.g}, ${neb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Parallax Star Layer (far, 0.5x camera speed) ─────────
    if (dt > 0 && dt < 0.5) {
      const ws = this.starsWorldSize;
      for (const star of this.parallaxStars) {
        star.x += star.dirX * star.speed * dt;
        star.y += star.dirY * star.speed * dt;
        if (star.x < 0) star.x += ws;
        else if (star.x > ws) star.x -= ws;
        if (star.y < 0) star.y += ws;
        else if (star.y > ws) star.y -= ws;
      }
    }

    const parallaxOffsetX = camera.x * 0.5;
    const parallaxOffsetY = camera.y * 0.5;

    for (const star of this.parallaxStars) {
      const sx = star.x - parallaxOffsetX + camera.x;
      const sy = star.y - parallaxOffsetY + camera.y;
      const pdx = sx - camera.x;
      const pdy = sy - camera.y;
      if (pdx < -halfW || pdx > halfW || pdy < -halfH || pdy > halfH) continue;

      const twinkle = Math.sin(gameTime * star.twinkleSpeed + star.twinklePhase);
      const alpha = star.baseAlpha + twinkle * 0.05;
      if (alpha <= 0.02) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#aabbcc';
      ctx.fillRect(
        sx - star.size * 0.5,
        sy - star.size * 0.5,
        star.size,
        star.size
      );
    }
    ctx.globalAlpha = 1;

    // ── Foreground Stars (existing, 1.0x speed) ───────────────
    if (dt > 0 && dt < 0.5) {
      const ws = this.starsWorldSize;
      for (const star of this.stars) {
        star.x += star.dirX * star.speed * dt;
        star.y += star.dirY * star.speed * dt;
        if (star.x < 0) star.x += ws;
        else if (star.x > ws) star.x -= ws;
        if (star.y < 0) star.y += ws;
        else if (star.y > ws) star.y -= ws;
      }
    }

    for (const star of this.stars) {
      const dx = star.x - camera.x;
      const dy = star.y - camera.y;
      if (dx < -halfW || dx > halfW || dy < -halfH || dy > halfH) continue;

      const twinkle = Math.sin(gameTime * star.twinkleSpeed + star.twinklePhase);
      const alpha = star.baseAlpha + twinkle * 0.1;
      if (alpha <= 0.02) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        star.x - star.size * 0.5,
        star.y - star.size * 0.5,
        star.size,
        star.size
      );
    }
    ctx.globalAlpha = 1;
  }

  // ── World Boundary ────────────────────────────────────────────

  drawWorldBounds(worldSize: number): void {
    const ctx = this.ctx;
    const er = Math.round(this.currentEdgeR);
    const eg = Math.round(this.currentEdgeG);
    const eb = Math.round(this.currentEdgeB);

    // Gentle pulse
    const pulse = 0.5 + Math.sin(this.edgePulsePhase * 1.5) * 0.3;

    // Outer glow fade (20px wide, semi-transparent)
    ctx.strokeStyle = `rgba(${er}, ${eg}, ${eb}, ${0.08 * pulse})`;
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, worldSize, worldSize);

    // Mid glow
    ctx.strokeStyle = `rgba(${er}, ${eg}, ${eb}, ${0.15 * pulse})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, worldSize, worldSize);

    // Inner sharp line (3px)
    ctx.strokeStyle = `rgba(${er}, ${eg}, ${eb}, ${0.5 * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, worldSize, worldSize);
  }

  // ── Player ────────────────────────────────────────────────────

  drawPlayer(player: Player, gameTime: number): void {
    const ctx = this.ctx;
    const { x, y } = player.pos;
    const pulse = 1 + Math.sin(gameTime * 6) * 0.08;
    const r = player.radius * pulse;

    // Invincibility flash
    if (player.invincibleUntil > gameTime) {
      if (Math.floor(gameTime * 15) % 2 === 0) return;
    }

    // Recent damage red flash (first 0.3s after hit)
    const timeSinceHit = gameTime - player.lastDamageTime;
    if (timeSinceHit < 0.3 && timeSinceHit >= 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255, 50, 50, ${0.4 * (1 - timeSinceHit / 0.3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalCompositeOperation = 'lighter';

    // Outer glow — radial gradient (player is important, worth the cost)
    this.drawGlow(ctx, x, y, r * 3, '#00ddff', 0.15);

    // Main body — hexagon with fake glow (larger semi-transparent behind)
    this.drawPolygonGlow(ctx, x, y, r, 6, '#00eeff', 0.25, gameTime * 0.5);
    this.drawPolygon(ctx, x, y, r, 6, '#00eeff', gameTime * 0.5);

    // Inner core
    this.drawPolygon(ctx, x, y, r * 0.5, 6, '#ffffff', -gameTime * 0.8);

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Chronomancer Time Dilation Aura ──────────────────────────────

  drawChronomancerAura(player: Player, gameTime: number): void {
    const ctx = this.ctx;
    const { x, y } = player.pos;
    const AURA_RADIUS = 200;

    ctx.save();

    // Subtle pulsing fill
    const pulse = 1 + Math.sin(gameTime * 2) * 0.02;
    const fillAlpha = 0.06 + Math.sin(gameTime * 3) * 0.02;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, AURA_RADIUS * pulse);
    grad.addColorStop(0, `rgba(0, 255, 170, ${fillAlpha})`);
    grad.addColorStop(0.7, `rgba(0, 204, 136, ${fillAlpha * 0.5})`);
    grad.addColorStop(1, 'rgba(0, 204, 136, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, AURA_RADIUS * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Thin teal border
    ctx.strokeStyle = `rgba(0, 255, 170, 0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, AURA_RADIUS * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ── Orbit Shield Visual ────────────────────────────────────────

  drawOrbitShield(player: Player, abilities: Ability[], gameTime: number): void {
    const shield = abilities.find(a => a.id === 'orbit_shield');
    if (!shield) return;

    const ctx = this.ctx;
    const orbCount = 2 + shield.level;
    const orbitRadius = 60 + shield.level * 10;
    const isEvolved = shield.evolved;

    // Draw orbit ring (faint dashed circle)
    ctx.save();
    ctx.strokeStyle = isEvolved ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 221, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Draw each orb
    for (let i = 0; i < orbCount; i++) {
      const a = gameTime * 3 + (i / orbCount) * Math.PI * 2;
      const ox = player.pos.x + Math.cos(a) * orbitRadius;
      const oy = player.pos.y + Math.sin(a) * orbitRadius;
      const orbRadius = isEvolved ? 10 : 7;
      const orbColor = isEvolved ? '#00f0ff' : '#ffdd00';
      const glowColor = isEvolved ? 'rgba(0, 240, 255,' : 'rgba(255, 221, 0,';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer glow
      const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbRadius * 3);
      glow.addColorStop(0, `${glowColor} 0.25)`);
      glow.addColorStop(1, `${glowColor} 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Orb body
      const bodyGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbRadius);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.4, orbColor);
      bodyGrad.addColorStop(1, `${glowColor} 0.4)`);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle trail (small dots behind the orb)
      for (let t = 1; t <= 3; t++) {
        const trailA = a - t * 0.15;
        const tx = player.pos.x + Math.cos(trailA) * orbitRadius;
        const ty = player.pos.y + Math.sin(trailA) * orbitRadius;
        ctx.fillStyle = `${glowColor} ${0.3 - t * 0.08})`;
        ctx.beginPath();
        ctx.arc(tx, ty, orbRadius * (0.6 - t * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  // ── Enemies ───────────────────────────────────────────────────

  drawEnemy(enemy: Enemy, gameTime: number): void {
    const ctx = this.ctx;
    const { x, y } = enemy.pos;

    let sides: number;
    let color: string;
    let rot: number;

    switch (enemy.enemyType) {
      case 'chaser':
        sides = 4;
        color = '#ff3344';
        rot = gameTime * 3;
        break;
      case 'shooter':
        sides = 5;
        color = '#ff8800';
        rot = gameTime * 0.5;
        break;
      case 'swarm':
        sides = 3;
        color = '#ff44aa';
        rot = gameTime * 5;
        break;
      case 'tank':
        sides = 6;
        color = '#aa44ff';
        rot = gameTime * 0.3;
        break;
      case 'splitter':
        sides = 7;  // heptagon - unique shape
        color = '#22dd88';
        rot = gameTime * 2;
        break;
      case 'phantom':
        sides = 4; // diamond shape
        color = '#aa44ff';
        rot = Math.PI / 4; // rotated 45 degrees to make a diamond
        break;
      case 'shielder':
        sides = 8; // octagon
        color = '#44aaff';
        rot = gameTime * 1.5;
        break;
      case 'miniboss':
        sides = 6; // hexagon
        color = '#ff8800';
        rot = gameTime * 1.2;
        break;
      case 'boss': {
        const variant = enemy.bossVariant ?? 'titan';
        if (variant === 'titan') {
          sides = 8; // octagon
          color = '#ff4444';
          rot = gameTime * 0.5;
        } else if (variant === 'harbinger') {
          sides = 6; // hexagon
          color = '#ff8800';
          rot = gameTime * 1.0;
        } else {
          sides = 5; // pentagon
          color = '#cc00ff';
          rot = gameTime * 0.8;
        }
        break;
      }
      default:
        sides = 4;
        color = '#ff3344';
        rot = 0;
    }

    // Elite enemies use gold colors
    if (enemy.isElite) {
      color = '#ffd700';
    }

    // Enraged boss: brighter red tint and faster pulse
    if (enemy.isEnraged && enemy.enemyType === 'boss') {
      color = '#ff2200';
    }

    // Phantom phase alpha
    let phantomAlpha = 1.0;
    if (enemy.enemyType === 'phantom') {
      const pt = enemy.phaseTimer ?? 0;
      switch (enemy.phaseState) {
        case 'visible':
          phantomAlpha = 1.0;
          break;
        case 'fading_out':
          phantomAlpha = 1.0 - (pt - 2) / 0.5 * 0.9; // lerp 1.0 -> 0.1
          break;
        case 'invisible':
          phantomAlpha = 0.1;
          break;
        case 'fading_in':
          phantomAlpha = 0.1 + (pt - 3.5) / 0.5 * 0.9; // lerp 0.1 -> 1.0
          break;
        default:
          phantomAlpha = 1.0;
      }

      // Draw ghostly trail (2-3 previous positions with decreasing alpha)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 3; i++) {
        const trailX = x - enemy.vel.x * 0.02 * i;
        const trailY = y - enemy.vel.y * 0.02 * i;
        const trailAlpha = phantomAlpha * (0.3 / i);
        ctx.fillStyle = '#7700cc';
        ctx.globalAlpha = trailAlpha;
        ctx.beginPath();
        // Diamond shape for trail
        const tr = enemy.radius * (1 - i * 0.15);
        ctx.moveTo(trailX, trailY - tr);
        ctx.lineTo(trailX + tr, trailY);
        ctx.lineTo(trailX, trailY + tr);
        ctx.lineTo(trailX - tr, trailY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Spawn materialize animation (first 0.3s)
    const spawnElapsed = (enemy.spawnTime !== undefined && enemy.spawnTime > 0)
      ? gameTime - enemy.spawnTime
      : 1; // treat as fully spawned if no spawnTime
    const isSpawning = spawnElapsed < 0.3;
    const spawnT = isSpawning ? spawnElapsed / 0.3 : 1; // 0..1

    if (isSpawning) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(spawnT, spawnT);
      ctx.translate(-x, -y);
      ctx.globalAlpha = spawnT;
    }

    // Apply phantom alpha
    if (enemy.enemyType === 'phantom') {
      ctx.globalAlpha = (isSpawning ? spawnT : 1) * phantomAlpha;
    }

    ctx.globalCompositeOperation = 'lighter';

    // Spawn glow ring that expands and fades
    if (isSpawning) {
      const ringRadius = enemy.radius * (1 + (1 - spawnT) * 2);
      const ringAlpha = (1 - spawnT) * 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = ringAlpha * spawnT;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = spawnT;
    }

    if (enemy.enemyType === 'boss') {
      const variant = enemy.bossVariant ?? 'titan';
      // All bosses get radial glow
      this.drawGlow(ctx, x, y, enemy.radius * 3, color, 0.2);

      if (variant === 'titan') {
        // Titan: large octagon with pulsing red glow
        const pulse = 1 + Math.sin(gameTime * 3) * 0.1;
        this.drawPolygonGlow(ctx, x, y, enemy.radius * pulse, 8, '#cc0000', 0.25, rot);
        this.drawPolygon(ctx, x, y, enemy.radius * pulse, 8, color, rot);
        // Inner core
        this.drawPolygon(ctx, x, y, enemy.radius * 0.5, 8, '#ff8888', -rot);
      } else if (variant === 'harbinger') {
        // Harbinger: hexagon with orbiting energy orbs
        this.drawPolygonGlow(ctx, x, y, enemy.radius, 6, '#cc6600', 0.25, rot);
        this.drawPolygon(ctx, x, y, enemy.radius, 6, color, rot);
        // Orbiting energy orbs
        for (let i = 0; i < 4; i++) {
          const orbAngle = gameTime * 2.5 + (i / 4) * Math.PI * 2;
          const orbDist = enemy.radius * 1.6;
          const orbX = x + Math.cos(orbAngle) * orbDist;
          const orbY = y + Math.sin(orbAngle) * orbDist;
          const orbPulse = 3 + Math.sin(gameTime * 5 + i) * 1;
          ctx.fillStyle = '#ffaa44';
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(orbX, orbY, orbPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(orbX, orbY, orbPulse * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else {
        // Nexus: pentagon with rotating inner triangle
        this.drawPolygonGlow(ctx, x, y, enemy.radius, 5, '#9900cc', 0.25, rot);
        this.drawPolygon(ctx, x, y, enemy.radius, 5, color, rot);
        // Inner rotating triangle
        const innerRot = -gameTime * 3;
        this.drawPolygon(ctx, x, y, enemy.radius * 0.45, 3, '#ee66ff', innerRot);
        // Teleport warning flash (last 1 second before teleport)
        const teleTimer = enemy.bossTeleportTimer ?? 0;
        if (teleTimer > 7.0) {
          const flashAlpha = Math.sin(gameTime * 20) * 0.3 + 0.3;
          ctx.fillStyle = `rgba(204, 0, 255, ${flashAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, enemy.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Enraged boss: pulsing red overlay
      if (enemy.isEnraged) {
        const enragePulse = Math.sin(gameTime * 8) * 0.2 + 0.3; // fast pulse between 0.1 and 0.5
        ctx.fillStyle = `rgba(255, 34, 0, ${enragePulse})`;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (enemy.enemyType === 'miniboss') {
      // Mini-boss: larger hexagon with orange pulsing glow ring
      this.drawGlow(ctx, x, y, enemy.radius * 2.5, '#ff8800', 0.2);
      const pulse = 1 + Math.sin(gameTime * 3) * 0.08;
      this.drawPolygonGlow(ctx, x, y, enemy.radius * pulse, 6, '#cc6600', 0.25, rot);
      this.drawPolygon(ctx, x, y, enemy.radius * pulse, 6, color, rot);
      // Inner core hexagon
      this.drawPolygon(ctx, x, y, enemy.radius * 0.45, 6, '#ffcc66', -rot);
      // Pulsing glow ring (orange, like boss red ring but orange)
      const ringPulse = 0.15 + Math.sin(gameTime * 4) * 0.1;
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      ctx.globalAlpha = ringPulse;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius * 1.6 + Math.sin(gameTime * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // Elite enemies get a gold glow overlay
      if (enemy.isElite) {
        this.drawGlow(ctx, x, y, enemy.radius * 2.5, '#ffaa00', 0.2);
      }
      // Regular enemies: larger semi-transparent shape behind = glow
      this.drawPolygonGlow(ctx, x, y, enemy.radius, sides, color, 0.15, rot);
      this.drawPolygon(ctx, x, y, enemy.radius, sides, color, rot);
    }

    ctx.globalCompositeOperation = 'source-over';

    // Shielder aura: translucent blue circle with radial gradient and pulsing edge
    if (enemy.enemyType === 'shielder' && enemy.shieldAuraRadius) {
      const auraRadius = enemy.shieldAuraRadius + Math.sin(gameTime * 2) * 5;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
      gradient.addColorStop(0, 'rgba(68, 170, 255, 0)');
      gradient.addColorStop(0.85, 'rgba(68, 170, 255, 0.04)');
      gradient.addColorStop(1, 'rgba(68, 170, 255, 0.08)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      // Thin blue ring at edge
      ctx.strokeStyle = 'rgba(68, 170, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Reset phantom alpha
    if (enemy.enemyType === 'phantom') {
      ctx.globalAlpha = 1;
    }

    if (isSpawning) {
      ctx.restore();
    }

    // Elite crown indicator (3-triangle crown shape above enemy)
    if (enemy.isElite) {
      const crownY = y - enemy.radius - 12;
      const crownW = enemy.radius * 0.8;
      const crownH = 8;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      // Left triangle
      ctx.moveTo(x - crownW, crownY);
      ctx.lineTo(x - crownW * 0.6, crownY - crownH);
      ctx.lineTo(x - crownW * 0.2, crownY);
      // Center triangle
      ctx.lineTo(x, crownY - crownH * 1.2);
      ctx.lineTo(x + crownW * 0.2, crownY);
      // Right triangle
      ctx.lineTo(x + crownW * 0.6, crownY - crownH);
      ctx.lineTo(x + crownW, crownY);
      ctx.closePath();
      ctx.fill();
    }

    // Elite modifier visual indicators (subtle)
    if (enemy.isElite && enemy.eliteModifier) {
      switch (enemy.eliteModifier) {
        case 'swift': {
          // Speed lines behind the enemy (2-3 short dashes)
          const speed = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
          if (speed > 10) {
            const dirX = -enemy.vel.x / speed;
            const dirY = -enemy.vel.y / speed;
            ctx.strokeStyle = 'rgba(255, 255, 200, 0.4)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
              const offset = (i - 1) * 5;
              const perpX = -dirY * offset;
              const perpY = dirX * offset;
              const startDist = enemy.radius + 4 + i * 3;
              const lineLen = 8 + i * 2;
              ctx.beginPath();
              ctx.moveTo(x + dirX * startDist + perpX, y + dirY * startDist + perpY);
              ctx.lineTo(x + dirX * (startDist + lineLen) + perpX, y + dirY * (startDist + lineLen) + perpY);
              ctx.stroke();
            }
          }
          break;
        }
        case 'regenerating': {
          // Green + symbol floating above
          const bobY = y - enemy.radius - 18 + Math.sin(gameTime * 3) * 3;
          ctx.strokeStyle = 'rgba(0, 220, 80, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, bobY - 4);
          ctx.lineTo(x, bobY + 4);
          ctx.moveTo(x - 4, bobY);
          ctx.lineTo(x + 4, bobY);
          ctx.stroke();
          break;
        }
        case 'splitting': {
          // Two small dots orbiting the enemy
          for (let i = 0; i < 2; i++) {
            const orbitAngle = gameTime * 4 + i * Math.PI;
            const orbitDist = enemy.radius + 6;
            const dotX = x + Math.cos(orbitAngle) * orbitDist;
            const dotY = y + Math.sin(orbitAngle) * orbitDist;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'vampiric': {
          // Dark red aura ring
          ctx.strokeStyle = 'rgba(140, 0, 20, 0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, enemy.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
          // Inner subtle fill
          ctx.fillStyle = 'rgba(140, 0, 20, 0.08)';
          ctx.beginPath();
          ctx.arc(x, y, enemy.radius + 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'armored': {
          // Thicker border/outline
          ctx.strokeStyle = 'rgba(180, 180, 200, 0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, enemy.radius + 2, 0, Math.PI * 2);
          ctx.stroke();
          // Second inner ring for layered look
          ctx.strokeStyle = 'rgba(180, 180, 200, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, enemy.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
    }

    // Low health warning flash
    if (enemy.health < enemy.maxHealth * 0.2 && enemy.health > 0) {
      const flash = Math.sin(gameTime * 15) * 0.3 + 0.3;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Health bar if damaged
    if (enemy.health < enemy.maxHealth) {
      this.drawHealthBar(
        x,
        y - enemy.radius - 10,
        enemy.radius * 2,
        enemy.health,
        enemy.maxHealth,
        color
      );
    }
  }

  // ── Projectiles ───────────────────────────────────────────────

  drawProjectile(proj: Projectile, dt: number = 0.016): void {
    const ctx = this.ctx;
    const { x, y } = proj.pos;

    // Special rendering for chain lightning
    if (proj.isChainLightning) {
      this.drawChainLightning(proj);
      return;
    }

    // Special rendering for void beam
    if (proj.isVoidBeam && proj.beamOrigin) {
      this.drawVoidBeam(proj);
      return;
    }

    // Special rendering for gravity well
    if (proj.isGravityWell) {
      ctx.globalCompositeOperation = 'lighter';
      const gameTime = performance.now() * 0.001;

      // Concentric circles with decreasing alpha
      for (let i = 4; i >= 1; i--) {
        const ringRadius = proj.radius * (i / 4);
        const alpha = 0.15 / i;
        ctx.strokeStyle = '#8844ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner glow
      ctx.fillStyle = '#440088';
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(x, y, proj.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Rotating particle ring
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const a = gameTime * 2 + (i / particleCount) * Math.PI * 2;
        const orbitR = proj.radius * 0.6;
        const px = x + Math.cos(a) * orbitR;
        const py = y + Math.sin(a) * orbitR;
        ctx.fillStyle = i % 2 === 0 ? '#8844ff' : '#ff44aa';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Inner rotating particles (closer, faster)
      for (let i = 0; i < 5; i++) {
        const a = -gameTime * 3.5 + (i / 5) * Math.PI * 2;
        const orbitR = proj.radius * 0.3;
        const px = x + Math.cos(a) * orbitR;
        const py = y + Math.sin(a) * orbitR;
        ctx.fillStyle = '#ff44aa';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    ctx.globalCompositeOperation = 'lighter';

    // Fading trail copies for player projectiles
    if (proj.owner === 'player') {
      const trailAlphas = [0.4, 0.2, 0.1];
      const trailScales = [0.85, 0.7, 0.55];
      for (let i = 1; i <= 3; i++) {
        const prevX = x - proj.vel.x * dt * i;
        const prevY = y - proj.vel.y * dt * i;
        const trailR = proj.radius * trailScales[i - 1];

        ctx.fillStyle = proj.color;
        ctx.globalAlpha = trailAlphas[i - 1];
        ctx.beginPath();
        ctx.arc(prevX, prevY, trailR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Trail line (no shadowBlur)
    const trailLen = 8;
    const trailX = x - Math.cos(proj.angle) * trailLen;
    const trailY = y - Math.sin(proj.angle) * trailLen;

    // Wider glow trail behind
    ctx.strokeStyle = proj.glowColor;
    ctx.lineWidth = proj.radius * 3;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Sharp trail
    ctx.globalAlpha = 1;
    ctx.strokeStyle = proj.color;
    ctx.lineWidth = proj.radius * 1.5;
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Head dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, proj.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Chain Lightning Rendering ─────────────────────────────────

  /**
   * Draw a jagged zigzag lightning bolt between two points.
   * Outer stroke: thick electric blue; inner stroke: thin white.
   */
  private drawLightningBolt(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    segments: number,
    jitter: number,
    alpha: number,
    seed: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    // Perpendicular direction for lateral offsets
    const nx = -dy / len;
    const ny = dx / len;

    // Build zigzag points
    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      // Pseudo-random offset based on seed + segment index
      const hash = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
      const offset = (hash - Math.floor(hash) - 0.5) * 2 * jitter;
      points.push({
        x: x1 + dx * t + nx * offset,
        y: y1 + dy * t + ny * offset,
      });
    }
    points.push({ x: x2, y: y2 });

    // Outer glow bolt (thick, electric blue)
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Inner bright core (thin, white)
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  // ── Void Beam Rendering ──────────────────────────────────────

  private drawVoidBeam(proj: Projectile): void {
    const ctx = this.ctx;
    const origin = proj.beamOrigin!;
    const end = proj.pos;

    ctx.globalCompositeOperation = 'lighter';

    // Outer glow line (wide, low alpha)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = proj.radius * 3;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Mid glow line
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = proj.radius * 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Core beam (bright, thin)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = proj.radius * 0.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Bright tip at the end
    ctx.fillStyle = '#ff88ff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(end.x, end.y, proj.radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Render chain lightning: jagged bolts between chain targets,
   * electric arc sparks on the projectile, and hit flashes.
   */
  private drawChainLightning(proj: Projectile): void {
    const ctx = this.ctx;
    const gameTime = performance.now() * 0.001;
    // Fade based on remaining lifetime (starts at 0.25-0.3s, fades to 0)
    const maxLife = proj.chainTargets ? 0.3 : 0.8;
    const alpha = Math.max(0, Math.min(1, proj.lifetime / (maxLife * 0.5)));

    ctx.globalCompositeOperation = 'lighter';

    // ── Chain bolt connections ────────────────────────────
    if (proj.chainTargets && proj.chainTargets.length > 1) {
      const targets = proj.chainTargets;
      // Animate seed so bolts crackle (change shape every ~0.05s)
      const frameSeed = Math.floor(gameTime * 20);

      for (let i = 0; i < targets.length - 1; i++) {
        const src = targets[i];
        const dst = targets[i + 1];

        // Main bolt
        this.drawLightningBolt(ctx, src.x, src.y, dst.x, dst.y, 6, 15, alpha, frameSeed + i * 7);
        // Secondary thinner branch bolt for extra crackle
        this.drawLightningBolt(ctx, src.x, src.y, dst.x, dst.y, 8, 20, alpha * 0.4, frameSeed + i * 13 + 99);

        // Bright flash at each hit point
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.arc(dst.x, dst.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dst.x, dst.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flash at source point too
      const src = targets[0];
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#44aaff';
      ctx.beginPath();
      ctx.arc(src.x, src.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Electric arc spark on projectile position ────────
    // For chain lightning projectiles that move (evolved cross-pattern bolts)
    if (proj.vel.x !== 0 || proj.vel.y !== 0) {
      const { x, y } = proj.pos;
      const sparkSeed = Math.floor(gameTime * 15);

      // Glow behind the projectile
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#44aaff';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();

      // 4 crackling zigzag arms radiating from center
      for (let arm = 0; arm < 4; arm++) {
        const baseAngle = (arm / 4) * Math.PI * 2 + gameTime * 5;
        const armLen = 15;
        const endX = x + Math.cos(baseAngle) * armLen;
        const endY = y + Math.sin(baseAngle) * armLen;

        // Mini bolt: 3 segments, small jitter
        this.drawLightningBolt(ctx, x, y, endX, endY, 3, 6, 0.9, sparkSeed + arm * 17);
      }

      // Bright core
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Electric blue mid
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#44aaff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Particles ─────────────────────────────────────────────────

  drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;

    if (p.text) {
      // Damage numbers with pop effect
      ctx.globalCompositeOperation = 'source-over';

      // Pop effect: scale up quickly then shrink as it fades
      // t goes from 1 (just spawned) to 0 (about to die)
      const t = 1 - alpha; // 0 = just spawned, 1 = about to die
      let popScale: number;
      if (t < 0.15) {
        // Scale up quickly in first 15% of life
        popScale = 1.0 + (t / 0.15) * 0.5; // 1.0 -> 1.5
      } else {
        // Shrink back down over remaining life
        popScale = 1.5 - ((t - 0.15) / 0.85) * 0.7; // 1.5 -> 0.8
      }

      const fontSize = Math.max(12, Math.round(p.size * popScale));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      // Critical hits get extra glow outline
      if (p.isCrit) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeText(p.text, p.pos.x, p.pos.y);
        // Bright white core for crits
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.text, p.pos.x, p.pos.y);
        // Then overlay with the red tint
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.pos.x, p.pos.y);
      } else {
        ctx.fillText(p.text, p.pos.x, p.pos.y);
      }

      ctx.globalAlpha = 1;
      return;
    }

    const size = p.size * alpha;
    if (size <= 0.5) return;

    ctx.globalCompositeOperation = 'lighter';

    // Simple filled circle — no shadowBlur, no gradient
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── XP Orbs ───────────────────────────────────────────────────

  drawXPOrb(orb: XPOrb, gameTime: number): void {
    const ctx = this.ctx;
    const { x, y } = orb.pos;
    const pulse = 1 + Math.sin(gameTime * 8 + x) * 0.2;
    const r = orb.radius * pulse;

    ctx.globalCompositeOperation = 'lighter';

    // Larger semi-transparent diamond behind for glow effect
    ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
    ctx.beginPath();
    const gr = r * 2;
    ctx.moveTo(x, y - gr);
    ctx.lineTo(x + gr * 0.7, y);
    ctx.lineTo(x, y + gr);
    ctx.lineTo(x - gr * 0.7, y);
    ctx.closePath();
    ctx.fill();

    // Main diamond shape — no shadowBlur
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.7, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.7, y);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Loot Drops ──────────────────────────────────────────────────

  drawLootDrop(loot: LootDrop, gameTime: number): void {
    const ctx = this.ctx;
    const { x } = loot.pos;
    // Bobbing animation (sine wave on Y)
    const bob = Math.sin(gameTime * 3 + x * 0.1) * 5;
    const y = loot.pos.y + bob;
    const r = 14;

    const elapsed = gameTime - loot.spawnTime;
    const remaining = loot.lifetime - elapsed;

    // Flash when about to expire (last 3 seconds)
    if (remaining < 3) {
      const flashRate = remaining < 1 ? 15 : 8;
      if (Math.sin(gameTime * flashRate) < 0) return; // blink out
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Pulsing glow ring
    const glowPulse = 1 + Math.sin(gameTime * 4) * 0.3;
    const glowColor = this.getLootGlowColor(loot.type);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8 * glowPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2 * glowPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    switch (loot.type) {
      case 'health':
        // Green cross
        this.drawLootCross(ctx, x, y, r, '#00ff44');
        break;
      case 'bomb':
        // Red circle with spikes
        this.drawLootBomb(ctx, x, y, r, '#ff2222', gameTime);
        break;
      case 'magnet':
        // Blue diamond
        this.drawLootDiamond(ctx, x, y, r, '#2288ff');
        break;
      case 'shield':
        // Yellow hexagon
        this.drawLootHexagon(ctx, x, y, r, '#ffdd00', gameTime);
        break;
    }

    ctx.restore();
  }

  private getLootGlowColor(type: LootDrop['type']): string {
    switch (type) {
      case 'health': return '#00ff44';
      case 'bomb': return '#ff2222';
      case 'magnet': return '#2288ff';
      case 'shield': return '#ffdd00';
    }
  }

  private drawLootCross(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    const w = r * 0.35;
    const h = r * 0.85;
    ctx.fillStyle = color;
    // Vertical bar
    ctx.fillRect(x - w, y - h, w * 2, h * 2);
    // Horizontal bar
    ctx.fillRect(x - h, y - w, h * 2, w * 2);
    // White highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - w * 0.5, y - h * 0.7, w, h * 1.4);
    ctx.globalAlpha = 1;
  }

  private drawLootBomb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, gameTime: number): void {
    // Core circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Spikes
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2 + gameTime * 2;
      const innerR = r * 0.55;
      const outerR = r * 0.9;
      const sx = x + Math.cos(a) * innerR;
      const sy = y + Math.sin(a) * innerR;
      const ex = x + Math.cos(a) * outerR;
      const ey = y + Math.sin(a) * outerR;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    // White core highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawLootDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.7, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.7, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner diamond highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.35, y);
    ctx.lineTo(x, y + r * 0.5);
    ctx.lineTo(x - r * 0.35, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawLootHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, gameTime: number): void {
    const rot = gameTime * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.8;
      const py = y + Math.sin(a) * r * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner hexagon
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -rot + (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.4;
      const py = y + Math.sin(a) * r * 0.4;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Hazards ──────────────────────────────────────────────────

  drawHazard(hazard: Hazard, gameTime: number): void {
    const ctx = this.ctx;
    const { x, y } = hazard.pos;
    const age = gameTime - hazard.spawnTime;

    // Warning indicator: flashing circle outline during first 1 second
    if (age < 1.0) {
      const flash = Math.sin(age * 15) * 0.5 + 0.5;
      let warningColor: string;
      switch (hazard.type) {
        case 'void_rift': warningColor = '#6600cc'; break;
        case 'plasma_pool': warningColor = '#00ff44'; break;
        case 'gravity_anomaly': warningColor = '#4488ff'; break;
      }
      ctx.strokeStyle = warningColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = flash * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, hazard.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = flash * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, hazard.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Fade in during second 1-1.5, fade out during last 1 second
    const fadeIn = Math.min(1, (age - 1.0) / 0.5);
    const timeLeft = hazard.lifetime - age;
    const fadeOut = Math.min(1, timeLeft / 1.0);
    const alpha = fadeIn * fadeOut;

    switch (hazard.type) {
      case 'void_rift':
        this.drawVoidRift(ctx, x, y, hazard.radius, gameTime, alpha, hazard.pulsePhase);
        break;
      case 'plasma_pool':
        this.drawPlasmaPool(ctx, x, y, hazard.radius, gameTime, alpha, hazard.pulsePhase);
        break;
      case 'gravity_anomaly':
        this.drawGravityAnomaly(ctx, x, y, hazard.radius, gameTime, alpha);
        break;
    }
  }

  private drawVoidRift(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, gameTime: number, alpha: number, phase: number): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(10, 0, 20, ${0.8 * alpha})`);
    grad.addColorStop(0.6, `rgba(40, 0, 80, ${0.5 * alpha})`);
    grad.addColorStop(1, `rgba(102, 0, 204, ${0.15 * alpha})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Edge ring
    ctx.strokeStyle = '#6600cc';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 * alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner spiral arcs
    ctx.globalAlpha = 0.4 * alpha;
    ctx.strokeStyle = '#8800ff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const startAngle = gameTime * 2 + phase + (i * Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(x, y, radius * (0.3 + i * 0.15), startAngle, startAngle + Math.PI * 0.8);
      ctx.stroke();
    }

    // Rotating particle ring at edge
    ctx.globalCompositeOperation = 'lighter';
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const a = gameTime * 1.5 + phase + (i / particleCount) * Math.PI * 2;
      const px = x + Math.cos(a) * radius * 0.85;
      const py = y + Math.sin(a) * radius * 0.85;
      ctx.fillStyle = '#9933ff';
      ctx.globalAlpha = 0.6 * alpha;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawPlasmaPool(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, gameTime: number, alpha: number, phase: number): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(100, 255, 100, ${0.5 * alpha})`);
    grad.addColorStop(0.4, `rgba(0, 255, 68, ${0.35 * alpha})`);
    grad.addColorStop(1, `rgba(0, 255, 68, ${0.0})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright center glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#88ff88';
    ctx.globalAlpha = 0.3 * alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Bubbling effect: small circles bobbing up and down
    for (let i = 0; i < 6; i++) {
      const bAngle = phase + (i / 6) * Math.PI * 2;
      const bDist = radius * (0.3 + 0.3 * ((i % 3) / 3));
      const bx = x + Math.cos(bAngle + gameTime * 0.5) * bDist;
      const bobY = Math.sin(gameTime * 3 + i * 1.2) * 4;
      const by = y + Math.sin(bAngle + gameTime * 0.5) * bDist + bobY;
      const bSize = 2 + Math.sin(gameTime * 2 + i) * 1;

      ctx.fillStyle = '#44ff88';
      ctx.globalAlpha = (0.4 + Math.sin(gameTime * 2.5 + i * 0.8) * 0.2) * alpha;
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1, bSize), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawGravityAnomaly(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, gameTime: number, alpha: number): void {
    ctx.globalCompositeOperation = 'lighter';

    // Concentric rings expanding outward
    for (let i = 0; i < 4; i++) {
      const ringPhase = (gameTime * 0.5 + i * 0.25) % 1.0;
      const ringRadius = radius * ringPhase;
      const ringAlpha = (1 - ringPhase) * 0.4 * alpha;
      if (ringAlpha < 0.02) continue;

      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = ringAlpha;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Central bright dot
    ctx.fillStyle = '#aaccff';
    ctx.globalAlpha = (0.6 + Math.sin(gameTime * 4) * 0.2) * alpha;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Outer boundary ring (faint)
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15 * alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Health Bar ────────────────────────────────────────────────

  drawHealthBar(
    x: number,
    y: number,
    width: number,
    health: number,
    maxHealth: number,
    color: string
  ): void {
    const ctx = this.ctx;
    const barHeight = 3;
    const ratio = health / maxHealth;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - width / 2, y, width, barHeight);

    // Health — no shadowBlur
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y, width * ratio, barHeight);
  }

  // ── Screen Flash ──────────────────────────────────────────────

  drawScreenFlash(intensity: number, color: string): void {
    if (intensity <= 0) return;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    ctx.globalAlpha = intensity * 0.3;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── HUD ───────────────────────────────────────────────────────

  // ── Kill Counter Flash ──────────────────────────────────────

  flashKillCount(count: number): void {
    this.killFlashEntries.push({ count, time: performance.now() / 1000 });
  }

  private drawKillFlash(): void {
    const now = performance.now() / 1000;
    const DURATION = 0.5;
    this.killFlashEntries = this.killFlashEntries.filter(e => now - e.time < DURATION);

    const ctx = this.ctx;
    for (const entry of this.killFlashEntries) {
      const elapsed = now - entry.time;
      const t = elapsed / DURATION; // 0..1
      const alpha = 1 - t;
      const offsetY = t * 40; // floats upward 40px

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#ff3344';
      ctx.fillText(
        `+${entry.count}`,
        this.width / 2,
        this.height - 85 - offsetY
      );
      ctx.restore();
    }
  }

  // ── Kill Streak Announcements ──────────────────────────────

  announceStreak(text: string, color: string): void {
    this.streakAnnouncements.push({ text, color, time: performance.now() / 1000 });
  }

  private drawStreakAnnouncements(): void {
    const now = performance.now() / 1000;
    const DURATION = 2.0;
    this.streakAnnouncements = this.streakAnnouncements.filter(e => now - e.time < DURATION);

    const ctx = this.ctx;
    for (const entry of this.streakAnnouncements) {
      const elapsed = now - entry.time;
      const t = elapsed / DURATION; // 0..1

      // Fade: quick fade in, hold, then fade out
      let alpha: number;
      if (t < 0.1) {
        alpha = t / 0.1; // fade in
      } else if (t < 0.6) {
        alpha = 1; // hold
      } else {
        alpha = 1 - (t - 0.6) / 0.4; // fade out
      }

      // Scale: pop in then settle
      let scale: number;
      if (t < 0.1) {
        scale = 0.5 + (t / 0.1) * 0.8; // 0.5 -> 1.3
      } else if (t < 0.2) {
        scale = 1.3 - ((t - 0.1) / 0.1) * 0.3; // 1.3 -> 1.0
      } else {
        scale = 1.0;
      }

      const fontSize = Math.round(42 * scale);
      const y = this.height / 2 + 40; // below center (wave announcement is above)

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';
      ctx.font = `bold ${fontSize}px monospace`;

      // Glow outline
      ctx.strokeStyle = entry.color;
      ctx.lineWidth = 3;
      ctx.strokeText(entry.text, this.width / 2, y);

      // Bright white core
      ctx.fillStyle = '#ffffff';
      ctx.fillText(entry.text, this.width / 2, y);

      // Color overlay
      ctx.globalAlpha = Math.max(0, alpha * 0.5);
      ctx.fillStyle = entry.color;
      ctx.fillText(entry.text, this.width / 2, y);

      ctx.restore();
    }
  }

  announceWave(wave: number, subtitle?: string, preview?: string): void {
    this.waveAnnounceWave = wave;
    this.waveAnnounceTime = performance.now() / 1000;
    this.waveAnnounceActive = true;
    this.waveAnnounceSubtitle = subtitle;
    this.waveAnnouncePreview = preview;

    // Trigger wave pulse effect
    this.wavePulseActive = true;
    this.wavePulseTime = performance.now() / 1000;
  }

  drawHUD(state: GameState, worldSize: number = 4000): void {
    // Update wave-dependent colors each frame (uses state.wave and state.time)
    this.updateWaveColors(state.wave, state.time);
    if (this.starsWorldSize !== worldSize) {
      this.initStars(worldSize);
      this.initNebulae(worldSize);
      this.initParallaxStars(worldSize);
    }

    const ctx = this.ctx;
    const player = state.player;

    // Health bar at the top
    const hbWidth = 300;
    const hbHeight = 12;
    const hbX = this.width / 2 - hbWidth / 2;
    const hbY = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(hbX - 2, hbY - 2, hbWidth + 4, hbHeight + 4);

    const healthRatio = player.health / player.maxHealth;
    const healthColor =
      healthRatio > 0.5
        ? '#00ff88'
        : healthRatio > 0.25
          ? '#ffaa00'
          : '#ff3344';

    // Pulse the health bar when below 25%
    if (healthRatio < 0.25 && healthRatio > 0) {
      const barPulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.4;
      ctx.globalAlpha = barPulse;
    }
    ctx.fillStyle = healthColor;
    ctx.fillRect(hbX, hbY, hbWidth * healthRatio, hbHeight);
    ctx.globalAlpha = 1;

    // HP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.ceil(player.health)} / ${player.maxHealth}`,
      this.width / 2,
      hbY + hbHeight - 1
    );

    // XP bar below health
    const xpY = hbY + hbHeight + 6;
    const xpNeeded = this.xpForLevel(player.level);
    const xpRatio = Math.min(player.xp / xpNeeded, 1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(hbX - 2, xpY - 2, hbWidth + 4, 8);

    ctx.fillStyle = '#00ccff';
    ctx.fillRect(hbX, xpY, hbWidth * xpRatio, 4);

    // Level
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LV ${player.level}`, 20, 30);

    // Score
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE ${state.score}`, this.width - 20, 30);

    // Wave
    ctx.fillStyle = '#ff8800';
    ctx.fillText(`WAVE ${state.wave}`, this.width - 20, 50);

    // Kills
    ctx.fillStyle = '#ff4466';
    ctx.fillText(`KILLS ${state.enemiesKilled ?? 0}`, this.width - 20, 70);

    // Time
    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60);
    ctx.fillStyle = '#aaaacc';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      20,
      50
    );

    // Ability icons at the bottom
    this.drawAbilityIcons(player.abilities, state.time);

    // Minimap
    if (this.showMinimap) {
      this.drawMinimap(state, worldSize);
    }

    // FPS counter
    if (this.showFps) {
      this.drawFpsCounter();
    }

    // Combo counter (enhanced with milestone visuals)
    const combo = state.combo ?? 0;
    if (combo >= 2) {
      const comboTimer = state.comboTimer ?? 0;
      const comboMultiplier = state.comboMultiplier ?? 1;

      // Color scales with combo
      let comboColor: string;
      if (combo >= 100) comboColor = '#ffd700';
      else if (combo >= 50) comboColor = '#ff00ff';
      else if (combo >= 25) comboColor = '#ff3344';
      else if (combo >= 10) comboColor = '#ff8800';
      else if (combo >= 5) comboColor = '#ffdd00';
      else comboColor = '#ffffff';

      // Size scales with combo
      let fontSize: number;
      if (combo >= 100) fontSize = 32;
      else if (combo >= 50) fontSize = 28;
      else if (combo >= 25) fontSize = 24;
      else if (combo >= 10) fontSize = 20;
      else if (combo >= 5) fontSize = 18;
      else fontSize = 16;

      // Pulsing scale effect — stronger breathing at 25+
      let pulse: number;
      if (combo >= 25) {
        pulse = 1 + Math.sin(Date.now() * 0.006) * 0.15;
      } else {
        pulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
      }
      const scaledSize = Math.round(fontSize * pulse);

      // Fade out as timer runs low
      const alpha = comboTimer > 0.5 ? 1 : Math.max(0, comboTimer / 0.5);

      // Golden screen tint at combo 10+
      if (combo >= 10 && alpha > 0) {
        ctx.save();
        const tintAlpha = combo >= 100 ? 0.05 : combo >= 50 ? 0.035 : 0.02;
        ctx.fillStyle = `rgba(255, 215, 0, ${tintAlpha * alpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }

      // Golden glow border at combo 100+
      if (combo >= 100 && alpha > 0) {
        ctx.save();
        const borderPulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        const borderAlpha = 0.12 * borderPulse * alpha;
        const borderWidth = 6;

        ctx.fillStyle = `rgba(255, 215, 0, ${borderAlpha})`;
        // Top
        ctx.fillRect(0, 0, this.width, borderWidth);
        // Bottom
        ctx.fillRect(0, this.height - borderWidth, this.width, borderWidth);
        // Left
        ctx.fillRect(0, 0, borderWidth, this.height);
        // Right
        ctx.fillRect(this.width - borderWidth, 0, borderWidth, this.height);

        // Softer inner border
        const innerAlpha = borderAlpha * 0.4;
        ctx.fillStyle = `rgba(255, 215, 0, ${innerAlpha})`;
        ctx.fillRect(borderWidth, borderWidth, this.width - borderWidth * 2, 3);
        ctx.fillRect(borderWidth, this.height - borderWidth - 3, this.width - borderWidth * 2, 3);
        ctx.fillRect(borderWidth, borderWidth, 3, this.height - borderWidth * 2);
        ctx.fillRect(this.width - borderWidth - 3, borderWidth, 3, this.height - borderWidth * 2);
        ctx.restore();
      }

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${scaledSize}px monospace`;
      ctx.fillStyle = comboColor;
      ctx.globalAlpha = alpha;

      // Main combo text
      ctx.fillText(`COMBO x${combo}`, this.width / 2, 80);

      // Multiplier display when > 1x
      if (comboMultiplier > 1) {
        ctx.font = `bold ${Math.round(scaledSize * 0.55)}px monospace`;
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${comboMultiplier}x SCORE`, this.width / 2, 80 + scaledSize * 0.7);
      }

      // Milestone title text
      let milestoneText = '';
      if (combo >= 100) {
        milestoneText = 'GODLIKE';
      } else if (combo >= 50) {
        milestoneText = 'UNSTOPPABLE';
      }

      if (milestoneText) {
        const milePulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        const mileSize = Math.round((combo >= 100 ? 22 : 18) * milePulse);
        ctx.font = `bold ${mileSize}px monospace`;
        ctx.fillStyle = '#ffd700';
        const mileY = 80 + scaledSize * 0.7 + (comboMultiplier > 1 ? mileSize + 4 : 0);
        ctx.fillText(milestoneText, this.width / 2, mileY);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Kill counter flash
    this.drawKillFlash();

    // Low health pulsing screen border
    if (healthRatio < 0.3 && healthRatio > 0) {
      const alpha = (1 - healthRatio / 0.3 * 3.33) * (0.3 + 0.15 * Math.sin(state.time * 4));
      if (alpha > 0) {
        const gradient = ctx.createRadialGradient(
          this.width / 2, this.height / 2, this.width * 0.3,
          this.width / 2, this.height / 2, this.width * 0.7
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(255, 0, 0, ${Math.min(alpha, 1)})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    // Synergy icons above ability bar
    this.drawSynergyIcons(state);

    // Wave pulse effect (radial flash on new wave)
    this.drawWavePulse();

    // Wave announcement banner
    this.drawWaveAnnouncement();

    // Kill streak announcements
    this.drawStreakAnnouncements();

    // Tutorial hints
    this.drawTutorialHints();

    // Synergy notifications
    this.drawSynergyNotifications();
  }

  private drawAbilityIcons(abilities: Ability[], gameTime: number): void {
    const ctx = this.ctx;
    const iconSize = 40;
    const gap = 8;
    const totalWidth = abilities.length * (iconSize + gap) - gap;
    const startX = this.width / 2 - totalWidth / 2;
    const y = this.height - iconSize - 15;

    abilities.forEach((ab, i) => {
      const x = startX + i * (iconSize + gap);

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, y, iconSize, iconSize);

      // Border with ability color — no shadowBlur
      ctx.strokeStyle = ab.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, iconSize, iconSize);

      // Icon emoji
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ab.icon, x + iconSize / 2, y + iconSize / 2 + 6);

      // Level indicator
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = ab.color;
      ctx.fillText(`${ab.level}`, x + iconSize / 2, y + iconSize - 4);
    });
  }

  // ── Minimap ──────────────────────────────────────────────────

  private drawMinimap(state: GameState, worldSize: number): void {
    // Don't draw when paused or showing upgrade screen
    if (state.paused || state.showUpgradeScreen) return;

    const ctx = this.ctx;
    const size = 120;
    const margin = 8;
    const mx = this.width - size - margin;
    const my = margin;
    const scale = size / worldSize;

    // Background
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#05050f';
    ctx.fillRect(mx, my, size, size);
    ctx.globalAlpha = 1;

    // Border (neon cyan, thin)
    ctx.strokeStyle = '#00ddff';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, size - 1, size - 1);

    // Hazards — purple dots (2px), batched
    ctx.fillStyle = '#aa44ff';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < state.hazards.length; i++) {
      const h = state.hazards[i];
      if (!h.active) continue;
      ctx.fillRect(mx + h.pos.x * scale - 1, my + h.pos.y * scale - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Loot drops — green dots (2px), batched
    ctx.fillStyle = '#00ff88';
    for (let i = 0; i < state.lootDrops.length; i++) {
      const l = state.lootDrops[i];
      if (!l.active) continue;
      ctx.fillRect(mx + l.pos.x * scale - 1, my + l.pos.y * scale - 1, 2, 2);
    }

    // Enemies — red dots (1.5px), miniboss yellow dots (2px), boss yellow dots (3px)
    // Batch regular enemies first, then minibosses, then bosses
    ctx.fillStyle = '#ff3344';
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.active || e.enemyType === 'boss' || e.enemyType === 'miniboss') continue;
      ctx.fillRect(mx + e.pos.x * scale - 0.75, my + e.pos.y * scale - 0.75, 1.5, 1.5);
    }
    ctx.fillStyle = '#ffdd00';
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.active || e.enemyType !== 'miniboss') continue;
      ctx.fillRect(mx + e.pos.x * scale - 1, my + e.pos.y * scale - 1, 2, 2);
    }
    ctx.fillStyle = '#ffdd00';
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.active || e.enemyType !== 'boss') continue;
      ctx.fillRect(mx + e.pos.x * scale - 1.5, my + e.pos.y * scale - 1.5, 3, 3);
    }

    // Viewport rectangle
    const cam = state.camera;
    const vpX = mx + (cam.x - this.width / 2) * scale;
    const vpY = my + (cam.y - this.height / 2) * scale;
    const vpW = this.width * scale;
    const vpH = this.height * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    // Player — bright cyan dot (3px)
    const px = mx + state.player.pos.x * scale;
    const py = my + state.player.pos.y * scale;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }

  // ── Wave Announcement ──────────────────────────────────────────

  private drawWaveAnnouncement(): void {
    if (!this.waveAnnounceActive) return;

    const now = performance.now() / 1000;
    const elapsed = now - this.waveAnnounceTime;

    if (elapsed >= this.waveAnnounceDuration) {
      this.waveAnnounceActive = false;
      return;
    }

    const ctx = this.ctx;
    const half = this.waveAnnounceDuration / 2;

    // Fade in during first half, fade out during second half
    let alpha: number;
    if (elapsed < half) {
      alpha = elapsed / half;
    } else {
      alpha = 1 - (elapsed - half) / half;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    const text = `WAVE ${this.waveAnnounceWave}`;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px monospace';

    // Glow effect using shadowBlur (transient, acceptable)
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff8800';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(text, this.width / 2, this.height / 2 - 40);

    // Second pass for brighter core
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffdd44';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(text, this.width / 2, this.height / 2 - 40);

    // Wave event subtitle
    if (this.waveAnnounceSubtitle) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff4400';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(this.waveAnnounceSubtitle, this.width / 2, this.height / 2 + 10);
    }

    // Enemy preview line
    if (this.waveAnnouncePreview) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(224, 224, 240, 0.5)';
      ctx.font = '14px monospace';
      const previewY = this.waveAnnounceSubtitle
        ? this.height / 2 + 40
        : this.height / 2 + 10;
      ctx.fillText(this.waveAnnouncePreview, this.width / 2, previewY);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Wave Pulse Effect ────────────────────────────────────────

  private drawWavePulse(): void {
    if (!this.wavePulseActive) return;

    const now = performance.now() / 1000;
    const elapsed = now - this.wavePulseTime;

    if (elapsed >= this.wavePulseDuration) {
      this.wavePulseActive = false;
      return;
    }

    const t = elapsed / this.wavePulseDuration; // 0..1
    const ctx = this.ctx;

    // Radial flash from center that expands and fades
    const maxRadius = Math.max(this.width, this.height) * 0.8;
    const radius = t * maxRadius;
    const alpha = (1 - t) * 0.25; // subtle, starts at 0.25 and fades to 0

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, radius * 0.3,
      this.width / 2, this.height / 2, radius
    );
    gradient.addColorStop(0, `rgba(255, 180, 50, 0)`);
    gradient.addColorStop(0.4, `rgba(255, 180, 50, ${alpha * 0.8})`);
    gradient.addColorStop(0.7, `rgba(255, 140, 30, ${alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ── Tutorial Hints ───────────────────────────────────────────

  showTutorialHint(id: string, text: string, duration: number = 4): void {
    if (!this.tutorialHintsEnabled) return;
    if (this.tutorialShown.has(id)) return;
    this.tutorialShown.add(id);
    this.tutorialHints.push({ text, time: performance.now() / 1000, duration });
  }

  private drawTutorialHints(): void {
    const now = performance.now() / 1000;
    this.tutorialHints = this.tutorialHints.filter(h => now - h.time < h.duration);

    const ctx = this.ctx;
    let offsetY = 0;

    for (const hint of this.tutorialHints) {
      const elapsed = now - hint.time;
      const fadeIn = Math.min(1, elapsed / 0.3);
      const fadeOut = elapsed > hint.duration - 0.5 ? Math.max(0, (hint.duration - elapsed) / 0.5) : 1;
      const alpha = fadeIn * fadeOut;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      // Background pill
      ctx.font = '13px monospace';
      const textWidth = ctx.measureText(hint.text).width;
      const pillWidth = textWidth + 40;
      const pillX = this.width / 2 - pillWidth / 2;
      const pillY = this.height * 0.7 + offsetY;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, 32, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, 32, 16);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(hint.text, this.width / 2, pillY + 21);

      ctx.restore();
      offsetY += 40;
    }
  }

  // ── Synergy Notifications ────────────────────────────────────

  showSynergyNotification(icon: string, name: string, description: string, color: string): void {
    this.synergyNotifications.push({
      icon,
      name,
      description,
      color,
      time: performance.now() / 1000,
      duration: 5,
    });
  }

  private drawSynergyNotifications(): void {
    const now = performance.now() / 1000;
    this.synergyNotifications = this.synergyNotifications.filter(n => now - n.time < n.duration);

    const ctx = this.ctx;
    let offsetY = 0;

    for (const notif of this.synergyNotifications) {
      const elapsed = now - notif.time;
      const fadeIn = Math.min(1, elapsed / 0.4);
      const fadeOut = elapsed > notif.duration - 0.8 ? Math.max(0, (notif.duration - elapsed) / 0.8) : 1;
      const alpha = fadeIn * fadeOut;

      // Slide in from top
      const slideOffset = (1 - fadeIn) * -40;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      // Background pill — golden/synergy themed
      const headerText = `SYNERGY: ${notif.name}`;
      ctx.font = 'bold 14px monospace';
      const headerWidth = ctx.measureText(headerText).width;
      ctx.font = '11px monospace';
      const descWidth = ctx.measureText(notif.description).width;
      const pillWidth = Math.max(headerWidth, descWidth) + 60;
      const pillHeight = 52;
      const pillX = this.width / 2 - pillWidth / 2;
      const pillY = this.height * 0.25 + offsetY + slideOffset;

      // Dark background with golden border
      ctx.fillStyle = 'rgba(10, 8, 2, 0.85)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();

      ctx.strokeStyle = notif.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.stroke();

      // Inner golden glow line
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX + 2, pillY + 2, pillWidth - 4, pillHeight - 4, 10);
      ctx.stroke();

      // Icon
      ctx.font = '18px serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(notif.icon, pillX + 22, pillY + 22);

      // Header: "SYNERGY: Name"
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(headerText, this.width / 2 + 10, pillY + 20);

      // Description
      ctx.font = '11px monospace';
      ctx.fillStyle = notif.color;
      ctx.fillText(notif.description, this.width / 2 + 10, pillY + 40);

      ctx.restore();
      offsetY += pillHeight + 8;
    }
  }

  private drawSynergyIcons(state: GameState): void {
    if (!state.activeSynergies || state.activeSynergies.length === 0) return;

    const ctx = this.ctx;
    const iconSize = 28;
    const gap = 6;
    const synergies = state.activeSynergies;
    const totalWidth = synergies.length * (iconSize + gap) - gap;
    const startX = this.width / 2 - totalWidth / 2;
    // Position just above the ability icons bar
    const y = this.height - 40 - 15 - iconSize - 10;

    for (let i = 0; i < synergies.length; i++) {
      const as = synergies[i];
      const x = startX + i * (iconSize + gap);

      // Background with golden tint
      ctx.fillStyle = 'rgba(20, 16, 4, 0.7)';
      ctx.fillRect(x, y, iconSize, iconSize);

      // Golden border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, iconSize, iconSize);

      // Corner accents
      ctx.strokeStyle = as.synergy.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, iconSize - 2, iconSize - 2);

      // Icon
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(as.synergy.icon, x + iconSize / 2, y + iconSize / 2 + 5);
    }

    // Label above synergy icons
    if (synergies.length > 0) {
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.fillText('SYNERGIES', this.width / 2, y - 3);
    }
  }

  // ── Upgrade Screen ────────────────────────────────────────────

  drawUpgradeScreen(choices: Ability[], gameTime: number): void {
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Title — shadowBlur OK for menu screens (not per-frame gameplay)
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffdd00';
    ctx.fillText('LEVEL UP!', this.width / 2, 100);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aaaacc';
    ctx.font = '16px monospace';
    ctx.fillText('Choose an upgrade', this.width / 2, 130);

    // Ability cards
    const cardWidth = 220;
    const cardHeight = 180;
    const gap = 20;
    const totalWidth = choices.length * (cardWidth + gap) - gap;
    const startX = this.width / 2 - totalWidth / 2;
    const cardY = this.height / 2 - cardHeight / 2;

    choices.forEach((ab, i) => {
      const x = startX + i * (cardWidth + gap);
      const hover = Math.sin(gameTime * 3 + i) * 3;

      // Card background
      ctx.fillStyle = 'rgba(15, 15, 30, 0.9)';
      ctx.fillRect(x, cardY + hover, cardWidth, cardHeight);

      // Card border — shadowBlur OK in menu
      ctx.strokeStyle = ab.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ab.color;
      ctx.strokeRect(x, cardY + hover, cardWidth, cardHeight);
      ctx.shadowBlur = 0;

      // Icon
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ab.icon, x + cardWidth / 2, cardY + hover + 50);

      // Name
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = ab.color;
      ctx.fillText(ab.name, x + cardWidth / 2, cardY + hover + 80);

      // Level
      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText(
        `Level ${ab.level + 1} / ${ab.maxLevel}`,
        x + cardWidth / 2,
        cardY + hover + 100
      );

      // Description
      ctx.font = '11px monospace';
      ctx.fillStyle = '#888899';
      const lines = this.wrapText(ab.description, cardWidth - 20);
      lines.forEach((line, li) => {
        ctx.fillText(line, x + cardWidth / 2, cardY + hover + 120 + li * 14);
      });

      // Key hint
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.fillText(
        `[${i + 1}]`,
        x + cardWidth / 2,
        cardY + hover + cardHeight - 12
      );
    });
  }

  // ── Game Over Screen ──────────────────────────────────────────

  drawGameOver(state: GameState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    // shadowBlur OK for game over screen (static, not per-frame gameplay)
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 48px monospace';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff0022';
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 80);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.fillText(`Score: ${state.score}`, this.width / 2, this.height / 2 - 20);
    ctx.fillText(`Wave: ${state.wave}`, this.width / 2, this.height / 2 + 10);
    ctx.fillText(
      `Level: ${state.player.level}`,
      this.width / 2,
      this.height / 2 + 40
    );

    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60);
    ctx.fillText(
      `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      this.width / 2,
      this.height / 2 + 70
    );

    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(
      'Press ENTER to restart',
      this.width / 2,
      this.height / 2 + 130
    );
  }

  // ── Helper: Draw polygon (no glow, no shadow) ─────────────────

  private drawPolygon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sides: number,
    color: string,
    rotation: number
  ): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Draws a larger, semi-transparent version of the polygon behind
   * the main shape to simulate a glow effect without shadowBlur.
   */
  private drawPolygonGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sides: number,
    color: string,
    alpha: number,
    rotation: number
  ): void {
    const glowRadius = radius * 1.6;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * glowRadius;
      const py = y + Math.sin(a) * glowRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Helper: Glow Shape (legacy name, kept for compatibility) ──

  drawGlowShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sides: number,
    color: string,
    glowColor: string,
    rotation: number
  ): void {
    // Draw glow behind, then solid shape on top — no shadowBlur
    this.drawPolygonGlow(ctx, x, y, radius, sides, glowColor, 0.2, rotation);
    this.drawPolygon(ctx, x, y, radius, sides, color, rotation);
  }

  // ── Helper: Star Shape (for boss) ─────────────────────────────

  private drawStarShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    rotation: number
  ): void {
    const points = 5;
    const innerRadius = radius * 0.5;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rotation + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : innerRadius;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Draws a larger semi-transparent star behind the main star shape.
   */
  private drawStarShapeGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number,
    rotation: number
  ): void {
    const points = 5;
    const glowRadius = radius * 1.5;
    const innerRadius = glowRadius * 0.5;

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rotation + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? glowRadius : innerRadius;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Helper: Radial Glow (only for player + boss) ──────────────

  drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    intensity: number
  ): void {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.colorWithAlpha(color, intensity));
    gradient.addColorStop(1, this.colorWithAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Utility ───────────────────────────────────────────────────

  private colorWithAlpha(hex: string, alpha: number): string {
    // Parse hex color and return rgba
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
      const test = current ? current + ' ' + word : word;
      if (this.ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);

    return lines;
  }

  private xpForLevel(level: number): number {
    return level * 25 + level * level * 5;
  }

  // ── FPS Counter ────────────────────────────────────────────────

  // ── Scanline Overlay (CRT effect, screen-space) ──────────────

  drawScanlines(): void {
    if (!this.scanlinePattern) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.scanlinePattern;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawFpsCounter(): void {
    const now = performance.now();
    this.fpsFrames++;
    if (now - this.fpsLastTime >= 1000) {
      this.fpsDisplay = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0, 238, 255, 0.7)';
    ctx.fillText(`FPS: ${this.fpsDisplay}`, 10, 16);
    ctx.restore();
  }
}
