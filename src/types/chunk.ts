// Chunk-based infinite junkyard system types

import { JunkPile, WallTile, TerrainTile, BarrierTile, DroppedItem } from './game';
import { Enemy } from './enemies';

// Chunk coordinates (in chunk-space, not tile-space)
export interface ChunkCoord {
  chunkX: number;
  chunkY: number;
}

// A single chunk of the junkyard (same size as old full junkyard)
export interface JunkyardChunk {
  chunkX: number;
  chunkY: number;
  seed: number; // Derived from base seed + chunk coords
  revealedTiles: boolean[][];
  piles: JunkPile[];
  walls: WallTile[];
  terrain: TerrainTile[];
  barriers: BarrierTile[];
  droppedItems: DroppedItem[];
  enemies: Enemy[];
  isGenerated: boolean;
}

// The infinite junkyard containing multiple chunks
export interface InfiniteJunkyard {
  yardId: string;
  baseSeed: number;
  biomeId: string;
  chunkWidth: number;  // Width of each chunk in tiles (e.g., 12)
  chunkHeight: number; // Height of each chunk in tiles (e.g., 12)
  chunks: Map<string, JunkyardChunk>; // Key: "chunkX,chunkY"
  entranceX: number; // World X of entrance (center of chunk 0,0)
  entranceY: number; // World Y of entrance (center of chunk 0,0)
}

// Serializable version for localStorage (Map -> object)
export interface SerializableInfiniteJunkyard {
  yardId: string;
  baseSeed: number;
  biomeId: string;
  chunkWidth: number;
  chunkHeight: number;
  chunks: Record<string, JunkyardChunk>;
  entranceX: number;
  entranceY: number;
}

// Convert chunk key to coords
export function parseChunkKey(key: string): ChunkCoord {
  const [x, y] = key.split(',').map(Number);
  return { chunkX: x, chunkY: y };
}

// Create chunk key from coords
export function makeChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`;
}

// Convert world coordinates to chunk coordinates
export function worldToChunk(worldX: number, worldY: number, chunkWidth: number, chunkHeight: number): ChunkCoord {
  return {
    chunkX: Math.floor(worldX / chunkWidth),
    chunkY: Math.floor(worldY / chunkHeight),
  };
}

// Convert world coordinates to local chunk coordinates
export function worldToLocal(worldX: number, worldY: number, chunkWidth: number, chunkHeight: number): { localX: number; localY: number } {
  // Handle negative coords properly
  let localX = worldX % chunkWidth;
  let localY = worldY % chunkHeight;
  if (localX < 0) localX += chunkWidth;
  if (localY < 0) localY += chunkHeight;
  return { localX, localY };
}

// Convert chunk + local coordinates to world coordinates
export function chunkLocalToWorld(
  chunkX: number, 
  chunkY: number, 
  localX: number, 
  localY: number, 
  chunkWidth: number, 
  chunkHeight: number
): { worldX: number; worldY: number } {
  return {
    worldX: chunkX * chunkWidth + localX,
    worldY: chunkY * chunkHeight + localY,
  };
}

// Calculate distance from entrance in chunks (for rarity scaling)
export function getChunkDistance(chunkX: number, chunkY: number): number {
  // Chebyshev distance (max of absolute differences) - gives square rings
  return Math.max(Math.abs(chunkX), Math.abs(chunkY));
}

// Calculate distance from entrance in tiles (for more granular rarity)
export function getTileDistanceFromEntrance(
  worldX: number, 
  worldY: number, 
  entranceX: number, 
  entranceY: number
): number {
  const dx = worldX - entranceX;
  const dy = worldY - entranceY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Serialize infinite junkyard for storage
export function serializeInfiniteJunkyard(junkyard: InfiniteJunkyard): SerializableInfiniteJunkyard {
  const chunks: Record<string, JunkyardChunk> = {};
  junkyard.chunks.forEach((chunk, key) => {
    chunks[key] = chunk;
  });
  return {
    yardId: junkyard.yardId,
    baseSeed: junkyard.baseSeed,
    biomeId: junkyard.biomeId,
    chunkWidth: junkyard.chunkWidth,
    chunkHeight: junkyard.chunkHeight,
    chunks,
    entranceX: junkyard.entranceX,
    entranceY: junkyard.entranceY,
  };
}

// Deserialize infinite junkyard from storage
export function deserializeInfiniteJunkyard(data: SerializableInfiniteJunkyard): InfiniteJunkyard {
  const chunks = new Map<string, JunkyardChunk>();
  Object.entries(data.chunks).forEach(([key, chunk]) => {
    chunks.set(key, chunk);
  });
  return {
    yardId: data.yardId,
    baseSeed: data.baseSeed,
    biomeId: data.biomeId,
    chunkWidth: data.chunkWidth,
    chunkHeight: data.chunkHeight,
    chunks,
    entranceX: data.entranceX,
    entranceY: data.entranceY,
  };
}
