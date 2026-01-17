import { forwardRef } from 'react'; import { motion } from 'framer-motion';
import { X, Coins, Trash2, ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Item, Rarity } from '@/types/game';
import { cn } from '@/lib/utils';

interface ShopItem {
  item: Item;
  buyPrice: number;
}

interface ShopScreenProps {
  stash: Item[];
  currency: number;
  shopInventory: ShopItem[];
  shopRefreshTime: number;
  onSell: (itemId: string) => void;
  onSellMultiple?: (itemIds: string[]) => void;
  onBuy: (itemId: string) => void;
  onClose: () => void;
}

function calculateSellPrice(item: Item): number {
  const rarityMult: Record<Rarity, number> = {
    common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8
  };
  const conditionMult = item.condition / 100;
  const dirtyMult = item.isDirty ? 0.3 : 1;
  
  return Math.max(1, Math.floor(item.baseValue * rarityMult[item.rarity] * conditionMult * dirtyMult));
}

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const ShopScreen = forwardRef<HTMLDivElement, ShopScreenProps>(function ShopScreen({ 
  stash, 
  currency,
  shopInventory, 
  shopRefreshTime,
  onSell, 
  onSellMultiple, 
  onBuy,
  onClose,
}: ShopScreenProps, ref) {
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
      junkItems.forEach(item => onSell(item.id));
    }
  };

  const timeUntilRefresh = Math.max(0, shopRefreshTime - Date.now());

  return (
    <motion.div ref={ref}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Shop</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
            <Coins className="w-4 h-4 text-accent" />
            <span className="font-mono text-accent">{currency}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="sell" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 shrink-0">
          <TabsTrigger value="sell" className="flex-1 gap-2">
            <Tag className="w-4 h-4" />
            Sell
          </TabsTrigger>
          <TabsTrigger value="buy" className="flex-1 gap-2">
            <ShoppingCart className="w-4 h-4" />
            Buy
          </TabsTrigger>
        </TabsList>

        {/* Sell Tab */}
        <TabsContent value="sell" className="flex-1 p-4 overflow-y-auto min-h-0">
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
        </TabsContent>

        {/* Buy Tab */}
        <TabsContent value="buy" className="flex-1 p-4 overflow-y-auto min-h-0">
          {/* Refresh Timer */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stock refreshes in:</span>
            <span className="font-mono text-primary">{formatTimeRemaining(timeUntilRefresh)}</span>
          </div>

          {/* Shop Items */}
          <section>
            <h3 className="text-sm font-industrial text-muted-foreground mb-3">
              Available Items ({shopInventory.length})
            </h3>
            
            <div className="space-y-2">
              {shopInventory.map(({ item, buyPrice }) => {
                const canAfford = currency >= buyPrice;
                
                return (
                  <motion.div
                    key={item.id}
                    className={cn(
                      "industrial-panel p-3 rounded-lg flex items-center gap-3",
                      getRarityBgClass(item.rarity)
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", getRarityClass(item.rarity))}>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.category} • {item.condition}%
                      </p>
                    </div>
                    <Button
                      variant="steel"
                      size="sm"
                      onClick={() => onBuy(item.id)}
                      disabled={!canAfford}
                      className={cn(!canAfford && "opacity-50")}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <Coins className="w-3 h-3 text-accent" />
                      {buyPrice}
                    </Button>
                  </motion.div>
                );
              })}
              {shopInventory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Shop is empty - check back later!
                </p>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
});
