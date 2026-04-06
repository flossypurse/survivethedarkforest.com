"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type ExplorationState,
  createExplorationState,
} from "@/lib/exploration-state";
import {
  movePlayer, explorationTick, INTERACT_RANGE, RESOURCE_RESPAWN_TICKS,
  toggleFlashlight, startFire, stokeFire, attackCreature, craftWeapon, hasLight,
} from "@/lib/exploration-engine";
import { type WorldMap, generateWorld } from "@/lib/world-gen";
import { TICK_MS, FORAGE_COOLDOWN_TICKS, NOISE_FORAGE, NOISE_MAX, NOISE_EAT } from "@/lib/constants";
import { addLog } from "@/lib/game-state";
import {
  initAudio, resumeAudio, playFootstep, playForage, playFlashlightClick,
  playWeaponHit, playLighterFlick, playDamageTaken, playCreatureSound,
  updateHeartbeat, updateFireCrackle, startAmbientWind, cleanupAudio,
} from "@/lib/audio-engine";
import TopDownCanvas from "./top-down-canvas";
import ExplorationHUD from "./exploration-hud";
import VirtualJoystick from "./virtual-joystick";
import IntroScreen from "./intro-screen";
import ModeSelect from "./mode-select";
import FactionSelect, { type Faction } from "./faction-select";

type Screen = "mode-select" | "faction-select" | "intro" | "solo" | "multiplayer";

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export default function ExplorationScreen() {
  const [state, setState] = useState<ExplorationState | null>(null);
  const [world, setWorld] = useState<WorldMap | null>(null);
  const [screen, setScreen] = useState<Screen>("mode-select");
  const [faction, setFaction] = useState<Faction>("pilot");
  const [isMobile, setIsMobile] = useState(false);

  const stateRef = useRef<ExplorationState | null>(null);
  const worldRef = useRef<WorldMap | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { worldRef.current = world; }, [world]);
  useEffect(() => { setIsMobile(window.matchMedia("(pointer: coarse)").matches); }, []);

  // Audio init on first user interaction
  useEffect(() => {
    const onInteraction = () => {
      initAudio();
      resumeAudio();
      startAmbientWind();
    };
    window.addEventListener("click", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });
    return () => {
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      cleanupAudio();
    };
  }, []);

  // Audio: heartbeat + fire crackle tied to game state
  const prevHealthRef = useRef(100);
  const footstepCooldownRef = useRef(0);
  useEffect(() => {
    if (!state || state.status !== "playing") {
      updateHeartbeat(0);
      updateFireCrackle(0, 999);
      return;
    }
    // Heartbeat based on health + creature proximity
    const nearestCreatureDist = state.creatures.length > 0
      ? Math.min(...state.creatures.map(c => Math.sqrt((c.x - state.playerX) ** 2 + (c.y - state.playerY) ** 2)))
      : 999;
    const healthDanger = 1 - state.health / 100;
    const proximityDanger = Math.max(0, 1 - nearestCreatureDist / 200);
    updateHeartbeat(Math.max(healthDanger, proximityDanger));

    // Fire crackle
    const nearestFire = state.fires.reduce((best, f) => {
      const d = Math.sqrt((f.x - state.playerX) ** 2 + (f.y - state.playerY) ** 2);
      return (!best || d < best.d) ? { fuel: f.fuel, d } : best;
    }, null as { fuel: number; d: number } | null);
    updateFireCrackle(nearestFire ? nearestFire.fuel / 100 : 0, nearestFire?.d ?? 999);

    // Creature sounds
    if (state.tick % 12 === 0 && nearestCreatureDist < 300) {
      const closest = state.creatures.reduce((best, c) => {
        const d = Math.sqrt((c.x - state.playerX) ** 2 + (c.y - state.playerY) ** 2);
        return (!best || d < best.d) ? { c, d } : best;
      }, null as { c: typeof state.creatures[0]; d: number } | null);
      if (closest && closest.d < 300) {
        const angle = Math.atan2(closest.c.y - state.playerY, closest.c.x - state.playerX);
        playCreatureSound(closest.c.type, angle - state.playerAngle, closest.d);
      }
    }

    // Damage taken sound
    if (state.health < prevHealthRef.current) {
      playDamageTaken();
    }
    prevHealthRef.current = state.health;
  }, [state?.tick]);

  // Mode select → faction select (solo) or multiplayer
  const handleSelectSolo = useCallback(() => {
    setScreen("faction-select");
  }, []);

  const handleSelectMultiplayer = useCallback(() => {
    setScreen("multiplayer");
  }, []);

  // Faction select → intro
  const handleFactionSelect = useCallback((f: Faction) => {
    setFaction(f);
    setScreen("intro");
  }, []);

  // Intro complete → start game
  const handleIntroComplete = useCallback(() => {
    setScreen("solo");
    const s = createExplorationState();
    setState(s);
    setWorld(generateWorld(s.worldSeed));
  }, []);

  // ── Keyboard ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      if (k === "e" || e.key === " ") handleInteract();
      if (k === "q") handleAttack();
      if (k === "f") handleToggleFlashlight();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // ── Frame loop ──
  useEffect(() => {
    if (screen !== "solo" || !state) return;
    const frame = () => {
      const s = stateRef.current;
      const w = worldRef.current;
      if (!s || !w || s.status !== "playing") { frameId = requestAnimationFrame(frame); return; }

      let dx = 0, dy = 0;
      const keys = keysRef.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      const joy = joystickRef.current;
      if (Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1) { dx = joy.dx; dy = joy.dy; }

      if (dx !== 0 || dy !== 0) {
        setState(prev => prev ? movePlayer(prev, dx, dy, keys.has("shift"), w) : prev);
        // Footstep sounds
        footstepCooldownRef.current -= 1;
        if (footstepCooldownRef.current <= 0) {
          const vol = keys.has("shift") ? 0.5 : 0.25;
          playFootstep(vol);
          footstepCooldownRef.current = keys.has("shift") ? 6 : 10;
        }
      }
      frameId = requestAnimationFrame(frame);
    };
    let frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [screen, state]);

  // ── Tick loop ──
  useEffect(() => {
    if (screen !== "solo" || !state) return;
    const interval = setInterval(() => {
      setState(prev => prev && prev.status === "playing" ? explorationTick(prev) : prev);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [screen, state]);

  const handleJoystick = useCallback((dx: number, dy: number) => { joystickRef.current = { dx, dy }; }, []);

  const handleToggleFlashlight = useCallback(() => {
    playFlashlightClick();
    setState(prev => prev ? toggleFlashlight(prev) : prev);
  }, []);

  const handleAttack = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const before = prev.creatures.length;
      const after = attackCreature(prev);
      playWeaponHit(after.creatures.length < before);
      return after;
    });
  }, []);

  const handleStartFire = useCallback(() => {
    playLighterFlick();
    setState(prev => prev ? startFire(prev) : prev);
  }, []);

  const handleCraftWeapon = useCallback((tier: "spear" | "axe") => {
    setState(prev => prev ? craftWeapon(prev, tier) : prev);
  }, []);

  const handleInteract = useCallback(() => {
    setState(prev => {
      if (!prev || prev.status !== "playing") return prev;
      const { playerX: pX, playerY: pY } = prev;

      // Near a fire? Stoke or eat
      for (const fire of prev.fires) {
        if (dist(pX, pY, fire.x, fire.y) < INTERACT_RANGE) {
          if (fire.fuel > 0 && prev.wood > 0) return stokeFire(prev, fire.id);
          if (prev.food > 0 && prev.hunger > 20) {
            const s = { ...prev };
            s.food -= 1;
            s.hunger = Math.max(0, s.hunger - 15);
            s.health = Math.min(100, s.health + 1);
            s.noise = Math.min(NOISE_MAX, s.noise + NOISE_EAT);
            addLog(s, "You eat.", "info");
            return s;
          }
        }
      }

      // No fire nearby? Start one
      if (prev.lighterUses > 0 && prev.wood >= 2) {
        const nearExisting = prev.fires.some(f => dist(pX, pY, f.x, f.y) < INTERACT_RANGE);
        if (!nearExisting) return startFire(prev);
      }

      // Near resource?
      if (prev.tick >= prev.forageCooldownUntil && hasLight(prev)) {
        for (let i = 0; i < prev.resourceNodes.length; i++) {
          const node = prev.resourceNodes[i];
          if (node.depletedUntilTick > prev.tick) continue;
          if (dist(pX, pY, node.x, node.y) < INTERACT_RANGE) {
            const s = { ...prev, resourceNodes: [...prev.resourceNodes] };
            s.forageCooldownUntil = s.tick + FORAGE_COOLDOWN_TICKS;
            s.noise = Math.min(NOISE_MAX, s.noise + NOISE_FORAGE);
            s.resourceNodes[i] = { ...node, depletedUntilTick: s.tick + RESOURCE_RESPAWN_TICKS };
            playForage();
            if (node.type === "wood") { s.wood += 2; addLog(s, "You gather wood.", "info"); }
            else if (node.type === "food") { s.food += 1; addLog(s, "You find food.", "info"); }
            else { s.materials += 2; addLog(s, "You find materials.", "discovery"); }
            return s;
          }
        }
      }

      return prev;
    });
  }, []);

  const handleRestart = useCallback(() => {
    setScreen("mode-select");
    setState(null);
    setWorld(null);
  }, []);

  if (screen === "mode-select") return <ModeSelect onSelectSolo={handleSelectSolo} onSelectMultiplayer={handleSelectMultiplayer} />;
  if (screen === "faction-select") return <FactionSelect onSelect={handleFactionSelect} onBack={() => setScreen("mode-select")} />;
  if (screen === "intro") return <IntroScreen faction={faction} onComplete={handleIntroComplete} />;
  if (screen === "multiplayer") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center"
        style={{ background: "#02020a", color: "#6b7280", gap: "16px" }}>
        <div className="text-sm">Multiplayer coming soon.</div>
        <button onClick={() => setScreen("mode-select")} className="cursor-pointer"
          style={{ padding: "10px 20px", borderRadius: "8px", background: "rgba(20,20,15,0.6)", color: "#6b7280", border: "1px solid rgba(100,100,90,0.2)", fontSize: "0.8rem" }}>
          Back
        </button>
      </div>
    );
  }

  if (!state || !world) {
    return (
      <div className="h-screen w-screen flex items-center justify-center"
        style={{ background: "#03030a", color: "#6b7280" }}>
        <div className="text-sm animate-pulse">Generating forest...</div>
      </div>
    );
  }

  const nearFire = (() => {
    for (const f of state.fires) {
      if (dist(state.playerX, state.playerY, f.x, f.y) < INTERACT_RANGE) return { id: f.id, fuel: f.fuel };
    }
    return null;
  })();

  const nearResource = (() => {
    if (state.tick < state.forageCooldownUntil || !hasLight(state)) return null;
    for (const node of state.resourceNodes) {
      if (node.depletedUntilTick > state.tick) continue;
      if (dist(state.playerX, state.playerY, node.x, node.y) < INTERACT_RANGE) return { type: node.type };
    }
    return null;
  })();

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none">
      <TopDownCanvas state={state} world={world} />
      <ExplorationHUD
        state={state}
        nearFire={nearFire}
        nearResource={nearResource}
        onInteract={handleInteract}
        onAttack={handleAttack}
        onToggleFlashlight={handleToggleFlashlight}
        onStartFire={handleStartFire}
        onCraftWeapon={handleCraftWeapon}
        onRestart={handleRestart}
      />
      {isMobile && <VirtualJoystick onMove={handleJoystick} />}
    </div>
  );
}
