# Henriks Flugbuch

My project page, live at **[henrik.click](https://henrik.click)**.

You scroll from orbit down to a runway. In between, each project takes over the
whole screen in its own look: BitDM as its dot-matrix device front, Lyrics in the
Sky as the mod's real video with a Minecraft menu, FlightAssistant as its green
HUD, Seamless Loading Screen dissolving a screenshot chunk by chunk, SaveMyKeybinds
as a working key-binding menu, and BeamNG.Earth on real in-game screenshots.

## Files

| Path | What it is |
|---|---|
| `page.html` | The source: markup, styles and script in one file |
| `assets/` | Images, the mod video, and the climate grid for the planet |
| `build.py` | Builds `docs/`: fonts and three.js served locally, script in `app.js`, so the page runs under `script-src 'self'` |
| `docs/` | The finished site (GitHub Pages and the server serve this folder) |
| `serve_csp.py` | Local preview of `docs/` with the same Content-Security-Policy as the server |

```
python build.py <folder with unpacked npm packages>
python serve_csp.py 4174
```

`build.py` expects `three@0.128.0` and the `@fontsource` packages for B612, B612 Mono,
Big Shoulders Display, Doto, Chivo Mono, Pixelify Sans and Overpass, each unpacked
into `x-<package>-<version>/package`.

## Credits

- Planet colours: Köppen-Geiger climate classes from Beck et al. (2023), *Scientific
  Data* 10, 724, CC BY 4.0, taken from the copy in BeamNG.Earth. The block mountains
  are made up.
- BeamNG.Earth screenshots: from the [BeamNG.Earth](https://github.com/TecnaGamer/BeamNG.Earth)
  docs, MIT, © TecnaGamer.
- FlightAssistant logo: from [FlightAssistant](https://github.com/Octol1ttle/FlightAssistant)
  by Octol1ttle, LGPL-3.0.
- Fonts: B612 and B612 Mono (Airbus), Big Shoulders Display, Doto, Chivo Mono,
  Pixelify Sans, Overpass, all under the SIL Open Font License (licence files in `docs/fonts/`).
- 3D: [three.js](https://threejs.org) r128, MIT.
