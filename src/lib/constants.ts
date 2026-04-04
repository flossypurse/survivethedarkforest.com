// ── Time ──
export const TICK_MS = 1000;
export const TICKS_PER_HOUR = 20;
export const HOURS_TO_SURVIVE = 48;
export const TOTAL_TICKS = TICKS_PER_HOUR * HOURS_TO_SURVIVE;

// ── Flashlight ──
export const FLASHLIGHT_BATTERY_MAX = 100;
export const FLASHLIGHT_DRAIN_PER_TICK = 0.25; // ~400 ticks = ~6.7 min of continuous use

// ── Lighter ──
export const LIGHTER_USES_MAX = 5; // can start 5 fires total

// ── Fire ──
export const FIRE_MAX = 100;
export const FIRE_BURN_RATE = 0.8; // burns faster — fire is precious
export const WOOD_PER_FUEL = 10;
export const FIRE_START_FUEL = 30; // how much fuel a new fire starts with

// ── Resources ──
export const WOOD_FORAGE_AMOUNT = 2;
export const FOOD_FORAGE_AMOUNT = 1;
export const MATERIAL_FORAGE_AMOUNT = 2;
export const FORAGE_COOLDOWN_TICKS = 10;

// ── Survival ──
export const MAX_HEALTH = 100;
export const HUNGER_RATE = 0.22;
export const HUNGER_DAMAGE = 0.8;
export const FOOD_PER_EAT = 15;
export const MAX_HUNGER = 100;

// ── Weapons (material upgrades) ──
export const KNIFE_DAMAGE = 8; // base weapon, always have it
export const KNIFE_RANGE = 30; // pixels — must be close
export const KNIFE_NOISE = 25;
export const SPEAR_MATERIAL_COST = 3;
export const SPEAR_DAMAGE = 15;
export const SPEAR_RANGE = 50;
export const SPEAR_NOISE = 20;
export const AXE_MATERIAL_COST = 6;
export const AXE_DAMAGE = 25;
export const AXE_RANGE = 35;
export const AXE_NOISE = 30;

// ── Noise ──
export const NOISE_DECAY = 2;
export const NOISE_FORAGE = 35;
export const NOISE_STOKE = 15;
export const NOISE_EAT = 5;
export const NOISE_BUILD = 45;
export const NOISE_MAX = 100;

// ── Creatures ──
export const CREATURE_SPAWN_RATE = 0.012;
export const CREATURE_SPAWN_ESCALATION = 0.00015;
export const CREATURE_MAX = 8;
export const CREATURE_SPAWN_DISTANCE = 100;
export const CREATURE_ATTACK_RANGE = 8;
export const CREATURE_DESPAWN_DISTANCE = 130;

// ── Detection ──
export const DETECT_CLOSE_RANGE = 25;
export const DETECT_MEDIUM_RANGE = 50;
export const DETECT_COOLDOWN = 12;

// ── World ──
export { TILE_SIZE } from "./world-gen";

// ── Storage key ──
export const STORAGE_KEY = "dark-forest-state-v4";

// ── Config (for harness) ──
export interface GameConfig {
  TICKS_PER_HOUR: number;
  HOURS_TO_SURVIVE: number;
  FLASHLIGHT_BATTERY_MAX: number;
  FLASHLIGHT_DRAIN_PER_TICK: number;
  LIGHTER_USES_MAX: number;
  FIRE_MAX: number;
  FIRE_BURN_RATE: number;
  WOOD_PER_FUEL: number;
  FIRE_START_FUEL: number;
  WOOD_FORAGE_AMOUNT: number;
  FOOD_FORAGE_AMOUNT: number;
  MATERIAL_FORAGE_AMOUNT: number;
  FORAGE_COOLDOWN_TICKS: number;
  MAX_HEALTH: number;
  HUNGER_RATE: number;
  HUNGER_DAMAGE: number;
  FOOD_PER_EAT: number;
  MAX_HUNGER: number;
  KNIFE_DAMAGE: number;
  KNIFE_RANGE: number;
  SPEAR_MATERIAL_COST: number;
  SPEAR_DAMAGE: number;
  SPEAR_RANGE: number;
  AXE_MATERIAL_COST: number;
  AXE_DAMAGE: number;
  AXE_RANGE: number;
  NOISE_DECAY: number;
  NOISE_FORAGE: number;
  NOISE_STOKE: number;
  NOISE_EAT: number;
  NOISE_BUILD: number;
  NOISE_MAX: number;
  CREATURE_SPAWN_RATE: number;
  CREATURE_SPAWN_ESCALATION: number;
  CREATURE_MAX: number;
  CREATURE_SPAWN_DISTANCE: number;
  CREATURE_ATTACK_RANGE: number;
  CREATURE_DESPAWN_DISTANCE: number;
  DETECT_CLOSE_RANGE: number;
  DETECT_MEDIUM_RANGE: number;
  DETECT_COOLDOWN: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  TICKS_PER_HOUR, HOURS_TO_SURVIVE,
  FLASHLIGHT_BATTERY_MAX, FLASHLIGHT_DRAIN_PER_TICK, LIGHTER_USES_MAX,
  FIRE_MAX, FIRE_BURN_RATE, WOOD_PER_FUEL, FIRE_START_FUEL,
  WOOD_FORAGE_AMOUNT, FOOD_FORAGE_AMOUNT, MATERIAL_FORAGE_AMOUNT, FORAGE_COOLDOWN_TICKS,
  MAX_HEALTH, HUNGER_RATE, HUNGER_DAMAGE, FOOD_PER_EAT, MAX_HUNGER,
  KNIFE_DAMAGE, KNIFE_RANGE, SPEAR_MATERIAL_COST, SPEAR_DAMAGE, SPEAR_RANGE,
  AXE_MATERIAL_COST, AXE_DAMAGE, AXE_RANGE,
  NOISE_DECAY, NOISE_FORAGE, NOISE_STOKE, NOISE_EAT, NOISE_BUILD, NOISE_MAX,
  CREATURE_SPAWN_RATE, CREATURE_SPAWN_ESCALATION, CREATURE_MAX,
  CREATURE_SPAWN_DISTANCE, CREATURE_ATTACK_RANGE, CREATURE_DESPAWN_DISTANCE,
  DETECT_CLOSE_RANGE, DETECT_MEDIUM_RANGE, DETECT_COOLDOWN,
};
