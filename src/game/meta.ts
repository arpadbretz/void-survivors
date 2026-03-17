// ============================================================
// Void Survivors — Meta-Progression System
// ============================================================

const META_KEY = 'void-survivors-meta';

export interface MetaProgression {
  voidEssence: number;
  totalEssenceEarned: number;
  upgrades: {
    maxHealthBonus: number;  // 0-10
    damageBonus: number;     // 0-10
    speedBonus: number;      // 0-10
    armorBonus: number;      // 0-10
    xpBonus: number;         // 0-10
  };
}

export interface MetaUpgradeDefinition {
  id: keyof MetaProgression['upgrades'];
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  costs: number[];  // cost per level
  effectPerLevel: string;  // display string like "+5 HP"
}

const DEFAULT_META: MetaProgression = {
  voidEssence: 0,
  totalEssenceEarned: 0,
  upgrades: {
    maxHealthBonus: 0,
    damageBonus: 0,
    speedBonus: 0,
    armorBonus: 0,
    xpBonus: 0,
  },
};

export function loadMeta(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META, upgrades: { ...DEFAULT_META.upgrades } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_META,
      ...parsed,
      upgrades: { ...DEFAULT_META.upgrades, ...(parsed.upgrades || {}) },
    };
  } catch {
    return { ...DEFAULT_META, upgrades: { ...DEFAULT_META.upgrades } };
  }
}

export function saveMeta(meta: MetaProgression): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function earnEssence(
  meta: MetaProgression,
  score: number,
  kills: number,
  wave: number
): { updated: MetaProgression; earned: number } {
  const earned = Math.floor(score * 0.1 + kills * 2 + wave * 10);
  const updated: MetaProgression = {
    ...meta,
    voidEssence: meta.voidEssence + earned,
    totalEssenceEarned: meta.totalEssenceEarned + earned,
    upgrades: { ...meta.upgrades },
  };
  return { updated, earned };
}

export function purchaseUpgrade(
  meta: MetaProgression,
  upgradeId: string
): MetaProgression | null {
  const definitions = getUpgradeDefinitions();
  const def = definitions.find((d) => d.id === upgradeId);
  if (!def) return null;

  const currentLevel = meta.upgrades[def.id];
  if (currentLevel >= def.maxLevel) return null;

  const cost = def.costs[currentLevel];
  if (meta.voidEssence < cost) return null;

  return {
    ...meta,
    voidEssence: meta.voidEssence - cost,
    upgrades: {
      ...meta.upgrades,
      [def.id]: currentLevel + 1,
    },
  };
}

export function getUpgradeDefinitions(): MetaUpgradeDefinition[] {
  return [
    {
      id: 'maxHealthBonus',
      name: 'Void Vitality',
      description: 'Increase maximum health permanently.',
      icon: '💚',
      maxLevel: 10,
      costs: [50, 100, 175, 275, 400, 550, 725, 925, 1150, 1400],
      effectPerLevel: '+5 HP',
    },
    {
      id: 'damageBonus',
      name: 'Void Strike',
      description: 'Increase all damage dealt permanently.',
      icon: '⚔️',
      maxLevel: 10,
      costs: [75, 150, 250, 375, 525, 700, 900, 1125, 1375, 1650],
      effectPerLevel: '+2% Damage',
    },
    {
      id: 'speedBonus',
      name: 'Void Swiftness',
      description: 'Increase movement speed permanently.',
      icon: '💨',
      maxLevel: 10,
      costs: [60, 120, 200, 300, 420, 560, 720, 900, 1100, 1320],
      effectPerLevel: '+3% Speed',
    },
    {
      id: 'armorBonus',
      name: 'Void Shell',
      description: 'Reduce incoming damage permanently.',
      icon: '🛡️',
      maxLevel: 10,
      costs: [100, 200, 325, 475, 650, 850, 1075, 1325, 1600, 1900],
      effectPerLevel: '+1 Armor',
    },
    {
      id: 'xpBonus',
      name: 'Void Wisdom',
      description: 'Increase XP gained from all sources permanently.',
      icon: '✨',
      maxLevel: 10,
      costs: [80, 160, 265, 395, 550, 730, 935, 1165, 1420, 1700],
      effectPerLevel: '+5% XP',
    },
  ];
}

export interface MetaBonuses {
  maxHealthBonus: number;
  damageMultiplier: number;
  speedMultiplier: number;
  armorBonus: number;
  xpMultiplier: number;
}

export function getMetaBonuses(meta: MetaProgression): MetaBonuses {
  return {
    maxHealthBonus: meta.upgrades.maxHealthBonus * 5,
    damageMultiplier: 1 + meta.upgrades.damageBonus * 0.02,
    speedMultiplier: 1 + meta.upgrades.speedBonus * 0.03,
    armorBonus: meta.upgrades.armorBonus * 1,
    xpMultiplier: 1 + meta.upgrades.xpBonus * 0.05,
  };
}
