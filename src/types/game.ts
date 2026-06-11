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
  // Storyline metadata - present on special story items only
  storylineId?: string;
  storyStepIndex?: number;
}

export interface StoryEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  storylineId: string;
  stepIndex: number; // index of the step that triggered this email; -1 for reward email
  receivedAt: number;
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
  isDepleted: boolean;
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

// Terrain hazard types
export type TerrainType = 
  | 'mud'           // Costs 2 battery (treads ignore)
  | 'toxic'         // Damages item condition when crossed
  | 'oil'           // Slide 1 extra tile in movement direction
  | 'electric'      // Drains 3 battery (insulated ignores)
  | 'magnetic'      // Heavy items weigh 2x while inside
  | 'fog';          // Reduces reveal radius to 1

export interface TerrainTile {
  x: number;
  y: number;
  type: TerrainType;
  icon: string;
}

export interface Junkyard {
  yardId: string;
  seed: number;
  width: number;
  height: number;
  revealedTiles: boolean[][];
  piles: JunkPile[];
  walls: WallTile[];
  terrain: TerrainTile[];
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

export type FrameType = 'basic' | 'crawler' | 'scout';

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
  // Storyline progress: storylineId -> number of steps completed
  storyProgress?: Record<string, number>;
  completedStorylines?: string[];
  // Unread emails awaiting display, and read-archive
  pendingEmails?: StoryEmail[];
  readEmails?: StoryEmail[];
}

export interface Junkyard {
  yardId: string;
  seed: number;
  width: number;
  height: number;
  revealedTiles: boolean[][];
  piles: JunkPile[];
  walls: WallTile[];
  terrain: TerrainTile[];
  droppedItems: DroppedItem[];
  // Story item attached to this yard (delivered on first pile search)
  pendingStoryItem?: { storylineId: string; stepIndex: number } | null;
}

export interface GameState {
  player: PlayerState;
  junkyard: Junkyard | null;
  turnCount: number;
}


// Default values for basic components
export const BASIC_BATTERY_CAPACITY = 20;
export const BASIC_STORAGE_WIDTH = 4;
export const BASIC_STORAGE_HEIGHT = 4;
export const BASIC_STORAGE_WEIGHT = 30;