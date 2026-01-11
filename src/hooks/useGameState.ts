import { useState, useEffect, useCallback } from 'react';
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
  HelperRobot,
  Bag,
  BASIC_BATTERY_CAPACITY,
  BASIC_STORAGE_WIDTH,
  BASIC_STORAGE_HEIGHT,
  BASIC_STORAGE_WEIGHT,
} from '@/types/game';
import { 
  ITEM_TEMPLATES, 
  RARITY_WEIGHTS, 
  getCleaningDuration,
  SHOP_BATTERIES,
  createBasicBattery,
  createBasicStorage,
  createBasicMobility,
} from '@/data/itemTemplates';
import { generateJunkyard, isTilePassable } from '@/lib/terrainGenerator';
import { HELPER_FRAMES } from '@/data/upgradeData';

const STORAGE_KEY = 'junkrunner_save';
const SEARCH_TURNS_REQUIRED = 5;
const REVEAL_RADIUS = 2;

function createPrimaryHelper(): HelperRobot {
  return {
    id: 'primary-helper',
    frameId: 'basic',
    components: {
      mobility: createBasicMobility(),
      modules: [createBasicStorage()],
      battery: createBasicBattery(),
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
    },
    helpers: [createPrimaryHelper()],
    cleaningJobs: [],
    playerX: 0,
    playerY: 0,
    currentCharge: BASIC_BATTERY_CAPACITY,
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
    });
  }
  
  return items;
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

  // Load game state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: ensure primary helper exists
        if (!parsed.player.helpers || parsed.player.helpers.length === 0) {
          parsed.player.helpers = [createPrimaryHelper()];
        }
        // Migration: ensure currentCharge exists
        if (parsed.player.currentCharge === undefined) {
          const primary = parsed.player.helpers.find((h: HelperRobot) => h.isPrimary);
          parsed.player.currentCharge = primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
        }
        // Migration: add walls if missing
        if (parsed.junkyard && !parsed.junkyard.walls) {
          parsed.junkyard.walls = [];
        }
        // Load bag items from storage
        if (parsed.bagItems) {
          setBagItems(parsed.bagItems);
        }
        setGameState(parsed);
      } catch {
        setGameState({
          player: createInitialPlayerState(),
          junkyard: null,
          turnCount: 0,
        });
      }
    } else {
      setGameState({
        player: createInitialPlayerState(),
        junkyard: null,
        turnCount: 0,
      });
    }
    setIsLoading(false);
  }, []);

  // Save game state
  useEffect(() => {
    if (gameState && !isLoading) {
      const saveData = { ...gameState, bagItems };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    }
  }, [gameState, bagItems, isLoading]);

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
      
      let junkyard = prev.junkyard;
      let playerX = prev.player.playerX;
      let playerY = prev.player.playerY;
      
      if (!junkyard) {
        const seed = Date.now();
        junkyard = generateJunkyard(seed);
        playerX = 0;
        playerY = 0;
      }
      
      junkyard = revealTilesAround(junkyard, playerX, playerY);
      
      return {
        ...prev,
        junkyard,
        player: { ...prev.player, currentYardId: junkyard.yardId, playerX, playerY },
      };
    });
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      if (!prev || !prev.junkyard) return prev;
      
      const newX = prev.player.playerX + dx;
      const newY = prev.player.playerY + dy;
      
      // Check bounds and walls
      if (!isTilePassable(prev.junkyard, newX, newY)) {
        return prev;
      }
      
      // Check battery
      if (prev.player.currentCharge <= 0) {
        return prev;
      }
      
      const junkyard = revealTilesAround(prev.junkyard, newX, newY);
      
      return {
        ...prev,
        junkyard,
        player: { 
          ...prev.player, 
          playerX: newX, 
          playerY: newY,
          currentCharge: prev.player.currentCharge - 1,
        },
        turnCount: prev.turnCount + 1,
      };
    });
  }, []);

  const getCurrentPile = useCallback((): JunkPile | null => {
    if (!gameState?.junkyard) return null;
    
    return gameState.junkyard.piles.find(
      p => p.x === gameState.player.playerX && 
           p.y === gameState.player.playerY && 
           !p.isDepleted
    ) || null;
  }, [gameState]);

  const searchPile = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.junkyard) return prev;
      
      // Check battery
      if (prev.player.currentCharge <= 0) {
        return prev;
      }
      
      const pileIndex = prev.junkyard.piles.findIndex(
        p => p.x === prev.player.playerX && 
             p.y === prev.player.playerY && 
             !p.isDepleted
      );
      
      if (pileIndex === -1) return prev;
      
      const pile = prev.junkyard.piles[pileIndex];
      const newProgress = pile.progressTurns + 1;
      
      const updatedPiles = [...prev.junkyard.piles];
      
      if (newProgress >= SEARCH_TURNS_REQUIRED) {
        // Generate loot
        const loot = generateLoot(Date.now() + pileIndex);
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress, isDepleted: true };
        
        // Get current bag
        const primary = getPrimaryHelper(prev.player);
        const baseBag = primary ? getBagFromHelper(primary) : { width: BASIC_STORAGE_WIDTH, height: BASIC_STORAGE_HEIGHT, maxWeight: BASIC_STORAGE_WEIGHT, items: [] };
        
        // Try to add items to bag
        let newBagItems = [...bagItems];
        const currentWeight = newBagItems.reduce((sum, i) => sum + i.weight, 0);
        const bag = { ...baseBag, items: newBagItems };
        
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
            }
          }
        }
        
        setBagItems(newBagItems);
        
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
          player: { 
            ...prev.player, 
            currentCharge: prev.player.currentCharge - 1,
          },
          turnCount: prev.turnCount + 1,
        };
      } else {
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress };
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
          player: { 
            ...prev.player, 
            currentCharge: prev.player.currentCharge - 1,
          },
          turnCount: prev.turnCount + 1,
        };
      }
    });
  }, [bagItems]);

  const returnToBase = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Recharge battery when returning to base
      const primary = getPrimaryHelper(prev.player);
      const maxCapacity = primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
      
      return {
        ...prev,
        player: { 
          ...prev.player, 
          currentYardId: null,
          currentCharge: maxCapacity,
        },
      };
    });
  }, []);

  const moveToNextJunkyard = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const seed = Date.now();
      const junkyard = generateJunkyard(seed);
      
      return {
        ...prev,
        junkyard,
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

  const sellItem = useCallback((itemId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const item = prev.player.stash.find(i => i.id === itemId);
      if (!item) return prev;
      
      const rarityMult: Record<Rarity, number> = {
        common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8
      };
      const conditionMult = item.condition / 100;
      const dirtyMult = item.isDirty ? 0.3 : 1;
      
      const value = Math.floor(item.baseValue * rarityMult[item.rarity] * conditionMult * dirtyMult);
      
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
      
      const { UPGRADES } = require('@/data/upgradeData');
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
      junkyard: null,
      turnCount: 0,
    });
  }, []);

  // Computed values
  const getMaxBattery = useCallback(() => {
    if (!gameState) return BASIC_BATTERY_CAPACITY;
    const primary = getPrimaryHelper(gameState.player);
    return primary ? getMaxBatteryCapacity(primary) : BASIC_BATTERY_CAPACITY;
  }, [gameState]);

  return {
    gameState,
    isLoading,
    bagItems,
    getCurrentBag,
    enterJunkyard,
    movePlayer,
    getCurrentPile,
    searchPile,
    returnToBase,
    moveToNextJunkyard,
    startCleaning,
    collectCleanedItem,
    sellItem,
    transferToStash,
    purchaseUpgrade,
    installComponent,
    removeComponent,
    purchaseBattery,
    getMaxBattery,
    resetGame,
  };
}