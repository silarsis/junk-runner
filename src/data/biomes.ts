import { ItemCategory, Rarity, TerrainType, BarrierType } from '@/types/game';

// Biome-specific terrain and barrier configurations
export interface BiomeTerrain {
  type: TerrainType;
  weight: number;
  icon: string;
  name: string;
  description: string;
}

export interface BiomeBarrier {
  type: BarrierType;
  weight: number;
  icon: string;
  name: string;
  description: string;
  // Future: requirement to bypass
  requiresModule?: string;
}

export interface BiomeWall {
  icon: string;
  weight: number;
}

export interface Biome {
  id: string;
  name: string;
  icon: string;
  description: string;
  theme: string;
  
  // Loot modifiers
  categoryWeights: Partial<Record<ItemCategory, number>>;
  rarityWeights: Partial<Record<Rarity, number>>;
  
  // Terrain generation
  terrainTypes: BiomeTerrain[];
  hazardDensity: number;
  
  // Barriers (soft gates)
  barrierTypes: BiomeBarrier[];
  barrierDensity: number;
  
  // Wall obstacles
  wallTypes: BiomeWall[];
  wallDensity: number;
  
  // Visual atmosphere
  fogColor?: string;
  ambientEffects?: string[];
}

// ============================================
// BIOME DEFINITIONS
// ============================================

export const BIOMES: Record<string, Biome> = {
  nuclear: {
    id: 'nuclear',
    name: 'Nuclear Exclusion Heap',
    icon: '☢️',
    description: 'A sealed-off dump for reactor components and illegal power tech. Everything hums faintly.',
    theme: 'Irradiated industrial wasteland with degraded reactor components.',
    
    categoryWeights: {
      battery: 2.5,
      component: 2.0,
      module: 1.5,
      scrap: 1.2,
      junk: 0.4,
    },
    rarityWeights: {
      rare: 1.5,
      epic: 1.8,
      legendary: 1.3,
      common: 0.6,
    },
    
    terrainTypes: [
      { type: 'irradiated', weight: 40, icon: '☢️', name: 'Irradiated Ground', description: 'Glowing, cracked terrain. Future: radiation accumulation.' },
      { type: 'cooling_trench', weight: 25, icon: '💧', name: 'Cooling Trench', description: 'Slows movement. Future: costs 2 turns to cross.' },
      { type: 'cratered', weight: 35, icon: '🕳️', name: 'Cratered Concrete', description: 'Normal terrain with visual damage.' },
    ],
    hazardDensity: 0.18,
    
    barrierTypes: [
      { type: 'sealed_door', weight: 40, icon: '🚪', name: 'Sealed Lead Door', description: 'Requires shielding tool or heavy helper.', requiresModule: 'shielding_tool' },
      { type: 'collapsed_wall', weight: 35, icon: '🧱', name: 'Collapsed Reactor Wall', description: 'Impassable until cleared by heavy frame.' },
      { type: 'radiation_curtain', weight: 25, icon: '🟡', name: 'Radiation Curtain', description: 'Future: requires protection module.' },
    ],
    barrierDensity: 0.06,
    
    wallTypes: [
      { icon: '🏭', weight: 20 },
      { icon: '⚗️', weight: 15 },
      { icon: '🛢️', weight: 25 },
      { icon: '📦', weight: 20 },
      { icon: '🔩', weight: 20 },
    ],
    wallDensity: 0.14,
    
    ambientEffects: ['radiation_glow', 'steam_vents'],
  },

  neon_slum: {
    id: 'neon_slum',
    name: 'Neon Slum Electronics Yard',
    icon: '📟',
    description: 'The dumping ground of consumer tech: phones, implants, screens, and endless tangled wiring.',
    theme: 'Megacity tech graveyard with flickering neon and cable sprawl.',
    
    categoryWeights: {
      component: 2.5,
      module: 2.0,
      battery: 1.3,
      scrap: 0.8,
      junk: 1.5,
    },
    rarityWeights: {
      uncommon: 1.4,
      rare: 1.3,
      epic: 1.2,
    },
    
    terrainTypes: [
      { type: 'cable_sprawl', weight: 40, icon: '〰️', name: 'Cable Sprawl', description: 'Dense wiring. Future: movement penalties without cable-cutter.' },
      { type: 'broken_pavement', weight: 30, icon: '🔲', name: 'Broken Pavement', description: 'Normal movement terrain.' },
      { type: 'neon_pool', weight: 30, icon: '💜', name: 'Neon Pool', description: 'Flickering liquid light. Future: electric interference.' },
    ],
    hazardDensity: 0.15,
    
    barrierTypes: [
      { type: 'data_cage', weight: 40, icon: '🔒', name: 'Locked Data Cage', description: 'Requires hacking/scanner module.', requiresModule: 'scanner' },
      { type: 'billboard_frame', weight: 35, icon: '📺', name: 'Collapsed Billboard', description: 'Block paths until dismantled.' },
      { type: 'power_junction', weight: 25, icon: '⚡', name: 'Power Junction Node', description: 'Must be deactivated or bypassed.' },
    ],
    barrierDensity: 0.05,
    
    wallTypes: [
      { icon: '📺', weight: 25 },
      { icon: '💻', weight: 20 },
      { icon: '📱', weight: 20 },
      { icon: '🖥️', weight: 15 },
      { icon: '🔌', weight: 20 },
    ],
    wallDensity: 0.10,
    
    ambientEffects: ['neon_flicker', 'static_noise'],
  },

  industrial: {
    id: 'industrial',
    name: 'Industrial Corpse Zone',
    icon: '🏭',
    description: 'Abandoned factories and assembly lines. Rusted machines frozen mid-task.',
    theme: 'Heavy machinery graveyards with oil slicks and catwalks.',
    
    categoryWeights: {
      scrap: 2.5,
      mobility: 2.2,
      component: 1.5,
      storage: 1.4,
      junk: 0.6,
    },
    rarityWeights: {
      common: 1.3,
      uncommon: 1.2,
      rare: 1.1,
    },
    
    terrainTypes: [
      { type: 'oil_slick', weight: 35, icon: '🛢️', name: 'Oil-Slick Floor', description: 'Slippery surface. Future: chance to lose a turn.' },
      { type: 'assembly_line', weight: 35, icon: '⚙️', name: 'Assembly Line', description: 'Linear terrain guiding movement.' },
      { type: 'collapsed_catwalk', weight: 30, icon: '🌉', name: 'Collapsed Catwalk', description: 'Impassable gaps.' },
    ],
    hazardDensity: 0.16,
    
    barrierTypes: [
      { type: 'bulkhead_door', weight: 35, icon: '🚧', name: 'Bulkhead Door', description: 'Requires power or mechanical force.' },
      { type: 'jammed_press', weight: 35, icon: '🔨', name: 'Jammed Press', description: 'Requires time or helper strength to clear.' },
      { type: 'rubble', weight: 30, icon: '🪨', name: 'Load-Bearing Rubble', description: 'Cannot clear without heavy frame helper.' },
    ],
    barrierDensity: 0.07,
    
    wallTypes: [
      { icon: '🏗️', weight: 20 },
      { icon: '🚗', weight: 15 },
      { icon: '🔧', weight: 20 },
      { icon: '⚙️', weight: 25 },
      { icon: '🛠️', weight: 20 },
    ],
    wallDensity: 0.16,
    
    ambientEffects: ['rust_particles', 'grinding_sounds'],
  },

  biowaste: {
    id: 'biowaste',
    name: 'Black Market Bio-Waste Fields',
    icon: '🧬',
    description: 'Where illegal biotech and failed augmentations end up. Organic and mechanical fused together.',
    theme: 'Organic horror mixed with cybernetic refuse.',
    
    categoryWeights: {
      component: 2.0,
      module: 1.8,
      battery: 1.5,
      scrap: 1.0,
      junk: 0.8,
    },
    rarityWeights: {
      uncommon: 1.3,
      rare: 1.5,
      epic: 1.4,
      legendary: 1.2,
    },
    
    terrainTypes: [
      { type: 'organic_sludge', weight: 40, icon: '🟢', name: 'Organic Sludge', description: 'Slow, viscous ground. Future: infection/corrosion.' },
      { type: 'flesh_mound', weight: 30, icon: '🫀', name: 'Flesh-Steel Mound', description: 'Junk piles with higher loot density.' },
      { type: 'drainage', weight: 30, icon: '🔳', name: 'Drainage Channel', description: 'Narrow walkways.' },
    ],
    hazardDensity: 0.20,
    
    barrierTypes: [
      { type: 'quarantine_fence', weight: 40, icon: '🚷', name: 'Quarantine Fence', description: 'Requires clearance or bio-filter module.', requiresModule: 'bio_filter' },
      { type: 'medical_pod', weight: 35, icon: '💊', name: 'Sealed Medical Pod', description: 'Needs careful extraction (time-based).' },
      { type: 'living_wall', weight: 25, icon: '🧠', name: 'Living Growth Wall', description: 'Future: regenerates over time.' },
    ],
    barrierDensity: 0.06,
    
    wallTypes: [
      { icon: '🧪', weight: 20 },
      { icon: '💉', weight: 15 },
      { icon: '🩸', weight: 15 },
      { icon: '🫁', weight: 25 },
      { icon: '🦴', weight: 25 },
    ],
    wallDensity: 0.12,
    
    ambientEffects: ['pulsing_growth', 'dripping'],
  },

  cloudfall: {
    id: 'cloudfall',
    name: 'Cloudfall Data Graveyard',
    icon: '🖥️',
    description: 'Decommissioned servers and satellites after cloud migrations and bankruptcies.',
    theme: 'Digital necropolis shrouded in cooling fog.',
    
    categoryWeights: {
      component: 2.5,
      module: 2.2,
      storage: 1.8,
      battery: 1.3,
      scrap: 0.7,
      junk: 0.4,
    },
    rarityWeights: {
      rare: 1.6,
      epic: 1.5,
      legendary: 1.4,
      common: 0.5,
    },
    
    terrainTypes: [
      { type: 'cooling_fog', weight: 40, icon: '🌫️', name: 'Cooling Fog Zone', description: 'Reduced visibility (fog-of-war radius reduced).' },
      { type: 'server_rack', weight: 35, icon: '🖲️', name: 'Raised Server Rack', description: 'Narrow walkable paths.' },
      { type: 'magnetic_floor', weight: 25, icon: '🧲', name: 'Magnetic Floor', description: 'Future: affects metal-heavy helpers.' },
    ],
    hazardDensity: 0.18,
    
    barrierTypes: [
      { type: 'vault_door', weight: 40, icon: '🔐', name: 'Encrypted Vault Door', description: 'Requires high-tier scanner or data keys.', requiresModule: 'advanced_scanner' },
      { type: 'server_stack', weight: 35, icon: '📚', name: 'Collapsed Server Stack', description: 'Block paths, can be dismantled.' },
      { type: 'firewall_node', weight: 25, icon: '🔥', name: 'Firewall Node', description: 'Hybrid digital/physical barrier.' },
    ],
    barrierDensity: 0.05,
    
    wallTypes: [
      { icon: '💾', weight: 20 },
      { icon: '📀', weight: 15 },
      { icon: '🖥️', weight: 25 },
      { icon: '📡', weight: 20 },
      { icon: '🔲', weight: 20 },
    ],
    wallDensity: 0.11,
    
    fogColor: 'rgba(100, 150, 200, 0.3)',
    ambientEffects: ['blinking_lights', 'cooling_hum'],
  },
};

// Get all biomes as array
export const BIOME_LIST = Object.values(BIOMES);

// Get biome from seed
export function getBiomeFromSeed(seed: number): Biome {
  const biomeKeys = Object.keys(BIOMES);
  const index = Math.abs(seed) % biomeKeys.length;
  return BIOMES[biomeKeys[index]];
}

// Pick terrain type based on biome weights
export function pickBiomeTerrain(biome: Biome, random: () => number): BiomeTerrain | null {
  if (biome.terrainTypes.length === 0) return null;
  
  const totalWeight = biome.terrainTypes.reduce((sum, t) => sum + t.weight, 0);
  let roll = random() * totalWeight;
  
  for (const terrain of biome.terrainTypes) {
    roll -= terrain.weight;
    if (roll <= 0) return terrain;
  }
  return biome.terrainTypes[0];
}

// Pick barrier type based on biome weights
export function pickBiomeBarrier(biome: Biome, random: () => number): BiomeBarrier | null {
  if (biome.barrierTypes.length === 0) return null;
  
  const totalWeight = biome.barrierTypes.reduce((sum, b) => sum + b.weight, 0);
  let roll = random() * totalWeight;
  
  for (const barrier of biome.barrierTypes) {
    roll -= barrier.weight;
    if (roll <= 0) return barrier;
  }
  return biome.barrierTypes[0];
}

// Pick wall type based on biome weights
export function pickBiomeWall(biome: Biome, random: () => number): string {
  if (biome.wallTypes.length === 0) return '🧱';
  
  const totalWeight = biome.wallTypes.reduce((sum, w) => sum + w.weight, 0);
  let roll = random() * totalWeight;
  
  for (const wall of biome.wallTypes) {
    roll -= wall.weight;
    if (roll <= 0) return wall.icon;
  }
  return biome.wallTypes[0].icon;
}

// Biome-specific item templates
export const BIOME_ITEMS: Record<string, { name: string; icon: string; category: string; rarity: string; baseValue: number }[]> = {
  nuclear: [
    { name: 'Degraded Nuclear Core', icon: '☢️', category: 'component', rarity: 'epic', baseValue: 280 },
    { name: 'Radiation Shielding Plate', icon: '🛡️', category: 'scrap', rarity: 'rare', baseValue: 85 },
    { name: 'Quantum Battery Fragment', icon: '💠', category: 'battery', rarity: 'legendary', baseValue: 450 },
    { name: 'Isotope Filter', icon: '🔬', category: 'component', rarity: 'rare', baseValue: 95 },
    { name: 'Lead-Lined Casing', icon: '📦', category: 'storage', rarity: 'uncommon', baseValue: 55 },
    { name: 'Medical Irradiation Unit', icon: '⚕️', category: 'module', rarity: 'rare', baseValue: 140 },
    { name: 'Contaminated Scrap', icon: '🟡', category: 'scrap', rarity: 'uncommon', baseValue: 35 },
  ],
  neon_slum: [
    { name: 'Salvaged Circuit Board', icon: '📟', category: 'component', rarity: 'uncommon', baseValue: 40 },
    { name: 'Cracked Display Panel', icon: '📺', category: 'component', rarity: 'common', baseValue: 18 },
    { name: 'Optical Sensor', icon: '👁️', category: 'component', rarity: 'rare', baseValue: 75 },
    { name: 'Encrypted Data Shard', icon: '💾', category: 'module', rarity: 'rare', baseValue: 120 },
    { name: 'Neon Tubing', icon: '💡', category: 'junk', rarity: 'common', baseValue: 8 },
    { name: 'Consumer Cyberware', icon: '🦾', category: 'module', rarity: 'epic', baseValue: 220 },
  ],
  industrial: [
    { name: 'Hydraulic Piston', icon: '🔧', category: 'component', rarity: 'uncommon', baseValue: 45 },
    { name: 'Servo Motor', icon: '⚙️', category: 'mobility', rarity: 'rare', baseValue: 110 },
    { name: 'Industrial Actuator', icon: '🔩', category: 'component', rarity: 'uncommon', baseValue: 38 },
    { name: 'Heavy Frame Plate', icon: '🛡️', category: 'scrap', rarity: 'uncommon', baseValue: 32 },
    { name: 'Control Chip', icon: '💾', category: 'component', rarity: 'rare', baseValue: 88 },
    { name: 'Reinforced Steel Beam', icon: '🏗️', category: 'scrap', rarity: 'common', baseValue: 22 },
  ],
  biowaste: [
    { name: 'Bio-Reactor Core', icon: '🧬', category: 'component', rarity: 'epic', baseValue: 195 },
    { name: 'Synthetic Muscle Bundle', icon: '💪', category: 'mobility', rarity: 'rare', baseValue: 130 },
    { name: 'Wetware Chip', icon: '🧠', category: 'module', rarity: 'epic', baseValue: 240 },
    { name: 'Growth Vat Fragment', icon: '🧪', category: 'component', rarity: 'uncommon', baseValue: 48 },
    { name: 'Medical Exoskeleton Part', icon: '🦿', category: 'mobility', rarity: 'rare', baseValue: 145 },
    { name: 'Contaminated Bio-Scrap', icon: '🩸', category: 'scrap', rarity: 'common', baseValue: 15 },
  ],
  cloudfall: [
    { name: 'Server Blade', icon: '🖥️', category: 'component', rarity: 'uncommon', baseValue: 52 },
    { name: 'Memory Core', icon: '💾', category: 'component', rarity: 'rare', baseValue: 95 },
    { name: 'Quantum Storage Block', icon: '📦', category: 'storage', rarity: 'epic', baseValue: 280 },
    { name: 'Industrial Cooling Unit', icon: '❄️', category: 'module', rarity: 'uncommon', baseValue: 65 },
    { name: 'Data Vault Fragment', icon: '🔐', category: 'component', rarity: 'rare', baseValue: 110 },
    { name: 'Encrypted Shard', icon: '💠', category: 'module', rarity: 'legendary', baseValue: 380 },
  ],
};
