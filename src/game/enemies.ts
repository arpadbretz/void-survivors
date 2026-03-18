// ============================================================
// Void Survivors — Enemy Spawning and AI
// ============================================================

import {
  Enemy,
  EnemyType,
  EliteModifier,
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
import {
  DifficultyConfig,
  getWaveScaling,
  getDifficultyConfig,
  type Difficulty,
} from './difficulty';

let nextEnemyId = 0;

function genId(): string {
  return `e_${nextEnemyId++}`;
}

// ── Wave Configurations ─────────────────────────────────────────

const WAVE_CONFIGS: WaveConfig[] = [
  { enemyTypes: ['chaser'], spawnRate: 2.5, maxEnemies: 8, duration: 30 },
  { enemyTypes: ['chaser', 'swarm'], spawnRate: 2.0, maxEnemies: 15, duration: 30 },
  { enemyTypes: ['chaser', 'swarm', 'shooter', 'splitter'], spawnRate: 1.5, maxEnemies: 22, duration: 30 },
  { enemyTypes: ['chaser', 'shooter', 'tank', 'splitter', 'phantom', 'shielder'], spawnRate: 1.2, maxEnemies: 30, duration: 30 },
  { enemyTypes: ['chaser', 'swarm', 'shooter', 'tank', 'splitter', 'phantom', 'shielder'], spawnRate: 1.0, maxEnemies: 40, duration: 30 },
];

export function getWaveConfig(wave: number, difficultyConfig?: DifficultyConfig): WaveConfig {
  const idx = Math.min(wave - 1, WAVE_CONFIGS.length - 1);
  const base = WAVE_CONFIGS[idx];

  // Continuously scale after defined waves
  const extraScale = Math.max(0, wave - WAVE_CONFIGS.length);

  // Apply endless wave scaling for spawn rate
  const waveScaling = getWaveScaling(wave);
  const spawnRateMult = difficultyConfig?.spawnRateMult ?? 1;

  return {
    enemyTypes: base.enemyTypes,
    spawnRate: Math.max(0.2, (base.spawnRate - extraScale * 0.05) / (waveScaling.spawnRateScale * spawnRateMult)),
    maxEnemies: Math.floor((base.maxEnemies + extraScale * 5) * waveScaling.spawnRateScale),
    duration: base.duration,
  };
}

export function shouldSpawnBoss(wave: number): boolean {
  return wave % 5 === 0;
}

const MINI_BOSS_WAVES = new Set([3, 6, 8, 11, 13, 16, 18]);

export function shouldSpawnMiniBoss(wave: number): boolean {
  return MINI_BOSS_WAVES.has(wave);
}

// ── Boss Variant Selection ──────────────────────────────────────

function getBossVariant(wave: number): 'titan' | 'harbinger' | 'nexus' {
  if (wave >= 15) return 'nexus';
  if (wave >= 10) return 'harbinger';
  return 'titan';
}

// ── Enemy Factory ───────────────────────────────────────────────

export function createEnemy(
  type: EnemyType,
  pos: Vector2,
  wave: number,
  difficultyConfig?: DifficultyConfig
): Enemy {
  const waveScaling = getWaveScaling(wave);
  const baseScaleHP = 1 + (wave - 1) * 0.1;
  const baseScaleDmg = 1 + (wave - 1) * 0.1;

  const isBoss = type === 'boss';
  const hpMult = isBoss
    ? (difficultyConfig?.bossHealthMult ?? 1) * waveScaling.bossHpScale
    : (difficultyConfig?.enemyHealthMult ?? 1) * waveScaling.hpScale;
  const dmgMult = difficultyConfig?.enemyDamageMult ?? 1;
  const spdMult = (difficultyConfig?.enemySpeedMult ?? 1) * waveScaling.speedScale;

  const scaleHP = baseScaleHP * hpMult;
  const scaleDmg = baseScaleDmg * dmgMult;

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
    spawnTime: 0,
  };

  switch (type) {
    case 'chaser':
      return {
        ...base,
        radius: 12,
        health: Math.round(30 * scaleHP),
        maxHealth: Math.round(30 * scaleHP),
        speed: Math.round(120 * spdMult),
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
        speed: Math.round(60 * spdMult),
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
        speed: Math.round(150 * spdMult),
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
        speed: Math.round(40 * spdMult),
        damage: Math.round(25 * scaleDmg),
        xpValue: 50,
        color: '#aa44ff',
        glowColor: '#8800ff',
        enemyType: 'tank',
      };

    case 'splitter':
      return {
        ...base,
        radius: 18,
        health: Math.round(60 * scaleHP),
        maxHealth: Math.round(60 * scaleHP),
        speed: Math.round(80 * spdMult),
        damage: Math.round(12 * scaleDmg),
        xpValue: 25,
        color: '#22dd88',
        glowColor: '#00cc66',
        enemyType: 'splitter',
      };

    case 'phantom':
      return {
        ...base,
        radius: 14,
        health: Math.round(40 * scaleHP),
        maxHealth: Math.round(40 * scaleHP),
        speed: Math.round(100 * spdMult),
        damage: Math.round(12 * scaleDmg),
        xpValue: 20,
        color: '#aa44ff',
        glowColor: '#7700cc',
        enemyType: 'phantom',
        phaseTimer: Math.random() * 3,
        phaseState: 'visible' as const,
      };

    case 'shielder':
      return {
        ...base,
        radius: 12,
        health: Math.round(40 * scaleHP),
        maxHealth: Math.round(40 * scaleHP),
        speed: Math.round(80 * spdMult),
        damage: Math.round(3 * scaleDmg),
        xpValue: 15,
        color: '#44aaff',
        glowColor: '#2288dd',
        enemyType: 'shielder',
        shieldAuraRadius: 120,
      };

    case 'miniboss': {
      const mbHp = 200 + (wave - 1) * 50;
      const enemy: Enemy = {
        ...base,
        radius: 20,
        health: Math.round(mbHp * hpMult),
        maxHealth: Math.round(mbHp * hpMult),
        speed: Math.round(100 * spdMult),
        damage: Math.round(8 * scaleDmg),
        xpValue: 50,
        color: '#ff8800',
        glowColor: '#cc6600',
        enemyType: 'miniboss',
      };
      // Mini-bosses are always elite
      makeElite(enemy);
      return enemy;
    }

    case 'boss': {
      const variant = getBossVariant(wave);
      switch (variant) {
        case 'titan':
          return {
            ...base,
            radius: 40,
            health: Math.round(800 * scaleHP),
            maxHealth: Math.round(800 * scaleHP),
            speed: Math.round(40 * spdMult),
            damage: Math.round(25 * scaleDmg),
            xpValue: 200,
            color: '#ff4444',
            glowColor: '#cc0000',
            enemyType: 'boss',
            bossVariant: 'titan' as const,
          };
        case 'harbinger':
          return {
            ...base,
            radius: 30,
            health: Math.round(600 * scaleHP),
            maxHealth: Math.round(600 * scaleHP),
            speed: Math.round(70 * spdMult),
            damage: Math.round(15 * scaleDmg),
            xpValue: 250,
            color: '#ff8800',
            glowColor: '#cc6600',
            enemyType: 'boss',
            bossVariant: 'harbinger' as const,
            bossSpawnTimer: 0,
          };
        case 'nexus':
          return {
            ...base,
            radius: 35,
            health: Math.round(1200 * scaleHP),
            maxHealth: Math.round(1200 * scaleHP),
            speed: 0,
            damage: Math.round(15 * scaleDmg),
            xpValue: 300,
            color: '#cc00ff',
            glowColor: '#9900cc',
            enemyType: 'boss',
            bossVariant: 'nexus' as const,
            shootCooldown: 2.0,
            lastShootTime: 0,
            bossTeleportTimer: 0,
          };
      }
    }
  }
}

export function createSplitEnemies(pos: Vector2, wave: number, difficultyConfig?: DifficultyConfig): Enemy[] {
  const results: Enemy[] = [];
  const waveScaling = getWaveScaling(wave);
  const hpMult = (difficultyConfig?.enemyHealthMult ?? 1) * waveScaling.hpScale;
  const dmgMult = difficultyConfig?.enemyDamageMult ?? 1;
  const spdMult = (difficultyConfig?.enemySpeedMult ?? 1) * waveScaling.speedScale;
  for (let i = 0; i < 2; i++) {
    const offset = { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 30 };
    const splitPos = { x: pos.x + offset.x, y: pos.y + offset.y };
    const scaleHP = (1 + (wave - 1) * 0.1) * hpMult;
    const scaleDmg = (1 + (wave - 1) * 0.1) * dmgMult;
    results.push({
      id: genId(),
      pos: splitPos,
      vel: vec2((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100),
      radius: 10,
      health: Math.round(20 * scaleHP),
      maxHealth: Math.round(20 * scaleHP),
      speed: Math.round(140 * spdMult),
      damage: Math.round(6 * scaleDmg),
      xpValue: 8,
      color: '#22dd88',
      glowColor: '#00cc66',
      enemyType: 'swarm', // mini splitters behave like swarm
      active: true,
      type: 'enemy',
      rotation: 0,
      phaseOffset: Math.random() * Math.PI * 2,
      shootCooldown: 0,
      lastShootTime: 0,
    });
  }
  return results;
}

// ── Elite Modifier ──────────────────────────────────────────────

const ELITE_MODIFIERS: EliteModifier[] = ['swift', 'regenerating', 'splitting', 'vampiric', 'armored'];

export function makeElite(enemy: Enemy): Enemy {
  enemy.isElite = true;
  enemy.health = Math.round(enemy.health * 2.5);
  enemy.maxHealth = Math.round(enemy.maxHealth * 2.5);
  enemy.damage = Math.round(enemy.damage * 1.5);
  enemy.speed = Math.round(enemy.speed * 1.2);
  enemy.xpValue = Math.round(enemy.xpValue * 3);
  enemy.color = '#ffd700';
  enemy.glowColor = '#ffaa00';

  // Assign a random elite modifier
  const modifier = ELITE_MODIFIERS[Math.floor(Math.random() * ELITE_MODIFIERS.length)];
  enemy.eliteModifier = modifier;

  // Apply swift bonus at spawn time (speed + radius baked in)
  if (modifier === 'swift') {
    enemy.speed = Math.round(enemy.speed * 1.8);
    enemy.radius = Math.max(6, enemy.radius - 2);
  }

  return enemy;
}

/** Create 2 smaller non-elite copies for the 'splitting' elite modifier */
export function createEliteSplitCopies(parent: Enemy, wave: number, difficultyConfig?: DifficultyConfig): Enemy[] {
  const results: Enemy[] = [];
  for (let i = 0; i < 2; i++) {
    const offset = { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 30 };
    const splitPos = { x: parent.pos.x + offset.x, y: parent.pos.y + offset.y };
    const copy = createEnemy(parent.enemyType, splitPos, wave, difficultyConfig);
    // Half HP and half XP, NOT elite
    copy.health = Math.round(parent.maxHealth * 0.5 / 2.5); // undo the 2.5x elite HP boost, then halve
    copy.maxHealth = copy.health;
    copy.xpValue = Math.round(parent.xpValue * 0.5 / 3); // undo the 3x elite XP boost, then halve
    copy.radius = Math.max(6, Math.round(parent.radius * 0.7));
    copy.vel = vec2((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
    results.push(copy);
  }
  return results;
}

// ── Spawning ────────────────────────────────────────────────────

export class EnemyManager {
  private spawnTimer: number = 0;
  difficultyConfig: DifficultyConfig | undefined;

  // Wave event overrides
  private swarmRushActive: boolean = false;
  private swarmRushTimer: number = 0;
  private forceEnemyType: EnemyType | null = null;
  waveSpeedMultiplier: number = 1;

  setDifficultyConfig(config: DifficultyConfig): void {
    this.difficultyConfig = config;
  }

  spawnWave(
    wave: number,
    playerPos: Vector2,
    worldSize: number,
    currentEnemies: Enemy[]
  ): Enemy[] {
    const newEnemies: Enemy[] = [];

    // Boss on milestone waves
    if (shouldSpawnBoss(wave)) {
      const waveScaling = getWaveScaling(wave);
      const bossCount = waveScaling.bossCount;
      for (let b = 0; b < bossCount; b++) {
        const spawnPos = add(playerPos, randomOnCircle(600));
        spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
        spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));
        newEnemies.push(createEnemy('boss', spawnPos, wave, this.difficultyConfig));
      }
    }

    // Mini-boss on milestone waves (between boss waves)
    if (shouldSpawnMiniBoss(wave)) {
      const spawnPos = add(playerPos, randomOnCircle(600));
      spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
      spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));
      newEnemies.push(createEnemy('miniboss', spawnPos, wave, this.difficultyConfig));
    }

    return newEnemies;
  }

  /** Spawn tanks immediately for Tank Parade event */
  spawnTankParade(
    wave: number,
    playerPos: Vector2,
    worldSize: number
  ): Enemy[] {
    const tanks: Enemy[] = [];
    const waveScaling = getWaveScaling(wave);
    for (let i = 0; i < 3; i++) {
      const spawnPos = add(playerPos, randomOnCircle(randomRange(400, 700)));
      spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
      spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));
      const tank = createEnemy('tank', spawnPos, wave, this.difficultyConfig);
      // Roll elite chance for tanks too
      const baseEliteChance = Math.min(25, wave * 1.5) / 100;
      const eliteChance = Math.max(baseEliteChance * (this.difficultyConfig?.eliteChanceMult ?? 1), waveScaling.minEliteChance);
      if (Math.random() < eliteChance) {
        makeElite(tank);
      }
      tanks.push(tank);
    }
    return tanks;
  }

  /** Activate Swarm Rush: triple spawn rate, only swarm for 10s */
  activateSwarmRush(): void {
    this.swarmRushActive = true;
    this.swarmRushTimer = 10;
    this.forceEnemyType = 'swarm';
  }

  /** Set speed multiplier for Speed Frenzy */
  setWaveSpeedMultiplier(multiplier: number): void {
    this.waveSpeedMultiplier = multiplier;
  }

  updateSpawning(
    dt: number,
    wave: number,
    playerPos: Vector2,
    worldSize: number,
    currentEnemies: Enemy[]
  ): Enemy[] {
    const config = getWaveConfig(wave, this.difficultyConfig);
    const spawned: Enemy[] = [];
    const waveScaling = getWaveScaling(wave);

    // Update swarm rush timer
    if (this.swarmRushActive) {
      this.swarmRushTimer -= dt;
      if (this.swarmRushTimer <= 0) {
        this.swarmRushActive = false;
        this.forceEnemyType = null;
      }
    }

    // Effective spawn rate (tripled during Swarm Rush)
    const effectiveSpawnRate = this.swarmRushActive
      ? config.spawnRate / 3
      : config.spawnRate;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && currentEnemies.length < config.maxEnemies) {
      this.spawnTimer = effectiveSpawnRate;

      // Pick enemy type (forced during wave events, or random)
      const type = this.forceEnemyType ??
        config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];

      // Spawn at a point off-screen around the player (400-700px away)
      const spawnDist = randomRange(400, 700);
      const spawnPos = add(playerPos, randomOnCircle(spawnDist));

      // Clamp inside world
      spawnPos.x = Math.max(50, Math.min(worldSize - 50, spawnPos.x));
      spawnPos.y = Math.max(50, Math.min(worldSize - 50, spawnPos.y));

      const enemy = createEnemy(type, spawnPos, wave, this.difficultyConfig);

      // Roll elite chance: wave * 1.5%, capped at 25%, with difficulty and wave scaling
      const baseEliteChance = Math.min(25, wave * 1.5) / 100;
      const eliteChance = Math.max(baseEliteChance * (this.difficultyConfig?.eliteChanceMult ?? 1), waveScaling.minEliteChance);
      if (Math.random() < eliteChance) {
        makeElite(enemy);
      }

      spawned.push(enemy);

      // Swarm: spawn extra in a cluster
      if (type === 'swarm') {
        for (let i = 0; i < 4; i++) {
          const offset = { x: randomRange(-30, 30), y: randomRange(-30, 30) };
          const sPos = add(spawnPos, offset);
          const swarmEnemy = createEnemy('swarm', sPos, wave, this.difficultyConfig);
          if (Math.random() < eliteChance) {
            makeElite(swarmEnemy);
          }
          spawned.push(swarmEnemy);
        }
      }
    }

    return spawned;
  }

  reset(): void {
    this.spawnTimer = 0;
    this.swarmRushActive = false;
    this.swarmRushTimer = 0;
    this.forceEnemyType = null;
    this.waveSpeedMultiplier = 1;
  }
}

// ── AI Update ───────────────────────────────────────────────────

export function updateEnemies(
  enemies: Enemy[],
  player: Player,
  dt: number,
  gameTime: number,
  speedMultiplier: number = 1
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

      case 'splitter': {
        // Approach player with slight orbiting
        const orbitAngle = angle(enemy.pos, player.pos) + Math.sin(gameTime * 2 + (enemy.phaseOffset ?? 0)) * 0.4;
        enemy.vel.x = Math.cos(orbitAngle) * enemy.speed;
        enemy.vel.y = Math.sin(orbitAngle) * enemy.speed;
        break;
      }

      case 'phantom': {
        // Always move toward player
        enemy.vel.x = dir.x * enemy.speed;
        enemy.vel.y = dir.y * enemy.speed;

        // Update phase timer
        if (enemy.phaseTimer === undefined) enemy.phaseTimer = 0;
        enemy.phaseTimer += dt;
        if (enemy.phaseTimer >= 4) enemy.phaseTimer -= 4;

        // Determine phase state from timer
        const pt = enemy.phaseTimer;
        if (pt < 2) {
          enemy.phaseState = 'visible';
        } else if (pt < 2.5) {
          enemy.phaseState = 'fading_out';
        } else if (pt < 3.5) {
          enemy.phaseState = 'invisible';
        } else {
          enemy.phaseState = 'fading_in';
        }
        break;
      }

      case 'shielder': {
        // Stay at medium range (150-250px) from the player
        const idealDist = 200;
        if (dist > 250) {
          // Too far, approach
          enemy.vel.x = dir.x * enemy.speed;
          enemy.vel.y = dir.y * enemy.speed;
        } else if (dist < 150) {
          // Too close, retreat
          enemy.vel.x = -dir.x * enemy.speed * 0.7;
          enemy.vel.y = -dir.y * enemy.speed * 0.7;
        } else {
          // In sweet spot, strafe slowly to stay near other enemies
          const strafeAngle = angle(enemy.pos, player.pos) + Math.PI / 2;
          enemy.vel.x = Math.cos(strafeAngle) * enemy.speed * 0.4;
          enemy.vel.y = Math.sin(strafeAngle) * enemy.speed * 0.4;
        }
        break;
      }

      case 'miniboss':
        // Mini-boss: aggressive chase toward player
        enemy.vel.x = dir.x * enemy.speed;
        enemy.vel.y = dir.y * enemy.speed;
        break;

      case 'boss': {
        const variant = enemy.bossVariant ?? 'titan';

        if (variant === 'titan') {
          // Titan: slow, moves toward player, no shooting
          enemy.vel.x = dir.x * enemy.speed;
          enemy.vel.y = dir.y * enemy.speed;
        } else if (variant === 'harbinger') {
          // Harbinger: keeps distance (200-300px from player), spawns chasers
          if (dist < 200) {
            // Too close, retreat
            enemy.vel.x = -dir.x * enemy.speed;
            enemy.vel.y = -dir.y * enemy.speed;
          } else if (dist > 300) {
            // Too far, approach
            enemy.vel.x = dir.x * enemy.speed;
            enemy.vel.y = dir.y * enemy.speed;
          } else {
            // In sweet spot, strafe
            const strafeAngle = angle(enemy.pos, player.pos) + Math.PI / 2;
            enemy.vel.x = Math.cos(strafeAngle) * enemy.speed * 0.6;
            enemy.vel.y = Math.sin(strafeAngle) * enemy.speed * 0.6;
          }

          // Spawn 2 chasers every 3 seconds
          if (enemy.bossSpawnTimer === undefined) enemy.bossSpawnTimer = 0;
          enemy.bossSpawnTimer += dt;
          if (enemy.bossSpawnTimer >= 3.0) {
            enemy.bossSpawnTimer -= 3.0;
            for (let i = 0; i < 2; i++) {
              const spawnAngle = Math.random() * Math.PI * 2;
              const spawnDist = enemy.radius + 20;
              const spawnPos = {
                x: enemy.pos.x + Math.cos(spawnAngle) * spawnDist,
                y: enemy.pos.y + Math.sin(spawnAngle) * spawnDist,
              };
              // Push spawned chasers into newProjectiles using a marker (handled by engine)
              // We can't directly push enemies here, so we store them on the enemy
              if (!enemy._spawnedEnemies) enemy._spawnedEnemies = [];
              enemy._spawnedEnemies.push(spawnPos);
            }
          }
        } else if (variant === 'nexus') {
          // Nexus: stationary, fires rings of projectiles, teleports
          enemy.vel.x = 0;
          enemy.vel.y = 0;

          // Fire ring of 12 projectiles every 2 seconds
          if (
            enemy.lastShootTime === undefined ||
            gameTime - enemy.lastShootTime >= (enemy.shootCooldown ?? 2.0)
          ) {
            enemy.lastShootTime = gameTime;
            const projCount = 12;
            for (let i = 0; i < projCount; i++) {
              const a = (i / projCount) * Math.PI * 2;
              newProjectiles.push(createEnemyProjectile(enemy, a));
            }
          }

          // Teleport every 8 seconds
          if (enemy.bossTeleportTimer === undefined) enemy.bossTeleportTimer = 0;
          enemy.bossTeleportTimer += dt;
          if (enemy.bossTeleportTimer >= 8.0) {
            enemy.bossTeleportTimer -= 8.0;
            // Teleport to a random position around the player (200-400px away)
            const teleAngle = Math.random() * Math.PI * 2;
            const teleDist = 200 + Math.random() * 200;
            enemy.pos.x = player.pos.x + Math.cos(teleAngle) * teleDist;
            enemy.pos.y = player.pos.y + Math.sin(teleAngle) * teleDist;
          }
        }
        break;
      }
    }

    // Apply velocity (with wave speed multiplier)
    enemy.pos.x += enemy.vel.x * dt * speedMultiplier;
    enemy.pos.y += enemy.vel.y * dt * speedMultiplier;
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
