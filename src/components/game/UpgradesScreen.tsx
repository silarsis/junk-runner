import { motion } from 'framer-motion';
import { X, Coins, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseUpgrades } from '@/types/game';
import { UPGRADES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

interface UpgradesScreenProps {
  currency: number;
  upgrades: BaseUpgrades;
  onPurchase: (upgradeId: string) => void;
  onClose: () => void;
}

export function UpgradesScreen({
  currency,
  upgrades,
  onPurchase,
  onClose,
}: UpgradesScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Upgrades</h2>
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
        <div className="space-y-3">
          {Object.values(UPGRADES).map((upgrade, index) => {
            const currentLevel = upgrades[upgrade.id as keyof BaseUpgrades] as number;
            const isMaxed = currentLevel >= upgrade.maxLevel;
            const cost = isMaxed ? 0 : upgrade.getCost(currentLevel);
            const canAfford = currency >= cost;
            const currentValue = upgrade.getValue(currentLevel);
            const nextValue = isMaxed ? currentValue : upgrade.getValue(currentLevel + 1);

            return (
              <motion.div
                key={upgrade.id}
                className="industrial-panel p-4 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{upgrade.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-industrial text-foreground">
                        {upgrade.name}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        Lv.{currentLevel}/{upgrade.maxLevel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {upgrade.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-mono">
                        {currentValue}
                        {!isMaxed && (
                          <span className="text-primary"> → {nextValue}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {isMaxed ? (
                    <div className="flex items-center gap-1 text-accent px-3 py-2">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-industrial">MAX</span>
                    </div>
                  ) : (
                    <Button
                      variant={canAfford ? "action" : "steel"}
                      size="sm"
                      onClick={() => onPurchase(upgrade.id)}
                      disabled={!canAfford}
                      className="flex items-center gap-1"
                    >
                      {canAfford ? (
                        <>
                          <Coins className="w-4 h-4" />
                          {cost}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          {cost}
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Level Progress */}
                <div className="flex gap-1 mt-3">
                  {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        i < currentLevel ? "bg-primary" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </motion.div>
  );
}
