import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Wrench, Battery, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelperRobot, Item, BatteryState, STARTER_BATTERY_CAPACITY } from '@/types/game';
import { HELPER_FRAMES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

interface WorkshopScreenProps {
  helpers: HelperRobot[];
  controlCapacity: number;
  currency: number;
  stash: Item[];
  battery: BatteryState;
  onClose: () => void;
  onEquipBattery: (batteryId: string | null) => void;
  onInstallModule: (helperId: string, slotIndex: number, item: Item) => void;
  onRemoveModule: (helperId: string, slotIndex: number) => void;
}

export function WorkshopScreen({
  helpers,
  controlCapacity,
  currency,
  stash,
  battery,
  onClose,
  onEquipBattery,
  onInstallModule,
  onRemoveModule,
}: WorkshopScreenProps) {
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);
  const [selectingModuleSlot, setSelectingModuleSlot] = useState<number | null>(null);
  
  const deployedCount = helpers.filter(h => h.isDeployed).length;
  const selectedHelper = helpers.find(h => h.id === selectedHelperId);
  
  // Get batteries and modules from stash
  const availableBatteries = stash.filter(i => i.category === 'battery');
  const availableModules = stash.filter(i => i.category === 'module');
  const equippedBattery = stash.find(i => i.id === battery.equippedBatteryId);

  const handleSelectModuleSlot = (slotIndex: number) => {
    if (selectedHelper?.modules[slotIndex]) {
      // Remove module from slot
      onRemoveModule(selectedHelper.id, slotIndex);
    } else {
      // Select slot for installing
      setSelectingModuleSlot(slotIndex);
    }
  };

  const handleInstallModule = (item: Item) => {
    if (selectedHelper && selectingModuleSlot !== null) {
      onInstallModule(selectedHelper.id, selectingModuleSlot, item);
      setSelectingModuleSlot(null);
    }
  };

  // Helper Engineering View
  if (selectedHelper) {
    const frame = HELPER_FRAMES[selectedHelper.frameId];
    
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background flex flex-col"
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
      >
        {/* Header */}
        <header className="industrial-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedHelperId(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-industrial text-primary">Engineer Helper</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* Helper Info */}
          <div className="industrial-panel p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{frame.icon}</span>
              <div>
                <h3 className="font-industrial text-lg">{frame.name}</h3>
                <p className="text-sm text-muted-foreground">
                  +{frame.carryBonus} carry • {frame.moduleSlots} slots
                </p>
              </div>
            </div>
          </div>

          {/* Module Slots */}
          <section>
            <h3 className="text-sm font-industrial text-muted-foreground mb-3">
              Module Slots ({selectedHelper.modules.filter(Boolean).length}/{frame.moduleSlots})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: frame.moduleSlots }).map((_, i) => {
                const module = selectedHelper.modules[i];
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleSelectModuleSlot(i)}
                    className={cn(
                      "industrial-panel p-4 rounded-lg flex flex-col items-center justify-center gap-2 min-h-[100px] transition-colors",
                      selectingModuleSlot === i && "ring-2 ring-primary",
                      module ? "hover:bg-destructive/10" : "hover:bg-primary/10"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    {module ? (
                      <>
                        <span className="text-3xl">{module.icon}</span>
                        <span className="text-xs font-medium">{module.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Tap to remove
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Empty Slot</span>
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Module Selection */}
          <AnimatePresence>
            {selectingModuleSlot !== null && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-industrial text-muted-foreground">
                    Select Module from Stash
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectingModuleSlot(null)}>
                    Cancel
                  </Button>
                </div>
                <div className="space-y-2">
                  {availableModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No modules in stash. Find them in the junkyard!
                    </p>
                  ) : (
                    availableModules.map(module => (
                      <motion.button
                        key={module.id}
                        onClick={() => handleInstallModule(module)}
                        className="w-full industrial-panel p-3 rounded-lg flex items-center gap-3 hover:bg-primary/10 transition-colors"
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-2xl">{module.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{module.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{module.rarity}</p>
                        </div>
                        <Plus className="w-5 h-5 text-primary" />
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    );
  }

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

        {/* Battery Section */}
        <section className="mb-6">
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            <Battery className="w-4 h-4 inline mr-2" />
            Robot Battery
          </h3>
          <div className="industrial-panel p-4 rounded-lg space-y-3">
            {/* Currently Equipped */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{equippedBattery?.icon || '🔋'}</span>
                <div>
                  <p className="text-sm font-medium">
                    {equippedBattery?.name || 'Starter Battery'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Capacity: {equippedBattery?.batteryCapacity || STARTER_BATTERY_CAPACITY} moves
                  </p>
                </div>
              </div>
              {equippedBattery && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEquipBattery(null)}
                >
                  Unequip
                </Button>
              )}
            </div>
            
            {/* Available Batteries */}
            {availableBatteries.length > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Available in stash:</p>
                {availableBatteries.map(bat => (
                  <div 
                    key={bat.id} 
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{bat.icon}</span>
                      <div>
                        <p className="text-sm">{bat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bat.batteryCapacity} moves
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="steel" 
                      size="sm"
                      onClick={() => onEquipBattery(bat.id)}
                    >
                      Equip
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

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
                        +{frame.carryBonus} carry • {helper.modules.filter(Boolean).length}/{frame.moduleSlots} modules
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-industrial",
                        helper.isDeployed ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {helper.isDeployed ? 'Active' : 'Idle'}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedHelperId(helper.id)}
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Module Slots Preview */}
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
