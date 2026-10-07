// Hofmann Trace — Figma plug-in, main thread.
// The drawing app runs in the plug-in window (ui.html, built from the web app).
// This side turns its artwork into one vector layer and keeps the project inside
// that layer, so selecting it and running the plug-in again reopens the drawing.

var PROJECT_KEY = 'project';   // Hofmann project JSON stored on the layer
var META_KEY = 'meta';         // where the artwork sat on the Hofmann canvas, and its size there
var SESSION_KEY = 'session';   // last drawing, kept between runs (figma.clientStorage)
var PREFS_KEY = 'prefs';       // window options (send the grid or not)
var MIN_W = 520, MIN_H = 420;

figma.showUI(__html__, { width: 1080, height: 720, title: 'Hofmann Trace' });

function hofmannNode(node) {
  return node && typeof node.getPluginData === 'function' && node.getPluginData(PROJECT_KEY) ? node : null;
}
function selectedHofmann() {
  var sel = figma.currentPage.selection;
  return sel.length === 1 ? hofmannNode(sel[0]) : null;
}
function readMeta(node) {
  try { return JSON.parse(node.getPluginData(META_KEY) || 'null'); } catch (e) { return null; }
}
function sendSelection() {
  var node = selectedHofmann();
  figma.ui.postMessage({ type: 'selection', id: node ? node.id : null, name: node ? node.name : null });
}

async function sendInit() {
  var node = selectedHofmann(), project = null, target = null, name = null;
  if (node) { project = node.getPluginData(PROJECT_KEY); target = node.id; name = node.name; }
  else {
    try { project = await figma.clientStorage.getAsync(SESSION_KEY) || null; } catch (e) { project = null; }
  }
  var prefs = null; try { prefs = await figma.clientStorage.getAsync(PREFS_KEY) || null; } catch (e) {}
  var meta = node ? readMeta(node) : null;
  var grid = meta && typeof meta.grid === 'boolean' ? meta.grid : !!(prefs && prefs.grid);
  figma.ui.postMessage({ type: 'init', project: project, target: target, name: name, fromLayer: !!node, grid: grid });
  sendSelection();
}

// Build the layer from the SVG the window sends. Its paths come in drawing order:
//   grid (optional) — the circles of the grid, as thin outlines
//   then for each separate shape (msg.layout lists its parts):
//     fill  — the shape's merged outline (with a uniform stroke on it when there is one)
//     rings — its outlined variable-width stroke (filled)
//     plain — its stroke outlines without width points, still as strokes (outlined here)
// One shape and no grid gives a single vector; otherwise a group of vectors.
function buildShape(byPart, frame, sameColour) {
  var fill = byPart.fill || null, strokeParts = [];
  if (byPart.rings) strokeParts.push(byPart.rings);
  if (byPart.plain) {
    var outlined = byPart.plain.outlineStroke();
    byPart.plain.remove();
    if (outlined) { frame.appendChild(outlined); strokeParts.push(outlined); }
  }
  var stroke = null;
  if (strokeParts.length === 1) stroke = strokeParts[0];
  else if (strokeParts.length > 1) stroke = figma.flatten([figma.union(strokeParts, frame)], frame);
  if (stroke && stroke.type !== 'VECTOR') stroke = figma.flatten([stroke], frame);
  var result;
  if (fill && stroke && sameColour) result = figma.flatten([figma.union([fill, stroke], frame)], frame);
  else if (fill && stroke) {
    fill.name = 'Fill'; stroke.name = 'Stroke';
    result = figma.group([fill, stroke], frame);
  } else result = fill || stroke;
  if (result && result.type === 'BOOLEAN_OPERATION') result = figma.flatten([result], frame);
  return result;
}
function buildArtwork(msg) {
  var frame = figma.createNodeFromSvg(msg.svg);
  var kids = frame.children.slice(), at = 0, grid = null, shapes = [];
  if (msg.grid && kids[at]) { grid = kids[at++]; grid.name = 'Grid'; }
  (msg.layout || []).forEach(function (parts) {
    var byPart = {};
    parts.forEach(function (part) { if (kids[at]) byPart[part] = kids[at]; at++; });
    var node = buildShape(byPart, frame, msg.sameColour);
    if (node) shapes.push(node);
  });
  shapes.forEach(function (node, i) { node.name = shapes.length > 1 ? 'Shape ' + (i + 1) : 'Shape'; });
  var result;
  if (shapes.length === 1 && !grid) result = shapes[0];
  else if (shapes.length || grid) result = figma.group((grid ? [grid] : []).concat(shapes), frame);
  if (!result) { frame.remove(); return null; }
  // position of the artwork on the Hofmann canvas (frame origin = canvas origin)
  return { frame: frame, node: result, ox: result.x, oy: result.y, grid: !!grid };
}

async function insert(msg) {
  var built;
  try { built = buildArtwork(msg); }
  catch (e) { figma.ui.postMessage({ type: 'error', message: 'Figma could not build the vector: ' + (e && e.message || e) }); return; }
  if (!built) { figma.ui.postMessage({ type: 'error', message: 'Nothing to insert yet.' }); return; }
  var node = built.node, frame = built.frame;
  var old = msg.target ? await figma.getNodeByIdAsync(msg.target) : null;
  if (old && (old.removed || !hofmannNode(old))) old = null;
  var parent = old ? old.parent : figma.currentPage;
  var w = node.width, h = node.height;
  if (old) {
    // Same place and scale as the layer it replaces: the Hofmann canvas origin stays put.
    var meta = readMeta(old) || { ox: 0, oy: 0, w: old.width, h: old.height };
    var scale = meta.w > 0 ? old.width / meta.w : 1;
    var originX = old.x - meta.ox * scale, originY = old.y - meta.oy * scale;
    var index = parent.children.indexOf(old);
    parent.insertChild(index, node);
    if (Math.abs(scale - 1) > 1e-6) node.rescale(scale);
    node.x = originX + built.ox * scale; node.y = originY + built.oy * scale;
    node.name = old.name;
    old.remove();
  } else {
    parent.appendChild(node);
    var c = figma.viewport.center;
    node.x = Math.round(c.x - w / 2); node.y = Math.round(c.y - h / 2);
    node.name = msg.name || 'Hofmann Trace';
  }
  frame.remove();
  node.setPluginData(PROJECT_KEY, msg.project);
  node.setPluginData(META_KEY, JSON.stringify({ ox: built.ox, oy: built.oy, w: w, h: h, grid: built.grid }));
  node.setRelaunchData({ edit: 'Hofmann Trace drawing' });
  figma.currentPage.selection = [node];
  if (!old) figma.viewport.scrollAndZoomIntoView([node]);
  figma.ui.postMessage({ type: 'inserted', id: node.id, name: node.name, updated: !!old });
  figma.notify(old ? 'Hofmann Trace layer updated' : 'Hofmann Trace layer inserted');
}

figma.ui.onmessage = async function (msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ready') await sendInit();
  else if (msg.type === 'insert') await insert(msg);
  else if (msg.type === 'prefs') { try { await figma.clientStorage.setAsync(PREFS_KEY, { grid: !!msg.grid }); } catch (e) {} }
  else if (msg.type === 'session') { try { await figma.clientStorage.setAsync(SESSION_KEY, msg.project); } catch (e) {} }
  else if (msg.type === 'open-selection') {
    var node = selectedHofmann();
    if (node) { var m = readMeta(node); figma.ui.postMessage({ type: 'load', project: node.getPluginData(PROJECT_KEY), target: node.id, name: node.name, grid: m && typeof m.grid === 'boolean' ? m.grid : undefined }); }
  }
  else if (msg.type === 'resize') figma.ui.resize(Math.max(MIN_W, Math.round(msg.width)), Math.max(MIN_H, Math.round(msg.height)));
  else if (msg.type === 'notify') figma.notify(String(msg.message || ''));
  else if (msg.type === 'close') figma.closePlugin();
};
figma.on('selectionchange', sendSelection);
