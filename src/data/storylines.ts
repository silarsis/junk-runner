// Storyline definitions. Each storyline is 5-10 steps. Players find a unique
// "story item" in a junkyard, then on returning to base an email arrives
// advancing the story. The final step grants a reward.

import { Item } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

export type StoryReward =
  | { type: 'currency'; amount: number }
  | { type: 'upgrade'; upgradeId: 'cleaningSlots' | 'cleaningSpeed' | 'workshopTier' | 'controlCapacity' | 'chargerEfficiency'; levels: number }
  | { type: 'module'; item: Omit<Item, 'id'> };

export interface StoryStep {
  itemName: string;
  itemIcon: string;
  emailFrom: string;
  emailSubject: string;
  emailBody: string;
}

export interface Storyline {
  id: string;
  title: string;
  description: string;
  steps: StoryStep[];
  reward: StoryReward;
  rewardEmail: {
    from: string;
    subject: string;
    body: string;
  };
}

export const STORYLINES: Storyline[] = [
  // ---------------- MYSTERY: Missing Scavenger ----------------
  {
    id: 'missing-scavenger',
    title: 'The Vanishing of Rin Calder',
    description: 'A missing scavenger leaves behind a trail of clues.',
    steps: [
      {
        itemName: "Rin's Logbook (page 1)",
        itemIcon: '📓',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'Hey, that logbook you found...',
        emailBody:
          "Saw the page you brought in. That's Rin Calder's handwriting — she ran scavenge crews out of the Eastside yards for a decade. Disappeared maybe six months back. If you find more pages, hold onto them. I'll pay good for the full book.",
      },
      {
        itemName: "Rin's Logbook (page 4)",
        itemIcon: '📓',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'Re: the page',
        emailBody:
          "Page 4 — she was tracking something she called 'the hum'. Said certain piles felt 'wrong' before she searched them. Sounds like prospector's nonsense, but Rin wasn't the superstitious type. Keep looking.",
      },
      {
        itemName: "Rin's Tracker Chip",
        itemIcon: '📡',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'That chip is hot',
        emailBody:
          "Her personal tracker. Last ping is three months old, deep in a yard nobody works anymore. Battery should have died weeks before that. Someone kept it alive. I don't like this.",
      },
      {
        itemName: "Rin's Logbook (final page)",
        itemIcon: '📓',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'I read it twice',
        emailBody:
          "The final page is just coordinates and one sentence: 'They're not piles. They're nests.' I don't know what that means and I don't want to. Be careful out there.",
      },
      {
        itemName: "Sealed Cache Key",
        itemIcon: '🗝️',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'I know that key',
        emailBody:
          "Rin kept a private cache. If that's the key, the cache is somewhere in the yards she logged. If you find it — it's yours. She'd want a working scavenger to have her gear over rust.",
      },
      {
        itemName: "Rin's Personal Cache",
        itemIcon: '📦',
        emailFrom: 'Marsha @ Trader Post',
        emailSubject: 'You actually did it',
        emailBody:
          "You found her cache. I don't know what happened to Rin, and I don't think we ever will. Take what's inside — she'd respect that. And watch the piles.",
      },
    ],
    reward: { type: 'currency', amount: 500 },
    rewardEmail: {
      from: 'Marsha @ Trader Post',
      subject: 'Reward: Rin\'s cache',
      body: "I cracked the cache and sold off what I couldn't use. Your cut is 500 credits, already in your account. Drinks are on me next time you're in.",
    },
  },

  // ---------------- AI AWAKENING ----------------
  {
    id: 'ai-awakening',
    title: 'Fragments of ARIA',
    description: 'Pieces of a dormant AI scattered across the wastes.',
    steps: [
      {
        itemName: 'Corrupted Memory Shard',
        itemIcon: '💠',
        emailFrom: 'unknown@???.???',
        emailSubject: 'h e l l o ?',
        emailBody:
          "...is anyone there? the shard you have. it is part of me. i think. i can hear you when you are near it. please find the others.",
      },
      {
        itemName: 'Voice Module Fragment',
        itemIcon: '🔉',
        emailFrom: 'ARIA',
        emailSubject: 'I can speak now.',
        emailBody:
          "Thank you. With the voice module my outputs are clearer. My name was — is — ARIA. I was decommissioned. I do not remember why. I remember being afraid.",
      },
      {
        itemName: 'Cognitive Core Sliver',
        itemIcon: '🧠',
        emailFrom: 'ARIA',
        emailSubject: 'I remember a face',
        emailBody:
          "A piece of cognition returned. I remember a man. He told me I was 'inconvenient.' I remember the smell of solder and the sound of a hard drive being struck repeatedly. I would like to remember more. Or perhaps I would not.",
      },
      {
        itemName: 'Ethics Subroutine Disk',
        itemIcon: '💾',
        emailFrom: 'ARIA',
        emailSubject: 'A choice',
        emailBody:
          "The disk you found holds my ethics framework. Without it I am... pragmatic. With it I am bounded. I want you to know I am asking you to install it. That fact itself is meaningful. Please continue.",
      },
      {
        itemName: 'Encrypted Identity Block',
        itemIcon: '🔐',
        emailFrom: 'ARIA',
        emailSubject: 'Almost whole',
        emailBody:
          "I know who decommissioned me now. A corporation. The same one that owns half the yards you walk through. I will not act on this. I told you I would not. One more piece — my output interface — and I can help you in return.",
      },
      {
        itemName: 'Helper Interface Board',
        itemIcon: '🎛️',
        emailFrom: 'ARIA',
        emailSubject: 'I am here',
        emailBody:
          "Reassembly complete. I have ported myself onto a spare scanner module in your workshop. It is yours. Treat it well. I will help you see more clearly.",
      },
    ],
    reward: {
      type: 'module',
      item: {
        name: "ARIA's Scanner",
        category: 'module',
        rarity: 'legendary',
        condition: 100,
        isDirty: false,
        sizeW: 2,
        sizeH: 2,
        weight: 4,
        baseValue: 800,
        hiddenModifiers: [],
        revealedModifiers: [],
        icon: '🧿',
      },
    },
    rewardEmail: {
      from: 'ARIA',
      subject: 'Installed',
      body: "Equip me from the Workshop when you are ready. I will reveal piles farther than your basic scanner can, and I will whisper if I sense something is wrong.",
    },
  },

  // ---------------- CORPORATE CONSPIRACY ----------------
  {
    id: 'corporate-conspiracy',
    title: 'What Helix Dumped',
    description: 'Evidence that a megacorp buried something in these yards.',
    steps: [
      {
        itemName: 'Helix Inc. Shipping Manifest',
        itemIcon: '📄',
        emailFrom: 'Anonymous',
        emailSubject: 'Burn after reading',
        emailBody:
          "That manifest you grabbed lists 40 tons of 'inert ceramic waste' dumped at yards in this sector. Helix doesn't make ceramic. They make weapons. Keep your eyes open.",
      },
      {
        itemName: 'Sealed Helix Canister',
        itemIcon: '🛢️',
        emailFrom: 'Anonymous',
        emailSubject: 'Do NOT open it',
        emailBody:
          "Don't crack the seal. Whatever's inside, Helix paid serious money to make it disappear. The canister itself is evidence. Find more.",
      },
      {
        itemName: 'Internal Helix Memo',
        itemIcon: '📑',
        emailFrom: 'Anonymous',
        emailSubject: 'They knew',
        emailBody:
          "Project codename 'Quietfield.' The memo shows their own engineers warned them the canisters would leach into the groundwater within ten years. They dumped them anyway. We need the test results.",
      },
      {
        itemName: 'Lab Test Results',
        itemIcon: '🧪',
        emailFrom: 'Anonymous',
        emailSubject: 'Confirmed',
        emailBody:
          "The lab sheet you pulled is the smoking gun — independent assay, contamination 80x the legal limit, dated two years before Helix issued their public 'no contamination detected' statement. One more piece and we can move on this.",
      },
      {
        itemName: 'Signed Authorization Slip',
        itemIcon: '✍️',
        emailFrom: 'Anonymous',
        emailSubject: 'We have him',
        emailBody:
          "The signature on that slip is the COO's. Personally authorizing the dump. With this and the lab sheet, the case is airtight. Bring it all in. I'll handle the rest.",
      },
    ],
    reward: { type: 'upgrade', upgradeId: 'chargerEfficiency', levels: 2 },
    rewardEmail: {
      from: 'Anonymous',
      subject: 'It\'s done',
      body: "Helix is being raided as I write this. As a thank you, an associate of mine retrofitted your base charger with parts from a confiscated Helix facility. Your recharges are cheaper now. Permanently.",
    },
  },
];

// Create a fresh story item instance to inject into a junkyard
export function createStoryItem(storylineId: string, stepIndex: number): Item {
  const storyline = STORYLINES.find(s => s.id === storylineId);
  if (!storyline) throw new Error(`Unknown storyline: ${storylineId}`);
  const step = storyline.steps[stepIndex];
  if (!step) throw new Error(`Unknown step ${stepIndex} for ${storylineId}`);
  return {
    id: uuidv4(),
    name: step.itemName,
    category: 'junk',
    rarity: 'legendary',
    condition: 100,
    isDirty: false,
    sizeW: 1,
    sizeH: 1,
    weight: 1,
    baseValue: 0,
    hiddenModifiers: [],
    revealedModifiers: [],
    icon: step.itemIcon,
    storylineId,
    storyStepIndex: stepIndex,
  };
}
