import { MAX_HEALTH, MAX_HUNGER, FLASHLIGHT_BATTERY_MAX, LIGHTER_USES_MAX } from "./constants";
import { type WorldMap, type ResourceNode, generateWorld, generateResourceNodes, TILE_SIZE } from "./world-gen";
import type { Creature, LogEntry, GameStatus } from "./game-state";

export type WeaponTier = "knife" | "spear" | "axe";

export interface PlacedFire {
  id: number;
  x: number;
  y: number;
  fuel: number; // 0-100
}

export interface ExplorationState {
  status: GameStatus;
  tick: number;
  ticksPlayed: number;
  hour: number;
  health: number;
  hunger: number;
  wood: number;
  food: number;
  materials: number;
  noise: number;
  creatures: Creature[];
  nextCreatureId: number;
  forageCooldownUntil: number;
  attackCooldownUntil: number;
  log: LogEntry[];
  lastSavedAt: number;

  // Equipment
  flashlightOn: boolean;
  flashlightBattery: number; // 0-100, cannot recharge
  lighterUses: number; // starts at 5, decrements on fire creation
  weapon: WeaponTier;

  // Spatial — player
  playerX: number;
  playerY: number;
  playerAngle: number;

  // Spatial — world
  worldSeed: number;
  fires: PlacedFire[];
  nextFireId: number;
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
    wood: 3,
    food: 2,
    materials: 0,
    noise: 0,
    creatures: [],
    nextCreatureId: 1,
    forageCooldownUntil: 0,
    attackCooldownUntil: 0,
    log: [
      { tick: 0, hour: 0, message: "You come to. Total darkness. You have a flashlight, a knife, a lighter, and some rations.", type: "info" },
      { tick: 0, hour: 0, message: "48 hours until rescue. WASD to move. F to toggle flashlight. Q to attack.", type: "info" },
    ],
    lastSavedAt: Date.now(),

    flashlightOn: true,
    flashlightBattery: FLASHLIGHT_BATTERY_MAX,
    lighterUses: LIGHTER_USES_MAX,
    weapon: "knife",

    playerX: spawnPx,
    playerY: spawnPy,
    playerAngle: 0,
    worldSeed: seed,
    fires: [], // no fire at start — you have to make one
    nextFireId: 1,
    resourceNodes: nodes,
  };
}

export function getWorldFromState(s: ExplorationState) {
  return generateWorld(s.worldSeed);
}
