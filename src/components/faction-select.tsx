"use client";

import { useState } from "react";

export type Faction = "pilot" | "alien";

interface Props {
  onSelect: (faction: Faction) => void;
  onBack: () => void;
}

export default function FactionSelect({ onSelect, onBack }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "#02020a" }}
    >
      <h2
        className="font-mono font-bold tracking-widest"
        style={{
          color: "#5a5a6a",
          fontSize: "0.6rem",
          letterSpacing: "0.25em",
          marginBottom: "40px",
        }}
      >
        CHOOSE YOUR ROLE
      </h2>

      <div className="flex flex-col" style={{ gap: "16px", width: "300px" }}>
        {/* Pilot */}
        <button
          onClick={() => onSelect("pilot")}
          onMouseEnter={() => setHover("pilot")}
          onMouseLeave={() => setHover(null)}
          className="cursor-pointer text-left"
          style={{
            padding: "20px 24px",
            borderRadius: "10px",
            background: hover === "pilot" ? "rgba(138,171,110,0.04)" : "rgba(255,255,255,0.01)",
            border: `1px solid ${hover === "pilot" ? "rgba(138,171,110,0.25)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.2s",
          }}
        >
          <div className="font-mono font-bold" style={{ color: "#8aab6e", fontSize: "0.85rem", letterSpacing: "0.1em", marginBottom: "8px" }}>
            PILOT
          </div>
          <p style={{ color: "#5a5a6a", fontSize: "0.7rem", lineHeight: "1.5" }}>
            Crashed fighter pilot. Survive 48 hours until rescue. Forage, build fires, craft weapons. Stay quiet. Stay alive.
          </p>
        </button>

        {/* Alien */}
        <button
          onClick={() => onSelect("alien")}
          onMouseEnter={() => setHover("alien")}
          onMouseLeave={() => setHover(null)}
          className="cursor-pointer text-left"
          style={{
            padding: "20px 24px",
            borderRadius: "10px",
            background: hover === "alien" ? "rgba(201,160,212,0.04)" : "rgba(255,255,255,0.01)",
            border: `1px solid ${hover === "alien" ? "rgba(201,160,212,0.25)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.2s",
          }}
        >
          <div className="flex items-center" style={{ gap: "10px", marginBottom: "8px" }}>
            <span className="font-mono font-bold" style={{ color: "#c9a0d4", fontSize: "0.85rem", letterSpacing: "0.1em" }}>
              ALIEN
            </span>
            <span style={{
              color: "#4a4a54", fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.08em",
              border: "1px solid #2a2a34", padding: "2px 6px", borderRadius: "4px",
            }}>
              COMING SOON
            </span>
          </div>
          <p style={{ color: "#5a5a6a", fontSize: "0.7rem", lineHeight: "1.5" }}>
            You wear their shape but you are not one of them. Hunt the survivors. The darkness is yours.
          </p>
        </button>
      </div>

      {/* Hint */}
      <p style={{ color: "#2a2a34", fontSize: "0.6rem", marginTop: "32px", textAlign: "center", maxWidth: "260px", lineHeight: "1.5" }}>
        In multiplayer, your role is assigned randomly.
      </p>

      {/* Back */}
      <button
        onClick={onBack}
        className="cursor-pointer font-mono"
        style={{
          color: "#3a3a44",
          fontSize: "0.65rem",
          marginTop: "24px",
          padding: "8px 16px",
          background: "none",
          border: "none",
          letterSpacing: "0.05em",
        }}
      >
        ← BACK
      </button>
    </div>
  );
}
