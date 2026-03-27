"use client";

import type { GameState } from "@/lib/game-state";
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

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Top bar — status */}
      <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
        <div className="flex items-center gap-4">
          <StatusBadge
            label={state.phase === "day" ? "DAY" : "NIGHT"}
            color={isNight ? "#6366f1" : "#f59e0b"}
          />
          <span className="text-xs" style={{ color: "#8b8fa3" }}>
            Day {state.day} / {DAYS_TO_SURVIVE}
          </span>
        </div>
      </div>

      {/* Left side — vitals */}
      <div className="absolute left-4 top-14 flex flex-col gap-2 pointer-events-auto">
        <VitalBar
          label="Health"
          value={state.health}
          max={MAX_HEALTH}
          color="#ef4444"
          lowColor="#7f1d1d"
        />
        <VitalBar
          label="Fire"
          value={state.fire}
          max={FIRE_MAX}
          color="#f59e0b"
          lowColor="#78350f"
        />
        <VitalBar
          label="Hunger"
          value={MAX_HUNGER - state.hunger}
          max={MAX_HUNGER}
          color="#22c55e"
          lowColor="#14532d"
          invert
        />
      </div>

      {/* Right side — resources */}
      <div className="absolute right-4 top-14 flex flex-col gap-1 pointer-events-auto text-right">
        <Resource label="Wood" value={state.wood} />
        <Resource label="Food" value={state.food} />
        <Resource label="Materials" value={state.materials} />
        {state.traps > 0 && <Resource label="Traps" value={state.traps} />}
        {state.hasShelter && (
          <div className="text-xs" style={{ color: "#a78bfa" }}>
            Shelter built
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom — actions + log */}
      <div className="pointer-events-auto">
        {/* Event log */}
        <div className="px-4 pb-2 max-h-32 overflow-hidden">
          <div className="flex flex-col gap-0.5">
            {state.log.slice(-5).map((entry, i) => (
              <div
                key={`${entry.tick}-${i}`}
                className="text-xs"
                style={{
                  color:
                    entry.type === "danger"
                      ? "#ef4444"
                      : entry.type === "success"
                        ? "#22c55e"
                        : entry.type === "discovery"
                          ? "#a78bfa"
                          : "#6b7280",
                  opacity: 0.5 + (i / 5) * 0.5,
                }}
              >
                {entry.message}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {isPlaying ? (
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <ActionButton
              label="Stoke Fire"
              sublabel={`${state.wood} wood`}
              onClick={onAddWood}
              disabled={state.wood <= 0}
              color="#f59e0b"
            />
            <ActionButton
              label={forageCooldown > 0 ? `Forage (${forageCooldown}s)` : "Forage"}
              onClick={onForage}
              disabled={isNight || forageCooldown > 0}
              color="#22c55e"
            />
            <ActionButton
              label="Eat"
              sublabel={`${state.food} food`}
              onClick={onEat}
              disabled={state.food <= 0 || state.hunger <= 0}
              color="#3b82f6"
            />
            <ActionButton
              label="Build Trap"
              sublabel={`${TRAP_MATERIAL_COST} mat`}
              onClick={onBuildTrap}
              disabled={state.materials < TRAP_MATERIAL_COST}
              color="#8b5cf6"
            />
            {!state.hasShelter && (
              <ActionButton
                label="Build Shelter"
                sublabel={`${SHELTER_MATERIAL_COST} mat`}
                onClick={onBuildShelter}
                disabled={state.materials < SHELTER_MATERIAL_COST}
                color="#8b5cf6"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 pb-6">
            <div
              className="text-lg font-bold"
              style={{
                color: state.status === "won" ? "#22c55e" : "#ef4444",
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
              className="px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #334155",
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
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ color, border: `1px solid ${color}33`, background: `${color}11` }}
    >
      {label}
    </div>
  );
}

function VitalBar({
  label,
  value,
  max,
  color,
  lowColor,
  invert,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  lowColor: string;
  invert?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const isLow = invert ? ratio < 0.3 : ratio < 0.3;
  const barColor = isLow ? lowColor : color;

  return (
    <div className="w-28">
      <div className="flex justify-between text-xs mb-0.5">
        <span style={{ color: "#8b8fa3" }}>{label}</span>
        <span style={{ color: barColor }}>{Math.round(value)}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "#1e293b" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${ratio * 100}%`,
            background: barColor,
            boxShadow: isLow ? `0 0 6px ${barColor}` : "none",
          }}
        />
      </div>
    </div>
  );
}

function Resource({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-xs">
      <span style={{ color: "#8b8fa3" }}>{label}: </span>
      <span style={{ color: "#e2e8f0" }} className="font-medium">
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  sublabel,
  onClick,
  disabled,
  color,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: disabled ? "#111827" : "#1e293b",
        color: disabled ? "#4b5563" : color,
        border: `1px solid ${disabled ? "#1f2937" : color + "44"}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
      {sublabel && (
        <span className="ml-1" style={{ color: "#6b7280", fontSize: "0.65rem" }}>
          ({sublabel})
        </span>
      )}
    </button>
  );
}
