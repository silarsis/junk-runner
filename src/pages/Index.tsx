import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { BaseScreen } from '@/components/game/BaseScreen';
import { JunkyardScreen } from '@/components/game/JunkyardScreen';
import { InventoryModal } from '@/components/game/InventoryModal';
import { CleaningScreen } from '@/components/game/CleaningScreen';
import { SellScreen } from '@/components/game/SellScreen';
import { UpgradesScreen } from '@/components/game/UpgradesScreen';
import { WorkshopScreen } from '@/components/game/WorkshopScreen';
import { BatteryShopScreen } from '@/components/game/BatteryShopScreen';

type Screen = 'base' | 'junkyard' | 'cleaning' | 'sell' | 'upgrades' | 'workshop' | 'battery';

const Index = () => {
  const {
    gameState,
    isLoading,
    enterJunkyard,
    movePlayer,
    getCurrentPile,
    searchPile,
    returnToBase,
    moveToNextJunkyard,
    startCleaning,
    collectCleanedItem,
    sellItem,
    transferToStash,
    purchaseUpgrade,
    equipBattery,
    purchaseBattery,
    getMaxBattery,
    installModule,
    removeModule,
  } = useGameState();

  const [currentScreen, setCurrentScreen] = useState<Screen>('base');
  const [showInventory, setShowInventory] = useState(false);

  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔧</div>
          <p className="font-industrial text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleEnterJunkyard = () => {
    enterJunkyard();
    setCurrentScreen('junkyard');
  };

  const handleReturnToBase = () => {
    returnToBase();
    setCurrentScreen('base');
  };

  const handleMoveToNextJunkyard = () => {
    if (confirm('This will permanently discard the current junkyard. Continue?')) {
      moveToNextJunkyard();
    }
  };

  const currentPile = getCurrentPile();
  const maxCleaningSlots = 1 + gameState.player.baseUpgrades.cleaningSlots;
  const controlCapacity = 1 + gameState.player.baseUpgrades.controlCapacity;
  const maxBattery = getMaxBattery();

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {currentScreen === 'base' && (
          <BaseScreen
            key="base"
            gameState={gameState}
            maxBattery={maxBattery}
            onEnterJunkyard={handleEnterJunkyard}
            onOpenCleaning={() => setCurrentScreen('cleaning')}
            onOpenSell={() => setCurrentScreen('sell')}
            onOpenUpgrades={() => setCurrentScreen('upgrades')}
            onOpenWorkshop={() => setCurrentScreen('workshop')}
            onOpenBatteryShop={() => setCurrentScreen('battery')}
            onMoveToNextJunkyard={handleMoveToNextJunkyard}
            onTransferToStash={transferToStash}
          />
        )}

        {currentScreen === 'junkyard' && (
          <JunkyardScreen
            key="junkyard"
            gameState={gameState}
            maxBattery={maxBattery}
            onMove={movePlayer}
            currentPile={currentPile}
            onSearch={searchPile}
            onReturnToBase={handleReturnToBase}
            onOpenInventory={() => setShowInventory(true)}
          />
        )}

        {currentScreen === 'cleaning' && (
          <CleaningScreen
            key="cleaning"
            stash={gameState.player.stash}
            cleaningJobs={gameState.player.cleaningJobs}
            maxSlots={maxCleaningSlots}
            onStartCleaning={startCleaning}
            onCollectCleaned={collectCleanedItem}
            onClose={() => setCurrentScreen('base')}
          />
        )}

        {currentScreen === 'sell' && (
          <SellScreen
            key="sell"
            stash={gameState.player.stash}
            onSell={sellItem}
            onClose={() => setCurrentScreen('base')}
          />
        )}

        {currentScreen === 'upgrades' && (
          <UpgradesScreen
            key="upgrades"
            currency={gameState.player.currency}
            upgrades={gameState.player.baseUpgrades}
            onPurchase={purchaseUpgrade}
            onClose={() => setCurrentScreen('base')}
          />
        )}

        {currentScreen === 'workshop' && (
          <WorkshopScreen
            key="workshop"
            helpers={gameState.player.helpers}
            controlCapacity={controlCapacity}
            currency={gameState.player.currency}
            stash={gameState.player.stash}
            battery={gameState.player.battery}
            onClose={() => setCurrentScreen('base')}
            onEquipBattery={equipBattery}
            onInstallModule={installModule}
            onRemoveModule={removeModule}
          />
        )}

        {currentScreen === 'battery' && (
          <BatteryShopScreen
            key="battery"
            stash={gameState.player.stash}
            equippedBatteryId={gameState.player.battery.equippedBatteryId}
            currency={gameState.player.currency}
            onEquipBattery={equipBattery}
            onPurchaseBattery={purchaseBattery}
            onClose={() => setCurrentScreen('base')}
          />
        )}
      </AnimatePresence>

      {/* Inventory Modal */}
      <AnimatePresence>
        {showInventory && (
          <InventoryModal
            bag={gameState.player.bag}
            isOpen={showInventory}
            onClose={() => setShowInventory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
