import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Home, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, JunkPile } from '@/types/game';
import { cn } from '@/lib/utils';

interface JunkyardScreenProps {
  gameState: GameState;
  onMove: (dx: number, dy: number) => void;
  currentPile: JunkPile | null;
  onSearch: () => void;
  onReturnToBase: () => void;
  onOpenInventory: () => void;
}

export function JunkyardScreen({
  gameState,
  onMove,
  currentPile,
  onSearch,
  onReturnToBase,
  onOpenInventory,
}: JunkyardScreenProps) {
  const { junkyard, player, turnCount } = gameState;
  
  if (!junkyard) return null;

  const currentWeight = player.bag.items.reduce((sum, i) => sum + i.weight, 0);

  const getRarityClass = (pile: JunkPile) => {
    if (pile.isDepleted) return 'bg-pile-depleted';
    return 'bg-pile-active';
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
        <Button 
          variant="steel" 
          size="sm" 
          onClick={onOpenInventory}
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          <span className="font-mono">{currentWeight}/{player.bag.maxWeight}</span>
        </Button>
      </header>

      {/* Map Grid */}
      <main className="flex-1 p-2 flex flex-col items-center justify-center">
        <div 
          className="junk-grid w-full max-w-[min(90vw,400px)] aspect-square"
          style={{ 
            gridTemplateColumns: `repeat(${junkyard.width}, 1fr)`,
            gridTemplateRows: `repeat(${junkyard.height}, 1fr)`,
          }}
        >
          {Array.from({ length: junkyard.height }).map((_, y) =>
            Array.from({ length: junkyard.width }).map((_, x) => {
              const isRevealed = junkyard.revealedTiles[y]?.[x] ?? false;
              const isPlayer = x === player.playerX && y === player.playerY;
              const pile = junkyard.piles.find(p => p.x === x && p.y === y);
              const droppedItem = junkyard.droppedItems.find(d => d.x === x && d.y === y);

              return (
                <motion.div
                  key={`${x}-${y}`}
                  className={cn(
                    "junk-cell relative flex items-center justify-center text-xs",
                    !isRevealed && "fog",
                    isRevealed && "revealed",
                    isPlayer && "ring-2 ring-primary ring-inset"
                  )}
                  initial={isRevealed ? { opacity: 0, scale: 0.8 } : {}}
                  animate={isRevealed ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {isRevealed && pile && (
                    <div 
                      className={cn(
                        "absolute inset-1 rounded-sm flex items-center justify-center",
                        getRarityClass(pile)
                      )}
                    >
                      {!pile.isDepleted && (
                        <span className="text-lg">📦</span>
                      )}
                      {pile.isDepleted && (
                        <span className="text-lg opacity-30">📦</span>
                      )}
                    </div>
                  )}
                  {isRevealed && droppedItem && (
                    <span className="text-sm">{droppedItem.item.icon}</span>
                  )}
                  {isPlayer && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center z-10"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <span className="text-xl">🤖</span>
                    </motion.div>
                  )}
                </motion.div>
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

      {/* Controls */}
      <footer className="industrial-panel p-4 pb-safe">
        <div className="flex items-center justify-between gap-4">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1">
            <div />
            <Button 
              variant="steel" 
              size="icon" 
              onClick={() => onMove(0, -1)}
              className="h-12 w-12"
            >
              <ChevronUp className="w-6 h-6" />
            </Button>
            <div />
            <Button 
              variant="steel" 
              size="icon" 
              onClick={() => onMove(-1, 0)}
              className="h-12 w-12"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="h-12 w-12 rounded-md bg-muted/50" />
            <Button 
              variant="steel" 
              size="icon" 
              onClick={() => onMove(1, 0)}
              className="h-12 w-12"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
            <div />
            <Button 
              variant="steel" 
              size="icon" 
              onClick={() => onMove(0, 1)}
              className="h-12 w-12"
            >
              <ChevronDown className="w-6 h-6" />
            </Button>
            <div />
          </div>

          {/* Action Button */}
          <div className="flex-1">
            {currentPile && !currentPile.isDepleted ? (
              <Button
                variant="action"
                size="xl"
                className="w-full"
                onClick={onSearch}
              >
                <Search className="w-5 h-5" />
                Search ({currentPile.progressTurns}/5)
              </Button>
            ) : (
              <Button
                variant="nav"
                size="xl"
                className="w-full"
                onClick={onReturnToBase}
              >
                <Home className="w-5 h-5" />
                Return to Base
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
