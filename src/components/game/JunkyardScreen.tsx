import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Home, Package, Battery, BatteryWarning, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, JunkPile, Bag, HelperRobot, TerrainType, Item } from '@/types/game';
import { getEnemyDefinition } from '@/types/enemies';
import { isTilePassable, getWallAt, getTerrainAt, getBarrierAt, getEnemyAt, TERRAIN_DISPLAY } from '@/lib/terrainGenerator';
import { cn } from '@/lib/utils';

// Hook to calculate responsive cell size based on screen dimensions
function useResponsiveCellSize(gridWidth: number, gridHeight: number) {
  const [cellSize, setCellSize] = useState(32);

  useEffect(() => {
    const calculateCellSize = () => {
      // Get available space (header ~44px, footer ~70px, padding ~16px, search progress ~50px)
      const availableHeight = window.innerHeight - 180;
      const availableWidth = window.innerWidth - 16; // 8px padding on each side
      
      // Calculate max cell size that fits both dimensions
      const maxCellFromHeight = Math.floor(availableHeight / gridHeight);
      const maxCellFromWidth = Math.floor(availableWidth / gridWidth);
      
      // Use the smaller of the two, clamped between 28px and 48px
      const optimalSize = Math.min(maxCellFromHeight, maxCellFromWidth);
      setCellSize(Math.max(28, Math.min(48, optimalSize)));
    };

    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);
    return () => window.removeEventListener('resize', calculateCellSize);
  }, [gridWidth, gridHeight]);

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
  onReturnToBase: () => void;
  onOpenInventory: () => void;
  pileRevealCount?: number; // How many items to reveal from scanner
  getPilePreview?: (pile: JunkPile) => Item[]; // Get pre-generated items for a pile
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
function isValidMove(dx: number, dy: number, movementType: MovementType, junkyard: GameState['junkyard'], fromX: number, fromY: number): boolean {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  switch (movementType) {
    case 'basic':
      // Only orthogonal (up/down/left/right), 1 tile
      return (absDx + absDy === 1) && (absDx <= 1 && absDy <= 1);
    
    case 'extended':
      // Only orthogonal (up/down/left/right), up to 2 tiles
      return ((absDx === 0 && absDy >= 1 && absDy <= 2) || (absDy === 0 && absDx >= 1 && absDx <= 2));
    
    case 'diagonal':
      // Orthogonal OR diagonal, 1 tile
      return (absDx <= 1 && absDy <= 1) && (absDx + absDy >= 1);
    
    case 'jump':
      // Can move up to 2 tiles in any direction (including jumping over obstacles)
      return (absDx <= 2 && absDy <= 2) && (absDx + absDy >= 1);
    
    default:
      return false;
  }
}

// Get all valid move targets for visualization
function getValidMoveTargets(
  playerX: number, 
  playerY: number, 
  movementType: MovementType, 
  junkyard: GameState['junkyard']
): Set<string> {
  const validTargets = new Set<string>();
  if (!junkyard) return validTargets;
  
  const range = (movementType === 'jump' || movementType === 'extended') ? 2 : 1;
  
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const targetX = playerX + dx;
      const targetY = playerY + dy;
      
      // Check if the move pattern is valid for this movement type
      if (!isValidMove(dx, dy, movementType, junkyard, playerX, playerY)) continue;
      
      // For jump, destination just needs to be passable (can jump over walls)
      // For others, destination must be passable
      if (isTilePassable(junkyard, targetX, targetY)) {
        validTargets.add(`${targetX}-${targetY}`);
      }
    }
  }
  
  return validTargets;
}

// Get tiles within threat range of enemies
function getEnemyThreatTiles(junkyard: GameState['junkyard']): Map<string, { threat: 'adjacent' | 'nearby'; color: string }> {
  const threatTiles = new Map<string, { threat: 'adjacent' | 'nearby'; color: string }>();
  if (!junkyard || !junkyard.enemies) return threatTiles;
  
  for (const enemy of junkyard.enemies) {
    const def = getEnemyDefinition(enemy.definitionId);
    if (!def) continue;
    
    // Get threat color based on threat level
    const threatColor = 
      def.threatLevel === 'deadly' ? 'bg-red-600/15' :
      def.threatLevel === 'dangerous' ? 'bg-red-500/10' :
      def.threatLevel === 'moderate' ? 'bg-orange-500/10' :
      'bg-yellow-500/5';
    
    // Mark adjacent tiles (1 range) as dangerous
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const key = `${enemy.x + dx}-${enemy.y + dy}`;
        const existing = threatTiles.get(key);
        // Upgrade threat level if this is more dangerous
        if (!existing || existing.threat === 'nearby') {
          threatTiles.set(key, { threat: 'adjacent', color: threatColor });
        }
      }
    }
    
    // For chasing/dangerous enemies, mark 2-range tiles as nearby threat
    if (def.behaviour === 'chase' || def.threatLevel === 'dangerous' || def.threatLevel === 'deadly') {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue; // Skip adjacent
          const key = `${enemy.x + dx}-${enemy.y + dy}`;
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
  onReturnToBase,
  onOpenInventory,
  pileRevealCount = 0,
  getPilePreview,
}: JunkyardScreenProps) {
  const { junkyard, player, turnCount } = gameState;
  
  if (!junkyard) return null;

  const cellSize = useResponsiveCellSize(junkyard.width, junkyard.height);
  const currentWeight = currentBag.items.reduce((sum, i) => sum + i.weight, 0);
  const batteryPercent = (player.currentCharge / maxBattery) * 100;
  const isBatteryLow = player.currentCharge <= 5;
  const isBatteryEmpty = player.currentCharge <= 0;

  const getRarityClass = (pile: JunkPile) => {
    if (pile.isDepleted) return 'bg-pile-depleted';
    return 'bg-pile-active';
  };

  // Check if a pile is adjacent to the player (for scanner reveal)
  const isPileAdjacent = (pile: JunkPile) => {
    const dx = Math.abs(pile.x - player.playerX);
    const dy = Math.abs(pile.y - player.playerY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  };

  // Get scanned items for an adjacent pile
  const getScannedItems = (pile: JunkPile): Item[] => {
    if (!getPilePreview || pileRevealCount === 0) return [];
    if (!isPileAdjacent(pile) || pile.isDepleted) return [];
    const items = getPilePreview(pile);
    return items.slice(0, pileRevealCount);
  };

  const movementType = getMovementType(player.helpers);
  const validMoveTargets = getValidMoveTargets(player.playerX, player.playerY, movementType, junkyard);
  const enemyThreatTiles = getEnemyThreatTiles(junkyard);

  const handleTileClick = (x: number, y: number) => {
    if (isBatteryEmpty) return;
    
    const dx = x - player.playerX;
    const dy = y - player.playerY;
    
    // Check if this is a valid move for our movement type
    if (isValidMove(dx, dy, movementType, junkyard, player.playerX, player.playerY)) {
      // For non-jump movement, verify path is clear
      if (movementType !== 'jump' && !isTilePassable(junkyard, x, y)) {
        return;
      }
      // For jump, just verify destination is passable
      if (movementType === 'jump' && !isTilePassable(junkyard, x, y)) {
        return;
      }
      onMove(dx, dy);
    }
  };

  const isValidTarget = (x: number, y: number) => {
    return validMoveTargets.has(`${x}-${y}`);
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

      {/* Map Grid - Responsive cells that fit screen */}
      <main className="flex-1 p-2 flex flex-col items-center justify-center overflow-hidden min-h-0">
        <div 
          className="junk-grid"
          style={{ 
            gridTemplateColumns: `repeat(${junkyard.width}, ${cellSize}px)`,
            gap: `${Math.max(1, Math.floor(cellSize / 12))}px`,
          }}
        >
          {Array.from({ length: junkyard.height }).map((_, y) =>
            Array.from({ length: junkyard.width }).map((_, x) => {
              const isRevealed = junkyard.revealedTiles[y]?.[x] ?? false;
              const isPlayer = x === player.playerX && y === player.playerY;
              const pile = junkyard.piles.find(p => p.x === x && p.y === y);
              const wall = getWallAt(junkyard, x, y);
              const terrain = getTerrainAt(junkyard, x, y);
              const barrier = getBarrierAt(junkyard, x, y);
              const enemy = getEnemyAt(junkyard, x, y);
              const enemyDef = enemy ? getEnemyDefinition(enemy.definitionId) : null;
              const droppedItem = junkyard.droppedItems.find(d => d.x === x && d.y === y);
              const isTarget = isValidTarget(x, y);
              const isPassable = isTilePassable(junkyard, x, y);
              const threatInfo = enemyThreatTiles.get(`${x}-${y}`);
              
              // Spider legs can traverse walls
              const primary = player.helpers.find(h => h.isPrimary);
              const mobilityName = primary?.components.mobility?.name?.toLowerCase() || '';
              const canTraverseWall = mobilityName.includes('spider') && wall;
              const canMoveTo = isRevealed && isTarget && !isPlayer && (isPassable || canTraverseWall) && !isBatteryEmpty;
              
              const terrainStyle = terrain ? TERRAIN_DISPLAY[terrain.type] : null;

              return (
                <motion.button
                  key={`${x}-${y}`}
                  className={cn(
                    "relative flex items-center justify-center rounded-sm transition-all",
                    !isRevealed && "bg-fog",
                    isRevealed && !wall && !terrainStyle && "bg-revealed",
                    isRevealed && !wall && terrainStyle && terrainStyle.bg,
                    isRevealed && !wall && terrainStyle && `border ${terrainStyle.border}`,
                    isRevealed && wall && "bg-muted",
                    isPlayer && "ring-2 ring-primary ring-inset bg-primary/20",
                    canMoveTo && "ring-1 ring-primary/50 cursor-pointer hover:bg-primary/10 active:scale-95",
                    !canMoveTo && !isPlayer && "cursor-default",
                    isBatteryEmpty && isTarget && "opacity-50"
                  )}
                  style={{ width: cellSize, height: cellSize }}
                  onClick={() => canMoveTo && handleTileClick(x, y)}
                  disabled={!canMoveTo}
                  initial={isRevealed ? { opacity: 0, scale: 0.8 } : {}}
                  animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.2 }}
                  whileTap={canMoveTo ? { scale: 0.9 } : {}}
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
                  
                  {/* Terrain hazard indicator */}
                  {isRevealed && terrain && !wall && !pile && !barrier && (
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
                    const scannedItems = getScannedItems(pile);
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
                  
                  {/* Dropped item */}
                  {isRevealed && droppedItem && !pile && !wall && !enemy && (
                    <span className="text-xs sm:text-sm">{droppedItem.item.icon}</span>
                  )}
                  
                  {/* Enemy */}
                  {isRevealed && enemy && enemyDef && !wall && (
                    <motion.div
                      className={cn(
                        "absolute inset-0.5 rounded-sm flex items-center justify-center",
                        enemyDef.threatLevel === 'nuisance' && "bg-yellow-500/20 ring-1 ring-yellow-500/40",
                        enemyDef.threatLevel === 'moderate' && "bg-orange-500/20 ring-1 ring-orange-500/40",
                        enemyDef.threatLevel === 'dangerous' && "bg-red-500/20 ring-1 ring-red-500/40",
                        enemyDef.threatLevel === 'deadly' && "bg-red-700/30 ring-2 ring-red-600/60",
                        enemy.isAlerted && "animate-pulse"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      title={`${enemyDef.name} - ${enemyDef.description}`}
                    >
                      <span className="text-base sm:text-lg">{enemyDef.icon}</span>
                    </motion.div>
                  )}
                  
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
                  {canMoveTo && !pile && !wall && !terrain && (
                    <span className="text-primary/60 text-xs">•</span>
                  )}
                </motion.button>
              );
            })
          )}
        </div>

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
          ) : (
            <Button
              variant={isBatteryEmpty ? "danger" : "nav"}
              size="lg"
              className="flex-1"
              onClick={onReturnToBase}
            >
              <Home className="w-4 h-4" />
              {isBatteryEmpty ? "Return & Recharge" : "Return to Base"}
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          {movementType === 'basic' && 'Tap adjacent tiles (↑↓←→)'}
          {movementType === 'extended' && 'Move 2 tiles (↑↓←→)'}
          {movementType === 'diagonal' && 'Any direction including diagonal'}
          {movementType === 'jump' && 'Jump 2 tiles any direction'}
          {' • 1 battery/action'}
        </p>
      </footer>
    </div>
  );
}