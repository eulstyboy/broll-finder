# Figma Community listing — Hofmann Trace

Text to paste into the publish form (Figma desktop → Plugins → Development →
Hofmann Trace → Publish). Images are in this folder.

## Images

| Field | File | Size |
| --- | --- | --- |
| Icon | `icon-dark-128.png` (or `icon-light-128.png`) | 128 × 128 |
| Thumbnail (cover) | `cover-1920x1080.png` | 1920 × 1080 |
| Carousel | `carousel-1.png` … `carousel-4.png` | 1920 × 1080 |

`icon-*-512.png` are the same icons at 512 px, in case Figma asks for more.

## Name

Hofmann Trace

## Tagline

Draw shapes from a grid of circles, then insert them as editable vectors.

## Category

Design tools

## Tags

shapes, geometry, grid, circles, vector, logo, symmetry, pattern, generative, swiss design

## Description

Hofmann Trace turns a grid of circles into shapes. Circle a few dots and a rubber band tightens around them into an exact path of tangents and arcs, after the system Armin Hofmann describes in his *Graphic Design Manual* (1965).

**Draw**
- Lasso, polygon and pencil tools to pick circles; the outline wraps them with tangents.
- Adjust circle size, corner rounding (circles to rounded squares) and junction smoothing.
- Square, staggered or circular grids.
- Mirror, rotation and kaleidoscope symmetry.
- Width tool: thicken or thin the stroke at any point.
- Trace from an image: drop a picture on the canvas, adjust the contrast cutoff, and add the proposed shape.

**In Figma**
- *Insert in Figma* adds the drawing as one vector layer, in the centre of your view.
- Shapes that don't touch become a group, one vector per shape; holes are kept.
- Uniform strokes stay real Figma strokes; variable-width strokes are outlined.
- Tick *grid* to also add the circles as their own layer under the shapes.
- The project is stored in the layer: select it and click *Edit in Hofmann Trace* in the right panel to keep drawing. *Update layer* replaces it in place, at the same position and scale.

**Privacy**
No network access. Your drawing never leaves Figma: the project is stored in the layer, and your last session in Figma's local plug-in storage.

Also available as a web app: https://eulst.app/hofmann-trace

Made by eulst (https://eulst.fr). Based on Hofmann 1.0.0 by bbtgnn. Free and open source under GPL-3.0: https://github.com/eulstyboy/broll-finder/tree/main/figma-plugin

## Support contact

hello@eulst.fr

## Data security disclosure (optional form)

Answers that match the code as it is:

- **Network access:** none. The manifest sets `allowedDomains: ["none"]`, so the plug-in cannot make any request.
- **Data collected or sent to third parties:** none. No analytics, no accounts, no external services.
- **Data stored:**
  - the Hofmann project, inside the inserted layer (`setPluginData`), so the layer can be edited again;
  - the last session and the *grid* preference, in `figma.clientStorage` (local to the user's Figma).
- **Document access:** reads the current selection only to reopen a Hofmann Trace layer; writes only the layers it inserts or updates.
- **Authentication / payments:** none.

## Before publishing

1. In Figma desktop, enable two-factor authentication (required to publish).
2. **Plugins → Development → Import plugin from manifest…** → `figma-plugin/manifest.json`.
3. Publish: Figma gives the plug-in its own ID. Replace `hofmann-trace-dev` in
   `manifest.json` with that ID and commit it, so later updates publish to the same listing.
4. Optional: a real screenshot of the inserted layer in Figma (layers panel visible) makes
   a strong 5th carousel image.
