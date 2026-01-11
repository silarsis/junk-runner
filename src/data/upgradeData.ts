export interface UpgradeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  getCost: (level: number) => number;
  getValue: (level: number) => number;
}

export const UPGRADES: Record<string, UpgradeInfo> = {
  bagWidth: {
    id: 'bagWidth',
    name: 'Bag Width',
    description: 'Expand bag grid width',
    icon: '↔️',
    maxLevel: 4,
    getCost: (level) => 100 * Math.pow(2, level),
    getValue: (level) => 6 + level, // starts at 6, max 10
  },
  bagHeight: {
    id: 'bagHeight',
    name: 'Bag Height',
    description: 'Expand bag grid height',
    icon: '↕️',
    maxLevel: 4,
    getCost: (level) => 100 * Math.pow(2, level),
    getValue: (level) => 8 + level, // starts at 8, max 12
  },
  bagMaxWeight: {
    id: 'bagMaxWeight',
    name: 'Max Weight',
    description: 'Increase carrying capacity',
    icon: '⚖️',
    maxLevel: 10,
    getCost: (level) => 50 * (level + 1),
    getValue: (level) => 30 + (level * 10), // starts at 30, +10 per level
  },
  cleaningSlots: {
    id: 'cleaningSlots',
    name: 'Cleaning Slots',
    description: 'Add more cleaning stations',
    icon: '🧹',
    maxLevel: 4,
    getCost: (level) => 200 * Math.pow(2, level),
    getValue: (level) => 1 + level, // starts at 1, max 5
  },
  cleaningSpeed: {
    id: 'cleaningSpeed',
    name: 'Cleaning Speed',
    description: 'Faster cleaning time',
    icon: '⚡',
    maxLevel: 5,
    getCost: (level) => 150 * (level + 1),
    getValue: (level) => 1 + (level * 0.2), // 1.0, 1.2, 1.4, etc.
  },
  workshopTier: {
    id: 'workshopTier',
    name: 'Workshop Tier',
    description: 'Work with higher rarity items',
    icon: '🔧',
    maxLevel: 4,
    getCost: (level) => 500 * Math.pow(2, level),
    getValue: (level) => level + 1,
  },
  controlCapacity: {
    id: 'controlCapacity',
    name: 'Control Capacity',
    description: 'Deploy more helper robots',
    icon: '🤖',
    maxLevel: 3,
    getCost: (level) => 300 * Math.pow(2, level),
    getValue: (level) => 1 + level, // starts at 1, max 4
  },
};

export const HELPER_FRAMES = {
  crawler: {
    id: 'crawler' as const,
    name: 'Crawler Frame',
    carryBonus: 15,
    moduleSlots: 1,
    icon: '🐛',
    cost: 200,
    requiredComponents: ['Motor Unit', 'Steel Plate'],
  },
  scout: {
    id: 'scout' as const,
    name: 'Scout Frame',
    carryBonus: 5,
    moduleSlots: 2,
    icon: '🔭',
    cost: 300,
    requiredComponents: ['Circuit Board', 'Power Cell'],
  },
};
