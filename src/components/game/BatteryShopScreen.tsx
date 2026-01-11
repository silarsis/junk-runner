import { motion } from 'framer-motion';
import { X, Coins, Battery, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, STARTER_BATTERY_CAPACITY } from '@/types/game';
import { SHOP_BATTERIES } from '@/data/itemTemplates';
import { cn } from '@/lib/utils';

interface BatteryShopScreenProps {
  stash: Item[];
  equippedBatteryId: string | null;
  currency: number;
  onEquipBattery: (batteryId: string | null) => void;
  onPurchaseBattery: (templateIndex: number) => void;
  onClose: () => void;
}

export function BatteryShopScreen({
  stash,
  equippedBatteryId,
  currency,
  onEquipBattery,
  onPurchaseBattery,
  onClose,
}: BatteryShopScreenProps) {
  const ownedBatteries = stash.filter(item => item.category === 'battery');

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

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Batteries</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Coins className="w-5 h-5 text-accent" />
            <span className="font-mono text-accent">{currency}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Equipped Battery */}
        <section className="mb-6">
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Equipped Battery
          </h3>
          <div className="industrial-panel p-4 rounded-lg">
            {equippedBatteryId ? (
              (() => {
                const battery = stash.find(i => i.id === equippedBatteryId);
                if (!battery) return null;
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{battery.icon}</span>
                      <div>
                        <p className={cn("font-medium", getRarityClass(battery.rarity))}>
                          {battery.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Capacity: {battery.batteryCapacity} moves
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="steel"
                      size="sm"
                      onClick={() => onEquipBattery(null)}
                    >
                      Unequip
                    </Button>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔋</span>
                  <div>
                    <p className="font-medium text-muted-foreground">Starter Battery</p>
                    <p className="text-sm text-muted-foreground">
                      Capacity: {STARTER_BATTERY_CAPACITY} moves
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Default</span>
              </div>
            )}
          </div>
        </section>

        {/* Owned Batteries */}
        {ownedBatteries.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-industrial text-muted-foreground mb-3">
              Your Batteries ({ownedBatteries.length})
            </h3>
            <div className="space-y-2">
              {ownedBatteries.map(battery => {
                const isEquipped = battery.id === equippedBatteryId;
                return (
                  <motion.div
                    key={battery.id}
                    className={cn(
                      "industrial-panel p-3 rounded-lg flex items-center gap-3",
                      getRarityBgClass(battery.rarity),
                      isEquipped && "ring-2 ring-primary"
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="text-xl">{battery.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", getRarityClass(battery.rarity))}>
                        {battery.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {battery.batteryCapacity} moves • {battery.condition}%
                      </p>
                    </div>
                    {isEquipped ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-xs">Equipped</span>
                      </div>
                    ) : (
                      <Button
                        variant="action"
                        size="sm"
                        onClick={() => onEquipBattery(battery.id)}
                      >
                        Equip
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Shop */}
        <section>
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Buy Batteries
          </h3>
          <div className="space-y-2">
            {SHOP_BATTERIES.map((template, index) => {
              const canAfford = currency >= template.baseValue;
              return (
                <motion.div
                  key={template.name}
                  className={cn(
                    "industrial-panel p-3 rounded-lg flex items-center gap-3",
                    getRarityBgClass(template.rarity)
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="text-xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", getRarityClass(template.rarity))}>
                      {template.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {template.batteryCapacity} moves capacity
                    </p>
                  </div>
                  <Button
                    variant={canAfford ? "gold" : "steel"}
                    size="sm"
                    onClick={() => onPurchaseBattery(index)}
                    disabled={!canAfford}
                  >
                    <Coins className="w-4 h-4" />
                    {template.baseValue}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
