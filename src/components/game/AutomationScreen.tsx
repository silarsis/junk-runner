import { useState, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { X, Bot, Wrench, Power, PowerOff, GripVertical, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Item, Rarity, ItemCategory, CleaningBot, CleaningBotPriority } from '@/types/game';
import { AUTOMATION_RECIPES, CraftingRecipe, hasIngredients, getMissingIngredients } from '@/data/craftingRecipes';
import { cn } from '@/lib/utils';

interface AutomationScreenProps {
  currency: number;
  stash: Item[];
  cleaningBot: CleaningBot | null;
  onClose: () => void;
  onCraftCleaningBot: () => void;
  onToggleCleaningBot: (active: boolean) => void;
  onUpdatePriorities: (priority: CleaningBotPriority) => void;
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: 'text-muted-foreground' },
  uncommon: { label: 'Uncommon', color: 'text-green-400' },
  rare: { label: 'Rare', color: 'text-blue-400' },
  epic: { label: 'Epic', color: 'text-purple-400' },
  legendary: { label: 'Legendary', color: 'text-amber-400' },
};

const CATEGORY_CONFIG: Record<ItemCategory, { label: string; icon: string }> = {
  scrap: { label: 'Scrap', icon: '🔩' },
  component: { label: 'Component', icon: '⚙️' },
  module: { label: 'Module', icon: '📦' },
  junk: { label: 'Junk', icon: '🗑️' },
  battery: { label: 'Battery', icon: '🔋' },
  mobility: { label: 'Mobility', icon: '⛓️' },
  storage: { label: 'Storage', icon: '🗃️' },
};

const DEFAULT_RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
const DEFAULT_CATEGORY_ORDER: ItemCategory[] = ['component', 'module', 'battery', 'mobility', 'storage', 'scrap', 'junk'];

export function AutomationScreen({
  currency,
  stash,
  cleaningBot,
  onClose,
  onCraftCleaningBot,
  onToggleCleaningBot,
  onUpdatePriorities,
}: AutomationScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [rarityOrder, setRarityOrder] = useState<Rarity[]>(
    cleaningBot?.priority.rarityOrder ?? DEFAULT_RARITY_ORDER
  );
  const [categoryOrder, setCategoryOrder] = useState<ItemCategory[]>(
    cleaningBot?.priority.categoryOrder ?? DEFAULT_CATEGORY_ORDER
  );

  const recipe = AUTOMATION_RECIPES.find(r => r.id === 'automation_cleaning_bot')!;
  const canAfford = currency >= recipe.currencyCost && hasIngredients(stash, recipe.ingredients);
  const hasEnoughMoney = currency >= recipe.currencyCost;
  const missingIngredients = getMissingIngredients(stash, recipe.ingredients);

  const handleSavePriorities = useCallback(() => {
    onUpdatePriorities({ rarityOrder, categoryOrder });
    setShowSettings(false);
  }, [rarityOrder, categoryOrder, onUpdatePriorities]);

  // Bot configuration screen
  if (cleaningBot && showSettings) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-background flex flex-col"
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
      >
        <header className="industrial-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-industrial text-primary">Bot Priorities</h2>
          </div>
          <Button variant="action" size="sm" onClick={handleSavePriorities}>
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </header>

        <main className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* Rarity Priority */}
          <div className="industrial-panel p-4 rounded-lg">
            <h3 className="font-industrial text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Rarity Priority
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Drag to reorder. Items at the top are cleaned first.
            </p>
            <Reorder.Group
              axis="y"
              values={rarityOrder}
              onReorder={setRarityOrder}
              className="space-y-2"
            >
              {rarityOrder.map((rarity, index) => (
                <Reorder.Item
                  key={rarity}
                  value={rarity}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-grab active:cursor-grabbing",
                    "border border-transparent hover:border-primary/30"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground w-6">{index + 1}.</span>
                  <span className={cn("font-industrial", RARITY_CONFIG[rarity].color)}>
                    {RARITY_CONFIG[rarity].label}
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          {/* Category Priority */}
          <div className="industrial-panel p-4 rounded-lg">
            <h3 className="font-industrial text-sm mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Category Priority
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Within the same rarity, items of higher-priority categories are cleaned first.
            </p>
            <Reorder.Group
              axis="y"
              values={categoryOrder}
              onReorder={setCategoryOrder}
              className="space-y-2"
            >
              {categoryOrder.map((category, index) => (
                <Reorder.Item
                  key={category}
                  value={category}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-grab active:cursor-grabbing",
                    "border border-transparent hover:border-primary/30"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground w-6">{index + 1}.</span>
                  <span className="text-lg">{CATEGORY_CONFIG[category].icon}</span>
                  <span className="font-industrial text-foreground">
                    {CATEGORY_CONFIG[category].label}
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
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
        <h2 className="text-xl font-industrial text-primary">Automation</h2>
        <div className="flex items-center gap-4">
          <span className="font-mono text-lg text-primary">¤{currency}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Cleaning Bot Section */}
        <div className="space-y-4">
          <h3 className="font-industrial text-sm text-muted-foreground">CLEANING BOT</h3>

          {cleaningBot ? (
            // Bot is purchased - show status and settings
            <motion.div
              className="industrial-panel p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "text-4xl p-3 rounded-lg",
                  cleaningBot.isActive ? "bg-primary/20" : "bg-muted/30"
                )}>
                  🤖
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-industrial text-lg">Cleaning Bot</h4>
                    <div className="flex items-center gap-2">
                      {cleaningBot.isActive ? (
                        <Power className="w-4 h-4 text-primary" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={cleaningBot.isActive}
                        onCheckedChange={onToggleCleaningBot}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cleaningBot.isActive 
                      ? 'Automatically cleaning items when you return to base'
                      : 'Bot is inactive - toggle to enable auto-cleaning'
                    }
                  </p>

                  {/* Quick priority preview */}
                  <div className="mt-3 p-2 bg-muted/20 rounded text-xs">
                    <span className="text-muted-foreground">Priority: </span>
                    {cleaningBot.priority.rarityOrder.slice(0, 3).map(r => (
                      <span key={r} className={cn("mr-1", RARITY_CONFIG[r].color)}>
                        {RARITY_CONFIG[r].label}
                      </span>
                    ))}
                    <span className="text-muted-foreground">...</span>
                  </div>

                  <Button
                    variant="steel"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowSettings(true)}
                  >
                    <Wrench className="w-4 h-4 mr-1" />
                    Configure Priorities
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Bot not purchased - show craft option
            <motion.div
              className={cn(
                "industrial-panel p-4 rounded-lg",
                canAfford ? "hover:bg-primary/5" : "opacity-70"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{recipe.icon}</span>
                <div className="flex-1">
                  <h4 className="font-industrial">{recipe.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>

                  {/* Ingredients */}
                  <div className="mt-3 space-y-1">
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
                  <div className="flex items-center justify-between mt-4">
                    <span className={cn(
                      "text-lg font-mono",
                      hasEnoughMoney ? "text-primary" : "text-destructive"
                    )}>
                      ¤{recipe.currencyCost}
                    </span>
                    <Button
                      variant="action"
                      disabled={!canAfford}
                      onClick={onCraftCleaningBot}
                    >
                      <Wrench className="w-4 h-4 mr-1" />
                      Build Bot
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Future automation slots hint */}
        <div className="mt-8 text-center py-8 border-2 border-dashed border-muted rounded-lg">
          <span className="text-3xl mb-2 block opacity-30">🔒</span>
          <p className="text-sm text-muted-foreground">More automation bots coming soon...</p>
        </div>
      </main>
    </motion.div>
  );
}
