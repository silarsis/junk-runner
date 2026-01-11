import { Item, Rarity, ItemCategory } from '@/types/game';

interface ItemTemplate {
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  sizeW: number;
  sizeH: number;
  weight: number;
  baseValue: number;
  icon: string;
  batteryCapacity?: number;
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // Scrap
  { name: 'Rusty Bolt', category: 'scrap', rarity: 'common', sizeW: 1, sizeH: 1, weight: 1, baseValue: 5, icon: '🔩' },
  { name: 'Metal Shard', category: 'scrap', rarity: 'common', sizeW: 1, sizeH: 2, weight: 2, baseValue: 8, icon: '🗡️' },
  { name: 'Copper Wire', category: 'scrap', rarity: 'common', sizeW: 2, sizeH: 1, weight: 1, baseValue: 12, icon: '〰️' },
  { name: 'Steel Plate', category: 'scrap', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 5, baseValue: 25, icon: '🛡️' },
  { name: 'Titanium Scrap', category: 'scrap', rarity: 'rare', sizeW: 2, sizeH: 1, weight: 3, baseValue: 50, icon: '⬜' },
  
  // Components
  { name: 'Broken Gear', category: 'component', rarity: 'common', sizeW: 1, sizeH: 1, weight: 2, baseValue: 15, icon: '⚙️' },
  { name: 'Circuit Board', category: 'component', rarity: 'uncommon', sizeW: 2, sizeH: 1, weight: 1, baseValue: 35, icon: '📟' },
  { name: 'Power Cell', category: 'component', rarity: 'uncommon', sizeW: 1, sizeH: 2, weight: 3, baseValue: 40, icon: '🔋' },
  { name: 'Motor Unit', category: 'component', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 6, baseValue: 80, icon: '🔧' },
  { name: 'Quantum Chip', category: 'component', rarity: 'epic', sizeW: 1, sizeH: 1, weight: 1, baseValue: 200, icon: '💠' },
  { name: 'Fusion Core', category: 'component', rarity: 'legendary', sizeW: 2, sizeH: 2, weight: 4, baseValue: 500, icon: '⚡' },
  
  // Batteries - findable in junkyard
  { name: 'Salvaged Battery', category: 'battery', rarity: 'uncommon', sizeW: 1, sizeH: 2, weight: 3, baseValue: 60, icon: '🔋', batteryCapacity: 25 },
  { name: 'Industrial Battery', category: 'battery', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 5, baseValue: 120, icon: '🔋', batteryCapacity: 35 },
  { name: 'High-Capacity Cell', category: 'battery', rarity: 'epic', sizeW: 2, sizeH: 2, weight: 4, baseValue: 250, icon: '⚡', batteryCapacity: 50 },
  { name: 'Quantum Battery', category: 'battery', rarity: 'legendary', sizeW: 2, sizeH: 1, weight: 2, baseValue: 500, icon: '💎', batteryCapacity: 75 },
  
  // Modules
  { name: 'Carry Pod', category: 'module', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 4, baseValue: 100, icon: '📦' },
  { name: 'Scanner Array', category: 'module', rarity: 'rare', sizeW: 2, sizeH: 1, weight: 2, baseValue: 150, icon: '📡' },
  { name: 'Cleaning Assist', category: 'module', rarity: 'uncommon', sizeW: 1, sizeH: 2, weight: 3, baseValue: 120, icon: '🧹' },
  
  // Junk
  { name: 'Crushed Can', category: 'junk', rarity: 'common', sizeW: 1, sizeH: 1, weight: 1, baseValue: 2, icon: '🥫' },
  { name: 'Broken Glass', category: 'junk', rarity: 'common', sizeW: 1, sizeH: 1, weight: 1, baseValue: 1, icon: '🔷' },
  { name: 'Old Newspaper', category: 'junk', rarity: 'common', sizeW: 2, sizeH: 1, weight: 1, baseValue: 1, icon: '📰' },
  { name: 'Plastic Debris', category: 'junk', rarity: 'common', sizeW: 1, sizeH: 2, weight: 1, baseValue: 3, icon: '🧱' },
  { name: 'Vintage Radio', category: 'junk', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 5, baseValue: 20, icon: '📻' },
  { name: 'Old Camera', category: 'junk', rarity: 'rare', sizeW: 2, sizeH: 1, weight: 2, baseValue: 45, icon: '📷' },
];

// Batteries available for purchase at base
export const SHOP_BATTERIES: ItemTemplate[] = [
  { name: 'Basic Battery Pack', category: 'battery', rarity: 'common', sizeW: 1, sizeH: 2, weight: 3, baseValue: 80, icon: '🔋', batteryCapacity: 25 },
  { name: 'Enhanced Battery', category: 'battery', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 4, baseValue: 150, icon: '🔋', batteryCapacity: 35 },
  { name: 'Pro Battery Module', category: 'battery', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 4, baseValue: 300, icon: '⚡', batteryCapacity: 50 },
];

// Wall obstacle icons - random impassable debris
export const WALL_ICONS = ['🪨', '🧱', '🚗', '🛢️', '📦', '🗑️', '🚧', '⬛'];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1,
};

export const RARITY_VALUE_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 8,
};

export const CONDITION_VALUE_MULTIPLIER: Record<string, number> = {
  pristine: 1.2, // 80-100
  good: 1.0,     // 60-79
  fair: 0.7,     // 40-59
  poor: 0.4,     // 20-39
  broken: 0.2,   // 0-19
};

export const DIRTY_PENALTY = 0.3;

export function getConditionLabel(condition: number): string {
  if (condition >= 80) return 'pristine';
  if (condition >= 60) return 'good';
  if (condition >= 40) return 'fair';
  if (condition >= 20) return 'poor';
  return 'broken';
}

export function getCleaningDuration(item: Item, speedMultiplier: number = 1): number {
  const size = item.sizeW * item.sizeH;
  const rarityMultiplier: Record<Rarity, number> = {
    common: 1,
    uncommon: 2,
    rare: 4,
    epic: 6,
    legendary: 10,
  };
  
  // Base time in milliseconds (2 minutes for 1x1 common)
  const baseTime = 2 * 60 * 1000;
  return Math.floor((baseTime * size * rarityMultiplier[item.rarity]) / speedMultiplier);
}
