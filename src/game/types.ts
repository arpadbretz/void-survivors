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

export type EnemyType = 'chaser' | 'shooter' | 'swarm' | 'tank' | 'splitter' | 'boss';

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
}

export interface Projectile extends Entity {
  damage: number;
  piercing: number;
  lifetime: number;
  owner: 'player' | 'enemy';
  angle: number;
  aoe?: { radius: number; damageFraction: number };
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

export interface ParticleSystemInterface {
  emit: (x: number, y: number, count: number, color: string, speed: number, life: number) => void;
  emitExplosion: (x: number, y: number, color: string, count?: number) => void;
  emitTrail: (x: number, y: number, color: string) => void;
  emitXPPickup: (x: number, y: number) => void;
  emitDamageNumber: (x: number, y: number, damage: number) => void;
  emitLevelUp: (x: number, y: number) => void;
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
  enemiesKilled?: number;
  combo?: number;
  comboTimer?: number;
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
