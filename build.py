"""Builds the hostable site into docs/ from page.html.

page.html is the source (and the version published as a Claude artifact, which
loads fonts and three.js from CDNs). docs/ is self-contained: fonts and three.js
are served from the same origin and the script lives in app.js, so the page runs
under a strict Content-Security-Policy (script-src 'self').

    python build.py [path-to-unpacked-npm-packages]
"""
import shutil
import sys
from pathlib import Path

root = Path(__file__).parent
dist = root / "docs"
npm = Path(sys.argv[1]) if len(sys.argv) > 1 else root / ".npm"

FONTS = {  # fontsource package -> (css family, weights)
    "b612-mono": ("B612 Mono", [400, 700]),
    "b612": ("B612", [400, 700]),
    "big-shoulders-display": ("Big Shoulders Display", [800, 900]),
    "doto": ("Doto", [700, 900]),
    "chivo-mono": ("Chivo Mono", [400, 600]),
    "pixelify-sans": ("Pixelify Sans", [400, 600]),
    "overpass": ("Overpass", [300, 400, 800]),
}
LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"


def pkg(name):
    hits = sorted(npm.glob(f"x-{name}-[0-9]*/package"))
    if not hits:
        sys.exit(f"missing npm package {name} in {npm}")
    return hits[-1]


page = (root / "page.html").read_text(encoding="utf-8")
head_end = page.index("</style>") + len("</style>")
head, body = page[:head_end], page[head_end:]

# local fonts instead of Google Fonts
head = "\n".join(l for l in head.splitlines() if "fonts.googleapis.com" not in l and "fonts.gstatic.com" not in l)
head = head.replace("<style>", '<link rel="stylesheet" href="fonts/fonts.css">\n<style>', 1)

# script into app.js, three.js from vendor/
cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert cdn in body
s0 = body.index("<script>\n")
s1 = body.index("</script>", s0)
app = body[s0 + len("<script>\n"):s1]
body = body[:s0] + '<script src="app.js"></script>' + body[s1 + len("</script>"):]
body = body.replace(cdn, '<script src="vendor/three.min.js"></script>')

if dist.exists():
    shutil.rmtree(dist)
(dist / "fonts").mkdir(parents=True)
(dist / "vendor").mkdir()
shutil.copytree(root / "assets", dist / "assets")
shutil.copy(pkg("three") / "build" / "three.min.js", dist / "vendor" / "three.min.js")
shutil.copy(pkg("three") / "LICENSE", dist / "vendor" / "three.LICENSE.txt")

css = []
for name, (family, weights) in FONTS.items():
    files = pkg(f"fontsource-{name}") / "files"
    for w in weights:
        f = files / f"{name}-latin-{w}-normal.woff2"
        if not f.exists():
            sys.exit(f"missing {f}")
        shutil.copy(f, dist / "fonts" / f.name)
        css.append(f"@font-face{{font-family:'{family}';font-style:normal;font-display:swap;font-weight:{w};"
                   f"src:url({f.name}) format('woff2');unicode-range:{LATIN}}}")
    lic = pkg(f"fontsource-{name}") / "LICENSE"
    if lic.exists():
        shutil.copy(lic, dist / "fonts" / f"{name}.LICENSE.txt")
(dist / "fonts" / "fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")

html = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">\n'
        + head + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
(dist / "index.html").write_text(html, encoding="utf-8")
(dist / "app.js").write_text(app, encoding="utf-8")
size = sum(p.stat().st_size for p in dist.rglob("*") if p.is_file())
print(f"docs: {size / 1e6:.1f} MB")
