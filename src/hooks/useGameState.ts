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
  STARTER_BATTERY_CAPACITY
} from '@/types/game';
import { 
  ITEM_TEMPLATES, 
  RARITY_WEIGHTS, 
  getCleaningDuration,
  SHOP_BATTERIES
} from '@/data/itemTemplates';
import { generateJunkyard, isTilePassable } from '@/lib/terrainGenerator';

const STORAGE_KEY = 'junkrunner_save';
const SEARCH_TURNS_REQUIRED = 5;
const REVEAL_RADIUS = 2;

function createInitialPlayerState(): PlayerState {
  return {
    currency: 50,
    bag: {
      width: 4,
      height: 4,
      maxWeight: 30,
      items: [],
    },
    stash: [],
    currentYardId: null,
    baseUpgrades: {
      bagWidth: 0,
      bagHeight: 0,
      bagMaxWeight: 0,
      cleaningSlots: 0,
      cleaningSpeed: 0,
      workshopTier: 0,
      controlCapacity: 0,
    },
    helpers: [],
    cleaningJobs: [],
    playerX: 0,
    playerY: 0,
    battery: {
      currentCharge: STARTER_BATTERY_CAPACITY,
      equippedBatteryId: null,
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
    });
  }
  
  return items;
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

// Get the max battery capacity based on equipped battery
function getMaxBatteryCapacity(player: PlayerState): number {
  if (!player.battery.equippedBatteryId) {
    return STARTER_BATTERY_CAPACITY;
  }
  
  const battery = player.stash.find(i => i.id === player.battery.equippedBatteryId);
  if (battery && battery.batteryCapacity) {
    return battery.batteryCapacity;
  }
  
  return STARTER_BATTERY_CAPACITY;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load game state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: add battery if missing
        if (!parsed.player.battery) {
          parsed.player.battery = {
            currentCharge: STARTER_BATTERY_CAPACITY,
            equippedBatteryId: null,
          };
        }
        // Migration: add walls if missing
        if (parsed.junkyard && !parsed.junkyard.walls) {
          parsed.junkyard.walls = [];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState, isLoading]);

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
      if (prev.player.battery.currentCharge <= 0) {
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
          battery: {
            ...prev.player.battery,
            currentCharge: prev.player.battery.currentCharge - 1,
          },
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
      if (prev.player.battery.currentCharge <= 0) {
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
      
      // Drain battery for search action
      const newBattery = {
        ...prev.player.battery,
        currentCharge: prev.player.battery.currentCharge - 1,
      };
      
      if (newProgress >= SEARCH_TURNS_REQUIRED) {
        // Generate loot
        const loot = generateLoot(Date.now() + pileIndex);
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress, isDepleted: true };
        
        // Try to add items to bag
        let bag = { ...prev.player.bag, items: [...prev.player.bag.items] };
        const currentWeight = bag.items.reduce((sum, i) => sum + i.weight, 0);
        
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
              bag.items.push(invItem);
            }
          }
        }
        
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
          player: { ...prev.player, bag, battery: newBattery },
          turnCount: prev.turnCount + 1,
        };
      } else {
        updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress };
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
          player: { ...prev.player, battery: newBattery },
          turnCount: prev.turnCount + 1,
        };
      }
    });
  }, []);

  const returnToBase = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Recharge battery when returning to base
      const maxCapacity = getMaxBatteryCapacity(prev.player);
      
      return {
        ...prev,
        player: { 
          ...prev.player, 
          currentYardId: null,
          battery: {
            ...prev.player.battery,
            currentCharge: maxCapacity,
          },
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
      
      // Don't allow selling equipped battery
      if (item.id === prev.player.battery.equippedBatteryId) return prev;
      
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
      
      const itemsToTransfer = prev.player.bag.items.map(({ gridX, gridY, rotated, ...item }) => item);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          bag: { ...prev.player.bag, items: [] },
          stash: [...prev.player.stash, ...itemsToTransfer],
        },
      };
    });
  }, []);

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
      
      // Apply bag upgrades immediately
      let newBag = { ...prev.player.bag };
      if (upgradeId === 'bagWidth') {
        newBag.width = upgrade.getValue(currentLevel + 1);
      } else if (upgradeId === 'bagHeight') {
        newBag.height = upgrade.getValue(currentLevel + 1);
      } else if (upgradeId === 'bagMaxWeight') {
        newBag.maxWeight = upgrade.getValue(currentLevel + 1);
      }
      
      return {
        ...prev,
        player: {
          ...prev.player,
          currency: prev.player.currency - cost,
          baseUpgrades: newUpgrades,
          bag: newBag,
        },
      };
    });
  }, []);

  const equipBattery = useCallback((batteryId: string | null) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      if (batteryId) {
        const battery = prev.player.stash.find(i => i.id === batteryId);
        if (!battery || battery.category !== 'battery') return prev;
      }
      
      // Get the capacity of the new battery
      let newCapacity = STARTER_BATTERY_CAPACITY;
      if (batteryId) {
        const battery = prev.player.stash.find(i => i.id === batteryId);
        if (battery?.batteryCapacity) {
          newCapacity = battery.batteryCapacity;
        }
      }
      
      return {
        ...prev,
        player: {
          ...prev.player,
          battery: {
            equippedBatteryId: batteryId,
            currentCharge: newCapacity,
          },
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
    setGameState({
      player: createInitialPlayerState(),
      junkyard: null,
      turnCount: 0,
    });
  }, []);

  // Install a module from stash to a helper's slot
  const installModule = useCallback((helperId: string, slotIndex: number, item: Item) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const helperIndex = prev.player.helpers.findIndex(h => h.id === helperId);
      if (helperIndex === -1) return prev;
      
      const helper = prev.player.helpers[helperIndex];
      const frame = require('@/data/upgradeData').HELPER_FRAMES[helper.frameId];
      
      // Check if slot is valid
      if (slotIndex < 0 || slotIndex >= frame.moduleSlots) return prev;
      
      // Check if item exists in stash and is a module
      const itemInStash = prev.player.stash.find(i => i.id === item.id);
      if (!itemInStash || itemInStash.category !== 'module') return prev;
      
      // Create new modules array
      const newModules = [...helper.modules];
      newModules[slotIndex] = item;
      
      // Update helper
      const newHelpers = [...prev.player.helpers];
      newHelpers[helperIndex] = { ...helper, modules: newModules };
      
      // Remove from stash
      const newStash = prev.player.stash.filter(i => i.id !== item.id);
      
      return {
        ...prev,
        player: {
          ...prev.player,
          helpers: newHelpers,
          stash: newStash,
        },
      };
    });
  }, []);

  // Remove a module from a helper's slot and return to stash
  const removeModule = useCallback((helperId: string, slotIndex: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const helperIndex = prev.player.helpers.findIndex(h => h.id === helperId);
      if (helperIndex === -1) return prev;
      
      const helper = prev.player.helpers[helperIndex];
      const module = helper.modules[slotIndex];
      
      if (!module) return prev;
      
      // Create new modules array without the module
      const newModules = [...helper.modules];
      newModules[slotIndex] = undefined as any;
      
      // Update helper
      const newHelpers = [...prev.player.helpers];
      newHelpers[helperIndex] = { ...helper, modules: newModules.filter(Boolean) };
      
      // Add back to stash
      return {
        ...prev,
        player: {
          ...prev.player,
          helpers: newHelpers,
          stash: [...prev.player.stash, module],
        },
      };
    });
  }, []);

  // Computed values
  const getMaxBattery = useCallback(() => {
    if (!gameState) return STARTER_BATTERY_CAPACITY;
    return getMaxBatteryCapacity(gameState.player);
  }, [gameState]);

  return {
    gameState,
    isLoading,
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
    equipBattery,
    purchaseBattery,
    getMaxBattery,
    installModule,
    removeModule,
    resetGame,
  };
}
