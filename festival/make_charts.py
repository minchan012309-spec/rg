"""Generate eight call-and-response turns from the opening beat grid of each MP3."""
import json
import pathlib
import shutil
import subprocess
import sys

import numpy as np

game = pathlib.Path(__file__).parent / "web/game"
patterns = [
    [[0, 0], [1, 2], [2, 2], [3, 1]],
    [[0, 1], [1, 3], [2, 3], [3, 0]],
    [[0, 2], [1.5, 4], [2, 4], [3, 1]],
    [[0, 4], [1.5, 2], [2, 2], [3, 0]],
    [[0, 0], [0.5, 1], [2, 3], [3, 4]],
    [[0, 1], [0.5, 0], [2, 3], [3, 2]],
    [[0, 2], [1, 0], [2.5, 1], [3, 3]],
    [[0, 4], [1, 1], [2.5, 0], [3, 3]],
]


def chart(source, number, name):
    samples = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(source), "-t", "58", "-ar", "11025",
        "-ac", "1", "-f", "f32le", "-",
    ])
    audio = np.frombuffer(samples, dtype="<f4")
    hop = 110
    frames = np.lib.stride_tricks.sliding_window_view(audio, 512)[::hop]
    spectrum = np.log1p(20 * np.abs(np.fft.rfft(frames * np.hanning(512))))
    flux = np.maximum(0, np.diff(spectrum[:, :115], axis=0)).mean(axis=1)
    flux = np.convolve(flux, [0.2, 0.6, 0.2], mode="same")
    time = (np.arange(len(flux)) * hop + 366) / 11025
    best = (-1, 0, 0)
    for beat in np.arange(0.31, 0.66, 0.001):
        phases = np.arange(0, beat, 0.01)
        grid = phases[:, None] + np.arange(4, 68)[None, :] * beat
        strength = np.interp(grid, time, flux).mean(axis=1)
        i = strength.argmax()
        if strength[i] > best[0]:
            best = (strength[i], beat, phases[i])
    _, beat, phase = best
    start = phase + beat * 4
    duration = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(source),
    ]))
    target = game / "audio" / f"bgm{number}.mp3"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    print(name, f"{60 / beat:.1f} BPM", f"first turn {start:.3f}s")
    return dict(id=f"bgm{number}", name=name, duration=duration, bpm=round(60 / beat),
                audio=f"audio/{target.name}", turns=[
                    dict(start=round(start + i * beat * 8, 4), beat=round(beat, 4), hits=pattern)
                    for i, pattern in enumerate(patterns)
                ])


if __name__ == "__main__":
    names = ["Remix 10", "Remix 6", "Remix 4"]
    if len(sys.argv) != 4:
        sys.exit("usage: python3 festival/make_charts.py BGM1 BGM2 BGM3")
    songs = [chart(pathlib.Path(path), i, names[i - 1]) for i, path in enumerate(sys.argv[1:], 1)]
    (game / "songs.json").write_text(json.dumps(songs, indent=2) + "\n")
