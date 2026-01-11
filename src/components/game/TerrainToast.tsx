import { TerrainType } from '@/types/game';
import { toast } from '@/hooks/use-toast';

// All terrain effects with descriptions
export const TERRAIN_EFFECTS: Record<TerrainType, { name: string; icon: string; effect: string }> = {
  // Legacy/Generic
  mud: { name: 'Mud', icon: '🟤', effect: 'Costs 2 battery (treads ignore)' },
  toxic: { name: 'Toxic Waste', icon: '☣️', effect: 'Items damaged -5 condition' },
  oil: { name: 'Oil Slick', icon: '🛢️', effect: 'Slid 1 tile further' },
  electric: { name: 'Electric Hazard', icon: '⚡', effect: 'Drained 3 battery' },
  magnetic: { name: 'Magnetic Field', icon: '🧲', effect: 'Heavy items weigh 2x' },
  fog: { name: 'Dense Fog', icon: '🌫️', effect: 'Vision reduced to 1 tile' },
  
  // Nuclear Exclusion Heap
  irradiated: { name: 'Irradiated Ground', icon: '☢️', effect: 'Radiation exposure +1' },
  cooling_trench: { name: 'Cooling Trench', icon: '💧', effect: 'Movement slowed (2 battery)' },
  cratered: { name: 'Cratered Concrete', icon: '🕳️', effect: 'No effect' },
  
  // Neon Slum Electronics Yard
  cable_sprawl: { name: 'Cable Sprawl', icon: '〰️', effect: 'Movement hindered (2 battery)' },
  broken_pavement: { name: 'Broken Pavement', icon: '🔲', effect: 'No effect' },
  neon_pool: { name: 'Neon Pool', icon: '💜', effect: 'Electric interference (2 battery)' },
  
  // Industrial Corpse Zone
  oil_slick: { name: 'Oil-Slick Floor', icon: '🛢️', effect: 'Slipped! Extra movement' },
  assembly_line: { name: 'Assembly Line', icon: '⚙️', effect: 'No effect' },
  collapsed_catwalk: { name: 'Collapsed Catwalk', icon: '🌉', effect: 'Careful navigation (2 battery)' },
  
  // Black Market Bio-Waste Fields
  organic_sludge: { name: 'Organic Sludge', icon: '🟢', effect: 'Slow movement (2 battery)' },
  flesh_mound: { name: 'Flesh-Steel Mound', icon: '🫀', effect: 'No effect' },
  drainage: { name: 'Drainage Channel', icon: '🔳', effect: 'No effect' },
  
  // Cloudfall Data Graveyard
  cooling_fog: { name: 'Cooling Fog Zone', icon: '🌫️', effect: 'Vision reduced to 1 tile' },
  server_rack: { name: 'Server Rack', icon: '🖲️', effect: 'No effect' },
  magnetic_floor: { name: 'Magnetic Floor', icon: '🧲', effect: 'Heavy items weigh 2x' },
};

export function showTerrainToast(terrainType: TerrainType) {
  const terrain = TERRAIN_EFFECTS[terrainType];
  if (!terrain) return;
  
  // Only show toast for terrains with actual effects
  const noEffectTerrains: TerrainType[] = [
    'cratered', 'broken_pavement', 'assembly_line', 'flesh_mound', 'drainage', 'server_rack'
  ];
  
  if (noEffectTerrains.includes(terrainType)) return;
  
  toast({
    title: `${terrain.icon} ${terrain.name}`,
    description: terrain.effect,
    duration: 2000,
  });
}
