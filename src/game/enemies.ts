// ============================================================
// Void Survivors — Enemy Spawning and AI
// ============================================================

import {
  Enemy,
  EnemyType,
  Player,
  Projectile,
  WaveConfig,
  Vector2,
} from './types';
import {
  vec2,
  sub,
  normalize,
  mul,
  add,
  distance,
  angle,
  randomAngle,
  randomRange,
  randomOnCircle,
} from './math';

let nextEnemyId = 0;

function genId(): string {
  return `e_${nextEnemyId++}`;
}

// ── Wave Configurations ─────────────────────────────────────────

const WAVE_CONFIGS: WaveConfig[] = [
  { enemyTypes: ['chaser'], spawnRate: 2.5, maxEnemies: 8, duration: 30 },
  { enemyTypes: ['chaser', 'swarm'], spawnRate: 2.0, maxEnemies: 15, duration: 30 },
  { enemyTypes: ['chaser', 'swarm', 'shooter'], spawnRate: 1.5, maxEnemies: 22, duration: 30 },
  { enemyTypes: ['chaser', 'shooter', 'tank'], spawnRate: 1.2, maxEnemies: 30, duration: 30 },
  { enemyTypes: ['chaser', 'swarm', 'shooter', 'tank'], spawnRate: 1.0, maxEnemies: 40, duration: 30 },
];

export function getWaveConfig(wave: number): WaveConfig {
  const idx = Math.min(wave - 1, WAVE_CONFIGS.length - 1);
  const base = WAVE_CONFIGS[idx];

  // Continuously scale after defined waves
  const extraScale = Math.max(0, wave - WAVE_CONFIGS.length);
  return {
    enemyTypes: base.enemyTypes,
    spawnRate: Math.max(0.3, base.spawnRate - extraScale * 0.05),
    maxEnemies: base.maxEnemies + extraScale * 5,
    duration: base.duration,
  };
}

export function shouldSpawnBoss(wave: number): boolean {
  return wave % 5 === 0;
}

// ── Enemy Factory ───────────────────────────────────────────────

export function createEnemy(
  type: EnemyType,
  pos: Vector2,
  wave: number
): Enemy {
  const scaleHP = 1 + (wave - 1) * 0.1;
  const scaleDmg = 1 + (wave - 1) * 0.1;

  const base = {
    id: genId(),
    pos: { ...pos },
    vel: vec2(0, 0),
    active: true,
    type: 'enemy',
    rotation: 0,
    phaseOffset: Math.random() * Math.PI * 2,
    shootCooldown: 0,
    lastShootTime: 0,
  };

  switch (type) {
    case 'chaser':
      return {
        ...base,
        radius: 12,
        health: Math.round(30 * scaleHP),
        maxHealth: Math.round(30 * scaleHP),
        speed: 120,
        damage: Math.round(10 * scaleDmg),
        xpValue: 10,
        color: '#ff3344',
        glowColor: '#ff0022',
        enemyType: 'chaser',
      };

    case 'shooter':
      return {
        ...base,
        radius: 14,
        health: Math.round(50 * scaleHP),
        maxHealth: Math.round(50 * scaleHP),
        speed: 60,
        damage: Math.round(8 * scaleDmg),
        xpValue: 20,
        color: '#ff8800',
        glowColor: '#ff6600',
        enemyType: 'shooter',
        shootCooldown: 2.0,
        lastShootTime: 0,
      };

    case 'swarm':
      return {
        ...base,
        radius: 8,
        health: Math.round(15 * scaleHP),
        maxHealth: Math.round(15 * scaleHP),
        speed: 150,
        damage: Math.round(5 * scaleDmg),
        xpValue: 5,
        color: '#ff44aa',
        glowColor: '#ff0088',
        enemyType: 'swarm',
      };

    case 'tank':
      return {
        ...base,
        radius: 22,
        health: Math.round(200 * scaleHP),
        maxHealth: Math.round(200 * scaleHP),
        speed: 40,
        damage: Math.round(25 * scaleDmg),
        xpValue: 50,
        color: '#aa44ff',
        glowColor: '#8800ff',
        enemyType: 'tank',
      };

    case 'boss':
      return {
        ...base,
        radius: 40,
        health: Math.round((1000 + wave * 200) * scaleHP),
        maxHealth: Math.round((1000 + wave * 200) * scaleHP),
        speed: 30,
        damage: Math.round(40 * scaleDmg),
        xpValue: 200,
        color: '#ff0000',
        glowColor: '#ff0000',
        enemyType: 'boss',
        shootCooldown: 3.0,
        lastShootTime: 0,
      };
  }
}

// ── Spawning ────────────────────────────────────────────────────

export class EnemyManager {
  private spawnTimer: number = 0;

  spawnWave(
    wave: number,
    playerPos: Vector2,
    worldSize: number,
    currentEnemies: Enemy[]
  ): Enemy[] {
    const config = getWaveConfig(wave);
    const newEnemies: Enemy[] = [];

    // Boss on milestone waves
    if (shouldSpawnBoss(wave)) {
      const spawnPos = add(playerPos, randomOnCircle(600));
      spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
      spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));
      newEnemies.push(createEnemy('boss', spawnPos, wave));
    }

    return newEnemies;
  }

  updateSpawning(
    dt: number,
    wave: number,
    playerPos: Vector2,
    worldSize: number,
    currentEnemies: Enemy[]
  ): Enemy[] {
    const config = getWaveConfig(wave);
    const spawned: Enemy[] = [];

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && currentEnemies.length < config.maxEnemies) {
      this.spawnTimer = config.spawnRate;

      // Pick a random enemy type from the wave config
      const type =
        config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];

      // Spawn at a point off-screen around the player (400-700px away)
      const spawnDist = randomRange(400, 700);
      const spawnPos = add(playerPos, randomOnCircle(spawnDist));

      // Clamp inside world
      spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
      spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));

      spawned.push(createEnemy(type, spawnPos, wave));

      // Swarm: spawn extra in a cluster
      if (type === 'swarm') {
        for (let i = 0; i < 4; i++) {
          const offset = { x: randomRange(-30, 30), y: randomRange(-30, 30) };
          const sPos = add(spawnPos, offset);
          spawned.push(createEnemy('swarm', sPos, wave));
        }
      }
    }

    return spawned;
  }

  reset(): void {
    this.spawnTimer = 0;
  }
}

// ── AI Update ───────────────────────────────────────────────────

export function updateEnemies(
  enemies: Enemy[],
  player: Player,
  dt: number,
  gameTime: number
): Projectile[] {
  const newProjectiles: Projectile[] = [];

  for (const enemy of enemies) {
    if (!enemy.active) continue;

    const toPlayer = sub(player.pos, enemy.pos);
    const dist = distance(enemy.pos, player.pos);
    const dir = normalize(toPlayer);

    switch (enemy.enemyType) {
      case 'chaser':
        enemy.vel.x = dir.x * enemy.speed;
        enemy.vel.y = dir.y * enemy.speed;
        break;

      case 'shooter': {
        // Move to ~200px range, then strafe
        if (dist > 220) {
          enemy.vel.x = dir.x * enemy.speed;
          enemy.vel.y = dir.y * enemy.speed;
        } else if (dist < 150) {
          enemy.vel.x = -dir.x * enemy.speed * 0.5;
          enemy.vel.y = -dir.y * enemy.speed * 0.5;
        } else {
          // Strafe
          const strafeAngle =
            angle(enemy.pos, player.pos) + Math.PI / 2;
          enemy.vel.x = Math.cos(strafeAngle) * enemy.speed * 0.6;
          enemy.vel.y = Math.sin(strafeAngle) * enemy.speed * 0.6;
        }

        // Shoot at player
        if (
          enemy.lastShootTime === undefined ||
          gameTime - enemy.lastShootTime >= (enemy.shootCooldown ?? 2.0)
        ) {
          enemy.lastShootTime = gameTime;
          const a = angle(enemy.pos, player.pos);
          newProjectiles.push(createEnemyProjectile(enemy, a));
        }
        break;
      }

      case 'swarm': {
        // Zigzag toward player
        const zigzag = Math.sin(gameTime * 8 + (enemy.phaseOffset ?? 0)) * 0.6;
        const baseAngle = angle(enemy.pos, player.pos);
        const moveAngle = baseAngle + zigzag;
        enemy.vel.x = Math.cos(moveAngle) * enemy.speed;
        enemy.vel.y = Math.sin(moveAngle) * enemy.speed;
        break;
      }

      case 'tank':
        enemy.vel.x = dir.x * enemy.speed;
        enemy.vel.y = dir.y * enemy.speed;
        break;

      case 'boss': {
        enemy.vel.x = dir.x * enemy.speed;
        enemy.vel.y = dir.y * enemy.speed;

        // Shoot ring of projectiles
        if (
          enemy.lastShootTime === undefined ||
          gameTime - enemy.lastShootTime >= (enemy.shootCooldown ?? 3.0)
        ) {
          enemy.lastShootTime = gameTime;
          const projCount = 12;
          for (let i = 0; i < projCount; i++) {
            const a = (i / projCount) * Math.PI * 2;
            newProjectiles.push(createEnemyProjectile(enemy, a));
          }
        }
        break;
      }
    }

    // Apply velocity
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
  }

  return newProjectiles;
}

// ── Enemy Projectile Factory ────────────────────────────────────

let nextProjId = 100000;

function createEnemyProjectile(enemy: Enemy, a: number): Projectile {
  return {
    id: `ep_${nextProjId++}`,
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: {
      x: Math.cos(a) * 180,
      y: Math.sin(a) * 180,
    },
    radius: 4,
    health: 1,
    maxHealth: 1,
    type: 'projectile',
    color: '#ff6644',
    glowColor: '#ff4400',
    active: true,
    damage: enemy.damage * 0.5,
    piercing: 0,
    lifetime: 3,
    owner: 'enemy',
    angle: a,
  };
}
