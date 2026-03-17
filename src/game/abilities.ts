// ============================================================
// Void Survivors — Ability / Upgrade System
// ============================================================

import {
  Ability,
  Player,
  Enemy,
  Projectile,
  ParticleSystemInterface,
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
  radius: number = 4
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
    onUpdate(player, enemies, _proj, particles, dt, gameTime) {
      const cd = Math.max(0.5, this.cooldown - this.level * 0.2);
      if (gameTime - this.lastUsed < cd) return [];
      this.lastUsed = gameTime;

      const chains = 1 + this.level;
      const damage = 20 + this.level * 10;
      const range = 200 + this.level * 30;

      // Find nearest enemy
      let current = player.pos;
      const hit = new Set<string>();

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
        particles.emit(nearest.pos.x, nearest.pos.y, 5, '#aaddff', 80, 0.3);
        particles.emitDamageNumber(nearest.pos.x, nearest.pos.y, damage);
        current = nearest.pos;
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
];

// ── Public API ──────────────────────────────────────────────────

export function createStarterAbility(): Ability {
  return radialShot();
}

export function createAutoCannonAbility(): Ability {
  return autoCannon();
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

export function applyUpgradeChoice(player: Player, choice: Ability): void {
  const existing = player.abilities.find((a) => a.id === choice.id);

  if (existing) {
    existing.level = Math.min(existing.level + 1, existing.maxLevel);
    // Reapply onAcquire for stacking passives
    if (existing.onAcquire) {
      existing.onAcquire(player);
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
    default:
      return ability.description;
  }
}
