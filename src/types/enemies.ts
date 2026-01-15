// Enemy behaviour archetypes
export type EnemyBehaviour = 
  | 'wander'      // Random adjacent movement (Glow Rats)
  | 'patrol'      // Fixed route patrol (Rad Stalker, Press Warden)
  | 'chase'       // Direct pursuit of player (Meltdown Husk)
  | 'stationary'  // Doesn't move, zone control (Blackout Node)
  | 'terrain'     // Moves along specific terrain (Wire Crawlers)
  | 'ambush';     // Hidden until triggered (Flesh Crawlers)

// Enemy threat levels
export type ThreatLevel = 'nuisance' | 'moderate' | 'dangerous' | 'deadly';

// Shared enemy archetypes that can be reskinned per biome
export type EnemyArchetype = 
  | 'swarm'           // Glow Rats, Wire Crawlers, Flesh Crawlers
  | 'patrol_drone'    // Rad Stalker, Street Slicer, Press Warden
  | 'zone_controller' // Blackout Node, Growth Spires, Firewall Sentinels
  | 'pursuer'         // Meltdown Husk, Rust Hounds, Linebreaker
  | 'disruptor';      // Isotope Leech, Signal Leeches, Data Wraiths

export interface EnemyDefinition {
  id: string;
  name: string;
  icon: string;
  biomeId: string;
  archetype: EnemyArchetype;
  behaviour: EnemyBehaviour;
  threatLevel: ThreatLevel;
  description: string;
  // Movement
  moveSpeed: number; // Tiles per turn (0 = stationary)
  // Combat/effects
  adjacencyEffect?: string; // What happens when player is adjacent
  // Patrol-specific
  patrolLength?: number; // For patrol behaviour
  // Spawn weight (higher = more common)
  spawnWeight: number;
}

export interface Enemy {
  id: string;
  definitionId: string;
  x: number;
  y: number;
  // Patrol state
  patrolRoute?: { x: number; y: number }[];
  patrolIndex?: number;
  patrolDirection?: 1 | -1; // 1 = forward, -1 = backward
  // State
  isAlerted: boolean;
  turnsStationary: number; // For tracking how long they've been in place
}

// Enemy definitions per biome
export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  // ============ NUCLEAR EXCLUSION HEAP ============
  {
    id: 'glow_rat',
    name: 'Glow Rats',
    icon: '🐀',
    biomeId: 'nuclear',
    archetype: 'swarm',
    behaviour: 'wander',
    threatLevel: 'nuisance',
    description: 'Mutated scavenger rodents glowing faintly. Attracted to dropped items.',
    moveSpeed: 1,
    adjacencyEffect: 'Swarm if ignored',
    spawnWeight: 40,
  },
  {
    id: 'rad_stalker',
    name: 'Rad Stalker',
    icon: '🔴',
    biomeId: 'nuclear',
    archetype: 'patrol_drone',
    behaviour: 'patrol',
    threatLevel: 'moderate',
    description: 'Former security drones warped by radiation. Patrol fixed routes.',
    moveSpeed: 1,
    patrolLength: 4,
    adjacencyEffect: 'Radiation burst if adjacent for 2+ turns',
    spawnWeight: 25,
  },
  {
    id: 'isotope_leech',
    name: 'Isotope Leech',
    icon: '🦠',
    biomeId: 'nuclear',
    archetype: 'disruptor',
    behaviour: 'chase',
    threatLevel: 'moderate',
    description: 'Semi-organic mass that feeds on energy sources. Drains helper effectiveness.',
    moveSpeed: 1,
    adjacencyEffect: 'Drains 2 battery per turn',
    spawnWeight: 15,
  },
  {
    id: 'meltdown_husk',
    name: 'Meltdown Husk',
    icon: '☠️',
    biomeId: 'nuclear',
    archetype: 'pursuer',
    behaviour: 'chase',
    threatLevel: 'deadly',
    description: 'Heavily irradiated humanoid. Slow but extremely dangerous if adjacent.',
    moveSpeed: 0.5, // Moves every other turn
    adjacencyEffect: 'Extreme radiation damage',
    spawnWeight: 5,
  },

  // ============ NEON SLUM ELECTRONICS YARD ============
  {
    id: 'wire_crawler',
    name: 'Wire Crawlers',
    icon: '🕷️',
    biomeId: 'neon_slum',
    archetype: 'swarm',
    behaviour: 'terrain',
    threatLevel: 'nuisance',
    description: 'Autonomous cable bundles. Move along cable terrain, entangle to slow.',
    moveSpeed: 1,
    adjacencyEffect: 'Entangle: -1 movement next turn',
    spawnWeight: 40,
  },
  {
    id: 'signal_leech',
    name: 'Signal Leeches',
    icon: '📡',
    biomeId: 'neon_slum',
    archetype: 'disruptor',
    behaviour: 'chase',
    threatLevel: 'moderate',
    description: 'Small flying drones feeding on EM signals. Reduce scan radius.',
    moveSpeed: 1,
    adjacencyEffect: 'Reduces scan radius to 0',
    spawnWeight: 20,
  },
  {
    id: 'neon_jackal',
    name: 'Neon Jackals',
    icon: '🐕',
    biomeId: 'neon_slum',
    archetype: 'swarm',
    behaviour: 'chase',
    threatLevel: 'moderate',
    description: 'Augmented street animals. Pack hunters that surround and block movement.',
    moveSpeed: 1,
    adjacencyEffect: 'Block adjacent tiles',
    spawnWeight: 25,
  },
  {
    id: 'blackout_node',
    name: 'Blackout Node',
    icon: '⚫',
    biomeId: 'neon_slum',
    archetype: 'zone_controller',
    behaviour: 'stationary',
    threatLevel: 'dangerous',
    description: 'Stationary power hub emitting electric fields. Disables helpers temporarily.',
    moveSpeed: 0,
    adjacencyEffect: 'Disables helper for 3 turns',
    spawnWeight: 10,
  },

  // ============ INDUSTRIAL CORPSE ZONE ============
  {
    id: 'press_warden',
    name: 'Press Warden',
    icon: '🤖',
    biomeId: 'industrial',
    archetype: 'patrol_drone',
    behaviour: 'patrol',
    threatLevel: 'dangerous',
    description: 'Autonomous factory supervisor. High damage in narrow spaces.',
    moveSpeed: 1,
    patrolLength: 5,
    adjacencyEffect: 'Heavy mechanical damage',
    spawnWeight: 20,
  },
  {
    id: 'clamp_beast',
    name: 'Clamp Beast',
    icon: '🦀',
    biomeId: 'industrial',
    archetype: 'zone_controller',
    behaviour: 'stationary',
    threatLevel: 'moderate',
    description: 'Heavy mechanical quadruped guarding areas. Immobilizes on contact.',
    moveSpeed: 0,
    adjacencyEffect: 'Immobilize for 2 turns',
    spawnWeight: 25,
  },
  {
    id: 'rust_hound',
    name: 'Rust Hounds',
    icon: '🐺',
    biomeId: 'industrial',
    archetype: 'pursuer',
    behaviour: 'chase',
    threatLevel: 'moderate',
    description: 'Semi-organic maintenance bots gone feral. Track player scent.',
    moveSpeed: 1,
    adjacencyEffect: 'Bite damage, tracks recent path',
    spawnWeight: 30,
  },
  {
    id: 'linebreaker',
    name: 'Linebreaker Unit',
    icon: '🚜',
    biomeId: 'industrial',
    archetype: 'pursuer',
    behaviour: 'chase',
    threatLevel: 'deadly',
    description: 'Massive industrial machine. Slow, unstoppable, crushes everything.',
    moveSpeed: 0.5,
    adjacencyEffect: 'Instant crush - return to base',
    spawnWeight: 5,
  },

  // ============ BLACK MARKET BIO-WASTE FIELDS ============
  {
    id: 'flesh_crawler',
    name: 'Flesh Crawlers',
    icon: '🪱',
    biomeId: 'biowaste',
    archetype: 'swarm',
    behaviour: 'ambush',
    threatLevel: 'moderate',
    description: 'Malformed biotech rejects lurking in sludge. Ambush careless players.',
    moveSpeed: 1,
    adjacencyEffect: 'Surprise attack, condition damage',
    spawnWeight: 35,
  },
  {
    id: 'growth_spire',
    name: 'Growth Spire',
    icon: '🌵',
    biomeId: 'biowaste',
    archetype: 'zone_controller',
    behaviour: 'stationary',
    threatLevel: 'dangerous',
    description: 'Stationary organic tower spawning smaller enemies over time.',
    moveSpeed: 0,
    adjacencyEffect: 'Spawns flesh crawlers every 5 turns',
    spawnWeight: 10,
  },
  {
    id: 'bio_collector',
    name: 'Bio-Collector',
    icon: '💉',
    biomeId: 'biowaste',
    archetype: 'disruptor',
    behaviour: 'chase',
    threatLevel: 'moderate',
    description: 'Autonomous medical harvester. Steals items or helper components.',
    moveSpeed: 1,
    adjacencyEffect: 'Steal random item from bag',
    spawnWeight: 20,
  },
  {
    id: 'plague_walker',
    name: 'Plague Walker',
    icon: '🧟',
    biomeId: 'biowaste',
    archetype: 'pursuer',
    behaviour: 'chase',
    threatLevel: 'deadly',
    description: 'Slow, spreading contamination. Leaves corrupted tiles behind.',
    moveSpeed: 0.5,
    adjacencyEffect: 'Infection - lose 1 item condition per turn',
    spawnWeight: 8,
  },

  // ============ CLOUDFALL DATA GRAVEYARD ============
  {
    id: 'firewall_sentinel',
    name: 'Firewall Sentinel',
    icon: '🛡️',
    biomeId: 'cloudfall',
    archetype: 'zone_controller',
    behaviour: 'stationary',
    threatLevel: 'moderate',
    description: 'Stationary digital-physical hybrid. Controls zone access.',
    moveSpeed: 0,
    adjacencyEffect: 'Tile lockdown - needs bypass tool',
    spawnWeight: 25,
  },
  {
    id: 'data_wraith',
    name: 'Data Wraith',
    icon: '👻',
    biomeId: 'cloudfall',
    archetype: 'disruptor',
    behaviour: 'wander',
    threatLevel: 'moderate',
    description: 'Corrupted AI fragments teleporting unpredictably. Disable inventory slots.',
    moveSpeed: 1,
    adjacencyEffect: 'Disable 1 inventory slot for 5 turns',
    spawnWeight: 20,
  },
  {
    id: 'magnet_crawler',
    name: 'Magnet Crawlers',
    icon: '🧲',
    biomeId: 'cloudfall',
    archetype: 'swarm',
    behaviour: 'chase',
    threatLevel: 'nuisance',
    description: 'Insectoid machines attracted to metal-heavy loadouts.',
    moveSpeed: 1,
    adjacencyEffect: 'Pull items from helpers',
    spawnWeight: 35,
  },
  {
    id: 'archive_keeper',
    name: 'Archive Keeper',
    icon: '📚',
    biomeId: 'cloudfall',
    archetype: 'zone_controller',
    behaviour: 'stationary',
    threatLevel: 'deadly',
    description: 'Old corporate guardian protecting high-value nodes. Extreme defense.',
    moveSpeed: 0,
    adjacencyEffect: 'Blocks access to loot nodes',
    spawnWeight: 5,
  },
];

// Helper to get enemy definitions for a specific biome
export function getEnemyDefinitionsForBiome(biomeId: string): EnemyDefinition[] {
  return ENEMY_DEFINITIONS.filter(def => def.biomeId === biomeId);
}

// Helper to get a specific enemy definition
export function getEnemyDefinition(definitionId: string): EnemyDefinition | undefined {
  return ENEMY_DEFINITIONS.find(def => def.id === definitionId);
}
