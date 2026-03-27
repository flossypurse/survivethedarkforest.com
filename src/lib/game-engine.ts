import {
  DAY_DURATION_TICKS,
  NIGHT_DURATION_TICKS,
  FIRE_BURN_RATE,
  FIRE_NIGHT_BURN_RATE,
  WOOD_PER_FUEL,
  FIRE_MAX,
  WOOD_FORAGE_AMOUNT,
  FOOD_FORAGE_AMOUNT,
  MATERIAL_FORAGE_AMOUNT,
  FORAGE_COOLDOWN_TICKS,
  HUNGER_RATE,
  HUNGER_DAMAGE,
  FOOD_PER_EAT,
  MAX_HUNGER,
  MAX_HEALTH,
  TRAP_MATERIAL_COST,
  TRAP_DEFENSE,
  SHELTER_MATERIAL_COST,
  SHELTER_DEFENSE,
  BASE_DEFENSE,
  THREAT_BASE_CHANCE,
  THREAT_ESCALATION,
  THREAT_DAMAGE_MIN,
  THREAT_DAMAGE_MAX,
  FIRE_THREAT_REDUCTION,
  DAYS_TO_SURVIVE,
} from "./constants";
import { type GameState, addLog } from "./game-state";

// ── Deterministic RNG seeded by tick ──

function seededRandom(tick: number, salt: number = 0): number {
  let h = (tick * 2654435761 + salt * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h >>> 0) / 0xffffffff;
}

// ── Core tick ──

export function tick(state: GameState): GameState {
  if (state.status !== "playing") return state;

  const s = { ...state };
  s.tick += 1;
  s.phaseTick += 1;

  // Phase transitions
  if (s.phase === "day" && s.phaseTick >= DAY_DURATION_TICKS) {
    s.phase = "night";
    s.phaseTick = 0;
    addLog(s, "Night falls. The darkness presses in.", "danger");
  } else if (s.phase === "night" && s.phaseTick >= NIGHT_DURATION_TICKS) {
    s.phase = "day";
    s.phaseTick = 0;
    s.day += 1;

    if (s.day > DAYS_TO_SURVIVE) {
      s.status = "won";
      addLog(s, "Dawn breaks on day 8. You survived the dark forest.", "success");
      return s;
    }

    addLog(s, `Day ${s.day} begins. You made it through the night.`, "success");
  }

  // Fire decay
  const burnRate = s.phase === "night" ? FIRE_NIGHT_BURN_RATE : FIRE_BURN_RATE;
  s.fire = Math.max(0, s.fire - burnRate);

  if (s.fire <= 0) {
    addLog(s, "The fire has gone out. Darkness swallows you.", "danger");
    s.status = "dead";
    return s;
  }

  if (s.fire < 20 && s.phaseTick % 30 === 0) {
    addLog(s, "The fire is dying. Add wood.", "danger");
  }

  // Hunger
  s.hunger = Math.min(MAX_HUNGER, s.hunger + HUNGER_RATE);
  if (s.hunger >= MAX_HUNGER) {
    s.health = Math.max(0, s.health - HUNGER_DAMAGE);
    if (s.health <= 0) {
      s.status = "dead";
      addLog(s, "You collapse from starvation.", "danger");
      return s;
    }
    if (s.phaseTick % 20 === 0) {
      addLog(s, "You're starving. Eat something.", "danger");
    }
  }

  // Night threats
  if (s.phase === "night") {
    const fireFactor = 1 - (s.fire / FIRE_MAX) * FIRE_THREAT_REDUCTION;
    const chance =
      (THREAT_BASE_CHANCE + THREAT_ESCALATION * (s.day - 1)) * fireFactor;

    if (seededRandom(s.tick, 42) < chance) {
      const defense =
        BASE_DEFENSE + s.traps * TRAP_DEFENSE + (s.hasShelter ? SHELTER_DEFENSE : 0);
      const rawDamage =
        THREAT_DAMAGE_MIN +
        seededRandom(s.tick, 99) * (THREAT_DAMAGE_MAX - THREAT_DAMAGE_MIN);
      const damage = Math.max(1, rawDamage - defense);

      const creatures = [
        "Something lunges from the darkness",
        "Eyes gleam at the edge of the firelight",
        "A shape crashes through the underbrush",
        "Claws scrape against wood nearby",
        "A low growl rises from the shadows",
      ];
      const creature =
        creatures[Math.floor(seededRandom(s.tick, 7) * creatures.length)];

      s.health = Math.max(0, s.health - damage);
      addLog(s, `${creature}. You take ${Math.round(damage)} damage.`, "danger");

      if (s.health <= 0) {
        s.status = "dead";
        addLog(s, "The forest claims you.", "danger");
        return s;
      }

      // Traps can break
      if (s.traps > 0 && seededRandom(s.tick, 13) < 0.3) {
        s.traps -= 1;
        addLog(s, "A trap is destroyed in the attack.", "info");
      }
    }
  }

  // Ambient events (rare, for flavor)
  if (s.phaseTick % 45 === 0 && s.phase === "night") {
    const ambients = [
      "An owl calls in the distance.",
      "Wind rustles the canopy above.",
      "Something snaps a branch far away.",
      "The fire pops and sparks swirl upward.",
      "A distant howl echoes through the trees.",
    ];
    const idx = Math.floor(seededRandom(s.tick, 33) * ambients.length);
    addLog(s, ambients[idx], "info");
  }

  return s;
}

// ── Player actions ──

export function addWoodToFire(state: GameState): GameState {
  if (state.status !== "playing" || state.wood <= 0) return state;
  const s = { ...state };
  s.wood -= 1;
  s.fire = Math.min(FIRE_MAX, s.fire + WOOD_PER_FUEL);
  addLog(s, "You feed the fire. It flares brighter.", "info");
  return s;
}

export function forage(state: GameState): GameState {
  if (state.status !== "playing") return state;
  if (state.phase === "night") {
    addLog(state, "Too dangerous to forage at night.", "danger");
    return state;
  }
  if (state.tick < state.forageCooldownUntil) return state;

  const s = { ...state };
  s.forageCooldownUntil = s.tick + FORAGE_COOLDOWN_TICKS;

  // Randomize what you find
  const roll = seededRandom(s.tick, 77);
  if (roll < 0.45) {
    s.wood += WOOD_FORAGE_AMOUNT;
    addLog(s, `You gather ${WOOD_FORAGE_AMOUNT} wood from the forest edge.`, "info");
  } else if (roll < 0.75) {
    s.food += FOOD_FORAGE_AMOUNT;
    addLog(s, `You find ${FOOD_FORAGE_AMOUNT} food — berries and roots.`, "info");
  } else if (roll < 0.9) {
    s.wood += WOOD_FORAGE_AMOUNT;
    s.food += 1;
    addLog(s, "A good haul — wood and some edible mushrooms.", "success");
  } else {
    s.materials += MATERIAL_FORAGE_AMOUNT;
    s.wood += 1;
    addLog(s, "You find useful materials — stone and vine.", "discovery");
  }

  return s;
}

export function eat(state: GameState): GameState {
  if (state.status !== "playing" || state.food <= 0) return state;
  const s = { ...state };
  s.food -= 1;
  s.hunger = Math.max(0, s.hunger - FOOD_PER_EAT);
  s.health = Math.min(MAX_HEALTH, s.health + 2); // small heal from eating
  addLog(s, "You eat. The warmth settles in your stomach.", "info");
  return s;
}

export function buildTrap(state: GameState): GameState {
  if (state.status !== "playing" || state.materials < TRAP_MATERIAL_COST) return state;
  const s = { ...state };
  s.materials -= TRAP_MATERIAL_COST;
  s.traps += 1;
  addLog(s, "You set a trap at the perimeter.", "success");
  return s;
}

export function buildShelter(state: GameState): GameState {
  if (state.status !== "playing" || state.hasShelter || state.materials < SHELTER_MATERIAL_COST)
    return state;
  const s = { ...state };
  s.materials -= SHELTER_MATERIAL_COST;
  s.hasShelter = true;
  addLog(s, "You build a rough shelter. It won't stop everything, but it helps.", "success");
  return s;
}

// ── Offline catch-up ──

export function simulateOfflineTime(state: GameState): GameState {
  const now = Date.now();
  const elapsed = now - state.lastSavedAt;
  const missedTicks = Math.floor(elapsed / 1000);

  if (missedTicks <= 1) return state;

  // Cap offline simulation to prevent long freezes
  const ticksToSimulate = Math.min(missedTicks, 600); // max 10 minutes
  let s = { ...state };

  const logBefore = s.log.length;

  for (let i = 0; i < ticksToSimulate && s.status === "playing"; i++) {
    s = tick(s);
  }

  if (ticksToSimulate > 10) {
    const offlineMinutes = Math.round(ticksToSimulate / 60);
    // Prepend a summary before the offline logs
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
