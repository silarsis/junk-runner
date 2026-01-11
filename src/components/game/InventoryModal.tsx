import { motion } from 'framer-motion';
import { X, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryItem, Bag } from '@/types/game';
import { cn } from '@/lib/utils';

interface InventoryModalProps {
  bag: Bag;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryModal({ bag, isOpen, onClose }: InventoryModalProps) {
  if (!isOpen) return null;

  const currentWeight = bag.items.reduce((sum, i) => sum + i.weight, 0);

  const getItemAtCell = (x: number, y: number): InventoryItem | null => {
    for (const item of bag.items) {
      const w = item.rotated ? item.sizeH : item.sizeW;
      const h = item.rotated ? item.sizeW : item.sizeH;
      
      if (x >= item.gridX && x < item.gridX + w &&
          y >= item.gridY && y < item.gridY + h) {
        return item;
      }
    }
    return null;
  };

  const isItemOrigin = (item: InventoryItem, x: number, y: number) => {
    return item.gridX === x && item.gridY === y;
  };

  const getRarityBorderClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-border-uncommon';
      case 'rare': return 'rarity-border-rare';
      case 'epic': return 'rarity-border-epic';
      case 'legendary': return 'rarity-border-legendary';
      default: return 'rarity-border-common';
    }
  };

  const getRarityBgClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-bg-uncommon';
      case 'rare': return 'rarity-bg-rare';
      case 'epic': return 'rarity-bg-epic';
      case 'legendary': return 'rarity-bg-legendary';
      default: return 'rarity-bg-common';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/95 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Inventory</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Weight: </span>
            <span className={cn(
              "font-mono",
              currentWeight > bag.maxWeight * 0.8 ? "text-destructive" : "text-foreground"
            )}>
              {currentWeight}/{bag.maxWeight}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 flex items-center justify-center">
        <div
          className="junk-grid w-full max-w-[min(90vw,400px)]"
          style={{
            gridTemplateColumns: `repeat(${bag.width}, 1fr)`,
            gridTemplateRows: `repeat(${bag.height}, 1fr)`,
            aspectRatio: `${bag.width}/${bag.height}`,
          }}
        >
          {Array.from({ length: bag.height }).map((_, y) =>
            Array.from({ length: bag.width }).map((_, x) => {
              const item = getItemAtCell(x, y);
              const isOrigin = item && isItemOrigin(item, x, y);
              
              if (item && !isOrigin) {
                // This cell is part of an item but not the origin
                return (
                  <div 
                    key={`${x}-${y}`} 
                    className={cn(
                      "inventory-slot border-2",
                      getRarityBorderClass(item.rarity),
                      getRarityBgClass(item.rarity),
                      item.isDirty && "opacity-70"
                    )} 
                  />
                );
              }

              if (item && isOrigin) {
                const w = item.rotated ? item.sizeH : item.sizeW;
                const h = item.rotated ? item.sizeW : item.sizeH;
                
                return (
                  <motion.div
                    key={`${x}-${y}`}
                    className={cn(
                      "inventory-slot border-2 flex flex-col items-center justify-center p-1 relative",
                      getRarityBorderClass(item.rarity),
                      getRarityBgClass(item.rarity),
                      item.isDirty && "opacity-70"
                    )}
                    style={{
                      gridColumn: `span ${w}`,
                      gridRow: `span ${h}`,
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] text-center leading-tight mt-1 line-clamp-2">
                      {item.name}
                    </span>
                    {item.isDirty && (
                      <span className="absolute top-0.5 right-0.5 text-xs">🔧</span>
                    )}
                    {item.rotated && (
                      <RotateCw className="absolute top-0.5 left-0.5 w-3 h-3 text-muted-foreground" />
                    )}
                  </motion.div>
                );
              }

              // Empty cell
              return (
                <div
                  key={`${x}-${y}`}
                  className="inventory-slot"
                />
              );
            })
          )}
        </div>
      </main>

      {/* Item List */}
      <footer className="industrial-panel p-4 max-h-[30vh] overflow-y-auto">
        <h3 className="text-sm font-industrial text-muted-foreground mb-3">
          Items ({bag.items.length})
        </h3>
        <div className="space-y-2">
          {bag.items.map(item => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md border",
                getRarityBorderClass(item.rarity),
                getRarityBgClass(item.rarity)
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sizeW}×{item.sizeH} • {item.weight}kg • {item.condition}%
                  {item.isDirty && ' • Dirty'}
                </p>
              </div>
            </div>
          ))}
          {bag.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Bag is empty
            </p>
          )}
        </div>
      </footer>
    </motion.div>
  );
}
