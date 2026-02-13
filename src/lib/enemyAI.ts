import { Junkyard, JunkPile } from '@/types/game';
import { Enemy, EnemyStatus, getEnemyDefinition } from '@/types/enemies';
import { isTilePassable, getEnemyAt } from './terrainGenerator';

// Decrement status effect turns and remove expired effects
function tickStatusEffects(enemy: Enemy): Enemy {
  if (!enemy.statusEffects || enemy.statusEffects.length === 0) {
    return enemy;
  }
  
  const updatedEffects = enemy.statusEffects
    .map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
    .filter(effect => effect.turnsRemaining > 0);
  
  return {
    ...enemy,
    statusEffects: updatedEffects.length > 0 ? updatedEffects : undefined,
  };
}

// Check if enemy has a specific status effect
export function hasStatusEffect(enemy: Enemy, effect: string): boolean {
  return enemy.statusEffects?.some(s => s.effect === effect) ?? false;
}

// Check if enemy can move (not stunned, frozen, etc.)
function canEnemyMove(enemy: Enemy): boolean {
  if (!enemy.statusEffects) return true;
  return !enemy.statusEffects.some(s => 
    s.effect === 'stunned' || 
    s.effect === 'frozen' || 
    s.effect === 'neutralized'
  );
}

// Check if enemy can chase player (not blinded, distracted, etc.)
function canEnemyChase(enemy: Enemy): boolean {
  if (!enemy.statusEffects) return true;
  return !enemy.statusEffects.some(s => 
    s.effect === 'blinded' || 
    s.effect === 'distracted' ||
    s.effect === 'scattered' ||
    s.effect === 'corrupted'
  );
}

// Distance calculation (Manhattan for simplicity)
function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Get valid adjacent moves for an enemy
function getValidMoves(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[]
): { x: number; y: number }[] {
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];
  
  const validMoves: { x: number; y: number }[] = [];
  
  for (const dir of directions) {
    const newX = enemy.x + dir.dx;
    const newY = enemy.y + dir.dy;
    
    // Check bounds and passability
    if (!isTilePassable(junkyard, newX, newY)) continue;
    
    // Check for other enemies at this position
    const otherEnemy = enemies.find(e => e.id !== enemy.id && e.x === newX && e.y === newY);
    if (otherEnemy) continue;
    
    validMoves.push({ x: newX, y: newY });
  }
  
  return validMoves;
}

// Wander behaviour: random adjacent movement
function processWander(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  _playerX: number,
  _playerY: number
): Enemy {
  const validMoves = getValidMoves(enemy, junkyard, enemies);
  
  if (validMoves.length === 0) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1 };
  }
  
  // Random selection
  const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
  
  return {
    ...enemy,
    x: randomMove.x,
    y: randomMove.y,
    turnsStationary: 0,
  };
}

// Glow Rat behaviour: move toward nearest junk pile (not player-occupied) and eat it
function processGlowRat(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy {
  // Find nearest non-depleted junk pile that player isn't standing on
  const availablePiles = junkyard.piles.filter(
    p => !p.isDepleted && !(p.x === playerX && p.y === playerY)
  );
  
  if (availablePiles.length === 0) {
    // No piles to eat, wander randomly
    return processWander(enemy, junkyard, enemies, playerX, playerY);
  }
  
  // Find nearest pile
  let nearestPile = availablePiles[0];
  let nearestDist = manhattanDistance(enemy.x, enemy.y, nearestPile.x, nearestPile.y);
  for (const pile of availablePiles) {
    const dist = manhattanDistance(enemy.x, enemy.y, pile.x, pile.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPile = pile;
    }
  }
  
  // If already on the pile, stay and eat (turnsStationary tracks eating progress)
  if (enemy.x === nearestPile.x && enemy.y === nearestPile.y) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1 };
  }
  
  // Move toward the nearest pile
  const validMoves = getValidMoves(enemy, junkyard, enemies);
  if (validMoves.length === 0) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1 };
  }
  
  let bestMove = validMoves[0];
  let bestDist = manhattanDistance(bestMove.x, bestMove.y, nearestPile.x, nearestPile.y);
  for (const move of validMoves) {
    const dist = manhattanDistance(move.x, move.y, nearestPile.x, nearestPile.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestMove = move;
    }
  }
  
  return {
    ...enemy,
    x: bestMove.x,
    y: bestMove.y,
    turnsStationary: 0,
  };
}

// Patrol behaviour: follow fixed route back and forth
function processPatrol(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy {
  if (!enemy.patrolRoute || enemy.patrolRoute.length === 0) {
    // Fallback to wander if no route
    return processWander(enemy, junkyard, enemies, playerX, playerY);
  }
  
  let patrolIndex = enemy.patrolIndex ?? 0;
  let patrolDirection = enemy.patrolDirection ?? 1;
  
  // Move to next patrol point
  const nextIndex = patrolIndex + patrolDirection;
  
  // Reverse direction at ends
  if (nextIndex >= enemy.patrolRoute.length) {
    patrolDirection = -1;
    patrolIndex = enemy.patrolRoute.length - 2;
  } else if (nextIndex < 0) {
    patrolDirection = 1;
    patrolIndex = 1;
  } else {
    patrolIndex = nextIndex;
  }
  
  // Clamp to valid range
  patrolIndex = Math.max(0, Math.min(patrolIndex, enemy.patrolRoute.length - 1));
  
  const targetPoint = enemy.patrolRoute[patrolIndex];
  
  // Check if target is passable and not occupied
  if (!isTilePassable(junkyard, targetPoint.x, targetPoint.y)) {
    // Reverse direction if blocked
    return {
      ...enemy,
      patrolIndex: enemy.patrolIndex,
      patrolDirection: (patrolDirection * -1) as 1 | -1,
      turnsStationary: enemy.turnsStationary + 1,
    };
  }
  
  const otherEnemy = enemies.find(e => e.id !== enemy.id && e.x === targetPoint.x && e.y === targetPoint.y);
  if (otherEnemy) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1 };
  }
  
  // Check if player is nearby - become alerted
  const distToPlayer = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
  const isAlerted = distToPlayer <= 3;
  
  return {
    ...enemy,
    x: targetPoint.x,
    y: targetPoint.y,
    patrolIndex,
    patrolDirection,
    isAlerted,
    turnsStationary: 0,
  };
}

// Chase behaviour: move toward player
function processChase(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy {
  const definition = getEnemyDefinition(enemy.definitionId);
  
  // Check if this is a slow enemy (moveSpeed < 1)
  // They only move every other turn
  if (definition && definition.moveSpeed < 1) {
    const turnsToWait = Math.floor(1 / definition.moveSpeed);
    if (enemy.turnsStationary < turnsToWait - 1) {
      return { ...enemy, turnsStationary: enemy.turnsStationary + 1, isAlerted: true };
    }
  }
  
  const validMoves = getValidMoves(enemy, junkyard, enemies);
  
  if (validMoves.length === 0) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1, isAlerted: true };
  }
  
  // Find move that gets closest to player
  let bestMove = validMoves[0];
  let bestDistance = manhattanDistance(bestMove.x, bestMove.y, playerX, playerY);
  
  for (const move of validMoves) {
    const dist = manhattanDistance(move.x, move.y, playerX, playerY);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMove = move;
    }
  }
  
  // Only move if it gets us closer
  const currentDist = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
  if (bestDistance >= currentDist && validMoves.length > 1) {
    // Can't get closer, try a random move to unstick
    bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
  }
  
  return {
    ...enemy,
    x: bestMove.x,
    y: bestMove.y,
    isAlerted: true,
    turnsStationary: 0,
  };
}

// Scatter behaviour: flee from player (when scattered status)
function processScattered(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy {
  const validMoves = getValidMoves(enemy, junkyard, enemies);
  
  if (validMoves.length === 0) {
    return { ...enemy, turnsStationary: enemy.turnsStationary + 1 };
  }
  
  // Find move that gets FURTHEST from player
  let bestMove = validMoves[0];
  let bestDistance = manhattanDistance(bestMove.x, bestMove.y, playerX, playerY);
  
  for (const move of validMoves) {
    const dist = manhattanDistance(move.x, move.y, playerX, playerY);
    if (dist > bestDistance) {
      bestDistance = dist;
      bestMove = move;
    }
  }
  
  return {
    ...enemy,
    x: bestMove.x,
    y: bestMove.y,
    isAlerted: false, // Running away, not alerted
    turnsStationary: 0,
  };
}

// Process a single enemy's turn
function processEnemyTurn(
  enemy: Enemy,
  junkyard: Junkyard,
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy {
  const definition = getEnemyDefinition(enemy.definitionId);
  if (!definition) return enemy;
  
  // Tick down status effects first
  let processedEnemy = tickStatusEffects(enemy);
  
  // Check for neutralized - enemy is removed from play
  if (hasStatusEffect(processedEnemy, 'neutralized')) {
    // Move enemy far off-screen effectively
    return { ...processedEnemy, x: -1000, y: -1000 };
  }
  
  // Check for stunned or frozen - can't move at all
  if (!canEnemyMove(processedEnemy)) {
    return processedEnemy; // Just return with ticked status
  }
  
  // Check for scattered - flee from player
  if (hasStatusEffect(processedEnemy, 'scattered')) {
    return processScattered(processedEnemy, junkyard, enemies, playerX, playerY);
  }
  
  // Check for blinded/corrupted/distracted - can't chase, wander instead
  const canChase = canEnemyChase(processedEnemy);
  
  // Stationary enemies don't move
  if (definition.behaviour === 'stationary') {
    // Check if player is adjacent to become alerted
    const distToPlayer = manhattanDistance(processedEnemy.x, processedEnemy.y, playerX, playerY);
    return { ...processedEnemy, isAlerted: distToPlayer <= 1 };
  }
  
  // Ambush enemies don't move until revealed/triggered
  if (definition.behaviour === 'ambush') {
    // For now, ambush enemies stay put unless player is adjacent
    const distToPlayer = manhattanDistance(processedEnemy.x, processedEnemy.y, playerX, playerY);
    if (distToPlayer <= 2) {
      // Triggered! Start chasing (if able)
      if (canChase) {
        return processChase(processedEnemy, junkyard, enemies, playerX, playerY);
      } else {
        return processWander(processedEnemy, junkyard, enemies, playerX, playerY);
      }
    }
    return processedEnemy;
  }
  
  // Terrain-based movement (simplified to wander for now)
  if (definition.behaviour === 'terrain') {
    return processWander(processedEnemy, junkyard, enemies, playerX, playerY);
  }
  
  switch (definition.behaviour) {
    case 'wander':
      // Glow rats use special junk-seeking behaviour
      if (definition.id === 'glow_rat') {
        return processGlowRat(processedEnemy, junkyard, enemies, playerX, playerY);
      }
      return processWander(processedEnemy, junkyard, enemies, playerX, playerY);
    case 'patrol':
      return processPatrol(processedEnemy, junkyard, enemies, playerX, playerY);
    case 'chase':
      // If blinded/distracted/corrupted, wander instead of chase
      if (!canChase) {
        return processWander(processedEnemy, junkyard, enemies, playerX, playerY);
      }
      return processChase(processedEnemy, junkyard, enemies, playerX, playerY);
    default:
      return processedEnemy;
  }
}

// Process all enemies' turns
export function processEnemyTurns(
  junkyard: Junkyard,
  playerX: number,
  playerY: number
): { updatedEnemies: Enemy[]; playerCollision: Enemy | null; updatedPiles: JunkPile[] } {
  const updatedEnemies: Enemy[] = [];
  let playerCollision: Enemy | null = null;
  let updatedPiles = [...junkyard.piles];
  
  for (const enemy of junkyard.enemies) {
    // Use a junkyard with current piles state for AI decisions
    const currentJunkyard = { ...junkyard, piles: updatedPiles };
    const updatedEnemy = processEnemyTurn(
      enemy,
      currentJunkyard,
      [...updatedEnemies, ...junkyard.enemies.filter(e => !updatedEnemies.find(u => u.id === e.id))],
      playerX,
      playerY
    );
    
    // Check if enemy moved onto player
    if (updatedEnemy.x === playerX && updatedEnemy.y === playerY) {
      playerCollision = updatedEnemy;
    }
    
    // Glow rats eat junk piles they're sitting on
    const def = getEnemyDefinition(updatedEnemy.definitionId);
    if (def?.id === 'glow_rat') {
      const pileIndex = updatedPiles.findIndex(
        p => !p.isDepleted && p.x === updatedEnemy.x && p.y === updatedEnemy.y
      );
      if (pileIndex >= 0) {
        const pile = updatedPiles[pileIndex];
        const newProgress = pile.progressTurns + 1;
        if (newProgress >= pile.requiredTurns) {
          // Pile destroyed by glow rats
          updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress, isDepleted: true };
        } else {
          updatedPiles[pileIndex] = { ...pile, progressTurns: newProgress };
        }
      }
    }
    
    updatedEnemies.push(updatedEnemy);
  }
  
  return { updatedEnemies, playerCollision, updatedPiles };
}

// Scare away glow rats when player steps on their tile
export function scareGlowRats(
  enemies: Enemy[],
  playerX: number,
  playerY: number,
  junkyard: Junkyard
): Enemy[] {
  return enemies.map(enemy => {
    if (enemy.x !== playerX || enemy.y !== playerY) return enemy;
    const def = getEnemyDefinition(enemy.definitionId);
    if (def?.id !== 'glow_rat') return enemy;
    
    // Scatter the glow rat: move it to a random valid adjacent tile away from player
    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    const validEscapes = directions
      .map(d => ({ x: enemy.x + d.dx, y: enemy.y + d.dy }))
      .filter(pos => isTilePassable(junkyard, pos.x, pos.y) && !(pos.x === playerX && pos.y === playerY));
    
    if (validEscapes.length > 0) {
      const escape = validEscapes[Math.floor(Math.random() * validEscapes.length)];
      return { ...enemy, x: escape.x, y: escape.y, turnsStationary: 0, isAlerted: true };
    }
    
    // No escape route - remove from play
    return { ...enemy, x: -1000, y: -1000 };
  });
}

// Check if player is adjacent to any enemy (for adjacency effects)
// Ignores enemies that are stunned or neutralized
export function getAdjacentEnemies(
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy[] {
  return enemies.filter(enemy => {
    // Skip neutralized or frozen enemies for adjacency effects
    if (hasStatusEffect(enemy, 'neutralized')) return false;
    if (hasStatusEffect(enemy, 'stunned')) return false;
    
    const dist = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
    return dist === 1;
  });
}

// Check if player is on same tile as enemy
export function getEnemyAtPlayer(
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy | null {
  return enemies.find(enemy => enemy.x === playerX && enemy.y === playerY) || null;
}

// Apply a status effect to enemies matching the given definition IDs
export function applyStatusEffectToEnemies(
  enemies: Enemy[],
  targetDefinitionIds: string[],
  effect: EnemyStatus,
  playerX: number,
  playerY: number,
  range: number = 5 // Effect range in tiles
): { updatedEnemies: Enemy[]; affectedCount: number } {
  let affectedCount = 0;
  
  const updatedEnemies = enemies.map(enemy => {
    // Check if enemy is within range
    const dist = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
    if (dist > range) return enemy;
    
    // Check if this enemy type is targeted
    if (!targetDefinitionIds.includes(enemy.definitionId)) return enemy;
    
    affectedCount++;
    
    // Add or update status effect
    const existingEffects = enemy.statusEffects || [];
    const existingIndex = existingEffects.findIndex(e => e.effect === effect.effect);
    
    if (existingIndex >= 0) {
      // Refresh duration if already has this effect
      const newEffects = [...existingEffects];
      newEffects[existingIndex] = { ...effect };
      return { ...enemy, statusEffects: newEffects };
    } else {
      // Add new effect
      return { ...enemy, statusEffects: [...existingEffects, effect] };
    }
  });
  
  return { updatedEnemies, affectedCount };
}
