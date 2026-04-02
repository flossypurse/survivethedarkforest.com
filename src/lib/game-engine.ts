import {
  type GameConfig,
  DEFAULT_CONFIG,
} from "./constants";
import { type GameState, type CreatureType, addLog } from "./game-state";

// ── Deterministic RNG seeded by tick ──

function seededRandom(tick: number, salt: number = 0): number {
  // MurmurHash3 finalizer — uniform distribution across full [0, 1) range
  let h = (tick + salt * 374761393) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

// ── Creature type parameters (internal, not in GameConfig) ──

interface CreatureParams {
  baseSpeed: number; // movement toward camp per tick
  noiseFactor: number; // extra speed per (noise/max) unit
  damageMin: number;
  damageMax: number;
  fireFleeThreshold: number; // flee if fire above this (-1 = never flee)
  fleeSpeed: number;
  fireAttract: boolean; // attracted to fire?
  fireAttractThreshold: number;
  fireAttractSpeed: number; // extra speed when attracted to fire
  spawnWeight: number; // relative spawn probability
}

const CREATURE_PARAMS: Record<CreatureType, CreatureParams> = {
  timid: {
    baseSpeed: 0.2,
    noiseFactor: 0.5,
    damageMin: 3,
    damageMax: 8,
    fireFleeThreshold: 50,
    fleeSpeed: 1.5,
    fireAttract: false,
    fireAttractThreshold: -1,
    fireAttractSpeed: 0,
    spawnWeight: 30,
  },
  predator: {
    baseSpeed: 0.5,
    noiseFactor: 0.8,
    damageMin: 12,
    damageMax: 24,
    fireFleeThreshold: -1,
    fleeSpeed: 0,
    fireAttract: true,
    fireAttractThreshold: 20,
    fireAttractSpeed: 0.4,
    spawnWeight: 40,
  },
  stalker: {
    baseSpeed: 0.35,
    noiseFactor: 0.2,
    damageMin: 8,
    damageMax: 16,
    fireFleeThreshold: -1,
    fleeSpeed: 0,
    fireAttract: false,
    fireAttractThreshold: -1,
    fireAttractSpeed: 0,
    spawnWeight: 30,
  },
};

const TOTAL_SPAWN_WEIGHT = Object.values(CREATURE_PARAMS).reduce(
  (sum, p) => sum + p.spawnWeight, 0
);

function pickCreatureType(tick: number): CreatureType {
  const roll = seededRandom(tick, 55) * TOTAL_SPAWN_WEIGHT;
  let cumulative = 0;
  for (const [type, params] of Object.entries(CREATURE_PARAMS)) {
    cumulative += params.spawnWeight;
    if (roll < cumulative) return type as CreatureType;
  }
  return "timid";
}

// ── Direction helpers ──

function distance(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function getDirection8(x: number, y: number): string {
  const angle = Math.atan2(y, x) * 180 / Math.PI;
  if (angle > 157.5 || angle <= -157.5) return "west";
  if (angle > 112.5) return "northwest";
  if (angle > 67.5) return "north";
  if (angle > 22.5) return "northeast";
  if (angle > -22.5) return "east";
  if (angle > -67.5) return "southeast";
  if (angle > -112.5) return "south";
  return "southwest";
}

function getDirection4(x: number, y: number): string {
  const angle = Math.atan2(y, x) * 180 / Math.PI;
  if (angle > 135 || angle <= -135) return "west";
  if (angle > 45) return "north";
  if (angle > -45) return "east";
  return "south";
}

// ── Detection messages ──

const CLOSE_SOUNDS: Record<CreatureType, string[]> = {
  timid: [
    "A small creature skitters",
    "Something rustles in the brush",
    "Twigs snap underfoot",
  ],
  predator: [
    "A low growl rises",
    "Heavy breathing comes from",
    "Something large stalks",
  ],
  stalker: [
    "You sense something watching",
    "The hairs on your neck rise —\u2009something lurks",
    "A patient presence waits",
  ],
};

const MEDIUM_SOUNDS: string[] = [
  "Something moves in the darkness",
  "You hear movement",
  "Branches shift",
  "Leaves crunch",
];

// ── Attack messages ──

const ATTACK_MESSAGES: Record<CreatureType, string[]> = {
  timid: [
    "A cornered creature lashes out from the",
    "Something small and desperate bites from the",
  ],
  predator: [
    "A predator lunges from the",
    "Claws slash from the",
    "Jaws snap from the",
    "A dark shape charges from the",
  ],
  stalker: [
    "Something strikes without warning from the",
    "A shadow materializes and attacks from the",
    "The thing that was watching finally moves — from the",
  ],
};

// ── Core tick ──

export function tick(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing") return state;

  const s = { ...state, creatures: [...state.creatures] };
  s.tick += 1;
  s.phaseTick += 1;

  // ── Noise decay ──
  s.noise = Math.max(0, s.noise - cfg.NOISE_DECAY);

  // ── Phase transitions ──
  if (s.phase === "day" && s.phaseTick >= cfg.DAY_DURATION_TICKS) {
    s.phase = "night";
    s.phaseTick = 0;
    addLog(s, "Night falls. The darkness presses in.", "danger");
  } else if (s.phase === "night" && s.phaseTick >= cfg.NIGHT_DURATION_TICKS) {
    s.phase = "day";
    s.phaseTick = 0;
    s.day += 1;

    if (s.day > cfg.DAYS_TO_SURVIVE) {
      s.status = "won";
      addLog(s, "Dawn breaks on day 8. You survived the dark forest.", "success");
      return s;
    }

    addLog(s, `Day ${s.day} begins. You made it through the night.`, "success");
  }

  // ── Fire decay ──
  const burnRate = s.phase === "night" ? cfg.FIRE_NIGHT_BURN_RATE : cfg.FIRE_BURN_RATE;
  s.fire = Math.max(0, s.fire - burnRate);

  if (s.fire <= 0) {
    addLog(s, "The fire has gone out. Darkness swallows you.", "danger");
    s.status = "dead";
    return s;
  }

  if (s.fire < 20 && s.phaseTick % 30 === 0) {
    addLog(s, "The fire is dying. Add wood.", "danger");
  }

  // ── Hunger ──
  s.hunger = Math.min(cfg.MAX_HUNGER, s.hunger + cfg.HUNGER_RATE);
  if (s.hunger >= cfg.MAX_HUNGER) {
    s.health = Math.max(0, s.health - cfg.HUNGER_DAMAGE);
    if (s.health <= 0) {
      s.status = "dead";
      addLog(s, "You collapse from starvation.", "danger");
      return s;
    }
    if (s.phaseTick % 20 === 0) {
      addLog(s, "You're starving. Eat something.", "danger");
    }
  }

  // ── Creature spawning (night only) ──
  // Fire acts as a beacon — higher fire slightly increases spawn rate
  if (s.phase === "night" && s.creatures.length < cfg.CREATURE_MAX) {
    const fireBeacon = 1 + (s.fire / cfg.FIRE_MAX) * 0.8; // up to 80% more spawns at max fire
    const spawnChance = (cfg.CREATURE_SPAWN_RATE +
      cfg.CREATURE_SPAWN_ESCALATION * (s.day - 1)) * fireBeacon;
    if (seededRandom(s.tick, 50) < spawnChance) {
      const angle = seededRandom(s.tick, 51) * Math.PI * 2;
      const type = pickCreatureType(s.tick);
      s.creatures.push({
        id: s.nextCreatureId,
        type,
        x: Math.cos(angle) * cfg.CREATURE_SPAWN_DISTANCE,
        y: Math.sin(angle) * cfg.CREATURE_SPAWN_DISTANCE,
        spawnTick: s.tick,
      });
      s.nextCreatureId += 1;
    }
  }

  // ── Creature movement ──
  const noiseRatio = s.noise / cfg.NOISE_MAX;
  s.creatures = s.creatures.map((c, _i) => {
    const dist = distance(c.x, c.y);
    if (dist < 0.1) return c; // at camp, will attack

    const params = CREATURE_PARAMS[c.type];

    // Unit vector toward camp (origin)
    const dx = -c.x / dist;
    const dy = -c.y / dist;

    // Daytime: drift away from camp
    if (s.phase === "day") {
      return {
        ...c,
        x: c.x - dx * cfg.CREATURE_DAY_DRIFT,
        y: c.y - dy * cfg.CREATURE_DAY_DRIFT,
      };
    }

    // Fire flee check (timid creatures)
    if (params.fireFleeThreshold > 0 && s.fire > params.fireFleeThreshold && dist < 50) {
      return {
        ...c,
        x: c.x - dx * params.fleeSpeed,
        y: c.y - dy * params.fleeSpeed,
      };
    }

    // Calculate approach speed
    let speed = params.baseSpeed + params.noiseFactor * noiseRatio;

    // Darkness emboldens creatures — low fire means faster approach
    // At fire 100: 1.0x speed. At fire 0: 2.0x speed.
    const darknessFactor = 1 + (1 - s.fire / cfg.FIRE_MAX) * 1.0;
    speed *= darknessFactor;

    // Predators attracted to fire
    if (params.fireAttract && s.fire > params.fireAttractThreshold) {
      speed += params.fireAttractSpeed * (s.fire / cfg.FIRE_MAX);
    }

    // Small wander jitter so creatures don't all stack
    const jitterAngle = seededRandom(s.tick, 70 + c.id) * Math.PI * 2;
    const jitter = 0.15;

    return {
      ...c,
      x: c.x + dx * speed + Math.cos(jitterAngle) * jitter,
      y: c.y + dy * speed + Math.sin(jitterAngle) * jitter,
    };
  });

  // ── Creature attacks ──
  const attackers = s.creatures.filter(c =>
    distance(c.x, c.y) <= cfg.CREATURE_ATTACK_RANGE
  );
  if (attackers.length > 0) {
    // Remove attackers from creature list
    const attackerIds = new Set(attackers.map(a => a.id));
    s.creatures = s.creatures.filter(c => !attackerIds.has(c.id));

    for (const c of attackers) {
      const params = CREATURE_PARAMS[c.type];
      const rawDamage = params.damageMin +
        seededRandom(s.tick, 60 + c.id) * (params.damageMax - params.damageMin);
      const defense = cfg.BASE_DEFENSE +
        s.traps * cfg.TRAP_DEFENSE +
        (s.hasShelter ? cfg.SHELTER_DEFENSE : 0);
      const damage = Math.max(1, rawDamage - defense);

      const dir = getDirection8(c.x, c.y);
      const messages = ATTACK_MESSAGES[c.type];
      const msg = messages[Math.floor(seededRandom(s.tick, 80 + c.id) * messages.length)];
      addLog(s, `${msg} ${dir}! ${Math.round(damage)} damage.`, "danger");

      s.health = Math.max(0, s.health - damage);

      // Traps can break
      if (s.traps > 0 && seededRandom(s.tick, 13 + c.id) < 0.3) {
        s.traps -= 1;
        addLog(s, "A trap is destroyed in the attack.", "info");
      }

      if (s.health <= 0) {
        s.status = "dead";
        addLog(s, "The forest claims you.", "danger");
        return s;
      }
    }
  }

  // ── Detection — player hearing creatures ──
  // Fire provides light: detection range scales with fire brightness
  // At fire 0: 30% range. At fire 100: 100% range.
  if (s.tick % cfg.DETECT_COOLDOWN === 0 && s.creatures.length > 0) {
    const fireVisibility = 0.3 + 0.7 * (s.fire / cfg.FIRE_MAX);
    const closeRange = cfg.DETECT_CLOSE_RANGE * fireVisibility;
    const mediumRange = cfg.DETECT_MEDIUM_RANGE * fireVisibility;

    const sorted = [...s.creatures]
      .map(c => ({ c, dist: distance(c.x, c.y) }))
      .filter(({ dist }) => dist < mediumRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    for (const { c, dist } of sorted) {
      if (dist < closeRange) {
        // Precise 8-direction + creature-specific sound
        const dir = getDirection8(c.x, c.y);
        const sounds = CLOSE_SOUNDS[c.type];
        const sound = sounds[Math.floor(seededRandom(s.tick, 90 + c.id) * sounds.length)];
        addLog(s, `${sound} to the ${dir}.`, "danger");
      } else {
        // Vague 4-direction
        const dir = getDirection4(c.x, c.y);
        const sound = MEDIUM_SOUNDS[
          Math.floor(seededRandom(s.tick, 95 + c.id) * MEDIUM_SOUNDS.length)
        ];
        addLog(s, `${sound} to the ${dir}.`, "info");
      }
    }
  }

  // ── Creature cleanup — remove those that drifted too far ──
  s.creatures = s.creatures.filter(c =>
    distance(c.x, c.y) < cfg.CREATURE_DESPAWN_DISTANCE
  );

  // ── Ambient events (rare, for flavor) ──
  if (s.phaseTick % 45 === 0 && s.phase === "night" && s.creatures.length === 0) {
    const ambients = [
      "An owl calls in the distance.",
      "Wind rustles the canopy above.",
      "The fire pops and sparks swirl upward.",
    ];
    const idx = Math.floor(seededRandom(s.tick, 33) * ambients.length);
    addLog(s, ambients[idx], "info");
  }

  return s;
}

// ── Player actions ──

export function addWoodToFire(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing" || state.wood <= 0) return state;
  const s = { ...state };
  s.wood -= 1;
  s.fire = Math.min(cfg.FIRE_MAX, s.fire + cfg.WOOD_PER_FUEL);
  s.noise = Math.min(cfg.NOISE_MAX, s.noise + cfg.NOISE_STOKE);
  addLog(s, "You feed the fire. It flares brighter.", "info");
  return s;
}

export function forage(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing") return state;
  if (state.phase === "night") {
    addLog(state, "Too dangerous to forage at night.", "danger");
    return state;
  }
  if (state.tick < state.forageCooldownUntil) return state;

  const s = { ...state };
  s.forageCooldownUntil = s.tick + cfg.FORAGE_COOLDOWN_TICKS;
  s.noise = Math.min(cfg.NOISE_MAX, s.noise + cfg.NOISE_FORAGE);

  // Randomize what you find
  const roll = seededRandom(s.tick, 77);
  if (roll < 0.45) {
    s.wood += cfg.WOOD_FORAGE_AMOUNT;
    addLog(s, `You gather ${cfg.WOOD_FORAGE_AMOUNT} wood from the forest edge.`, "info");
  } else if (roll < 0.75) {
    s.food += cfg.FOOD_FORAGE_AMOUNT;
    addLog(s, `You find ${cfg.FOOD_FORAGE_AMOUNT} food — berries and roots.`, "info");
  } else if (roll < 0.9) {
    s.wood += cfg.WOOD_FORAGE_AMOUNT;
    s.food += 1;
    addLog(s, "A good haul — wood and some edible mushrooms.", "success");
  } else {
    s.materials += cfg.MATERIAL_FORAGE_AMOUNT;
    s.wood += 1;
    addLog(s, "You find useful materials — stone and vine.", "discovery");
  }

  return s;
}

export function eat(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing" || state.food <= 0) return state;
  const s = { ...state };
  s.food -= 1;
  s.hunger = Math.max(0, s.hunger - cfg.FOOD_PER_EAT);
  s.health = Math.min(cfg.MAX_HEALTH, s.health + 1);
  s.noise = Math.min(cfg.NOISE_MAX, s.noise + cfg.NOISE_EAT);
  addLog(s, "You eat. The warmth settles in your stomach.", "info");
  return s;
}

export function buildTrap(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing" || state.materials < cfg.TRAP_MATERIAL_COST) return state;
  const s = { ...state };
  s.materials -= cfg.TRAP_MATERIAL_COST;
  s.traps += 1;
  s.noise = Math.min(cfg.NOISE_MAX, s.noise + cfg.NOISE_BUILD);
  addLog(s, "You set a trap at the perimeter.", "success");
  return s;
}

export function buildShelter(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  if (state.status !== "playing" || state.hasShelter || state.materials < cfg.SHELTER_MATERIAL_COST)
    return state;
  const s = { ...state };
  s.materials -= cfg.SHELTER_MATERIAL_COST;
  s.hasShelter = true;
  s.noise = Math.min(cfg.NOISE_MAX, s.noise + cfg.NOISE_BUILD);
  addLog(s, "You build a rough shelter. It won't stop everything, but it helps.", "success");
  return s;
}

// ── Offline catch-up ──

export function simulateOfflineTime(state: GameState, cfg: GameConfig = DEFAULT_CONFIG): GameState {
  const now = Date.now();
  const elapsed = now - state.lastSavedAt;
  const missedTicks = Math.floor(elapsed / 1000);

  if (missedTicks <= 1) return state;

  const ticksToSimulate = Math.min(missedTicks, 600);
  let s = { ...state };

  const logBefore = s.log.length;

  for (let i = 0; i < ticksToSimulate && s.status === "playing"; i++) {
    s = tick(s, cfg);
  }

  if (ticksToSimulate > 10) {
    const offlineMinutes = Math.round(ticksToSimulate / 60);
    s.log.splice(logBefore, 0, {
      tick: state.tick,
      day: state.day,
      phase: state.phase,
      message: `— ${offlineMinutes} minute${offlineMinutes === 1 ? "" : "s"} passed while you were away —`,
      type: "info",
    });
  }

  s.lastSavedAt = now;
  return s;
}
