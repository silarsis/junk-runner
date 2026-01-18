# Junk Runner Technical Architecture

## Overview
Junk Runner is a single-page React game built with Vite and TypeScript. The UI is composed of screen-level components (base, junkyard, shop, etc.) that are orchestrated by a top-level route and screen switcher. A custom `useGameState` hook owns the runtime state, persistence, and most game-system logic (world generation, inventory, upgrades, automation, etc.). The game state is stored in `localStorage`, allowing the session to survive page refreshes.

## System Diagram (Runtime)
```mermaid
flowchart TD
  subgraph UI[React UI]
    App[App.tsx Providers]
    Router[React Router]
    Index[Index Screen Switcher]
    Screens[Game Screens & Modals]
  end

  subgraph State[State & Systems]
    Hook[useGameState Hook]
    GameState[GameState + PlayerState]
    Storage[localStorage Save + Shop Cache]
  end

  subgraph Data[Content Data]
    Items[itemTemplates]
    Biomes[biomes]
    Upgrades[upgradeData]
    Consumables[consumableData]
    Recipes[craftingRecipes]
  end

  subgraph World[World Generation]
    ChunkGen[chunkGenerator]
    TerrainGen[terrainGenerator]
    EnemyAI[enemyAI]
    EnemyDefs[enemies]
  end

  App --> Router --> Index --> Screens
  Screens <--> Hook
  Hook --> GameState
  Hook <--> Storage
  Hook --> ChunkGen
  Hook --> TerrainGen
  Hook --> EnemyAI
  ChunkGen --> EnemyDefs
  Hook --> Items
  Hook --> Biomes
  Hook --> Upgrades
  Hook --> Consumables
  Hook --> Recipes
```

## UI Composition
- `App.tsx` sets up global providers (error boundary, query client, tooltips, toasts) and routes. The root route renders `Index`, while an explicit not-found route handles unmatched URLs.
- `Index` controls screen routing via local component state (`base`, `junkyard`, `cleaning`, `shop`, `upgrades`, `workshop`, `automation`, `scavenge`) and conditionally renders the corresponding screen component. Inventory and stash are handled as modals on top of the current screen.

## State Management & Persistence
- `useGameState` owns the canonical `GameState`, derived runtime bag state, and transient UI-related values (found items, terrain notifications).
- The hook initializes game state by reading a serialized save payload from `localStorage` and performs migration/validation for older saves.
- A save effect serializes state back to `localStorage` (including chunk data for the infinite junkyard) whenever state changes.
- Shop inventory is cached separately in `localStorage` with a refresh timer to avoid regenerating every session.

## World Generation & Exploration
- The junkyard is generated in two forms: a legacy fixed-size yard and an infinite chunk-based yard.
- The chunk generator uses a deterministic seed per chunk (derived from the base seed plus chunk coordinates) and scales rarity and hazard density by distance from the entrance.
- Terrain hazards, barriers, walls, and loot piles are generated based on biome definitions.
- Enemy AI routines process enemy turns, adjacency effects, and status effects, integrating with movement and turn progression.

## Economy, Crafting, and Progression Systems
- Items are defined from templates, with rarity weights and per-item metadata (capacity, storage dimensions, movement types, etc.).
- Player progression is driven by base upgrades (cleaning slots, workshop tier, control capacity, recharge rates, shop prices) and helper robot frames/components.
- Crafting and workshop systems use recipes and helper frame slots to install and remove modules, repair items, and build new frames.
- Cleaning jobs are time-based (real-time duration) and can be automated by a cleaning bot that queues and collects work.

## Key Runtime Flow
1. App initializes providers and routes to `Index`.
2. `Index` uses `useGameState` to load or create a save and then renders the current screen.
3. When the player enters the junkyard, the hook either creates or loads a chunk-based world, updates the player position, and reveals tiles.
4. Movement, searches, and combat update the `GameState`, triggering persistence and UI refresh.
5. Returning to base unlocks shop, upgrades, workshop, and cleaning flows, as well as passive recharge.

