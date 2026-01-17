import { motion } from 'framer-motion';
import { MapPin, Skull, Box, AlertTriangle } from 'lucide-react';
import { Biome, BIOME_ITEMS } from '@/data/biomes';
import { ItemCategory } from '@/types/game';
import { cn } from '@/lib/utils';

// Category display info
const CATEGORY_DISPLAY: Record<ItemCategory, { name: string; icon: string }> = {
  scrap: { name: 'Scrap', icon: '🔩' },
  component: { name: 'Components', icon: '⚙️' },
  battery: { name: 'Batteries', icon: '🔋' },
  storage: { name: 'Storage', icon: '📦' },
  mobility: { name: 'Mobility', icon: '🛞' },
  module: { name: 'Modules', icon: '📡' },
  junk: { name: 'Junk', icon: '🥫' },
  consumable: { name: 'Consumables', icon: '💊' },
  launcher: { name: 'Launchers', icon: '🎯' },
};

interface JunkyardPreviewProps {
  biome: Biome;
  seed: number;
}

// Visual representation of loot chance
function LootBar({ 
  weight, 
  label, 
  icon 
}: { 
  weight: number; 
  label: string; 
  icon: string;
}) {
  const displayWeight = Math.min(weight, 3);
  const percentage = (displayWeight / 3) * 100;
  
  const getBarColor = () => {
    if (weight >= 2) return 'bg-primary';
    if (weight >= 1.2) return 'bg-accent';
    if (weight >= 0.8) return 'bg-muted-foreground';
    return 'bg-muted-foreground/50';
  };
  
  const getLabel = () => {
    if (weight >= 2.5) return 'Abundant';
    if (weight >= 1.8) return 'Common';
    if (weight >= 1.2) return 'Moderate';
    if (weight >= 0.8) return 'Normal';
    if (weight >= 0.5) return 'Scarce';
    return 'Rare';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-6">{icon}</span>
      <span className="text-xs text-muted-foreground w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-14 text-right">
        {getLabel()}
      </span>
    </div>
  );
}

export function JunkyardPreview({ biome, seed }: JunkyardPreviewProps) {
  const categories: ItemCategory[] = ['scrap', 'component', 'battery', 'storage', 'mobility', 'module', 'junk'];
  
  const getEffectiveWeight = (category: ItemCategory) => {
    return biome.categoryWeights[category] ?? 1.0;
  };
  
  const sortedCategories = [...categories].sort((a, b) => 
    getEffectiveWeight(b) - getEffectiveWeight(a)
  );

  const getHazardLevel = () => {
    if (biome.hazardDensity >= 0.20) return { label: 'Dangerous', color: 'text-destructive' };
    if (biome.hazardDensity >= 0.16) return { label: 'Moderate', color: 'text-accent' };
    return { label: 'Low', color: 'text-primary' };
  };
  
  const hazard = getHazardLevel();
  
  // Get biome-specific items for preview
  const biomeItems = BIOME_ITEMS[biome.id] || [];

  return (
    <motion.div
      className="industrial-panel p-4 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{biome.icon}</span>
        <div className="flex-1">
          <h3 className="font-industrial text-foreground">{biome.name}</h3>
          <p className="text-xs text-muted-foreground">{biome.description}</p>
        </div>
      </div>
      
      {/* Theme */}
      <p className="text-xs italic text-muted-foreground mb-3 pl-1 border-l-2 border-primary/30">
        {biome.theme}
      </p>
      
      {/* Quick Stats */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Sector</span>
          <span className="font-mono text-foreground">#{Math.abs(seed % 1000).toString().padStart(3, '0')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Skull className={cn("w-3 h-3", hazard.color)} />
          <span className="text-muted-foreground">Hazards:</span>
          <span className={hazard.color}>{hazard.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Box className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Density:</span>
          <span className="text-foreground">{biome.wallDensity >= 0.14 ? 'Dense' : 'Open'}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Barriers:</span>
          <span className="text-foreground">{biome.barrierDensity >= 0.06 ? 'Common' : 'Few'}</span>
        </div>
      </div>
      
      {/* Terrain Types */}
      <div className="mb-4">
        <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
          Terrain Types
        </p>
        <div className="flex flex-wrap gap-1">
          {biome.terrainTypes.map((terrain) => (
            <span
              key={terrain.type}
              className="px-2 py-1 rounded bg-muted/50 text-[10px] flex items-center gap-1"
              title={terrain.description}
            >
              <span>{terrain.icon}</span>
              <span className="text-muted-foreground">{terrain.name}</span>
            </span>
          ))}
        </div>
      </div>
      
      {/* Barrier Types */}
      <div className="mb-4">
        <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
          Barriers (Soft Gates)
        </p>
        <div className="flex flex-wrap gap-1">
          {biome.barrierTypes.map((barrier) => (
            <span
              key={barrier.type}
              className="px-2 py-1 rounded bg-destructive/10 text-[10px] flex items-center gap-1"
              title={barrier.description}
            >
              <span>{barrier.icon}</span>
              <span className="text-muted-foreground">{barrier.name}</span>
            </span>
          ))}
        </div>
      </div>
      
      {/* Loot Distribution */}
      <div className="space-y-2">
        <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
          Loot Distribution
        </p>
        {sortedCategories.map((category) => (
          <LootBar
            key={category}
            weight={getEffectiveWeight(category)}
            label={CATEGORY_DISPLAY[category].name}
            icon={CATEGORY_DISPLAY[category].icon}
          />
        ))}
      </div>
      
      {/* Biome-Specific Items */}
      {biomeItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
            Unique Finds
          </p>
          <div className="flex flex-wrap gap-1">
            {biomeItems.slice(0, 5).map((item, idx) => {
              const rarityColors: Record<string, string> = {
                common: 'bg-muted text-muted-foreground',
                uncommon: 'bg-primary/20 text-primary',
                rare: 'bg-blue-500/20 text-blue-400',
                epic: 'bg-purple-500/20 text-purple-400',
                legendary: 'bg-amber-500/20 text-amber-400',
              };
              return (
                <span
                  key={idx}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] flex items-center gap-1",
                    rarityColors[item.rarity]
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Rarity Bonuses */}
      {Object.keys(biome.rarityWeights).length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
            Rarity Modifiers
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(biome.rarityWeights).map(([rarity, weight]) => {
              if (weight <= 1) return null;
              const rarityColors: Record<string, string> = {
                common: 'bg-muted text-muted-foreground',
                uncommon: 'bg-primary/20 text-primary',
                rare: 'bg-blue-500/20 text-blue-400',
                epic: 'bg-purple-500/20 text-purple-400',
                legendary: 'bg-amber-500/20 text-amber-400',
              };
              return (
                <span
                  key={rarity}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] uppercase font-industrial",
                    rarityColors[rarity]
                  )}
                >
                  {rarity} +{Math.round((weight - 1) * 100)}%
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
