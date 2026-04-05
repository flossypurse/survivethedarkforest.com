import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "#02020a" }}
    >
      {/* Subtle fire glow at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: "600px",
          height: "300px",
          background: "radial-gradient(ellipse at center bottom, rgba(212,145,92,0.04) 0%, rgba(212,145,92,0.01) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div className="flex flex-col items-center" style={{ padding: "0 24px", maxWidth: "480px" }}>
        {/* Title */}
        <h1
          className="font-mono font-bold tracking-widest text-center"
          style={{
            color: "#8a8a9a",
            fontSize: "clamp(0.8rem, 2.5vw, 1.4rem)",
            letterSpacing: "0.3em",
            marginBottom: "16px",
          }}
        >
          SURVIVE THE DARK FOREST
        </h1>

        {/* Tagline */}
        <p
          className="text-center"
          style={{
            color: "#4a4a5a",
            fontSize: "0.8rem",
            lineHeight: "1.6",
            marginBottom: "48px",
          }}
        >
          They darkened the sky. You fell from it.
        </p>

        {/* CTA */}
        <Link
          href="/play"
          className="font-mono font-bold tracking-widest"
          style={{
            color: "#8aab6e",
            fontSize: "0.85rem",
            letterSpacing: "0.15em",
            padding: "16px 40px",
            borderRadius: "10px",
            background: "rgba(138,171,110,0.04)",
            border: "1px solid rgba(138,171,110,0.15)",
            textDecoration: "none",
            transition: "all 0.2s",
            marginBottom: "64px",
          }}
        >
          ENTER
        </Link>

        {/* Info blurbs */}
        <div
          className="grid gap-8 md:grid-cols-3 w-full"
          style={{ maxWidth: "560px" }}
        >
          <Blurb
            title="SURVIVE 48 HOURS"
            body="Crash-landed in alien darkness. Rescue is coming — if you last."
          />
          <Blurb
            title="EVERY SOUND MATTERS"
            body="Flashlight drains. Lighter runs out. Noise draws them closer."
          />
          <Blurb
            title="CHOOSE YOUR SIDE"
            body="Play as a stranded pilot — or the thing hunting them."
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute bottom-0 w-full text-center"
        style={{ padding: "16px", color: "#1a1a24", fontSize: "0.55rem" }}
      >
        survivethedarkforest.com
      </div>
    </div>
  );
}

function Blurb({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center md:text-left">
      <h3
        className="font-mono font-bold"
        style={{
          color: "#5a5a6a",
          fontSize: "0.55rem",
          letterSpacing: "0.12em",
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>
      <p style={{ color: "#3a3a44", fontSize: "0.7rem", lineHeight: "1.5" }}>
        {body}
      </p>
    </div>
  );
}
