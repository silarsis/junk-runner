import { motion } from 'framer-motion';
import { Coins, Package, Wrench, ShoppingBag, ArrowUp, Map, Trash2, Battery } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, STARTER_BATTERY_CAPACITY } from '@/types/game';
import { cn } from '@/lib/utils';

interface BaseScreenProps {
  gameState: GameState;
  maxBattery: number;
  onEnterJunkyard: () => void;
  onOpenCleaning: () => void;
  onOpenSell: () => void;
  onOpenUpgrades: () => void;
  onOpenWorkshop: () => void;
  onOpenBatteryShop: () => void;
  onMoveToNextJunkyard: () => void;
  onTransferToStash: () => void;
}

export function BaseScreen({
  gameState,
  maxBattery,
  onEnterJunkyard,
  onOpenCleaning,
  onOpenSell,
  onOpenUpgrades,
  onOpenWorkshop,
  onOpenBatteryShop,
  onMoveToNextJunkyard,
  onTransferToStash,
}: BaseScreenProps) {
  const { player } = gameState;
  const bagItemCount = player.bag.items.length;
  const stashItemCount = player.stash.length;
  const cleaningCount = player.cleaningJobs.length;
  const activeJunkyard = gameState.junkyard !== null;
  
  const equippedBattery = player.battery.equippedBatteryId 
    ? player.stash.find(i => i.id === player.battery.equippedBatteryId)
    : null;

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
            className="industrial-panel p-3 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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

        {/* Battery Status */}
        <motion.div 
          className="industrial-panel p-3 rounded-lg flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-3">
            <Battery className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {equippedBattery ? equippedBattery.name : 'Starter Battery'}
              </p>
              <p className="text-xs text-muted-foreground">
                {player.battery.currentCharge}/{maxBattery} charge
              </p>
            </div>
          </div>
          <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(player.battery.currentCharge / maxBattery) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
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
              onClick={onOpenBatteryShop}
            >
              <Battery className="w-5 h-5" />
              <span className="text-xs">Batteries</span>
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
              <Wrench className="w-5 h-5" />
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
      </main>
    </div>
  );
}
