import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Wrench, Battery, Plus, Trash2, ArrowLeft, Cog, Package, Zap, SunMedium, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelperRobot, Item, BASIC_BATTERY_CAPACITY, Rarity } from '@/types/game';
import { HELPER_FRAMES } from '@/data/upgradeData';
import { 
  ALL_RECIPES, 
  CraftingRecipe, 
  hasIngredients, 
  getMissingIngredients,
  FRAME_RECIPES,
  BATTERY_RECIPES,
  STORAGE_RECIPES,
  MOBILITY_RECIPES,
  MODULE_RECIPES,
} from '@/data/craftingRecipes';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface WorkshopScreenProps {
  helpers: HelperRobot[];
  controlCapacity: number;
  currency: number;
  stash: Item[];
  onClose: () => void;
  onInstallComponent: (helperId: string, slotType: 'mobility' | 'battery' | 'module', item: Item, moduleIndex?: number) => void;
  onRemoveComponent: (helperId: string, slotType: 'mobility' | 'battery' | 'module', moduleIndex?: number) => void;
  onCraftItem?: (recipe: CraftingRecipe) => void;
  onBuildFrame?: (frameType: string) => void;
  onRepairComponent?: (helperId: string, slotType: 'mobility' | 'battery' | 'module', moduleIndex?: number) => void;
  getRepairCost?: (component: Item) => number;
}

type SlotType = 'mobility' | 'battery' | 'module';
type WorkshopSection = 'main' | 'robots' | 'frames' | 'battery' | 'storage' | 'mobility' | 'modules' | 'repairs';

// Scrap name used for repairs
const REPAIR_SCRAP_NAME = 'Rusty Bolt';

const SECTION_CONFIG: Record<WorkshopSection, { title: string; icon: React.ReactNode; recipes?: CraftingRecipe[] }> = {
  main: { title: 'Workshop', icon: <Wrench className="w-5 h-5" /> },
  robots: { title: 'Your Robots', icon: <Bot className="w-5 h-5" /> },
  repairs: { title: 'Repairs', icon: <Wrench className="w-5 h-5" /> },
  frames: { title: 'Robot Frames', icon: <Bot className="w-5 h-5" />, recipes: FRAME_RECIPES },
  battery: { title: 'Batteries', icon: <Battery className="w-5 h-5" />, recipes: BATTERY_RECIPES },
  storage: { title: 'Storage Modules', icon: <Package className="w-5 h-5" />, recipes: STORAGE_RECIPES },
  mobility: { title: 'Mobility Modules', icon: <Cog className="w-5 h-5" />, recipes: MOBILITY_RECIPES },
  modules: { title: 'Utility Modules', icon: <SunMedium className="w-5 h-5" />, recipes: MODULE_RECIPES },
};

export function WorkshopScreen({
  helpers,
  controlCapacity,
  currency,
  stash,
  onClose,
  onInstallComponent,
  onRemoveComponent,
  onCraftItem,
  onBuildFrame,
  onRepairComponent,
  getRepairCost,
}: WorkshopScreenProps) {
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<{ type: SlotType; index?: number } | null>(null);
  const [currentSection, setCurrentSection] = useState<WorkshopSection>('main');
  
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

  const canAfford = (recipe: CraftingRecipe) => {
    return currency >= recipe.currencyCost && hasIngredients(stash, recipe.ingredients);
  };

  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canAfford(recipe)) return;
    
    if (recipe.category === 'frame' && onBuildFrame) {
      // Extract frame type from recipe id (e.g., 'frame_basic' -> 'basic')
      const frameType = recipe.id.replace('frame_', '');
      onBuildFrame(frameType);
    } else if (onCraftItem) {
      onCraftItem(recipe);
    }
  };

  // Recipe card component
  const RecipeCard = ({ recipe }: { recipe: CraftingRecipe }) => {
    const affordable = canAfford(recipe);
    const missing = getMissingIngredients(stash, recipe.ingredients);
    const hasEnoughMoney = currency >= recipe.currencyCost;
    
    return (
      <motion.div
        className={cn(
          "industrial-panel p-4 rounded-lg",
          affordable ? "hover:bg-primary/5" : "opacity-60"
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">{recipe.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-industrial text-sm">{recipe.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{recipe.description}</p>
            
            {/* Ingredients */}
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Required:</p>
              <div className="flex flex-wrap gap-1">
                {recipe.ingredients.map((ing, idx) => {
                  const have = stash.filter(i => i.name === ing.name).length;
                  const enough = have >= ing.quantity;
                  return (
                    <span 
                      key={idx}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        enough ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                      )}
                    >
                      {ing.name} ({have}/{ing.quantity})
                    </span>
                  );
                })}
              </div>
            </div>
            
            {/* Cost and craft button */}
            <div className="flex items-center justify-between mt-3">
              <span className={cn(
                "text-sm font-mono",
                hasEnoughMoney ? "text-primary" : "text-destructive"
              )}>
                ¤{recipe.currencyCost}
              </span>
              <Button
                variant="steel"
                size="sm"
                disabled={!affordable}
                onClick={() => handleCraft(recipe)}
              >
                <Wrench className="w-3 h-3 mr-1" />
                Craft
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Category section view
  const renderCategorySection = () => {
    const config = SECTION_CONFIG[currentSection];
    if (!config.recipes) return null;
    
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
            <Button variant="ghost" size="icon" onClick={() => setCurrentSection('main')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {config.icon}
              <h2 className="text-xl font-industrial text-primary">{config.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-primary">¤{currency}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {config.recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </main>
      </motion.div>
    );
  };

  // Robots list view
  const renderRobotsSection = () => {
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
            <Button variant="ghost" size="icon" onClick={() => setCurrentSection('main')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h2 className="text-xl font-industrial text-primary">Your Robots</h2>
            </div>
          </div>
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
                <span className="text-sm text-muted-foreground">Robot Capacity</span>
              </div>
              <span className="font-mono text-lg">
                {helpers.length}/{controlCapacity}
              </span>
            </div>
          </div>

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
        </main>
      </motion.div>
    );
  };

  // Get all damaged components across all helpers
  const getDamagedComponents = () => {
    const damaged: Array<{
      helper: HelperRobot;
      component: Item;
      slotType: 'mobility' | 'battery' | 'module';
      moduleIndex?: number;
    }> = [];
    
    helpers.forEach(helper => {
      if (helper.components.mobility && helper.components.mobility.condition < 100) {
        damaged.push({ helper, component: helper.components.mobility, slotType: 'mobility' });
      }
      if (helper.components.battery && helper.components.battery.condition < 100) {
        damaged.push({ helper, component: helper.components.battery, slotType: 'battery' });
      }
      helper.components.modules.forEach((module, idx) => {
        if (module && module.condition < 100) {
          damaged.push({ helper, component: module, slotType: 'module', moduleIndex: idx });
        }
      });
    });
    
    return damaged;
  };

  const damagedComponents = getDamagedComponents();
  const scrapCount = stash.filter(i => i.name === REPAIR_SCRAP_NAME).length;

  // Repairs section view
  const renderRepairsSection = () => {
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
            <Button variant="ghost" size="icon" onClick={() => setCurrentSection('main')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              <h2 className="text-xl font-industrial text-primary">Repairs</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Scrap inventory */}
          <div className="mb-6 p-4 industrial-panel rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔩</span>
                <span className="text-sm text-muted-foreground">Available Scrap</span>
              </div>
              <span className="font-mono text-lg">{scrapCount} {REPAIR_SCRAP_NAME}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Repairs cost 1 scrap per 10% condition restored
            </p>
          </div>

          {damagedComponents.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">✅</span>
              <p className="text-muted-foreground">All components in perfect condition!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {damagedComponents.map((item, idx) => {
                const frame = HELPER_FRAMES[item.helper.frameId];
                const repairCost = getRepairCost?.(item.component) ?? 0;
                const canRepair = scrapCount >= repairCost && onRepairComponent;
                const isBroken = item.component.condition === 0;
                
                return (
                  <motion.div
                    key={`${item.helper.id}-${item.slotType}-${item.moduleIndex ?? 0}`}
                    className={cn(
                      "industrial-panel p-4 rounded-lg",
                      isBroken && "ring-2 ring-destructive"
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.component.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-industrial">{item.component.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {frame.name} • {item.slotType}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                item.component.condition > 50 ? "bg-primary" :
                                item.component.condition > 20 ? "bg-yellow-500" : "bg-destructive"
                              )}
                              style={{ width: `${item.component.condition}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-xs font-mono",
                            isBroken ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {item.component.condition}%
                          </span>
                        </div>
                        {isBroken && (
                          <span className="text-xs text-destructive font-bold mt-1 block">
                            ⚠️ BROKEN - Cannot be used!
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xs",
                          canRepair ? "text-muted-foreground" : "text-destructive"
                        )}>
                          Cost: {repairCost} 🔩
                        </p>
                        <Button
                          variant="steel"
                          size="sm"
                          className="mt-1"
                          disabled={!canRepair}
                          onClick={() => onRepairComponent?.(item.helper.id, item.slotType, item.moduleIndex)}
                        >
                          <Wrench className="w-3 h-3 mr-1" />
                          Repair
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </motion.div>
    );
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
              
              {/* Add module button - show if empty slots OR if only basic modules installed */}
              {getAvailableItems('module').length > 0 && (
                <Button
                  variant="outline"
                  className="w-full h-16"
                  onClick={() => {
                    // If at capacity but has basic module, replace the first basic one
                    if (modules.length >= frame.slots.moduleSlots) {
                      const basicIdx = modules.findIndex(m => isBasicComponent(m));
                      if (basicIdx >= 0) {
                        setSelectingSlot({ type: 'module', index: basicIdx });
                        return;
                      }
                    }
                    setSelectingSlot({ type: 'module', index: modules.length });
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" /> 
                  {modules.length >= frame.slots.moduleSlots && modules.some(m => isBasicComponent(m))
                    ? 'Replace Basic Storage'
                    : 'Add Module'}
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

  // Category section views
  if (currentSection === 'robots') {
    return renderRobotsSection();
  }
  
  if (currentSection === 'repairs') {
    return renderRepairsSection();
  }
  
  if (currentSection !== 'main') {
    return renderCategorySection();
  }

  // Main workshop menu
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-industrial text-primary">Workshop</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-primary">¤{currency}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Robot Status */}
        <div className="mb-6 p-4 industrial-panel rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Active Robots</span>
            </div>
            <span className="font-mono text-lg">
              {helpers.length}/{controlCapacity}
            </span>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="space-y-2">
          {/* Your Robots */}
          <motion.button
            onClick={() => setCurrentSection('robots')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-primary" />
              <div className="text-left">
                <h3 className="font-industrial">Your Robots</h3>
                <p className="text-xs text-muted-foreground">Manage and engineer your robots</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{helpers.length}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </motion.button>

          {/* Repairs */}
          <motion.button
            onClick={() => setCurrentSection('repairs')}
            className={cn(
              "w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors",
              damagedComponents.length > 0 && "ring-1 ring-yellow-500/50"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <div className="text-left">
                <h3 className="font-industrial">Repairs</h3>
                <p className="text-xs text-muted-foreground">Fix damaged components</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {damagedComponents.length > 0 && (
                <span className="text-sm text-yellow-500">{damagedComponents.length} damaged</span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </motion.button>

          <div className="h-px bg-border my-4" />
          <p className="text-xs text-muted-foreground mb-2 px-1">BUILD NEW</p>

          {/* Frames */}
          <motion.button
            onClick={() => setCurrentSection('frames')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <h3 className="font-industrial">Robot Frames</h3>
                <p className="text-xs text-muted-foreground">Build new robot chassis</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Battery */}
          <motion.button
            onClick={() => setCurrentSection('battery')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔋</span>
              <div className="text-left">
                <h3 className="font-industrial">Batteries</h3>
                <p className="text-xs text-muted-foreground">Power cells for your robots</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Storage */}
          <motion.button
            onClick={() => setCurrentSection('storage')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div className="text-left">
                <h3 className="font-industrial">Storage Modules</h3>
                <p className="text-xs text-muted-foreground">Expand carrying capacity</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Mobility */}
          <motion.button
            onClick={() => setCurrentSection('mobility')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛞</span>
              <div className="text-left">
                <h3 className="font-industrial">Mobility Modules</h3>
                <p className="text-xs text-muted-foreground">Movement systems for traversal</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Utility Modules */}
          <motion.button
            onClick={() => setCurrentSection('modules')}
            className="w-full industrial-panel p-4 rounded-lg flex items-center justify-between hover:bg-primary/5 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">☀️</span>
              <div className="text-left">
                <h3 className="font-industrial">Utility Modules</h3>
                <p className="text-xs text-muted-foreground">Solar, scanner, cleaning assist</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </main>
    </motion.div>
  );
}
