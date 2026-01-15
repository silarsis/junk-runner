import { Junkyard } from '@/types/game';
import { Enemy, getEnemyDefinition } from '@/types/enemies';
import { isTilePassable, getEnemyAt } from './terrainGenerator';

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
  
  // Stationary enemies don't move
  if (definition.behaviour === 'stationary') {
    // Check if player is adjacent to become alerted
    const distToPlayer = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
    return { ...enemy, isAlerted: distToPlayer <= 1 };
  }
  
  // Ambush enemies don't move until revealed/triggered
  if (definition.behaviour === 'ambush') {
    // For now, ambush enemies stay put unless player is adjacent
    const distToPlayer = manhattanDistance(enemy.x, enemy.y, playerX, playerY);
    if (distToPlayer <= 2) {
      // Triggered! Start chasing
      return processChase(enemy, junkyard, enemies, playerX, playerY);
    }
    return enemy;
  }
  
  // Terrain-based movement (simplified to wander for now)
  if (definition.behaviour === 'terrain') {
    return processWander(enemy, junkyard, enemies, playerX, playerY);
  }
  
  switch (definition.behaviour) {
    case 'wander':
      return processWander(enemy, junkyard, enemies, playerX, playerY);
    case 'patrol':
      return processPatrol(enemy, junkyard, enemies, playerX, playerY);
    case 'chase':
      return processChase(enemy, junkyard, enemies, playerX, playerY);
    default:
      return enemy;
  }
}

// Process all enemies' turns
export function processEnemyTurns(
  junkyard: Junkyard,
  playerX: number,
  playerY: number
): { updatedEnemies: Enemy[]; playerCollision: Enemy | null } {
  const updatedEnemies: Enemy[] = [];
  let playerCollision: Enemy | null = null;
  
  for (const enemy of junkyard.enemies) {
    const updatedEnemy = processEnemyTurn(
      enemy,
      junkyard,
      [...updatedEnemies, ...junkyard.enemies.filter(e => !updatedEnemies.find(u => u.id === e.id))],
      playerX,
      playerY
    );
    
    // Check if enemy moved onto player
    if (updatedEnemy.x === playerX && updatedEnemy.y === playerY) {
      playerCollision = updatedEnemy;
    }
    
    updatedEnemies.push(updatedEnemy);
  }
  
  return { updatedEnemies, playerCollision };
}

// Check if player is adjacent to any enemy (for adjacency effects)
export function getAdjacentEnemies(
  enemies: Enemy[],
  playerX: number,
  playerY: number
): Enemy[] {
  return enemies.filter(enemy => {
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
