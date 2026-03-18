// ============================================================
// Void Survivors — Character Definitions
// ============================================================

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  color: string;
  glowColor: string;
  icon: string; // emoji
  startingAbilityId: string;
  baseHealth: number;
  baseSpeed: number;
  baseArmor: number;
  damageMultiplier: number;
  xpMultiplier: number;
  healthRegen: number; // HP per second, 0 for none
  cooldownReduction: number; // multiplier applied to all ability cooldowns (1.0 = no change, 0.85 = 15% faster)
  unlockCondition: (stats: { totalKills: number; gamesPlayed: number }) => boolean;
  unlockDescription: string;
}

const CHARACTERS: CharacterDef[] = [
  {
    id: 'void_walker',
    name: 'Void Walker',
    description: 'A balanced survivor. The default choice.',
    color: '#00eeff',
    glowColor: '#00ddff',
    icon: '\u{1F4A0}', // diamond shape
    startingAbilityId: 'radial_shot',
    baseHealth: 100,
    baseSpeed: 200,
    baseArmor: 0,
    damageMultiplier: 1.0,
    xpMultiplier: 1.0,
    healthRegen: 0,
    cooldownReduction: 1.0,
    unlockCondition: () => true,
    unlockDescription: 'Always unlocked.',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Glass cannon. Faster but fragile.',
    color: '#aa66ff',
    glowColor: '#8844dd',
    icon: '\u{1F47B}', // ghost
    startingAbilityId: 'auto_cannon',
    baseHealth: 75,
    baseSpeed: 260,
    baseArmor: 0,
    damageMultiplier: 1.15,
    xpMultiplier: 1.2,
    healthRegen: 0,
    cooldownReduction: 1.0,
    unlockCondition: (stats) => stats.totalKills >= 500,
    unlockDescription: 'Reach 500 total kills.',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'Tanky defender. Slow but tough.',
    color: '#ffdd00',
    glowColor: '#ccaa00',
    icon: '\u{1F6E1}\uFE0F', // shield
    startingAbilityId: 'orbit_shield',
    baseHealth: 150,
    baseSpeed: 160,
    baseArmor: 3,
    damageMultiplier: 1.0,
    xpMultiplier: 1.0,
    healthRegen: 0.2, // 1 HP per 5 seconds
    cooldownReduction: 1.0,
    unlockCondition: (stats) => stats.gamesPlayed >= 10,
    unlockDescription: 'Play 10 games.',
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    description: 'Ability specialist. Shorter cooldowns, fragile.',
    color: '#ff44aa',
    glowColor: '#dd2288',
    icon: '\u{2728}', // sparkles
    startingAbilityId: 'chain_lightning',
    baseHealth: 80,
    baseSpeed: 190,
    baseArmor: 0,
    damageMultiplier: 1.25,
    xpMultiplier: 0.9,
    healthRegen: 0,
    cooldownReduction: 0.85,
    unlockCondition: (stats) => stats.totalKills >= 2000 && stats.gamesPlayed >= 20,
    unlockDescription: 'Reach 2,000 kills and play 20 games.',
  },
];

export function getCharacters(): CharacterDef[] {
  return CHARACTERS;
}

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function isCharacterUnlocked(
  id: string,
  stats: { totalKills: number; gamesPlayed: number }
): boolean {
  const char = CHARACTERS.find((c) => c.id === id);
  if (!char) return false;
  return char.unlockCondition(stats);
}
