import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { BaseScreen } from '@/components/game/BaseScreen';
import { JunkyardScreen } from '@/components/game/JunkyardScreen';
import { InventoryModal } from '@/components/game/InventoryModal';
import { CleaningScreen } from '@/components/game/CleaningScreen';
import { ShopScreen } from '@/components/game/ShopScreen';
import { UpgradesScreen } from '@/components/game/UpgradesScreen';
import { WorkshopScreen } from '@/components/game/WorkshopScreen';
import { AutomationScreen } from '@/components/game/AutomationScreen';
import { StashModal } from '@/components/game/StashModal';
import { ScavengeScreen } from '@/components/game/ScavengeScreen';
import { FoundItemsAlert } from '@/components/game/FoundItemsAlert';
import { showTerrainToast } from '@/components/game/TerrainToast';
import { getBiomeFromSeed } from '@/data/biomes';
import { UPGRADES } from '@/data/upgradeData';
import { TerminalIntroScreen } from '@/components/game/TerminalIntroScreen';

const INTRO_SEEN_KEY = 'junkrunner_intro_seen';

type Screen = 'base' | 'junkyard' | 'cleaning' | 'shop' | 'upgrades' | 'workshop' | 'automation' | 'scavenge';

const Index = () => {
  const {
    gameState,
    isLoading,
    bagItems,
    foundItems,
    setFoundItems,
    lastTerrainType,
    setLastTerrainType,
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
    sellMultipleItems,
    transferToStash,
    purchaseUpgrade,
    installComponent,
    removeComponent,
    craftItem,
    buildFrame,
    getMaxBattery,
    repairComponent,
    getRepairCost,
    resetGame,
    getPileRevealCount,
    getPilePreview,
    shopInventory,
    shopRefreshTime,
    buyShopItem,
    craftCleaningBot,
    toggleCleaningBot,
    updateCleaningBotPriorities,
    fireConsumable,
    loadConsumable,
    unloadConsumable,
    getLoadedConsumables,
    waitTurn,
  } = useGameState();

  // Get launcher info for loadout
  const getLauncherInfo = () => {
    if (!gameState) return { name: 'Launcher', icon: '🎯' };
    const primary = gameState.player.helpers.find(h => h.isPrimary);
    if (!primary?.components.launcher) return { name: 'No Launcher', icon: '❌' };
    return {
      name: primary.components.launcher.name,
      icon: primary.components.launcher.icon,
    };
  };

  // Get consumables from stash
  const getStashConsumables = () => {
    if (!gameState) return [];
    return gameState.player.stash.filter(item => item.category === 'consumable');
  };

  // Show terrain toast when stepping on terrain
  useEffect(() => {
    if (lastTerrainType) {
      // If there's a custom name (damage message), use it as extra info
      const extraMessage = lastTerrainType.name && !lastTerrainType.name.includes('Ground') && !lastTerrainType.name.includes('Floor') 
        ? lastTerrainType.name 
        : undefined;
      showTerrainToast(lastTerrainType.type, extraMessage);
      setLastTerrainType(null);
    }
  }, [lastTerrainType, setLastTerrainType]);

  const [currentScreen, setCurrentScreen] = useState<Screen>('base');
  const [showInventory, setShowInventory] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const handleIntroComplete = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

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
      try {
        localStorage.removeItem(INTRO_SEEN_KEY);
      } catch {
        // Ignore
      }
      setShowIntro(true);
    }
  };

  const currentPile = getCurrentPile();
  const maxCleaningSlots = 1 + gameState.player.baseUpgrades.cleaningSlots;
  const controlCapacity = 1 + gameState.player.baseUpgrades.controlCapacity;
  const maxBattery = getMaxBattery();
  const currentBag = getCurrentBag();
  const junkyardSeed = gameState.infiniteJunkyard?.baseSeed ?? gameState.junkyardSeed ?? Date.now();
  const biome = getBiomeFromSeed(junkyardSeed);

  if (showIntro) {
    return <TerminalIntroScreen onComplete={handleIntroComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="sync" initial={false}>
        {currentScreen === 'base' && (
          <BaseScreen
            key="base"
            gameState={gameState}
            maxBattery={maxBattery}
            currentBag={currentBag}
            bagItemCount={bagItems.length}
            onOpenCleaning={() => setCurrentScreen('cleaning')}
            onOpenSell={() => setCurrentScreen('shop')}
            onOpenUpgrades={() => setCurrentScreen('upgrades')}
            onOpenWorkshop={() => setCurrentScreen('workshop')}
            onOpenAutomation={() => setCurrentScreen('automation')}
            onOpenStash={() => setShowStash(true)}
            onOpenScavenge={() => setCurrentScreen('scavenge')}
            onTransferToStash={transferToStash}
            onRecharge={handleRecharge}
            onResetSave={handleResetSave}
            onInstallComponent={installComponent}
            onRemoveComponent={removeComponent}
          />
        )}

        {currentScreen === 'scavenge' && (
          <ScavengeScreen
            key="scavenge"
            biome={biome}
            seed={junkyardSeed}
            hasActiveJunkyard={gameState.infiniteJunkyard !== null}
            currentBattery={gameState.player.currentCharge}
            maxBattery={maxBattery}
            onEnterJunkyard={handleEnterJunkyard}
            onAbandonJunkyard={handleMoveToNextJunkyard}
            onClose={() => setCurrentScreen('base')}
            loadedConsumables={getLoadedConsumables().consumables}
            launcherCapacity={getLoadedConsumables().capacity}
            stashConsumables={getStashConsumables()}
            onLoadConsumable={loadConsumable}
            onUnloadConsumable={unloadConsumable}
            launcherName={getLauncherInfo().name}
            launcherIcon={getLauncherInfo().icon}
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
            onWait={waitTurn}
            onReturnToBase={handleReturnToBase}
            onOpenInventory={() => setShowInventory(true)}
            pileRevealCount={getPileRevealCount()}
            getPilePreview={getPilePreview}
            loadedConsumables={getLoadedConsumables().consumables}
            launcherCapacity={getLoadedConsumables().capacity}
            onFireConsumable={fireConsumable}
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

        {currentScreen === 'shop' && (
          <ShopScreen
            key="shop"
            stash={gameState.player.stash}
            currency={gameState.player.currency}
            shopInventory={shopInventory}
            shopRefreshTime={shopRefreshTime}
            shopPriceMultiplier={UPGRADES.shopPrices.getValue(gameState.player.baseUpgrades.shopPrices)}
            onSell={sellItem}
            onSellMultiple={sellMultipleItems}
            onBuy={buyShopItem}
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
            onCraftItem={craftItem}
            onBuildFrame={buildFrame}
            onRepairComponent={repairComponent}
            getRepairCost={getRepairCost}
          />
        )}

        {currentScreen === 'automation' && (
          <AutomationScreen
            key="automation"
            currency={gameState.player.currency}
            stash={gameState.player.stash}
            cleaningBot={gameState.player.automation.cleaningBot}
            onClose={() => setCurrentScreen('base')}
            onCraftCleaningBot={craftCleaningBot}
            onToggleCleaningBot={toggleCleaningBot}
            onUpdatePriorities={updateCleaningBotPriorities}
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

      {/* Found Items Alert */}
      <FoundItemsAlert
        items={foundItems}
        open={foundItems.length > 0}
        onClose={() => setFoundItems([])}
      />
    </div>
  );
};

export default Index;