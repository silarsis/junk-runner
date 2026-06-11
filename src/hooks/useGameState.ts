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
  TerrainTile,
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
import { generateJunkyard, isTilePassable, getTerrainAt } from '@/lib/terrainGenerator';
import { HELPER_FRAMES, UPGRADES } from '@/data/upgradeData';
import { STORYLINES, createStoryItem } from '@/data/storylines';
import type { StoryEmail } from '@/types/game';

// Chance per new junkyard to embed a story item
const STORY_ITEM_CHANCE = 0.22;

// Pick the next storyline+step the player should encounter. Returns null if all
// active storylines completed. Prefers continuing an in-progress storyline.
function pickNextStoryStep(
  storyProgress: Record<string, number> | undefined,
  completed: string[] | undefined,
): { storylineId: string; stepIndex: number } | null {
  const progress = storyProgress || {};
  const done = new Set(completed || []);
  // 1) Continue an in-progress storyline
  for (const s of STORYLINES) {
    if (done.has(s.id)) continue;
    const step = progress[s.id] ?? 0;
    if (step > 0 && step < s.steps.length) {
      return { storylineId: s.id, stepIndex: step };
    }
  }
  // 2) Start a new storyline (random among un-started, un-completed)
  const available = STORYLINES.filter(s => !done.has(s.id) && !(progress[s.id] && progress[s.id] > 0));
  if (available.length === 0) return null;
  const pick = available[Math.floor(Math.random() * available.length)];
  return { storylineId: pick.id, stepIndex: 0 };
}

function attachStoryItemIfLucky(
  junkyard: Junkyard,
  storyProgress: Record<string, number> | undefined,
  completed: string[] | undefined,
): Junkyard {
  if (Math.random() > STORY_ITEM_CHANCE) return junkyard;
  const next = pickNextStoryStep(storyProgress, completed);
  if (!next) return junkyard;
  return { ...junkyard, pendingStoryItem: next };
}


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
      chargerEfficiency: 0,
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
      solarRegenRate: template.solarRegenRate,
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


        setGameState(parsed);
      } catch (err) {
        console.error('Failed to load save; resetting to fresh state.', err);
        // If the save is corrupted, clear it so the app can recover reliably.
        localStorage.removeItem(STORAGE_KEY);
        setBagItems([]);
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
      
      // Check destination is passable (jump can skip intermediate tiles)
      if (!isTilePassable(prev.junkyard, newX, newY)) {
        // Spider legs can traverse walls at 2x battery cost
        if (mobilityName.includes('spider')) {
          // Allow wall traversal but we'll add extra cost later
        } else {
          return prev;
        }
      }
      
      // Calculate base battery cost
      let batteryCost = 1;
      
      // Check terrain at destination
      const destinationTerrain = getTerrainAt(prev.junkyard, newX, newY);
      let updatedJunkyard = revealTilesAround(prev.junkyard, newX, newY);
      let updatedBagItems = [...bagItems];
      
      // Apply terrain effects
      if (destinationTerrain && movementType !== 'jump') {
        // Jump jets skip over hazards entirely
        switch (destinationTerrain.type) {
          case 'mud':
            // Costs 2 battery unless you have treads
            if (!mobilityName.includes('tread')) {
              batteryCost = 2;
            }
            break;
          case 'toxic':
            // Damage items in bag (reduce condition by 5)
            updatedBagItems = bagItems.map(item => ({
              ...item,
              condition: Math.max(0, item.condition - 5),
            }));
            break;
          case 'electric':
            // Drains 3 battery (could add insulated wheels later)
            batteryCost = 3;
            break;
          case 'oil':
            // Slide effect handled separately after move
            // Racing wheels slide further (handled in slide logic)
            break;
          case 'magnetic':
            // Weight penalty handled elsewhere (inventory checks)
            break;
          case 'fog':
            // Reduced reveal radius - reveal only 1 tile around
            const newRevealed = updatedJunkyard.revealedTiles.map(row => [...row]);
            for (let ddy = -1; ddy <= 1; ddy++) {
              for (let ddx = -1; ddx <= 1; ddx++) {
                const nx = newX + ddx;
                const ny = newY + ddy;
                if (nx >= 0 && nx < updatedJunkyard.width && ny >= 0 && ny < updatedJunkyard.height) {
                  newRevealed[ny][nx] = true;
                }
              }
            }
            updatedJunkyard = { ...updatedJunkyard, revealedTiles: newRevealed };
            break;
        }
      }
      
      // Spider legs wall traversal costs 2x
      const wallAtDest = prev.junkyard.walls.some(w => w.x === newX && w.y === newY);
      if (wallAtDest && mobilityName.includes('spider')) {
        batteryCost = batteryCost * 2;
      }
      
      // Check if we have enough battery
      if (prev.player.currentCharge < batteryCost) {
        return prev;
      }
      
      // Update bag items if toxic damage occurred
      if (updatedBagItems !== bagItems) {
        setBagItems(updatedBagItems);
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
          if (isTilePassable(prev.junkyard, slideX, slideY)) {
            finalX = slideX;
            finalY = slideY;
            // Reveal tiles along slide path
            updatedJunkyard = revealTilesAround(updatedJunkyard, slideX, slideY);
          } else {
            break;
          }
        }
      }
      
      const newTurnCount = prev.turnCount + 1;
      let newCharge = prev.player.currentCharge - batteryCost;
      
      // Solar panel regeneration
      if (primary) {
        const solarRate = getSolarRegenRate(primary);
        if (solarRate !== null) {
          const maxCapacity = getMaxBatteryCapacity(primary);
          const regenAmount = calculateSolarRegen(newTurnCount, solarRate, maxCapacity, newCharge);
          newCharge = Math.min(maxCapacity, newCharge + regenAmount);
        }
      }
      
      return {
        ...prev,
        junkyard: updatedJunkyard,
        player: { 
          ...prev.player, 
          playerX: finalX, 
          playerY: finalY,
          currentCharge: newCharge,
        },
        turnCount: newTurnCount,
      };
    });
  }, [bagItems]);

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
        
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
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
        
        return {
          ...prev,
          junkyard: { ...prev.junkyard, piles: updatedPiles },
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
      
      const upgrade = UPGRADES[upgradeId as keyof typeof UPGRADES];
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