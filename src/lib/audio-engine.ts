// ── Procedural audio engine using Web Audio API ──
// All sounds are generated — no audio files needed

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let initialized = false;

function getCtx(): AudioContext | null {
  if (!initialized) return null;
  return ctx;
}

export function initAudio(): void {
  if (initialized) return;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
    initialized = true;
  } catch {
    // Audio not available
  }
}

// Resume on user interaction (browsers require this)
export function resumeAudio(): void {
  if (ctx?.state === "suspended") ctx.resume();
}

// ── Noise generator helper ──
function createNoise(duration: number, volume: number): AudioBufferSourceNode | null {
  const c = getCtx();
  if (!c || !masterGain) return null;

  const sampleRate = c.sampleRate;
  const length = sampleRate * duration;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }

  const source = c.createBufferSource();
  source.buffer = buffer;
  return source;
}

// ── Footstep ──
export function playFootstep(volume: number = 0.3): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const noise = createNoise(0.08, 0.3);
  if (!noise) return;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400 + Math.random() * 200;

  const gain = c.createGain();
  gain.gain.setValueAtTime(volume * 0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
  noise.stop(c.currentTime + 0.08);
}

// ── Forage rustle ──
export function playForage(): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  // Multiple short rustles
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.12 + Math.random() * 0.05;
    const noise = createNoise(0.15, 0.4);
    if (!noise) continue;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800 + Math.random() * 1200;
    filter.Q.value = 2;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.12, c.currentTime + delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(c.currentTime + delay);
    noise.stop(c.currentTime + delay + 0.15);
  }
}

// ── Fire crackle (continuous, spatial) ──
let fireInterval: ReturnType<typeof setInterval> | null = null;

export function updateFireCrackle(intensity: number, distance: number): void {
  // Intensity 0-1, distance in pixels
  if (intensity <= 0 || distance > 300) {
    if (fireInterval) { clearInterval(fireInterval); fireInterval = null; }
    return;
  }

  if (fireInterval) return; // Already crackling

  fireInterval = setInterval(() => {
    const c = getCtx();
    if (!c || !masterGain) return;

    if (Math.random() > 0.4) return; // Not every interval

    const vol = Math.max(0.01, intensity * 0.08 * Math.max(0.1, 1 - distance / 300));
    const noise = createNoise(0.04, 0.5);
    if (!noise) return;

    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1500 + Math.random() * 2000;

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    noise.stop(c.currentTime + 0.04);
  }, 80);
}

export function stopFireCrackle(): void {
  if (fireInterval) { clearInterval(fireInterval); fireInterval = null; }
}

// ── Flashlight click ──
export function playFlashlightClick(): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(2000, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.02);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + 0.03);
}

// ── Weapon hit ──
export function playWeaponHit(killed: boolean): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  // Impact thud
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(killed ? 120 : 80, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.15);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + 0.15);

  // Noise burst
  const noise = createNoise(0.1, 0.5);
  if (noise) {
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.1, c.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    noise.connect(nGain);
    nGain.connect(masterGain);
    noise.start();
    noise.stop(c.currentTime + 0.1);
  }
}

// ── Creature growl (spatial — panned by direction) ──
export function playCreatureSound(
  type: "timid" | "predator" | "stalker",
  direction: number, // angle in radians relative to player
  distance: number, // pixels
): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const vol = Math.max(0.02, 0.15 * (1 - Math.min(1, distance / 400)));

  // Stereo panning based on direction
  const panner = c.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, Math.cos(direction) * 0.8));

  if (type === "predator") {
    // Low growl
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60 + Math.random() * 20, c.currentTime);
    osc.frequency.linearRampToValueAtTime(40, c.currentTime + 0.5);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.7, c.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.6);
  } else if (type === "stalker") {
    // Eerie whisper
    const noise = createNoise(0.4, 0.3);
    if (!noise) return;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000 + Math.random() * 1000;
    filter.Q.value = 8;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.5, c.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(masterGain);
    noise.start();
    noise.stop(c.currentTime + 0.4);
  } else {
    // Timid — skitter/rustle
    const noise = createNoise(0.12, 0.3);
    if (!noise) return;

    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3000;

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol * 0.3, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(masterGain);
    noise.start();
    noise.stop(c.currentTime + 0.12);
  }
}

// ── Heartbeat (gets faster as danger increases) ──
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentHeartbeatRate = 0;

export function updateHeartbeat(dangerLevel: number): void {
  // dangerLevel 0-1: 0 = safe, 1 = imminent death
  const targetRate = dangerLevel > 0.2 ? 300 + (1 - dangerLevel) * 500 : 0; // ms between beats

  if (targetRate === 0 && heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    currentHeartbeatRate = 0;
    return;
  }

  if (Math.abs(targetRate - currentHeartbeatRate) < 50 && heartbeatInterval) return;

  if (heartbeatInterval) clearInterval(heartbeatInterval);
  currentHeartbeatRate = targetRate;
  if (targetRate === 0) return;

  heartbeatInterval = setInterval(() => {
    const c = getCtx();
    if (!c || !masterGain) return;

    const vol = 0.04 + dangerLevel * 0.08;

    // Thump-thump
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.12;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(50, c.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + delay + 0.08);

      const gain = c.createGain();
      gain.gain.setValueAtTime(vol, c.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.1);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + 0.1);
    }
  }, targetRate);
}

// ── Ambient wind (continuous low background) ──
let windNode: AudioBufferSourceNode | null = null;

export function startAmbientWind(): void {
  const c = getCtx();
  if (!c || !masterGain || windNode) return;

  const sampleRate = c.sampleRate;
  const duration = 4;
  const length = sampleRate * duration;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  windNode = c.createBufferSource();
  windNode.buffer = buffer;
  windNode.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;

  const gain = c.createGain();
  gain.gain.value = 0.03;

  windNode.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  windNode.start();
}

// ── Fire start (lighter flick) ──
export function playLighterFlick(): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  // Metallic click
  const click = c.createOscillator();
  click.type = "square";
  click.frequency.value = 4000;
  const clickGain = c.createGain();
  clickGain.gain.setValueAtTime(0.06, c.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.015);
  click.connect(clickGain);
  clickGain.connect(masterGain);
  click.start();
  click.stop(c.currentTime + 0.015);

  // Flame whoosh
  const noise = createNoise(0.3, 0.4);
  if (!noise) return;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(500, c.currentTime + 0.05);
  filter.frequency.linearRampToValueAtTime(2000, c.currentTime + 0.15);
  filter.frequency.linearRampToValueAtTime(800, c.currentTime + 0.35);
  filter.Q.value = 1;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime + 0.04);
  gain.gain.linearRampToValueAtTime(0.1, c.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(c.currentTime + 0.04);
  noise.stop(c.currentTime + 0.35);
}

// ── Damage taken ──
export function playDamageTaken(): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.2);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

// ── Cleanup ──
export function cleanupAudio(): void {
  stopFireCrackle();
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  if (windNode) { windNode.stop(); windNode = null; }
  if (ctx) { ctx.close(); ctx = null; }
  initialized = false;
}
