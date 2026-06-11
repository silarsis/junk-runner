import { motion } from 'framer-motion';
import { Coins, Package, Wrench, ShoppingBag, ArrowUp, Map, Trash2, Battery, Bot, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, Bag, BASIC_BATTERY_CAPACITY } from '@/types/game';
import { UPGRADES } from '@/data/upgradeData';
import { cn } from '@/lib/utils';

interface BaseScreenProps {
  gameState: GameState;
  maxBattery: number;
  currentBag: Bag;
  bagItemCount: number;
  onEnterJunkyard: () => void;
  onOpenCleaning: () => void;
  onOpenSell: () => void;
  onOpenUpgrades: () => void;
  onOpenWorkshop: () => void;
  onOpenStash: () => void;
  onMoveToNextJunkyard: () => void;
  onTransferToStash: () => void;
  onRecharge: () => void;
  onResetSave: () => void;
}

export function BaseScreen({
  gameState,
  maxBattery,
  currentBag,
  bagItemCount,
  onEnterJunkyard,
  onOpenCleaning,
  onOpenSell,
  onOpenUpgrades,
  onOpenWorkshop,
  onOpenStash,
  onMoveToNextJunkyard,
  onTransferToStash,
  onRecharge,
  onResetSave,
}: BaseScreenProps) {
  const { player } = gameState;
  const stashItemCount = player.stash.length;
  const cleaningCount = player.cleaningJobs.length;
  const activeJunkyard = gameState.junkyard !== null;
  
  // Get primary helper info
  const primaryHelper = player.helpers.find(h => h.isPrimary);
  const helperBattery = primaryHelper?.components.battery;
  const helperStorage = primaryHelper?.components.modules.find(m => m?.category === 'storage');
  const helperMobility = primaryHelper?.components.mobility;
  
  // Calculate charging cost
  const chargeNeeded = maxBattery - player.currentCharge;
  const costPerUnit = UPGRADES.chargerEfficiency.getValue(player.baseUpgrades.chargerEfficiency ?? 0);
  const chargingCost = Math.ceil(chargeNeeded * costPerUnit);
  const canAffordFullCharge = player.currency >= chargingCost;
  const needsCharge = chargeNeeded > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Mobility */}
            <div className="p-2 rounded bg-muted/30 text-center">
              <span className="text-lg">{helperMobility?.icon || '⛓️'}</span>
              <p className="text-muted-foreground mt-1">{helperMobility?.name || 'Tank Treads'}</p>
            </div>
            
            {/* Storage */}
            <div className="p-2 rounded bg-muted/30 text-center">
              <span className="text-lg">{helperStorage?.icon || '📦'}</span>
              <p className="text-muted-foreground mt-1">
                {helperStorage ? `${helperStorage.storageWidth}x${helperStorage.storageHeight}` : '4x4'}
              </p>
            </div>
            
            {/* Battery */}
            <div className="p-2 rounded bg-muted/30 text-center">
              <span className="text-lg">{helperBattery?.icon || '🔋'}</span>
              <p className="text-muted-foreground mt-1">{maxBattery} moves</p>
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

        {/* Main Action - Enter Junkyard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="action"
            size="xl"
            className="w-full py-8"
            onClick={onEnterJunkyard}
          >
            <Map className="w-6 h-6" />
            {activeJunkyard ? 'Continue Scavenging' : 'Enter Junkyard'}
          </Button>
        </motion.div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
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
              <Coins className="w-5 h-5" />
              <span className="text-xs">Sell</span>
              {stashItemCount > 0 && (
                <span className="text-[10px] text-primary">({stashItemCount})</span>
              )}
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
              onClick={onOpenWorkshop}
            >
              <Bot className="w-5 h-5" />
              <span className="text-xs">Workshop</span>
            </Button>
          </motion.div>
        </div>

        {/* Move to Next Junkyard */}
        {activeJunkyard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-auto pt-4"
          >
            <Button
              variant="danger"
              className="w-full"
              onClick={onMoveToNextJunkyard}
            >
              <Trash2 className="w-4 h-4" />
              Abandon & Generate New Junkyard
            </Button>
          </motion.div>
        )}

        {/* Reset Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4 pt-4 border-t border-border"
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
    </div>
  );
}