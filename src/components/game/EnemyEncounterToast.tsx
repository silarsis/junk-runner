import { toast } from '@/hooks/use-toast';
import { ThreatLevel, EnemyDefinition } from '@/types/enemies';

// Visual configuration per threat level
const THREAT_COLORS: Record<ThreatLevel, { bg: string; border: string }> = {
  nuisance: { bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
  moderate: { bg: 'bg-orange-500/20', border: 'border-orange-500' },
  dangerous: { bg: 'bg-red-500/20', border: 'border-red-500' },
  deadly: { bg: 'bg-red-700/20', border: 'border-red-700' },
};

const THREAT_TITLES: Record<ThreatLevel, string> = {
  nuisance: '⚠️ Minor Threat',
  moderate: '🔶 Moderate Threat',
  dangerous: '🔴 Danger!',
  deadly: '☠️ DEADLY ENCOUNTER!',
};

export interface EnemyEffect {
  type: 'collision' | 'adjacency' | 'zone';
  definition: EnemyDefinition;
  batteryDrain?: number;
  itemDamage?: number;
  helperDamage?: number;
  forcedReturn?: boolean;
  message?: string;
}

// Parse adjacency effect string to determine actual effect
export function parseAdjacencyEffect(effect: string | undefined): {
  batteryDrain: number;
  itemDamage: number;
  helperDamage: number;
  turnsRequired: number;
  description: string;
} {
  if (!effect) {
    return { batteryDrain: 0, itemDamage: 0, helperDamage: 0, turnsRequired: 0, description: '' };
  }
  
  const lowerEffect = effect.toLowerCase();
  let batteryDrain = 0;
  let itemDamage = 0;
  let helperDamage = 0;
  let turnsRequired = 0;
  
  // Parse battery drain amounts
  if (lowerEffect.includes('drains')) {
    const match = effect.match(/(\d+)\s*battery/i);
    batteryDrain = match ? parseInt(match[1]) : 2;
  }
  
  // Parse damage effects
  if (lowerEffect.includes('damage') || lowerEffect.includes('burst')) {
    const match = effect.match(/(\d+)/);
    helperDamage = match ? parseInt(match[1]) * 5 : 10;
  }
  
  // Parse item stealing/damage
  if (lowerEffect.includes('steal') || lowerEffect.includes('corrupt')) {
    itemDamage = 15;
  }
  
  // Parse turn requirements (e.g., "2+ turns")
  const turnMatch = effect.match(/(\d+)\+?\s*turns?/i);
  if (turnMatch) {
    turnsRequired = parseInt(turnMatch[1]);
  }
  
  return { batteryDrain, itemDamage, helperDamage, turnsRequired, description: effect };
}

// Show enemy encounter toast
export function showEnemyEncounterToast(effect: EnemyEffect): void {
  const { definition } = effect;
  const threatConfig = THREAT_TITLES[definition.threatLevel];
  
  let description = `${definition.icon} ${definition.name}`;
  
  if (effect.type === 'collision') {
    description += ' - Direct contact!';
  } else if (effect.type === 'adjacency') {
    description += ' is nearby!';
  }
  
  const effectParts: string[] = [];
  
  if (effect.batteryDrain && effect.batteryDrain > 0) {
    effectParts.push(`-${effect.batteryDrain} battery`);
  }
  if (effect.itemDamage && effect.itemDamage > 0) {
    effectParts.push(`-${effect.itemDamage}% item condition`);
  }
  if (effect.helperDamage && effect.helperDamage > 0) {
    effectParts.push(`-${effect.helperDamage}% component condition`);
  }
  if (effect.forcedReturn) {
    effectParts.push('Forced to return to base!');
  }
  
  if (effectParts.length > 0) {
    description += '\n' + effectParts.join(' | ');
  }
  
  if (effect.message) {
    description += '\n' + effect.message;
  }
  
  toast({
    title: threatConfig,
    description,
    variant: definition.threatLevel === 'deadly' ? 'destructive' : 'default',
    duration: definition.threatLevel === 'deadly' ? 5000 : 3000,
  });
}

// Show adjacency warning toast (lighter version for continuous effects)
export function showAdjacencyWarningToast(enemies: { definition: EnemyDefinition; batteryDrain: number }[]): void {
  if (enemies.length === 0) return;
  
  const totalDrain = enemies.reduce((sum, e) => sum + e.batteryDrain, 0);
  const names = enemies.map(e => `${e.definition.icon} ${e.definition.name}`).join(', ');
  
  toast({
    title: '⚡ Energy Drain',
    description: `${names} draining -${totalDrain} battery!`,
    duration: 2000,
  });
}

// Calculate effects from collision based on threat level
export function getCollisionEffects(definition: EnemyDefinition): EnemyEffect {
  const baseEffect: EnemyEffect = {
    type: 'collision',
    definition,
    batteryDrain: 0,
    itemDamage: 0,
    helperDamage: 0,
    forcedReturn: false,
  };
  
  switch (definition.threatLevel) {
    case 'nuisance':
      baseEffect.batteryDrain = 1;
      baseEffect.message = 'Scattered but unharmed';
      break;
    case 'moderate':
      baseEffect.batteryDrain = 3;
      baseEffect.helperDamage = 5;
      baseEffect.message = 'Components took minor damage';
      break;
    case 'dangerous':
      baseEffect.batteryDrain = 5;
      baseEffect.helperDamage = 15;
      baseEffect.itemDamage = 10;
      baseEffect.message = 'Significant damage sustained!';
      break;
    case 'deadly':
      baseEffect.batteryDrain = 999; // Drain all
      baseEffect.helperDamage = 25;
      baseEffect.itemDamage = 20;
      baseEffect.forcedReturn = true;
      baseEffect.message = 'CRITICAL DAMAGE! Forced retreat!';
      break;
  }
  
  // Override with specific adjacency effects if they indicate special behavior
  const parsed = parseAdjacencyEffect(definition.adjacencyEffect);
  if (parsed.batteryDrain > 0) {
    baseEffect.batteryDrain = Math.max(baseEffect.batteryDrain, parsed.batteryDrain * 2); // Double for collision
  }
  
  return baseEffect;
}

// Calculate effects from being adjacent to enemy
export function getAdjacencyEffects(definition: EnemyDefinition, turnsAdjacent: number = 1): EnemyEffect {
  const parsed = parseAdjacencyEffect(definition.adjacencyEffect);
  
  const baseEffect: EnemyEffect = {
    type: 'adjacency',
    definition,
    batteryDrain: 0,
    itemDamage: 0,
    helperDamage: 0,
    forcedReturn: false,
  };
  
  // Check if turn requirement is met
  if (parsed.turnsRequired > 0 && turnsAdjacent < parsed.turnsRequired) {
    // Warning only, no effect yet
    baseEffect.message = `${parsed.turnsRequired - turnsAdjacent} more turn(s) until effect triggers`;
    return baseEffect;
  }
  
  // Apply parsed effects
  baseEffect.batteryDrain = parsed.batteryDrain;
  baseEffect.helperDamage = parsed.helperDamage;
  baseEffect.itemDamage = parsed.itemDamage;
  
  // Additional effects based on threat level if no specific effect defined
  if (parsed.batteryDrain === 0 && parsed.helperDamage === 0 && parsed.itemDamage === 0) {
    switch (definition.threatLevel) {
      case 'nuisance':
        baseEffect.batteryDrain = 0; // Nuisance enemies don't drain by default
        break;
      case 'moderate':
        baseEffect.batteryDrain = 1;
        break;
      case 'dangerous':
        baseEffect.batteryDrain = 2;
        break;
      case 'deadly':
        baseEffect.batteryDrain = 5;
        baseEffect.helperDamage = 5;
        break;
    }
  }
  
  return baseEffect;
}
