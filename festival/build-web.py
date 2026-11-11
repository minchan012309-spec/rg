"""Package the desktop game's assets into a browser-openable HTML file."""
import base64
import pathlib
import re

root = pathlib.Path(__file__).parent
web = root / "web"
game = web / "game"
shared = web / "shared"


def data(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


html = (game / "index.html").read_text()
styles = (shared / "fonts.css").read_text() + "\n" + (game / "game.css").read_text()
html = re.sub(r'<link rel="stylesheet"[^>]+>\n', "", html)
html = html.replace("</head>", f"<style>\n{styles}</style>\n</head>")
html = html.replace("./icon.png", data(game / "icon.png", "image/png"))
scripts = [game / name for name in ["title.mjs", "remix.mjs", "rhythm.mjs", "course.mjs", "playback.mjs", "arena.mjs", "game.mjs"]]
scripts.insert(1, shared / "cloud.mjs")
script = "\n".join(re.sub(r"^import .*?;\n", "", path.read_text(), flags=re.M) for path in scripts)
script = script.replace("await fetch('./songs.json').then(response => response.json())",
                        (game / "songs.json").read_text().strip())
start = script.index("const loadTrack = ")
end = script.index("const clock = ", start)
script = script[:start] + '''const loadTrack = source => {
  const id = source.split('/').at(-1).split('.')[0];
  const encoded = document.getElementById(id).textContent;
  const bytes = Uint8Array.fromBase64
    ? Uint8Array.fromBase64(encoded)
    : Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  return Promise.resolve(bytes.buffer);
};
''' + script[end:]
html = html.replace('<script type="module" src="./game.mjs"></script>', "")
audio = "\n".join(f'<script type="application/octet-stream" id="bgm{i}">' +
                  base64.b64encode((game / "audio" / f"bgm{i}.mp3").read_bytes()).decode("ascii") +
                  "</script>" for i in range(1, 4))
html = html.replace("</body>", audio + "\n<script type=\"module\">\n" + script + "\n</script>\n</body>")
(root / "dist").mkdir(exist_ok=True)
(root / "dist/RhythmDuel.html").write_text(html)
