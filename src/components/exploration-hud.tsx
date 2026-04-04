"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import type { ExplorationState } from "@/lib/exploration-state";
import type { LogEntry } from "@/lib/game-state";
import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  NOISE_MAX,
  HOURS_TO_SURVIVE,
} from "@/lib/constants";
import { INTERACT_RANGE } from "@/lib/exploration-engine";

const C = {
  fire: "#d4915c",
  fireDim: "#7a4a2a",
  health: "#b35454",
  healthDim: "#5c1f1f",
  hunger: "#8aab6e",
  hungerDim: "#3d4f2a",
  noise: "#c9a0d4",
  noiseDim: "#5c3d66",
  rescue: "#7b9cc4",
  muted: "#6b7280",
  text: "#c9c0a8",
  interact: "#c9a96e",
};

interface Props {
  state: ExplorationState;
  nearFire: boolean;
  nearResource: { type: string } | null;
  onInteract: () => void;
  onRestart: () => void;
}

// ── Toast ──
interface Toast { id: string; entry: LogEntry; exiting: boolean }

function useToasts(log: LogEntry[]) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLen = useRef(log.length);
  useEffect(() => {
    if (log.length > prevLen.current) {
      const newE = log.slice(prevLen.current);
      const newT: Toast[] = newE.map((entry, i) => ({
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

export default function ExplorationHUD({ state, nearFire, nearResource, onInteract, onRestart }: Props) {
  const toasts = useToasts(state.log);
  const hoursLeft = Math.max(0, HOURS_TO_SURVIVE - state.hour);
  const isPlaying = state.status === "playing";

  // Determine interact prompt
  let interactText: string | null = null;
  if (isPlaying) {
    if (nearFire && state.fire > 0 && state.wood > 0) interactText = "[E] Stoke Fire";
    else if (nearFire && state.fire <= 0 && state.wood >= 2) interactText = "[E] Relight Fire";
    else if (nearFire && state.food > 0 && state.hunger > 20) interactText = "[E] Eat";
    else if (nearResource) interactText = `[E] Forage (${nearResource.type})`;
  }

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* ── Top: vitals + countdown ── */}
      <div style={{ padding: "12px 16px" }}>
        {/* Rescue countdown */}
        <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
          <span className="font-mono font-bold tabular-nums" style={{
            color: hoursLeft <= 6 ? C.rescue : C.muted,
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
          }}>
            RESCUE IN {hoursLeft}h
          </span>
          <div className="flex items-center" style={{ gap: "10px" }}>
            <Stat label="W" value={state.wood} color={C.fire} />
            <Stat label="F" value={state.food} color={C.hunger} />
            <Stat label="M" value={state.materials} color={C.muted} />
          </div>
        </div>

        {/* Vitals — single row */}
        <div className="flex" style={{ gap: "8px" }}>
          <MiniBar pct={state.health / MAX_HEALTH} color={C.health} dimColor={C.healthDim} />
          <MiniBar pct={state.fire / FIRE_MAX} color={C.fire} dimColor={C.fireDim} />
          <MiniBar pct={(MAX_HUNGER - state.hunger) / MAX_HUNGER} color={C.hunger} dimColor={C.hungerDim} />
          <MiniBar pct={state.noise / NOISE_MAX} color={C.noise} dimColor={C.noiseDim} invert />
        </div>
      </div>

      {/* ── Middle spacer ── */}
      <div className="flex-1" />

      {/* ── Toast log ── */}
      <div style={{ padding: "0 16px 6px" }} className="flex flex-col items-start">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "5px 10px",
              marginBottom: "3px",
              borderRadius: "5px",
              fontSize: "0.7rem",
              lineHeight: "1.3",
              maxWidth: "min(80vw, 340px)",
              background: "rgba(5,5,10,0.85)",
              color: toast.entry.type === "danger" ? "#d49a9a"
                : toast.entry.type === "success" ? "#a3c290"
                : toast.entry.type === "discovery" ? "#adbdcc"
                : "#8b8fa3",
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

      {/* ── Interact prompt ── */}
      {interactText && (
        <div
          className="pointer-events-auto flex justify-center"
          style={{ padding: "0 16px 16px" }}
        >
          <button
            onClick={onInteract}
            className="cursor-pointer"
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              background: "rgba(20,20,15,0.75)",
              color: C.interact,
              border: `1px solid ${C.interact}30`,
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {interactText}
          </button>
        </div>
      )}

      {/* ── Game over ── */}
      {!isPlaying && (
        <div
          className="pointer-events-auto flex flex-col items-center"
          style={{ padding: "20px 16px 40px", background: "rgba(5,5,10,0.85)" }}
        >
          <div className="text-lg font-bold" style={{
            color: state.status === "won" ? C.hunger : C.health,
            marginBottom: "8px",
          }}>
            {state.status === "won" ? "You survived." : "You perished in the dark forest."}
          </div>
          <div className="text-sm" style={{ color: C.muted, marginBottom: "12px" }}>
            Survived {state.hour} hour{state.hour !== 1 ? "s" : ""}
          </div>
          <button
            onClick={onRestart}
            className="cursor-pointer"
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "rgba(20,20,15,0.8)",
              color: C.text,
              border: "1px solid rgba(180,160,120,0.25)",
              fontSize: "0.85rem",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function MiniBar({ pct, color, dimColor, invert }: {
  pct: number; color: string; dimColor: string; invert?: boolean;
}) {
  const c = Math.max(0, Math.min(1, pct));
  const warn = invert ? c > 0.6 : c < 0.3;
  const col = warn ? dimColor : color;
  return (
    <div className="flex-1" style={{ height: "4px", borderRadius: "2px", background: "rgba(20,20,15,0.6)" }}>
      <div style={{
        height: "100%", borderRadius: "2px", width: `${c * 100}%`,
        background: col, transition: "width 0.3s",
        boxShadow: warn ? `0 0 4px ${col}` : "none",
      }} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="tabular-nums font-semibold" style={{ color, fontSize: "0.7rem" }}>
      {label}:{value}
    </span>
  );
}
