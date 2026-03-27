"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createInitialState,
  loadState,
  saveState,
  clearState,
  type GameState,
} from "@/lib/game-state";
import {
  tick,
  addWoodToFire,
  forage,
  eat,
  buildTrap,
  buildShelter,
  simulateOfflineTime,
} from "@/lib/game-engine";
import { TICK_MS } from "@/lib/constants";
import GameCanvas from "./game-canvas";
import GameHUD from "./game-hud";

export default function GameScreen() {
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);

  // Keep ref in sync for the interval callback
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load or create state on mount
  useEffect(() => {
    let initial = loadState();
    if (initial) {
      // Catch up on offline time
      initial = simulateOfflineTime(initial);
    } else {
      initial = createInitialState();
    }
    setState(initial);
  }, []);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current || current.status !== "playing") return;
      setState((prev) => {
        if (!prev || prev.status !== "playing") return prev;
        return tick(prev);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (current) saveState(current);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Save on tab close
  useEffect(() => {
    const handleUnload = () => {
      const current = stateRef.current;
      if (current) saveState(current);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Actions
  const handleAddWood = useCallback(() => setState((s) => s ? addWoodToFire(s) : s), []);
  const handleForage = useCallback(() => setState((s) => s ? forage(s) : s), []);
  const handleEat = useCallback(() => setState((s) => s ? eat(s) : s), []);
  const handleBuildTrap = useCallback(() => setState((s) => s ? buildTrap(s) : s), []);
  const handleBuildShelter = useCallback(() => setState((s) => s ? buildShelter(s) : s), []);
  const handleRestart = useCallback(() => {
    clearState();
    setState(createInitialState());
  }, []);

  if (!state) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "#08080f", color: "#6b7280" }}
      >
        <div className="text-sm animate-pulse">Entering the forest...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none">
      <GameCanvas state={state} />
      <GameHUD
        state={state}
        onAddWood={handleAddWood}
        onForage={handleForage}
        onEat={handleEat}
        onBuildTrap={handleBuildTrap}
        onBuildShelter={handleBuildShelter}
        onRestart={handleRestart}
      />
    </div>
  );
}
