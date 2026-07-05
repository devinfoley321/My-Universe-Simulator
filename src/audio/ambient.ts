export interface AmbientAudio {
  toggle(): boolean;
}

/** Procedurally synthesized deep-space drone — no external audio assets required. */
export function createAmbientAudio(): AmbientAudio {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let on = false;

  function build() {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    filter.connect(masterGain);

    const freqs = [55, 82.4, 110, 138.6];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      osc.connect(g);
      g.connect(filter);
      osc.start();
    }

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // faint broadband shimmer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
  }

  return {
    toggle(): boolean {
      if (!ctx) build();
      on = !on;
      if (ctx!.state === 'suspended') ctx!.resume();
      const now = ctx!.currentTime;
      masterGain!.gain.cancelScheduledValues(now);
      masterGain!.gain.setTargetAtTime(on ? 0.55 : 0, now, 0.6);
      return on;
    },
  };
}
