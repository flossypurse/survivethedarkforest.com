// ── Time ──
export const TICK_MS = 1000; // game ticks once per second
export const TICKS_PER_HOUR = 20; // one game "hour" every 20 seconds
export const HOURS_TO_SURVIVE = 48; // rescue arrives after 48 hours
export const TOTAL_TICKS = TICKS_PER_HOUR * HOURS_TO_SURVIVE; // 960 ticks = 16 min

// ── Fire ──
export const FIRE_MAX = 100;
export const FIRE_BURN_RATE = 0.55; // fuel consumed per tick
export const WOOD_PER_FUEL = 11; // fire fuel gained per wood added

// ── Resources ──
export const WOOD_FORAGE_AMOUNT = 2;
export const FOOD_FORAGE_AMOUNT = 1;
export const MATERIAL_FORAGE_AMOUNT = 2;
export const FORAGE_COOLDOWN_TICKS = 10; // seconds between forages

// ── Survival ──
export const MAX_HEALTH = 100;
export const HUNGER_RATE = 0.22; // hunger per tick
export const HUNGER_DAMAGE = 0.8; // health lost per tick when starving
export const FOOD_PER_EAT = 15; // hunger restored per food consumed
export const MAX_HUNGER = 100; // 0 = full, 100 = starving

// ── Defense ──
export const BASE_DEFENSE = 1;
export const CLUB_DEFENSE = 2;
export const CLUB_MATERIAL_COST = 2;
export const TRAP_DEFENSE = 3;
export const TRAP_MATERIAL_COST = 4;
export const SHELTER_MATERIAL_COST = 8;
export const SHELTER_DEFENSE = 5;

// ── Fire out penalty ──
export const DARKNESS_HEALTH_DAMAGE = 0.3; // health lost per tick in total darkness
export const RELIGHT_WOOD_COST = 2; // wood needed to relight fire

// ── Noise ──
export const NOISE_DECAY = 2; // noise reduction per tick
export const NOISE_FORAGE = 35; // loud — rustling, snapping branches
export const NOISE_STOKE = 15; // medium — cracking wood
export const NOISE_EAT = 5; // quiet — chewing
export const NOISE_BUILD = 45; // very loud — construction
export const NOISE_MAX = 100;

// ── Creatures ──
export const CREATURE_SPAWN_RATE = 0.012; // chance per tick
export const CREATURE_SPAWN_ESCALATION = 0.00015; // additional spawn chance per hour survived
export const CREATURE_MAX = 8; // max simultaneous creatures
export const CREATURE_SPAWN_DISTANCE = 100; // distance from camp at spawn
export const CREATURE_ATTACK_RANGE = 8; // distance to trigger attack
export const CREATURE_DESPAWN_DISTANCE = 130; // removed when this far

// ── Detection ──
export const DETECT_CLOSE_RANGE = 25; // precise 8-direction
export const DETECT_MEDIUM_RANGE = 50; // vague 4-direction
export const DETECT_COOLDOWN = 12; // ticks between detection log messages

// ── Storage key ──
export const STORAGE_KEY = "dark-forest-state-v2";

// ── Config object (for simulation harness + future difficulty levels) ──

export interface GameConfig {
  TICKS_PER_HOUR: number;
  HOURS_TO_SURVIVE: number;
  FIRE_MAX: number;
  FIRE_BURN_RATE: number;
  WOOD_PER_FUEL: number;
  WOOD_FORAGE_AMOUNT: number;
  FOOD_FORAGE_AMOUNT: number;
  MATERIAL_FORAGE_AMOUNT: number;
  FORAGE_COOLDOWN_TICKS: number;
  MAX_HEALTH: number;
  HUNGER_RATE: number;
  HUNGER_DAMAGE: number;
  FOOD_PER_EAT: number;
  MAX_HUNGER: number;
  BASE_DEFENSE: number;
  CLUB_DEFENSE: number;
  CLUB_MATERIAL_COST: number;
  TRAP_DEFENSE: number;
  TRAP_MATERIAL_COST: number;
  SHELTER_MATERIAL_COST: number;
  SHELTER_DEFENSE: number;
  DARKNESS_HEALTH_DAMAGE: number;
  RELIGHT_WOOD_COST: number;
  // Noise
  NOISE_DECAY: number;
  NOISE_FORAGE: number;
  NOISE_STOKE: number;
  NOISE_EAT: number;
  NOISE_BUILD: number;
  NOISE_MAX: number;
  // Creatures
  CREATURE_SPAWN_RATE: number;
  CREATURE_SPAWN_ESCALATION: number;
  CREATURE_MAX: number;
  CREATURE_SPAWN_DISTANCE: number;
  CREATURE_ATTACK_RANGE: number;
  CREATURE_DESPAWN_DISTANCE: number;
  // Detection
  DETECT_CLOSE_RANGE: number;
  DETECT_MEDIUM_RANGE: number;
  DETECT_COOLDOWN: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  TICKS_PER_HOUR,
  HOURS_TO_SURVIVE,
  FIRE_MAX,
  FIRE_BURN_RATE,
  WOOD_PER_FUEL,
  WOOD_FORAGE_AMOUNT,
  FOOD_FORAGE_AMOUNT,
  MATERIAL_FORAGE_AMOUNT,
  FORAGE_COOLDOWN_TICKS,
  MAX_HEALTH,
  HUNGER_RATE,
  HUNGER_DAMAGE,
  FOOD_PER_EAT,
  MAX_HUNGER,
  BASE_DEFENSE,
  CLUB_DEFENSE,
  CLUB_MATERIAL_COST,
  TRAP_DEFENSE,
  TRAP_MATERIAL_COST,
  SHELTER_MATERIAL_COST,
  SHELTER_DEFENSE,
  DARKNESS_HEALTH_DAMAGE,
  RELIGHT_WOOD_COST,
  NOISE_DECAY,
  NOISE_FORAGE,
  NOISE_STOKE,
  NOISE_EAT,
  NOISE_BUILD,
  NOISE_MAX,
  CREATURE_SPAWN_RATE,
  CREATURE_SPAWN_ESCALATION,
  CREATURE_MAX,
  CREATURE_SPAWN_DISTANCE,
  CREATURE_ATTACK_RANGE,
  CREATURE_DESPAWN_DISTANCE,
  DETECT_CLOSE_RANGE,
  DETECT_MEDIUM_RANGE,
  DETECT_COOLDOWN,
};
