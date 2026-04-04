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
  buildClub,
  relightFire,
  simulateOfflineTime,
} from "@/lib/game-engine";
import { TICK_MS } from "@/lib/constants";
import GameCanvas from "./game-canvas";
import GameHUD from "./game-hud";
import IntroScreen from "./intro-screen";

export default function GameScreen() {
  const [state, setState] = useState<GameState | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const stateRef = useRef<GameState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check if there's an existing save — skip intro if resuming
  useEffect(() => {
    const existing = loadState();
    if (existing) {
      const resumed = simulateOfflineTime(existing);
      setState(resumed);
      setShowIntro(false); // skip intro for returning players
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    if (!stateRef.current) {
      setState(createInitialState());
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (showIntro) return;
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current || current.status !== "playing") return;
      setState((prev) => {
        if (!prev || prev.status !== "playing") return prev;
        return tick(prev);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [showIntro]);

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
  const handleBuildClub = useCallback(() => setState((s) => s ? buildClub(s) : s), []);
  const handleRelightFire = useCallback(() => setState((s) => s ? relightFire(s) : s), []);
  const handleRestart = useCallback(() => {
    clearState();
    setShowIntro(true);
    setState(null);
  }, []);

  // Intro screen
  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  // Loading
  if (!state) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "#05050a", color: "#6b7280" }}
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
        onBuildClub={handleBuildClub}
        onRelightFire={handleRelightFire}
        onRestart={handleRestart}
      />
    </div>
  );
}
