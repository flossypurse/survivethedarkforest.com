"use client";

import { useState } from "react";

interface Props {
  onSelectSolo: () => void;
  onSelectMultiplayer: () => void;
}

export default function ModeSelect({ onSelectSolo, onSelectMultiplayer }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "#02020a" }}
    >
      {/* Title */}
      <h1
        className="font-mono font-bold tracking-widest"
        style={{
          color: "#8a8a9a",
          fontSize: "0.7rem",
          letterSpacing: "0.3em",
          marginBottom: "48px",
        }}
      >
        SURVIVE THE DARK FOREST
      </h1>

      {/* Mode buttons */}
      <div className="flex flex-col" style={{ gap: "16px", width: "280px" }}>
        <ModeButton
          title="SOLO"
          subtitle="You vs. the forest. Practice survival."
          onClick={onSelectSolo}
          active={hover === "solo"}
          onHover={() => setHover("solo")}
          onLeave={() => setHover(null)}
          color="#8aab6e"
        />

        <ModeButton
          title="MULTIPLAYER"
          subtitle="Pilots and aliens. Trust no one."
          onClick={onSelectMultiplayer}
          active={hover === "multi"}
          onHover={() => setHover("multi")}
          onLeave={() => setHover(null)}
          color="#c9a0d4"
          comingSoon
        />
      </div>

      {/* Hint */}
      <p
        style={{
          color: "#3a3a44",
          fontSize: "0.65rem",
          marginTop: "40px",
          textAlign: "center",
          maxWidth: "260px",
          lineHeight: "1.5",
        }}
      >
        Solo mode runs locally. Multiplayer connects to a live server with other players.
      </p>
    </div>
  );
}

function ModeButton({
  title,
  subtitle,
  onClick,
  active,
  onHover,
  onLeave,
  color,
  comingSoon,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
  color: string;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={comingSoon ? undefined : onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="cursor-pointer text-left"
      style={{
        padding: "20px 24px",
        borderRadius: "10px",
        background: active && !comingSoon ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
        border: `1px solid ${active && !comingSoon ? color + "40" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.2s",
        opacity: comingSoon ? 0.4 : 1,
      }}
    >
      <div className="flex items-center" style={{ gap: "10px", marginBottom: "6px" }}>
        <span
          className="font-mono font-bold"
          style={{
            color: comingSoon ? "#4a4a54" : color,
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
          }}
        >
          {title}
        </span>
        {comingSoon && (
          <span
            style={{
              color: "#4a4a54",
              fontSize: "0.55rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              border: "1px solid #2a2a34",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            COMING SOON
          </span>
        )}
      </div>
      <p style={{ color: "#5a5a6a", fontSize: "0.7rem", lineHeight: "1.4" }}>
        {subtitle}
      </p>
    </button>
  );
}
