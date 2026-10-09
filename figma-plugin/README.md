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

Everything for the publish form is in `listing/`: icon, cover, carousel images and
`LISTING.md` (name, tagline, description, tags, support contact and the answers for
the data security form). `listing/logo-project.json` is the logo as a Hofmann Trace
project; `listing/logo.svg` is its export.

1. Enable two-factor authentication on the Figma account (required to publish).
2. Figma desktop → **Plugins → Development → Import plugin from manifest…** → this `manifest.json`.
3. **Plugins → Development → Hofmann Trace → Publish**, fill the form from `listing/LISTING.md`.
4. The plug-in ID assigned by Figma (`1690359935924296227`) is in `manifest.json`; keep it so
   updates go to the same listing.
5. The app is GPL-3.0 (`LICENSE`): the published plug-in stays under the same licence.
