import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  STORAGE_KEY,
} from "./constants";

// ── Types ──

export type Phase = "day" | "night";
export type GameStatus = "playing" | "dead" | "won";

export interface LogEntry {
  tick: number;
  day: number;
  phase: Phase;
  message: string;
  type: "info" | "danger" | "success" | "discovery";
}

export interface GameState {
  // meta
  status: GameStatus;
  tick: number;
  day: number;
  phase: Phase;
  phaseTick: number; // ticks into current phase

  // survival
  health: number;
  hunger: number; // 0 = full, 100 = starving
  fire: number; // 0–100

  // resources
  wood: number;
  food: number;
  materials: number;

  // upgrades
  traps: number;
  hasShelter: boolean;

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
    day: 1,
    phase: "day",
    phaseTick: 0,

    health: MAX_HEALTH,
    hunger: 0,
    fire: FIRE_MAX,

    wood: 5,
    food: 3,
    materials: 0,

    traps: 0,
    hasShelter: false,

    forageCooldownUntil: 0,

    log: [
      {
        tick: 0,
        day: 1,
        phase: "day",
        message: "You wake in a dark forest. A small fire crackles beside you.",
        type: "info",
      },
      {
        tick: 0,
        day: 1,
        phase: "day",
        message: "Gather wood to keep it alive. Find food. Survive.",
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
    // Basic validation
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

export function addLog(
  state: GameState,
  message: string,
  type: LogEntry["type"] = "info"
): void {
  state.log.push({
    tick: state.tick,
    day: state.day,
    phase: state.phase,
    message,
    type,
  });
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log = state.log.slice(-MAX_LOG_ENTRIES);
  }
}
