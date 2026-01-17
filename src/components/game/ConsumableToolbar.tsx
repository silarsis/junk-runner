import { motion } from 'framer-motion';
import { Item } from '@/types/game';
import { getConsumableDefinition, ConsumableType } from '@/data/consumableData';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConsumableToolbarProps {
  loadedConsumables: Item[];
  launcherCapacity: number;
  onFireConsumable: (consumableIndex: number) => void;
  disabled?: boolean;
}

export function ConsumableToolbar({
  loadedConsumables,
  launcherCapacity,
  onFireConsumable,
  disabled = false,
}: ConsumableToolbarProps) {
  if (launcherCapacity === 0) return null;

  // Create slots array with loaded consumables and empty slots
  const slots: (Item | null)[] = [];
  for (let i = 0; i < launcherCapacity; i++) {
    slots.push(loadedConsumables[i] || null);
  }

  return (
    <TooltipProvider>
      <motion.div
        className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-xs text-muted-foreground mr-1">🎯</span>
        {slots.map((consumable, index) => {
          const def = consumable?.consumableType 
            ? getConsumableDefinition(consumable.consumableType as ConsumableType)
            : null;
          const isEmpty = !consumable;
          const canFire = !isEmpty && !disabled;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <motion.button
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center text-sm transition-all",
                    isEmpty && "bg-muted/30 border border-dashed border-muted-foreground/30",
                    !isEmpty && "bg-primary/20 border border-primary/50 hover:bg-primary/30",
                    canFire && "cursor-pointer active:scale-90",
                    !canFire && !isEmpty && "opacity-50",
                    disabled && "cursor-not-allowed"
                  )}
                  onClick={() => canFire && onFireConsumable(index)}
                  whileHover={canFire ? { scale: 1.05 } : {}}
                  whileTap={canFire ? { scale: 0.9 } : {}}
                  disabled={!canFire}
                >
                  {isEmpty ? (
                    <span className="text-muted-foreground/50 text-xs">·</span>
                  ) : (
                    <span>{def?.icon || consumable?.icon || '?'}</span>
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                {isEmpty ? (
                  <p className="text-xs">Empty slot</p>
                ) : (
                  <div>
                    <p className="font-medium text-sm">{def?.name || consumable?.name}</p>
                    <p className="text-xs text-muted-foreground">{def?.effect}</p>
                    {def?.countersEnemies && (
                      <p className="text-xs text-primary mt-1">
                        Tap to deploy
                      </p>
                    )}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </motion.div>
    </TooltipProvider>
  );
}
