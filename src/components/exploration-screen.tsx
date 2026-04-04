"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type ExplorationState,
  createExplorationState,
  getWorldFromState,
} from "@/lib/exploration-state";
import {
  movePlayer,
  explorationTick,
  INTERACT_RANGE,
  RESOURCE_RESPAWN_TICKS,
} from "@/lib/exploration-engine";
import { addWoodToFire, eat, buildClub, buildTrap, buildShelter, relightFire } from "@/lib/game-engine";
import { type WorldMap, generateWorld } from "@/lib/world-gen";
import { TICK_MS, FORAGE_COOLDOWN_TICKS, NOISE_FORAGE, NOISE_MAX } from "@/lib/constants";
import { addLog } from "@/lib/game-state";
import TopDownCanvas from "./top-down-canvas";
import ExplorationHUD from "./exploration-hud";
import VirtualJoystick from "./virtual-joystick";
import IntroScreen from "./intro-screen";

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function seededRandom(tick: number, salt: number = 0): number {
  let h = (tick + salt * 374761393) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

export default function ExplorationScreen() {
  const [state, setState] = useState<ExplorationState | null>(null);
  const [world, setWorld] = useState<WorldMap | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const stateRef = useRef<ExplorationState | null>(null);
  const worldRef = useRef<WorldMap | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { worldRef.current = world; }, [world]);

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // ── Intro complete → create game ──
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    const s = createExplorationState();
    const w = generateWorld(s.worldSeed);
    setState(s);
    setWorld(w);
  }, []);

  // ── Keyboard input ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" || e.key === " ") {
        handleInteract();
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // ── Frame loop (60fps): player movement ──
  useEffect(() => {
    if (showIntro || !state) return;

    const frame = () => {
      const s = stateRef.current;
      const w = worldRef.current;
      if (!s || !w || s.status !== "playing") {
        frameId = requestAnimationFrame(frame);
        return;
      }

      // Input
      let dx = 0, dy = 0;
      const keys = keysRef.current;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      // Joystick overrides keyboard if active
      const joy = joystickRef.current;
      if (Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1) {
        dx = joy.dx;
        dy = joy.dy;
      }

      if (dx !== 0 || dy !== 0) {
        const running = keys.has("shift");
        setState(prev => prev ? movePlayer(prev, dx, dy, running, w) : prev);
      }

      frameId = requestAnimationFrame(frame);
    };

    let frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [showIntro, state]);

  // ── Tick loop (1s): game simulation ──
  useEffect(() => {
    if (showIntro || !state) return;
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev || prev.status !== "playing") return prev;
        return explorationTick(prev);
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [showIntro, state]);

  // ── Joystick handler ──
  const handleJoystick = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy };
  }, []);

  // ── Interact (E key or button) ──
  const handleInteract = useCallback(() => {
    setState(prev => {
      if (!prev || prev.status !== "playing") return prev;
      const pX = prev.playerX;
      const pY = prev.playerY;

      // Near fire?
      if (dist(pX, pY, prev.fireX, prev.fireY) < INTERACT_RANGE) {
        // Priority: relight > stoke > eat
        if (prev.fire <= 0 && prev.wood >= 2) return relightFire(prev as any) as any;
        if (prev.fire > 0 && prev.wood > 0) return addWoodToFire(prev as any) as any;
        if (prev.food > 0 && prev.hunger > 20) return eat(prev as any) as any;
      }

      // Near resource node?
      if (prev.tick >= prev.forageCooldownUntil) {
        for (let i = 0; i < prev.resourceNodes.length; i++) {
          const node = prev.resourceNodes[i];
          if (node.depletedUntilTick > prev.tick) continue;
          if (dist(pX, pY, node.x, node.y) < INTERACT_RANGE) {
            // Forage this node
            const s = { ...prev, resourceNodes: [...prev.resourceNodes] };
            s.forageCooldownUntil = s.tick + FORAGE_COOLDOWN_TICKS;
            s.noise = Math.min(NOISE_MAX, s.noise + NOISE_FORAGE);
            s.resourceNodes[i] = { ...node, depletedUntilTick: s.tick + RESOURCE_RESPAWN_TICKS };

            if (node.type === "wood") {
              s.wood += 2;
              addLog(s, "You gather wood.", "info");
            } else if (node.type === "food") {
              s.food += 1;
              addLog(s, "You find some food.", "info");
            } else {
              s.materials += 2;
              addLog(s, "You find materials.", "discovery");
            }
            return s;
          }
        }
      }

      return prev;
    });
  }, []);

  // ── Restart ──
  const handleRestart = useCallback(() => {
    setShowIntro(true);
    setState(null);
    setWorld(null);
  }, []);

  // ── Intro ──
  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  if (!state || !world) {
    return (
      <div className="h-screen w-screen flex items-center justify-center"
        style={{ background: "#03030a", color: "#6b7280" }}>
        <div className="text-sm animate-pulse">Generating forest...</div>
      </div>
    );
  }

  // Proximity checks for HUD
  const nearFire = dist(state.playerX, state.playerY, state.fireX, state.fireY) < INTERACT_RANGE;
  const nearResource = (() => {
    if (state.tick < state.forageCooldownUntil) return null;
    for (const node of state.resourceNodes) {
      if (node.depletedUntilTick > state.tick) continue;
      if (dist(state.playerX, state.playerY, node.x, node.y) < INTERACT_RANGE) {
        return { type: node.type };
      }
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
        onRestart={handleRestart}
      />
      {isMobile && <VirtualJoystick onMove={handleJoystick} />}
    </div>
  );
}
