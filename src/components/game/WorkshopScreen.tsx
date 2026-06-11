import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Wrench, Battery, Plus, Trash2, ArrowLeft, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelperRobot, Item, BASIC_BATTERY_CAPACITY } from '@/types/game';
import { HELPER_FRAMES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

interface WorkshopScreenProps {
  helpers: HelperRobot[];
  controlCapacity: number;
  currency: number;
  stash: Item[];
  onClose: () => void;
  onInstallComponent: (helperId: string, slotType: 'mobility' | 'battery' | 'module', item: Item, moduleIndex?: number) => void;
  onRemoveComponent: (helperId: string, slotType: 'mobility' | 'battery' | 'module', moduleIndex?: number) => void;
}

type SlotType = 'mobility' | 'battery' | 'module';

export function WorkshopScreen({
  helpers,
  controlCapacity,
  currency,
  stash,
  onClose,
  onInstallComponent,
  onRemoveComponent,
}: WorkshopScreenProps) {
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<{ type: SlotType; index?: number } | null>(null);
  
  const deployedCount = helpers.filter(h => h.isDeployed).length;
  const selectedHelper = helpers.find(h => h.id === selectedHelperId);
  
  // Get available items for each slot type
  const getAvailableItems = (slotType: SlotType) => {
    switch (slotType) {
      case 'mobility':
        return stash.filter(i => i.category === 'mobility');
      case 'battery':
        return stash.filter(i => i.category === 'battery');
      case 'module':
        return stash.filter(i => i.category === 'module' || i.category === 'storage');
      default:
        return [];
    }
  };

  const handleInstallItem = (item: Item) => {
    if (selectedHelper && selectingSlot) {
      onInstallComponent(selectedHelper.id, selectingSlot.type, item, selectingSlot.index);
      setSelectingSlot(null);
    }
  };

  const handleRemoveComponent = (slotType: SlotType, moduleIndex?: number) => {
    if (selectedHelper) {
      onRemoveComponent(selectedHelper.id, slotType, moduleIndex);
    }
  };

  const isBasicComponent = (component: Item | null | undefined) => {
    return component?.id.startsWith('basic-');
  };

  // Helper Engineering View
  if (selectedHelper) {
    const frame = HELPER_FRAMES[selectedHelper.frameId];
    const { mobility, modules, battery } = selectedHelper.components;
    
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
            <h2 className="text-xl font-industrial text-primary">Engineer Robot</h2>
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
                  {frame.slots.mobilitySlots} mobility • {frame.slots.moduleSlots} modules • {frame.slots.batterySlots} battery
                </p>
                {selectedHelper.isPrimary && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mt-1 inline-block">
                    Primary Robot
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobility Slot */}
          <section>
            <h3 className="text-sm font-industrial text-muted-foreground mb-3 flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Mobility
            </h3>
            <motion.button
              onClick={() => !isBasicComponent(mobility) && handleRemoveComponent('mobility')}
              className={cn(
                "w-full industrial-panel p-4 rounded-lg flex items-center gap-4 transition-colors",
                !isBasicComponent(mobility) && "hover:bg-destructive/10"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl">{mobility?.icon || '⛓️'}</span>
              <div className="flex-1 text-left">
                <p className="font-medium">{mobility?.name || 'Tank Treads'}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {mobility?.movementType || 'basic'} movement
                </p>
              </div>
              {!isBasicComponent(mobility) ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Basic</span>
              )}
            </motion.button>
            {getAvailableItems('mobility').length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setSelectingSlot({ type: 'mobility' })}
              >
                <Plus className="w-4 h-4 mr-2" /> Install Different Mobility
              </Button>
            )}
          </section>

          {/* Battery Slot */}
          <section>
            <h3 className="text-sm font-industrial text-muted-foreground mb-3 flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Battery
            </h3>
            <motion.button
              onClick={() => !isBasicComponent(battery) && handleRemoveComponent('battery')}
              className={cn(
                "w-full industrial-panel p-4 rounded-lg flex items-center gap-4 transition-colors",
                !isBasicComponent(battery) && "hover:bg-destructive/10"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl">{battery?.icon || '🔋'}</span>
              <div className="flex-1 text-left">
                <p className="font-medium">{battery?.name || 'Basic Battery'}</p>
                <p className="text-xs text-muted-foreground">
                  {battery?.batteryCapacity || BASIC_BATTERY_CAPACITY} moves capacity
                </p>
              </div>
              {!isBasicComponent(battery) ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Basic</span>
              )}
            </motion.button>
            {getAvailableItems('battery').length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setSelectingSlot({ type: 'battery' })}
              >
                <Plus className="w-4 h-4 mr-2" /> Install Different Battery
              </Button>
            )}
          </section>

          {/* Module Slots */}
          <section>
            <h3 className="text-sm font-industrial text-muted-foreground mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Modules ({modules.length}/{frame.slots.moduleSlots})
            </h3>
            <div className="space-y-2">
              {modules.map((module, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => !isBasicComponent(module) && handleRemoveComponent('module', idx)}
                  className={cn(
                    "w-full industrial-panel p-4 rounded-lg flex items-center gap-4 transition-colors",
                    !isBasicComponent(module) && "hover:bg-destructive/10"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-3xl">{module?.icon || '📦'}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{module?.name || 'Unknown Module'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {module?.category === 'storage' 
                        ? `${module.storageWidth}x${module.storageHeight} storage`
                        : module?.rarity || 'common'}
                    </p>
                  </div>
                  {!isBasicComponent(module) ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Remove
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Basic</span>
                  )}
                </motion.button>
              ))}
              
              {/* Add module button */}
              {modules.length < frame.slots.moduleSlots && getAvailableItems('module').length > 0 && (
                <Button
                  variant="outline"
                  className="w-full h-16"
                  onClick={() => setSelectingSlot({ type: 'module', index: modules.length })}
                >
                  <Plus className="w-5 h-5 mr-2" /> Add Module
                </Button>
              )}
            </div>
          </section>

          {/* Item Selection Modal */}
          <AnimatePresence>
            {selectingSlot && (
              <motion.div
                className="fixed inset-0 z-60 bg-background/95 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <header className="industrial-panel p-4 flex items-center justify-between">
                  <h3 className="text-lg font-industrial text-primary">
                    Select {selectingSlot.type.charAt(0).toUpperCase() + selectingSlot.type.slice(1)}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectingSlot(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-2">
                  {getAvailableItems(selectingSlot.type).map(item => (
                    <motion.button
                      key={item.id}
                      onClick={() => handleInstallItem(item)}
                      className="w-full industrial-panel p-4 rounded-lg flex items-center gap-4 hover:bg-primary/10 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-3xl">{item.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.category === 'battery' && `${item.batteryCapacity} moves`}
                          {item.category === 'storage' && `${item.storageWidth}x${item.storageHeight} storage`}
                          {item.category === 'mobility' && `${item.movementType} movement`}
                          {item.category === 'module' && item.rarity}
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </motion.button>
                  ))}
                  {getAvailableItems(selectingSlot.type).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No compatible items in stash
                    </p>
                  )}
                </div>
              </motion.div>
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
              <span className="text-sm text-muted-foreground">Robots</span>
            </div>
            <span className="font-mono text-lg">
              {helpers.length}/{controlCapacity}
            </span>
          </div>
        </div>

        {/* Helpers List */}
        <section className="mb-6">
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Your Robots ({helpers.length})
          </h3>
          <div className="space-y-3">
            {helpers.map(helper => {
              const frame = HELPER_FRAMES[helper.frameId];
              const battery = helper.components.battery;
              const moduleCount = helper.components.modules.length;
              
              return (
                <motion.div
                  key={helper.id}
                  className={cn(
                    "industrial-panel p-4 rounded-lg",
                    helper.isPrimary && "ring-2 ring-primary"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{frame.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-industrial">{frame.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {battery?.batteryCapacity || BASIC_BATTERY_CAPACITY} moves • {moduleCount}/{frame.slots.moduleSlots} modules
                      </p>
                      {helper.isPrimary && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded mt-1 inline-block">
                          Primary
                        </span>
                      )}
                    </div>
                    <Button 
                      variant="steel" 
                      size="sm"
                      onClick={() => setSelectedHelperId(helper.id)}
                    >
                      <Wrench className="w-4 h-4 mr-1" />
                      Engineer
                    </Button>
                  </div>
                  
                  {/* Component Preview */}
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 h-10 rounded border border-border flex items-center justify-center gap-1 bg-muted/20">
                      <span className="text-sm">{helper.components.mobility?.icon || '⛓️'}</span>
                    </div>
                    <div className="flex-1 h-10 rounded border border-border flex items-center justify-center gap-1 bg-muted/20">
                      <span className="text-sm">{battery?.icon || '🔋'}</span>
                    </div>
                    {helper.components.modules.map((module, idx) => (
                      <div key={idx} className="flex-1 h-10 rounded border border-border flex items-center justify-center bg-muted/20">
                        <span className="text-sm">{module?.icon || '📦'}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Build New Helper (placeholder) */}
        <section>
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Build New Robot
          </h3>
          <div className="space-y-3">
            {Object.values(HELPER_FRAMES).filter(f => f.id !== 'basic').map(frame => (
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
                      {frame.slots.mobilitySlots} mobility • {frame.slots.moduleSlots} modules • {frame.slots.batterySlots} battery
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