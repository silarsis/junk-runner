import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  PlayerState, 
  Junkyard, 
  JunkPile, 
  Item, 
  InventoryItem,
  CleaningJob,
  Rarity,
  ItemCategory,
  HelperRobot,
  Bag,
  TerrainTile,
  CleaningBot,
  CleaningBotPriority,
  InfiniteJunkyard,
  SerializableInfiniteJunkyard,
  BASIC_BATTERY_CAPACITY,
  BASIC_STORAGE_WIDTH,
  BASIC_STORAGE_HEIGHT,
  BASIC_STORAGE_WEIGHT,
} from '@/types/game';
import { 
  worldToChunk,
  worldToLocal,
  makeChunkKey,
  getChunkDistance,
  serializeInfiniteJunkyard,
  deserializeInfiniteJunkyard,
} from '@/types/chunk';
import { 
  ITEM_TEMPLATES, 
  RARITY_WEIGHTS, 
  getCleaningDuration,
  SHOP_BATTERIES,
  createBasicBattery,
  createBasicStorage,
  createBasicMobility,
  createBasicLauncher,
} from '@/data/itemTemplates';
import { generateJunkyard, isTilePassable, getTerrainAt, getEnemyAt, TERRAIN_DISPLAY } from '@/lib/terrainGenerator';
import { 
  createInfiniteJunkyard,
  revealTilesAroundWorld,
  isWorldTilePassable,
  getWorldTerrainAt,
  getWorldEnemyAt,
  getWorldWallAt,
  getWorldBarrierAt,
  getWorldPileAt,
  isAtEntrance,
  getOrGenerateChunk,
  generateLootForChunk,
  getChunkSafe,
  setChunkSafe,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
} from '@/lib/chunkGenerator';
import { processEnemyTurns, getAdjacentEnemies } from '@/lib/enemyAI';
import { getEnemyDefinition, Enemy } from '@/types/enemies';
import { 
  showEnemyEncounterToast, 
  getCollisionEffects, 
  getAdjacencyEffects,
  showAdjacencyWarningToast,
} from '@/components/game/EnemyEncounterToast';
import { HELPER_FRAMES, UPGRADES } from '@/data/upgradeData';
import { CraftingRecipe, hasIngredients } from '@/data/craftingRecipes';
import { TERRAIN_EFFECTS } from '@/components/game/TerrainToast';

const STORAGE_KEY = 'junkrunner_save';
const REVEAL_RADIUS = 2;
const SHOP_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Repair cost: 1 scrap per 10% condition restored
const REPAIR_SCRAP_NAME = 'Rusty Bolt';

// Shop item interface
export interface ShopItem {
  item: Item;
  buyPrice: number;
}


function createPrimaryHelper(): HelperRobot {
  return {
    id: 'primary-helper',
    frameId: 'basic',
    components: {
      mobility: createBasicMobility(),
      modules: [createBasicStorage()],
      battery: createBasicBattery(),
      launcher: createBasicLauncher(),
      loadedConsumables: [],
    },
    isDeployed: true,
    isPrimary: true,
  };
}

function createInitialPlayerState(): PlayerState {
  return {
    currency: 50,
    stash: [],
    currentYardId: null,
    baseUpgrades: {
      cleaningSlots: 0,
      cleaningSpeed: 0,
      workshopTier: 0,
      controlCapacity: 0,
      chargerEfficiency: 0,
      baseRechargeRate: 0,
    },
    helpers: [createPrimaryHelper()],
    cleaningJobs: [],
    playerX: 0,
    playerY: 0,
    currentCharge: BASIC_BATTERY_CAPACITY,
    automation: {
      cleaningBot: null,
    },
  };
}

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function revealTilesAround(junkyard: Junkyard, x: number, y: number): Junkyard {
  const newRevealed = junkyard.revealedTiles.map(row => [...row]);
  
  for (let dy = -REVEAL_RADIUS; dy <= REVEAL_RADIUS; dy++) {
    for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < junkyard.width && ny >= 0 && ny < junkyard.height) {
        newRevealed[ny][nx] = true;
      }
    }
  }
  
  return { ...junkyard, revealedTiles: newRevealed };
}

function pickRarity(random: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = random() * total;
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return rarity as Rarity;
  }
  return 'common';
}

function generateLoot(seed: number): Item[] {
  const random = seededRandom(seed);
  const itemCount = 1 + Math.floor(random() * 3);
  const items: Item[] = [];
  
  for (let i = 0; i < itemCount; i++) {
    const rarity = pickRarity(random);
    const templates = ITEM_TEMPLATES.filter(t => t.rarity === rarity);
    if (templates.length === 0) continue;
    
    const template = templates[Math.floor(random() * templates.length)];
    
    items.push({
      id: uuidv4(),
      name: template.name,
      category: template.category,
      rarity: template.rarity,
      condition: 20 + Math.floor(random() * 60),
      isDirty: random() > 0.3,
      sizeW: template.sizeW,
      sizeH: template.sizeH,
      weight: template.weight,
      baseValue: template.baseValue,
      hiddenModifiers: [],
      revealedModifiers: [],
      icon: template.icon,
      batteryCapacity: template.batteryCapacity,
      storageWidth: template.storageWidth,
      storageHeight: template.storageHeight,
      storageMaxWeight: template.storageMaxWeight,
      movementType: template.movementType,
      solarRegenRate: template.solarRegenRate,
      pileRevealCount: template.pileRevealCount,
    });
  }
  
  return items;
}

// Generate shop inventory - only scrap and components, no modules/storage/junk
function generateShopInventory(seed: number): ShopItem[] {
  const random = seededRandom(seed);
  // Random number of items 4-8
  const itemCount = 4 + Math.floor(random() * 5);
  const items: ShopItem[] = [];
  
  // Filter templates to only scrap and components
  const shopTemplates = ITEM_TEMPLATES.filter(
    t => t.category === 'scrap' || t.category === 'component'
  );
  
  for (let i = 0; i < itemCount; i++) {
    const rarity = pickRarity(random);
    const templates = shopTemplates.filter(t => t.rarity === rarity);
    if (templates.length === 0) continue;
    
    const template = templates[Math.floor(random() * templates.length)];
    
    // Create a clean item at full condition
    const item: Item = {
      id: uuidv4(),
      name: template.name,
      category: template.category,
      rarity: template.rarity,
      condition: 100, // Always clean/full condition
      isDirty: false,
      sizeW: template.sizeW,
      sizeH: template.sizeH,
      weight: template.weight,
      baseValue: template.baseValue,
      hiddenModifiers: [],
      revealedModifiers: [],
      icon: template.icon,
    };
    
    // Calculate buy price: 110% of the clean item sell value
    const rarityMult: Record<Rarity, number> = {
      common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8
    };
    const cleanSellPrice = Math.floor(template.baseValue * rarityMult[template.rarity]);
    const buyPrice = Math.ceil(cleanSellPrice * 1.1);
    
    items.push({ item, buyPrice });
  }
  
  return items;
}

// Get the next shop refresh time based on current time
function getNextShopRefreshTime(currentTime: number = Date.now()): number {
  // Round up to the next 30-minute interval
  const intervalStart = Math.floor(currentTime / SHOP_REFRESH_INTERVAL) * SHOP_REFRESH_INTERVAL;
  return intervalStart + SHOP_REFRESH_INTERVAL;
}

// Get the bag (storage) from the primary helper's storage module
function getBagFromHelper(helper: HelperRobot): Bag {
  const storageModule = helper.components.modules.find(m => m?.category === 'storage');
  if (storageModule && storageModule.storageWidth && storageModule.storageHeight) {
    return {
      width: storageModule.storageWidth,
      height: storageModule.storageHeight,
      maxWeight: storageModule.storageMaxWeight || BASIC_STORAGE_WEIGHT,
      items: [],
    };
  }
  // Default fallback
  return {
    width: BASIC_STORAGE_WIDTH,
    height: BASIC_STORAGE_HEIGHT,
    maxWeight: BASIC_STORAGE_WEIGHT,
    items: [],
  };
}

// Get max battery capacity from helper's battery
function getMaxBatteryCapacity(helper: HelperRobot): number {
  const battery = helper.components.battery;
  if (battery?.batteryCapacity) {
    return battery.batteryCapacity;
  }
  return BASIC_BATTERY_CAPACITY;
}

// Get solar regen rate from helper modules (lowest = best)
function getSolarRegenRate(helper: HelperRobot): number | null {
  const solarModules = helper.components.modules.filter(m => m?.solarRegenRate);
  if (solarModules.length === 0) return null;
  // Return the best (lowest) regen rate
  return Math.min(...solarModules.map(m => m.solarRegenRate!));
}

// Calculate solar charge regen for a turn
function calculateSolarRegen(turnCount: number, regenRate: number, maxCharge: number, currentCharge: number): number {
  if (turnCount % regenRate === 0) {
    return Math.min(1, maxCharge - currentCharge);
  }
  return 0;
}

// Get pile scanner reveal count from helper modules (highest = best)
function getHelperPileRevealCount(helper: HelperRobot): number {
  const scannerModules = helper.components.modules.filter(m => m?.pileRevealCount);
  if (scannerModules.length === 0) return 0;
  // Return the best (highest) reveal count
  return Math.max(...scannerModules.map(m => m.pileRevealCount!));
}

// Get primary helper
function getPrimaryHelper(player: PlayerState): HelperRobot | undefined {
  return player.helpers.find(h => h.isPrimary);
}

function canFitItem(bag: { width: number; height: number; items: InventoryItem[] }, item: Item, gridX: number, gridY: number, rotated: boolean): boolean {
  const w = rotated ? item.sizeH : item.sizeW;
  const h = rotated ? item.sizeW : item.sizeH;
  
  if (gridX < 0 || gridY < 0 || gridX + w > bag.width || gridY + h > bag.height) {
    return false;
  }
  
  for (const existing of bag.items) {
    const ew = existing.rotated ? existing.sizeH : existing.sizeW;
    const eh = existing.rotated ? existing.sizeW : existing.sizeH;
    
    const overlaps = !(
      gridX + w <= existing.gridX ||
      existing.gridX + ew <= gridX ||
      gridY + h <= existing.gridY ||
      existing.gridY + eh <= gridY
    );
    
    if (overlaps) return false;
  }
  
  return true;
}

function findFreeSlot(bag: { width: number; height: number; items: InventoryItem[] }, item: Item): { x: number; y: number; rotated: boolean } | null {
  // Try normal orientation
  for (let y = 0; y <= bag.height - item.sizeH; y++) {
    for (let x = 0; x <= bag.width - item.sizeW; x++) {
      if (canFitItem(bag, item, x, y, false)) {
        return { x, y, rotated: false };
      }
    }
  }
  
  // Try rotated
  if (item.sizeW !== item.sizeH) {
    for (let y = 0; y <= bag.height - item.sizeW; y++) {
      for (let x = 0; x <= bag.width - item.sizeH; x++) {
        if (canFitItem(bag, item, x, y, true)) {
          return { x, y, rotated: true };
        }
      }
    }
  }
  
  return null;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Runtime bag state (not persisted directly, derived from helper)
  const [bagItems, setBagItems] = useState<InventoryItem[]>([]);
  // Found items for alert display
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  // Last terrain stepped on for notification
  const [lastTerrainType, setLastTerrainType] = useState<TerrainTile | null>(null);
  // Shop state - persisted separately
  const [shopInventory, setShopInventory] = useState<ShopItem[]>([]);
  const [shopRefreshTime, setShopRefreshTime] = useState<number>(0);
  
  // Generate or refresh shop inventory when needed
  useEffect(() => {
    const now = Date.now();

    let storedShop: string | null = null;
    try {
      storedShop = localStorage.getItem('junkrunner_shop');
    } catch (err) {
      console.warn('Shop storage unavailable; regenerating shop inventory.', err);
    }

    if (storedShop) {
      try {
        const parsed = JSON.parse(storedShop);
        if (parsed.refreshTime && parsed.refreshTime > now && Array.isArray(parsed.inventory)) {
          // Shop is still valid
          setShopInventory(parsed.inventory);
          setShopRefreshTime(parsed.refreshTime);
          return;
        }
      } catch (e) {
        // Invalid data, regenerate
      }
    }

    // Generate new shop inventory
    const seed = Math.floor(now / SHOP_REFRESH_INTERVAL);
    const newInventory = generateShopInventory(seed);
    const newRefreshTime = getNextShopRefreshTime(now);

    setShopInventory(newInventory);
    setShopRefreshTime(newRefreshTime);

    // Save to localStorage
    try {
      localStorage.setItem(
        'junkrunner_shop',
        JSON.stringify({
          inventory: newInventory,
          refreshTime: newRefreshTime,
        }),
      );
    } catch (err) {
      console.warn('Failed to persist shop inventory.', err);
    }
  }, []);
  
  // Check for shop refresh periodically
  useEffect(() => {
    const checkRefresh = () => {
      const now = Date.now();
      if (now >= shopRefreshTime && shopRefreshTime > 0) {
        const seed = Math.floor(now / SHOP_REFRESH_INTERVAL);
        const newInventory = generateShopInventory(seed);
        const newRefreshTime = getNextShopRefreshTime(now);

        setShopInventory(newInventory);
        setShopRefreshTime(newRefreshTime);

        try {
          localStorage.setItem(
            'junkrunner_shop',
            JSON.stringify({
              inventory: newInventory,
              refreshTime: newRefreshTime,
            }),
          );
        } catch (err) {
          console.warn('Failed to persist refreshed shop inventory.', err);
        }
      }
    };

    // Check every minute
    const intervalId = setInterval(checkRefresh, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [shopRefreshTime]);

  // Cleaning bot automation - runs every second to auto-collect and queue items
  // Use refs to track notifications without causing re-renders
  const lastCollectedRef = useRef<string[]>([]);
  const lastQueuedRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (!gameState) return;
    
    const bot = gameState.player.automation.cleaningBot;
    if (!bot || !bot.isActive) return;
    
    const processCleaningBot = () => {
      let collectedItems: string[] = [];
      let queuedItems: string[] = [];
      
      setGameState(prev => {
        if (!prev) return prev;
        
        const currentBot = prev.player.automation.cleaningBot;
        if (!currentBot || !currentBot.isActive) return prev;
        
        const now = Date.now();
        let newStash = [...prev.player.stash];
        let newJobs = [...prev.player.cleaningJobs];
        let hasChanges = false;
        
        // Step 1: Auto-collect completed cleaning jobs
        const completedJobs = newJobs.filter(job => {
          const elapsed = now - job.startTime;
          return elapsed >= job.duration;
        });
        
        if (completedJobs.length > 0) {
          hasChanges = true;
          
          // Track collected items for notification
          collectedItems = completedJobs.map(job => job.item.name);
          
          // Move completed items to stash (cleaned)
          for (const job of completedJobs) {
            const cleanedItem: Item = {
              ...job.item,
              isDirty: false,
            };
            newStash.push(cleanedItem);
          }
          
          // Remove completed jobs
          const completedIds = new Set(completedJobs.map(j => j.jobId));
          newJobs = newJobs.filter(j => !completedIds.has(j.jobId));
        }
        
        // Step 2: Queue new dirty items if slots are available
        const maxSlots = 1 + prev.player.baseUpgrades.cleaningSlots;
        const availableSlots = maxSlots - newJobs.length;
        
        if (availableSlots > 0) {
          // Get dirty items from stash (use newStash since we may have just added items)
          const dirtyItems = newStash.filter(item => item.isDirty);
          
          if (dirtyItems.length > 0) {
            // Sort by priority
            const { rarityOrder, categoryOrder } = currentBot.priority;
            
            const sortedDirty = [...dirtyItems].sort((a, b) => {
              const rarityA = rarityOrder.indexOf(a.rarity);
              const rarityB = rarityOrder.indexOf(b.rarity);
              if (rarityA !== rarityB) return rarityA - rarityB;
              
              const categoryA = categoryOrder.indexOf(a.category);
              const categoryB = categoryOrder.indexOf(b.category);
              return categoryA - categoryB;
            });
            
            // Take items to auto-clean (limited by available slots)
            const itemsToClean = sortedDirty.slice(0, availableSlots);
            
            if (itemsToClean.length > 0) {
              hasChanges = true;
              
              // Track queued items for notification
              queuedItems = itemsToClean.map(i => i.name);
              
              // Calculate cleaning speed multiplier
              const speedMultiplier = 1 + prev.player.baseUpgrades.cleaningSpeed * 0.2;
              
              // Create cleaning jobs
              const newCleaningJobs: CleaningJob[] = itemsToClean.map(item => ({
                jobId: uuidv4(),
                itemId: item.id,
                item: { ...item },
                startTime: now,
                duration: getCleaningDuration(item, speedMultiplier),
              }));
              
              // Remove items from stash
              const itemIdsToRemove = new Set(itemsToClean.map(i => i.id));
              newStash = newStash.filter(i => !itemIdsToRemove.has(i.id));
              
              // Add new jobs
              newJobs = [...newJobs, ...newCleaningJobs];
            }
          }
        }
        
        if (!hasChanges) return prev;
        
        return {
          ...prev,
          player: {
            ...prev.player,
            stash: newStash,
            cleaningJobs: newJobs,
            automation: {
              ...prev.player.automation,
              cleaningBot: {
                ...currentBot,
                lastProcessedTime: now,
              },
            },
          },
        };
      });
      
      // Show toast notifications after state update (outside setGameState)
      if (collectedItems.length > 0) {
        const itemList = collectedItems.length <= 2 
          ? collectedItems.join(', ') 
          : `${collectedItems.slice(0, 2).join(', ')} +${collectedItems.length - 2} more`;
        toast({
          title: "🤖 Bot: Cleaned",
          description: itemList,
          duration: 3000,
        });
      }
      
      if (queuedItems.length > 0) {
        const itemList = queuedItems.length <= 2 
          ? queuedItems.join(', ') 
          : `${queuedItems.slice(0, 2).join(', ')} +${queuedItems.length - 2} more`;
        toast({
          title: "🤖 Bot: Queued for cleaning",
          description: itemList,
          duration: 3000,
        });
      }
    };
    
    // Run immediately and then every second
    processCleaningBot();
    const intervalId = setInterval(processCleaningBot, 1000);
    
    return () => clearInterval(intervalId);
  }, [gameState?.player.automation.cleaningBot?.isActive]);

  // Load game state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Basic validation: ensure we can safely mutate the loaded save
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid save data');
        }

        // Migration: ensure player exists and is an object
        if (!('player' in parsed) || !parsed.player || typeof parsed.player !== 'object') {
          parsed.player = createInitialPlayerState();
        }

        // Migration: ensure baseUpgrades exists and has numeric fields
        if (!parsed.player.baseUpgrades || typeof parsed.player.baseUpgrades !== 'object') {
          parsed.player.baseUpgrades = {
          cleaningSlots: 0,
          cleaningSpeed: 0,
          workshopTier: 0,
          controlCapacity: 0,
          chargerEfficiency: 0,
          baseRechargeRate: 0,
        };
        }
        const bu = parsed.player.baseUpgrades as Record<string, unknown>;
        const ensureNumber = (key: string, fallback = 0) => {
          const v = bu[key];
          bu[key] = typeof v === 'number' && !isNaN(v) ? v : fallback;
        };
        ensureNumber('cleaningSlots');
        ensureNumber('cleaningSpeed');
        ensureNumber('workshopTier');
        ensureNumber('controlCapacity');
        ensureNumber('chargerEfficiency');
        ensureNumber('baseRechargeRate');

        // Migration: ensure arrays exist
        if (!Array.isArray(parsed.player.stash)) {
          parsed.player.stash = [];
        }
        if (!Array.isArray(parsed.player.cleaningJobs)) {
          parsed.player.cleaningJobs = [];
        }

        const isRecord = (v: unknown): v is Record<string, unknown> =>
          !!v && typeof v === 'object' && !Array.isArray(v);

        const isFiniteNumber = (v: unknown): v is number =>
          typeof v === 'number' && Number.isFinite(v);

        const isValidItem = (v: unknown): v is Item => {
          if (!isRecord(v)) return false;
          return (
            typeof v.id === 'string' &&
            typeof v.name === 'string' &&
            typeof v.icon === 'string' &&
            typeof v.category === 'string' &&
            typeof v.rarity === 'string' &&
            isFiniteNumber(v.condition) &&
            typeof v.isDirty === 'boolean' &&
            isFiniteNumber(v.sizeW) &&
            isFiniteNumber(v.sizeH) &&
            isFiniteNumber(v.weight) &&
            isFiniteNumber(v.baseValue)
          );
        };

        const normalizeItemArrays = (item: Item) => {
          const rec = item as unknown as Record<string, unknown>;
          if (!Array.isArray(rec.hiddenModifiers)) rec.hiddenModifiers = [];
          if (!Array.isArray(rec.revealedModifiers)) rec.revealedModifiers = [];
        };

        // Drop any corrupted stash entries (prevents UI crashes)
        parsed.player.stash = (parsed.player.stash as unknown[]).filter(isValidItem);
        (parsed.player.stash as Item[]).forEach(normalizeItemArrays);

        const isValidCleaningJob = (v: unknown): v is CleaningJob => {
          if (!isRecord(v)) return false;
          return (
            typeof v.jobId === 'string' &&
            isRecord(v.item) &&
            isValidItem(v.item) &&
            isFiniteNumber(v.startTime) &&
            isFiniteNumber(v.duration)
          );
        };

        parsed.player.cleaningJobs = (parsed.player.cleaningJobs as unknown[]).filter(isValidCleaningJob);

        // Migration: ensure automation state exists and is valid
        if (!parsed.player.automation || typeof parsed.player.automation !== 'object') {
          parsed.player.automation = { cleaningBot: null };
        } else {
          // Validate cleaningBot if it exists
          const bot = parsed.player.automation.cleaningBot;
          if (bot !== null) {
            // Check if bot has valid structure
            const isBotValid = isRecord(bot) &&
              typeof bot.id === 'string' &&
              typeof bot.isActive === 'boolean' &&
              isRecord(bot.priority) &&
              Array.isArray(bot.priority.rarityOrder) &&
              Array.isArray(bot.priority.categoryOrder);
            
            if (!isBotValid) {
              // Bot data is corrupted, reset it
              parsed.player.automation.cleaningBot = null;
            } else {
              // Ensure priority arrays have all required values (in case new rarities/categories were added)
              const validRarities: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
              const validCategories: ItemCategory[] = ['component', 'module', 'battery', 'mobility', 'storage', 'scrap', 'junk'];
              
              const priority = bot.priority as { rarityOrder: string[]; categoryOrder: string[] };
              
              // Filter to only valid rarities and add any missing ones at the end
              const existingRarities = priority.rarityOrder.filter(r => validRarities.includes(r as Rarity));
              const missingRarities = validRarities.filter(r => !existingRarities.includes(r));
              parsed.player.automation.cleaningBot.priority.rarityOrder = [...existingRarities, ...missingRarities] as Rarity[];
              
              // Filter to only valid categories and add any missing ones at the end
              const existingCategories = priority.categoryOrder.filter(c => validCategories.includes(c as ItemCategory));
              const missingCategories = validCategories.filter(c => !existingCategories.includes(c));
              parsed.player.automation.cleaningBot.priority.categoryOrder = [...existingCategories, ...missingCategories] as ItemCategory[];
              
              // Ensure lastProcessedTime exists
              if (typeof bot.lastProcessedTime !== 'number') {
                parsed.player.automation.cleaningBot.lastProcessedTime = 0;
              }
            }
          }
        }

        // Migration: ensure helpers exist and include a valid primary helper
        const isValidHelper = (h: unknown): h is HelperRobot => {
          if (!isRecord(h)) return false;
          return (
            typeof h.id === 'string' &&
            typeof h.frameId === 'string' &&
            isRecord(h.components) &&
            isRecord(h.components.mobility) &&
            isRecord(h.components.battery) &&
            Array.isArray(h.components.modules)
          );
        };

        if (
          !Array.isArray(parsed.player.helpers) ||
          parsed.player.helpers.length === 0 ||
          !(parsed.player.helpers as unknown[]).some((h) => isRecord(h) && (h as any).isPrimary)
        ) {
          parsed.player.helpers = [createPrimaryHelper()];
        }

        const primary = (parsed.player.helpers as unknown[]).find((h) => isRecord(h) && (h as any).isPrimary);
        if (!primary || !isValidHelper(primary)) {
          parsed.player.helpers = [createPrimaryHelper()];
        } else {
          parsed.player.helpers = (parsed.player.helpers as unknown[]).filter(isValidHelper) as HelperRobot[];
        }

        // Load bag items from storage
        if (!Array.isArray(parsed.bagItems)) {
          parsed.bagItems = [];
        }

        const isValidInventoryItem = (v: unknown): v is InventoryItem => {
          if (!isValidItem(v)) return false;
          const rec = v as unknown as Record<string, unknown>;
          return (
            isFiniteNumber(rec.gridX) &&
            isFiniteNumber(rec.gridY) &&
            typeof rec.rotated === 'boolean'
          );
        };

        parsed.bagItems = (parsed.bagItems as unknown[]).filter(isValidInventoryItem);
        (parsed.bagItems as InventoryItem[]).forEach(normalizeItemArrays);
        setBagItems(parsed.bagItems);

        // Migration: ensure junkyardSeed exists
        if (typeof parsed.junkyardSeed !== 'number') {
          parsed.junkyardSeed = parsed.junkyard?.seed ?? Date.now();
        }

        // Migration: ensure junkyard piles have requiredTurns
        if (parsed.junkyard?.piles) {
          parsed.junkyard.piles = parsed.junkyard.piles.map((pile: JunkPile) => ({
            ...pile,
            requiredTurns: pile.requiredTurns ?? (1 + Math.floor(Math.random() * 5)),
          }));
        }

        // Migration: ensure junkyard enemies array exists
        if (parsed.junkyard && !Array.isArray(parsed.junkyard.enemies)) {
          parsed.junkyard.enemies = [];
        }

        // Migration: deserialize infiniteJunkyard chunks from object to Map
        if (parsed.infiniteJunkyard && parsed.infiniteJunkyard.chunks) {
          // Check if chunks is not already a Map (loaded from localStorage as object)
          if (!(parsed.infiniteJunkyard.chunks instanceof Map)) {
            parsed.infiniteJunkyard = deserializeInfiniteJunkyard(parsed.infiniteJunkyard);
          }
        }

        setGameState(parsed);
      } catch (err) {
        console.error('Failed to load save; resetting to fresh state.', err);
        // If the save is corrupted, clear it so the app can recover reliably.
        localStorage.removeItem(STORAGE_KEY);
        setBagItems([]);
        setGameState({
          player: createInitialPlayerState(),
          infiniteJunkyard: null,
          junkyard: null,
          junkyardSeed: Date.now(),
          turnCount: 0,
        });
      }
    } else {
      setGameState({
        player: createInitialPlayerState(),
        infiniteJunkyard: null,
        junkyard: null,
        junkyardSeed: Date.now(),
        turnCount: 0,
      });
    }
    setIsLoading(false);
  }, []);

  // Save game state
  useEffect(() => {
    if (gameState && !isLoading) {
      // Serialize infiniteJunkyard's Map to plain object for localStorage
      const saveData = {
        ...gameState,
        infiniteJunkyard: gameState.infiniteJunkyard 
          ? serializeInfiniteJunkyard(gameState.infiniteJunkyard)
          : null,
        bagItems,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      } catch (err) {
        console.error('Failed to persist save data (storage quota/blocked?).', err);
      }
    }
  }, [gameState, bagItems, isLoading]);

  // Passive base recharge timer - only when at base (not in junkyard)
  useEffect(() => {
    if (!gameState || isLoading) return;
    
    // Only recharge when at base (no currentYardId means at base)
    const isAtBase = !gameState.player.currentYardId;
    if (!isAtBase) return;
    
    const primary = getPrimaryHelper(gameState.player);
    if (!primary) return;
    
    const maxCharge = getMaxBatteryCapacity(primary);
    if (gameState.player.currentCharge >= maxCharge) return;
    
    // Get recharge rate from upgrade (default 300s = 5 min, min 60s = 1 min)
    const upgradeLevel = gameState.player.baseUpgrades.baseRechargeRate || 0;
    const rechargeIntervalSeconds = 300 - (upgradeLevel * 60); // 300, 240, 180, 120, 60
    
    const intervalId = setInterval(() => {
      setGameState(prev => {
        if (!prev) return prev;
        const primaryHelper = getPrimaryHelper(prev.player);
        if (!primaryHelper) return prev;
        
        const max = getMaxBatteryCapacity(primaryHelper);
        if (prev.player.currentCharge >= max) return prev;
        
        return {
          ...prev,
          player: {
            ...prev.player,
            currentCharge: Math.min(prev.player.currentCharge + 1, max),
          },
        };
      });
    }, rechargeIntervalSeconds * 1000);
    
    return () => clearInterval(intervalId);
  }, [gameState?.player.currentYardId, gameState?.player.baseUpgrades.baseRechargeRate, gameState?.player.currentCharge, isLoading]);

  // Get current bag dimensions from primary helper
  const getCurrentBag = useCallback((): Bag => {
    if (!gameState) {
      return { width: BASIC_STORAGE_WIDTH, height: BASIC_STORAGE_HEIGHT, maxWeight: BASIC_STORAGE_WEIGHT, items: bagItems };
    }
    const primary = getPrimaryHelper(gameState.player);
    if (!primary) {
      return { width: BASIC_STORAGE_WIDTH, height: BASIC_STORAGE_HEIGHT, maxWeight: BASIC_STORAGE_WEIGHT, items: bagItems };
    }
    const baseBag = getBagFromHelper(primary);
    return { ...baseBag, items: bagItems };
  }, [gameState, bagItems]);

  const enterJunkyard = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      let infiniteJunkyard = prev.infiniteJunkyard;
      
      if (!infiniteJunkyard) {
        // Use the stored seed for the junkyard
        const seed = prev.junkyardSeed;
        infiniteJunkyard = createInfiniteJunkyard(seed, prev.player.currency);
      }
      
      // Always start at entrance when entering/re-entering
      const playerX = infiniteJunkyard.entranceX;
      const playerY = infiniteJunkyard.entranceY;
      
      // Reveal tiles around player position
      infiniteJunkyard = revealTilesAroundWorld(infiniteJunkyard, playerX, playerY, REVEAL_RADIUS, prev.player.currency);
      
      return {
        ...prev,
        infiniteJunkyard,
        junkyard: null, // Clear legacy junkyard
        player: { ...prev.player, currentYardId: infiniteJunkyard.yardId, playerX, playerY },
      };
    });
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      if (!prev || !prev.infiniteJunkyard) return prev;
      
      const newX = prev.player.playerX + dx;
      const newY = prev.player.playerY + dy;
      
      // Check battery
      if (prev.player.currentCharge <= 0) {
        return prev;
      }
      
      // Get movement type and mobility name from primary helper
      const primary = getPrimaryHelper(prev.player);
      const mobility = primary?.components.mobility;
      const movementType = mobility?.movementType || 'basic';
      const mobilityName = mobility?.name?.toLowerCase() || '';
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      // Validate move based on movement type
      let isValidMove = false;
      switch (movementType) {
        case 'basic':
          isValidMove = (absDx + absDy === 1) && (absDx <= 1 && absDy <= 1);
          break;
        case 'extended':
          isValidMove = ((absDx === 0 && absDy >= 1 && absDy <= 2) || (absDy === 0 && absDx >= 1 && absDx <= 2));
          break;
        case 'diagonal':
          isValidMove = (absDx <= 1 && absDy <= 1) && (absDx + absDy >= 1);
          break;
        case 'jump':
          isValidMove = (absDx <= 2 && absDy <= 2) && (absDx + absDy >= 1);
          break;
      }
      
      if (!isValidMove) {
        return prev;
      }
      
      // Ensure target chunk is generated
      let updatedJunkyard = prev.infiniteJunkyard;
      const targetChunkCoord = worldToChunk(newX, newY, CHUNK_WIDTH, CHUNK_HEIGHT);
      const { junkyard: withTargetChunk } = getOrGenerateChunk(
        updatedJunkyard,
        targetChunkCoord.chunkX,
        targetChunkCoord.chunkY,
        prev.player.currency
      );
      updatedJunkyard = withTargetChunk;
      
      // Check passability using world coordinates
      const isPassable = isWorldTilePassable(updatedJunkyard, newX, newY);
      
      // Spider legs can walk over walls
      const wallAtDest = getWorldWallAt(updatedJunkyard, newX, newY);
      const hasSpiderLegs = mobilityName.includes('spider');
      
      if (!isPassable && !(hasSpiderLegs && wallAtDest)) {
        return prev;
      }
      
      // Check for barriers
      const barrierAtDest = getWorldBarrierAt(updatedJunkyard, newX, newY);
      if (barrierAtDest && !barrierAtDest.isPassable) {
        return prev;
      }
      
      // Calculate battery cost
      let batteryCost = 1;
      
      // Check for terrain effects using world coordinates
      const destinationTerrain = getWorldTerrainAt(updatedJunkyard, newX, newY);
      let updatedBagItems = bagItems;
      
      // Show terrain notification
      if (destinationTerrain && movementType !== 'jump') {
        setLastTerrainType(destinationTerrain);
      } else {
        setLastTerrainType(null);
      }
      
      if (destinationTerrain && movementType !== 'jump') {
        switch (destinationTerrain.type) {
          case 'mud':
            if (!mobilityName.includes('tread') && !mobilityName.includes('track')) {
              batteryCost = 2;
            }
            break;
          case 'toxic':
            updatedBagItems = bagItems.map(item => ({
              ...item,
              condition: Math.max(0, item.condition - 5),
            }));
            break;
          case 'electric':
            batteryCost = 3;
            break;
          case 'oil':
          case 'oil_slick':
            break;
          case 'magnetic':
          case 'magnetic_floor':
            break;
          case 'fog':
          case 'cooling_fog':
            // Reveal only 1 tile around - handled after move
            break;
          case 'irradiated':
            batteryCost = 2;
            break;
          case 'cooling_trench':
            batteryCost = 2;
            break;
          case 'cratered':
            break;
          case 'cable_sprawl':
            if (!mobilityName.includes('cable')) {
              batteryCost = 2;
            }
            break;
          case 'broken_pavement':
            break;
          case 'neon_pool':
            batteryCost = 2;
            break;
          case 'assembly_line':
            break;
          case 'collapsed_catwalk':
            batteryCost = 2;
            break;
          case 'organic_sludge':
            batteryCost = 2;
            break;
          case 'flesh_mound':
            break;
          case 'drainage':
            break;
          case 'server_rack':
            break;
        }
      }
      
      // Apply component damage from terrain
      let updatedHelpers = [...prev.player.helpers];
      let componentDamageMessage = '';
      
      if (destinationTerrain && movementType !== 'jump') {
        const terrainConfig = TERRAIN_EFFECTS[destinationTerrain.type];
        
        if (terrainConfig?.damagesMobility && primary && mobility) {
          const newCondition = Math.max(0, mobility.condition - terrainConfig.damagesMobility);
          const updatedMobility = { ...mobility, condition: newCondition };
          
          updatedHelpers = updatedHelpers.map(h => 
            h.id === primary.id 
              ? { ...h, components: { ...h.components, mobility: updatedMobility } }
              : h
          );
          
          if (newCondition === 0) {
            componentDamageMessage = `${mobility.name} is now BROKEN!`;
          } else if (newCondition < 20) {
            componentDamageMessage = `${mobility.name} critically damaged (${newCondition}%)`;
          }
        }
        
        if (terrainConfig?.damagesFrame && primary) {
          const damageToBattery = primary.components.battery 
            ? { ...primary.components.battery, condition: Math.max(0, primary.components.battery.condition - terrainConfig.damagesFrame) }
            : null;
          const damageToMobility = primary.components.mobility
            ? { ...primary.components.mobility, condition: Math.max(0, primary.components.mobility.condition - terrainConfig.damagesFrame) }
            : null;
          const damageToModules = primary.components.modules.map(m => 
            m ? { ...m, condition: Math.max(0, m.condition - terrainConfig.damagesFrame) } : m
          );
          
          updatedHelpers = updatedHelpers.map(h => 
            h.id === primary.id 
              ? { 
                  ...h, 
                  components: { 
                    ...h.components, 
                    mobility: damageToMobility,
                    battery: damageToBattery,
                    modules: damageToModules,
                  } 
                }
              : h
          );
          
          componentDamageMessage = 'All components took radiation damage!';
        }
      }
      
      // Spider legs wall traversal costs 2x
      if (wallAtDest && hasSpiderLegs) {
        batteryCost = batteryCost * 2;
      }
      
      // Check if we have enough battery
      if (prev.player.currentCharge < batteryCost) {
        return prev;
      }
      
      // Check if mobility is broken (condition 0)
      const primaryHelper = updatedHelpers.find(h => h.isPrimary);
      const mobilityCondition = primaryHelper?.components.mobility?.condition ?? 100;
      if (mobilityCondition === 0) {
        componentDamageMessage = 'Mobility broken! Return to base for repairs!';
      }
      
      // Update bag items if toxic damage occurred
      if (updatedBagItems !== bagItems) {
        setBagItems(updatedBagItems);
      }
      
      // Store component damage message for display
      if (componentDamageMessage && destinationTerrain) {
        setLastTerrainType({ ...destinationTerrain, name: componentDamageMessage });
      }
      
      let finalX = newX;
      let finalY = newY;
      
      // Handle oil slick sliding
      if (destinationTerrain?.type === 'oil' && movementType !== 'jump') {
        const slideDistance = mobilityName.includes('racing') ? 2 : 1;
        const dirX = dx === 0 ? 0 : dx / absDx;
        const dirY = dy === 0 ? 0 : dy / absDy;
        
        for (let s = 1; s <= slideDistance; s++) {
          const slideX = newX + dirX * s;
          const slideY = newY + dirY * s;
          if (isWorldTilePassable(updatedJunkyard, slideX, slideY)) {
            finalX = slideX;
            finalY = slideY;
            // Reveal tiles along slide path
            updatedJunkyard = revealTilesAroundWorld(updatedJunkyard, slideX, slideY, REVEAL_RADIUS, prev.player.currency);
          } else {
            break;
          }
        }
      }
      
      // Reveal tiles around final position (respecting fog terrain)
      const revealRadius = (destinationTerrain?.type === 'fog' || destinationTerrain?.type === 'cooling_fog') ? 1 : REVEAL_RADIUS;
      updatedJunkyard = revealTilesAroundWorld(updatedJunkyard, finalX, finalY, revealRadius, prev.player.currency);
      
      const newTurnCount = prev.turnCount + 1;
      let newCharge = prev.player.currentCharge - batteryCost;
      
      // Solar panel regeneration
      const updatedPrimary = updatedHelpers.find(h => h.isPrimary);
      if (updatedPrimary) {
        const solarRate = getSolarRegenRate(updatedPrimary);
        if (solarRate !== null) {
          const maxCapacity = getMaxBatteryCapacity(updatedPrimary);
          const regenAmount = calculateSolarRegen(newTurnCount, solarRate, maxCapacity, newCharge);
          newCharge = Math.min(maxCapacity, newCharge + regenAmount);
        }
      }
      
      // Process enemies in the current chunk
      const { chunkX, chunkY } = worldToChunk(finalX, finalY, CHUNK_WIDTH, CHUNK_HEIGHT);
      const { localX: playerLocalX, localY: playerLocalY } = worldToLocal(finalX, finalY, CHUNK_WIDTH, CHUNK_HEIGHT);
      const currentChunk = getChunkSafe(updatedJunkyard, makeChunkKey(chunkX, chunkY));
      
      let enemyEncounter: Enemy | null = null;
      
      if (currentChunk && currentChunk.enemies && currentChunk.enemies.length > 0) {
        // Create a temporary legacy junkyard structure for enemy AI
        const tempJunkyard: Junkyard = {
          yardId: updatedJunkyard.yardId,
          seed: currentChunk.seed,
          biomeId: updatedJunkyard.biomeId,
          width: CHUNK_WIDTH,
          height: CHUNK_HEIGHT,
          revealedTiles: currentChunk.revealedTiles,
          piles: currentChunk.piles,
          walls: currentChunk.walls,
          terrain: currentChunk.terrain,
          barriers: currentChunk.barriers,
          droppedItems: currentChunk.droppedItems,
          enemies: currentChunk.enemies,
        };
        
        const { updatedEnemies, playerCollision } = processEnemyTurns(
          tempJunkyard,
          playerLocalX,
          playerLocalY
        );
        
        // Update chunk with new enemy positions
        const updatedChunk = { ...currentChunk, enemies: updatedEnemies };
        updatedJunkyard = setChunkSafe(updatedJunkyard, makeChunkKey(chunkX, chunkY), updatedChunk);
        
        enemyEncounter = playerCollision;
        
        // Check for adjacent enemies
        const adjacentEnemies = getAdjacentEnemies(updatedEnemies, playerLocalX, playerLocalY);
        const adjacencyDrainInfo: { definition: ReturnType<typeof getEnemyDefinition>; batteryDrain: number }[] = [];
        let totalHelperDamage = 0;
        let totalItemDamage = 0;
        
        if (adjacentEnemies.length > 0) {
          for (const enemy of adjacentEnemies) {
            const def = getEnemyDefinition(enemy.definitionId);
            if (!def) continue;
            
            const effects = getAdjacencyEffects(def, enemy.turnsStationary);
            
            if (effects.batteryDrain > 0) {
              newCharge = Math.max(0, newCharge - effects.batteryDrain);
              adjacencyDrainInfo.push({ definition: def, batteryDrain: effects.batteryDrain });
            }
            
            totalHelperDamage += effects.helperDamage || 0;
            totalItemDamage += effects.itemDamage || 0;
          }
          
          if (adjacencyDrainInfo.length > 0) {
            setTimeout(() => {
              showAdjacencyWarningToast(adjacencyDrainInfo.filter(e => e.definition) as { definition: NonNullable<typeof adjacencyDrainInfo[0]['definition']>; batteryDrain: number }[]);
            }, 0);
          }
        }
        
        // Handle direct collision with enemy
        if (enemyEncounter) {
          const def = getEnemyDefinition(enemyEncounter.definitionId);
          if (def) {
            const collisionEffects = getCollisionEffects(def);
            
            newCharge = Math.max(0, newCharge - (collisionEffects.batteryDrain || 0));
            totalHelperDamage += collisionEffects.helperDamage || 0;
            totalItemDamage += collisionEffects.itemDamage || 0;
            
            setTimeout(() => {
              showEnemyEncounterToast(collisionEffects);
            }, 0);
            
            if (collisionEffects.forcedReturn) {
              newCharge = 0;
            }
          }
        }
        
        // Apply accumulated helper damage
        if (totalHelperDamage > 0 && updatedPrimary) {
          updatedHelpers = updatedHelpers.map(h => {
            if (!h.isPrimary) return h;
            return {
              ...h,
              components: {
                ...h.components,
                battery: h.components.battery 
                  ? { ...h.components.battery, condition: Math.max(0, h.components.battery.condition - totalHelperDamage) }
                  : null,
                mobility: h.components.mobility
                  ? { ...h.components.mobility, condition: Math.max(0, h.components.mobility.condition - totalHelperDamage) }
                  : null,
                modules: h.components.modules.map(m => 
                  m ? { ...m, condition: Math.max(0, m.condition - totalHelperDamage) } : m
                ),
              },
            };
          });
        }
        
        // Apply accumulated item damage to bag
        if (totalItemDamage > 0) {
          updatedBagItems = updatedBagItems.map(item => ({
            ...item,
            condition: Math.max(0, item.condition - totalItemDamage),
          }));
          setBagItems(updatedBagItems);
        }
      }
      
      return {
        ...prev,
        infiniteJunkyard: updatedJunkyard,
        player: {
          ...prev.player, 
          playerX: finalX, 
          playerY: finalY,
          currentCharge: newCharge,
          helpers: updatedHelpers,
        },
        turnCount: newTurnCount,
      };
    });
  }, [bagItems]);

  const getCurrentPile = useCallback((): JunkPile | null => {
    if (!gameState?.infiniteJunkyard) return null;
    
    const { chunkX, chunkY } = worldToChunk(
      gameState.player.playerX,
      gameState.player.playerY,
      CHUNK_WIDTH,
      CHUNK_HEIGHT
    );
    const { localX, localY } = worldToLocal(
      gameState.player.playerX,
      gameState.player.playerY,
      CHUNK_WIDTH,
      CHUNK_HEIGHT
    );
    
    const chunk = getChunkSafe(gameState.infiniteJunkyard, makeChunkKey(chunkX, chunkY));
    if (!chunk) return null;
    
    return chunk.piles.find(
      p => p.x === localX && p.y === localY && !p.isDepleted
    ) || null;
  }, [gameState]);

  const searchPile = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.infiniteJunkyard) return prev;
      
      // Check battery
      if (prev.player.currentCharge <= 0) {
        return prev;
      }
      
      const { chunkX, chunkY } = worldToChunk(
        prev.player.playerX,
        prev.player.playerY,
        CHUNK_WIDTH,
        CHUNK_HEIGHT
      );
      const { localX, localY } = worldToLocal(
        prev.player.playerX,
        prev.player.playerY,
        CHUNK_WIDTH,
        CHUNK_HEIGHT
      );
      
      const chunkKey = makeChunkKey(chunkX, chunkY);
      const chunk = getChunkSafe(prev.infiniteJunkyard, chunkKey);
      if (!chunk) return prev;
      
      const pileIndex = chunk.piles.findIndex(
        p => p.x === localX && p.y === localY && !p.isDepleted
      );
      
      if (pileIndex === -1) return prev;
      
      const pile = chunk.piles[pileIndex];
      const newProgress = pile.progressTurns + 1;
      
      const updatedPiles = [...chunk.piles];
      let updatedJunkyard = prev.infiniteJunkyard;
      
      if (newProgress >= pile.requiredTurns) {
        // Generate loot with distance-based rarity
        const loot = generateLootForChunk(Date.now() + pileIndex, chunkX, chunkY);
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress, isDepleted: true };
        
        // Get current bag
        const primary = getPrimaryHelper(prev.player);
        const baseBag = primary ? getBagFromHelper(primary) : { width: BASIC_STORAGE_WIDTH, height: BASIC_STORAGE_HEIGHT, maxWeight: BASIC_STORAGE_WEIGHT, items: [] };
        
        // Try to add items to bag
        let newBagItems = [...bagItems];
        let currentWeight = newBagItems.reduce((sum, i) => sum + i.weight, 0);
        const bag = { ...baseBag, items: newBagItems };
        const collectedItems: Item[] = [];
        
        for (const item of loot) {
          if (currentWeight + item.weight <= bag.maxWeight) {
            const slot = findFreeSlot(bag, item);
            if (slot) {
              const invItem: InventoryItem = {
                ...item,
                gridX: slot.x,
                gridY: slot.y,
                rotated: slot.rotated,
              };
              newBagItems.push(invItem);
              bag.items = newBagItems;
              currentWeight += item.weight;
              collectedItems.push(item);
            }
          }
        }
        
        setBagItems(newBagItems);
        setFoundItems(collectedItems);
        
        const newTurnCount = prev.turnCount + 1;
        let newCharge = prev.player.currentCharge - 1;
        
        // Solar panel regeneration
        if (primary) {
          const solarRate = getSolarRegenRate(primary);
          if (solarRate !== null) {
            const maxCapacity = getMaxBatteryCapacity(primary);
            const regenAmount = calculateSolarRegen(newTurnCount, solarRate, maxCapacity, newCharge);
            newCharge = Math.min(maxCapacity, newCharge + regenAmount);
          }
        }
        
        // Update chunk with new pile state
        const updatedChunk = { ...chunk, piles: updatedPiles };
        
        // Process enemy turns in this chunk
        if (updatedChunk.enemies && updatedChunk.enemies.length > 0) {
          const tempJunkyard: Junkyard = {
            yardId: updatedJunkyard.yardId,
            seed: updatedChunk.seed,
            biomeId: updatedJunkyard.biomeId,
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            revealedTiles: updatedChunk.revealedTiles,
            piles: updatedChunk.piles,
            walls: updatedChunk.walls,
            terrain: updatedChunk.terrain,
            barriers: updatedChunk.barriers,
            droppedItems: updatedChunk.droppedItems,
            enemies: updatedChunk.enemies,
          };
          
          const { updatedEnemies } = processEnemyTurns(tempJunkyard, localX, localY);
          updatedChunk.enemies = updatedEnemies;
          
          // Check for adjacent enemies
          const adjacentEnemies = getAdjacentEnemies(updatedEnemies, localX, localY);
          const adjacencyDrainInfo: { definition: ReturnType<typeof getEnemyDefinition>; batteryDrain: number }[] = [];
          
          for (const enemy of adjacentEnemies) {
            const def = getEnemyDefinition(enemy.definitionId);
            if (!def) continue;
            
            const effects = getAdjacencyEffects(def, enemy.turnsStationary);
            if (effects.batteryDrain > 0) {
              newCharge = Math.max(0, newCharge - effects.batteryDrain);
              adjacencyDrainInfo.push({ definition: def, batteryDrain: effects.batteryDrain });
            }
          }
          
          if (adjacencyDrainInfo.length > 0) {
            setTimeout(() => {
              showAdjacencyWarningToast(adjacencyDrainInfo.filter(e => e.definition) as { definition: NonNullable<typeof adjacencyDrainInfo[0]['definition']>; batteryDrain: number }[]);
            }, 0);
          }
        }
        
        // Update chunks
        updatedJunkyard = setChunkSafe(updatedJunkyard, chunkKey, updatedChunk);
        
        return {
          ...prev,
          infiniteJunkyard: updatedJunkyard,
          player: { 
            ...prev.player, 
            currentCharge: newCharge,
          },
          turnCount: newTurnCount,
        };
      } else {
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress };
        
        const newTurnCount = prev.turnCount + 1;
        const primary = getPrimaryHelper(prev.player);
        let newCharge = prev.player.currentCharge - 1;
        
        // Solar panel regeneration
        if (primary) {
          const solarRate = getSolarRegenRate(primary);
          if (solarRate !== null) {
            const maxCapacity = getMaxBatteryCapacity(primary);
            const regenAmount = calculateSolarRegen(newTurnCount, solarRate, maxCapacity, newCharge);
            newCharge = Math.min(maxCapacity, newCharge + regenAmount);
          }
        }
        
        // Update chunk with new pile state
        const updatedChunk = { ...chunk, piles: updatedPiles };
        
        // Process enemy turns in this chunk
        if (updatedChunk.enemies && updatedChunk.enemies.length > 0) {
          const tempJunkyard: Junkyard = {
            yardId: updatedJunkyard.yardId,
            seed: updatedChunk.seed,
            biomeId: updatedJunkyard.biomeId,
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            revealedTiles: updatedChunk.revealedTiles,
            piles: updatedChunk.piles,
            walls: updatedChunk.walls,
            terrain: updatedChunk.terrain,
            barriers: updatedChunk.barriers,
            droppedItems: updatedChunk.droppedItems,
            enemies: updatedChunk.enemies,
          };
          
          const { updatedEnemies } = processEnemyTurns(tempJunkyard, localX, localY);
          updatedChunk.enemies = updatedEnemies;
          
          // Check for adjacent enemies
          const adjacentEnemies = getAdjacentEnemies(updatedEnemies, localX, localY);
          const adjacencyDrainInfo: { definition: ReturnType<typeof getEnemyDefinition>; batteryDrain: number }[] = [];
          
          for (const enemy of adjacentEnemies) {
            const def = getEnemyDefinition(enemy.definitionId);
            if (!def) continue;
            
            const effects = getAdjacencyEffects(def, enemy.turnsStationary);
            if (effects.batteryDrain > 0) {
              newCharge = Math.max(0, newCharge - effects.batteryDrain);
              adjacencyDrainInfo.push({ definition: def, batteryDrain: effects.batteryDrain });
            }
          }
          
          if (adjacencyDrainInfo.length > 0) {
            setTimeout(() => {
              showAdjacencyWarningToast(adjacencyDrainInfo.filter(e => e.definition) as { definition: NonNullable<typeof adjacencyDrainInfo[0]['definition']>; batteryDrain: number }[]);
            }, 0);
          }
        }
        
        // Update chunks
        updatedJunkyard = setChunkSafe(updatedJunkyard, chunkKey, updatedChunk);
        
        return {
          ...prev,
          infiniteJunkyard: updatedJunkyard,
          player: { 
            ...prev.player, 
            currentCharge: newCharge,
          },
          turnCount: newTurnCount,
        };
      }
    });
  }, [bagItems]);

  // Calculate charging cost based on charger efficiency upgrade
  const getChargingCost = useCallback((chargeNeeded: number, chargerLevel: number): number => {
    const costPerUnit = UPGRADES.chargerEfficiency.getValue(chargerLevel);
    return Math.ceil(chargeNeeded * costPerUnit);
  }, []);

  const returnToBase = useCallback((shouldRecharge: boolean = false) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const primary = getPrimaryHelper(prev.player);
      const maxCapacity = primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
      
      if (!shouldRecharge) {
        // Just return without recharging
        return {
          ...prev,
          player: { 
            ...prev.player, 
            currentYardId: null,
          },
        };
      }
      
      // Calculate recharge cost
      const chargeNeeded = maxCapacity - prev.player.currentCharge;
      const chargerLevel = prev.player.baseUpgrades.chargerEfficiency ?? 0;
      const chargingCost = getChargingCost(chargeNeeded, chargerLevel);
      
      // Check if player can afford it
      if (prev.player.currency < chargingCost) {
        // Can't afford full recharge - charge as much as possible
        const costPerUnit = UPGRADES.chargerEfficiency.getValue(chargerLevel);
        const affordableCharge = Math.floor(prev.player.currency / costPerUnit);
        const actualCharge = Math.min(affordableCharge, chargeNeeded);
        const actualCost = getChargingCost(actualCharge, chargerLevel);
        
        return {
          ...prev,
          player: { 
            ...prev.player, 
            currentYardId: null,
            currentCharge: prev.player.currentCharge + actualCharge,
            currency: prev.player.currency - actualCost,
          },
        };
      }
      
      return {
        ...prev,
        player: { 
          ...prev.player, 
          currentYardId: null,
          currentCharge: maxCapacity,
          currency: prev.player.currency - chargingCost,
        },
      };
    });
  }, [getChargingCost]);

  const moveToNextJunkyard = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Generate a new seed for the next junkyard (wipes and regenerates)
      const newSeed = Date.now();
      
      return {
        ...prev,
        infiniteJunkyard: null, // Clear current junkyard, will be generated on enter
        junkyard: null, // Clear legacy junkyard too
        junkyardSeed: newSeed,
        player: { ...prev.player, playerX: 0, playerY: 0, currentYardId: null },
      };
    });
  }, []);

  const startCleaning = useCallback((itemId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const itemIndex = prev.player.stash.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return prev;
      
      const item = prev.player.stash[itemIndex];
      if (!item.isDirty) return prev;
      
      const maxSlots = 1 + prev.player.baseUpgrades.cleaningSlots;
      if (prev.player.cleaningJobs.length >= maxSlots) return prev;
      
      const speedMultiplier = 1 + prev.player.baseUpgrades.cleaningSpeed * 0.2;
      const duration = getCleaningDuration(item, speedMultiplier);
      
      const job: CleaningJob = {
        jobId: uuidv4(),
        itemId: item.id,
        item: { ...item },
        startTime: Date.now(),
        duration,
      };
      
      const newStash = prev.player.stash.filter(i => i.id !== itemId);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: newStash,
          cleaningJobs: [...prev.player.cleaningJobs, job],
        },
      };
    });
  }, []);

  const collectCleanedItem = useCallback((jobId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const jobIndex = prev.player.cleaningJobs.findIndex(j => j.jobId === jobId);
      if (jobIndex === -1) return prev;
      
      const job = prev.player.cleaningJobs[jobIndex];
      const elapsed = Date.now() - job.startTime;
      if (elapsed < job.duration) return prev;
      
      const cleanedItem: Item = {
        ...job.item,
        isDirty: false,
        condition: Math.min(100, job.item.condition + 10),
        revealedModifiers: [...job.item.hiddenModifiers],
        hiddenModifiers: [],
      };
      
      const newJobs = prev.player.cleaningJobs.filter(j => j.jobId !== jobId);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: [...prev.player.stash, cleanedItem],
          cleaningJobs: newJobs,
        },
      };
    });
  }, []);

  const calculateItemValue = (item: Item): number => {
    const rarityMult: Record<Rarity, number> = {
      common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8
    };
    const conditionMult = item.condition / 100;
    const dirtyMult = item.isDirty ? 0.3 : 1;
    return Math.floor(item.baseValue * rarityMult[item.rarity] * conditionMult * dirtyMult);
  };

  const sellItem = useCallback((itemId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const item = prev.player.stash.find(i => i.id === itemId);
      if (!item) return prev;
      
      const value = calculateItemValue(item);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency + value,
          stash: prev.player.stash.filter(i => i.id !== itemId),
        },
      };
    });
  }, []);

  const sellMultipleItems = useCallback((itemIds: string[]) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const idsSet = new Set(itemIds);
      const itemsToSell = prev.player.stash.filter(i => idsSet.has(i.id));
      if (itemsToSell.length === 0) return prev;
      
      const totalValue = itemsToSell.reduce((sum, item) => sum + calculateItemValue(item), 0);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency + totalValue,
          stash: prev.player.stash.filter(i => !idsSet.has(i.id)),
        },
      };
    });
  }, []);

  const transferToStash = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const itemsToTransfer = bagItems.map(({ gridX, gridY, rotated, ...item }) => item);
      setBagItems([]);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: [...prev.player.stash, ...itemsToTransfer],
        },
      };
    });
  }, [bagItems]);

  const purchaseUpgrade = useCallback((upgradeId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const upgrade = UPGRADES[upgradeId];
      if (!upgrade) return prev;
      
      const currentLevel = prev.player.baseUpgrades[upgradeId as keyof typeof prev.player.baseUpgrades] as number;
      if (currentLevel >= upgrade.maxLevel) return prev;
      
      const cost = upgrade.getCost(currentLevel);
      if (prev.player.currency < cost) return prev;
      
      const newUpgrades = {
        ...prev.player.baseUpgrades,
        [upgradeId]: currentLevel + 1,
      };
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - cost,
          baseUpgrades: newUpgrades,
        },
      };
    });
  }, []);

  // Install a component to a helper
  const installComponent = useCallback((helperId: string, slotType: 'mobility' | 'battery' | 'module', item: Item, moduleIndex?: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const helperIndex = prev.player.helpers.findIndex(h => h.id === helperId);
      if (helperIndex === -1) return prev;
      
      const helper = prev.player.helpers[helperIndex];
      
      // Check if item exists in stash
      const itemInStash = prev.player.stash.find(i => i.id === item.id);
      if (!itemInStash) return prev;
      
      // Create new components
      const newComponents = { ...helper.components };
      let oldComponent: Item | null = null;
      
      if (slotType === 'mobility') {
        if (item.category !== 'mobility') return prev;
        oldComponent = newComponents.mobility;
        newComponents.mobility = item;
      } else if (slotType === 'battery') {
        if (item.category !== 'battery') return prev;
        oldComponent = newComponents.battery;
        newComponents.battery = item;
      } else if (slotType === 'module') {
        const frame = HELPER_FRAMES[helper.frameId];
        const idx = moduleIndex ?? newComponents.modules.length;
        if (idx >= frame.slots.moduleSlots) return prev;
        if (item.category !== 'module' && item.category !== 'storage') return prev;
        
        // Get old module if replacing
        if (idx < newComponents.modules.length) {
          oldComponent = newComponents.modules[idx];
        }
        
        const newModules = [...newComponents.modules];
        newModules[idx] = item;
        newComponents.modules = newModules;
      }
      
      // Update helper
      const newHelpers = [...prev.player.helpers];
      newHelpers[helperIndex] = { ...helper, components: newComponents };
      
      // Update stash: remove installed item, add old component if any
      let newStash = prev.player.stash.filter(i => i.id !== item.id);
      if (oldComponent && oldComponent.id !== item.id) {
        newStash = [...newStash, oldComponent];
      }
      
      // Recalculate battery capacity if needed
      let newCharge = prev.player.currentCharge;
      if (slotType === 'battery' && helper.isPrimary) {
        const newMax = item.batteryCapacity || BASIC_BATTERY_CAPACITY;
        newCharge = Math.min(newCharge, newMax);
      }
      
      return {
        ...prev,
        player: {
          ...prev.player,
          helpers: newHelpers,
          stash: newStash,
          currentCharge: newCharge,
        },
      };
    });
  }, []);

  // Remove a component from a helper and return to stash
  const removeComponent = useCallback((helperId: string, slotType: 'mobility' | 'battery' | 'module', moduleIndex?: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const helperIndex = prev.player.helpers.findIndex(h => h.id === helperId);
      if (helperIndex === -1) return prev;
      
      const helper = prev.player.helpers[helperIndex];
      const newComponents = { ...helper.components };
      let removedComponent: Item | null = null;
      let replacementComponent: Item | null = null;
      
      if (slotType === 'mobility') {
        removedComponent = newComponents.mobility;
        // Replace with basic
        replacementComponent = createBasicMobility();
        newComponents.mobility = replacementComponent;
      } else if (slotType === 'battery') {
        removedComponent = newComponents.battery;
        // Replace with basic
        replacementComponent = createBasicBattery();
        newComponents.battery = replacementComponent;
      } else if (slotType === 'module' && moduleIndex !== undefined) {
        if (moduleIndex >= newComponents.modules.length) return prev;
        removedComponent = newComponents.modules[moduleIndex];
        
        // If it's the only storage module, replace with basic storage
        const otherStorageModules = newComponents.modules.filter((m, i) => i !== moduleIndex && m?.category === 'storage');
        if (removedComponent?.category === 'storage' && otherStorageModules.length === 0) {
          replacementComponent = createBasicStorage();
          const newModules = [...newComponents.modules];
          newModules[moduleIndex] = replacementComponent;
          newComponents.modules = newModules;
        } else {
          // Just remove the module
          newComponents.modules = newComponents.modules.filter((_, i) => i !== moduleIndex);
        }
      }
      
      // Don't allow removing basic components
      if (removedComponent?.id.startsWith('basic-')) {
        return prev;
      }
      
      // Update helper
      const newHelpers = [...prev.player.helpers];
      newHelpers[helperIndex] = { ...helper, components: newComponents };
      
      // Add removed component to stash
      let newStash = prev.player.stash;
      if (removedComponent && !removedComponent.id.startsWith('basic-')) {
        newStash = [...newStash, removedComponent];
      }
      
      // Recalculate battery if changed
      let newCharge = prev.player.currentCharge;
      if (slotType === 'battery' && helper.isPrimary) {
        newCharge = BASIC_BATTERY_CAPACITY;
      }
      
      return {
        ...prev,
        player: {
          ...prev.player,
          helpers: newHelpers,
          stash: newStash,
          currentCharge: newCharge,
        },
      };
    });
  }, []);

  const purchaseBattery = useCallback((templateIndex: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const template = SHOP_BATTERIES[templateIndex];
      if (!template) return prev;
      
      if (prev.player.currency < template.baseValue) return prev;
      
      const newBattery: Item = {
        id: uuidv4(),
        name: template.name,
        category: template.category,
        rarity: template.rarity,
        condition: 100,
        isDirty: false,
        sizeW: template.sizeW,
        sizeH: template.sizeH,
        weight: template.weight,
        baseValue: template.baseValue,
        hiddenModifiers: [],
        revealedModifiers: [],
        icon: template.icon,
        batteryCapacity: template.batteryCapacity,
      };
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - template.baseValue,
          stash: [...prev.player.stash, newBattery],
        },
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBagItems([]);
    setGameState({
      player: createInitialPlayerState(),
      infiniteJunkyard: null,
      junkyard: null,
      junkyardSeed: Date.now(),
      turnCount: 0,
    });
  }, []);

  // Consume ingredients from stash
  const consumeIngredients = (stash: Item[], ingredients: { name: string; quantity: number }[]): Item[] => {
    const newStash = [...stash];
    for (const ing of ingredients) {
      let remaining = ing.quantity;
      for (let i = newStash.length - 1; i >= 0 && remaining > 0; i--) {
        if (newStash[i].name === ing.name) {
          newStash.splice(i, 1);
          remaining--;
        }
      }
    }
    return newStash;
  };

  const craftItem = useCallback((recipe: CraftingRecipe) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Check currency
      if (prev.player.currency < recipe.currencyCost) return prev;
      
      // Check ingredients
      if (!hasIngredients(prev.player.stash, recipe.ingredients)) return prev;
      
      // Create the crafted item
      const craftedItem: Item = {
        id: uuidv4(),
        name: recipe.name,
        category: recipe.category as any,
        rarity: 'uncommon' as Rarity,
        condition: 100,
        isDirty: false,
        sizeW: 2,
        sizeH: 2,
        weight: 3,
        baseValue: recipe.currencyCost,
        hiddenModifiers: [],
        revealedModifiers: [],
        icon: recipe.icon,
        batteryCapacity: recipe.output?.batteryCapacity,
        storageWidth: recipe.output?.storageWidth,
        storageHeight: recipe.output?.storageHeight,
        storageMaxWeight: recipe.output?.storageMaxWeight,
        movementType: recipe.output?.movementType,
        solarRegenRate: recipe.output?.solarRegenRate,
      };
      
      // Consume ingredients
      const newStash = consumeIngredients(prev.player.stash, recipe.ingredients);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - recipe.currencyCost,
          stash: [...newStash, craftedItem],
        },
      };
    });
  }, []);

  const buildFrame = useCallback((frameType: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const frameInfo = HELPER_FRAMES[frameType as keyof typeof HELPER_FRAMES];
      if (!frameInfo) return prev;
      
      // Find the recipe for this frame
      const recipe = {
        basic: { cost: 50, ingredients: [{ name: 'Steel Plate', quantity: 2 }, { name: 'Broken Gear', quantity: 3 }, { name: 'Copper Wire', quantity: 2 }] },
        crawler: { cost: 200, ingredients: [{ name: 'Steel Plate', quantity: 4 }, { name: 'Motor Unit', quantity: 1 }, { name: 'Broken Gear', quantity: 4 }, { name: 'Copper Wire', quantity: 3 }] },
        scout: { cost: 300, ingredients: [{ name: 'Titanium Scrap', quantity: 2 }, { name: 'Circuit Board', quantity: 2 }, { name: 'Power Cell', quantity: 1 }, { name: 'Copper Wire', quantity: 4 }] },
      }[frameType];
      
      if (!recipe) return prev;
      
      // Check currency
      if (prev.player.currency < recipe.cost) return prev;
      
      // Check ingredients
      if (!hasIngredients(prev.player.stash, recipe.ingredients)) return prev;
      
      // Check capacity
      const controlCapacity = 1 + prev.player.baseUpgrades.controlCapacity;
      if (prev.player.helpers.length >= controlCapacity) return prev;
      
      // Create the new helper
      const newHelper: HelperRobot = {
        id: uuidv4(),
        frameId: frameType as any,
        components: {
          mobility: createBasicMobility(),
          modules: [createBasicStorage()],
          battery: createBasicBattery(),
          launcher: null,
          loadedConsumables: [],
        },
        isDeployed: false,
        isPrimary: false,
      };
      
      // Consume ingredients
      const newStash = consumeIngredients(prev.player.stash, recipe.ingredients);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - recipe.cost,
          stash: newStash,
          helpers: [...prev.player.helpers, newHelper],
        },
      };
    });
  }, []);

  // Computed values
  const getMaxBattery = useCallback(() => {
    if (!gameState) return BASIC_BATTERY_CAPACITY;
    const primary = getPrimaryHelper(gameState.player);
    return primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
  }, [gameState]);

  // Repair a component on a helper robot using scrap
  const repairComponent = useCallback((helperId: string, slotType: 'mobility' | 'battery' | 'module', moduleIndex?: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const helperIndex = prev.player.helpers.findIndex(h => h.id === helperId);
      if (helperIndex === -1) return prev;
      
      const helper = prev.player.helpers[helperIndex];
      let component: Item | null = null;
      
      // Get the component to repair
      switch (slotType) {
        case 'mobility':
          component = helper.components.mobility;
          break;
        case 'battery':
          component = helper.components.battery;
          break;
        case 'module':
          if (moduleIndex !== undefined && helper.components.modules[moduleIndex]) {
            component = helper.components.modules[moduleIndex];
          }
          break;
      }
      
      if (!component) return prev;
      
      // Calculate scrap needed: 1 scrap per 10% to repair (min 1)
      const damagePercent = 100 - component.condition;
      if (damagePercent === 0) return prev; // Already at 100%
      
      const scrapNeeded = Math.max(1, Math.ceil(damagePercent / 10));
      
      // Count available scrap
      const scrapCount = prev.player.stash.filter(i => i.name === REPAIR_SCRAP_NAME).length;
      if (scrapCount < scrapNeeded) return prev;
      
      // Consume scrap
      let consumed = 0;
      const newStash = prev.player.stash.filter(item => {
        if (item.name === REPAIR_SCRAP_NAME && consumed < scrapNeeded) {
          consumed++;
          return false;
        }
        return true;
      });
      
      // Repair the component to 100%
      const repairedComponent = { ...component, condition: 100 };
      
      // Update the helper
      const updatedComponents = { ...helper.components };
      switch (slotType) {
        case 'mobility':
          updatedComponents.mobility = repairedComponent;
          break;
        case 'battery':
          updatedComponents.battery = repairedComponent;
          break;
        case 'module':
          if (moduleIndex !== undefined) {
            const newModules = [...updatedComponents.modules];
            newModules[moduleIndex] = repairedComponent;
            updatedComponents.modules = newModules;
          }
          break;
      }
      
      const updatedHelpers = [...prev.player.helpers];
      updatedHelpers[helperIndex] = { ...helper, components: updatedComponents };
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: newStash,
          helpers: updatedHelpers,
        },
      };
    });
  }, []);

  // Get repair cost for a component
  const getRepairCost = useCallback((component: Item): number => {
    const damagePercent = 100 - component.condition;
    if (damagePercent === 0) return 0;
    return Math.max(1, Math.ceil(damagePercent / 10));
  }, []);

  // Get pile reveal count from primary helper's scanner modules
  const getPileRevealCount = useCallback((): number => {
    if (!gameState) return 0;
    const primary = getPrimaryHelper(gameState.player);
    if (!primary) return 0;
    return getHelperPileRevealCount(primary);
  }, [gameState]);

  // Get or generate items for a pile (for scanner preview)
  const getPilePreview = useCallback((pile: JunkPile): Item[] => {
    // If items already pre-generated, return them
    if (pile.preGeneratedItems) {
      return pile.preGeneratedItems;
    }
    // Generate items based on pile's position using chunk-based loot
    const pileSeed = gameState?.infiniteJunkyard?.baseSeed ?? gameState?.junkyardSeed ?? 0;
    // Use local coordinates for seed variation
    return generateLootForChunk(pileSeed + pile.x * 1000 + pile.y, 0, 0);
  }, [gameState?.infiniteJunkyard?.baseSeed, gameState?.junkyardSeed]);

  // Buy an item from the shop
  const buyShopItem = useCallback((itemId: string) => {
    const shopItem = shopInventory.find(si => si.item.id === itemId);
    if (!shopItem) return;
    
    setGameState(prev => {
      if (!prev) return prev;
      if (prev.player.currency < shopItem.buyPrice) return prev;
      
      // Add item to stash
      const newItem = { ...shopItem.item, id: uuidv4() }; // New ID for the purchased item
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - shopItem.buyPrice,
          stash: [...prev.player.stash, newItem],
        },
      };
    });
    
    // Remove item from shop inventory
    const newInventory = shopInventory.filter(si => si.item.id !== itemId);
    setShopInventory(newInventory);

    // Update localStorage
    try {
      localStorage.setItem(
        'junkrunner_shop',
        JSON.stringify({
          inventory: newInventory,
          refreshTime: shopRefreshTime,
        }),
      );
    } catch (err) {
      console.warn('Failed to persist shop purchase.', err);
    }
  }, [shopInventory, shopRefreshTime]);

  // ============ AUTOMATION FUNCTIONS ============

  // Default priority settings
  const DEFAULT_RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  const DEFAULT_CATEGORY_ORDER: ItemCategory[] = ['component', 'module', 'battery', 'mobility', 'storage', 'scrap', 'junk'];

  // Craft the cleaning bot
  const craftCleaningBot = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if (prev.player.automation.cleaningBot) return prev; // Already have one
      
      // Check currency (350)
      if (prev.player.currency < 350) return prev;
      
      // Check ingredients
      const ingredients = [
        { name: 'Circuit Board', quantity: 3 },
        { name: 'Motor Unit', quantity: 2 },
        { name: 'Copper Wire', quantity: 4 },
        { name: 'Broken Gear', quantity: 3 },
      ];
      
      if (!hasIngredients(prev.player.stash, ingredients)) return prev;
      
      // Consume ingredients
      const newStash = consumeIngredients(prev.player.stash, ingredients);
      
      // Create the cleaning bot
      const cleaningBot: CleaningBot = {
        id: uuidv4(),
        isActive: true,
        priority: {
          rarityOrder: DEFAULT_RARITY_ORDER,
          categoryOrder: DEFAULT_CATEGORY_ORDER,
        },
        lastProcessedTime: Date.now(),
      };
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - 350,
          stash: newStash,
          automation: {
            ...prev.player.automation,
            cleaningBot,
          },
        },
      };
    });
  }, []);

  // Toggle cleaning bot active state
  const toggleCleaningBot = useCallback((active: boolean) => {
    setGameState(prev => {
      if (!prev) return prev;
      if (!prev.player.automation.cleaningBot) return prev;
      
      return {
        ...prev,
        player: {
          ...prev.player,
          automation: {
            ...prev.player.automation,
            cleaningBot: {
              ...prev.player.automation.cleaningBot,
              isActive: active,
            },
          },
        },
      };
    });
  }, []);

  // Update cleaning bot priorities
  const updateCleaningBotPriorities = useCallback((priority: CleaningBotPriority) => {
    setGameState(prev => {
      if (!prev) return prev;
      if (!prev.player.automation.cleaningBot) return prev;
      
      return {
        ...prev,
        player: {
          ...prev.player,
          automation: {
            ...prev.player.automation,
            cleaningBot: {
              ...prev.player.automation.cleaningBot,
              priority,
            },
          },
        },
      };
    });
  }, []);

  // Process auto-cleaning when returning to base
  const processAutoCleaning = useCallback((state: GameState): GameState => {
    const bot = state.player.automation.cleaningBot;
    if (!bot || !bot.isActive) return state;
    
    const maxSlots = 1 + state.player.baseUpgrades.cleaningSlots;
    const availableSlots = maxSlots - state.player.cleaningJobs.length;
    if (availableSlots <= 0) return state;
    
    // Get dirty items from stash
    const dirtyItems = state.player.stash.filter(item => item.isDirty);
    if (dirtyItems.length === 0) return state;
    
    // Sort by priority
    const { rarityOrder, categoryOrder } = bot.priority;
    
    const sortedDirty = [...dirtyItems].sort((a, b) => {
      // First sort by rarity priority
      const rarityA = rarityOrder.indexOf(a.rarity);
      const rarityB = rarityOrder.indexOf(b.rarity);
      if (rarityA !== rarityB) return rarityA - rarityB;
      
      // Then by category priority
      const categoryA = categoryOrder.indexOf(a.category);
      const categoryB = categoryOrder.indexOf(b.category);
      return categoryA - categoryB;
    });
    
    // Take items to auto-clean (limited by available slots)
    const itemsToClean = sortedDirty.slice(0, availableSlots);
    if (itemsToClean.length === 0) return state;
    
    // Calculate cleaning speed multiplier
    const speedMultiplier = 1 + state.player.baseUpgrades.cleaningSpeed * 0.2;
    
    // Create cleaning jobs for these items
    const newJobs: CleaningJob[] = itemsToClean.map(item => ({
      jobId: uuidv4(),
      itemId: item.id,
      item: { ...item },
      startTime: Date.now(),
      duration: getCleaningDuration(item, speedMultiplier),
    }));
    
    // Remove items from stash and add to cleaning jobs
    const itemIdsToRemove = new Set(itemsToClean.map(i => i.id));
    const newStash = state.player.stash.filter(i => !itemIdsToRemove.has(i.id));
    
    return {
      ...state,
      player: {
        ...state.player,
        stash: newStash,
        cleaningJobs: [...state.player.cleaningJobs, ...newJobs],
        automation: {
          ...state.player.automation,
          cleaningBot: {
            ...bot,
            lastProcessedTime: Date.now(),
          },
        },
      },
    };
  }, []);

  // Enhanced returnToBase with auto-cleaning
  // If at entrance: saves junkyard state. If not at entrance: abandons junkyard.
  const returnToBaseWithAutoCleaning = useCallback((shouldRecharge: boolean = false) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const primary = getPrimaryHelper(prev.player);
      const maxCapacity = primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
      
      // Check if player is at entrance - if so, preserve junkyard
      const atEntrance = prev.infiniteJunkyard && 
        prev.player.playerX === prev.infiniteJunkyard.entranceX && 
        prev.player.playerY === prev.infiniteJunkyard.entranceY;
      
      // If not at entrance, abandon junkyard (wipe it and generate new seed)
      const shouldAbandon = prev.infiniteJunkyard && !atEntrance;
      const newSeed = shouldAbandon ? Date.now() : prev.junkyardSeed;
      const newInfiniteJunkyard = shouldAbandon ? null : prev.infiniteJunkyard;
      
      let newState: GameState;
      
      if (!shouldRecharge) {
        // Just return without recharging
        newState = {
          ...prev,
          infiniteJunkyard: newInfiniteJunkyard,
          junkyardSeed: newSeed,
          player: { 
            ...prev.player, 
            currentYardId: null,
            playerX: 0,
            playerY: 0,
          },
        };
      } else {
        // Calculate recharge cost
        const chargeNeeded = maxCapacity - prev.player.currentCharge;
        const chargerLevel = prev.player.baseUpgrades.chargerEfficiency ?? 0;
        const chargingCost = getChargingCost(chargeNeeded, chargerLevel);
        
        // Check if player can afford it
        if (prev.player.currency < chargingCost) {
          // Can't afford full recharge - charge as much as possible
          const costPerUnit = UPGRADES.chargerEfficiency.getValue(chargerLevel);
          const affordableCharge = Math.floor(prev.player.currency / costPerUnit);
          const actualCharge = Math.min(affordableCharge, chargeNeeded);
          const actualCost = getChargingCost(actualCharge, chargerLevel);
          
          newState = {
            ...prev,
            infiniteJunkyard: newInfiniteJunkyard,
            junkyardSeed: newSeed,
            player: { 
              ...prev.player, 
              currentYardId: null,
              playerX: 0,
              playerY: 0,
              currentCharge: prev.player.currentCharge + actualCharge,
              currency: prev.player.currency - actualCost,
            },
          };
        } else {
          newState = {
            ...prev,
            infiniteJunkyard: newInfiniteJunkyard,
            junkyardSeed: newSeed,
            player: { 
              ...prev.player, 
              currentYardId: null,
              playerX: 0,
              playerY: 0,
              currentCharge: maxCapacity,
              currency: prev.player.currency - chargingCost,
            },
          };
        }
      }
      
      // Process auto-cleaning after returning to base
      return processAutoCleaning(newState);
    });
  }, [getChargingCost, processAutoCleaning]);

  // Fire a consumable at enemies
  const fireConsumable = useCallback((consumableIndex: number) => {
    if (!gameState) return;
    
    const primary = gameState.player.helpers.find(h => h.isPrimary);
    if (!primary) return;
    
    const consumable = primary.components.loadedConsumables[consumableIndex];
    if (!consumable) return;
    
    // Remove the consumable from loaded consumables
    setGameState(prev => {
      if (!prev) return prev;
      
      const newHelpers = prev.player.helpers.map(helper => {
        if (!helper.isPrimary) return helper;
        
        const newLoadedConsumables = [...helper.components.loadedConsumables];
        newLoadedConsumables.splice(consumableIndex, 1);
        
        return {
          ...helper,
          components: {
            ...helper.components,
            loadedConsumables: newLoadedConsumables,
          },
        };
      });
      
      return {
        ...prev,
        player: {
          ...prev.player,
          helpers: newHelpers,
        },
      };
    });
    
    // Show toast with consumable effect
    toast({
      title: `${consumable.icon} ${consumable.name} deployed!`,
      description: `Effect active in your vicinity.`,
    });
  }, [gameState]);

  // Load a consumable into the launcher
  const loadConsumable = useCallback((consumableId: string) => {
    if (!gameState) return;
    
    const primary = gameState.player.helpers.find(h => h.isPrimary);
    if (!primary?.components.launcher) return;
    
    const launcherCapacity = primary.components.launcher.launcherCapacity || 1;
    if (primary.components.loadedConsumables.length >= launcherCapacity) {
      toast({
        title: "Launcher Full",
        description: "Remove a consumable or upgrade your launcher.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the consumable in stash
    const consumable = gameState.player.stash.find(item => item.id === consumableId);
    if (!consumable || consumable.category !== 'consumable') return;
    
    setGameState(prev => {
      if (!prev) return prev;
      
      // Remove from stash
      const newStash = prev.player.stash.filter(item => item.id !== consumableId);
      
      // Add to loaded consumables
      const newHelpers = prev.player.helpers.map(helper => {
        if (!helper.isPrimary) return helper;
        
        return {
          ...helper,
          components: {
            ...helper.components,
            loadedConsumables: [...helper.components.loadedConsumables, consumable],
          },
        };
      });
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: newStash,
          helpers: newHelpers,
        },
      };
    });
    
    toast({
      title: `${consumable.icon} ${consumable.name} loaded`,
      description: "Ready to deploy in the junkyard.",
    });
  }, [gameState]);

  // Unload a consumable from the launcher back to stash
  const unloadConsumable = useCallback((consumableIndex: number) => {
    if (!gameState) return;
    
    const primary = gameState.player.helpers.find(h => h.isPrimary);
    if (!primary) return;
    
    const consumable = primary.components.loadedConsumables[consumableIndex];
    if (!consumable) return;
    
    setGameState(prev => {
      if (!prev) return prev;
      
      const newHelpers = prev.player.helpers.map(helper => {
        if (!helper.isPrimary) return helper;
        
        const newLoadedConsumables = [...helper.components.loadedConsumables];
        newLoadedConsumables.splice(consumableIndex, 1);
        
        return {
          ...helper,
          components: {
            ...helper.components,
            loadedConsumables: newLoadedConsumables,
          },
        };
      });
      
      return {
        ...prev,
        player: {
          ...prev.player,
          stash: [...prev.player.stash, consumable],
          helpers: newHelpers,
        },
      };
    });
  }, [gameState]);

  // Get loaded consumables and launcher capacity for primary helper
  const getLoadedConsumables = useCallback(() => {
    if (!gameState) return { consumables: [], capacity: 0 };
    
    const primary = gameState.player.helpers.find(h => h.isPrimary);
    if (!primary) return { consumables: [], capacity: 0 };
    
    const launcher = primary.components.launcher;
    const capacity = launcher?.launcherCapacity || 0;
    const consumables = primary.components.loadedConsumables || [];
    
    return { consumables, capacity };
  }, [gameState]);

  return {
    gameState,
    isLoading,
    bagItems,
    foundItems,
    setFoundItems,
    lastTerrainType,
    setLastTerrainType,
    getCurrentBag,
    enterJunkyard,
    movePlayer,
    getCurrentPile,
    searchPile,
    returnToBase: returnToBaseWithAutoCleaning,
    moveToNextJunkyard,
    startCleaning,
    collectCleanedItem,
    sellItem,
    sellMultipleItems,
    transferToStash,
    purchaseUpgrade,
    installComponent,
    removeComponent,
    purchaseBattery,
    craftItem,
    buildFrame,
    getMaxBattery,
    repairComponent,
    getRepairCost,
    resetGame,
    getPileRevealCount,
    getPilePreview,
    shopInventory,
    shopRefreshTime,
    buyShopItem,
    // Automation
    craftCleaningBot,
    toggleCleaningBot,
    updateCleaningBotPriorities,
    // Consumables
    fireConsumable,
    loadConsumable,
    unloadConsumable,
    getLoadedConsumables,
  };
}