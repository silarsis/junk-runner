import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Home, Package, Battery, BatteryWarning, MapPin, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, JunkPile, Bag, HelperRobot, TerrainType, Item, Junkyard } from '@/types/game';
import { getEnemyDefinition, Enemy } from '@/types/enemies';
import { hasStatusEffect } from '@/lib/enemyAI';
import { TERRAIN_DISPLAY } from '@/lib/terrainGenerator';
import { 
  worldToChunk, 
  worldToLocal, 
  makeChunkKey,
  getChunkDistance,
} from '@/types/chunk';
import {
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  isWorldTilePassable,
  getWorldWallAt,
  getWorldTerrainAt,
  getWorldBarrierAt,
  getWorldEnemyAt,
  getWorldPileAt,
  isAtEntrance,
  getChunkSafe,
} from '@/lib/chunkGenerator';
import { cn } from '@/lib/utils';
import { ConsumableToolbar } from './ConsumableToolbar';

// Viewport size (tiles visible around player)
const VIEWPORT_RADIUS = 5; // 11x11 viewport
const VIEWPORT_SIZE = VIEWPORT_RADIUS * 2 + 1;

// Hook to calculate responsive cell size based on screen dimensions
function useResponsiveCellSize(gridSize: number) {
  const [cellSize, setCellSize] = useState(32);

  useEffect(() => {
    const calculateCellSize = () => {
      // Get available space (header ~44px, footer ~70px, padding ~16px, search progress ~50px)
      const availableHeight = window.innerHeight - 180;
      const availableWidth = window.innerWidth - 16; // 8px padding on each side
      
      // Calculate max cell size that fits both dimensions
      const maxCellFromHeight = Math.floor(availableHeight / gridSize);
      const maxCellFromWidth = Math.floor(availableWidth / gridSize);
      
      // Use the smaller of the two, clamped between 28px and 48px
      const optimalSize = Math.min(maxCellFromHeight, maxCellFromWidth);
      setCellSize(Math.max(28, Math.min(48, optimalSize)));
    };

    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);
    return () => window.removeEventListener('resize', calculateCellSize);
  }, [gridSize]);

  return cellSize;
}

type MovementType = 'basic' | 'diagonal' | 'jump' | 'extended';

interface JunkyardScreenProps {
  gameState: GameState;
  maxBattery: number;
  currentBag: Bag;
  onMove: (dx: number, dy: number) => void;
  currentPile: JunkPile | null;
  onSearch: () => void;
  onWait: () => void;
  onReturnToBase: () => void;
  onOpenInventory: () => void;
  pileRevealCount?: number;
  getPilePreview?: (pile: JunkPile) => Item[];
  loadedConsumables: Item[];
  launcherCapacity: number;
  onFireConsumable: (index: number) => void;
}

// Get movement type from primary helper
function getMovementType(helpers: HelperRobot[]): MovementType {
  const primary = helpers.find(h => h.isPrimary);
  if (primary?.components.mobility?.movementType) {
    return primary.components.mobility.movementType;
  }
  return 'basic';
}

// Check if a move is valid for the given movement type
function isValidMove(dx: number, dy: number, movementType: MovementType): boolean {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  switch (movementType) {
    case 'basic':
      return (absDx + absDy === 1) && (absDx <= 1 && absDy <= 1);
    case 'extended':
      return ((absDx === 0 && absDy >= 1 && absDy <= 2) || (absDy === 0 && absDx >= 1 && absDx <= 2));
    case 'diagonal':
      return (absDx <= 1 && absDy <= 1) && (absDx + absDy >= 1);
    case 'jump':
      return (absDx <= 2 && absDy <= 2) && (absDx + absDy >= 1);
    default:
      return false;
  }
}

// Get all valid move targets for visualization (using world coordinates)
function getValidMoveTargets(
  playerWorldX: number, 
  playerWorldY: number, 
  movementType: MovementType, 
  infiniteJunkyard: GameState['infiniteJunkyard']
): Set<string> {
  const validTargets = new Set<string>();
  if (!infiniteJunkyard) return validTargets;
  
  const range = (movementType === 'jump' || movementType === 'extended') ? 2 : 1;
  
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const targetX = playerWorldX + dx;
      const targetY = playerWorldY + dy;
      
      if (!isValidMove(dx, dy, movementType)) continue;
      
      if (isWorldTilePassable(infiniteJunkyard, targetX, targetY)) {
        validTargets.add(`${targetX},${targetY}`);
      }
    }
  }
  
  return validTargets;
}

// Get tile data at world position from infinite junkyard
function getTileDataAtWorld(
  infiniteJunkyard: GameState['infiniteJunkyard'],
  worldX: number,
  worldY: number
): {
  isRevealed: boolean;
  pile: JunkPile | null;
  wall: ReturnType<typeof getWorldWallAt>;
  terrain: ReturnType<typeof getWorldTerrainAt>;
  barrier: ReturnType<typeof getWorldBarrierAt>;
  enemy: Enemy | null;
} {
  if (!infiniteJunkyard) {
    return { isRevealed: false, pile: null, wall: null, terrain: null, barrier: null, enemy: null };
  }
  
  const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const { localX, localY } = worldToLocal(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
  
  const chunk = getChunkSafe(infiniteJunkyard, makeChunkKey(chunkX, chunkY));
  
  if (!chunk) {
    return { isRevealed: false, pile: null, wall: null, terrain: null, barrier: null, enemy: null };
  }
  
  const isRevealed = chunk.revealedTiles[localY]?.[localX] ?? false;
  const pile = chunk.piles.find(p => p.x === localX && p.y === localY) || null;
  const wall = chunk.walls.find(w => w.x === localX && w.y === localY) || null;
  const terrain = chunk.terrain.find(t => t.x === localX && t.y === localY) || null;
  const barrier = chunk.barriers.find(b => b.x === localX && b.y === localY) || null;
  const enemy = chunk.enemies?.find(e => e.x === localX && e.y === localY) || null;
  
  return { isRevealed, pile, wall, terrain, barrier, enemy };
}

// Get tiles within threat range of enemies in viewport
function getEnemyThreatTiles(
  infiniteJunkyard: GameState['infiniteJunkyard'],
  viewportTiles: { worldX: number; worldY: number }[]
): Map<string, { threat: 'adjacent' | 'nearby'; color: string }> {
  const threatTiles = new Map<string, { threat: 'adjacent' | 'nearby'; color: string }>();
  if (!infiniteJunkyard) return threatTiles;
  
  // Find all enemies in visible chunks
  const enemiesInView: { enemy: Enemy; worldX: number; worldY: number }[] = [];
  
  for (const { worldX, worldY } of viewportTiles) {
    const { chunkX, chunkY } = worldToChunk(worldX, worldY, CHUNK_WIDTH, CHUNK_HEIGHT);
    const chunk = getChunkSafe(infiniteJunkyard, makeChunkKey(chunkX, chunkY));
    if (!chunk || !chunk.enemies) continue;
    
    for (const enemy of chunk.enemies) {
      const enemyWorldX = chunkX * CHUNK_WIDTH + enemy.x;
      const enemyWorldY = chunkY * CHUNK_HEIGHT + enemy.y;
      
      // Only add if in viewport
      if (viewportTiles.some(t => t.worldX === enemyWorldX && t.worldY === enemyWorldY)) {
        enemiesInView.push({ enemy, worldX: enemyWorldX, worldY: enemyWorldY });
      }
    }
  }
  
  for (const { enemy, worldX: enemyX, worldY: enemyY } of enemiesInView) {
    const def = getEnemyDefinition(enemy.definitionId);
    if (!def) continue;
    
    const threatColor = 
      def.threatLevel === 'deadly' ? 'bg-red-600/15' :
      def.threatLevel === 'dangerous' ? 'bg-red-500/10' :
      def.threatLevel === 'moderate' ? 'bg-orange-500/10' :
      'bg-yellow-500/5';
    
    // Mark adjacent tiles as dangerous
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const key = `${enemyX + dx},${enemyY + dy}`;
        const existing = threatTiles.get(key);
        if (!existing || existing.threat === 'nearby') {
          threatTiles.set(key, { threat: 'adjacent', color: threatColor });
        }
      }
    }
    
    // For chasing/dangerous enemies, mark 2-range tiles
    if (def.behaviour === 'chase' || def.threatLevel === 'dangerous' || def.threatLevel === 'deadly') {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          const key = `${enemyX + dx},${enemyY + dy}`;
          if (!threatTiles.has(key)) {
            threatTiles.set(key, { threat: 'nearby', color: threatColor.replace('/15', '/5').replace('/10', '/5') });
          }
        }
      }
    }
  }
  
  return threatTiles;
}

export function JunkyardScreen({
  gameState,
  maxBattery,
  currentBag,
  onMove,
  currentPile,
  onSearch,
  onWait,
  onReturnToBase,
  onOpenInventory,
  pileRevealCount = 0,
  getPilePreview,
  loadedConsumables,
  launcherCapacity,
  onFireConsumable,
}: JunkyardScreenProps) {
  const { infiniteJunkyard, player, turnCount } = gameState;
  const [inspectInfo, setInspectInfo] = useState<{ x: number; y: number; content: string; effect?: string } | null>(null);
  
  if (!infiniteJunkyard) return null;

  const cellSize = useResponsiveCellSize(VIEWPORT_SIZE);
  const currentWeight = currentBag.items.reduce((sum, i) => sum + i.weight, 0);
  const batteryPercent = (player.currentCharge / maxBattery) * 100;
  const isBatteryLow = player.currentCharge <= 5;
  const isBatteryEmpty = player.currentCharge <= 0;
  
  // Calculate chunk distance for display
  const { chunkX, chunkY } = worldToChunk(player.playerX, player.playerY, CHUNK_WIDTH, CHUNK_HEIGHT);
  const chunkDistance = getChunkDistance(chunkX, chunkY);
  
  // Check if at entrance
  const atEntrance = isAtEntrance(infiniteJunkyard, player.playerX, player.playerY);

  // Generate viewport tiles (world coordinates)
  const viewportTiles = useMemo(() => {
    const tiles: { worldX: number; worldY: number; viewX: number; viewY: number }[] = [];
    for (let vy = 0; vy < VIEWPORT_SIZE; vy++) {
      for (let vx = 0; vx < VIEWPORT_SIZE; vx++) {
        const worldX = player.playerX - VIEWPORT_RADIUS + vx;
        const worldY = player.playerY - VIEWPORT_RADIUS + vy;
        tiles.push({ worldX, worldY, viewX: vx, viewY: vy });
      }
    }
    return tiles;
  }, [player.playerX, player.playerY]);

  const getRarityClass = (pile: JunkPile) => {
    if (pile.isDepleted) return 'bg-pile-depleted';
    return 'bg-pile-active';
  };

  // Check if a pile is adjacent to the player (for scanner reveal)
  const isPileAdjacent = (pileWorldX: number, pileWorldY: number) => {
    const dx = Math.abs(pileWorldX - player.playerX);
    const dy = Math.abs(pileWorldY - player.playerY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  };

  // Get scanned items for an adjacent pile
  const getScannedItems = (pile: JunkPile, pileWorldX: number, pileWorldY: number): Item[] => {
    if (!getPilePreview || pileRevealCount === 0) return [];
    if (!isPileAdjacent(pileWorldX, pileWorldY) || pile.isDepleted) return [];
    const items = getPilePreview(pile);
    return items.slice(0, pileRevealCount);
  };

  const movementType = getMovementType(player.helpers);
  const validMoveTargets = getValidMoveTargets(player.playerX, player.playerY, movementType, infiniteJunkyard);
  const enemyThreatTiles = getEnemyThreatTiles(infiniteJunkyard, viewportTiles);

  // Handle tapping on self (player tile)
  const handleSelfTap = () => {
    if (isBatteryEmpty) return;
    
    // If on a pile, search it; otherwise wait a turn
    if (currentPile && !currentPile.isDepleted) {
      onSearch();
    } else {
      onWait();
    }
  };

  // Get info about a tile for inspection
  const getTileInfo = (worldX: number, worldY: number): { name: string; effect?: string } | null => {
    const { isRevealed, pile, wall, terrain, barrier, enemy } = getTileDataAtWorld(infiniteJunkyard, worldX, worldY);
    if (!isRevealed) return null;
    
    // Check for enemy
    if (enemy) {
      const def = getEnemyDefinition(enemy.definitionId);
      if (def) {
        return {
          name: `${def.icon} ${def.name}`,
          effect: def.description,
        };
      }
    }
    
    // Check for wall
    if (wall) {
      return {
        name: `${wall.icon} Obstacle`,
        effect: 'Impassable debris',
      };
    }
    
    // Check for barrier
    if (barrier) {
      return {
        name: `${barrier.icon} Barrier`,
        effect: barrier.isPassable ? 'Passable obstruction' : 'Blocked path',
      };
    }
    
    // Check for pile
    if (pile) {
      return {
        name: `📦 Junk Pile`,
        effect: pile.isDepleted ? 'Already searched' : `${pile.requiredTurns} turns to search`,
      };
    }
    
    // Check for terrain
    if (terrain) {
      const terrainInfo = TERRAIN_DISPLAY[terrain.type];
      return {
        name: `${terrain.icon} ${terrainInfo?.name || terrain.type}`,
        effect: getTerrainEffectDescription(terrain.type),
      };
    }
    
    return null;
  };

  // Get terrain effect description
  const getTerrainEffectDescription = (type: string): string => {
    const effects: Record<string, string> = {
      mud: 'Costs 2 battery (treads ignore)',
      toxic: 'Damages item condition',
      oil: 'Slide 1 tile in movement direction',
      electric: 'Drains 3 battery',
      magnetic: 'Heavy items weigh 2x',
      fog: 'Reduces visibility to 1 tile',
      irradiated: 'Costs 2 battery, damages components',
      cooling_trench: 'Costs 2 battery',
      cratered: 'Rough terrain',
      cable_sprawl: 'Costs 2 battery',
      broken_pavement: 'Uneven ground',
      neon_pool: 'Costs 2 battery',
      oil_slick: 'Slide in movement direction',
      assembly_line: 'Moving machinery',
      collapsed_catwalk: 'Costs 2 battery',
      organic_sludge: 'Costs 2 battery',
      flesh_mound: 'Biological hazard',
      drainage: 'Slippery grating',
      cooling_fog: 'Reduces visibility',
      server_rack: 'Electronic interference',
      magnetic_floor: 'Magnetic field',
    };
    return effects[type] || 'Hazardous terrain';
  };

  const handleTileClick = (worldX: number, worldY: number, isPlayer: boolean, canMoveTo: boolean) => {
    // If tapping on self, handle self-tap
    if (isPlayer) {
      handleSelfTap();
      return;
    }
    
    // If can move to tile, move there
    if (canMoveTo && !isBatteryEmpty) {
      setInspectInfo(null);
      const dx = worldX - player.playerX;
      const dy = worldY - player.playerY;
      onMove(dx, dy);
      return;
    }
    
    // Otherwise, show info about the tile (if revealed)
    const info = getTileInfo(worldX, worldY);
    if (info) {
      setInspectInfo({ x: worldX, y: worldY, content: info.name, effect: info.effect });
      // Auto-dismiss after 3 seconds
      setTimeout(() => setInspectInfo(prev => 
        prev?.x === worldX && prev?.y === worldY ? null : prev
      ), 3000);
    }
  };

  const isValidTarget = (worldX: number, worldY: number) => {
    return validMoveTargets.has(`${worldX},${worldY}`);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - Compact */}
      <header className="industrial-panel px-2 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReturnToBase}>
            <Home className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground leading-none">Turn</p>
            <p className="font-mono text-sm leading-tight">{turnCount}</p>
          </div>
          {/* Distance indicator */}
          <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-xs">
            <Compass className="w-3 h-3 text-primary" />
            <span className="font-mono">{chunkDistance}</span>
          </div>
          {/* Consumable toolbar */}
          {launcherCapacity > 0 && (
            <ConsumableToolbar
              loadedConsumables={loadedConsumables}
              launcherCapacity={launcherCapacity}
              onFireConsumable={onFireConsumable}
              disabled={isBatteryEmpty}
            />
          )}
        </div>
        
        {/* Battery indicator */}
        <div className="flex items-center gap-1.5">
          {isBatteryLow ? (
            <BatteryWarning className={cn("w-4 h-4", isBatteryEmpty ? "text-destructive" : "text-accent animate-pulse")} />
          ) : (
            <Battery className="w-4 h-4 text-primary" />
          )}
          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full",
                isBatteryEmpty ? "bg-destructive" : isBatteryLow ? "bg-accent" : "bg-primary"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${batteryPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className={cn(
            "font-mono text-xs",
            isBatteryEmpty ? "text-destructive" : isBatteryLow ? "text-accent" : "text-foreground"
          )}>
            {player.currentCharge}
          </span>
        </div>

        <Button 
          variant="steel" 
          size="sm" 
          onClick={onOpenInventory}
          className="flex items-center gap-1 h-7 px-2"
        >
          <Package className="w-3 h-3" />
          <span className="font-mono text-xs">{currentWeight}/{currentBag.maxWeight}</span>
        </Button>
      </header>

      {/* Battery Empty Warning - Compact */}
      {isBatteryEmpty && (
        <motion.div
          className="mx-2 mt-1 px-2 py-1.5 bg-destructive/20 border border-destructive rounded text-center shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs text-destructive font-industrial">
            ⚠️ BATTERY DEPLETED - Return to Base
          </p>
        </motion.div>
      )}
      
      {/* Entrance indicator */}
      {atEntrance && (
        <motion.div
          className="mx-2 mt-1 px-2 py-1.5 bg-primary/20 border border-primary rounded text-center shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs text-primary font-industrial flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            ENTRANCE - Exit to save junkyard
          </p>
        </motion.div>
      )}

      {/* Map Grid - Viewport centered on player */}
      <main className="flex-1 p-2 flex flex-col items-center justify-center overflow-hidden min-h-0">
        <div 
          className="junk-grid"
          style={{ 
            gridTemplateColumns: `repeat(${VIEWPORT_SIZE}, ${cellSize}px)`,
            gap: `${Math.max(1, Math.floor(cellSize / 12))}px`,
          }}
        >
          {viewportTiles.map(({ worldX, worldY, viewX, viewY }) => {
            const { isRevealed, pile, wall, terrain, barrier, enemy } = getTileDataAtWorld(infiniteJunkyard, worldX, worldY);
            const enemyDef = enemy ? getEnemyDefinition(enemy.definitionId) : null;
            const isPlayer = worldX === player.playerX && worldY === player.playerY;
            const isEntranceTile = worldX === infiniteJunkyard.entranceX && worldY === infiniteJunkyard.entranceY;
            const isTarget = isValidTarget(worldX, worldY);
            const isPassable = isWorldTilePassable(infiniteJunkyard, worldX, worldY);
            const threatInfo = enemyThreatTiles.get(`${worldX},${worldY}`);
            
            // Spider legs can traverse walls
            const primary = player.helpers.find(h => h.isPrimary);
            const mobilityName = primary?.components.mobility?.name?.toLowerCase() || '';
            const canTraverseWall = mobilityName.includes('spider') && wall;
            const canMoveTo = isRevealed && isTarget && !isPlayer && (isPassable || canTraverseWall) && !isBatteryEmpty;
            
            const terrainStyle = terrain ? TERRAIN_DISPLAY[terrain.type] : null;

            return (
              <motion.button
                key={`${viewX}-${viewY}`}
                className={cn(
                  "relative flex items-center justify-center rounded-sm transition-all",
                  !isRevealed && "bg-fog",
                  isRevealed && !wall && !terrainStyle && "bg-revealed",
                  isRevealed && !wall && terrainStyle && terrainStyle.bg,
                  isRevealed && !wall && terrainStyle && `border ${terrainStyle.border}`,
                  isRevealed && wall && "bg-muted",
                  isPlayer && "ring-2 ring-primary ring-inset bg-primary/20 cursor-pointer",
                  isEntranceTile && isRevealed && !isPlayer && "ring-1 ring-accent ring-inset",
                  canMoveTo && "ring-1 ring-primary/50 cursor-pointer hover:bg-primary/10 active:scale-95",
                  !canMoveTo && !isPlayer && isRevealed && "cursor-pointer",
                  !isRevealed && "cursor-default",
                  isBatteryEmpty && isTarget && "opacity-50",
                  inspectInfo?.x === worldX && inspectInfo?.y === worldY && "ring-2 ring-accent"
                )}
                style={{ width: cellSize, height: cellSize }}
                onClick={() => (isRevealed || isPlayer) && handleTileClick(worldX, worldY, isPlayer, canMoveTo)}
                disabled={!isRevealed && !isPlayer}
                initial={isRevealed ? { opacity: 0, scale: 0.8 } : {}}
                animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.2 }}
                whileTap={(isPlayer || canMoveTo || isRevealed) ? { scale: 0.95 } : {}}
              >
                {/* Enemy threat range overlay */}
                {isRevealed && threatInfo && !enemy && (
                  <div 
                    className={cn(
                      "absolute inset-0 rounded-sm pointer-events-none",
                      threatInfo.color,
                      threatInfo.threat === 'adjacent' && "border border-red-500/20"
                    )}
                  />
                )}
                
                {/* Entrance marker */}
                {isRevealed && isEntranceTile && !isPlayer && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-accent opacity-60" />
                  </div>
                )}
                
                {/* Terrain hazard indicator */}
                {isRevealed && terrain && !wall && !pile && !barrier && !isEntranceTile && (
                  <span className="absolute text-xs opacity-70">{terrain.icon}</span>
                )}
                
                {/* Wall obstacle */}
                {isRevealed && wall && (
                  <span className="text-base sm:text-lg opacity-60">{wall.icon}</span>
                )}
                
                {/* Barrier (soft gate) */}
                {isRevealed && barrier && !wall && (
                  <span className="text-base sm:text-lg opacity-80">{barrier.icon}</span>
                )}
                
                {/* Junk pile */}
                {isRevealed && pile && !wall && (() => {
                  const scannedItems = getScannedItems(pile, worldX, worldY);
                  const hasScannedItems = scannedItems.length > 0;
                  
                  return (
                    <div 
                      className={cn(
                        "absolute inset-0.5 rounded-sm flex flex-col items-center justify-center",
                        getRarityClass(pile),
                        hasScannedItems && "ring-1 ring-cyan-400/60"
                      )}
                    >
                      {!pile.isDepleted && (
                        <>
                          <span className="text-base sm:text-lg">📦</span>
                          {/* Scanner preview icons */}
                          {hasScannedItems && (
                            <div className="absolute -bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
                              {scannedItems.slice(0, 3).map((item, idx) => (
                                <span 
                                  key={idx} 
                                  className="text-[8px] sm:text-[10px] bg-background/80 rounded px-0.5"
                                  title={item.name}
                                >
                                  {item.icon}
                                </span>
                              ))}
                              {scannedItems.length > 3 && (
                                <span className="text-[8px] text-muted-foreground">+{scannedItems.length - 3}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      {pile.isDepleted && (
                        <span className="text-base sm:text-lg opacity-30">📦</span>
                      )}
                    </div>
                  );
                })()}
                
                {/* Enemy */}
                {isRevealed && enemy && enemyDef && !wall && (() => {
                  // Check for status effects
                  const isStunned = hasStatusEffect(enemy, 'stunned');
                  const isFrozen = hasStatusEffect(enemy, 'frozen');
                  const isScattered = hasStatusEffect(enemy, 'scattered');
                  const isBlinded = hasStatusEffect(enemy, 'blinded');
                  const isCorrupted = hasStatusEffect(enemy, 'corrupted');
                  const isDistracted = hasStatusEffect(enemy, 'distracted');
                  const isNeutralized = hasStatusEffect(enemy, 'neutralized');
                  const hasAnyEffect = isStunned || isFrozen || isScattered || isBlinded || isCorrupted || isDistracted || isNeutralized;
                  
                  // Get status effect icon
                  const getStatusIcon = () => {
                    if (isNeutralized) return '💨';
                    if (isFrozen) return '❄️';
                    if (isStunned) return '⚡';
                    if (isScattered) return '💨';
                    if (isBlinded) return '👁️';
                    if (isCorrupted) return '💾';
                    if (isDistracted) return '👤';
                    return null;
                  };
                  
                  const statusIcon = getStatusIcon();
                  
                  return (
                    <motion.div
                      className={cn(
                        "absolute inset-0.5 rounded-sm flex items-center justify-center",
                        !hasAnyEffect && enemyDef.threatLevel === 'nuisance' && "bg-yellow-500/20 ring-1 ring-yellow-500/40",
                        !hasAnyEffect && enemyDef.threatLevel === 'moderate' && "bg-orange-500/20 ring-1 ring-orange-500/40",
                        !hasAnyEffect && enemyDef.threatLevel === 'dangerous' && "bg-red-500/20 ring-1 ring-red-500/40",
                        !hasAnyEffect && enemyDef.threatLevel === 'deadly' && "bg-red-700/30 ring-2 ring-red-600/60",
                        // Status effect styling
                        isStunned && "bg-yellow-300/30 ring-1 ring-yellow-400/60",
                        isFrozen && "bg-cyan-400/30 ring-1 ring-cyan-500/60",
                        isScattered && "bg-purple-400/20 ring-1 ring-purple-400/40",
                        isBlinded && "bg-gray-400/30 ring-1 ring-gray-500/50",
                        isCorrupted && "bg-green-500/20 ring-1 ring-green-500/40",
                        isDistracted && "bg-blue-400/20 ring-1 ring-blue-400/40",
                        isNeutralized && "bg-gray-600/30 ring-1 ring-gray-600/40 opacity-40",
                        enemy.isAlerted && !hasAnyEffect && "animate-pulse"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ 
                        scale: isNeutralized ? 0.5 : 1,
                        opacity: isNeutralized ? 0.3 : 1,
                      }}
                      transition={{ type: 'spring', damping: 15 }}
                      title={`${enemyDef.name}${hasAnyEffect ? ` (${statusIcon})` : ''} - ${enemyDef.description}`}
                    >
                      <span className={cn(
                        "text-base sm:text-lg",
                        hasAnyEffect && "opacity-60"
                      )}>{enemyDef.icon}</span>
                      {/* Status effect indicator */}
                      {statusIcon && !isNeutralized && (
                        <span className="absolute -top-0.5 -right-0.5 text-[10px]">{statusIcon}</span>
                      )}
                    </motion.div>
                  );
                })()}
                
                {/* Player */}
                {isPlayer && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <span className="text-lg sm:text-xl">🤖</span>
                  </motion.div>
                )}
                
                {/* Adjacent indicator */}
                {canMoveTo && !pile && !wall && !terrain && !isEntranceTile && (
                  <span className="text-primary/60 text-xs">•</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Inspect Info Tooltip */}
        {inspectInfo && (
          <motion.div
            className="mt-2 px-4 py-2 bg-muted/90 border border-border rounded-lg text-center max-w-[280px]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setInspectInfo(null)}
          >
            <p className="text-sm font-medium">{inspectInfo.content}</p>
            {inspectInfo.effect && (
              <p className="text-xs text-muted-foreground mt-0.5">{inspectInfo.effect}</p>
            )}
          </motion.div>
        )}

        {/* Search Progress */}
        {currentPile && !currentPile.isDepleted && (
          <motion.div 
            className="mt-4 w-full max-w-[300px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Search Progress</span>
              <span className="font-mono">{currentPile.progressTurns}/{currentPile.requiredTurns}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(currentPile.progressTurns / currentPile.requiredTurns) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Action Buttons - Compact */}
      <footer className="industrial-panel px-3 py-2 pb-safe shrink-0">
        <div className="flex gap-2">
          {currentPile && !currentPile.isDepleted && !isBatteryEmpty ? (
            <Button
              variant="action"
              size="lg"
              className="flex-1"
              onClick={onSearch}
            >
              <Search className="w-4 h-4" />
              Search ({currentPile.progressTurns}/{currentPile.requiredTurns})
            </Button>
          ) : atEntrance ? (
            <Button
              variant="action"
              size="lg"
              className="flex-1"
              onClick={onReturnToBase}
            >
              <Home className="w-4 h-4" />
              Exit & Save Progress
            </Button>
          ) : (
            <Button
              variant={isBatteryEmpty ? "danger" : "nav"}
              size="lg"
              className="flex-1"
              onClick={onReturnToBase}
            >
              <Home className="w-4 h-4" />
              {isBatteryEmpty ? "Emergency Teleport" : "Teleport to Base"}
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          {movementType === 'basic' && 'Tap adjacent tiles (↑↓←→)'}
          {movementType === 'extended' && 'Move 2 tiles (↑↓←→)'}
          {movementType === 'diagonal' && 'Any direction including diagonal'}
          {movementType === 'jump' && 'Jump 2 tiles any direction'}
          {' • 1 battery/action'}
          {chunkDistance > 0 && ` • Zone ${chunkDistance}`}
        </p>
      </footer>
    </div>
  );
}
