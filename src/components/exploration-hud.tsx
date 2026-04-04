"use client";

import { useState, useEffect, useRef } from "react";
import type { ExplorationState } from "@/lib/exploration-state";
import type { LogEntry } from "@/lib/game-state";
import {
  MAX_HEALTH,
  MAX_HUNGER,
  NOISE_MAX,
  HOURS_TO_SURVIVE,
  FLASHLIGHT_BATTERY_MAX,
  LIGHTER_USES_MAX,
  SPEAR_MATERIAL_COST,
  AXE_MATERIAL_COST,
} from "@/lib/constants";
import { hasLight } from "@/lib/exploration-engine";

const C = {
  health: "#b35454", healthDim: "#5c1f1f",
  hunger: "#8aab6e", hungerDim: "#3d4f2a",
  noise: "#c9a0d4", noiseDim: "#5c3d66",
  battery: "#7baacc", batteryDim: "#3a5566",
  fire: "#d4915c",
  wood: "#b89b6a", food: "#c47d5a", materials: "#8a9bae",
  rescue: "#7b9cc4",
  muted: "#6b7280", text: "#c9c0a8",
  interact: "#c9a96e",
  attack: "#cc6644",
};

interface Props {
  state: ExplorationState;
  nearFire: { id: number; fuel: number } | null;
  nearResource: { type: string } | null;
  onInteract: () => void;
  onAttack: () => void;
  onToggleFlashlight: () => void;
  onStartFire: () => void;
  onCraftWeapon: (tier: "spear" | "axe") => void;
  onRestart: () => void;
}

interface Toast { id: string; entry: LogEntry; exiting: boolean }

function useToasts(log: LogEntry[]) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLen = useRef(log.length);
  useEffect(() => {
    if (log.length > prevLen.current) {
      const newE = log.slice(prevLen.current);
      const newT = newE.map((entry, i) => ({
        id: `${entry.tick}-${prevLen.current + i}-${Date.now()}`,
        entry, exiting: false,
      }));
      setToasts(prev => [...prev, ...newT].slice(-3));
      newT.forEach(toast => {
        setTimeout(() => {
          setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 300);
        }, 4000);
      });
    }
    prevLen.current = log.length;
  }, [log]);
  return toasts;
}

export default function ExplorationHUD({
  state, nearFire, nearResource, onInteract, onAttack,
  onToggleFlashlight, onStartFire, onCraftWeapon, onRestart,
}: Props) {
  const toasts = useToasts(state.log);
  const hoursLeft = Math.max(0, HOURS_TO_SURVIVE - state.hour);
  const isPlaying = state.status === "playing";
  const batPct = state.flashlightBattery / FLASHLIGHT_BATTERY_MAX;
  const canSeeAnything = hasLight(state);

  // Context-sensitive interact prompts
  const prompts: string[] = [];
  if (isPlaying) {
    if (nearFire && nearFire.fuel > 0 && state.wood > 0) prompts.push("[E] Stoke Fire");
    if (nearResource && canSeeAnything) prompts.push(`[E] Forage ${nearResource.type}`);
    if (!nearFire && state.lighterUses > 0 && state.wood >= 2) prompts.push("[E] Start Fire");
    if (nearFire && state.food > 0 && state.hunger > 20) prompts.push("[E] Eat");
    if (state.weapon === "knife" && state.materials >= SPEAR_MATERIAL_COST) prompts.push("[E] Craft Spear");
    if (state.weapon === "spear" && state.materials >= AXE_MATERIAL_COST) prompts.push("[E] Craft Axe");
  }

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* ── Top ── */}
      <div style={{ padding: "12px 16px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
          <span className="font-mono font-bold tabular-nums" style={{
            color: hoursLeft <= 6 ? C.rescue : C.muted,
            fontSize: "0.75rem", letterSpacing: "0.05em",
          }}>
            RESCUE IN {hoursLeft}h
          </span>
          <div className="flex items-center" style={{ gap: "8px" }}>
            <Stat label="W" value={state.wood} color={C.wood} />
            <Stat label="F" value={state.food} color={C.food} />
            <Stat label="M" value={state.materials} color={C.materials} />
            <span style={{ color: C.muted, fontSize: "0.6rem" }}>
              {state.weapon.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Vitals */}
        <div className="flex" style={{ gap: "6px" }}>
          <MiniBar pct={state.health / MAX_HEALTH} color={C.health} dimColor={C.healthDim} label="HP" />
          <MiniBar pct={(MAX_HUNGER - state.hunger) / MAX_HUNGER} color={C.hunger} dimColor={C.hungerDim} label="FD" />
          <MiniBar pct={batPct} color={C.battery} dimColor={C.batteryDim} label="BT" />
          <MiniBar pct={state.noise / NOISE_MAX} color={C.noise} dimColor={C.noiseDim} label="NS" invert />
        </div>

        {/* Equipment strip */}
        <div className="flex items-center" style={{ gap: "10px", marginTop: "6px" }}>
          <button
            className="pointer-events-auto cursor-pointer"
            onClick={onToggleFlashlight}
            style={{
              padding: "3px 8px", borderRadius: "4px", fontSize: "0.6rem", fontWeight: 700,
              background: state.flashlightOn ? "rgba(123,170,204,0.15)" : "rgba(20,20,15,0.4)",
              color: state.flashlightOn ? C.battery : C.muted,
              border: `1px solid ${state.flashlightOn ? C.battery + "40" : "rgba(50,50,40,0.3)"}`,
              letterSpacing: "0.05em",
            }}
          >
            {state.flashlightOn ? "LIGHT ON" : "LIGHT OFF"}
          </button>
          <span style={{ color: C.muted, fontSize: "0.55rem" }}>
            LIGHTER: {state.lighterUses}/{LIGHTER_USES_MAX}
          </span>
          {state.fires.length > 0 && (
            <span style={{ color: C.fire, fontSize: "0.55rem" }}>
              FIRES: {state.fires.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Middle ── */}
      <div className="flex-1" />

      {/* Toasts */}
      <div style={{ padding: "0 16px 4px" }} className="flex flex-col items-start">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "5px 10px", marginBottom: "3px", borderRadius: "5px",
              fontSize: "0.7rem", lineHeight: "1.3", maxWidth: "min(80vw, 340px)",
              background: "rgba(5,5,10,0.85)",
              color: toast.entry.type === "danger" ? "#d49a9a"
                : toast.entry.type === "success" ? "#a3c290"
                : toast.entry.type === "discovery" ? "#adbdcc" : "#8b8fa3",
              border: `1px solid ${
                toast.entry.type === "danger" ? "rgba(179,84,84,0.25)"
                : toast.entry.type === "success" ? "rgba(122,158,109,0.25)"
                : "rgba(107,114,128,0.12)"
              }`,
            }}
          >
            {toast.entry.message}
          </div>
        ))}
      </div>

      {/* ── Bottom: interact + attack ── */}
      {isPlaying && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ padding: "6px 16px 20px", gap: "8px", flexWrap: "wrap" }}
        >
          {/* Attack button — always visible */}
          <button
            onClick={onAttack}
            className="cursor-pointer"
            style={{
              padding: "10px 16px", borderRadius: "8px",
              background: "rgba(204,102,68,0.15)",
              color: C.attack,
              border: `1px solid ${C.attack}30`,
              fontSize: "0.75rem", fontWeight: 600,
            }}
          >
            [Q] Attack
          </button>

          {/* Context prompts */}
          {prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                if (prompt.includes("Craft Spear")) onCraftWeapon("spear");
                else if (prompt.includes("Craft Axe")) onCraftWeapon("axe");
                else if (prompt.includes("Start Fire")) onStartFire();
                else onInteract();
              }}
              className="cursor-pointer"
              style={{
                padding: "10px 16px", borderRadius: "8px",
                background: "rgba(20,20,15,0.75)",
                color: C.interact,
                border: `1px solid ${C.interact}30`,
                fontSize: "0.75rem", fontWeight: 600,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Game over ── */}
      {!isPlaying && (
        <div className="pointer-events-auto flex flex-col items-center"
          style={{ padding: "20px 16px 40px", background: "rgba(5,5,10,0.85)" }}>
          <div className="text-lg font-bold" style={{
            color: state.status === "won" ? C.hunger : C.health, marginBottom: "8px",
          }}>
            {state.status === "won" ? "You survived." : "You perished in the dark forest."}
          </div>
          <div className="text-sm" style={{ color: C.muted, marginBottom: "12px" }}>
            Survived {state.hour} hour{state.hour !== 1 ? "s" : ""}
          </div>
          <button onClick={onRestart} className="cursor-pointer" style={{
            padding: "12px 24px", borderRadius: "8px", background: "rgba(20,20,15,0.8)",
            color: C.text, border: "1px solid rgba(180,160,120,0.25)", fontSize: "0.85rem",
          }}>Try Again</button>
        </div>
      )}
    </div>
  );
}

function MiniBar({ pct, color, dimColor, label, invert }: {
  pct: number; color: string; dimColor: string; label: string; invert?: boolean;
}) {
  const c = Math.max(0, Math.min(1, pct));
  const warn = invert ? c > 0.6 : c < 0.3;
  const col = warn ? dimColor : color;
  return (
    <div className="flex items-center flex-1 min-w-0" style={{ gap: "4px" }}>
      <span style={{ color: col, fontSize: "0.5rem", fontWeight: 700, minWidth: "1.2rem" }}>{label}</span>
      <div className="flex-1" style={{ height: "3px", borderRadius: "2px", background: "rgba(20,20,15,0.6)" }}>
        <div style={{
          height: "100%", borderRadius: "2px", width: `${c * 100}%`,
          background: col, transition: "width 0.3s",
          boxShadow: warn ? `0 0 4px ${col}` : "none",
        }} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="tabular-nums font-semibold" style={{ color, fontSize: "0.65rem" }}>
      {label}:{value}
    </span>
  );
}
