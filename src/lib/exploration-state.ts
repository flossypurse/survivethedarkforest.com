import { FIRE_MAX, MAX_HEALTH, MAX_HUNGER } from "./constants";
import { type WorldMap, type ResourceNode, generateWorld, generateResourceNodes, TILE_SIZE } from "./world-gen";
import type { GameState, Creature, LogEntry, GameStatus, CreatureType } from "./game-state";

// ── Exploration state extends the base game state with spatial data ──

export interface ExplorationState {
  // Core game state (same fields)
  status: GameStatus;
  tick: number;
  ticksPlayed: number;
  hour: number;
  health: number;
  hunger: number;
  fire: number;
  wood: number;
  food: number;
  materials: number;
  hasClub: boolean;
  traps: number;
  hasShelter: boolean;
  noise: number;
  creatures: Creature[];
  nextCreatureId: number;
  forageCooldownUntil: number;
  log: LogEntry[];
  lastSavedAt: number;

  // Spatial — player
  playerX: number;
  playerY: number;
  playerAngle: number; // radians, 0 = right, pi/2 = down

  // Spatial — world
  worldSeed: number;
  fireX: number;
  fireY: number;
  resourceNodes: ResourceNode[];
}

export function createExplorationState(): ExplorationState {
  const seed = Date.now();
  const world = generateWorld(seed);
  const nodes = generateResourceNodes(world);
  const spawnPx = world.spawnX * TILE_SIZE + TILE_SIZE / 2;
  const spawnPy = world.spawnY * TILE_SIZE + TILE_SIZE / 2;

  return {
    status: "playing",
    tick: 0,
    ticksPlayed: 0,
    hour: 0,
    health: MAX_HEALTH,
    hunger: 0,
    fire: FIRE_MAX,
    wood: 5,
    food: 3,
    materials: 0,
    hasClub: false,
    traps: 0,
    hasShelter: false,
    noise: 0,
    creatures: [],
    nextCreatureId: 1,
    forageCooldownUntil: 0,
    log: [
      { tick: 0, hour: 0, message: "You come to. Wreckage burns beside you.", type: "info" },
      { tick: 0, hour: 0, message: "48 hours until rescue. Move with WASD. Stay alive.", type: "info" },
    ],
    lastSavedAt: Date.now(),
    playerX: spawnPx,
    playerY: spawnPy,
    playerAngle: 0,
    worldSeed: seed,
    fireX: spawnPx,
    fireY: spawnPy,
    resourceNodes: nodes,
  };
}

// The ExplorationState is compatible with GameState for engine functions
// by casting — they share all the same base fields
export function asGameState(s: ExplorationState): GameState {
  return s as unknown as GameState;
}

// Regenerate the world map from seed (not stored in state — deterministic)
export function getWorldFromState(s: ExplorationState): WorldMap {
  return generateWorld(s.worldSeed);
}
