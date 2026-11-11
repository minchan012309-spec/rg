"""Fit a full-song beat grid to the supplied recordings and place paired turns on it."""
import json
import pathlib
import shutil
import subprocess
import sys

import numpy as np
from scipy.ndimage import gaussian_filter1d

game = pathlib.Path(__file__).parent / "web/game"
# The dominant beat periods measured on the three supplied recordings. These
# avoid confusing a three-beat cross rhythm with the main pulse in Remix 6.
recordings = [("Remix 10", .375), ("Remix 6", .43243), ("Remix 4", .54054)]
def onset_strength(source):
    audio = np.frombuffer(subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(source), "-ar", "11025",
        "-ac", "1", "-f", "f32le", "-",
    ]), dtype="<f4")
    hop = 55
    frames = np.lib.stride_tricks.sliding_window_view(audio, 512)[::hop]
    spectrum = np.log1p(15 * np.abs(np.fft.rfft(frames * np.hanning(512))))
    changes = np.maximum(0, np.diff(spectrum, axis=0))
    bands = np.array([changes[:, low:high].mean(axis=1)
                      for low, high in [(1, 9), (9, 35), (35, 105), (105, 224)]])
    flux = gaussian_filter1d((bands / (gaussian_filter1d(bands, 100, axis=1) + .07)).mean(axis=0), 1.6)
    times = (np.arange(len(flux)) * hop + 284) / 11025
    return times, flux, len(audio) / 11025


def fit_grid(times, flux, duration, nominal_period):
    phases = np.arange(0, nominal_period, .004)
    pulses = np.arange(2, int(duration / nominal_period) - 2)
    best = (-np.inf, 0., 0.)
    for period in nominal_period + np.arange(-.0012, .00121, .00004):
        grid = phases[:, None] + pulses * period
        strengths = np.interp(grid, times, flux).mean(axis=1)
        i = strengths.argmax()
        best = max(best, (strengths[i], period, phases[i]))
    _, period, phase = best
    base = phase + np.arange(int((duration - phase) / period) + 1) * period
    # Refine the phase over overlapping musical sections, keeping the grid
    # continuous through quieter beats and sections with syncopation.
    indices = np.r_[np.arange(0, len(base), 24), len(base) - 1]
    offsets = np.arange(-.045, .046, .003)
    correction = []
    for index in indices:
        window = base[max(0, index - 18):index + 19]
        scores = np.interp(window[:, None] + offsets, times, flux).mean(axis=0)
        correction.append(offsets[np.argmax(scores - .08 * (offsets / .045) ** 2)])
    return base + np.interp(np.arange(len(base)), indices, correction), period


def chart(source, number, name, nominal_period):
    times, flux, duration = onset_strength(source)
    grid, period = fit_grid(times, flux, duration, nominal_period)
    first = int(np.searchsorted(grid, .55))
    prep_beats = 3
    beats_per_turn = 12 + prep_beats
    available = len(grid) - first - 1
    pairs = available // (2 * beats_per_turn)
    spare_pairs = available // 2 - pairs * beats_per_turn
    turns = []
    beat_index = first
    for pair in range(pairs):
        # Put spare beats before the demonstrations, keeping both players equal.
        lead = (spare_pairs * (pair + 1) // pairs) - (spare_pairs * pair // pairs)
        for _ in range(2):
            length = beats_per_turn + lead
            beats = grid[beat_index:beat_index + length + 1]
            beat_index += length
            turns.append(dict(
                start=round(float(beats[0]), 5), beat=round(float(np.diff(beats).mean()), 5),
                beats=[round(float(beat), 5) for beat in beats], demoLead=lead,
            ))
    target = game / "audio" / f"bgm{number}.mp3"
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.resolve() != target.resolve():
        shutil.copyfile(source, target)
    print(f"{name}: {60 / period:.2f} BPM, {len(turns)} turns, "
          f"{turns[0]['start']:.2f}s–{turns[-1]['beats'][-1]:.2f}s of {duration:.2f}s")
    return dict(id=f"bgm{number}", name=name, duration=round(duration, 4),
                bpm=round(60 / period, 1), scoreCap=16000, demoRepeats=2, prepBeats=prep_beats, sceneOffset=[0, 8, 15][number - 1], audio=f"audio/{target.name}", turns=turns)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage: python3 festival/make_charts.py BGM1 BGM2 BGM3")
    songs = [chart(pathlib.Path(path), i, *recording)
             for i, (path, recording) in enumerate(zip(sys.argv[1:], recordings), 1)]
    (game / "songs.json").write_text(json.dumps(songs, separators=(",", ":")) + "\n")
