import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  STORAGE_KEY,
} from "./constants";

// ── Types ──

export type GameStatus = "playing" | "dead" | "won";
export type CreatureType = "timid" | "predator" | "stalker";

export interface Creature {
  id: number;
  type: CreatureType;
  x: number;
  y: number;
  spawnTick: number;
}

export interface LogEntry {
  tick: number;
  hour: number;
  message: string;
  type: "info" | "danger" | "success" | "discovery";
}

export interface GameState {
  // meta
  status: GameStatus;
  tick: number;
  ticksPlayed: number; // ticks since game start (tick may be offset for RNG)
  hour: number; // current hour (0-based, counts up)

  // survival
  health: number;
  hunger: number; // 0 = full, 100 = starving
  fire: number; // 0–100

  // resources
  wood: number;
  food: number;
  materials: number;

  // upgrades
  hasClub: boolean;
  traps: number;
  hasShelter: boolean;

  // noise — 0 (silent) to 100 (deafening)
  noise: number;

  // creatures in the forest
  creatures: Creature[];
  nextCreatureId: number;

  // cooldowns (tick when action becomes available)
  forageCooldownUntil: number;

  // event log (last N entries)
  log: LogEntry[];

  // persistence
  lastSavedAt: number; // Date.now() — used to calc offline time
}

// ── Initial state ──

export function createInitialState(): GameState {
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
      {
        tick: 0,
        hour: 0,
        message: "You come to. A small fire crackles — lit from wreckage.",
        type: "info",
      },
      {
        tick: 0,
        hour: 0,
        message: "48 hours until rescue. Keep the fire alive.",
        type: "info",
      },
    ],

    lastSavedAt: Date.now(),
  };
}

// ── Persistence ──

export function saveState(state: GameState): void {
  try {
    const toSave = { ...state, lastSavedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full or unavailable — game continues in memory
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (typeof parsed.tick !== "number" || typeof parsed.fire !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Log helper ──

const MAX_LOG_ENTRIES = 50;

// Accepts any object with tick, hour, log fields (GameState or ExplorationState)
export function addLog(
  state: { tick: number; hour: number; log: LogEntry[] },
  message: string,
  type: LogEntry["type"] = "info"
): void {
  state.log.push({
    tick: state.tick,
    hour: state.hour,
    message,
    type,
  });
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log = state.log.slice(-MAX_LOG_ENTRIES);
  }
}
