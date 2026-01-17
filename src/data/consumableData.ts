// Consumable counter items for neutralizing enemies
// These are loaded into launcher modules and fired during junkyard exploration

export type ConsumableType = 
  | 'emp_grenade'
  | 'bait_canister'
  | 'cryo_spray'
  | 'sonic_pulse'
  | 'thermal_cloak'
  | 'data_spike'
  | 'degausser'
  | 'neutralizer_foam'
  | 'flash_flare'
  | 'holographic_decoy';

export interface ConsumableDefinition {
  id: ConsumableType;
  name: string;
  icon: string;
  description: string;
  effect: string;
  countersEnemies: string[]; // Enemy definition IDs
}

export const CONSUMABLE_DEFINITIONS: ConsumableDefinition[] = [
  {
    id: 'emp_grenade',
    name: 'EMP Grenade',
    icon: '⚡',
    description: 'Electromagnetic pulse that disables electronic enemies',
    effect: 'Stuns mechanical enemies for 3 turns',
    countersEnemies: ['rad_stalker', 'press_warden', 'blackout_node', 'firewall_sentinel'],
  },
  {
    id: 'bait_canister',
    name: 'Bait Canister',
    icon: '🥩',
    description: 'Organic attractant that lures biological enemies',
    effect: 'Draws organic enemies away for 5 turns',
    countersEnemies: ['glow_rat', 'flesh_crawler', 'rust_hound', 'neon_jackal'],
  },
  {
    id: 'cryo_spray',
    name: 'Cryo Spray',
    icon: '❄️',
    description: 'Freezing compound that immobilizes targets',
    effect: 'Freezes target in place for 4 turns',
    countersEnemies: ['meltdown_husk', 'isotope_leech', 'plague_walker', 'linebreaker'],
  },
  {
    id: 'sonic_pulse',
    name: 'Sonic Pulse',
    icon: '🔊',
    description: 'High-frequency burst that disrupts swarm coordination',
    effect: 'Scatters swarm enemies, reducing threat',
    countersEnemies: ['glow_rat', 'wire_crawler', 'magnet_crawler', 'flesh_crawler'],
  },
  {
    id: 'thermal_cloak',
    name: 'Thermal Cloak',
    icon: '🌡️',
    description: 'Heat-masking field that hides from thermal sensors',
    effect: 'Invisible to chasers for 4 turns',
    countersEnemies: ['rust_hound', 'isotope_leech', 'bio_collector', 'neon_jackal'],
  },
  {
    id: 'data_spike',
    name: 'Data Spike',
    icon: '💾',
    description: 'Corrupted data packet that overloads AI systems',
    effect: 'Corrupts digital enemies, causing malfunction',
    countersEnemies: ['data_wraith', 'archive_keeper', 'signal_leech', 'firewall_sentinel'],
  },
  {
    id: 'degausser',
    name: 'Degausser',
    icon: '🧲',
    description: 'Magnetic field disruptor that confuses magnetic enemies',
    effect: 'Reverses magnetic attraction for 5 turns',
    countersEnemies: ['magnet_crawler', 'blackout_node', 'clamp_beast'],
  },
  {
    id: 'neutralizer_foam',
    name: 'Neutralizer Foam',
    icon: '🫧',
    description: 'Chemical foam that neutralizes biological hazards',
    effect: 'Clears bio-contamination in area',
    countersEnemies: ['growth_spire', 'plague_walker', 'flesh_crawler', 'bio_collector'],
  },
  {
    id: 'flash_flare',
    name: 'Flash Flare',
    icon: '💥',
    description: 'Blinding light burst that disorients enemies',
    effect: 'Blinds enemies in radius for 3 turns',
    countersEnemies: ['data_wraith', 'neon_jackal', 'wire_crawler', 'signal_leech'],
  },
  {
    id: 'holographic_decoy',
    name: 'Holographic Decoy',
    icon: '👤',
    description: 'Projects a fake target that draws enemy attention',
    effect: 'Creates distraction for 6 turns',
    countersEnemies: ['meltdown_husk', 'linebreaker', 'archive_keeper', 'press_warden'],
  },
];

export function getConsumableDefinition(id: ConsumableType): ConsumableDefinition | undefined {
  return CONSUMABLE_DEFINITIONS.find(c => c.id === id);
}

// Launcher module definitions - these go in moduleSlots
export interface LauncherDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  capacity: number; // How many consumables it can hold
}

export const LAUNCHER_DEFINITIONS: LauncherDefinition[] = [
  {
    id: 'launcher_basic',
    name: 'Basic Launcher',
    icon: '🎯',
    description: 'Simple deployment device. Holds 1 consumable.',
    capacity: 1,
  },
  {
    id: 'launcher_compact',
    name: 'Compact Launcher',
    icon: '🔫',
    description: 'Upgraded launcher with dual capacity.',
    capacity: 2,
  },
  {
    id: 'launcher_tactical',
    name: 'Tactical Launcher',
    icon: '🚀',
    description: 'Military-grade launcher. Holds 4 consumables.',
    capacity: 4,
  },
  {
    id: 'launcher_heavy',
    name: 'Heavy Launcher',
    icon: '💣',
    description: 'Maximum capacity launcher. Holds 6 consumables.',
    capacity: 6,
  },
];

export function getLauncherDefinition(id: string): LauncherDefinition | undefined {
  return LAUNCHER_DEFINITIONS.find(l => l.id === id);
}
