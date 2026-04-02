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
  return s.phase === "day" && s.tick >= s.forageCooldownUntil;
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

  hoarder: {
    name: "hoarder",
    description: "Forage aggressively, eat only when starving, minimal fire maintenance",
    decide(s, cfg) {
      if (s.fire < 15 && s.wood > 0) return "stoke";
      if (s.hunger > 90 && s.food > 0) return "eat";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 3) return "build_trap";
      if (canForage(s)) return "forage";
      return "wait";
    },
  },

  cautious: {
    name: "cautious",
    description: "Minimize actions (noise), keep fire high, eat early, forage only when needed",
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

  // ── Noise-aware strategies (new for creature system) ──

  quiet: {
    name: "quiet",
    description: "Minimize noise — batch actions, wait for noise to decay between actions",
    decide(s, cfg) {
      // Only act when noise is low
      if (s.noise > 15) return "wait";
      // Urgent: fire critical
      if (s.fire < 20 && s.wood > 0) return "stoke";
      // Urgent: starving
      if (s.hunger > 85 && s.food > 0) return "eat";
      // Only forage when resources critically low
      if (canForage(s) && (s.wood < 2 || s.food < 1)) return "forage";
      // Maintain fire when quiet
      if (s.fire < 40 && s.wood > 0) return "stoke";
      // Eat when safe
      if (s.hunger > 60 && s.food > 0) return "eat";
      return "wait";
    },
  },

  dimfire: {
    name: "dimfire",
    description: "Keep fire low to avoid attracting predators — accept timid creature risk",
    decide(s, cfg) {
      // Only stoke when fire is about to die
      if (s.fire < 12 && s.wood > 0) return "stoke";
      if (s.hunger > 70 && s.food > 0) return "eat";
      if (canForage(s)) return "forage";
      if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
      if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 2) return "build_trap";
      if (s.hunger > 50 && s.food > 0) return "eat";
      return "wait";
    },
  },

  noiseburst: {
    name: "noiseburst",
    description: "Batch all actions together, then go silent — concentrated noise windows",
    decide(s, cfg) {
      // If we just acted (noise high), keep going — damage is done
      if (s.noise > 20) {
        if (canForage(s)) return "forage";
        if (s.fire < 70 && s.wood > 0) return "stoke";
        if (s.hunger > 40 && s.food > 0) return "eat";
        if (!s.hasShelter && s.materials >= cfg.SHELTER_MATERIAL_COST) return "build_shelter";
        if (s.materials >= cfg.TRAP_MATERIAL_COST && s.traps < 2) return "build_trap";
        return "wait";
      }
      // Noise is low — only act if something is urgent
      if (s.fire < 25 && s.wood > 0) return "stoke";
      if (s.hunger > 80 && s.food > 0) return "eat";
      // Start a burst if resources are low
      if (canForage(s) && (s.wood < 4 || s.food < 2)) return "forage";
      return "wait";
    },
  },
};

// ── Config Presets ──

const configPresets: Record<string, Partial<GameConfig>> = {
  default: {},

  easy: {
    FIRE_BURN_RATE: 0.3,
    FIRE_NIGHT_BURN_RATE: 0.5,
    WOOD_PER_FUEL: 14,
    HUNGER_RATE: 0.15,
    FOOD_PER_EAT: 20,
    WOOD_FORAGE_AMOUNT: 3,
    FOOD_FORAGE_AMOUNT: 2,
    FORAGE_COOLDOWN_TICKS: 8,
    CREATURE_SPAWN_RATE: 0.02,
    CREATURE_SPAWN_ESCALATION: 0.003,
    NOISE_DECAY: 3,
  },

  hard: {
    FIRE_BURN_RATE: 0.5,
    FIRE_NIGHT_BURN_RATE: 0.8,
    WOOD_PER_FUEL: 8,
    HUNGER_RATE: 0.25,
    FOOD_PER_EAT: 12,
    HUNGER_DAMAGE: 1.0,
    FORAGE_COOLDOWN_TICKS: 12,
    CREATURE_SPAWN_RATE: 0.04,
    CREATURE_SPAWN_ESCALATION: 0.01,
    NOISE_DECAY: 1.5,
    NOISE_FORAGE: 45,
  },

  nightmare: {
    FIRE_BURN_RATE: 0.55,
    FIRE_NIGHT_BURN_RATE: 0.85,
    WOOD_PER_FUEL: 7,
    HUNGER_RATE: 0.28,
    FOOD_PER_EAT: 10,
    HUNGER_DAMAGE: 1.2,
    FORAGE_COOLDOWN_TICKS: 14,
    CREATURE_SPAWN_RATE: 0.06,
    CREATURE_SPAWN_ESCALATION: 0.015,
    CREATURE_MAX: 12,
    NOISE_DECAY: 1,
    NOISE_FORAGE: 50,
    NOISE_BUILD: 60,
  },

  long_days: {
    DAY_DURATION_TICKS: 300,
    NIGHT_DURATION_TICKS: 90,
  },

  long_nights: {
    DAY_DURATION_TICKS: 120,
    NIGHT_DURATION_TICKS: 180,
  },

  quiet_forest: {
    CREATURE_SPAWN_RATE: 0.015,
    CREATURE_SPAWN_ESCALATION: 0.003,
    NOISE_DECAY: 4,
    NOISE_FORAGE: 25,
    NOISE_STOKE: 10,
  },

  loud_forest: {
    CREATURE_SPAWN_RATE: 0.04,
    CREATURE_SPAWN_ESCALATION: 0.008,
    NOISE_DECAY: 1,
    NOISE_FORAGE: 50,
    NOISE_BUILD: 60,
  },
};

// ── Simulation Runner ──

interface RunResult {
  status: "won" | "dead";
  daysSurvived: number;
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
  state.tick = seed * 10000;

  const actions: Record<Action, number> = {
    forage: 0, eat: 0, stoke: 0, build_trap: 0, build_shelter: 0, wait: 0,
  };
  let peakWood = state.wood;
  let peakFood = state.food;
  let peakNoise = 0;
  let totalNoise = 0;
  let creaturesEncountered = 0;

  const maxTicks = cfg.DAY_DURATION_TICKS + cfg.NIGHT_DURATION_TICKS;
  const maxTotal = maxTicks * (cfg.DAYS_TO_SURVIVE + 2);

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

    // Track creature IDs before tick to count real attacks (not despawns)
    const creatureIdsBefore = new Set(state.creatures.map(c => c.id));
    state = tick(state, cfg);
    tickCount++;

    // Track stats
    if (state.wood > peakWood) peakWood = state.wood;
    if (state.food > peakFood) peakFood = state.food;
    if (state.noise > peakNoise) peakNoise = state.noise;
    totalNoise += state.noise;
    // Count creatures that were within attack range (check log for damage messages)
    for (const id of creatureIdsBefore) {
      if (!state.creatures.some(c => c.id === id)) {
        // Creature was removed — check if it was close enough to have attacked
        // (despawned creatures were at > DESPAWN_DISTANCE, attacks at < ATTACK_RANGE)
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
    daysSurvived: state.day,
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

// ── Stats Aggregation ──

interface AggregateStats {
  runs: number;
  wins: number;
  winRate: number;
  avgDaysSurvived: number;
  medianDaysSurvived: number;
  avgTicksSurvived: number;
  deaths: { fire: number; starvation: number; creature: number };
  deathRates: { fire: string; starvation: string; creature: string };
  avgActions: Record<Action, number>;
  avgPeakWood: number;
  avgPeakFood: number;
  shelterRate: number;
  avgTraps: number;
  avgNoise: number;
  avgCreatures: number;
}

function aggregate(results: RunResult[]): AggregateStats {
  const n = results.length;
  const wins = results.filter((r) => r.status === "won").length;
  const deaths = { fire: 0, starvation: 0, creature: 0 };
  const totalActions: Record<Action, number> = {
    forage: 0, eat: 0, stoke: 0, build_trap: 0, build_shelter: 0, wait: 0,
  };

  let totalDays = 0;
  let totalTicks = 0;
  let totalPeakWood = 0;
  let totalPeakFood = 0;
  let shelters = 0;
  let totalTraps = 0;
  let totalAvgNoise = 0;
  let totalCreatures = 0;
  const daysList: number[] = [];

  for (const r of results) {
    totalDays += r.daysSurvived;
    totalTicks += r.ticksSurvived;
    totalPeakWood += r.peakWood;
    totalPeakFood += r.peakFood;
    if (r.shelterBuilt) shelters++;
    totalTraps += r.trapsBuilt;
    totalAvgNoise += r.avgNoise;
    totalCreatures += r.creaturesEncountered;
    daysList.push(r.daysSurvived);

    if (r.causeOfDeath === "fire") deaths.fire++;
    else if (r.causeOfDeath === "starvation") deaths.starvation++;
    else if (r.causeOfDeath === "creature") deaths.creature++;

    for (const [k, v] of Object.entries(r.actionsPerformed)) {
      totalActions[k as Action] += v;
    }
  }

  daysList.sort((a, b) => a - b);
  const median = daysList[Math.floor(n / 2)];
  const totalDeaths = deaths.fire + deaths.starvation + deaths.creature;

  return {
    runs: n,
    wins,
    winRate: wins / n,
    avgDaysSurvived: totalDays / n,
    medianDaysSurvived: median,
    avgTicksSurvived: totalTicks / n,
    deaths,
    deathRates: {
      fire: totalDeaths > 0 ? ((deaths.fire / totalDeaths) * 100).toFixed(1) + "%" : "0%",
      starvation: totalDeaths > 0 ? ((deaths.starvation / totalDeaths) * 100).toFixed(1) + "%" : "0%",
      creature: totalDeaths > 0 ? ((deaths.creature / totalDeaths) * 100).toFixed(1) + "%" : "0%",
    },
    avgActions: Object.fromEntries(
      Object.entries(totalActions).map(([k, v]) => [k, Math.round(v / n)])
    ) as Record<Action, number>,
    avgPeakWood: totalPeakWood / n,
    avgPeakFood: totalPeakFood / n,
    shelterRate: shelters / n,
    avgTraps: totalTraps / n,
    avgNoise: totalAvgNoise / n,
    avgCreatures: totalCreatures / n,
  };
}

// ── Output Formatting ──

function printResults(
  configName: string,
  strategyName: string,
  stats: AggregateStats
) {
  const bar = (pct: number, width: number = 20) => {
    const filled = Math.round(pct * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  console.log("");
  console.log(`┌──────────────────────────────────────────────────────────────┐`);
  console.log(`│  Config: ${configName.padEnd(16)} Strategy: ${strategyName.padEnd(16)}     │`);
  console.log(`│  Runs: ${String(stats.runs).padEnd(51)}│`);
  console.log(`├──────────────────────────────────────────────────────────────┤`);
  console.log(`│  Win Rate:  ${bar(stats.winRate)} ${(stats.winRate * 100).toFixed(1).padStart(5)}%      │`);
  console.log(`│  Avg Days:  ${stats.avgDaysSurvived.toFixed(1).padStart(5)}  Median: ${String(stats.medianDaysSurvived).padStart(3)}                  │`);
  console.log(`├──────────────────────────────────────────────────────────────┤`);
  console.log(`│  Deaths:                                                    │`);
  console.log(`│    Fire:       ${stats.deathRates.fire.padStart(6)}  (${String(stats.deaths.fire).padStart(4)} runs)                    │`);
  console.log(`│    Starvation: ${stats.deathRates.starvation.padStart(6)}  (${String(stats.deaths.starvation).padStart(4)} runs)                    │`);
  console.log(`│    Creature:   ${stats.deathRates.creature.padStart(6)}  (${String(stats.deaths.creature).padStart(4)} runs)                    │`);
  console.log(`├──────────────────────────────────────────────────────────────┤`);
  console.log(`│  Actions:                                                   │`);
  console.log(`│    Forage: ${String(stats.avgActions.forage).padStart(5)}   Eat: ${String(stats.avgActions.eat).padStart(5)}   Stoke: ${String(stats.avgActions.stoke).padStart(5)}        │`);
  console.log(`│    Trap: ${String(stats.avgActions.build_trap).padStart(5)}   Shelter: ${String(stats.avgActions.build_shelter).padStart(5)}   Wait: ${String(stats.avgActions.wait).padStart(5)}      │`);
  console.log(`├──────────────────────────────────────────────────────────────┤`);
  console.log(`│  Resources:                                                 │`);
  console.log(`│    Peak Wood: ${stats.avgPeakWood.toFixed(1).padStart(5)}   Peak Food: ${stats.avgPeakFood.toFixed(1).padStart(5)}                 │`);
  console.log(`│    Shelter: ${(stats.shelterRate * 100).toFixed(0).padStart(3)}%      Traps: ${stats.avgTraps.toFixed(1).padStart(4)}                     │`);
  console.log(`├──────────────────────────────────────────────────────────────┤`);
  console.log(`│  Noise & Creatures:                                         │`);
  console.log(`│    Avg Noise: ${stats.avgNoise.toFixed(1).padStart(5)}   Creatures Fought: ${stats.avgCreatures.toFixed(1).padStart(4)}          │`);
  console.log(`└──────────────────────────────────────────────────────────────┘`);
}

function printComparisonTable(
  results: Array<{ config: string; strategy: string; stats: AggregateStats }>
) {
  console.log("");
  console.log("═════════════════════════════════════════════════════════════════════════════════════");
  console.log("  COMPARISON TABLE");
  console.log("═════════════════════════════════════════════════════════════════════════════════════");
  console.log(
    "  Config".padEnd(18) +
    "Strategy".padEnd(14) +
    "Win%".padStart(7) +
    "AvgDay".padStart(8) +
    "Fire%".padStart(8) +
    "Starve%".padStart(9) +
    "Creature%".padStart(11) +
    "AvgNoise".padStart(10) +
    "Fights".padStart(8)
  );
  console.log("  " + "─".repeat(83));

  for (const r of results) {
    console.log(
      `  ${r.config.padEnd(16)}${r.strategy.padEnd(14)}` +
      `${(r.stats.winRate * 100).toFixed(1).padStart(6)}%` +
      `${r.stats.avgDaysSurvived.toFixed(1).padStart(7)}` +
      `${r.stats.deathRates.fire.padStart(8)}` +
      `${r.stats.deathRates.starvation.padStart(9)}` +
      `${r.stats.deathRates.creature.padStart(11)}` +
      `${r.stats.avgNoise.toFixed(1).padStart(9)}` +
      `${r.stats.avgCreatures.toFixed(1).padStart(8)}`
    );
  }
  console.log("═════════════════════════════════════════════════════════════════════════════════════");
}

// ── CLI ──

function parseArgs(): {
  runs: number;
  configs: string[];
  strategies: string[];
  verbose: boolean;
  sweep: boolean;
} {
  const args = process.argv.slice(2);
  let runs = 1000;
  let configs: string[] = ["default"];
  let selectedStrategies: string[] = ["balanced"];
  let verbose = false;
  let sweep = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--runs":
      case "-n":
        runs = parseInt(args[++i], 10);
        break;
      case "--config":
      case "-c":
        configs = args[++i].split(",");
        break;
      case "--strategy":
      case "-s":
        selectedStrategies = args[++i].split(",");
        break;
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--sweep":
        sweep = true;
        break;
      case "--list":
        console.log("\nAvailable strategies:");
        for (const [k, v] of Object.entries(strategies)) {
          console.log(`  ${k.padEnd(14)} ${v.description}`);
        }
        console.log("\nAvailable configs:");
        for (const k of Object.keys(configPresets)) {
          console.log(`  ${k}`);
        }
        process.exit(0);
      case "--help":
      case "-h":
        console.log(`
Dark Forest Simulation Harness

Usage: npx tsx scripts/simulate.ts [options]

Options:
  -n, --runs N          Number of runs per combo (default: 1000)
  -c, --config NAME     Config preset(s), comma-separated (default: default)
  -s, --strategy NAME   Strategy(ies), comma-separated (default: balanced)
  --sweep               Run ALL strategies x ALL configs
  --list                List available strategies and configs
  -v, --verbose         Show per-run results
  -h, --help            Show this help

Examples:
  npx tsx scripts/simulate.ts --sweep -n 500
  npx tsx scripts/simulate.ts -c hard,nightmare -s balanced,quiet -n 2000
  npx tsx scripts/simulate.ts -c default -s balanced -n 100 -v
        `);
        process.exit(0);
    }
  }

  if (sweep) {
    configs = Object.keys(configPresets);
    selectedStrategies = Object.keys(strategies);
  }

  return { runs, configs, strategies: selectedStrategies, verbose, sweep };
}

function main() {
  const opts = parseArgs();

  console.log(`\n🌲 Dark Forest Simulation Harness`);
  console.log(`   Runs per combo: ${opts.runs}`);
  console.log(`   Configs: ${opts.configs.join(", ")}`);
  console.log(`   Strategies: ${opts.strategies.join(", ")}`);

  const allResults: Array<{ config: string; strategy: string; stats: AggregateStats }> = [];
  const startTime = performance.now();

  for (const configName of opts.configs) {
    const preset = configPresets[configName];
    if (!preset) {
      console.error(`Unknown config: ${configName}. Use --list to see options.`);
      continue;
    }
    const cfg: GameConfig = { ...DEFAULT_CONFIG, ...preset };

    for (const stratName of opts.strategies) {
      const strategy = strategies[stratName];
      if (!strategy) {
        console.error(`Unknown strategy: ${stratName}. Use --list to see options.`);
        continue;
      }

      const results: RunResult[] = [];
      for (let i = 0; i < opts.runs; i++) {
        const result = runGame(strategy, cfg, i);
        results.push(result);

        if (opts.verbose) {
          console.log(
            `  Run ${String(i + 1).padStart(4)}: ${result.status.padEnd(4)} day ${result.daysSurvived} ` +
            `(${result.ticksSurvived} ticks) avgNoise=${result.avgNoise.toFixed(1)} ` +
            `fights=${result.creaturesEncountered}` +
            `${result.causeOfDeath ? ` [${result.causeOfDeath}]` : ""}`
          );
        }
      }

      const stats = aggregate(results);
      printResults(configName, stratName, stats);
      allResults.push({ config: configName, strategy: stratName, stats });
    }
  }

  if (allResults.length > 1) {
    printComparisonTable(allResults);
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\nCompleted in ${elapsed}s`);
}

main();
