import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Target, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item } from '@/types/game';
import { getConsumableDefinition } from '@/data/consumableData';
import { cn } from '@/lib/utils';

interface LoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadedConsumables: Item[];
  launcherCapacity: number;
  stashConsumables: Item[];
  onLoadConsumable: (consumableId: string) => void;
  onUnloadConsumable: (index: number) => void;
  launcherName?: string;
  launcherIcon?: string;
}

export function LoadoutModal({
  isOpen,
  onClose,
  loadedConsumables,
  launcherCapacity,
  stashConsumables,
  onLoadConsumable,
  onUnloadConsumable,
  launcherName = 'Launcher',
  launcherIcon = '🎯',
}: LoadoutModalProps) {
  const slotsRemaining = launcherCapacity - loadedConsumables.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md bg-background border border-border rounded-lg overflow-hidden max-h-[85vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="industrial-panel p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-industrial text-foreground">Loadout</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Launcher Info */}
              <div className="industrial-panel p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{launcherIcon}</span>
                  <span className="font-industrial text-foreground">{launcherName}</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {loadedConsumables.length}/{launcherCapacity} slots
                  </span>
                </div>
                
                {/* Capacity Bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      slotsRemaining === 0 ? "bg-accent" : "bg-primary"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${(loadedConsumables.length / launcherCapacity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Loaded Consumables */}
              <div>
                <h3 className="text-sm font-industrial text-muted-foreground uppercase tracking-wider mb-2">
                  Loaded ({loadedConsumables.length})
                </h3>
                
                {loadedConsumables.length === 0 ? (
                  <div className="industrial-panel p-4 rounded-lg text-center">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No consumables loaded</p>
                    <p className="text-xs text-muted-foreground/70">Load consumables from your stash below</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {loadedConsumables.map((item, index) => {
                      const definition = getConsumableDefinition(item.consumableType as any);
                      return (
                        <motion.div
                          key={item.id}
                          className="industrial-panel p-3 rounded-lg flex items-center gap-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.name}</p>
                            {definition && (
                              <p className="text-xs text-muted-foreground truncate">
                                {definition.effect}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onUnloadConsumable(index)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available in Stash */}
              <div>
                <h3 className="text-sm font-industrial text-muted-foreground uppercase tracking-wider mb-2">
                  Available in Stash ({stashConsumables.length})
                </h3>
                
                {stashConsumables.length === 0 ? (
                  <div className="industrial-panel p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">No consumables in stash</p>
                    <p className="text-xs text-muted-foreground/70">Craft or buy consumables first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stashConsumables.map((item, index) => {
                      const definition = getConsumableDefinition(item.consumableType as any);
                      const canLoad = slotsRemaining > 0;
                      
                      return (
                        <motion.div
                          key={item.id}
                          className={cn(
                            "industrial-panel p-3 rounded-lg flex items-center gap-3",
                            !canLoad && "opacity-50"
                          )}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.name}</p>
                            {definition && (
                              <p className="text-xs text-muted-foreground truncate">
                                Counters: {definition.countersEnemies.slice(0, 2).join(', ')}
                                {definition.countersEnemies.length > 2 && '...'}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onLoadConsumable(item.id)}
                            disabled={!canLoad}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="industrial-panel p-4 border-t border-border">
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
