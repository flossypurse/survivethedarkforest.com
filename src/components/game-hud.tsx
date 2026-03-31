"use client";

import { useState, useEffect, useRef } from "react";
import type { GameState, LogEntry } from "@/lib/game-state";
import {
  FIRE_MAX,
  MAX_HEALTH,
  MAX_HUNGER,
  TRAP_MATERIAL_COST,
  SHELTER_MATERIAL_COST,
  DAYS_TO_SURVIVE,
} from "@/lib/constants";

interface Props {
  state: GameState;
  onAddWood: () => void;
  onForage: () => void;
  onEat: () => void;
  onBuildTrap: () => void;
  onBuildShelter: () => void;
  onRestart: () => void;
}

// ── Toast system ──

interface Toast {
  id: string;
  entry: LogEntry;
  exiting: boolean;
}

function useToasts(log: LogEntry[]) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLenRef = useRef(log.length);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    if (log.length > prevLen) {
      const newEntries = log.slice(prevLen);
      const newToasts: Toast[] = newEntries.map((entry, i) => ({
        id: `${entry.tick}-${prevLen + i}-${Date.now()}`,
        entry,
        exiting: false,
      }));

      setToasts((prev) => [...prev, ...newToasts].slice(-3));

      // Auto-dismiss after 4s
      newToasts.forEach((toast) => {
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === toast.id ? { ...t, exiting: true } : t))
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, 300);
        }, 4000);
      });
    }
    prevLenRef.current = log.length;
  }, [log]);

  return toasts;
}

// ── Icons (simple SVG for zero dependencies) ──

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
  );
}

function DrumstickIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}

function WoodIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
    </svg>
  );
}

function FoodIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function HammerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  );
}

function TrapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}

function ShelterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

// ── Main HUD ──

export default function GameHUD({
  state,
  onAddWood,
  onForage,
  onEat,
  onBuildTrap,
  onBuildShelter,
  onRestart,
}: Props) {
  const isPlaying = state.status === "playing";
  const forageCooldown = Math.max(0, state.forageCooldownUntil - state.tick);
  const isNight = state.phase === "night";
  const toasts = useToasts(state.log);

  const healthRatio = state.health / MAX_HEALTH;
  const fireRatio = state.fire / FIRE_MAX;
  const hungerRatio = (MAX_HUNGER - state.hunger) / MAX_HUNGER;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* ── Top zone: status + vitals + resources ── */}
      <div
        className="pointer-events-auto"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.6) 70%, transparent 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Row 1: Status badge + day + resources (desktop: all inline) */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 md:px-5">
          <div className="flex items-center gap-3">
            <StatusBadge
              label={state.phase === "day" ? "DAY" : "NIGHT"}
              color={isNight ? "#6366f1" : "#f59e0b"}
            />
            <span
              className="text-xs md:text-sm font-medium"
              style={{ color: "#8b8fa3", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              Day {state.day} / {DAYS_TO_SURVIVE}
            </span>
          </div>

          {/* Resources — always visible, compact row */}
          <div className="flex items-center gap-2 md:gap-3">
            <ResourceChip icon={<WoodIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.wood} color="#a3824a" />
            <ResourceChip icon={<FoodIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.food} color="#22c55e" />
            <ResourceChip icon={<HammerIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.materials} color="#60a5fa" />
            {state.traps > 0 && (
              <ResourceChip icon={<TrapIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} value={state.traps} color="#a78bfa" />
            )}
            {state.hasShelter && (
              <div className="flex items-center" style={{ color: "#a78bfa" }}>
                <ShelterIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Vitals as horizontal bars */}
        <div className="flex items-center gap-2 px-3 pb-3 md:px-5 md:gap-4">
          <VitalBar
            icon={<HeartIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            value={state.health}
            max={MAX_HEALTH}
            ratio={healthRatio}
            color="#ef4444"
            lowColor="#7f1d1d"
          />
          <VitalBar
            icon={<FireIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            value={state.fire}
            max={FIRE_MAX}
            ratio={fireRatio}
            color="#f59e0b"
            lowColor="#78350f"
          />
          <VitalBar
            icon={<DrumstickIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            value={MAX_HUNGER - state.hunger}
            max={MAX_HUNGER}
            ratio={hungerRatio}
            color="#22c55e"
            lowColor="#14532d"
          />
        </div>
      </div>

      {/* ── Spacer — canvas breathes here ── */}
      <div className="flex-1" />

      {/* ── Toast event log ── */}
      <div className="px-3 pb-2 md:px-5 flex flex-col gap-1.5 items-start pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter ${toast.exiting ? "toast-exit" : ""}`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              lineHeight: "1.3",
              maxWidth: "min(85vw, 400px)",
              background: "rgba(8,8,15,0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: `1px solid ${
                toast.entry.type === "danger"
                  ? "rgba(239,68,68,0.3)"
                  : toast.entry.type === "success"
                    ? "rgba(34,197,94,0.3)"
                    : toast.entry.type === "discovery"
                      ? "rgba(167,139,250,0.3)"
                      : "rgba(107,114,128,0.2)"
              }`,
              color:
                toast.entry.type === "danger"
                  ? "#fca5a5"
                  : toast.entry.type === "success"
                    ? "#86efac"
                    : toast.entry.type === "discovery"
                      ? "#c4b5fd"
                      : "#9ca3af",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {toast.entry.message}
          </div>
        ))}
      </div>

      {/* ── Bottom zone: actions ── */}
      <div
        className="pointer-events-auto"
        style={{
          background:
            "linear-gradient(to top, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.6) 70%, transparent 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {isPlaying ? (
          <div className="grid grid-cols-2 gap-2 px-3 py-3 md:flex md:flex-wrap md:gap-3 md:px-5 md:py-4">
            <ActionButton
              label="Stoke Fire"
              sublabel={`${state.wood} wood`}
              onClick={onAddWood}
              disabled={state.wood <= 0}
              color="#f59e0b"
              icon={<FireIcon className="w-4 h-4 md:w-5 md:h-5" />}
              urgent={fireRatio < 0.3 && state.wood > 0}
            />
            <ActionButton
              label={forageCooldown > 0 ? `Forage (${forageCooldown}s)` : "Forage"}
              onClick={onForage}
              disabled={isNight || forageCooldown > 0}
              color="#22c55e"
              icon={<WoodIcon className="w-4 h-4 md:w-5 md:h-5" />}
            />
            <ActionButton
              label="Eat"
              sublabel={`${state.food} food`}
              onClick={onEat}
              disabled={state.food <= 0 || state.hunger <= 0}
              color="#3b82f6"
              icon={<DrumstickIcon className="w-4 h-4 md:w-5 md:h-5" />}
              urgent={hungerRatio < 0.3 && state.food > 0}
            />
            <ActionButton
              label="Build Trap"
              sublabel={`${TRAP_MATERIAL_COST} mat`}
              onClick={onBuildTrap}
              disabled={state.materials < TRAP_MATERIAL_COST}
              color="#8b5cf6"
              icon={<TrapIcon className="w-4 h-4 md:w-5 md:h-5" />}
            />
            {!state.hasShelter && (
              <ActionButton
                label="Shelter"
                sublabel={`${SHELTER_MATERIAL_COST} mat`}
                onClick={onBuildShelter}
                disabled={state.materials < SHELTER_MATERIAL_COST}
                color="#8b5cf6"
                icon={<ShelterIcon className="w-4 h-4 md:w-5 md:h-5" />}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-6">
            <div
              className="text-lg md:text-xl font-bold"
              style={{
                color: state.status === "won" ? "#22c55e" : "#ef4444",
                textShadow: `0 0 20px ${state.status === "won" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              }}
            >
              {state.status === "won"
                ? "You survived the dark forest."
                : "You perished in the dark forest."}
            </div>
            <div className="text-sm" style={{ color: "#8b8fa3" }}>
              Survived {state.day - 1} day{state.day - 1 !== 1 ? "s" : ""}
            </div>
            <button
              onClick={onRestart}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #334155",
                minHeight: "44px",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="text-xs md:text-sm font-bold px-2.5 py-1 rounded-md"
      style={{
        color,
        border: `1px solid ${color}33`,
        background: `${color}11`,
        textShadow: `0 0 8px ${color}44`,
      }}
    >
      {label}
    </div>
  );
}

function VitalBar({
  icon,
  value,
  max,
  ratio,
  color,
  lowColor,
}: {
  icon: React.ReactNode;
  value: number;
  max: number;
  ratio: number;
  color: string;
  lowColor: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const isLow = clamped < 0.3;
  const barColor = isLow ? lowColor : color;

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div style={{ color: barColor, flexShrink: 0 }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div
          className="h-2 md:h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(30,41,59,0.7)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${clamped * 100}%`,
              background: barColor,
              boxShadow: isLow ? `0 0 8px ${barColor}` : "none",
            }}
          />
        </div>
      </div>
      <span
        className="text-xs md:text-sm font-medium tabular-nums"
        style={{
          color: barColor,
          minWidth: "1.5rem",
          textAlign: "right",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          flexShrink: 0,
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

function ResourceChip({
  icon,
  value,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1"
      style={{ color, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
    >
      {icon}
      <span className="text-xs md:text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  sublabel,
  onClick,
  disabled,
  color,
  icon,
  urgent,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  icon: React.ReactNode;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2
        px-3 py-2.5 rounded-lg
        text-sm md:text-sm font-medium
        transition-all cursor-pointer
        disabled:cursor-not-allowed
        md:px-4 md:py-3
        ${urgent ? "action-btn-urgent" : ""}
      `}
      style={{
        background: disabled ? "rgba(17,24,39,0.6)" : "rgba(30,41,59,0.7)",
        color: disabled ? "#4b5563" : color,
        border: `1px solid ${disabled ? "rgba(31,41,55,0.5)" : color + "44"}`,
        opacity: disabled ? 0.5 : 1,
        minHeight: "44px",
        backdropFilter: disabled ? "none" : "blur(4px)",
        WebkitBackdropFilter: disabled ? "none" : "blur(4px)",
        boxShadow: urgent ? `0 0 12px ${color}33, inset 0 0 12px ${color}11` : "none",
        textShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
      {sublabel && (
        <span
          className="text-xs"
          style={{ color: disabled ? "#374151" : "#6b7280" }}
        >
          ({sublabel})
        </span>
      )}
    </button>
  );
}
