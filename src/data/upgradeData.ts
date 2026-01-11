import { FrameType, FrameSlots } from '@/types/game';

export interface UpgradeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  getCost: (level: number) => number;
  getValue: (level: number) => number;
}

export const UPGRADES: Record<string, UpgradeInfo> = {
  cleaningSlots: {
    id: 'cleaningSlots',
    name: 'Cleaning Slots',
    description: 'Add more cleaning stations',
    icon: '🧹',
    maxLevel: 4,
    getCost: (level) => 200 * Math.pow(2, level),
    getValue: (level) => 1 + level, // starts at 1, max 5
  },
  cleaningSpeed: {
    id: 'cleaningSpeed',
    name: 'Cleaning Speed',
    description: 'Faster cleaning time',
    icon: '⚡',
    maxLevel: 5,
    getCost: (level) => 150 * (level + 1),
    getValue: (level) => 1 + (level * 0.2), // 1.0, 1.2, 1.4, etc.
  },
  workshopTier: {
    id: 'workshopTier',
    name: 'Workshop Tier',
    description: 'Work with higher rarity items',
    icon: '🔧',
    maxLevel: 4,
    getCost: (level) => 500 * Math.pow(2, level),
    getValue: (level) => level + 1,
  },
  controlCapacity: {
    id: 'controlCapacity',
    name: 'Control Capacity',
    description: 'Deploy more helper robots',
    icon: '🤖',
    maxLevel: 3,
    getCost: (level) => 300 * Math.pow(2, level),
    getValue: (level) => 1 + level, // starts at 1, max 4
  },
};

export interface HelperFrameInfo {
  id: FrameType;
  name: string;
  slots: FrameSlots;
  icon: string;
  cost: number;
  requiredComponents: string[];
}

export const HELPER_FRAMES: Record<FrameType, HelperFrameInfo> = {
  basic: {
    id: 'basic',
    name: 'Basic Frame',
    slots: {
      mobilitySlots: 1,
      moduleSlots: 1,
      batterySlots: 1,
    },
    icon: '🤖',
    cost: 0,
    requiredComponents: [],
  },
  crawler: {
    id: 'crawler',
    name: 'Crawler Frame',
    slots: {
      mobilitySlots: 1,
      moduleSlots: 2,
      batterySlots: 1,
    },
    icon: '🐛',
    cost: 200,
    requiredComponents: ['Motor Unit', 'Steel Plate'],
  },
  scout: {
    id: 'scout',
    name: 'Scout Frame',
    slots: {
      mobilitySlots: 1,
      moduleSlots: 3,
      batterySlots: 2,
    },
    icon: '🔭',
    cost: 300,
    requiredComponents: ['Circuit Board', 'Power Cell'],
  },
};