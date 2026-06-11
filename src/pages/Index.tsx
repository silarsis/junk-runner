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
import { StashModal } from '@/components/game/StashModal';
import { EmailModal } from '@/components/game/EmailModal';


type Screen = 'base' | 'junkyard' | 'cleaning' | 'sell' | 'upgrades' | 'workshop';

const Index = () => {
  const {
    gameState,
    isLoading,
    bagItems,
    getCurrentBag,
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
    installComponent,
    removeComponent,
    getMaxBattery,
    resetGame,
    dismissEmail,

  } = useGameState();

  const [currentScreen, setCurrentScreen] = useState<Screen>('base');
  const [showInventory, setShowInventory] = useState(false);
  const [showStash, setShowStash] = useState(false);

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
    returnToBase(false); // Return without recharging
    setCurrentScreen('base');
  };

  const handleRecharge = () => {
    returnToBase(true); // Recharge when at base
  };

  const handleMoveToNextJunkyard = () => {
    if (confirm('This will permanently discard the current junkyard. Continue?')) {
      moveToNextJunkyard();
    }
  };

  const handleResetSave = () => {
    if (confirm('This will permanently delete all your progress and start fresh. Are you sure?')) {
      resetGame();
    }
  };

  const currentPile = getCurrentPile();
  const maxCleaningSlots = 1 + gameState.player.baseUpgrades.cleaningSlots;
  const controlCapacity = 1 + gameState.player.baseUpgrades.controlCapacity;
  const maxBattery = getMaxBattery();
  const currentBag = getCurrentBag();

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {currentScreen === 'base' && (
          <BaseScreen
            key="base"
            gameState={gameState}
            maxBattery={maxBattery}
            currentBag={currentBag}
            bagItemCount={bagItems.length}
            onEnterJunkyard={handleEnterJunkyard}
            onOpenCleaning={() => setCurrentScreen('cleaning')}
            onOpenSell={() => setCurrentScreen('sell')}
            onOpenUpgrades={() => setCurrentScreen('upgrades')}
            onOpenWorkshop={() => setCurrentScreen('workshop')}
            onOpenStash={() => setShowStash(true)}
            onMoveToNextJunkyard={handleMoveToNextJunkyard}
            onTransferToStash={transferToStash}
            onRecharge={handleRecharge}
            onResetSave={handleResetSave}
          />
        )}

        {currentScreen === 'junkyard' && (
          <JunkyardScreen
            key="junkyard"
            gameState={gameState}
            maxBattery={maxBattery}
            currentBag={currentBag}
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
            onClose={() => setCurrentScreen('base')}
            onInstallComponent={installComponent}
            onRemoveComponent={removeComponent}
          />
        )}
      </AnimatePresence>

      {/* Inventory Modal */}
      <AnimatePresence>
        {showInventory && (
          <InventoryModal
            bag={currentBag}
            isOpen={showInventory}
            onClose={() => setShowInventory(false)}
          />
        )}
      </AnimatePresence>

      {/* Stash Modal */}
      <AnimatePresence>
        {showStash && (
          <StashModal
            stash={gameState.player.stash}
            isOpen={showStash}
            onClose={() => setShowStash(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;