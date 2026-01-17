import { ItemCategory, Rarity } from '@/types/game';

export interface JunkyardType {
  id: string;
  name: string;
  icon: string;
  description: string;
  // Loot weight modifiers (1.0 = normal, 2.0 = double chance, 0.5 = half chance)
  categoryWeights: Partial<Record<ItemCategory, number>>;
  rarityWeights: Partial<Record<Rarity, number>>;
  // Terrain modifiers
  hazardDensity: number;
  wallDensity: number;
}

export const JUNKYARD_TYPES: JunkyardType[] = [
  {
    id: 'standard',
    name: 'Standard Scrapyard',
    icon: '🏗️',
    description: 'A balanced junkyard with average loot distribution.',
    categoryWeights: {},
    rarityWeights: {},
    hazardDensity: 0.15,
    wallDensity: 0.12,
  },
  {
    id: 'electronics',
    name: 'Electronics Dump',
    icon: '📟',
    description: 'Old tech graveyard. Rich in components and circuit boards.',
    categoryWeights: {
      component: 2.5,
      battery: 1.8,
      module: 1.5,
      scrap: 0.6,
      junk: 0.5,
    },
    rarityWeights: {
      uncommon: 1.3,
      rare: 1.2,
    },
    hazardDensity: 0.2,
    wallDensity: 0.1,
  },
  {
    id: 'industrial',
    name: 'Industrial Wasteland',
    icon: '🏭',
    description: 'Heavy machinery remnants. Great for scrap and mobility parts.',
    categoryWeights: {
      scrap: 2.0,
      mobility: 2.2,
      component: 1.3,
      storage: 1.4,
      junk: 0.7,
    },
    rarityWeights: {
      common: 1.2,
      uncommon: 1.1,
    },
    hazardDensity: 0.18,
    wallDensity: 0.18,
  },
  {
    id: 'military',
    name: 'Military Surplus',
    icon: '🎖️',
    description: 'Decommissioned equipment. Higher rarity finds but more hazards.',
    categoryWeights: {
      battery: 1.8,
      module: 2.0,
      mobility: 1.5,
      component: 1.4,
      scrap: 0.5,
      junk: 0.3,
    },
    rarityWeights: {
      rare: 1.8,
      epic: 2.0,
      legendary: 1.5,
      common: 0.6,
    },
    hazardDensity: 0.25,
    wallDensity: 0.2,
  },
  {
    id: 'residential',
    name: 'Suburban Ruins',
    icon: '🏚️',
    description: 'Old neighborhoods. Lots of junk but occasional storage finds.',
    categoryWeights: {
      junk: 2.5,
      storage: 1.8,
      scrap: 1.3,
      component: 0.6,
      battery: 0.7,
    },
    rarityWeights: {
      common: 1.4,
      uncommon: 1.1,
    },
    hazardDensity: 0.1,
    wallDensity: 0.15,
  },
  {
    id: 'powerplant',
    name: 'Power Station',
    icon: '⚡',
    description: 'Abandoned power facility. Batteries and power cells galore.',
    categoryWeights: {
      battery: 3.0,
      component: 1.8,
      module: 1.5,
      scrap: 0.8,
      junk: 0.4,
    },
    rarityWeights: {
      uncommon: 1.4,
      rare: 1.3,
      epic: 1.2,
    },
    hazardDensity: 0.3,
    wallDensity: 0.12,
  },
];

// Get junkyard type from seed
export function getJunkyardTypeFromSeed(seed: number): JunkyardType {
  const index = Math.abs(seed) % JUNKYARD_TYPES.length;
  return JUNKYARD_TYPES[index];
}

// Category display info
export const CATEGORY_DISPLAY: Record<ItemCategory, { name: string; icon: string }> = {
  scrap: { name: 'Scrap', icon: '🔩' },
  component: { name: 'Components', icon: '⚙️' },
  battery: { name: 'Batteries', icon: '🔋' },
  storage: { name: 'Storage', icon: '📦' },
  mobility: { name: 'Mobility', icon: '🛞' },
  module: { name: 'Modules', icon: '📡' },
  junk: { name: 'Junk', icon: '🥫' },
  consumable: { name: 'Consumables', icon: '💊' },
  launcher: { name: 'Launchers', icon: '🎯' },
};
