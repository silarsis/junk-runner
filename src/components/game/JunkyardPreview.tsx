import { motion } from 'framer-motion';
import { MapPin, Skull, Box } from 'lucide-react';
import { JunkyardType, CATEGORY_DISPLAY } from '@/data/junkyardTypes';
import { ItemCategory } from '@/types/game';
import { cn } from '@/lib/utils';

interface JunkyardPreviewProps {
  junkyardType: JunkyardType;
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
  // Clamp weight display between 0-3 for visual
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

export function JunkyardPreview({ junkyardType, seed }: JunkyardPreviewProps) {
  const categories: ItemCategory[] = ['scrap', 'component', 'battery', 'storage', 'mobility', 'module', 'junk'];
  
  // Calculate effective weights
  const getEffectiveWeight = (category: ItemCategory) => {
    return junkyardType.categoryWeights[category] ?? 1.0;
  };
  
  // Sort categories by weight for better display
  const sortedCategories = [...categories].sort((a, b) => 
    getEffectiveWeight(b) - getEffectiveWeight(a)
  );

  // Hazard level display
  const getHazardLevel = () => {
    if (junkyardType.hazardDensity >= 0.25) return { label: 'Dangerous', color: 'text-destructive' };
    if (junkyardType.hazardDensity >= 0.18) return { label: 'Moderate', color: 'text-accent' };
    return { label: 'Low', color: 'text-primary' };
  };
  
  const hazard = getHazardLevel();

  return (
    <motion.div
      className="industrial-panel p-4 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{junkyardType.icon}</span>
        <div className="flex-1">
          <h3 className="font-industrial text-foreground">{junkyardType.name}</h3>
          <p className="text-xs text-muted-foreground">{junkyardType.description}</p>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs">
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
          <span className="text-foreground">{junkyardType.wallDensity >= 0.18 ? 'Dense' : 'Open'}</span>
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
      
      {/* Rarity Bonuses */}
      {Object.keys(junkyardType.rarityWeights).length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-industrial text-muted-foreground uppercase tracking-wider mb-2">
            Rarity Modifiers
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(junkyardType.rarityWeights).map(([rarity, weight]) => {
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
