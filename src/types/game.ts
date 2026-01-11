export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory = 'scrap' | 'component' | 'module' | 'junk' | 'battery';

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

export interface Junkyard {
  yardId: string;
  seed: number;
  width: number;
  height: number;
  revealedTiles: boolean[][];
  piles: JunkPile[];
  walls: WallTile[];
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

export type FrameType = 'crawler' | 'scout';

export interface HelperFrame {
  id: FrameType;
  name: string;
  carryBonus: number;
  moduleSlots: number;
  icon: string;
}

export interface HelperRobot {
  id: string;
  frameId: FrameType;
  modules: Item[];
  isDeployed: boolean;
}

export interface BaseUpgrades {
  bagWidth: number;
  bagHeight: number;
  bagMaxWeight: number;
  cleaningSlots: number;
  cleaningSpeed: number; // multiplier, 1.0 = base
  workshopTier: number;
  controlCapacity: number;
}

// Battery state - equipped battery determines max charge
export interface BatteryState {
  currentCharge: number;
  equippedBatteryId: string | null; // ID of battery item from stash, null = starter battery
}

export interface PlayerState {
  currency: number;
  bag: Bag;
  stash: Item[];
  currentYardId: string | null;
  baseUpgrades: BaseUpgrades;
  helpers: HelperRobot[];
  cleaningJobs: CleaningJob[];
  playerX: number;
  playerY: number;
  battery: BatteryState;
}

export interface GameState {
  player: PlayerState;
  junkyard: Junkyard | null;
  turnCount: number;
}

// Constants
export const STARTER_BATTERY_CAPACITY = 20;
