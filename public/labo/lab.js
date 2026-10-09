/* eulst.app — accueil laboratoire. Les projets viennent de src/app/_projects.ts (via #lab-data). */
(function () {
  var THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  function boot() {
    if (window.THREE) return start();
    var s = document.createElement("script");
    s.src = THREE_SRC; s.async = true;
    s.onload = function () { start(false); }; s.onerror = function () { start(true); };
    document.head.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

function start(noThree) {
  var lab = document.getElementById("lab"), dataEl = document.getElementById("lab-data");
  if (!lab || !dataEl || lab.dataset.ready) return;
  lab.dataset.ready = "1";
  var APPS = JSON.parse(dataEl.textContent || "[]");
  var N = APPS.length;
  if (!N) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = matchMedia("(pointer: coarse)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var stage = $("stage");
  var external = function (u) { return /^https?:\/\//.test(u); };

  /* ---------- three ---------- */
  var T = !noThree && window.THREE, gl = false, renderer, scene, camera, rim, bgScene, bgCam, bgMat, items = [];
  try {
    if (T) {
      renderer = new T.WebGLRenderer({ canvas: $("gl"), antialias: false, powerPreference: "high-performance" });
      gl = true;
    }
  } catch (e) { gl = false; }

  function shade(hex, k) { var c = new T.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); }
  function rand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function frame(g, col) { g.fillStyle = "#17181d"; g.fillRect(0, 0, 64, 64); g.fillStyle = col; g.fillRect(0, 0, 64, 3); g.fillRect(0, 61, 64, 3); g.fillRect(0, 0, 3, 64); g.fillRect(61, 0, 3, 64); }
  var PI = Math.PI;
  var DRAW = {
    "hofmann-trace": function (g, c) {
      frame(g, c); g.strokeStyle = c; g.lineWidth = 2;
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { g.beginPath(); g.arc(16 + i * 16, 16 + j * 16, 5, 0, 7); g.stroke(); }
      g.strokeStyle = "#eceae4"; g.beginPath(); g.moveTo(16, 8); g.lineTo(32, 8); g.arc(32, 16, 8, -PI / 2, PI / 2); g.lineTo(32, 24);
      g.arc(32, 32, 8, -PI / 2, PI / 2, true); g.lineTo(32, 40); g.arc(32, 48, 8, -PI / 2, PI / 2); g.lineTo(16, 56); g.arc(16, 48, 8, PI / 2, PI * 1.5);
      g.lineTo(16, 24); g.arc(16, 16, 8, PI / 2, PI * 1.5); g.stroke();
    },
    "resonances": function (g, c) {
      frame(g, c); [26, 19, 12].forEach(function (r, i) { g.strokeStyle = i % 2 ? "#eceae4" : c; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, r, 0, 7); g.stroke(); });
      g.fillStyle = c; g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fill(); g.fillStyle = "#eceae4"; g.fillRect(33, 29, 3, 3);
    },
    "rene-tiles": function (g, c) {
      frame(g, c); var r = rand(7); var pal = [c, shade(c, .6), shade(c, 1.25), "#eceae4", "#2a2c34", shade(c, .35)];
      for (var i = 0; i < 7; i++) for (var j = 0; j < 7; j++) { g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(5 + i * 8, 5 + j * 8, 7, 7); }
    },
    "generic": function (g, c) {
      frame(g, c); g.strokeStyle = c; g.lineWidth = 3; g.strokeRect(14, 14, 36, 36);
      g.strokeStyle = "#eceae4"; g.beginPath(); g.arc(32, 32, 10, 0, 7); g.stroke();
    }
  };

  var cube = { size: 1, x: 0, y: 0 }, visH = 1;
  if (gl) {
    renderer.setClearColor(0x0d0e11, 1); renderer.autoClear = false;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(35, 1, .1, 100); camera.position.set(0, 0, 7);
    scene.add(new T.HemisphereLight(0xffffff, 0x1a1b25, .7));
    var key = new T.DirectionalLight(0xffffff, .95); key.position.set(3, 4, 5); scene.add(key);
    rim = new T.DirectionalLight(0x4d5eff, 0); rim.position.set(-4, -1, -3); scene.add(rim);
    bgScene = new T.Scene(); bgCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    bgMat = new T.ShaderMaterial({
      uniforms: { t: { value: 0 }, res: { value: new T.Vector2(1, 1) }, tint: { value: new T.Color(APPS[0].color) }, ten: { value: 0 }, hot: { value: 0 } },
      vertexShader: "void main(){gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: [
        "uniform float t;uniform vec2 res;uniform vec3 tint;uniform float ten;uniform float hot;",
        "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
        "void main(){vec2 uv=(gl_FragCoord.xy-.5*res)/res.y;float r=length(uv);",
        "vec2 p=rot(t*.05+r*(1.6+abs(ten)*2.4))*uv*3.;float tt=t*.12;",
        "for(int i=0;i<4;i++){float fi=float(i);p+=vec2(sin(p.y*1.3+tt*(1.+fi*.4)+fi),cos(p.x*1.1-tt*(1.2+fi*.3)))*.5;}",
        "float v=.5+.5*sin(p.x*.9+p.y*.7);v=floor(v*6.)/6.;",
        "vec3 col=mix(vec3(.050,.052,.062),vec3(.118,.121,.138),v);",
        "col=mix(col,tint*.42,v*v*(.14+abs(ten)*.38+hot*.14));",
        "col*=1.-smoothstep(.35,1.15,r)*.55;gl_FragColor=vec4(col,1.);}"
      ].join("\n"), depthWrite: false, depthTest: false
    });
    bgScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), bgMat));
    var geo = new T.BoxGeometry(1, 1, 1);
    items = APPS.map(function (app, i) {
      var cv = document.createElement("canvas"); cv.width = cv.height = 64;
      (DRAW[app.id] || DRAW.generic)(cv.getContext("2d"), app.color);
      var tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false;
      var grp = new T.Group();
      var mat = new T.MeshLambertMaterial({ map: tex, emissive: new T.Color(app.color), emissiveIntensity: 0 });
      var outMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide });
      var out = new T.Mesh(geo, outMat); out.scale.setScalar(1.1);
      grp.add(out, new T.Mesh(geo, mat)); grp.visible = i === 0; scene.add(grp);
      return { grp: grp, mat: mat, outMat: outMat, col: new T.Color(app.color), ry: i * 1.3 };
    });
  }
  var WHITE = gl ? new T.Color(0xeceae4) : null;

  function layout() {
    if (!gl) return;
    var w = innerWidth, h = innerHeight, pix = w < 760 ? 2 : 3;
    renderer.setPixelRatio(1); renderer.setSize(Math.ceil(w / pix), Math.ceil(h / pix), false);
    bgMat.uniforms.res.value.set(Math.ceil(w / pix), Math.ceil(h / pix));
    camera.aspect = w / h; camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    var r = stage.getBoundingClientRect(), u = h / visH;
    cube.size = Math.min(r.width, r.height) * .44 / u;
    cube.x = ((r.left + r.width / 2) - w / 2) / u;
    cube.y = -((r.top + r.height / 2) - h / 2) / u;
  }
  addEventListener("resize", layout);

  /* ---------- HUD ---------- */
  var GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&$@", scrRaf = 0;
  function scramble(el, text) {
    cancelAnimationFrame(scrRaf);
    if (reduce) { el.textContent = text; return; }
    var t0 = performance.now(), D = 560;
    (function f() {
      var p = (performance.now() - t0) / D, s = "";
      for (var k = 0; k < text.length; k++) { var ch = text[k], lock = .25 + .75 * k / text.length; s += (p >= lock || ch === " ") ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
      el.textContent = s; if (p < 1) scrRaf = requestAnimationFrame(f); else el.textContent = text;
    })();
  }
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var links = Array.prototype.slice.call($("index").querySelectorAll("a[data-i]"));
  links.forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); go(+a.dataset.i); }); });

  function updateHUD() {
    var a = APPS[cur];
    lab.style.setProperty("--item", a.color);
    $("cnt").textContent = pad(cur + 1); $("no").textContent = "N°" + pad(cur + 1);
    $("kind").textContent = a.kind;
    scramble($("title"), a.name);
    $("desc").textContent = a.desc;
    var tr = $("traits"); tr.innerHTML = "";
    a.traits.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; tr.appendChild(li); });
    stage.href = a.url;
    if (external(a.url)) { stage.target = "_blank"; stage.rel = "noopener"; } else { stage.removeAttribute("target"); stage.removeAttribute("rel"); }
    stage.setAttribute("aria-label", "Ouvrir " + a.name);
    $("gPrev").textContent = cur > 0 ? APPS[cur - 1].name : "—";
    $("gNext").textContent = cur < N - 1 ? APPS[cur + 1].name : "—";
    links.forEach(function (b, i) { b.setAttribute("aria-current", i === cur ? "true" : "false"); });
    var slot = $("slot"); slot.classList.remove("enter"); void slot.offsetWidth; slot.classList.add("enter");
    $("live").textContent = a.name + ", " + (cur + 1) + " sur " + N;
  }

  /* ---------- state ---------- */
  var cur = 0, tension = 0, lastInput = 0, busy = false, armed = true, quietT = 0, dragging = false, charge = 0;
  var trans = null, hot = false, hoverAmt = 0, shake = 0, tint = gl ? new T.Color(APPS[0].color) : null;
  var RESIST = reduce ? 180 : 560; /* px de molette pour libérer un objet */
  var DUR = reduce ? .32 : .8;

  function edgeFor(dir) { return (dir > 0 && cur === N - 1) || (dir < 0 && cur === 0); }
  function push(d) {
    var dir = Math.sign(d); if (!dir) return;
    if (edgeFor(dir)) { tension = clamp(tension + d * .3, -.35, .35); shake = Math.max(shake, .25); return; }
    tension += (Math.sign(tension) === -dir ? d * 2.5 : d);
    tension = clamp(tension, -1, 1);
    if (Math.abs(tension) >= 1) go(cur + Math.sign(tension));
  }
  function go(i) {
    i = clamp(i, 0, N - 1); if (i === cur || busy) return;
    var dir = i > cur ? 1 : -1, from = cur; busy = true; armed = false; charge = 0;
    trans = { from: from, to: i, dir: dir, start: performance.now() };
    if (gl) { items[i].grp.visible = true; items[i].ry = items[from].ry - dir * 1.2; }
    cur = i; tension = 0; setHot(false); updateHUD();
    setTimeout(function () { if (gl) items[from].grp.visible = false; trans = null; busy = false; if (performance.now() - lastInput > 200) armed = true; }, DUR * 1000);
  }

  addEventListener("wheel", function (e) {
    e.preventDefault();
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    lastInput = performance.now();
    clearTimeout(quietT); quietT = setTimeout(function () { if (!busy) armed = true; }, 200);
    if (busy || !armed) return; /* absorbe l'inertie du trackpad après un passage */
    push(dy / RESIST);
  }, { passive: false });

  var ty0 = null;
  addEventListener("touchstart", function (e) { if (e.touches.length !== 1) return; ty0 = e.touches[0].clientY; dragging = true; }, { passive: true });
  addEventListener("touchmove", function (e) {
    if (ty0 == null) return; e.preventDefault(); if (busy) return;
    var raw = (ty0 - e.touches[0].clientY) / (innerHeight * (reduce ? .12 : .3));
    tension = edgeFor(Math.sign(raw)) ? clamp(raw * .3, -.35, .35) : clamp(raw, -1.12, 1.12);
    lastInput = performance.now();
  }, { passive: false });
  addEventListener("touchend", function () {
    if (ty0 == null) return; ty0 = null; dragging = false;
    if (Math.abs(tension) >= 1) go(cur + Math.sign(tension));
  });

  function startCharge(dir) {
    if (busy) return;
    if (edgeFor(dir)) { shake = Math.max(shake, .3); tension = dir * .3; lastInput = performance.now(); return; }
    if (reduce || !gl) { go(cur + dir); return; }
    charge = dir;
  }
  addEventListener("keydown", function (e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    var k = e.key;
    if (k === "ArrowDown" || k === "PageDown" || k === "j") { e.preventDefault(); startCharge(1); }
    else if (k === "ArrowUp" || k === "PageUp" || k === "k") { e.preventDefault(); startCharge(-1); }
    else if (k === "Home") { e.preventDefault(); go(0); }
    else if (k === "End") { e.preventDefault(); go(N - 1); }
    else if (/^[1-9]$/.test(k) && +k <= N) go(+k - 1);
  });

  function setHot(v) { hot = v; stage.classList.toggle("hot", v); }
  var lastPointer = "mouse";
  stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") setHot(true); });
  stage.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") setHot(false); });
  stage.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });
  stage.addEventListener("focus", function () { setHot(true); });
  stage.addEventListener("blur", function () { setHot(false); });
  stage.addEventListener("click", function (e) { if (lastPointer !== "mouse" && !hot) { e.preventDefault(); setHot(true); } });
  $("hud").addEventListener("click", function (e) { if (!stage.contains(e.target) && lastPointer !== "mouse") setHot(false); });
  if (coarse) $("hintMain").textContent = "Tire vers le haut, relâche au-delà du trait";

  /* ---------- boucle ---------- */
  var easeIn = function (x) { return x * x * x; };
  var backOut = function (x) { var c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var gFill = $("gFill"), gauge = $("gauge"), last = performance.now(), clock = 0;

  function loop(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    if (charge && !busy) { tension += charge * dt * 7; lastInput = now; if (Math.abs(tension) >= 1) go(cur + charge); }
    if (!dragging && !charge && now - lastInput > 140) tension *= Math.exp(-dt * (reduce ? 9 : 4.5));
    if (Math.abs(tension) < .001) tension = 0;
    hoverAmt += ((hot ? 1 : 0) - hoverAmt) * Math.min(1, dt * 10);
    shake = Math.max(0, shake - dt * 2.6);
    var at = Math.abs(tension), strain = reduce ? 0 : Math.max(0, at - .45) / .55;

    if (gl) {
      tint.lerp(items[cur].col, Math.min(1, dt * 4));
      items.forEach(function (it, i) {
        if (!it.grp.visible) return;
        var y = cube.y, x = cube.x, s = cube.size, spin = .55 + hoverAmt * 1.4 + at * 3, custom = false;
        if (trans && (i === trans.from || i === trans.to)) {
          var p = clamp((now - trans.start) / (DUR * 1000), 0, 1), q;
          if (i === trans.from) { q = clamp(p / .45, 0, 1); if (reduce) s *= 1 - q; else { y += easeIn(q) * visH * .9 * trans.dir; spin += q * 14; } }
          else { q = clamp((p - .12) / .88, 0, 1); if (reduce) s *= q; else { y -= (1 - backOut(q)) * visH * .9 * trans.dir; spin += (1 - q) * 10; } }
        } else if (i === cur) {
          y += Math.sin(clock * 1.6) * .05 * s + tension * .32 * s;
          var sh = (strain * strain * .07 + shake * .06) * s;
          if (!reduce) { x += (Math.random() - .5) * sh; y += (Math.random() - .5) * sh; }
          var k = 1 + hoverAmt * .14 + at * .05;
          it.grp.scale.set(s * k * (1 + at * .07), s * k * (1 - at * .14), s * k * (1 + at * .07)); custom = true;
        }
        if (!custom) it.grp.scale.setScalar(Math.max(.0001, s));
        it.ry += dt * spin * (reduce ? .35 : 1);
        var isCur = i === cur && !trans;
        it.grp.rotation.set(.45 + (isCur ? tension * .75 : 0), it.ry, (isCur && !reduce) ? Math.sin(clock * .9) * .06 : 0);
        it.grp.position.set(x, y, 0);
        var glow = i === cur ? Math.max(hoverAmt, strain) : 0;
        it.outMat.color.setRGB(0, 0, 0).lerp(it.col, glow);
        if (strain > .8 && i === cur) it.outMat.color.lerp(WHITE, (strain - .8) * 4);
        it.mat.emissiveIntensity = hoverAmt * .32 + at * .28;
      });
      rim.color.copy(items[cur].col); rim.intensity = hoverAmt * 1.4 + at * .8;
      bgMat.uniforms.t.value = reduce ? 4 : clock * (1 + at * 2.5);
      bgMat.uniforms.ten.value = tension; bgMat.uniforms.hot.value = hoverAmt; bgMat.uniforms.tint.value.copy(tint);
      renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth(); renderer.render(scene, camera);
    }

    lab.style.setProperty("--t", reduce ? 0 : tension.toFixed(3));
    lab.style.setProperty("--j", reduce ? "0px" : ((Math.random() - .5) * strain * 5).toFixed(2) + "px");
    var f = Math.min(1, at) * 50;
    gFill.style.height = f + "%"; gFill.style.top = (tension >= 0 ? 50 : 50 - f) + "%";
    gauge.classList.toggle("ready", at >= 1);
    requestAnimationFrame(loop);
  }

  layout();
  requestAnimationFrame(function (t) { last = t; layout(); scramble($("title"), APPS[0].name); requestAnimationFrame(loop); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
}
})();
