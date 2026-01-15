import { v4 as uuidv4 } from 'uuid';
import { Junkyard, JunkPile, WallTile, TerrainTile, TerrainType, BarrierTile } from '@/types/game';
import { Enemy, EnemyDefinition, getEnemyDefinitionsForBiome } from '@/types/enemies';
import { WALL_ICONS } from '@/data/itemTemplates';
import { Biome, getBiomeFromSeed, pickBiomeTerrain, pickBiomeBarrier, pickBiomeWall } from '@/data/biomes';
// Legacy terrain config for fallback (when no biome)
export const LEGACY_TERRAIN_CONFIG: Partial<Record<TerrainType, { icon: string; weight: number }>> = {
  mud: { icon: '🟤', weight: 25 },
  toxic: { icon: '☢️', weight: 15 },
  oil: { icon: '🛢️', weight: 20 },
  electric: { icon: '⚡', weight: 10 },
  magnetic: { icon: '🧲', weight: 15 },
  fog: { icon: '🌫️', weight: 15 },
};

// All terrain types with their display info
export const TERRAIN_DISPLAY: Record<TerrainType, { icon: string; name: string; bg: string; border: string }> = {
  // Legacy
  mud: { icon: '🟤', name: 'Mud', bg: 'bg-amber-900/40', border: 'border-amber-700/50' },
  toxic: { icon: '☢️', name: 'Toxic', bg: 'bg-lime-500/30', border: 'border-lime-400/50' },
  oil: { icon: '🛢️', name: 'Oil', bg: 'bg-slate-800/60', border: 'border-slate-600/50' },
  electric: { icon: '⚡', name: 'Electric', bg: 'bg-yellow-400/30', border: 'border-yellow-300/50' },
  magnetic: { icon: '🧲', name: 'Magnetic', bg: 'bg-purple-500/30', border: 'border-purple-400/50' },
  fog: { icon: '🌫️', name: 'Fog', bg: 'bg-slate-400/40', border: 'border-slate-300/50' },
  // Nuclear
  irradiated: { icon: '☢️', name: 'Irradiated', bg: 'bg-yellow-500/30', border: 'border-yellow-400/60' },
  cooling_trench: { icon: '💧', name: 'Cooling Trench', bg: 'bg-cyan-600/30', border: 'border-cyan-400/50' },
  cratered: { icon: '🕳️', name: 'Cratered', bg: 'bg-stone-700/40', border: 'border-stone-500/50' },
  // Neon Slum
  cable_sprawl: { icon: '〰️', name: 'Cable Sprawl', bg: 'bg-orange-600/30', border: 'border-orange-400/50' },
  broken_pavement: { icon: '🔲', name: 'Broken Pavement', bg: 'bg-gray-600/30', border: 'border-gray-400/40' },
  neon_pool: { icon: '💜', name: 'Neon Pool', bg: 'bg-fuchsia-500/40', border: 'border-fuchsia-400/60' },
  // Industrial
  oil_slick: { icon: '🛢️', name: 'Oil Slick', bg: 'bg-neutral-800/50', border: 'border-neutral-600/50' },
  assembly_line: { icon: '⚙️', name: 'Assembly Line', bg: 'bg-zinc-600/30', border: 'border-zinc-400/40' },
  collapsed_catwalk: { icon: '🌉', name: 'Collapsed Catwalk', bg: 'bg-red-900/30', border: 'border-red-700/50' },
  // Biowaste
  organic_sludge: { icon: '🟢', name: 'Organic Sludge', bg: 'bg-green-700/40', border: 'border-green-500/50' },
  flesh_mound: { icon: '🫀', name: 'Flesh Mound', bg: 'bg-rose-800/40', border: 'border-rose-600/50' },
  drainage: { icon: '🔳', name: 'Drainage', bg: 'bg-slate-500/30', border: 'border-slate-400/40' },
  // Cloudfall
  cooling_fog: { icon: '🌫️', name: 'Cooling Fog', bg: 'bg-blue-300/30', border: 'border-blue-200/40' },
  server_rack: { icon: '🖲️', name: 'Server Rack', bg: 'bg-indigo-600/30', border: 'border-indigo-400/40' },
  magnetic_floor: { icon: '🧲', name: 'Magnetic Floor', bg: 'bg-violet-600/30', border: 'border-violet-400/50' },
};

// Modular terrain generation configuration
export interface TerrainConfig {
  width: number;
  height: number;
  pileCountMin: number;
  pileCountMax: number;
  wallDensity: number;
  hazardDensity: number;
  barrierDensity: number;
  spawnClearRadius: number;
}

const DEFAULT_CONFIG: TerrainConfig = {
  width: 12,
  height: 12,
  pileCountMin: 15,
  pileCountMax: 25,
  wallDensity: 0.12,
  hazardDensity: 0.15,
  barrierDensity: 0.05,
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

// Generate wall positions using biome-specific walls
function generateWalls(
  random: () => number, 
  config: TerrainConfig, 
  usedPositions: Set<string>,
  biome?: Biome
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
      const icon = biome ? pickBiomeWall(biome, random) : WALL_ICONS[Math.floor(random() * WALL_ICONS.length)];
      walls.push({ x, y, icon });
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
        requiredTurns: 1 + Math.floor(random() * 5), // Random 1-5 turns
        isDepleted: false,
      });
    }
  }
  
  return piles;
}

// Generate terrain hazards using biome-specific types
function generateTerrain(
  random: () => number, 
  config: TerrainConfig, 
  usedPositions: Set<string>,
  biome?: Biome
): TerrainTile[] {
  const terrain: TerrainTile[] = [];
  const totalTiles = config.width * config.height;
  const hazardCount = Math.floor(totalTiles * config.hazardDensity);
  
  for (let i = 0; i < hazardCount; i++) {
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
      // Don't add to usedPositions - terrain can coexist with piles
      if (biome) {
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
      } else {
        // Legacy fallback
        const legacyTypes = Object.keys(LEGACY_TERRAIN_CONFIG) as TerrainType[];
        const totalWeight = legacyTypes.reduce((sum, t) => sum + (LEGACY_TERRAIN_CONFIG[t]?.weight || 0), 0);
        let roll = random() * totalWeight;
        
        for (const type of legacyTypes) {
          roll -= LEGACY_TERRAIN_CONFIG[type]?.weight || 0;
          if (roll <= 0) {
            terrain.push({
              x,
              y,
              type,
              icon: LEGACY_TERRAIN_CONFIG[type]?.icon || '❓',
            });
            break;
          }
        }
      }
    }
  }
  
  return terrain;
}

// Generate barriers (soft gates)
function generateBarriers(
  random: () => number,
  config: TerrainConfig,
  usedPositions: Set<string>,
  biome?: Biome
): BarrierTile[] {
  const barriers: BarrierTile[] = [];
  if (!biome) return barriers;
  
  const totalTiles = config.width * config.height;
  const barrierCount = Math.floor(totalTiles * config.barrierDensity);
  
  for (let i = 0; i < barrierCount; i++) {
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

// Generate enemies based on biome
function generateEnemies(
  random: () => number,
  config: TerrainConfig,
  usedPositions: Set<string>,
  biome: Biome
): Enemy[] {
  const enemies: Enemy[] = [];
  const definitions = getEnemyDefinitionsForBiome(biome.id);
  if (definitions.length === 0) return enemies;
  
  // Start with 3-5 enemies, scaling with map size
  const enemyCount = 3 + Math.floor(random() * 3);
  
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
    
    // Find spawn position (not in spawn zone, not on walls)
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.floor(random() * config.width);
      y = Math.floor(random() * config.height);
      attempts++;
    } while (
      (usedPositions.has(`${x},${y}`) || isInSpawnZone(x, y, config) || 
       // Keep enemies away from spawn - at least 4 tiles
       (x < 4 && y < 4)) && 
      attempts < 50
    );
    
    if (attempts < 50) {
      // Generate patrol route for patrol behaviour
      let patrolRoute: { x: number; y: number }[] | undefined;
      if (selectedDef.behaviour === 'patrol' && selectedDef.patrolLength) {
        patrolRoute = generatePatrolRoute(x, y, selectedDef.patrolLength, config, random);
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

// Generate a patrol route for patrol-type enemies
function generatePatrolRoute(
  startX: number,
  startY: number,
  length: number,
  config: TerrainConfig,
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
    // Pick a random valid direction
    const validDirs = directions.filter(d => {
      const nx = currentX + d.dx;
      const ny = currentY + d.dy;
      return nx >= 0 && nx < config.width && ny >= 0 && ny < config.height;
    });
    
    if (validDirs.length === 0) break;
    
    const dir = validDirs[Math.floor(random() * validDirs.length)];
    currentX += dir.dx;
    currentY += dir.dy;
    route.push({ x: currentX, y: currentY });
  }
  
  return route;
}

// Main junkyard generation function with biome support
export function generateJunkyard(seed: number, configOverrides?: Partial<TerrainConfig>): Junkyard {
  const biome = getBiomeFromSeed(seed);
  
  // Apply biome-specific density overrides
  const biomeConfig: Partial<TerrainConfig> = {
    wallDensity: biome.wallDensity,
    hazardDensity: biome.hazardDensity,
    barrierDensity: biome.barrierDensity,
  };
  
  const config = { ...DEFAULT_CONFIG, ...biomeConfig, ...configOverrides };
  const random = seededRandom(seed);
  
  // Initialize revealed tiles
  const revealedTiles: boolean[][] = Array(config.height).fill(null).map(() => 
    Array(config.width).fill(false)
  );
  
  // Track used positions to prevent overlaps
  const usedPositions = new Set<string>();
  usedPositions.add('0,0'); // Reserve spawn point
  
  // Generate terrain features in order
  const walls = generateWalls(random, config, usedPositions, biome);
  const barriers = generateBarriers(random, config, usedPositions, biome);
  const terrain = generateTerrain(random, config, usedPositions, biome);
  const piles = generatePiles(random, config, usedPositions);
  const enemies = generateEnemies(random, config, usedPositions, biome);
  
  return {
    yardId: uuidv4(),
    seed,
    biomeId: biome.id,
    width: config.width,
    height: config.height,
    revealedTiles,
    piles,
    walls,
    terrain,
    barriers,
    droppedItems: [],
    enemies,
  };
}

// Get enemy at position
export function getEnemyAt(junkyard: Junkyard, x: number, y: number): Enemy | null {
  if (!junkyard.enemies) return null;
  return junkyard.enemies.find(e => e.x === x && e.y === y) || null;
}

// Check if a tile is passable (not a wall or impassable barrier)
export function isTilePassable(junkyard: Junkyard, x: number, y: number): boolean {
  if (x < 0 || x >= junkyard.width || y < 0 || y >= junkyard.height) {
    return false;
  }
  if (junkyard.walls.some(w => w.x === x && w.y === y)) {
    return false;
  }
  if (junkyard.barriers.some(b => b.x === x && b.y === y && !b.isPassable)) {
    return false;
  }
  return true;
}

// Get wall at position
export function getWallAt(junkyard: Junkyard, x: number, y: number): WallTile | null {
  return junkyard.walls.find(w => w.x === x && w.y === y) || null;
}

// Get terrain at position
export function getTerrainAt(junkyard: Junkyard, x: number, y: number): TerrainTile | null {
  return junkyard.terrain.find(t => t.x === x && t.y === y) || null;
}

// Get barrier at position
export function getBarrierAt(junkyard: Junkyard, x: number, y: number): BarrierTile | null {
  return junkyard.barriers.find(b => b.x === x && b.y === y) || null;
}
