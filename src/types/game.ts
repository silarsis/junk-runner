export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory = 'scrap' | 'component' | 'module' | 'junk' | 'battery' | 'mobility' | 'storage';

export type ModifierType = 'carry_bonus' | 'reveal_bonus' | 'cleaning_speed' | 'sell_bonus' | 'battery_capacity';

export interface ItemModifier {
  type: ModifierType;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  condition: number; // 0-100
  isDirty: boolean;
  sizeW: number;
  sizeH: number;
  weight: number;
  baseValue: number;
  hiddenModifiers: ItemModifier[];
  revealedModifiers: ItemModifier[];
  icon: string;
  // Battery-specific
  batteryCapacity?: number;
  // Storage-specific
  storageWidth?: number;
  storageHeight?: number;
  storageMaxWeight?: number;
  // Mobility-specific
  movementType?: 'basic' | 'diagonal' | 'jump' | 'extended';
  // Solar panel specific
  solarRegenRate?: number; // Turns per 1 charge regen
  // Pile scanner specific
  pileRevealCount?: number; // How many items to reveal in junk piles
}

export interface InventoryItem extends Item {
  gridX: number;
  gridY: number;
  rotated: boolean;
}

export interface JunkPile {
  id: string;
  x: number;
  y: number;
  progressTurns: number;
  requiredTurns: number; // Random 1-5 turns to scavenge
  isDepleted: boolean;
  preGeneratedItems?: Item[]; // Items that will be found (for scanner preview)
}

export interface DroppedItem {
  item: Item;
  x: number;
  y: number;
}

// Wall obstacle - impassable junk debris
export interface WallTile {
  x: number;
  y: number;
  icon: string;
}

// Terrain hazard types - organized by biome
export type TerrainType = 
  // Legacy/Generic
  | 'mud'           // Costs 2 battery (treads ignore)
  | 'toxic'         // Damages item condition when crossed
  | 'oil'           // Slide 1 extra tile in movement direction
  | 'electric'      // Drains 3 battery (insulated ignores)
  | 'magnetic'      // Heavy items weigh 2x while inside
  | 'fog'           // Reduces reveal radius to 1
  // Nuclear Exclusion Heap
  | 'irradiated'    // Radiation accumulation over turns
  | 'cooling_trench'// Costs 2 turns to cross
  | 'cratered'      // Visual damage, normal movement
  // Neon Slum Electronics Yard
  | 'cable_sprawl'  // Movement penalties without cable-cutter
  | 'broken_pavement' // Normal movement
  | 'neon_pool'     // Electric interference
  // Industrial Corpse Zone
  | 'oil_slick'     // Chance to lose a turn
  | 'assembly_line' // Linear movement guidance
  | 'collapsed_catwalk' // Impassable gaps
  // Black Market Bio-Waste Fields
  | 'organic_sludge' // Infection/corrosion risk
  | 'flesh_mound'   // Higher loot density
  | 'drainage'      // Narrow walkways
  // Cloudfall Data Graveyard
  | 'cooling_fog'   // Reduced visibility
  | 'server_rack'   // Narrow paths
  | 'magnetic_floor'; // Affects metal-heavy helpers

// Barrier types - soft gates requiring modules/abilities
export type BarrierType =
  // Nuclear
  | 'sealed_door'
  | 'collapsed_wall'
  | 'radiation_curtain'
  // Neon Slum
  | 'data_cage'
  | 'billboard_frame'
  | 'power_junction'
  // Industrial
  | 'bulkhead_door'
  | 'jammed_press'
  | 'rubble'
  // Biowaste
  | 'quarantine_fence'
  | 'medical_pod'
  | 'living_wall'
  // Cloudfall
  | 'vault_door'
  | 'server_stack'
  | 'firewall_node';

export interface TerrainTile {
  x: number;
  y: number;
  type: TerrainType;
  icon: string;
  name?: string; // Display name for UI
}

export interface BarrierTile {
  x: number;
  y: number;
  type: BarrierType;
  icon: string;
  name: string;
  isPassable: boolean; // Can be unlocked with modules
  requiresModule?: string;
}

export interface Junkyard {
  yardId: string;
  seed: number;
  biomeId: string; // Which biome this junkyard uses
  width: number;
  height: number;
  revealedTiles: boolean[][];
  piles: JunkPile[];
  walls: WallTile[];
  terrain: TerrainTile[];
  barriers: BarrierTile[]; // Soft gates
  droppedItems: DroppedItem[];
}

export interface Bag {
  width: number;
  height: number;
  maxWeight: number;
  items: InventoryItem[];
}

export interface CleaningJob {
  jobId: string;
  itemId: string;
  item: Item;
  startTime: number;
  duration: number; // in milliseconds
}

export type FrameType = 'basic' | 'crawler' | 'scout' | 'hauler' | 'explorer' | 'titan';

// Slot types for helper frames
export interface FrameSlots {
  mobilitySlots: number;
  moduleSlots: number;
  batterySlots: number;
}

export interface HelperFrame {
  id: FrameType;
  name: string;
  slots: FrameSlots;
  icon: string;
}

// Equipped components on a helper
export interface HelperComponents {
  mobility: Item | null;  // Mobility module (treads, wheels, legs)
  modules: Item[];        // General modules (storage, scanner, etc.)
  battery: Item | null;   // Power source
}

export interface HelperRobot {
  id: string;
  frameId: FrameType;
  components: HelperComponents;
  isDeployed: boolean;
  isPrimary: boolean; // The player's main robot
}

export interface BaseUpgrades {
  cleaningSlots: number;
  cleaningSpeed: number; // multiplier, 1.0 = base
  workshopTier: number;
  controlCapacity: number;
  chargerEfficiency: number; // reduces cost per charge unit
  baseRechargeRate: number; // passive recharge at base (seconds per 1 charge)
}

export interface PlayerState {
  currency: number;
  stash: Item[];
  currentYardId: string | null;
  baseUpgrades: BaseUpgrades;
  helpers: HelperRobot[];
  cleaningJobs: CleaningJob[];
  playerX: number;
  playerY: number;
  currentCharge: number; // Current battery charge for active helper
}

export interface GameState {
  player: PlayerState;
  junkyard: Junkyard | null;
  junkyardSeed: number; // Seed for the next/current junkyard (for preview)
  turnCount: number;
}

// Default values for basic components
export const BASIC_BATTERY_CAPACITY = 20;
export const BASIC_STORAGE_WIDTH = 4;
export const BASIC_STORAGE_HEIGHT = 4;
export const BASIC_STORAGE_WEIGHT = 30;