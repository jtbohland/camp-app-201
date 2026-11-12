export type SoundOption = { label: string; emoji: string; play: () => void };

/** Camp-themed alarm sounds made with the Web Audio API (no audio files needed). */
export function createTimerSounds(): SoundOption[] {
  const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

  const playChirp = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(2800, ac.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.7);
  };

  const playBear = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ac.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ac.currentTime + 1.0);
    gain.gain.setValueAtTime(0.5, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 1.2);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 1.2);
  };

  const playOwl = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.6);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.6);
  };

  const playFire = () => {
    const ac = ctx();
    const bufferSize = ac.sampleRate * 0.8;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ac.createBufferSource(); const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    filter.type = "lowpass"; filter.frequency.value = 600;
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.8);
    source.start(ac.currentTime);
  };

  const playBugle = () => {
    const ac = ctx();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination); osc.type = "triangle";
    [523, 659, 784, 1047].forEach((freq, i) => osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.2));
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.setValueAtTime(0.4, ac.currentTime + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.9);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.9);
  };

  return [
    { label: "Chirp", emoji: "🐦", play: playChirp },
    { label: "Bear", emoji: "🐻", play: playBear },
    { label: "Owl", emoji: "🦉", play: playOwl },
    { label: "Fire", emoji: "🔥", play: playFire },
    { label: "Bugle", emoji: "🎺", play: playBugle },
  ];
}
