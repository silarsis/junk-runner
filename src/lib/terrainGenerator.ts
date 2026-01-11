import { v4 as uuidv4 } from 'uuid';
import { Junkyard, JunkPile, WallTile } from '@/types/game';
import { WALL_ICONS } from '@/data/itemTemplates';

// Modular terrain generation configuration
export interface TerrainConfig {
  width: number;
  height: number;
  pileCountMin: number;
  pileCountMax: number;
  wallDensity: number; // 0-1, percentage of tiles that are walls
  spawnClearRadius: number; // Keep area around spawn clear
}

const DEFAULT_CONFIG: TerrainConfig = {
  width: 12,
  height: 12,
  pileCountMin: 15,
  pileCountMax: 25,
  wallDensity: 0.15, // 15% of tiles are walls
  spawnClearRadius: 2,
};

// Seeded random number generator for reproducible maps
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Check if a position is within the spawn-safe zone
function isInSpawnZone(x: number, y: number, config: TerrainConfig): boolean {
  return x <= config.spawnClearRadius && y <= config.spawnClearRadius;
}

// Generate wall positions
function generateWalls(
  random: () => number, 
  config: TerrainConfig, 
  usedPositions: Set<string>
): WallTile[] {
  const walls: WallTile[] = [];
  const totalTiles = config.width * config.height;
  const wallCount = Math.floor(totalTiles * config.wallDensity);
  
  for (let i = 0; i < wallCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * config.width);
      y = Math.floor(random() * config.height);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, config)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      usedPositions.add(`${x},${y}`);
      walls.push({
        x,
        y,
        icon: WALL_ICONS[Math.floor(random() * WALL_ICONS.length)],
      });
    }
  }
  
  return walls;
}

// Generate junk piles
function generatePiles(
  random: () => number, 
  config: TerrainConfig, 
  usedPositions: Set<string>
): JunkPile[] {
  const piles: JunkPile[] = [];
  const pileCount = config.pileCountMin + Math.floor(random() * (config.pileCountMax - config.pileCountMin));
  
  for (let i = 0; i < pileCount; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * config.width);
      y = Math.floor(random() * config.height);
      attempts++;
    } while (usedPositions.has(`${x},${y}`) && attempts < 50);
    
    if (attempts < 50) {
      usedPositions.add(`${x},${y}`);
      piles.push({
        id: uuidv4(),
        x,
        y,
        progressTurns: 0,
        isDepleted: false,
      });
    }
  }
  
  return piles;
}

// Main junkyard generation function
export function generateJunkyard(seed: number, configOverrides?: Partial<TerrainConfig>): Junkyard {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const random = seededRandom(seed);
  
  // Initialize revealed tiles
  const revealedTiles: boolean[][] = Array(config.height).fill(null).map(() => 
    Array(config.width).fill(false)
  );
  
  // Track used positions to prevent overlaps
  const usedPositions = new Set<string>();
  usedPositions.add('0,0'); // Reserve spawn point
  
  // Generate terrain features in order
  const walls = generateWalls(random, config, usedPositions);
  const piles = generatePiles(random, config, usedPositions);
  
  return {
    yardId: uuidv4(),
    seed,
    width: config.width,
    height: config.height,
    revealedTiles,
    piles,
    walls,
    droppedItems: [],
  };
}

// Check if a tile is passable (not a wall)
export function isTilePassable(junkyard: Junkyard, x: number, y: number): boolean {
  if (x < 0 || x >= junkyard.width || y < 0 || y >= junkyard.height) {
    return false;
  }
  return !junkyard.walls.some(w => w.x === x && w.y === y);
}

// Get wall at position
export function getWallAt(junkyard: Junkyard, x: number, y: number): WallTile | null {
  return junkyard.walls.find(w => w.x === x && w.y === y) || null;
}
