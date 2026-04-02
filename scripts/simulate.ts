/**
 * Dark Forest Simulation Harness
 *
 * Runs headless games at full speed with bot strategies and config sweeps.
 * Usage: npx tsx scripts/simulate.ts [--runs N] [--config name] [--strategy name] [--verbose]
 */

import { type GameConfig, DEFAULT_CONFIG } from "../src/lib/constants";
import { type GameState, createInitialState } from "../src/lib/game-state";
import {
  tick,
  addWoodToFire,
  forage,
  eat,
  buildTrap,
  buildShelter,
} from "../src/lib/game-engine";

// ── Bot Strategy ──

type Action = "forage" | "eat" | "stoke" | "build_trap" | "build_shelter" | "wait";

interface Strategy {
  name: string;
  description: string;
  decide: (state: GameState, cfg: GameConfig) => Action;
}

function canForage(s: GameState): boolean {
  return s.tick >= s.forageCooldownUntil;
}

const strategies: Record<string, Strategy> = {
  balanced: {
    name: "balanced",
    description: "Maintain fire, eat when hungry, forage when possible, build defenses",
    decide(s, cfg) {
      if (s.fire < 30 && s.wood > 0) return "stoke";
      if (s.hunger > 70 && s.food > 0) return "eat";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 2) return "build_trap";
      if (s.fire < 50 && s.wood > 2) return "stoke";
      if (s.hunger > 60 && s.food > 0) return "eat";
      if (canForage(s)) return "forage";
      if (s.fire < 70 && s.wood > 4) return "stoke";
      return "wait";
    },
  },

  cautious: {
    name: "cautious",
    description: "Minimize noise, keep fire high, eat early, forage only when needed",
    decide(s, cfg) {
      if (s.fire < 60 && s.wood > 0) return "stoke";
      if (s.hunger > 40 && s.food > 0) return "eat";
      if (canForage(s) && (s.wood < 3 || s.food < 2)) return "forage";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 2) return "build_trap";
      return "wait";
    },
  },

  reckless: {
    name: "reckless",
    description: "Always doing something — forage constantly, eat often, stoke often",
    decide(s, cfg) {
      if (canForage(s)) return "forage";
      if (s.hunger > 30 && s.food > 0) return "eat";
      if (s.fire < 80 && s.wood > 0) return "stoke";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST) return "build_trap";
      return "wait";
    },
  },

  firekeeper: {
    name: "firekeeper",
    description: "Keep fire maxed — scares timid creatures but attracts predators",
    decide(s, cfg) {
      if (s.fire < 85 && s.wood > 0) return "stoke";
      if (s.hunger > 80 && s.food > 0) return "eat";
      if (canForage(s)) return "forage";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      return "wait";
    },
  },

  survivalist: {
    name: "survivalist",
    description: "Defense-focused — rush shelter and traps, then maintain",
    decide(s, cfg) {
      if (s.fire < 20 && s.wood > 0) return "stoke";
      if (s.hunger > 80 && s.food > 0) return "eat";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 3) return "build_trap";
      if (canForage(s)) return "forage";
      if (s.fire < 50 && s.wood > 0) return "stoke";
      if (s.hunger > 50 && s.food > 0) return "eat";
      return "wait";
    },
  },

  quiet: {
    name: "quiet",
    description: "Minimize noise — only act when noise is low and resources critical",
    decide(s, cfg) {
      if (s.noise > 15) return "wait";
      if (s.fire < 20 && s.wood > 0) return "stoke";
      if (s.hunger > 85 && s.food > 0) return "eat";
      if (canForage(s) && (s.wood < 2 || s.food < 1)) return "forage";
      if (s.fire < 40 && s.wood > 0) return "stoke";
      if (s.hunger > 60 && s.food > 0) return "eat";
      return "wait";
    },
  },

  dimfire: {
    name: "dimfire",
    description: "Keep fire low to avoid attracting predators",
    decide(s, cfg) {
      if (s.fire < 12 && s.wood > 0) return "stoke";
      if (s.hunger > 70 && s.food > 0) return "eat";
      if (canForage(s)) return "forage";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 2) return "build_trap";
      if (s.hunger > 50 && s.food > 0) return "eat";
      return "wait";
    },
  },
};

// ── Config Presets ──

const configPresets: Record<string, Partial<GameConfig>> = {
  default: {},

  easy: {
    FIRE_BURN_RATE: 0.4,
    WOOD_PER_FUEL: 14,
    HUNGER_RATE: 0.15,
    FOOD_PER_EAT: 20,
    WOOD_FORAGE_AMOUNT: 3,
    FOOD_FORAGE_AMOUNT: 2,
    FORAGE_COOLDOWN_TICKS: 8,
    CREATURE_SPAWN_RATE: 0.015,
    CREATURE_SPAWN_ESCALATION: 0.0002,
    NOISE_DECAY: 3,
  },

  hard: {
    FIRE_BURN_RATE: 0.65,
    WOOD_PER_FUEL: 8,
    HUNGER_RATE: 0.25,
    FOOD_PER_EAT: 12,
    HUNGER_DAMAGE: 1.0,
    FORAGE_COOLDOWN_TICKS: 12,
    CREATURE_SPAWN_RATE: 0.035,
    CREATURE_SPAWN_ESCALATION: 0.0006,
    NOISE_DECAY: 1.5,
    NOISE_FORAGE: 45,
  },

  nightmare: {
    FIRE_BURN_RATE: 0.75,
    WOOD_PER_FUEL: 7,
    HUNGER_RATE: 0.28,
    FOOD_PER_EAT: 10,
    HUNGER_DAMAGE: 1.2,
    FORAGE_COOLDOWN_TICKS: 14,
    CREATURE_SPAWN_RATE: 0.05,
    CREATURE_SPAWN_ESCALATION: 0.001,
    CREATURE_MAX: 12,
    NOISE_DECAY: 1,
    NOISE_FORAGE: 50,
    NOISE_BUILD: 60,
  },

  short_game: {
    HOURS_TO_SURVIVE: 24,
    TICKS_PER_HOUR: 20,
    CREATURE_SPAWN_ESCALATION: 0.0006,
  },

  long_game: {
    HOURS_TO_SURVIVE: 72,
    TICKS_PER_HOUR: 20,
    CREATURE_SPAWN_ESCALATION: 0.0002,
  },
};

// ── Simulation Runner ──

interface RunResult {
  status: "won" | "dead";
  hoursSurvived: number;
  ticksSurvived: number;
  causeOfDeath: string | null;
  finalHealth: number;
  finalFire: number;
  actionsPerformed: Record<Action, number>;
  peakWood: number;
  peakFood: number;
  trapsBuilt: number;
  shelterBuilt: boolean;
  peakNoise: number;
  avgNoise: number;
  creaturesEncountered: number;
}

function runGame(strategy: Strategy, cfg: GameConfig, seed: number): RunResult {
  let state = createInitialState();
  state.lastSavedAt = 0;
  // Use seed to vary RNG without large tick offsets
  // Offset by small amount so each run has unique random sequence
  state.tick = seed * 7;

  const actions: Record<Action, number> = {
    forage: 0, eat: 0, stoke: 0, build_trap: 0, build_shelter: 0, wait: 0,
  };
  let peakWood = state.wood;
  let peakFood = state.food;
  let peakNoise = 0;
  let totalNoise = 0;
  let creaturesEncountered = 0;

  const maxTotal = cfg.TICKS_PER_HOUR * (cfg.HOURS_TO_SURVIVE + 5);

  let tickCount = 0;
  while (state.status === "playing" && tickCount < maxTotal) {
    const action = strategy.decide(state, cfg);
    actions[action]++;

    switch (action) {
      case "stoke": state = addWoodToFire(state, cfg); break;
      case "forage": state = forage(state, cfg); break;
      case "eat": state = eat(state, cfg); break;
      case "build_trap": state = buildTrap(state, cfg); break;
      case "build_shelter": state = buildShelter(state, cfg); break;
      case "wait": break;
    }

    const creatureIdsBefore = new Set(state.creatures.map(c => c.id));
    state = tick(state, cfg);
    tickCount++;

    if (state.wood > peakWood) peakWood = state.wood;
    if (state.food > peakFood) peakFood = state.food;
    if (state.noise > peakNoise) peakNoise = state.noise;
    totalNoise += state.noise;
    for (const id of creatureIdsBefore) {
      if (!state.creatures.some(c => c.id === id)) {
        creaturesEncountered++;
      }
    }
  }

  let causeOfDeath: string | null = null;
  if (state.status === "dead") {
    const deathLog = state.log[state.log.length - 1]?.message ?? "";
    if (deathLog.includes("fire") || deathLog.includes("Darkness swallows")) {
      causeOfDeath = "fire";
    } else if (deathLog.includes("starvation") || deathLog.includes("collapse")) {
      causeOfDeath = "starvation";
    } else {
      causeOfDeath = "creature";
    }
  }

  return {
    status: state.status as "won" | "dead",
    hoursSurvived: state.hour,
    ticksSurvived: tickCount,
    causeOfDeath,
    finalHealth: state.health,
    finalFire: state.fire,
    actionsPerformed: actions,
    peakWood,
    peakFood,
    trapsBuilt: state.traps,
    shelterBuilt: state.hasShelter,
    peakNoise,
    avgNoise: tickCount > 0 ? totalNoise / tickCount : 0,
    creaturesEncountered,
  };
}

// ── Stats ──

interface AggregateStats {
  runs: number; wins: number; winRate: number;
  avgHours: number; medianHours: number;
  deaths: { fire: number; starvation: number; creature: number };
  deathRates: { fire: string; starvation: string; creature: string };
  avgNoise: number; avgCreatures: number;
  shelterRate: number; avgTraps: number;
}

function aggregate(results: RunResult[]): AggregateStats {
  const n = results.length;
  const wins = results.filter((r) => r.status === "won").length;
  const deaths = { fire: 0, starvation: 0, creature: 0 };
  let totalHours = 0, totalNoise = 0, totalCreatures = 0, shelters = 0, totalTraps = 0;
  const hoursList: number[] = [];

  for (const r of results) {
    totalHours += r.hoursSurvived;
    totalNoise += r.avgNoise;
    totalCreatures += r.creaturesEncountered;
    if (r.shelterBuilt) shelters++;
    totalTraps += r.trapsBuilt;
    hoursList.push(r.hoursSurvived);
    if (r.causeOfDeath === "fire") deaths.fire++;
    else if (r.causeOfDeath === "starvation") deaths.starvation++;
    else if (r.causeOfDeath === "creature") deaths.creature++;
  }

  hoursList.sort((a, b) => a - b);
  const totalDeaths = deaths.fire + deaths.starvation + deaths.creature;
  const pct = (v: number) => totalDeaths > 0 ? ((v / totalDeaths) * 100).toFixed(1) + "%" : "0%";

  return {
    runs: n, wins, winRate: wins / n,
    avgHours: totalHours / n,
    medianHours: hoursList[Math.floor(n / 2)],
    deaths,
    deathRates: { fire: pct(deaths.fire), starvation: pct(deaths.starvation), creature: pct(deaths.creature) },
    avgNoise: totalNoise / n,
    avgCreatures: totalCreatures / n,
    shelterRate: shelters / n,
    avgTraps: totalTraps / n,
  };
}

// ── Output ──

function printComparisonTable(
  results: Array<{ config: string; strategy: string; stats: AggregateStats }>
) {
  console.log("\n" + "=".repeat(90));
  console.log("  COMPARISON TABLE");
  console.log("=".repeat(90));
  console.log(
    "  Config".padEnd(16) + "Strategy".padEnd(14) +
    "Win%".padStart(7) + "AvgHr".padStart(7) +
    "Fire%".padStart(8) + "Starve%".padStart(9) + "Creature%".padStart(11) +
    "AvgNoise".padStart(10) + "Fights".padStart(8)
  );
  console.log("  " + "-".repeat(84));

  for (const r of results) {
    console.log(
      `  ${r.config.padEnd(14)}${r.strategy.padEnd(14)}` +
      `${(r.stats.winRate * 100).toFixed(1).padStart(6)}%` +
      `${r.stats.avgHours.toFixed(0).padStart(6)}` +
      `${r.stats.deathRates.fire.padStart(8)}` +
      `${r.stats.deathRates.starvation.padStart(9)}` +
      `${r.stats.deathRates.creature.padStart(11)}` +
      `${r.stats.avgNoise.toFixed(1).padStart(9)}` +
      `${r.stats.avgCreatures.toFixed(1).padStart(8)}`
    );
  }
  console.log("=".repeat(90));
}

// ── CLI ──

function parseArgs() {
  const args = process.argv.slice(2);
  let runs = 1000, configs = ["default"], selectedStrategies = ["balanced"];
  let verbose = false, sweep = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--runs": case "-n": runs = parseInt(args[++i], 10); break;
      case "--config": case "-c": configs = args[++i].split(","); break;
      case "--strategy": case "-s": selectedStrategies = args[++i].split(","); break;
      case "--verbose": case "-v": verbose = true; break;
      case "--sweep": sweep = true; break;
      case "--list":
        console.log("\nStrategies:");
        for (const [k, v] of Object.entries(strategies)) console.log(`  ${k.padEnd(14)} ${v.description}`);
        console.log("\nConfigs:");
        for (const k of Object.keys(configPresets)) console.log(`  ${k}`);
        process.exit(0);
      case "--help": case "-h":
        console.log(`\nUsage: npx tsx scripts/simulate.ts [options]\n  -n N  -c config  -s strategy  --sweep  --list  -v  -h`);
        process.exit(0);
    }
  }
  if (sweep) { configs = Object.keys(configPresets); selectedStrategies = Object.keys(strategies); }
  return { runs, configs, strategies: selectedStrategies, verbose, sweep };
}

function main() {
  const opts = parseArgs();
  console.log(`\nDark Forest Sim — ${opts.runs} runs | ${opts.configs.join(",")} | ${opts.strategies.join(",")}`);

  const allResults: Array<{ config: string; strategy: string; stats: AggregateStats }> = [];
  const t0 = performance.now();

  for (const configName of opts.configs) {
    const preset = configPresets[configName];
    if (!preset) { console.error(`Unknown config: ${configName}`); continue; }
    const cfg: GameConfig = { ...DEFAULT_CONFIG, ...preset };

    for (const stratName of opts.strategies) {
      const strategy = strategies[stratName];
      if (!strategy) { console.error(`Unknown strategy: ${stratName}`); continue; }

      const results: RunResult[] = [];
      for (let i = 0; i < opts.runs; i++) {
        const result = runGame(strategy, cfg, i);
        results.push(result);
        if (opts.verbose) {
          console.log(`  #${i + 1}: ${result.status} hr${result.hoursSurvived} fights=${result.creaturesEncountered}${result.causeOfDeath ? ` [${result.causeOfDeath}]` : ""}`);
        }
      }
      const stats = aggregate(results);
      allResults.push({ config: configName, strategy: stratName, stats });
    }
  }

  printComparisonTable(allResults);
  console.log(`\nDone in ${((performance.now() - t0) / 1000).toFixed(2)}s\n`);
}

main();
