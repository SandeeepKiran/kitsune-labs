# Synthesise the soundtrack: music and sound effects as one piece, in D major at 100 bpm.
# Writes work/soundtrack.wav (48 kHz stereo). Needs numpy only.
import wave
from pathlib import Path
import numpy as np

SR = 48000
DUR = 21.0
N = int(SR * DUR)
BEAT = 60 / 100
rng = np.random.default_rng(7)
mix_l = np.zeros(N)
mix_r = np.zeros(N)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    mix_l[i:i + len(sig)] += sig * (1 - pan) * 0.5 ** 0.5 * 1.2
    mix_r[i:i + len(sig)] += sig * (1 + pan) * 0.5 ** 0.5 * 1.2


def env_adsr(n, a=0.01, d=0.2, s=0.6, r=0.3):
    t = np.arange(n) / SR
    total = n / SR
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = np.clip((total - t) / r, 0, 1)
    return e * rel


def pluck(midi, length=0.9, bright=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    sig = (np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) + 0.12 * bright * np.sin(6 * np.pi * f * t))
    return sig * np.exp(-t * 5.5) * np.minimum(1, t / 0.004)


def bell(midi, length=2.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    sig = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return sig * np.exp(-t * 1.6) * np.minimum(1, t / 0.003)


def pad(midis, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for m in midis:
        for det in (-0.08, 0.0, 0.08):
            f = hz(m + det)
            sig += np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    sig /= len(midis) * 3
    return sig * env_adsr(n, a=0.6, d=0.5, s=0.85, r=0.8)


def kick(length=0.35):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 18) + 45
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 9)


def soft_noise(length, lo_cut=0.0, decay=6.0, rise=0.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # one-pole low-pass keeps the noise soft (no harsh hiss)
    y = np.zeros(n)
    a = 0.06
    for i in range(1, n):
        y[i] = y[i - 1] + a * (x[i] - y[i - 1])
    e = np.exp(-t * decay) if rise == 0 else np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2
    return y * e * 3


# --- Music ---------------------------------------------------------------
# Chords: D - Bm - G - A, two beats each bar of the loop (bar = 4 beats = 2.4 s).
CHORDS = [[50, 54, 57, 62], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]]
ARP = [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]]
bar = 4 * BEAT
for k in range(int(DUR / bar) + 1):
    start = k * bar
    ch = k % 4
    add(pad(CHORDS[ch], bar + 0.8), start, 0.22)
    # arpeggio starts quiet during the hook, full from the reveal
    for j in range(8):
        tt = start + j * BEAT / 2
        g = 0.05 if tt < 3.4 else 0.09
        add(pluck(ARP[ch][[0, 1, 2, 3, 2, 1, 2, 3][j]] , 0.7, 0.8), tt, g, pan=(-0.3 if j % 2 else 0.3))
# soft kick on every beat from the reveal to the outro
b = 3.4
while b < 19.6:
    add(kick(), b, 0.28)
    b += BEAT
# low D root under the whole outro
add(pad([38, 50], 3.0), 18.4, 0.25)

# --- Sound effects (pitched in D major, mixed under the music) -----------
add(pluck(74, 0.4), 0.15, 0.12)                      # customer bubble pop
add(pluck(69, 0.4), 1.0, 0.12)                       # bot bubble pop
for i, tt in enumerate(np.arange(0.3, 0.95, 0.07)):  # typing, very low
    add(pluck(86 + (i % 2) * 2, 0.08, 0.3), tt, 0.025)
for i, tt in enumerate(np.arange(1.1, 1.85, 0.06)):
    add(pluck(83 + (i % 2) * 2, 0.08, 0.3), tt, 0.025)
add(kick(0.5), 2.0, 0.55)                            # stamp thump
add(soft_noise(0.25, decay=18), 2.0, 0.10)
add(pluck(45, 0.8, 0.5), 2.0, 0.18)
for m, d in ((62, 0.0), (66, 0.05), (69, 0.1), (74, 0.15)):  # reveal chime
    add(bell(m), 3.45 + d, 0.10)
add(pluck(93, 0.12, 0.2), 7.98, 0.06)                # cursor click
add(soft_noise(0.45, rise=1), 8.05, 0.07)            # results wipe
add(bell(81, 1.5), 8.4, 0.05)
scale = [62, 64, 66, 67, 69, 71, 73, 74, 76]
for i in range(9):                                   # cards rise
    add(pluck(scale[i] + 12, 0.35, 0.5), 12.6 + i * 0.09, 0.05, pan=(-0.4 + 0.1 * i))
for i, tt in enumerate(np.linspace(16.3, 16.75, 8)):  # key dots
    add(pluck(90, 0.06, 0.2), tt, 0.02)
for m, d in ((50, 0.0), (62, 0.04), (66, 0.08), (69, 0.12), (74, 0.16)):  # outro chime
    add(bell(m, 3.0), 18.45 + d, 0.09)

# --- Mix: gentle bus compression, fade out, normalise --------------------
st = np.stack([mix_l, mix_r], axis=1)
st = np.tanh(st * 1.4) / 1.4
fade = np.ones(N)
fi = int(0.05 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fo = int(1.6 * SR)
fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
st *= fade[:, None]
st = st / np.max(np.abs(st)) * 0.89
pcm = (st * 32767).astype(np.int16)
out = Path(__file__).parent / "soundtrack.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out)
