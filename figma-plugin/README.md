# Hofmann Trace — Figma plug-in

The plug-in opens the Hofmann Trace app inside Figma and inserts the drawing as
**one vector layer**. The Hofmann project is stored in that layer: select it and
run the plug-in (or click **Edit in Hofmann Trace** in the right panel) to reopen
the drawing, then **Update layer** replaces it in place, at the same position and scale.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | plug-in declaration (no network access) |
| `code.js` | Figma side: builds the vector, stores the project, keeps the session |
| `ui.html` | the plug-in window — **generated**, do not edit |
| `src/bridge.js` | what the window adds to the web app (insert / update / edit selection) |
| `build.py` | builds `ui.html` from `public/hofmann-trace/index.html` |

The web app stays the only source of the drawing tools. After any change to
`public/hofmann-trace/index.html`, rebuild the window:

```
python3 figma-plugin/build.py
```

## Try it in Figma

Figma desktop app → **Plugins → Development → Import plugin from manifest…** →
choose `figma-plugin/manifest.json`. Then run it from **Plugins → Development → Hofmann Trace**.

## What goes into Figma

- Fill only, or a stroke without width points: one vector, with the stroke kept as a
  real Figma stroke (still editable in Figma).
- Width points: the stroke is outlined. Same colour as the fill → one vector;
  different colours → a group with a *Fill* and a *Stroke* vector.
- Overlapping shapes are merged into one outline. Separate shapes become a group with one
  vector per shape (*Shape 1*, *Shape 2*…); holes stay inside their shape.
- **grid** (checkbox next to the insert button): also sends the circles of the grid as a
  *Grid* layer under the shapes. The choice is remembered, and kept per layer.

## Publishing to the Figma Community

1. In Figma desktop: **Plugins → Development → New plugin…**, copy the `id` it gives
   into `manifest.json` (replace `hofmann-trace-dev`).
2. Publish from **Plugins → Development → Hofmann Trace → Publish**: name, tagline,
   description, icon (128×128), cover (1920×1080), a few screenshots, support contact.
3. The app is GPL-3.0: the published plug-in stays under the same licence (link to the source).
