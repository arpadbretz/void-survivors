// ============================================================
// Void Survivors — Core Type Definitions
// ============================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  health: number;
  maxHealth: number;
  type: string;
  color: string;
  glowColor: string;
  active: boolean;
}

export interface Player extends Entity {
  xp: number;
  level: number;
  speed: number;
  damage: number;
  abilities: Ability[];
  invincibleUntil: number;
  lastDamageTime: number;
}

export type EnemyType = 'chaser' | 'shooter' | 'swarm' | 'tank' | 'splitter' | 'boss' | 'phantom' | 'shielder';

export interface Enemy extends Entity {
  speed: number;
  damage: number;
  xpValue: number;
  enemyType: EnemyType;
  shootCooldown?: number;
  lastShootTime?: number;
  phaseOffset?: number;
  rotation?: number;
  isElite?: boolean;
  spawnTime?: number;
  phaseTimer?: number;
  phaseState?: 'visible' | 'fading_out' | 'invisible' | 'fading_in';
  bossVariant?: 'titan' | 'harbinger' | 'nexus';
  bossSpawnTimer?: number;
  bossTeleportTimer?: number;
  _spawnedEnemies?: Vector2[]; // temp buffer for harbinger-spawned enemies
  shieldAuraRadius?: number;
  isEnraged?: boolean;
}

export interface Projectile extends Entity {
  damage: number;
  piercing: number;
  lifetime: number;
  owner: 'player' | 'enemy';
  angle: number;
  aoe?: { radius: number; damageFraction: number };
  isGravityWell?: boolean;
  isChainLightning?: boolean;
  chainTargets?: Vector2[];   // chain path for lightning bolt rendering
  spawnTime?: number;          // gameTime when created (for animation timing)
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  decay: number;
  text?: string;
  isCrit?: boolean;
  active: boolean;
}

export interface XPOrb {
  pos: Vector2;
  value: number;
  radius: number;
  magnetRadius: number;
  active: boolean;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  color: string;
  cooldown: number;
  lastUsed: number;
  evolved?: boolean;
  evolvedName?: string;
  activationCount?: number;
  onUpdate: (
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    particles: ParticleSystemInterface,
    dt: number,
    gameTime: number
  ) => Projectile[];
  onAcquire?: (player: Player) => void;
}

export type SynergyBonusType = 'damage_mult' | 'cooldown_mult' | 'range_mult' | 'health_regen' | 'speed_mult' | 'xp_mult';

export interface SynergyBonus {
  type: SynergyBonusType;
  value: number;
}

export interface Synergy {
  id: string;
  name: string;
  description: string;
  requiredAbilities: string[];
  bonuses: SynergyBonus[];
  icon: string;
  color: string;
}

export interface ActiveSynergy {
  synergy: Synergy;
  activatedAt: number; // gameTime when activated
}

export interface ParticleSystemInterface {
  emit: (x: number, y: number, count: number, color: string, speed: number, life: number) => void;
  emitExplosion: (x: number, y: number, color: string, count?: number) => void;
  emitTrail: (x: number, y: number, color: string) => void;
  emitXPPickup: (x: number, y: number) => void;
  emitDamageNumber: (x: number, y: number, damage: number, comboColor?: string) => void;
  emitLevelUp: (x: number, y: number) => void;
}

export interface Hazard {
  id: string;
  pos: Vector2;
  radius: number;
  type: 'void_rift' | 'plasma_pool' | 'gravity_anomaly';
  damage: number;        // damage per second while standing in it
  active: boolean;
  spawnTime: number;
  lifetime: number;      // seconds until despawn
  pulsePhase: number;    // for animation
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  shakeX: number;
  shakeY: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  xpOrbs: XPOrb[];
  score: number;
  time: number;
  wave: number;
  paused: boolean;
  gameOver: boolean;
  upgradeChoices: Ability[];
  showUpgradeScreen: boolean;
  screenShake: number;
  camera: Camera;
  hazards: Hazard[];
  lootDrops: LootDrop[];
  enemiesKilled?: number;
  combo?: number;
  comboTimer?: number;
  comboMultiplier?: number;
  activeSynergies: ActiveSynergy[];
}

export interface LootDrop {
  id: string;
  pos: Vector2;
  type: 'health' | 'bomb' | 'magnet' | 'shield';
  active: boolean;
  spawnTime: number;
  lifetime: number; // disappears after this many seconds
}

export interface WaveConfig {
  enemyTypes: EnemyType[];
  spawnRate: number;
  maxEnemies: number;
  duration: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  mouseX: number;
  mouseY: number;
  mouseWorldX: number;
  mouseWorldY: number;
}
