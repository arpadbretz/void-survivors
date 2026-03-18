// ============================================================
// Void Survivors — Ability / Upgrade System
// ============================================================

import {
  Ability,
  Player,
  Enemy,
  Projectile,
  ParticleSystemInterface,
  Synergy,
  ActiveSynergy,
} from './types';
import { distance, angle, normalize, sub, randomAngle, randomRange } from './math';

let nextProjId = 200000;

function projId(): string {
  return `ap_${nextProjId++}`;
}

function createPlayerProjectile(
  x: number,
  y: number,
  a: number,
  speed: number,
  damage: number,
  piercing: number,
  lifetime: number,
  color: string,
  glowColor: string,
  radius: number = 4,
  aoe?: { radius: number; damageFraction: number }
): Projectile {
  return {
    id: projId(),
    pos: { x, y },
    vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
    radius,
    health: 1,
    maxHealth: 1,
    type: 'projectile',
    color,
    glowColor,
    active: true,
    damage,
    piercing,
    lifetime,
    owner: 'player',
    angle: a,
    aoe,
  };
}

// ── Ability Definitions ─────────────────────────────────────────

function radialShot(): Ability {
  return {
    id: 'radial_shot',
    name: 'Radial Shot',
    description: 'Fires projectiles in a circle around you.',
    icon: '💥',
    level: 1,
    maxLevel: 5,
    color: '#00ccff',
    cooldown: 2.0,
    lastUsed: -999,
    onUpdate(player, enemies, projectiles, particles, dt, gameTime) {
      const cd = Math.max(0.6, this.cooldown - this.level * 0.25);
      if (gameTime - this.lastUsed < cd) return [];

      this.lastUsed = gameTime;

      // Evolved: Nova Burst
      if (this.evolved) {
        const count = 16;
        const damage = 70;
        const result: Projectile[] = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          result.push(
            createPlayerProjectile(
              player.pos.x, player.pos.y,
              a, 280, damage, 0, 1.5,
              '#ff00ff', '#cc00cc', 6,
              { radius: 60, damageFraction: 0.3 }
            )
          );
        }
        particles.emit(player.pos.x, player.pos.y, 12, '#ff00ff', 80, 0.4);
        return result;
      }

      const count = 4 + this.level * 2;
      const damage = 15 + this.level * 8;
      const result: Projectile[] = [];

      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        result.push(
          createPlayerProjectile(
            player.pos.x, player.pos.y,
            a, 280, damage, 0, 1.5,
            '#00ccff', '#0088ff'
          )
        );
      }

      particles.emit(player.pos.x, player.pos.y, 8, '#00ccff', 60, 0.3);
      return result;
    },
  };
}

function autoCannon(): Ability {
  return {
    id: 'auto_cannon',
    name: 'Auto Cannon',
    description: 'Fires a projectile at the nearest enemy automatically.',
    icon: '🔫',
    level: 1,
    maxLevel: 5,
    color: '#ffffff',
    cooldown: 0.4,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      // Evolved: Railgun
      if (this.evolved) {
        const cd = 0.8;
        if (gameTime - this.lastUsed < cd) return [];
        this.lastUsed = gameTime;

        const range = 500;
        let nearest: Enemy | null = null;
        let nearDist = range;
        for (const enemy of enemies) {
          if (!enemy.active) continue;
          const dx = enemy.pos.x - player.pos.x;
          const dy = enemy.pos.y - player.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearDist) {
            nearDist = dist;
            nearest = enemy;
          }
        }
        if (!nearest) return [];
        const a = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);
        particles.emit(player.pos.x, player.pos.y, 6, '#ffdd00', 60, 0.25);
        return [
          createPlayerProjectile(
            player.pos.x, player.pos.y,
            a, 800, 100, 5, 1.5,
            '#ffdd00', '#ffaa00', 6
          ),
        ];
      }

      const cd = Math.max(0.15, this.cooldown - (this.level - 1) * 0.05);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const damage = 8 + this.level * 4;
      const range = 300;
      const piercing = (this.level >= 5) ? 2 : (this.level >= 3) ? 1 : 0;

      // Find nearest enemy within range
      let nearest: Enemy | null = null;
      let nearDist = range;

      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dx = enemy.pos.x - player.pos.x;
        const dy = enemy.pos.y - player.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearDist) {
          nearDist = dist;
          nearest = enemy;
        }
      }

      if (!nearest) return [];

      const a = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);

      particles.emit(player.pos.x, player.pos.y, 2, '#aaaaff', 30, 0.15);

      return [
        createPlayerProjectile(
          player.pos.x, player.pos.y,
          a, 400, damage, piercing, 1.0,
          '#ffffff', '#aaaaff', 3
        ),
      ];
    },
  };
}

function orbitShield(): Ability {
  return {
    id: 'orbit_shield',
    name: 'Orbit Shield',
    description: 'Spinning orbs orbit you and damage enemies on contact.',
    icon: '🛡️',
    level: 1,
    maxLevel: 5,
    color: '#ffdd00',
    cooldown: 0.1,
    lastUsed: -999,
    onUpdate(player, enemies, projectiles, particles, dt, gameTime) {
      // Check interval for damage ticks
      if (gameTime - this.lastUsed < this.cooldown) return [];
      this.lastUsed = gameTime;

      const orbCount = 2 + this.level;
      const orbitRadius = 60 + this.level * 10;
      const damage = 10 + this.level * 5;

      for (let i = 0; i < orbCount; i++) {
        const a = gameTime * 3 + (i / orbCount) * Math.PI * 2;
        const ox = player.pos.x + Math.cos(a) * orbitRadius;
        const oy = player.pos.y + Math.sin(a) * orbitRadius;

        // Draw trail particle at orb position
        particles.emitTrail(ox, oy, '#ffdd00');

        // Check collision with enemies
        for (const enemy of enemies) {
          if (!enemy.active) continue;
          const dist = distance({ x: ox, y: oy }, enemy.pos);
          if (dist < enemy.radius + 8) {
            enemy.health -= damage * dt * 10; // damage per tick
            particles.emit(ox, oy, 2, '#ffdd00', 40, 0.2);
          }
        }
      }

      return [];
    },
  };
}

function chainLightning(): Ability {
  return {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Zaps the nearest enemy, chaining to nearby targets.',
    icon: '⚡',
    level: 1,
    maxLevel: 5,
    color: '#aaddff',
    cooldown: 1.5,
    lastUsed: -999,
    activationCount: 0,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      const cd = Math.max(0.5, this.cooldown - this.level * 0.2);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;
      this.activationCount = (this.activationCount || 0) + 1;

      // Evolved: Thunder Storm
      if (this.evolved) {
        const chains = 8;
        const damage = 80;
        const range = 350;
        const result: Projectile[] = [];

        let current = { x: player.pos.x, y: player.pos.y };
        const hit = new Set<string>();
        const hitPositions: { x: number; y: number }[] = [];
        const chainPath: { x: number; y: number }[] = [{ x: current.x, y: current.y }];

        for (let c = 0; c < chains; c++) {
          let nearest: Enemy | null = null;
          let nearDist = range;
          for (const enemy of enemies) {
            if (!enemy.active || hit.has(enemy.id)) continue;
            const d = distance(current, enemy.pos);
            if (d < nearDist) {
              nearDist = d;
              nearest = enemy;
            }
          }
          if (!nearest) break;
          hit.add(nearest.id);
          nearest.health -= damage;
          particles.emit(nearest.pos.x, nearest.pos.y, 10, '#44aaff', 120, 0.5);
          particles.emitDamageNumber(nearest.pos.x, nearest.pos.y, damage);
          hitPositions.push({ x: nearest.pos.x, y: nearest.pos.y });
          chainPath.push({ x: nearest.pos.x, y: nearest.pos.y });
          current = { x: nearest.pos.x, y: nearest.pos.y };
        }

        // Every 3rd activation, spawn cross-pattern lightning bolts from each hit enemy
        if (this.activationCount % 3 === 0) {
          for (const pos of hitPositions) {
            const crossAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            for (const a of crossAngles) {
              result.push(
                createPlayerProjectile(
                  pos.x, pos.y,
                  a, 350, 40, 1, 0.8,
                  '#ffffff', '#aaddff', 4
                )
              );
            }
          }
          particles.emit(player.pos.x, player.pos.y, 15, '#ffffff', 120, 0.5);
        }

        // Mark cross-pattern projectiles as chain lightning
        for (const p of result) {
          p.isChainLightning = true;
          p.spawnTime = gameTime;
        }

        // Add visual bolt for the chain path
        if (chainPath.length > 1) {
          const boltVisual: Projectile = {
            id: projId(),
            pos: { x: chainPath[0].x, y: chainPath[0].y },
            vel: { x: 0, y: 0 },
            radius: 0,
            health: 1,
            maxHealth: 1,
            type: 'projectile',
            color: '#44aaff',
            glowColor: '#aaddff',
            active: true,
            damage: 0,
            piercing: 0,
            lifetime: 0.3,
            owner: 'player',
            angle: 0,
            isChainLightning: true,
            chainTargets: chainPath,
            spawnTime: gameTime,
          };
          result.push(boltVisual);
        }

        return result;
      }

      const chains = 1 + this.level;
      const damage = 20 + this.level * 10;
      const range = 200 + this.level * 30;

      // Find nearest enemy
      let current = { x: player.pos.x, y: player.pos.y };
      const hit = new Set<string>();
      const chainPath: { x: number; y: number }[] = [{ x: current.x, y: current.y }];

      for (let c = 0; c < chains; c++) {
        let nearest: Enemy | null = null;
        let nearDist = range;

        for (const enemy of enemies) {
          if (!enemy.active || hit.has(enemy.id)) continue;
          const d = distance(current, enemy.pos);
          if (d < nearDist) {
            nearDist = d;
            nearest = enemy;
          }
        }

        if (!nearest) break;

        hit.add(nearest.id);
        nearest.health -= damage;
        particles.emit(nearest.pos.x, nearest.pos.y, 8, '#44aaff', 100, 0.4);
        particles.emitDamageNumber(nearest.pos.x, nearest.pos.y, damage);
        chainPath.push({ x: nearest.pos.x, y: nearest.pos.y });
        current = { x: nearest.pos.x, y: nearest.pos.y };
      }

      // Create a visual-only projectile to render the lightning chain bolts
      if (chainPath.length > 1) {
        const boltVisual: Projectile = {
          id: projId(),
          pos: { x: chainPath[0].x, y: chainPath[0].y },
          vel: { x: 0, y: 0 },
          radius: 0,
          health: 1,
          maxHealth: 1,
          type: 'projectile',
          color: '#44aaff',
          glowColor: '#aaddff',
          active: true,
          damage: 0,
          piercing: 0,
          lifetime: 0.25,
          owner: 'player',
          angle: 0,
          isChainLightning: true,
          chainTargets: chainPath,
          spawnTime: gameTime,
        };
        return [boltVisual];
      }

      return [];
    },
  };
}

function frostAura(): Ability {
  return {
    id: 'frost_aura',
    name: 'Frost Aura',
    description: 'Slows enemies near you.',
    icon: '❄️',
    level: 1,
    maxLevel: 5,
    color: '#88ccff',
    cooldown: 0.1,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      if (gameTime - this.lastUsed < this.cooldown) return [];
      this.lastUsed = gameTime;

      const range = 100 + this.level * 30;
      const slowFactor = 0.4 + this.level * 0.08; // fraction of speed to remove

      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = distance(player.pos, enemy.pos);
        if (dist < range) {
          // Apply slow by modifying velocity directly
          enemy.vel.x *= (1 - slowFactor);
          enemy.vel.y *= (1 - slowFactor);

          // Occasional frost particle
          if (Math.random() < 0.05) {
            particles.emitTrail(
              enemy.pos.x + randomRange(-5, 5),
              enemy.pos.y + randomRange(-5, 5),
              '#88ccff'
            );
          }
        }
      }

      return [];
    },
  };
}

function missileSwarm(): Ability {
  return {
    id: 'missile_swarm',
    name: 'Missile Swarm',
    description: 'Fires homing missiles at random enemies.',
    icon: '🚀',
    level: 1,
    maxLevel: 5,
    color: '#ff6600',
    cooldown: 2.5,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      // Evolved: Void Artillery
      if (this.evolved) {
        const cd = 2.0;
        if (gameTime - this.lastUsed < cd) return [];
        this.lastUsed = gameTime;

        const missileCount = 8;
        const damage = 100;
        const result: Projectile[] = [];
        const activeEnemies = enemies.filter((e) => e.active);
        if (activeEnemies.length === 0) return [];

        for (let i = 0; i < missileCount; i++) {
          const target = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
          const a = angle(player.pos, target.pos) + randomRange(-0.2, 0.2);
          result.push(
            createPlayerProjectile(
              player.pos.x, player.pos.y,
              a, 320, damage, 0, 2.0,
              '#ff0044', '#cc0033', 8
            )
          );
        }
        particles.emit(player.pos.x, player.pos.y, 10, '#ff0044', 60, 0.3);
        return result;
      }

      const cd = Math.max(1.0, this.cooldown - this.level * 0.3);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const missileCount = 1 + this.level;
      const damage = 25 + this.level * 12;
      const result: Projectile[] = [];

      // Find random targets
      const activeEnemies = enemies.filter((e) => e.active);
      if (activeEnemies.length === 0) return [];

      for (let i = 0; i < missileCount; i++) {
        const target =
          activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
        const a = angle(player.pos, target.pos) + randomRange(-0.2, 0.2);
        result.push(
          createPlayerProjectile(
            player.pos.x, player.pos.y,
            a, 320, damage, 0, 2.0,
            '#ff6600', '#ff4400', 5
          )
        );
      }

      particles.emit(player.pos.x, player.pos.y, 4, '#ff6600', 40, 0.2);
      return result;
    },
  };
}

function lifeDrain(): Ability {
  return {
    id: 'life_drain',
    name: 'Life Drain',
    description: 'Heals you when enemies die nearby.',
    icon: '💚',
    level: 1,
    maxLevel: 5,
    color: '#00ff66',
    cooldown: 0.5,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      if (gameTime - this.lastUsed < this.cooldown) return [];
      this.lastUsed = gameTime;

      const healRange = 150 + this.level * 20;
      const healAmount = 1 + this.level * 0.5;

      // Check for recently dead enemies nearby (health <= 0)
      for (const enemy of enemies) {
        if (enemy.health <= 0 && enemy.active) {
          const dist = distance(player.pos, enemy.pos);
          if (dist < healRange) {
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            particles.emit(player.pos.x, player.pos.y, 3, '#00ff66', 30, 0.3);
          }
        }
      }

      return [];
    },
  };
}

function xpMagnet(): Ability {
  return {
    id: 'xp_magnet',
    name: 'XP Magnet',
    description: 'Increases XP orb pickup range.',
    icon: '🧲',
    level: 1,
    maxLevel: 5,
    color: '#00ff88',
    cooldown: 999,
    lastUsed: 0,
    onUpdate() {
      // Passive — handled in engine
      return [];
    },
    onAcquire(player) {
      // Marker; engine reads xp_magnet level
    },
  };
}

function gravityWell(): Ability {
  return {
    id: 'gravity_well',
    name: 'Gravity Well',
    description: 'Creates a gravitational vortex that pulls and damages enemies.',
    icon: '🌀',
    level: 1,
    maxLevel: 5,
    color: '#8844ff',
    cooldown: 5.0,
    lastUsed: -999,
    onUpdate(player, enemies, projectiles, particles, dt, gameTime) {
      const cd = this.cooldown;
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const result: Projectile[] = [];
      const duration = 3 + (this.level - 1) * 0.5;
      const radius = 80 + (this.level - 1) * 20;
      const tickDamage = 2 + (this.level - 1) * 1;

      // Evolved: Singularity — 2 wells, double pull, dark color
      const wellCount = this.evolved ? 2 : 1;

      for (let w = 0; w < wellCount; w++) {
        // Place well at random position 100-200px from player
        const placeDist = 100 + Math.random() * 100;
        const placeAngle = Math.random() * Math.PI * 2;
        const wellX = player.pos.x + Math.cos(placeAngle) * placeDist;
        const wellY = player.pos.y + Math.sin(placeAngle) * placeDist;

        const well: Projectile = {
          id: `ap_${200000 + Math.floor(Math.random() * 100000)}`,
          pos: { x: wellX, y: wellY },
          vel: { x: 0, y: 0 },
          radius: this.evolved ? radius * 1.2 : radius,
          health: 1,
          maxHealth: 1,
          type: 'projectile',
          color: this.evolved ? '#440088' : '#8844ff',
          glowColor: this.evolved ? '#220044' : '#6622cc',
          active: true,
          damage: this.evolved ? tickDamage * 2 : tickDamage,
          piercing: 999,
          lifetime: duration,
          owner: 'player',
          angle: 0,
          isGravityWell: true,
        };
        result.push(well);
      }

      particles.emit(player.pos.x, player.pos.y, 6, '#8844ff', 50, 0.3);
      return result;
    },
  };
}

function speedBoost(): Ability {
  return {
    id: 'speed_boost',
    name: 'Speed Boost',
    description: 'Permanently increases your movement speed.',
    icon: '💨',
    level: 1,
    maxLevel: 5,
    color: '#ffff00',
    cooldown: 999,
    lastUsed: 0,
    onUpdate() {
      // Passive — handled in engine
      return [];
    },
    onAcquire(player) {
      player.speed += 25;
    },
  };
}

function plasmaWave(): Ability {
  return {
    id: 'plasma_wave',
    name: 'Plasma Wave',
    description: 'Periodic shockwave damages all nearby enemies.',
    icon: '🌊',
    level: 1,
    maxLevel: 5,
    color: '#ff2288',
    cooldown: 4.0,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      const cd = Math.max(2.0, this.cooldown - this.level * 0.4);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const radius = 120 + this.level * 25;
      const damage = 15 + this.level * 8;

      // Evolved: Supernova — double radius, 3x damage, stuns briefly
      const effectiveRadius = this.evolved ? radius * 2 : radius;
      const effectiveDamage = this.evolved ? damage * 3 : damage;

      // Damage all enemies within radius
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = distance(player.pos, enemy.pos);
        if (dist < effectiveRadius + enemy.radius) {
          // Damage falls off linearly with distance
          const falloff = 1 - (dist / (effectiveRadius + enemy.radius)) * 0.5;
          enemy.health -= Math.floor(effectiveDamage * falloff);
          // Visual hit feedback
          particles.emit(enemy.pos.x, enemy.pos.y, 2, this.evolved ? '#ff88cc' : '#ff2288', 30, 0.2);
        }
      }

      // Expanding ring particles
      const ringCount = this.evolved ? 24 : 16;
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        particles.emit(
          player.pos.x + Math.cos(a) * 20,
          player.pos.y + Math.sin(a) * 20,
          1,
          this.evolved ? '#ff88cc' : '#ff2288',
          effectiveRadius * 2,
          0.5
        );
      }

      return [];
    },
  };
}

function voidBeam(): Ability {
  return {
    id: 'void_beam',
    name: 'Void Beam',
    description: 'Channeled laser that pierces all enemies in a line.',
    icon: '🔦',
    level: 1,
    maxLevel: 8,
    color: '#ff00ff',
    cooldown: 0.3,
    lastUsed: -999,
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      // Evolved: Annihilation Ray
      const evolved = this.evolved;
      const cd = evolved
        ? Math.max(0.1, 0.2 - this.level * 0.01)
        : Math.max(0.15, 0.3 - this.level * 0.02);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const damage = evolved ? (3 + this.level * 2) * 3 : 3 + this.level * 2;
      const range = evolved
        ? (300 + this.level * 30) * 2
        : 300 + this.level * 30;
      const hitboxWidth = evolved ? 24 : 12;

      // Find nearest enemy within range
      let nearest: Enemy | null = null;
      let nearDist = range;
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dx = enemy.pos.x - player.pos.x;
        const dy = enemy.pos.y - player.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearDist) {
          nearDist = dist;
          nearest = enemy;
        }
      }

      if (!nearest) return [];

      const a = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);

      // Create a beam projectile — very fast, very short lifetime, high piercing
      const beamSpeed = 3000;
      const proj = createPlayerProjectile(
        player.pos.x, player.pos.y,
        a, beamSpeed, damage, 999, 0.1,
        '#ff00ff', '#cc00cc',
        evolved ? 12 : 6
      );
      proj.isVoidBeam = true;
      proj.beamOrigin = { x: player.pos.x, y: player.pos.y };

      particles.emit(player.pos.x, player.pos.y, 2, '#ff00ff', 20, 0.1);
      return [proj];
    },
  };
}

// ── Registry ────────────────────────────────────────────────────

type AbilityFactory = () => Ability;

const ABILITY_REGISTRY: AbilityFactory[] = [
  radialShot,
  autoCannon,
  orbitShield,
  chainLightning,
  frostAura,
  missileSwarm,
  lifeDrain,
  xpMagnet,
  speedBoost,
  gravityWell,
  plasmaWave,
  voidBeam,
];

// ── Public API ──────────────────────────────────────────────────

export function createStarterAbility(): Ability {
  return radialShot();
}

export function createAutoCannonAbility(): Ability {
  return autoCannon();
}

export function createOrbitShieldAbility(): Ability {
  return orbitShield();
}

export function createVoidBeamAbility(): Ability {
  return voidBeam();
}

export function createAbilityById(id: string): Ability | null {
  const factory = ABILITY_REGISTRY.find((f) => f().id === id);
  if (!factory) return null;
  return factory();
}

export function getRandomUpgradeChoices(player: Player, count: number = 3): Ability[] {
  const choices: Ability[] = [];

  // Collect candidates: existing abilities not maxed, or new ones
  const owned = new Map(player.abilities.map((a) => [a.id, a]));

  // Prioritize leveling existing abilities
  const upgradeable = player.abilities.filter((a) => a.level < a.maxLevel);
  const newAbilities = ABILITY_REGISTRY
    .map((f) => f())
    .filter((a) => !owned.has(a.id));

  // Combine: weighted toward upgradeable
  const pool: Ability[] = [];

  for (const a of upgradeable) {
    // Create a copy with next-level preview
    const copy = { ...a, level: a.level + 1 };
    pool.push(copy);
    pool.push(copy); // double weight
  }

  for (const a of newAbilities) {
    pool.push(a);
  }

  // Shuffle and pick
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const seen = new Set<string>();

  for (const a of shuffled) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    choices.push(a);
    if (choices.length >= count) break;
  }

  // If not enough, fill from all factories
  if (choices.length < count) {
    for (const factory of ABILITY_REGISTRY) {
      if (choices.length >= count) break;
      const a = factory();
      if (!seen.has(a.id)) {
        seen.add(a.id);
        choices.push(a);
      }
    }
  }

  return choices.slice(0, count);
}

export const EVOLUTION_MAP: Record<string, { name: string; icon: string; color: string }> = {
  radial_shot: { name: 'Nova Burst', icon: '🌟', color: '#ff00ff' },
  auto_cannon: { name: 'Railgun', icon: '⚡', color: '#ffdd00' },
  chain_lightning: { name: 'Thunder Storm', icon: '🌩️', color: '#ffffff' },
  missile_swarm: { name: 'Void Artillery', icon: '☄️', color: '#ff0044' },
  gravity_well: { name: 'Singularity', icon: '🕳️', color: '#440088' },
  plasma_wave: { name: 'Supernova', icon: '💥', color: '#ff88cc' },
  void_beam: { name: 'Annihilation Ray', icon: '☄️', color: '#ff44ff' },
};

export function getEvolutionInfo(abilityId: string): { name: string; icon: string; color: string } | null {
  return EVOLUTION_MAP[abilityId] ?? null;
}

export function applyUpgradeChoice(player: Player, choice: Ability): void {
  const existing = player.abilities.find((a) => a.id === choice.id);

  if (existing) {
    existing.level = Math.min(existing.level + 1, existing.maxLevel);
    // Reapply onAcquire for stacking passives
    if (existing.onAcquire) {
      existing.onAcquire(player);
    }

    // Check for evolution at max level
    if (existing.level >= existing.maxLevel && !existing.evolved) {
      const evo = EVOLUTION_MAP[existing.id];
      if (evo) {
        existing.evolved = true;
        existing.evolvedName = evo.name;
        existing.name = evo.name;
        existing.icon = evo.icon;
        existing.color = evo.color;
      }
    }
  } else {
    // New ability
    const factory = ABILITY_REGISTRY.find((f) => f().id === choice.id);
    if (factory) {
      const newAbility = factory();
      if (newAbility.onAcquire) {
        newAbility.onAcquire(player);
      }
      player.abilities.push(newAbility);
    }
  }
}

export function getAbilityDescription(ability: Ability, level: number): string {
  // Show evolved descriptions when at max level
  if (ability.evolved || level >= ability.maxLevel) {
    switch (ability.id) {
      case 'radial_shot':
        return `EVOLVED: Nova Burst — 16 explosive projectiles, 70 damage each. AoE explosion on hit (60px, 30% damage).`;
      case 'auto_cannon':
        return `EVOLVED: Railgun — Piercing energy beam, 100 damage, pierces 5 enemies. 0.8s cooldown.`;
      case 'chain_lightning':
        return `EVOLVED: Thunder Storm — Chains to 8 targets, 80 damage. Every 3rd cast spawns lightning bolts.`;
      case 'missile_swarm':
        return `EVOLVED: Void Artillery — 8 massive missiles, 100 damage each. 2.0s cooldown.`;
      case 'gravity_well':
        return `EVOLVED: Singularity — 2 vortexes simultaneously, double pull strength and damage. Dark energy field.`;
      case 'plasma_wave':
        return `EVOLVED: Supernova — Massive shockwave (2x radius), 3x damage. Obliterates everything nearby.`;
      case 'void_beam':
        return `EVOLVED: Annihilation Ray — 3x damage, 2x range, wider beam. Obliterates all in its path.`;
    }
  }

  switch (ability.id) {
    case 'auto_cannon':
      return `Auto-fires at nearest enemy. ${8 + level * 4} damage, ${(0.4 - (level - 1) * 0.05).toFixed(2)}s cooldown.${level >= 3 ? ` Piercing ${level >= 5 ? 2 : 1}.` : ''}`;
    case 'radial_shot':
      return `Fires ${4 + level * 2} projectiles in a ring. ${15 + level * 8} damage each.`;
    case 'orbit_shield':
      return `${2 + level} orbs orbit you dealing contact damage. Radius ${60 + level * 10}px.`;
    case 'chain_lightning':
      return `Zaps nearest enemy, chains to ${1 + level} targets. ${20 + level * 10} damage.`;
    case 'frost_aura':
      return `Slows enemies within ${100 + level * 30}px by ${Math.round((0.4 + level * 0.08) * 100)}%.`;
    case 'missile_swarm':
      return `Fires ${1 + level} homing missiles. ${25 + level * 12} damage each.`;
    case 'life_drain':
      return `Heal ${1 + level * 0.5} HP when enemies die nearby.`;
    case 'xp_magnet':
      return `XP pickup range +${level * 40}px.`;
    case 'speed_boost':
      return `Movement speed +${level * 25}.`;
    case 'gravity_well':
      return `Creates a vortex pulling enemies in. ${(3 + (level - 1) * 0.5).toFixed(1)}s duration, ${80 + (level - 1) * 20}px radius, ${2 + (level - 1)} tick damage.`;
    case 'plasma_wave':
      return `Shockwave hits all enemies within ${120 + level * 25}px. ${15 + level * 8} damage, ${(Math.max(2.0, 4.0 - level * 0.4)).toFixed(1)}s cooldown.`;
    case 'void_beam':
      return `Piercing beam hits all enemies in a line. ${3 + level * 2} damage/tick, ${300 + level * 30}px range, ${(Math.max(0.15, 0.3 - level * 0.02)).toFixed(2)}s cooldown.`;
    default:
      return ability.description;
  }
}

// ── Synergy Definitions ──────────────────────────────────────────

export const SYNERGY_DEFINITIONS: Synergy[] = [
  {
    id: 'elemental_storm',
    name: 'Elemental Storm',
    description: 'Lightning + Frost: +25% damage to all abilities',
    requiredAbilities: ['chain_lightning', 'frost_aura'],
    bonuses: [{ type: 'damage_mult', value: 1.25 }],
    icon: '🌪️',
    color: '#66ddff',
  },
  {
    id: 'bullet_hell',
    name: 'Bullet Hell',
    description: 'Radial Shot + Auto Cannon: -20% cooldown on all abilities',
    requiredAbilities: ['radial_shot', 'auto_cannon'],
    bonuses: [{ type: 'cooldown_mult', value: 0.80 }],
    icon: '💢',
    color: '#ff4488',
  },
  {
    id: 'artillery_command',
    name: 'Artillery Command',
    description: 'Missiles + Gravity Well: +30% damage, +15% range',
    requiredAbilities: ['missile_swarm', 'gravity_well'],
    bonuses: [
      { type: 'damage_mult', value: 1.30 },
      { type: 'range_mult', value: 1.15 },
    ],
    icon: '🎯',
    color: '#ff8800',
  },
  {
    id: 'cosmic_barrier',
    name: 'Cosmic Barrier',
    description: 'Orbit Shield + Frost Aura: +30% range, +2 HP/s regen',
    requiredAbilities: ['orbit_shield', 'frost_aura'],
    bonuses: [
      { type: 'range_mult', value: 1.30 },
      { type: 'health_regen', value: 2 },
    ],
    icon: '🔮',
    color: '#aaddff',
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Auto Cannon + XP Magnet: -15% cooldown, +10% XP gain',
    requiredAbilities: ['auto_cannon', 'xp_magnet'],
    bonuses: [
      { type: 'cooldown_mult', value: 0.85 },
      { type: 'xp_mult', value: 1.10 },
    ],
    icon: '⚡',
    color: '#ffcc00',
  },
  {
    id: 'death_zone',
    name: 'Death Zone',
    description: 'Gravity Well + Chain Lightning: +20% damage, +10% speed',
    requiredAbilities: ['gravity_well', 'chain_lightning'],
    bonuses: [
      { type: 'damage_mult', value: 1.20 },
      { type: 'speed_mult', value: 1.10 },
    ],
    icon: '☠️',
    color: '#9944ff',
  },
  {
    id: 'nova_cascade',
    name: 'Nova Cascade',
    description: 'Radial Shot + Plasma Wave: +30% damage, -15% cooldown',
    requiredAbilities: ['radial_shot', 'plasma_wave'],
    bonuses: [
      { type: 'damage_mult', value: 1.30 },
      { type: 'cooldown_mult', value: 0.85 },
    ],
    icon: '🔥',
    color: '#ff4466',
  },
  {
    id: 'temporal_surge',
    name: 'Temporal Surge',
    description: 'Time bends around you',
    requiredAbilities: ['frost_aura', 'speed_boost'],
    bonuses: [
      { type: 'speed_mult', value: 1.15 },
      { type: 'cooldown_mult', value: 0.9 },
    ],
    icon: '⏳',
    color: '#00ffaa',
  },
];

/**
 * Detect which synergies are active given the player's current abilities.
 */
export function detectActiveSynergies(abilityIds: string[]): Synergy[] {
  const owned = new Set(abilityIds);
  return SYNERGY_DEFINITIONS.filter(syn =>
    syn.requiredAbilities.every(id => owned.has(id))
  );
}

/**
 * Compute aggregate synergy multipliers from active synergies.
 */
export function computeSynergyBonuses(activeSynergies: ActiveSynergy[]): {
  damageMult: number;
  cooldownMult: number;
  rangeMult: number;
  healthRegen: number;
  speedMult: number;
  xpMult: number;
} {
  let damageMult = 1;
  let cooldownMult = 1;
  let rangeMult = 1;
  let healthRegen = 0;
  let speedMult = 1;
  let xpMult = 1;

  for (const as of activeSynergies) {
    for (const bonus of as.synergy.bonuses) {
      switch (bonus.type) {
        case 'damage_mult': damageMult *= bonus.value; break;
        case 'cooldown_mult': cooldownMult *= bonus.value; break;
        case 'range_mult': rangeMult *= bonus.value; break;
        case 'health_regen': healthRegen += bonus.value; break;
        case 'speed_mult': speedMult *= bonus.value; break;
        case 'xp_mult': xpMult *= bonus.value; break;
      }
    }
  }

  return { damageMult, cooldownMult, rangeMult, healthRegen, speedMult, xpMult };
}

/**
 * Check which synergies would be completed if a given ability were acquired.
 * Returns synergies that are NOT currently active but WOULD become active.
 */
export function getSynergyCompletions(currentAbilityIds: string[], candidateId: string): Synergy[] {
  const currentSet = new Set(currentAbilityIds);
  // Already active synergies
  const alreadyActive = new Set(
    SYNERGY_DEFINITIONS
      .filter(syn => syn.requiredAbilities.every(id => currentSet.has(id)))
      .map(syn => syn.id)
  );
  // Check with candidate added
  currentSet.add(candidateId);
  return SYNERGY_DEFINITIONS.filter(syn =>
    !alreadyActive.has(syn.id) &&
    syn.requiredAbilities.every(id => currentSet.has(id))
  );
}
