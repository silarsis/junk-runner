import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Package, Wrench, ShoppingBag, ArrowUp, Map, Battery, Bot, Zap, RotateCcw, Cog, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, Bag, Item, BASIC_BATTERY_CAPACITY } from '@/types/game';
import { UPGRADES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

type SlotType = 'mobility' | 'battery' | 'module';

interface BaseScreenProps {
  gameState: GameState;
  maxBattery: number;
  currentBag: Bag;
  bagItemCount: number;
  onOpenCleaning: () => void;
  onOpenSell: () => void;
  onOpenUpgrades: () => void;
  onOpenWorkshop: () => void;
  onOpenAutomation: () => void;
  onOpenStash: () => void;
  onOpenScavenge: () => void;
  onTransferToStash: () => void;
  onRecharge: () => void;
  onResetSave: () => void;
  onInstallComponent: (helperId: string, slotType: SlotType, item: Item, moduleIndex?: number) => void;
  onRemoveComponent: (helperId: string, slotType: SlotType, moduleIndex?: number) => void;
}

export function BaseScreen({
  gameState,
  maxBattery,
  currentBag,
  bagItemCount,
  onOpenCleaning,
  onOpenSell,
  onOpenUpgrades,
  onOpenWorkshop,
  onOpenAutomation,
  onOpenStash,
  onOpenScavenge,
  onTransferToStash,
  onRecharge,
  onResetSave,
  onInstallComponent,
  onRemoveComponent,
}: BaseScreenProps) {
  const { player } = gameState;
  const stashItemCount = player.stash.length;
  const cleaningCount = player.cleaningJobs.length;
  const activeJunkyard = gameState.infiniteJunkyard !== null;
  
  // Get primary helper info
  const primaryHelper = player.helpers.find(h => h.isPrimary);
  const helperBattery = primaryHelper?.components.battery;
  const helperModules = primaryHelper?.components.modules || [];
  const helperMobility = primaryHelper?.components.mobility;
  
  // For backward compat in slot description
  const helperStorage = helperModules.find(m => m?.category === 'storage');
  
  // Calculate charging cost
  const chargeNeeded = maxBattery - player.currentCharge;
  const costPerUnit = UPGRADES.chargerEfficiency.getValue(player.baseUpgrades.chargerEfficiency ?? 0);
  const chargingCost = Math.ceil(chargeNeeded * costPerUnit);
  const canAffordFullCharge = player.currency >= chargingCost;
  const needsCharge = chargeNeeded > 0;
  
  // State for module selection modal
  const [selectedSlot, setSelectedSlot] = useState<{ type: SlotType; index?: number; current: Item | null } | null>(null);
  
  // Get available items for each slot type from stash
  const getAvailableItems = (slotType: SlotType): Item[] => {
    switch (slotType) {
      case 'mobility':
        return player.stash.filter(i => i.category === 'mobility');
      case 'battery':
        return player.stash.filter(i => i.category === 'battery');
      case 'module':
        return player.stash.filter(i => i.category === 'module' || i.category === 'storage');
      default:
        return [];
    }
  };
  
  const isBasicComponent = (component: Item | null | undefined) => {
    return component?.id.startsWith('basic-');
  };
  
  const handleSlotClick = (slotType: SlotType, current: Item | null, moduleIndex?: number) => {
    setSelectedSlot({ type: slotType, current, index: moduleIndex });
  };
  
  const handleInstallItem = (item: Item) => {
    if (primaryHelper && selectedSlot) {
      onInstallComponent(primaryHelper.id, selectedSlot.type, item, selectedSlot.index);
      setSelectedSlot(null);
    }
  };
  
  const handleRemoveCurrent = () => {
    if (primaryHelper && selectedSlot && selectedSlot.current && !isBasicComponent(selectedSlot.current)) {
      onRemoveComponent(primaryHelper.id, selectedSlot.type, selectedSlot.index);
      setSelectedSlot(null);
    }
  };
  
  const getSlotDescription = (slotType: SlotType, item: Item | null): string => {
    if (!item) return 'Empty slot';
    switch (slotType) {
      case 'mobility':
        return `${item.movementType || 'basic'} movement`;
      case 'battery':
        return `${item.batteryCapacity || BASIC_BATTERY_CAPACITY} moves capacity`;
      case 'module':
        if (item.category === 'storage') {
          return `${item.storageWidth}x${item.storageHeight} storage`;
        }
        return item.rarity || 'common';
      default:
        return '';
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h1 className="text-xl font-industrial text-primary tracking-wider">
          JUNKRUNNER
        </h1>
        <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md">
          <Coins className="w-5 h-5 text-accent" />
          <span className="font-mono text-lg text-accent">{player.currency}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            className="industrial-panel p-3 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Bag</span>
            </div>
            <p className="text-xl font-industrial text-foreground">{bagItemCount}</p>
          </motion.div>

          <motion.div 
            className="industrial-panel p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={onOpenStash}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Stash</span>
            </div>
            <p className="text-xl font-industrial text-foreground">{stashItemCount}</p>
          </motion.div>

          <motion.div 
            className="industrial-panel p-3 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Battery className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Battery</span>
            </div>
            <p className="text-xl font-industrial text-foreground">{maxBattery}</p>
          </motion.div>
        </div>

        {/* Primary Helper Status */}
        <motion.div 
          className="industrial-panel p-4 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm font-industrial">Your Robot</p>
              <p className="text-xs text-muted-foreground">Basic Frame</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Top row: Mobility + Battery */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Mobility */}
              <motion.button
                className="p-2 rounded bg-muted/30 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleSlotClick('mobility', helperMobility || null)}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg">{helperMobility?.icon || '⛓️'}</span>
                <p className="text-muted-foreground mt-1">{helperMobility?.name || 'Tank Treads'}</p>
              </motion.button>
              
              {/* Battery */}
              <motion.button
                className="p-2 rounded bg-muted/30 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleSlotClick('battery', helperBattery || null)}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg">{helperBattery?.icon || '🔋'}</span>
                <p className="text-muted-foreground mt-1">{maxBattery} moves</p>
              </motion.button>
            </div>
            
            {/* Modules row - shows all equipped modules */}
            <div className="text-xs">
              <p className="text-muted-foreground text-[10px] mb-1">Modules ({helperModules.length}/2)</p>
              <div className="grid grid-cols-2 gap-2">
                {helperModules.map((module, idx) => (
                  <motion.button
                    key={idx}
                    className="p-2 rounded bg-muted/30 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleSlotClick('module', module, idx)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-lg">{module?.icon || '📦'}</span>
                    <p className="text-muted-foreground mt-1 truncate text-[10px]">
                      {module?.category === 'storage' 
                        ? `${module.storageWidth}x${module.storageHeight} storage`
                        : module?.name || 'Empty'}
                    </p>
                  </motion.button>
                ))}
                {helperModules.length < 2 && (
                  <motion.button
                    className="p-2 rounded bg-muted/20 text-center hover:bg-muted/30 transition-colors cursor-pointer border border-dashed border-muted-foreground/30"
                    onClick={() => handleSlotClick('module', null, helperModules.length)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-1 text-[10px]">Add Module</p>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          
          {/* Charge Bar */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Charge:</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full",
                  player.currentCharge < maxBattery * 0.25 ? "bg-destructive" : 
                  player.currentCharge < maxBattery * 0.5 ? "bg-accent" : "bg-primary"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(player.currentCharge / maxBattery) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-mono">{player.currentCharge}/{maxBattery}</span>
          </div>
          
          {/* Recharge Button */}
          {needsCharge && (
            <motion.div
              className="mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                variant="steel"
                className="w-full flex items-center justify-between"
                onClick={onRecharge}
                disabled={player.currency === 0}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span>Recharge Battery</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-mono text-sm",
                    !canAffordFullCharge && "text-destructive"
                  )}>
                    {chargingCost}
                  </span>
                  <Coins className="w-3 h-3 text-accent" />
                  {costPerUnit < 1 && (
                    <span className="text-xs text-primary ml-1">
                      ({Math.round((1 - costPerUnit) * 100)}% off)
                    </span>
                  )}
                </div>
              </Button>
              {!canAffordFullCharge && player.currency > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Partial recharge available
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Transfer Button */}
        {bagItemCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              variant="steel"
              className="w-full"
              onClick={onTransferToStash}
            >
              <Package className="w-4 h-4" />
              Transfer Bag to Stash ({bagItemCount} items)
            </Button>
          </motion.div>
        )}

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Scavenge Button - Primary action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-2"
          >
            <Button
              variant="action"
              className="w-full h-20 flex-col gap-1"
              onClick={onOpenScavenge}
            >
              <Map className="w-6 h-6" />
              <span className="text-sm font-industrial">Scavenge</span>
              {activeJunkyard && (
                <span className="text-[10px] text-primary-foreground/80">(In Progress)</span>
              )}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button
              variant="nav"
              className="w-full h-16 flex-col gap-1"
              onClick={onOpenCleaning}
            >
              <Wrench className="w-5 h-5" />
              <span className="text-xs">Cleaning</span>
              {cleaningCount > 0 && (
                <span className="text-[10px] text-primary">({cleaningCount})</span>
              )}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="nav"
              className="w-full h-16 flex-col gap-1"
              onClick={onOpenSell}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs">Shop</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Button
              variant="nav"
              className="w-full h-16 flex-col gap-1"
              onClick={onOpenUpgrades}
            >
              <ArrowUp className="w-5 h-5" />
              <span className="text-xs">Upgrades</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="nav"
              className="w-full h-16 flex-col gap-1"
              onClick={onOpenAutomation}
            >
              <Cog className="w-5 h-5" />
              <span className="text-xs">Automation</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Button
              variant="nav"
              className="w-full h-16 flex-col gap-1"
              onClick={onOpenWorkshop}
            >
              <Bot className="w-5 h-5" />
              <span className="text-xs">Workshop</span>
            </Button>
          </motion.div>
        </div>

        {/* Reset Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-auto pt-4 border-t border-border"
        >
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={onResetSave}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Save Data
          </Button>
        </motion.div>
      </main>
      
      {/* Module Selection Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/95 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <header className="industrial-panel p-4 flex items-center justify-between">
              <h3 className="text-lg font-industrial text-primary">
                {selectedSlot.type.charAt(0).toUpperCase() + selectedSlot.type.slice(1)} Module
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSlot(null)}>
                <X className="w-5 h-5" />
              </Button>
            </header>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Current Module Info */}
              {selectedSlot.current && (
                <div className="industrial-panel p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{selectedSlot.current.icon}</span>
                    <div className="flex-1">
                      <p className="font-industrial">{selectedSlot.current.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {getSlotDescription(selectedSlot.type, selectedSlot.current)}
                      </p>
                    </div>
                    {isBasicComponent(selectedSlot.current) && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Basic</span>
                    )}
                  </div>
                  
                  {/* Condition bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Condition:</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          selectedSlot.current.condition > 50 ? "bg-primary" :
                          selectedSlot.current.condition > 20 ? "bg-yellow-500" : "bg-destructive"
                        )}
                        style={{ width: `${selectedSlot.current.condition}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono">{selectedSlot.current.condition}%</span>
                  </div>
                  
                  {!isBasicComponent(selectedSlot.current) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full text-destructive hover:text-destructive"
                      onClick={handleRemoveCurrent}
                    >
                      Remove to Stash
                    </Button>
                  )}
                </div>
              )}
              
              {/* Available Alternatives */}
              <div>
                <h4 className="text-sm font-industrial text-muted-foreground mb-3">
                  Available in Stash
                </h4>
                <div className="space-y-2">
                  {getAvailableItems(selectedSlot.type).map(item => (
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
                          {getSlotDescription(selectedSlot.type, item)}
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </motion.button>
                  ))}
                  {getAvailableItems(selectedSlot.type).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No compatible items in stash
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}