import { ItemCategory } from '@/types/game';

export interface CraftingIngredient {
  name: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'frame' | ItemCategory;
  icon: string;
  description: string;
  ingredients: CraftingIngredient[];
  currencyCost: number;
  // For craftable items, these define the output
  output?: {
    batteryCapacity?: number;
    storageWidth?: number;
    storageHeight?: number;
    storageMaxWeight?: number;
    movementType?: 'basic' | 'diagonal' | 'jump' | 'extended';
    solarRegenRate?: number;
    pileRevealCount?: number;
    launcherCapacity?: number;
    consumableType?: string;
  };
}

// Frame recipes - build new robot frames
export const FRAME_RECIPES: CraftingRecipe[] = [
  {
    id: 'frame_basic',
    name: 'Basic Frame',
    category: 'frame',
    icon: '🤖',
    description: 'Simple robot frame. 1 mobility, 1 module, 1 battery slot.',
    ingredients: [
      { name: 'Steel Plate', quantity: 2 },
      { name: 'Broken Gear', quantity: 3 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 50,
  },
  {
    id: 'frame_crawler',
    name: 'Crawler Frame',
    category: 'frame',
    icon: '🐛',
    description: 'Heavy-duty frame with extra module capacity. 1 mobility, 2 modules, 1 battery.',
    ingredients: [
      { name: 'Steel Plate', quantity: 4 },
      { name: 'Motor Unit', quantity: 1 },
      { name: 'Broken Gear', quantity: 4 },
      { name: 'Copper Wire', quantity: 3 },
    ],
    currencyCost: 200,
  },
  {
    id: 'frame_scout',
    name: 'Scout Frame',
    category: 'frame',
    icon: '🔭',
    description: 'Lightweight frame for maximum modules. 1 mobility, 3 modules, 2 battery slots.',
    ingredients: [
      { name: 'Titanium Scrap', quantity: 2 },
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 1 },
      { name: 'Copper Wire', quantity: 4 },
    ],
    currencyCost: 300,
  },
  {
    id: 'frame_hauler',
    name: 'Hauler Frame',
    category: 'frame',
    icon: '🚛',
    description: 'Heavy cargo frame. 1 mobility, 4 modules, 1 battery slot.',
    ingredients: [
      { name: 'Steel Plate', quantity: 6 },
      { name: 'Motor Unit', quantity: 2 },
      { name: 'Titanium Scrap', quantity: 2 },
      { name: 'Broken Gear', quantity: 4 },
    ],
    currencyCost: 400,
  },
  {
    id: 'frame_explorer',
    name: 'Explorer Frame',
    category: 'frame',
    icon: '🧭',
    description: 'Versatile long-range frame. 2 mobility, 3 modules, 2 battery slots.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 3 },
      { name: 'Motor Unit', quantity: 2 },
      { name: 'Titanium Scrap', quantity: 3 },
    ],
    currencyCost: 500,
  },
  {
    id: 'frame_titan',
    name: 'Titan Frame',
    category: 'frame',
    icon: '🦾',
    description: 'Ultimate heavy frame. 2 mobility, 5 modules, 3 battery slots.',
    ingredients: [
      { name: 'Fusion Core', quantity: 1 },
      { name: 'Quantum Chip', quantity: 2 },
      { name: 'Titanium Scrap', quantity: 4 },
      { name: 'Motor Unit', quantity: 2 },
    ],
    currencyCost: 800,
  },
];

// Battery module recipes
export const BATTERY_RECIPES: CraftingRecipe[] = [
  {
    id: 'battery_basic',
    name: 'Basic Battery Pack',
    category: 'battery',
    icon: '🔋',
    description: '25 moves capacity. Reliable starter power.',
    ingredients: [
      { name: 'Power Cell', quantity: 1 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 30,
    output: { batteryCapacity: 25 },
  },
  {
    id: 'battery_enhanced',
    name: 'Enhanced Battery',
    category: 'battery',
    icon: '🔋',
    description: '35 moves capacity. More power for longer runs.',
    ingredients: [
      { name: 'Power Cell', quantity: 2 },
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Copper Wire', quantity: 3 },
    ],
    currencyCost: 80,
    output: { batteryCapacity: 35 },
  },
  {
    id: 'battery_pro',
    name: 'Pro Battery Module',
    category: 'battery',
    icon: '⚡',
    description: '50 moves capacity. Industrial grade power.',
    ingredients: [
      { name: 'Power Cell', quantity: 3 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
    ],
    currencyCost: 150,
    output: { batteryCapacity: 50 },
  },
  {
    id: 'battery_quantum',
    name: 'Quantum Battery',
    category: 'battery',
    icon: '💎',
    description: '75 moves capacity. Ultimate power source.',
    ingredients: [
      { name: 'Fusion Core', quantity: 1 },
      { name: 'Quantum Chip', quantity: 2 },
      { name: 'Power Cell', quantity: 2 },
    ],
    currencyCost: 300,
    output: { batteryCapacity: 75 },
  },
];

// Storage module recipes
export const STORAGE_RECIPES: CraftingRecipe[] = [
  {
    id: 'storage_basic',
    name: 'Basic Cargo Pod',
    category: 'storage',
    icon: '📦',
    description: '5x5 grid, 35 weight. Simple storage.',
    ingredients: [
      { name: 'Steel Plate', quantity: 2 },
      { name: 'Rusty Bolt', quantity: 4 },
    ],
    currencyCost: 40,
    output: { storageWidth: 5, storageHeight: 5, storageMaxWeight: 35 },
  },
  {
    id: 'storage_enhanced',
    name: 'Enhanced Container',
    category: 'storage',
    icon: '🗃️',
    description: '6x6 grid, 45 weight. Reinforced storage.',
    ingredients: [
      { name: 'Steel Plate', quantity: 3 },
      { name: 'Titanium Scrap', quantity: 1 },
      { name: 'Broken Gear', quantity: 2 },
    ],
    currencyCost: 100,
    output: { storageWidth: 6, storageHeight: 6, storageMaxWeight: 45 },
  },
  {
    id: 'storage_industrial',
    name: 'Industrial Container',
    category: 'storage',
    icon: '🗃️',
    description: '7x7 grid, 55 weight. Heavy duty.',
    ingredients: [
      { name: 'Titanium Scrap', quantity: 2 },
      { name: 'Motor Unit', quantity: 1 },
      { name: 'Steel Plate', quantity: 2 },
    ],
    currencyCost: 180,
    output: { storageWidth: 7, storageHeight: 7, storageMaxWeight: 55 },
  },
  {
    id: 'storage_quantum',
    name: 'Quantum Storage',
    category: 'storage',
    icon: '💫',
    description: '8x8 grid, 60 weight. Space-folding tech.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 2 },
      { name: 'Titanium Scrap', quantity: 2 },
      { name: 'Circuit Board', quantity: 2 },
    ],
    currencyCost: 250,
    output: { storageWidth: 8, storageHeight: 8, storageMaxWeight: 60 },
  },
];

// Mobility module recipes
export const MOBILITY_RECIPES: CraftingRecipe[] = [
  {
    id: 'mobility_wheels',
    name: 'Salvaged Wheels',
    category: 'mobility',
    icon: '🛞',
    description: 'Basic movement. Standard 4-direction.',
    ingredients: [
      { name: 'Broken Gear', quantity: 2 },
      { name: 'Rusty Bolt', quantity: 3 },
      { name: 'Metal Shard', quantity: 2 },
    ],
    currencyCost: 30,
    output: { movementType: 'basic' },
  },
  {
    id: 'mobility_treads',
    name: 'All-Terrain Treads',
    category: 'mobility',
    icon: '⛓️',
    description: 'Basic movement. Ignores mud terrain.',
    ingredients: [
      { name: 'Motor Unit', quantity: 1 },
      { name: 'Steel Plate', quantity: 2 },
      { name: 'Broken Gear', quantity: 3 },
    ],
    currencyCost: 80,
    output: { movementType: 'basic' },
  },
  {
    id: 'mobility_racing',
    name: 'Racing Wheels',
    category: 'mobility',
    icon: '🏎️',
    description: 'Extended movement. Move up to 2 tiles.',
    ingredients: [
      { name: 'Motor Unit', quantity: 1 },
      { name: 'Titanium Scrap', quantity: 1 },
      { name: 'Circuit Board', quantity: 1 },
    ],
    currencyCost: 120,
    output: { movementType: 'extended' },
  },
  {
    id: 'mobility_spider',
    name: 'Spider Legs',
    category: 'mobility',
    icon: '🕷️',
    description: 'Diagonal movement. Can traverse walls (2x cost).',
    ingredients: [
      { name: 'Motor Unit', quantity: 2 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Titanium Scrap', quantity: 2 },
    ],
    currencyCost: 200,
    output: { movementType: 'diagonal' },
  },
  {
    id: 'mobility_jets',
    name: 'Jump Jets',
    category: 'mobility',
    icon: '🚀',
    description: 'Jump movement. Leap up to 2 tiles any direction.',
    ingredients: [
      { name: 'Fusion Core', quantity: 1 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Motor Unit', quantity: 1 },
    ],
    currencyCost: 350,
    output: { movementType: 'jump' },
  },
];

// Automation bot recipes
export const AUTOMATION_RECIPES: CraftingRecipe[] = [
  {
    id: 'automation_cleaning_bot',
    name: 'Cleaning Bot',
    category: 'module', // Using module as the category type
    icon: '🤖',
    description: 'Automates cleaning while you scavenge. Set priorities by rarity and type.',
    ingredients: [
      { name: 'Circuit Board', quantity: 3 },
      { name: 'Motor Unit', quantity: 2 },
      { name: 'Copper Wire', quantity: 4 },
      { name: 'Broken Gear', quantity: 3 },
    ],
    currencyCost: 350,
  },
];

// General module recipes (solar panels, pile scanners)
export const MODULE_RECIPES: CraftingRecipe[] = [
  // Pile Scanner modules - reveal items in junk piles before scavenging
  {
    id: 'module_pile_scanner_basic',
    name: 'Basic Pile Scanner',
    category: 'module',
    icon: '🔍',
    description: 'Reveals 1 item in adjacent junk piles.',
    ingredients: [
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Copper Wire', quantity: 2 },
      { name: 'Broken Gear', quantity: 2 },
    ],
    currencyCost: 50,
    output: { pileRevealCount: 1 },
  },
  {
    id: 'module_pile_scanner_enhanced',
    name: 'Enhanced Pile Scanner',
    category: 'module',
    icon: '🔎',
    description: 'Reveals 2 items in adjacent junk piles.',
    ingredients: [
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 1 },
      { name: 'Copper Wire', quantity: 3 },
    ],
    currencyCost: 120,
    output: { pileRevealCount: 2 },
  },
  {
    id: 'module_pile_scanner_advanced',
    name: 'Advanced Pile Scanner',
    category: 'module',
    icon: '📡',
    description: 'Reveals 3 items in adjacent junk piles.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 1 },
    ],
    currencyCost: 200,
    output: { pileRevealCount: 3 },
  },
  {
    id: 'module_pile_scanner_quantum',
    name: 'Quantum Pile Scanner',
    category: 'module',
    icon: '🛰️',
    description: 'Reveals 5 items in adjacent junk piles.',
    ingredients: [
      { name: 'Fusion Core', quantity: 1 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
    ],
    currencyCost: 400,
    output: { pileRevealCount: 5 },
  },
  // Solar panels
  {
    id: 'module_solar_basic',
    name: 'Salvaged Solar Panel',
    category: 'module',
    icon: '☀️',
    description: 'Regenerate 1 charge every 5 turns.',
    ingredients: [
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Copper Wire', quantity: 3 },
      { name: 'Steel Plate', quantity: 1 },
    ],
    currencyCost: 50,
    output: { solarRegenRate: 5 },
  },
  {
    id: 'module_solar_efficient',
    name: 'Efficient Solar Array',
    category: 'module',
    icon: '🌤️',
    description: 'Regenerate 1 charge every 4 turns.',
    ingredients: [
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 1 },
      { name: 'Titanium Scrap', quantity: 1 },
    ],
    currencyCost: 120,
    output: { solarRegenRate: 4 },
  },
  {
    id: 'module_solar_advanced',
    name: 'Advanced Solar Grid',
    category: 'module',
    icon: '🌞',
    description: 'Regenerate 1 charge every 3 turns.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 2 },
    ],
    currencyCost: 220,
    output: { solarRegenRate: 3 },
  },
  {
    id: 'module_solar_quantum',
    name: 'Quantum Solar Core',
    category: 'module',
    icon: '✨',
    description: 'Regenerate 1 charge every 2 turns.',
    ingredients: [
      { name: 'Fusion Core', quantity: 1 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
    ],
    currencyCost: 400,
    output: { solarRegenRate: 2 },
  },
];

// Launcher module recipes
export const LAUNCHER_RECIPES: CraftingRecipe[] = [
  {
    id: 'launcher_compact',
    name: 'Compact Launcher',
    category: 'launcher' as any,
    icon: '🔫',
    description: 'Upgraded launcher. Holds 2 consumables.',
    ingredients: [
      { name: 'Steel Plate', quantity: 2 },
      { name: 'Broken Gear', quantity: 3 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 80,
    output: { launcherCapacity: 2 },
  },
  {
    id: 'launcher_tactical',
    name: 'Tactical Launcher',
    category: 'launcher' as any,
    icon: '🚀',
    description: 'Military-grade launcher. Holds 4 consumables.',
    ingredients: [
      { name: 'Titanium Scrap', quantity: 2 },
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Motor Unit', quantity: 1 },
    ],
    currencyCost: 200,
    output: { launcherCapacity: 4 },
  },
  {
    id: 'launcher_heavy',
    name: 'Heavy Launcher',
    category: 'launcher' as any,
    icon: '💣',
    description: 'Maximum capacity launcher. Holds 6 consumables.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Titanium Scrap', quantity: 3 },
      { name: 'Motor Unit', quantity: 2 },
    ],
    currencyCost: 400,
    output: { launcherCapacity: 6 },
  },
];

// Consumable counter recipes
export const CONSUMABLE_RECIPES: CraftingRecipe[] = [
  {
    id: 'consumable_emp_grenade',
    name: 'EMP Grenade',
    category: 'consumable' as any,
    icon: '⚡',
    description: 'Disables electronic enemies for 3 turns.',
    ingredients: [
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Power Cell', quantity: 1 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 40,
    output: { consumableType: 'emp_grenade' },
  },
  {
    id: 'consumable_bait_canister',
    name: 'Bait Canister',
    category: 'consumable' as any,
    icon: '🥩',
    description: 'Lures organic enemies away for 5 turns.',
    ingredients: [
      { name: 'Crushed Can', quantity: 3 },
      { name: 'Rusty Bolt', quantity: 2 },
    ],
    currencyCost: 25,
    output: { consumableType: 'bait_canister' },
  },
  {
    id: 'consumable_cryo_spray',
    name: 'Cryo Spray',
    category: 'consumable' as any,
    icon: '❄️',
    description: 'Freezes target in place for 4 turns.',
    ingredients: [
      { name: 'Power Cell', quantity: 1 },
      { name: 'Steel Plate', quantity: 1 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 50,
    output: { consumableType: 'cryo_spray' },
  },
  {
    id: 'consumable_sonic_pulse',
    name: 'Sonic Pulse',
    category: 'consumable' as any,
    icon: '🔊',
    description: 'Scatters swarm enemies in the area.',
    ingredients: [
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Broken Gear', quantity: 2 },
      { name: 'Metal Shard', quantity: 2 },
    ],
    currencyCost: 35,
    output: { consumableType: 'sonic_pulse' },
  },
  {
    id: 'consumable_thermal_cloak',
    name: 'Thermal Cloak',
    category: 'consumable' as any,
    icon: '🌡️',
    description: 'Invisible to chasers for 4 turns.',
    ingredients: [
      { name: 'Titanium Scrap', quantity: 1 },
      { name: 'Circuit Board', quantity: 1 },
      { name: 'Copper Wire', quantity: 3 },
    ],
    currencyCost: 60,
    output: { consumableType: 'thermal_cloak' },
  },
  {
    id: 'consumable_data_spike',
    name: 'Data Spike',
    category: 'consumable' as any,
    icon: '💾',
    description: 'Corrupts digital enemies, causing malfunction.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 1 },
    ],
    currencyCost: 80,
    output: { consumableType: 'data_spike' },
  },
  {
    id: 'consumable_degausser',
    name: 'Degausser',
    category: 'consumable' as any,
    icon: '🧲',
    description: 'Disrupts magnetic enemies for 5 turns.',
    ingredients: [
      { name: 'Power Cell', quantity: 1 },
      { name: 'Motor Unit', quantity: 1 },
      { name: 'Copper Wire', quantity: 2 },
    ],
    currencyCost: 55,
    output: { consumableType: 'degausser' },
  },
  {
    id: 'consumable_neutralizer_foam',
    name: 'Neutralizer Foam',
    category: 'consumable' as any,
    icon: '🫧',
    description: 'Clears bio-contamination in area.',
    ingredients: [
      { name: 'Steel Plate', quantity: 1 },
      { name: 'Crushed Can', quantity: 4 },
      { name: 'Rusty Bolt', quantity: 3 },
    ],
    currencyCost: 30,
    output: { consumableType: 'neutralizer_foam' },
  },
  {
    id: 'consumable_flash_flare',
    name: 'Flash Flare',
    category: 'consumable' as any,
    icon: '💥',
    description: 'Blinds enemies in radius for 3 turns.',
    ingredients: [
      { name: 'Power Cell', quantity: 1 },
      { name: 'Metal Shard', quantity: 3 },
      { name: 'Copper Wire', quantity: 1 },
    ],
    currencyCost: 35,
    output: { consumableType: 'flash_flare' },
  },
  {
    id: 'consumable_holographic_decoy',
    name: 'Holographic Decoy',
    category: 'consumable' as any,
    icon: '👤',
    description: 'Creates distraction for 6 turns.',
    ingredients: [
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Power Cell', quantity: 1 },
    ],
    currencyCost: 100,
    output: { consumableType: 'holographic_decoy' },
  },
  {
    id: 'consumable_recall_beacon',
    name: 'Recall Beacon',
    category: 'consumable' as any,
    icon: '📡',
    description: 'Teleport to base without losing junkyard progress.',
    ingredients: [
      { name: 'Quantum Chip', quantity: 1 },
      { name: 'Circuit Board', quantity: 2 },
      { name: 'Power Cell', quantity: 2 },
      { name: 'Copper Wire', quantity: 3 },
    ],
    currencyCost: 150,
    output: { consumableType: 'recall_beacon' },
  },
];

// Combined recipes for easy access
export const ALL_RECIPES = {
  frame: FRAME_RECIPES,
  battery: BATTERY_RECIPES,
  storage: STORAGE_RECIPES,
  mobility: MOBILITY_RECIPES,
  module: MODULE_RECIPES,
  launcher: LAUNCHER_RECIPES,
  consumable: CONSUMABLE_RECIPES,
};

// Helper to check if player has required ingredients
export function hasIngredients(stash: { name: string }[], ingredients: CraftingIngredient[]): boolean {
  const counts: Record<string, number> = {};
  for (const item of stash) {
    counts[item.name] = (counts[item.name] || 0) + 1;
  }
  return ingredients.every(ing => (counts[ing.name] || 0) >= ing.quantity);
}

// Get missing ingredients
export function getMissingIngredients(stash: { name: string }[], ingredients: CraftingIngredient[]): CraftingIngredient[] {
  const counts: Record<string, number> = {};
  for (const item of stash) {
    counts[item.name] = (counts[item.name] || 0) + 1;
  }
  return ingredients
    .filter(ing => (counts[ing.name] || 0) < ing.quantity)
    .map(ing => ({
      name: ing.name,
      quantity: ing.quantity - (counts[ing.name] || 0),
    }));
}
