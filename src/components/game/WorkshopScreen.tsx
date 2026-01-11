import { motion } from 'framer-motion';
import { X, Bot, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelperRobot } from '@/types/game';
import { HELPER_FRAMES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

interface WorkshopScreenProps {
  helpers: HelperRobot[];
  controlCapacity: number;
  currency: number;
  onClose: () => void;
}

export function WorkshopScreen({
  helpers,
  controlCapacity,
  currency,
  onClose,
}: WorkshopScreenProps) {
  const deployedCount = helpers.filter(h => h.isDeployed).length;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Workshop</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Deployed Status */}
        <div className="mb-6 p-4 industrial-panel rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Deployed</span>
            </div>
            <span className="font-mono text-lg">
              {deployedCount}/{controlCapacity}
            </span>
          </div>
        </div>

        {/* Helpers List */}
        <section className="mb-6">
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Your Helpers ({helpers.length})
          </h3>
          <div className="space-y-3">
            {helpers.map(helper => {
              const frame = HELPER_FRAMES[helper.frameId];
              
              return (
                <motion.div
                  key={helper.id}
                  className={cn(
                    "industrial-panel p-4 rounded-lg",
                    helper.isDeployed && "ring-2 ring-primary"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{frame.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-industrial">{frame.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        +{frame.carryBonus} carry • {frame.moduleSlots} slots
                      </p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-industrial",
                      helper.isDeployed ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {helper.isDeployed ? 'Active' : 'Idle'}
                    </div>
                  </div>
                  
                  {/* Module Slots */}
                  <div className="flex gap-2 mt-3">
                    {Array.from({ length: frame.moduleSlots }).map((_, i) => {
                      const module = helper.modules[i];
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 h-12 rounded border-2 border-dashed flex items-center justify-center",
                            module ? "border-primary bg-primary/10" : "border-border"
                          )}
                        >
                          {module ? (
                            <span className="text-xl">{module.icon}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
            {helpers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No helpers built yet
              </p>
            )}
          </div>
        </section>

        {/* Build New Helper */}
        <section>
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Build New Helper
          </h3>
          <div className="space-y-3">
            {Object.values(HELPER_FRAMES).map(frame => (
              <motion.div
                key={frame.id}
                className="industrial-panel p-4 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{frame.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-industrial">{frame.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      +{frame.carryBonus} carry • {frame.moduleSlots} module slots
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requires: {frame.requiredComponents.join(', ')}
                    </p>
                  </div>
                  <Button variant="steel" size="sm" disabled>
                    <Wrench className="w-4 h-4" />
                    Build
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
