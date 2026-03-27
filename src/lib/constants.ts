// ── Time ──
export const TICK_MS = 1000; // game ticks once per second
export const DAY_DURATION_TICKS = 180; // 3 minutes of daylight
export const NIGHT_DURATION_TICKS = 120; // 2 minutes of night
export const CYCLE_TICKS = DAY_DURATION_TICKS + NIGHT_DURATION_TICKS;

// ── Fire ──
export const FIRE_MAX = 100;
export const FIRE_BURN_RATE = 0.35; // fuel consumed per tick
export const FIRE_NIGHT_BURN_RATE = 0.55; // burns faster at night
export const WOOD_PER_FUEL = 15; // fire fuel gained per wood added

// ── Resources ──
export const WOOD_FORAGE_AMOUNT = 3;
export const FOOD_FORAGE_AMOUNT = 2;
export const MATERIAL_FORAGE_AMOUNT = 1;
export const FORAGE_COOLDOWN_TICKS = 8; // seconds between forages

// ── Survival ──
export const MAX_HEALTH = 100;
export const HUNGER_RATE = 0.15; // hunger per tick
export const HUNGER_DAMAGE = 0.5; // health lost per tick when starving
export const FOOD_PER_EAT = 25; // hunger restored per food consumed
export const MAX_HUNGER = 100; // 0 = full, 100 = starving

// ── Defense ──
export const BASE_DEFENSE = 1;
export const TRAP_DEFENSE = 3;
export const TRAP_MATERIAL_COST = 5;
export const SHELTER_MATERIAL_COST = 10;
export const SHELTER_DEFENSE = 5;

// ── Night threats ──
export const THREAT_BASE_CHANCE = 0.02; // per tick during night
export const THREAT_ESCALATION = 0.005; // additional chance per survived day
export const THREAT_DAMAGE_MIN = 5;
export const THREAT_DAMAGE_MAX = 20;
export const FIRE_THREAT_REDUCTION = 0.5; // fire brightness reduces threat chance

// ── Win condition ──
export const DAYS_TO_SURVIVE = 7;

// ── Storage key ──
export const STORAGE_KEY = "dark-forest-state";
