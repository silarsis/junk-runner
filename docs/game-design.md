# Junk Runner Game Design Document

## High-Level Pitch
Junk Runner is a single-player, browser-based scavenging roguelite. Players pilot a helper robot through procedurally generated junkyards, salvaging items, managing inventory weight/space, and returning to base to clean, sell, craft, and upgrade their operation. The experience blends light tactical exploration with long-term progression through upgrades, helper customization, and automation systems.

## Core Gameplay Loop
1. **Prepare at Base**: Manage stash, equip helper components, install launchers/consumables, and review upgrades.
2. **Scavenge**: Enter a biome-themed junkyard, navigate hazards and enemies, and search junk piles for loot.
3. **Extract**: Return to base before running out of charge or being overwhelmed.
4. **Process Loot**: Clean items, sell for currency, craft upgrades/components, and expand capability.
5. **Repeat**: Use improved tools to reach deeper chunks with higher rarity rewards.

## Player Goals & Progression
- **Short-term**: Find valuable loot, survive hazards, and return to base safely.
- **Mid-term**: Unlock upgrades (cleaning slots, workshop tier, control capacity, recharge rate, shop pricing) and improve helper loadouts.
- **Long-term**: Explore farther junkyard chunks for rarer items, build specialized helper frames, and automate cleaning tasks.

## Game Systems

### Junkyard Exploration
- Junkyards are procedurally generated with biome-specific terrain, barriers, walls, and loot piles.
- World generation is chunk-based for infinite exploration. Difficulty and rarity scale with distance from the entrance.
- Terrain hazards apply movement penalties, battery drain, and/or component damage (e.g., magnetic floors increase item weight, toxic hazards degrade mobility).

### Resources & Constraints
- **Battery Charge**: Movement and hazards drain charge; base recharging restores it over time.
- **Inventory Space & Weight**: Items must fit into a grid-based bag and respect weight limits.
- **Item Condition**: Loot can be dirty or damaged; cleaning restores value and usability.

### Enemies & Threats
- Enemies are biome-themed with behaviors like wandering, patrolling, chasing, and ambushing.
- Adjacency effects include battery drain, movement penalties, or disabling helpers.
- Consumables counter enemy archetypes (EMP, cryo, decoys, etc.) and provide tactical tools like recall beacons.

### Economy
- Currency is earned by selling items. The shop sells items and components on a timed refresh cycle.
- Price modifiers from upgrades affect shop economics and long-term efficiency.

### Crafting & Workshop
- Crafting uses recipes and inventory ingredients to produce components, helpers, and upgrades.
- The workshop supports installing/removing components, repairing gear, and building helper frames.

### Automation
- The cleaning bot automates cleaning tasks by queuing and collecting items when active.
- Automation reduces manual micromanagement, turning the base into a higher-throughput operation.

## Content Pillars
- **Biomes**: Unique junkyard themes (e.g., Nuclear Exclusion Heap, Neon Slum, Industrial Corpse Zone) with distinct hazards and loot profiles.
- **Items**: Templates with rarity, size, weight, durability, and special stats (storage size, battery capacity, mobility type).
- **Helpers**: Modular robots with frames and component slots to tailor loadouts.
- **Consumables**: Tactical countermeasures and utility effects (stun, distract, recall).

## UX & Presentation
- The UI is screen-based (base, junkyard, shop, workshop, etc.) with modal overlays for inventory and stash.
- A terminal-style intro sequence sets tone and onboarding.
- Toast notifications highlight terrain hazards and enemy encounters.

## Future Design Hooks (Supported by Data)
- Biome barriers already declare required modules, enabling future gating mechanics.
- Terrain effects and enemy adjacency effects can be expanded for deeper tactical play.
- Additional helper frames, modules, and automation bots can extend progression without altering the core loop.

