// Chunk-based infinite junkyard generator

import { v4 as uuidv4 } from 'uuid';
import { JunkPile, WallTile, TerrainTile, TerrainType, BarrierTile, Rarity, Item } from '@/types/game';
import { Enemy, EnemyDefinition, getEnemyDefinitionsForBiome } from '@/types/enemies';
import { WALL_ICONS, ITEM_TEMPLATES, RARITY_WEIGHTS } from '@/data/itemTemplates';
import { Biome, getBiomeFromSeed, pickBiomeTerrain, pickBiomeBarrier, pickBiomeWall } from '@/data/biomes';
import { 
  InfiniteJunkyard, 
  JunkyardChunk, 
  ChunkCoord,
  makeChunkKey,
  worldToChunk,
  worldToLocal,
  chunkLocalToWorld,
  getChunkDistance,
  getTileDistanceFromEntrance,
} from '@/types/chunk';

// Chunk dimensions (same as old junkyard size)
export const CHUNK_WIDTH = 12;
export const CHUNK_HEIGHT = 12;

// Seeded random number generator for reproducible chunks
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate unique seed for a specific chunk based on base seed
function getChunkSeed(baseSeed: number, chunkX: number, chunkY: number): number {
  // Combine base seed with chunk coords for unique but reproducible chunk seeds
  return baseSeed * 73856093 ^ (chunkX * 19349663) ^ (chunkY * 83492791);
}

// Check if a position is within the spawn-safe zone (center of chunk 0,0)
function isInSpawnZone(localX: number, localY: number, chunkX: number, chunkY: number): boolean {
  // Only chunk 0,0 has a spawn zone (at center)
  if (chunkX !== 0 || chunkY !== 0) return false;
  
  const centerX = Math.floor(CHUNK_WIDTH / 2);
  const centerY = Math.floor(CHUNK_HEIGHT / 2);
  
  return Math.abs(localX - centerX) <= 2 && Math.abs(localY - centerY) <= 2;
}

// Exponential rarity scaling based on chunk distance from entrance
export function getRarityWeightsForDistance(chunkDistance: number): Record<Rarity, number> {
  // Base weights
  const base = { ...RARITY_WEIGHTS };
  
  if (chunkDistance === 0) {
    // Near entrance - mostly common/uncommon
    return {
      common: 60,
      uncommon: 28,
      rare: 10,
      epic: 1.5,
      legendary: 0.5,
    };
  }
  
  // Exponential curve - each chunk ring increases rare chances significantly
  // Distance 1: slight boost, Distance 5+: dramatic boost
  const factor = Math.pow(1.5, chunkDistance);
  
  return {
    common: Math.max(10, 50 - chunkDistance * 8),
    uncommon: 25 + chunkDistance * 2,
    rare: Math.min(35, 12 + chunkDistance * 4 * (factor / 2)),
    epic: Math.min(20, 3 + chunkDistance * 2 * (factor / 3)),
    legendary: Math.min(10, 0.5 + chunkDistance * (factor / 5)),
  };
}

// Pick rarity using distance-scaled weights
function pickRarityForChunk(random: () => number, chunkDistance: number): Rarity {
  const weights = getRarityWeightsForDistance(chunkDistance);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = random() * total;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity as Rarity;
  }
  return 'common';
}

// Generate walls for a chunk
function generateChunkWalls(
  random: () => number,
  chunkX: number,
  chunkY: number,
  usedPositions: Set<string>,
  biome: Biome,
  wallDensity: number
): WallTile[] {
  const walls: WallTile[] = [];
  const totalTiles = CHUNK_WIDTH * CHUNK_HEIGHT;
  const wallCount = Math.floor(totalTiles * wallDensity);
  
  for (let i = 0; i < wallCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * CHUNK_WIDTH);
      y = Math.floor(random() * CHUNK_HEIGHT);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, chunkX, chunkY)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      usedPositions.add(`${x},${y}`);
      const icon = pickBiomeWall(biome, random);
      walls.push({ x, y, icon });
    }
  }
  
  return walls;
}

// Generate junk piles for a chunk with distance-based rarity
function generateChunkPiles(
  random: () => number,
  chunkX: number,
  chunkY: number,
  usedPositions: Set<string>,
  chunkDistance: number
): JunkPile[] {
  const piles: JunkPile[] = [];
  
  // More piles in distant chunks (more rewards for the risk)
  const basePileCount = 15 + Math.floor(chunkDistance * 2);
  const pileCount = basePileCount + Math.floor(random() * 10);
  
  for (let i = 0; i < pileCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * CHUNK_WIDTH);
      y = Math.floor(random() * CHUNK_HEIGHT);
      attempts++;
    } while (usedPositions.has(`${x},${y}`) && attempts < 50);
    
    if (attempts < 50) {
      usedPositions.add(`${x},${y}`);
      piles.push({
        id: uuidv4(),
        x,
        y,
        progressTurns: 0,
        requiredTurns: 1 + Math.floor(random() * 5),
        isDepleted: false,
      });
    }
  }
  
  return piles;
}

// Generate terrain hazards for a chunk
function generateChunkTerrain(
  random: () => number,
  chunkX: number,
  chunkY: number,
  usedPositions: Set<string>,
  biome: Biome,
  hazardDensity: number
): TerrainTile[] {
  const terrain: TerrainTile[] = [];
  const totalTiles = CHUNK_WIDTH * CHUNK_HEIGHT;
  
  // More hazards in distant chunks
  const chunkDistance = getChunkDistance(chunkX, chunkY);
  const adjustedDensity = hazardDensity * (1 + chunkDistance * 0.1);
  const hazardCount = Math.floor(totalTiles * adjustedDensity);
  
  for (let i = 0; i < hazardCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * CHUNK_WIDTH);
      y = Math.floor(random() * CHUNK_HEIGHT);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, chunkX, chunkY)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      const biomeTerrain = pickBiomeTerrain(biome, random);
      if (biomeTerrain) {
        terrain.push({
          x,
          y,
          type: biomeTerrain.type,
          icon: biomeTerrain.icon,
          name: biomeTerrain.name,
        });
      }
    }
  }
  
  return terrain;
}

// Generate barriers for a chunk
function generateChunkBarriers(
  random: () => number,
  chunkX: number,
  chunkY: number,
  usedPositions: Set<string>,
  biome: Biome,
  barrierDensity: number
): BarrierTile[] {
  const barriers: BarrierTile[] = [];
  const totalTiles = CHUNK_WIDTH * CHUNK_HEIGHT;
  const barrierCount = Math.floor(totalTiles * barrierDensity);
  
  for (let i = 0; i < barrierCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * CHUNK_WIDTH);
      y = Math.floor(random() * CHUNK_HEIGHT);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, chunkX, chunkY)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      usedPositions.add(`${x},${y}`);
      const biomeBarrier = pickBiomeBarrier(biome, random);
      if (biomeBarrier) {
        barriers.push({
          x,
          y,
          type: biomeBarrier.type,
          icon: biomeBarrier.icon,
          name: biomeBarrier.name,
          isPassable: false,
          requiresModule: biomeBarrier.requiresModule,
        });
      }
    }
  }
  
  return barriers;
}

// Generate patrol route for enemies
function generatePatrolRoute(
  startX: number,
  startY: number,
  length: number,
  random: () => number
): { x: number; y: number }[] {
  const route: { x: number; y: number }[] = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  
  for (let i = 1; i < length; i++) {
    const validDirs = directions.filter(d => {
      const nx = currentX + d.dx;
      const ny = currentY + d.dy;
      return nx >= 0 && nx < CHUNK_WIDTH && ny >= 0 && ny < CHUNK_HEIGHT;
    });
    
    if (validDirs.length === 0) break;
    
    const dir = validDirs[Math.floor(random() * validDirs.length)];
    currentX += dir.dx;
    currentY += dir.dy;
    route.push({ x: currentX, y: currentY });
  }
  
  return route;
}

// Generate enemies for a chunk (scales with distance and player wealth)
function generateChunkEnemies(
  random: () => number,
  chunkX: number,
  chunkY: number,
  usedPositions: Set<string>,
  biome: Biome,
  playerMoney: number
): Enemy[] {
  const enemies: Enemy[] = [];
  const definitions = getEnemyDefinitionsForBiome(biome.id);
  if (definitions.length === 0) return enemies;
  
  const chunkDistance = getChunkDistance(chunkX, chunkY);
  
  // Enemy count scales with chunk distance + player wealth
  const baseCount = Math.min(4, 1 + chunkDistance);
  const wealthBonus = Math.min(4, Math.ceil(playerMoney / 200));
  const enemyCount = baseCount + wealthBonus;
  
  // Calculate total spawn weight
  const totalWeight = definitions.reduce((sum, def) => sum + def.spawnWeight, 0);
  
  for (let i = 0; i < enemyCount; i++) {
    // Pick enemy type based on weighted random
    let roll = random() * totalWeight;
    let selectedDef: EnemyDefinition | null = null;
    
    for (const def of definitions) {
      roll -= def.spawnWeight;
      if (roll <= 0) {
        selectedDef = def;
        break;
      }
    }
    
    if (!selectedDef) continue;
    
    // Find spawn position
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * CHUNK_WIDTH);
      y = Math.floor(random() * CHUNK_HEIGHT);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, chunkX, chunkY)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      let patrolRoute: { x: number; y: number }[] | undefined;
      if (selectedDef.behaviour === 'patrol' && selectedDef.patrolLength) {
        patrolRoute = generatePatrolRoute(x, y, selectedDef.patrolLength, random);
      }
      
      enemies.push({
        id: uuidv4(),
        definitionId: selectedDef.id,
        x,
        y,
        patrolRoute,
        patrolIndex: 0,
        patrolDirection: 1,
        isAlerted: false,
        turnsStationary: 0,
      });
    }
  }
  
  return enemies;
}

// Generate a single chunk
export function generateChunk(
  baseSeed: number,
  chunkX: number,
  chunkY: number,
  biome: Biome,
  playerMoney: number = 0
): JunkyardChunk {
  const chunkSeed = getChunkSeed(baseSeed, chunkX, chunkY);
  const random = seededRandom(chunkSeed);
  const chunkDistance = getChunkDistance(chunkX, chunkY);
  
  // Initialize revealed tiles
  const revealedTiles: boolean[][] = Array(CHUNK_HEIGHT).fill(null).map(() => 
    Array(CHUNK_WIDTH).fill(false)
  );
  
  // Track used positions
  const usedPositions = new Set<string>();
  
  // Reserve entrance area in chunk 0,0
  if (chunkX === 0 && chunkY === 0) {
    const centerX = Math.floor(CHUNK_WIDTH / 2);
    const centerY = Math.floor(CHUNK_HEIGHT / 2);
    usedPositions.add(`${centerX},${centerY}`);
  }
  
  // Generate features
  const walls = generateChunkWalls(random, chunkX, chunkY, usedPositions, biome, biome.wallDensity);
  const barriers = generateChunkBarriers(random, chunkX, chunkY, usedPositions, biome, biome.barrierDensity);
  const terrain = generateChunkTerrain(random, chunkX, chunkY, usedPositions, biome, biome.hazardDensity);
  const piles = generateChunkPiles(random, chunkX, chunkY, usedPositions, chunkDistance);
  const enemies = generateChunkEnemies(random, chunkX, chunkY, usedPositions, biome, playerMoney);
  
  return {
    chunkX,
    chunkY,
    seed: chunkSeed,
    revealedTiles,
    piles,
    walls,
    terrain,
    barriers,
    droppedItems: [],
    enemies,
    isGenerated: true,
  };
}

// Create a new infinite junkyard
export function createInfiniteJunkyard(baseSeed: number, playerMoney: number = 0): InfiniteJunkyard {
  const biome = getBiomeFromSeed(baseSeed);
  
  // Entrance is at center of chunk 0,0
  const entranceX = Math.floor(CHUNK_WIDTH / 2);
  const entranceY = Math.floor(CHUNK_HEIGHT / 2);
  
  // Generate initial chunk (0,0)
  const initialChunk = generateChunk(baseSeed, 0, 0, biome, playerMoney);
  
  const chunks = new Map<string, JunkyardChunk>();
  chunks.set(makeChunkKey(0, 0), initialChunk);
  
  return {
    yardId: uuidv4(),
    baseSeed,
    biomeId: biome.id,
    chunkWidth: CHUNK_WIDTH,
    chunkHeight: CHUNK_HEIGHT,
    chunks,
    entranceX,
    entranceY,
  };
}

// Get or generate a chunk at given coordinates
export function getOrGenerateChunk(
  junkyard: InfiniteJunkyard,
  chunkX: number,
  chunkY: number,
  playerMoney: number = 0
): { junkyard: InfiniteJunkyard; chunk: JunkyardChunk } {
  const key = makeChunkKey(chunkX, chunkY);
  
  const existingChunk = junkyard.chunks.get(key);
  if (existingChunk) {
    return { junkyard, chunk: existingChunk };
  }
  
  // Generate new chunk
  const biome = getBiomeFromSeed(junkyard.baseSeed);
  const newChunk = generateChunk(junkyard.baseSeed, chunkX, chunkY, biome, playerMoney);
  
  const newChunks = new Map(junkyard.chunks);
  newChunks.set(key, newChunk);
  
  return {
    junkyard: { ...junkyard, chunks: newChunks },
    chunk: newChunk,
  };
}

// Reveal tiles around a world position (may span multiple chunks)
export function revealTilesAroundWorld(
  junkyard: InfiniteJunkyard,
  worldX: number,
  worldY: number,
  radius: number = 2,
  playerMoney: number = 0
): InfiniteJunkyard {
  let updatedJunkyard = junkyard;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const targetX = worldX + dx;
      const targetY = worldY + dy;
      
      const { chunkX, chunkY } = worldToChunk(targetX, targetY, CHUNK_WIDTH, CHUNK_HEIGHT);
      const { localX, localY } = worldToLocal(targetX, targetY, CHUNK_WIDTH, CHUNK_HEIGHT);
      
      // Get or generate the chunk
      const { junkyard: newJunkyard, chunk } = getOrGenerateChunk(updatedJunkyard, chunkX, chunkY, playerMoney);
      updatedJunkyard = newJunkyard;
      
      // Reveal the tile
      if (!chunk.revealedTiles[localY]?.[localX]) {
        const newRevealed = chunk.revealedTiles.map(row => [...row]);
        if (newRevealed[localY]) {
          newRevealed[localY][localX] = true;
        }
        
        const updatedChunk = { ...chunk, revealedTiles: newRevealed };
        const newChunks = new Map(updatedJunkyard.chunks);
        newChunks.set(makeChunkKey(chunkX, chunkY), updatedChunk);
        updatedJunkyard = { ...updatedJunkyard, chunks: newChunks };
      }
    }
  }
  
  return updatedJunkyard;
}

// Check if world position is passable
export function isWorldTilePassable(junkyard: InfiniteJunkyard, worldX: number, worldY: number): boolean {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk) return true; // Unexplored chunks are passable by default
  
  // Check walls
  if (chunk.walls.some(w => w.x === localX && w.y === localY)) {
    return false;
  }
  
  // Check impassable barriers
  if (chunk.barriers.some(b => b.x === localX && b.y === localY && !b.isPassable)) {
    return false;
  }
  
  return true;
}

// Get wall at world position
export function getWorldWallAt(junkyard: InfiniteJunkyard, worldX: number, worldY: number): WallTile | null {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk) return null;
  
  return chunk.walls.find(w => w.x === localX && w.y === localY) || null;
}

// Get terrain at world position
export function getWorldTerrainAt(junkyard: InfiniteJunkyard, worldX: number, worldY: number): TerrainTile | null {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk) return null;
  
  return chunk.terrain.find(t => t.x === localX && t.y === localY) || null;
}

// Get barrier at world position
export function getWorldBarrierAt(junkyard: InfiniteJunkyard, worldX: number, worldY: number): BarrierTile | null {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk) return null;
  
  return chunk.barriers.find(b => b.x === localX && b.y === localY) || null;
}

// Get enemy at world position
export function getWorldEnemyAt(junkyard: InfiniteJunkyard, worldX: number, worldY: number): Enemy | null {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk || !chunk.enemies) return null;
  
  return chunk.enemies.find(e => e.x === localX && e.y === localY) || null;
}

// Get pile at world position
export function getWorldPileAt(junkyard: InfiniteJunkyard, worldX: number, worldY: number): JunkPile | null {
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = junkyard.chunks.get(makeChunkKey(chunkX, chunkY));
  if (!chunk) return null;
  
  return chunk.piles.find(p => p.x === localX && p.y === localY) || null;
}

// Check if player is at entrance
export function isAtEntrance(junkyard: InfiniteJunkyard, worldX: number, worldY: number): boolean {
  return worldX === junkyard.entranceX && worldY === junkyard.entranceY;
}

// Generate loot for a pile based on chunk distance
export function generateLootForChunk(
  seed: number,
  chunkX: number,
  chunkY: number
): Item[] {
  const random = seededRandom(seed);
  const chunkDistance = getChunkDistance(chunkX, chunkY);
  const itemCount = 1 + Math.floor(random() * 3);
  const items: Item[] = [];
  
  for (let i = 0; i < itemCount; i++) {
    const rarity = pickRarityForChunk(random, chunkDistance);
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
