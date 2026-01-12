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
  // Category-specific
  batteryCapacity?: number;
  storageWidth?: number;
  storageHeight?: number;
  storageMaxWeight?: number;
  movementType?: 'basic' | 'diagonal' | 'jump' | 'extended';
  solarRegenRate?: number; // Turns per 1 charge regen (lower = better)
  pileRevealCount?: number; // How many items to reveal in junk piles
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
  
  // Storage Modules - findable in junkyard
  { name: 'Salvaged Cargo Pod', category: 'storage', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 4, baseValue: 80, icon: '📦', storageWidth: 5, storageHeight: 5, storageMaxWeight: 35 },
  { name: 'Industrial Container', category: 'storage', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 5, baseValue: 150, icon: '🗃️', storageWidth: 6, storageHeight: 6, storageMaxWeight: 45 },
  { name: 'Quantum Storage', category: 'storage', rarity: 'epic', sizeW: 2, sizeH: 2, weight: 3, baseValue: 300, icon: '💫', storageWidth: 8, storageHeight: 8, storageMaxWeight: 60 },
  
  // Mobility Modules - findable in junkyard
  { name: 'Salvaged Wheels', category: 'mobility', rarity: 'uncommon', sizeW: 2, sizeH: 1, weight: 4, baseValue: 70, icon: '🛞', movementType: 'basic' },
  { name: 'Racing Wheels', category: 'mobility', rarity: 'rare', sizeW: 2, sizeH: 1, weight: 3, baseValue: 160, icon: '🏎️', movementType: 'extended' },
  { name: 'All-Terrain Treads', category: 'mobility', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 6, baseValue: 140, icon: '⛓️', movementType: 'basic' },
  { name: 'Spider Legs', category: 'mobility', rarity: 'epic', sizeW: 2, sizeH: 2, weight: 5, baseValue: 280, icon: '🕷️', movementType: 'diagonal' },
  { name: 'Jump Jets', category: 'mobility', rarity: 'legendary', sizeW: 2, sizeH: 1, weight: 3, baseValue: 450, icon: '🚀', movementType: 'jump' },
  
  // General Modules
  { name: 'Cleaning Assist', category: 'module', rarity: 'uncommon', sizeW: 1, sizeH: 2, weight: 3, baseValue: 120, icon: '🧹' },
  
  // Pile Scanners - reveal items in junk piles before scavenging
  { name: 'Basic Pile Scanner', category: 'module', rarity: 'uncommon', sizeW: 1, sizeH: 1, weight: 1, baseValue: 80, icon: '🔍', pileRevealCount: 1 },
  { name: 'Enhanced Pile Scanner', category: 'module', rarity: 'rare', sizeW: 2, sizeH: 1, weight: 2, baseValue: 180, icon: '🔎', pileRevealCount: 2 },
  { name: 'Advanced Pile Scanner', category: 'module', rarity: 'epic', sizeW: 2, sizeH: 1, weight: 2, baseValue: 350, icon: '📡', pileRevealCount: 3 },
  { name: 'Quantum Pile Scanner', category: 'module', rarity: 'legendary', sizeW: 2, sizeH: 1, weight: 1, baseValue: 600, icon: '🛰️', pileRevealCount: 5 },
  
  // Solar Panels - passive battery regen in junkyard
  { name: 'Salvaged Solar Panel', category: 'module', rarity: 'uncommon', sizeW: 2, sizeH: 1, weight: 2, baseValue: 100, icon: '☀️', solarRegenRate: 5 },
  { name: 'Efficient Solar Array', category: 'module', rarity: 'rare', sizeW: 2, sizeH: 2, weight: 3, baseValue: 200, icon: '🌤️', solarRegenRate: 4 },
  { name: 'Advanced Solar Grid', category: 'module', rarity: 'epic', sizeW: 2, sizeH: 2, weight: 2, baseValue: 350, icon: '🌞', solarRegenRate: 3 },
  { name: 'Quantum Solar Core', category: 'module', rarity: 'legendary', sizeW: 2, sizeH: 1, weight: 1, baseValue: 600, icon: '✨', solarRegenRate: 2 },
  
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

// Storage modules for purchase
export const SHOP_STORAGE: ItemTemplate[] = [
  { name: 'Basic Cargo Pod', category: 'storage', rarity: 'common', sizeW: 2, sizeH: 2, weight: 4, baseValue: 100, icon: '📦', storageWidth: 5, storageHeight: 5, storageMaxWeight: 35 },
  { name: 'Enhanced Container', category: 'storage', rarity: 'uncommon', sizeW: 2, sizeH: 2, weight: 5, baseValue: 200, icon: '🗃️', storageWidth: 6, storageHeight: 6, storageMaxWeight: 45 },
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

// Create default items for the basic helper
export function createBasicBattery(): Item {
  return {
    id: 'basic-battery',
    name: 'Basic Battery',
    category: 'battery',
    rarity: 'common',
    condition: 100,
    isDirty: false,
    sizeW: 1,
    sizeH: 1,
    weight: 2,
    baseValue: 0,
    hiddenModifiers: [],
    revealedModifiers: [],
    icon: '🔋',
    batteryCapacity: 20,
  };
}

export function createBasicStorage(): Item {
  return {
    id: 'basic-storage',
    name: 'Basic Storage',
    category: 'storage',
    rarity: 'common',
    condition: 100,
    isDirty: false,
    sizeW: 1,
    sizeH: 1,
    weight: 2,
    baseValue: 0,
    hiddenModifiers: [],
    revealedModifiers: [],
    icon: '📦',
    storageWidth: 4,
    storageHeight: 4,
    storageMaxWeight: 30,
  };
}

export function createBasicMobility(): Item {
  return {
    id: 'basic-treads',
    name: 'Tank Treads',
    category: 'mobility',
    rarity: 'common',
    condition: 100,
    isDirty: false,
    sizeW: 1,
    sizeH: 1,
    weight: 3,
    baseValue: 0,
    hiddenModifiers: [],
    revealedModifiers: [],
    icon: '⛓️',
    movementType: 'basic',
  };
}