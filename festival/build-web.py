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
scripts = [game / "title.mjs", shared / "cloud.mjs", game / "rhythm.mjs", game / "game.mjs"]
script = "\n".join(re.sub(r"^import .*?;\n", "", path.read_text(), flags=re.M) for path in scripts)
script = script.replace("await fetch('./songs.json').then(response => response.json())",
                        (game / "songs.json").read_text().strip())
script = script.replace("audio.src = songs[selected].audio;",
                        """if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    const bytes = Uint8Array.fromBase64
      ? Uint8Array.fromBase64(document.getElementById(songs[selected].id).textContent)
      : Uint8Array.from(atob(document.getElementById(songs[selected].id).textContent), c => c.charCodeAt(0));
    audio.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));""")
html = html.replace('<script type="module" src="./game.mjs"></script>', "")
audio = "\n".join(f'<script type="application/octet-stream" id="bgm{i}">' +
                  base64.b64encode((game / "audio" / f"bgm{i}.mp3").read_bytes()).decode("ascii") +
                  "</script>" for i in range(1, 4))
html = html.replace("</body>", audio + "\n<script type=\"module\">\n" + script + "\n</script>\n</body>")
(root / "dist").mkdir(exist_ok=True)
(root / "dist/RhythmDuel.html").write_text(html)
