import { motion } from 'framer-motion';
import { X, Coins, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, Rarity } from '@/types/game';
import { cn } from '@/lib/utils';

interface SellScreenProps {
  stash: Item[];
  onSell: (itemId: string) => void;
  onSellMultiple?: (itemIds: string[]) => void;
  onClose: () => void;
}

function calculateSellPrice(item: Item): number {
  const rarityMult: Record<Rarity, number> = {
    common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8
  };
  const conditionMult = item.condition / 100;
  const dirtyMult = item.isDirty ? 0.3 : 1;
  
  return Math.floor(item.baseValue * rarityMult[item.rarity] * conditionMult * dirtyMult);
}

export function SellScreen({ stash, onSell, onSellMultiple, onClose }: SellScreenProps) {
  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-uncommon';
      case 'rare': return 'rarity-rare';
      case 'epic': return 'rarity-epic';
      case 'legendary': return 'rarity-legendary';
      default: return 'rarity-common';
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

  const totalValue = stash.reduce((sum, item) => sum + calculateSellPrice(item), 0);
  const junkItems = stash.filter(item => item.category === 'junk');
  const junkValue = junkItems.reduce((sum, item) => sum + calculateSellPrice(item), 0);

  const handleSellAllJunk = () => {
    if (onSellMultiple) {
      onSellMultiple(junkItems.map(item => item.id));
    } else {
      // Fallback: sell one at a time (can cause issues with many items)
      junkItems.forEach(item => onSell(item.id));
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Sell Items</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Quick Actions */}
        {junkItems.length > 0 && (
          <section className="mb-6">
            <Button
              variant="action"
              className="w-full"
              onClick={handleSellAllJunk}
            >
              <Trash2 className="w-4 h-4" />
              Sell All Junk ({junkItems.length} items)
              <span className="ml-auto flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {junkValue}
              </span>
            </Button>
          </section>
        )}

        {/* Items List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-industrial text-muted-foreground">
              Stash ({stash.length} items)
            </h3>
            <div className="flex items-center gap-1 text-accent">
              <Coins className="w-4 h-4" />
              <span className="font-mono">{totalValue} total</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {stash.map(item => {
              const price = calculateSellPrice(item);
              
              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "industrial-panel p-3 rounded-lg flex items-center gap-3",
                    getRarityBgClass(item.rarity)
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <span className={cn("text-xl", item.isDirty && "opacity-70")}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", getRarityClass(item.rarity))}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} • {item.condition}%
                      {item.isDirty && (
                        <span className="text-destructive"> • Dirty (-70%)</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => onSell(item.id)}
                  >
                    <Coins className="w-4 h-4" />
                    {price}
                  </Button>
                </motion.div>
              );
            })}
            {stash.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items to sell
              </p>
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
