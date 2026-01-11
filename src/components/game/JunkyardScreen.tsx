import { motion } from 'framer-motion';
import { Search, Home, Package, Battery, BatteryWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, JunkPile, Bag, HelperRobot } from '@/types/game';
import { isTilePassable, getWallAt } from '@/lib/terrainGenerator';
import { cn } from '@/lib/utils';

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

export function JunkyardScreen({
  gameState,
  maxBattery,
  currentBag,
  onMove,
  currentPile,
  onSearch,
  onReturnToBase,
  onOpenInventory,
}: JunkyardScreenProps) {
  const { junkyard, player, turnCount } = gameState;
  
  if (!junkyard) return null;

  const currentWeight = currentBag.items.reduce((sum, i) => sum + i.weight, 0);
  const batteryPercent = (player.currentCharge / maxBattery) * 100;
  const isBatteryLow = player.currentCharge <= 5;
  const isBatteryEmpty = player.currentCharge <= 0;

  const getRarityClass = (pile: JunkPile) => {
    if (pile.isDepleted) return 'bg-pile-depleted';
    return 'bg-pile-active';
  };

  const movementType = getMovementType(player.helpers);
  const validMoveTargets = getValidMoveTargets(player.playerX, player.playerY, movementType, junkyard);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="industrial-panel p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onReturnToBase}>
            <Home className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Turn</p>
            <p className="font-mono text-lg">{turnCount}</p>
          </div>
        </div>
        
        {/* Battery indicator */}
        <div className="flex items-center gap-2">
          {isBatteryLow ? (
            <BatteryWarning className={cn("w-5 h-5", isBatteryEmpty ? "text-destructive" : "text-accent animate-pulse")} />
          ) : (
            <Battery className="w-5 h-5 text-primary" />
          )}
          <div className="w-16 h-3 bg-muted rounded-full overflow-hidden">
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
            "font-mono text-sm",
            isBatteryEmpty ? "text-destructive" : isBatteryLow ? "text-accent" : "text-foreground"
          )}>
            {player.currentCharge}
          </span>
        </div>

        <Button 
          variant="steel" 
          size="sm" 
          onClick={onOpenInventory}
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          <span className="font-mono">{currentWeight}/{currentBag.maxWeight}</span>
        </Button>
      </header>

      {/* Battery Empty Warning */}
      {isBatteryEmpty && (
        <motion.div
          className="mx-3 mt-2 p-3 bg-destructive/20 border border-destructive rounded-lg text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-destructive font-industrial">
            ⚠️ BATTERY DEPLETED - Return to Base to Recharge
          </p>
        </motion.div>
      )}

      {/* Map Grid - Larger cells, tappable */}
      <main className="flex-1 p-3 flex flex-col items-center justify-center overflow-auto">
        <div 
          className="junk-grid w-full max-w-[min(95vw,500px)]"
          style={{ 
            gridTemplateColumns: `repeat(${junkyard.width}, minmax(32px, 1fr))`,
            gap: '3px',
          }}
        >
          {Array.from({ length: junkyard.height }).map((_, y) =>
            Array.from({ length: junkyard.width }).map((_, x) => {
              const isRevealed = junkyard.revealedTiles[y]?.[x] ?? false;
              const isPlayer = x === player.playerX && y === player.playerY;
              const pile = junkyard.piles.find(p => p.x === x && p.y === y);
              const wall = getWallAt(junkyard, x, y);
              const droppedItem = junkyard.droppedItems.find(d => d.x === x && d.y === y);
              const isTarget = isValidTarget(x, y);
              const isPassable = isTilePassable(junkyard, x, y);
              const canMoveTo = isRevealed && isTarget && !isPlayer && isPassable && !isBatteryEmpty;

              return (
                <motion.button
                  key={`${x}-${y}`}
                  className={cn(
                    "aspect-square relative flex items-center justify-center rounded-sm transition-all",
                    "min-h-[32px] min-w-[32px]",
                    !isRevealed && "bg-fog",
                    isRevealed && !wall && "bg-revealed",
                    isRevealed && wall && "bg-muted",
                    isPlayer && "ring-2 ring-primary ring-inset bg-primary/20",
                    canMoveTo && "ring-1 ring-primary/50 cursor-pointer hover:bg-primary/10 active:scale-95",
                    !canMoveTo && !isPlayer && "cursor-default",
                    isBatteryEmpty && isTarget && "opacity-50"
                  )}
                  onClick={() => canMoveTo && handleTileClick(x, y)}
                  disabled={!canMoveTo}
                  initial={isRevealed ? { opacity: 0, scale: 0.8 } : {}}
                  animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.2 }}
                  whileTap={canMoveTo ? { scale: 0.9 } : {}}
                >
                  {/* Wall obstacle */}
                  {isRevealed && wall && (
                    <span className="text-base sm:text-lg opacity-60">{wall.icon}</span>
                  )}
                  
                  {/* Junk pile */}
                  {isRevealed && pile && !wall && (
                    <div 
                      className={cn(
                        "absolute inset-1 rounded-sm flex items-center justify-center",
                        getRarityClass(pile)
                      )}
                    >
                      {!pile.isDepleted && (
                        <span className="text-base sm:text-lg">📦</span>
                      )}
                      {pile.isDepleted && (
                        <span className="text-base sm:text-lg opacity-30">📦</span>
                      )}
                    </div>
                  )}
                  
                  {/* Dropped item */}
                  {isRevealed && droppedItem && !pile && !wall && (
                    <span className="text-xs sm:text-sm">{droppedItem.item.icon}</span>
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
                  {canMoveTo && !pile && !wall && (
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
              <span className="font-mono">{currentPile.progressTurns}/5</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(currentPile.progressTurns / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Action Buttons */}
      <footer className="industrial-panel p-4 pb-safe">
        <div className="flex gap-3">
          {currentPile && !currentPile.isDepleted && !isBatteryEmpty ? (
            <Button
              variant="action"
              size="xl"
              className="flex-1"
              onClick={onSearch}
            >
              <Search className="w-5 h-5" />
              Search ({currentPile.progressTurns}/5)
            </Button>
          ) : (
            <Button
              variant={isBatteryEmpty ? "danger" : "nav"}
              size="xl"
              className="flex-1"
              onClick={onReturnToBase}
            >
              <Home className="w-5 h-5" />
              {isBatteryEmpty ? "Return & Recharge" : "Return to Base"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {movementType === 'basic' && 'Tap adjacent tiles to move (↑↓←→)'}
          {movementType === 'extended' && 'Move up to 2 tiles orthogonally (↑↓←→)'}
          {movementType === 'diagonal' && 'Move in any direction including diagonals'}
          {movementType === 'jump' && 'Jump up to 2 tiles in any direction'}
          {' • Each action uses 1 battery'}
        </p>
      </footer>
    </div>
  );
}