// ============================================================
// Void Survivors — Particle System (Object Pooled, Optimized)
// ============================================================

import { Particle, ParticleSystemInterface } from './types';
import { randomAngle, randomRange } from './math';

const MAX_PARTICLES = 1000;
const MAX_DAMAGE_NUMBERS = 15;

export class ParticleSystem implements ParticleSystemInterface {
  private pool: Particle[];
  private activeCount: number;
  private activeList: Particle[];
  private trailFlip: boolean;
  private activeDamageNumbers: number;
  public reducedMotion: boolean = false;

  constructor() {
    this.pool = [];
    this.activeCount = 0;
    this.activeList = [];
    this.trailFlip = false;
    this.activeDamageNumbers = 0;

    // Pre-allocate pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        life: 0,
        maxLife: 0,
        color: '#ffffff',
        size: 1,
        decay: 1,
        active: false,
      });
    }
  }

  private acquire(): Particle | null {
    // Find an inactive particle in the pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        this.activeCount++;
        return this.pool[i];
      }
    }
    // Pool exhausted — reclaim the oldest (lowest life)
    let oldest = this.pool[0];
    for (let i = 1; i < MAX_PARTICLES; i++) {
      if (this.pool[i].life < oldest.life) {
        oldest = this.pool[i];
      }
    }
    return oldest;
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    life: number
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const a = randomAngle();
      const spd = randomRange(speed * 0.3, speed);

      p.pos.x = x;
      p.pos.y = y;
      p.vel.x = Math.cos(a) * spd;
      p.vel.y = Math.sin(a) * spd;
      p.life = life;
      p.maxLife = life;
      p.color = color;
      p.size = randomRange(1.5, 4);
      p.decay = 1;
      p.text = undefined;
    }
  }

  emitExplosion(x: number, y: number, color: string, count: number = 20): void {
    const effectiveCount = this.reducedMotion ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < effectiveCount; i++) {
      const p = this.acquire();
      if (!p) return;

      const a = randomAngle();
      const spd = randomRange(40, 200);

      p.pos.x = x + randomRange(-3, 3);
      p.pos.y = y + randomRange(-3, 3);
      p.vel.x = Math.cos(a) * spd;
      p.vel.y = Math.sin(a) * spd;
      p.life = randomRange(0.3, 0.8);
      p.maxLife = p.life;
      p.color = color;
      p.size = randomRange(2, 6);
      p.decay = 1;
      p.text = undefined;
    }
  }

  emitTrail(x: number, y: number, color: string): void {
    // 50% chance to actually emit — reduces particle load
    this.trailFlip = !this.trailFlip;
    if (this.trailFlip) return;

    const p = this.acquire();
    if (!p) return;

    p.pos.x = x + randomRange(-2, 2);
    p.pos.y = y + randomRange(-2, 2);
    p.vel.x = randomRange(-10, 10);
    p.vel.y = randomRange(-10, 10);
    p.life = randomRange(0.1, 0.3);
    p.maxLife = p.life;
    p.color = color;
    p.size = randomRange(1, 3);
    p.decay = 1;
    p.text = undefined;
  }

  emitXPPickup(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const p = this.acquire();
      if (!p) return;

      const a = randomAngle();
      const spd = randomRange(30, 80);

      p.pos.x = x;
      p.pos.y = y;
      p.vel.x = Math.cos(a) * spd;
      p.vel.y = Math.sin(a) * spd;
      p.life = 0.4;
      p.maxLife = 0.4;
      p.color = '#00ff66';
      p.size = randomRange(1, 3);
      p.decay = 1;
      p.text = undefined;
    }
  }

  emitDamageNumber(x: number, y: number, damage: number, comboColor?: string): void {
    // Throttle: don't show if too many active damage numbers
    if (this.activeDamageNumbers >= MAX_DAMAGE_NUMBERS) return;

    const p = this.acquire();
    if (!p) return;

    const isCrit = damage > 50;

    p.pos.x = x + randomRange(-10, 10);
    p.pos.y = y - 10;
    p.vel.x = randomRange(-15, 15);
    p.vel.y = isCrit ? -80 : -60;
    p.life = isCrit ? 1.0 : 0.8;
    p.maxLife = p.life;
    p.isCrit = isCrit;

    // Color priority: crit red > combo color > default white
    if (isCrit) {
      p.color = '#ff2222';
      p.size = 24;
      p.text = `CRIT! ${Math.round(damage)}`;
    } else if (comboColor) {
      p.color = comboColor;
      p.size = 16;
      p.text = Math.round(damage).toString();
    } else {
      p.color = '#ffffff';
      p.size = 14;
      p.text = Math.round(damage).toString();
    }
    p.decay = 1;
  }

  emitLevelUp(x: number, y: number): void {
    // Golden ring burst
    const count = 36;
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const a = (i / count) * Math.PI * 2;
      const spd = 150;

      p.pos.x = x;
      p.pos.y = y;
      p.vel.x = Math.cos(a) * spd;
      p.vel.y = Math.sin(a) * spd;
      p.life = 0.8;
      p.maxLife = 0.8;
      p.color = i % 2 === 0 ? '#ffdd00' : '#ffaa00';
      p.size = 4;
      p.decay = 1;
      p.text = undefined;
    }

    // Extra sparkles
    this.emit(x, y, 15, '#ffffff', 100, 0.5);
  }

  update(dt: number): void {
    this.activeCount = 0;
    this.activeDamageNumbers = 0;

    // Rebuild activeList in-place to avoid allocations
    this.activeList.length = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      // Slow down
      p.vel.x *= 1 - dt * 2;
      p.vel.y *= 1 - dt * 2;

      this.activeList.push(p);
      this.activeCount++;

      if (p.text) {
        this.activeDamageNumbers++;
      }
    }
  }

  getParticles(): Particle[] {
    return this.activeList;
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}
