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
  Camera,
  Ability,
  GameState,
} from './types';

const BG_COLOR = '#0a0a12';
const GRID_COLOR = 'rgba(30, 40, 80, 0.3)';
const GRID_SPACING = 80;

// Margin beyond viewport edges to keep drawing (avoids popping)
const CULL_MARGIN = 80;

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

  // Tutorial hint system
  private tutorialHints: { text: string; time: number; duration: number }[] = [];
  private tutorialShown: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  clear(): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = BG_COLOR;
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
    const startX =
      Math.floor((camera.x - this.width / 2) / GRID_SPACING) * GRID_SPACING;
    const startY =
      Math.floor((camera.y - this.height / 2) / GRID_SPACING) * GRID_SPACING;
    const endX = camera.x + this.width / 2 + GRID_SPACING;
    const endY = camera.y + this.height / 2 + GRID_SPACING;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += GRID_SPACING) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }

    ctx.stroke();
  }

  // ── World Boundary ────────────────────────────────────────────

  drawWorldBounds(worldSize: number): void {
    const ctx = this.ctx;

    // Outer glow line (wider, semi-transparent)
    ctx.strokeStyle = 'rgba(255, 0, 68, 0.25)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, worldSize, worldSize);

    // Inner sharp line
    ctx.strokeStyle = '#ff004488';
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
      case 'boss':
        sides = 10;
        color = '#ff0000';
        rot = gameTime * 1.5;
        break;
      default:
        sides = 4;
        color = '#ff3344';
        rot = 0;
    }

    ctx.globalCompositeOperation = 'lighter';

    if (enemy.enemyType === 'boss') {
      // Boss gets radial gradient glow (worth the cost for a boss)
      this.drawGlow(ctx, x, y, enemy.radius * 3, color, 0.2);
      this.drawStarShapeGlow(ctx, x, y, enemy.radius, color, 0.2, rot);
      this.drawStarShape(ctx, x, y, enemy.radius, color, rot);
    } else {
      // Regular enemies: larger semi-transparent shape behind = glow
      this.drawPolygonGlow(ctx, x, y, enemy.radius, sides, color, 0.15, rot);
      this.drawPolygon(ctx, x, y, enemy.radius, sides, color, rot);
    }

    ctx.globalCompositeOperation = 'source-over';

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

  drawProjectile(proj: Projectile): void {
    const ctx = this.ctx;
    const { x, y } = proj.pos;

    ctx.globalCompositeOperation = 'lighter';

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

  // ── Particles ─────────────────────────────────────────────────

  drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;

    if (p.text) {
      // Damage numbers
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `bold ${Math.max(12, p.size)}px monospace`;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.pos.x, p.pos.y);
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

  announceWave(wave: number): void {
    this.waveAnnounceWave = wave;
    this.waveAnnounceTime = performance.now() / 1000;
    this.waveAnnounceActive = true;
  }

  drawHUD(state: GameState, worldSize: number = 4000): void {
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
    this.drawMinimap(state, worldSize);

    // Combo counter
    const combo = state.combo ?? 0;
    if (combo >= 2) {
      const comboTimer = state.comboTimer ?? 0;

      // Color scales with combo
      let comboColor: string;
      if (combo >= 50) comboColor = '#ff00ff';
      else if (combo >= 20) comboColor = '#ff3344';
      else if (combo >= 10) comboColor = '#ff8800';
      else if (combo >= 5) comboColor = '#ffdd00';
      else comboColor = '#ffffff';

      // Size scales with combo
      let fontSize: number;
      if (combo >= 50) fontSize = 28;
      else if (combo >= 20) fontSize = 24;
      else if (combo >= 10) fontSize = 20;
      else if (combo >= 5) fontSize = 18;
      else fontSize = 16;

      // Pulsing scale effect
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
      const scaledSize = Math.round(fontSize * pulse);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${scaledSize}px monospace`;
      ctx.fillStyle = comboColor;

      // Fade out as timer runs low
      const alpha = comboTimer > 0.5 ? 1 : Math.max(0, comboTimer / 0.5);
      ctx.globalAlpha = alpha;

      ctx.fillText(`COMBO x${combo}`, this.width / 2, 80);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Low health red vignette effect
    if (healthRatio < 0.3 && healthRatio > 0) {
      const intensity = (1 - healthRatio / 0.3) * 0.4;
      const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.3;
      const gradient = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.width * 0.3,
        this.width / 2, this.height / 2, this.width * 0.7
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * pulse})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Wave announcement banner
    this.drawWaveAnnouncement();

    // Tutorial hints
    this.drawTutorialHints();
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
    const ctx = this.ctx;
    const size = 140;
    const margin = 15;
    const mx = this.width - size - margin;
    const my = this.height - size - margin;
    const scale = size / worldSize;

    // Background
    ctx.fillStyle = 'rgba(5, 5, 15, 0.7)';
    ctx.fillRect(mx, my, size, size);

    // Border (neon cyan)
    ctx.strokeStyle = '#00ddff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx, my, size, size);

    // XP orbs (tiny green dots)
    ctx.fillStyle = '#00ff88';
    for (const orb of state.xpOrbs) {
      if (!orb.active) continue;
      const ox = mx + orb.pos.x * scale;
      const oy = my + orb.pos.y * scale;
      ctx.fillRect(ox - 1, oy - 1, 2, 2);
    }

    // Enemies (small red dots)
    ctx.fillStyle = '#ff3344';
    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      const ex = mx + enemy.pos.x * scale;
      const ey = my + enemy.pos.y * scale;
      const dotSize = enemy.enemyType === 'boss' ? 4 : 2;
      ctx.fillRect(ex - dotSize / 2, ey - dotSize / 2, dotSize, dotSize);
    }

    // Viewport rectangle
    const cam = state.camera;
    const vpX = mx + (cam.x - this.width / 2) * scale;
    const vpY = my + (cam.y - this.height / 2) * scale;
    const vpW = this.width * scale;
    const vpH = this.height * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    // Player (bright cyan dot)
    const px = mx + state.player.pos.x * scale;
    const py = my + state.player.pos.y * scale;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(px - 2, py - 2, 4, 4);
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

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Tutorial Hints ───────────────────────────────────────────

  showTutorialHint(id: string, text: string, duration: number = 4): void {
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
}
