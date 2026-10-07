#!/usr/bin/env python3
"""Build the Figma plug-in window (ui.html) from the Hofmann Trace web app.

The web app stays the single source: this script copies public/hofmann-trace/index.html
and only swaps what differs inside Figma (storage, downloads of the web install, the
bridge that inserts the drawing as a layer). Run it after every change to the app:

    python3 figma-plugin/build.py
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'public', 'hofmann-trace', 'index.html')
OUT = os.path.join(HERE, 'ui.html')

def rep(s, old, new, label):
    if s.count(old) != 1:
        sys.exit(f'build: cannot find a unique "{label}" in index.html ({s.count(old)} matches) — the app changed, update build.py')
    return s.replace(old, new)

s = open(SRC, encoding='utf-8').read()
bridge = open(os.path.join(HERE, 'src', 'bridge.js'), encoding='utf-8').read()

# web install: no manifest, icon or service worker inside Figma
s = rep(s, '<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icon.svg"></head>',
        '<script>window.__figmaPlugin=true;</script></head>', 'manifest link')
# plug-in controls in the top bar, before the export menu
s = rep(s, '    <div class="spacer"></div>\n    <div class="group" style="position:relative">\n      <button type="button" class="ibtn" id="exportBtn"',
        '    <div class="spacer"></div>\n'
        '    <div class="group figma-group"><button type="button" class="figma-btn" id="figmaEdit" hidden>Edit selection</button>'
        '<button type="button" class="figma-btn" id="figmaNew" data-tip="stop editing the layer: the next insert adds a new one" hidden>New layer</button>'
        '<label class="figma-check" data-tip="also send the circles of the grid, as a separate layer"><input type="checkbox" id="figmaGridIn"> grid</label>'
        '<button type="button" class="figma-btn primary" id="figmaInsert">Insert in Figma</button></div>\n'
        '    <div class="group" style="position:relative">\n      <button type="button" class="ibtn" id="exportBtn"', 'top bar')
s = rep(s, '  <header class="bar">', '  <div id="figmaGrip" aria-hidden="true"></div>\n  <header class="bar">', 'grip')
s = rep(s, '  .view-tools button{',
        '  .figma-btn{font:12px var(--sans,system-ui);height:30px;padding:0 12px;border-radius:6px;border:1px solid var(--line-2);background:var(--panel-2);color:var(--text);cursor:pointer;margin-left:6px}'
        '.figma-check{display:inline-flex;align-items:center;gap:5px;font:12px var(--sans,system-ui);color:var(--muted);margin-left:10px;cursor:pointer}'
        '.figma-btn.primary{background:#0d99ff;border-color:#0d99ff;color:#fff}.figma-btn[hidden]{display:none}'
        '#shareBtn,#installApp,#updateApp{display:none!important}'
        '#figmaGrip{position:fixed;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;z-index:99;background:linear-gradient(135deg,transparent 50%,var(--line-2) 50%)}\n'
        '  .view-tools button{', 'css')
# storage: Figma keeps the session (clientStorage); no IndexedDB or localStorage in the plug-in window
s = rep(s, '  function saveSession(){\n',
        '  function saveSession(){\n    if(window.__figmaPlugin){if(saveTimer)clearTimeout(saveTimer);saveTimer=null;if(!storageAllowed)return Promise.resolve(false);try{figmaPost({type:"session",project:projectJson(false)});}catch(e){}storageMessage("Saved in Figma");return Promise.resolve(true);}\n',
        'saveSession')
s = rep(s, '  function startStorage(){\n    if(storageStarted)return;storageStarted=true;\n',
        '  function startStorage(){\n    if(storageStarted)return;storageStarted=true;\n    if(window.__figmaPlugin){figmaPost({type:"ready"});return;}\n',
        'startStorage')
s = rep(s, "storageReady.then(offerTour);", "storageReady.then(function(){if(!window.__figmaPlugin)offerTour();});", 'tour')
# the bridge lives inside the app closure, next to the debug hooks
s = rep(s, '  window.__hofmann = { ', bridge + '\n  window.__hofmann = { ', 'bridge anchor')
open(OUT, 'w', encoding='utf-8').write(s)
print(f'ui.html written ({len(s)//1024} KB)')
