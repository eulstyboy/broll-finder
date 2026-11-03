/* eulst.app — logo animé : le loader d'eulst.fr (chauve-souris) rendu image par image puis réduit en pixels, sur les grilles
   du logo statique (17 × 17 cases sur ordinateur, 15 × 15 en mobile, plus une case de marge autour). La dernière image est le logo
   dessiné à la main du SVG de _lab.tsx. Lecture à 15 images par seconde, puis 5 s d'arrêt sur le logo, en boucle.
   Images : lignes en base 36 (bit de gauche = case de gauche), séparées par « , » ; images séparées par « ; ».
   Sans JS ou avec « réduire les animations », le SVG statique reste affiché. */
(function () {
  var FRAMES = { 17: "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0;0,0,0,0,0,e8,e8,0,0,0,ao,3k,0,0,0,0,0,0,0;0,0,0,0,lc,lc,lc,0,0,0,ao,qo,ao,0,0,0,0,0,0;0,0,0,0,ow,ow,74,0,0,0,lc,ow,ow,ow,0,0,0,0,0;0,0,0,0,ao,ow,ao,0,0,0,16o,16o,ow,1hc,ow,0,0,0,0;0,0,0,0,ao,cg,cg,0,0,sg,2rk,sg,lc,1ds,1ds,e8,0,0,0;0,0,0,0,0,cg,cg,cg,0,2dc,2dc,0,16o,1ds,1ds,e8,0,0,0;0,0,0,0,0,0,cg,cg,534,4qo,4qo,0,16o,2rk,2rk,0,0,0,0;0,0,0,0,0,0,0,5c,beo,beo,3k,0,2rk,2rk,sg,0,0,0,0;0,0,0,0,0,0,0,9hc,9hc,9ts,cg,2ps,2rk,2dc,0,0,0,0,0;0,0,0,0,0,0,6bk,m4g,m4g,0,328,340,328,0,0,0,0,0,0;0,0,0,0,0,0,m4g,m4g,9hc,0,2dc,328,ow,ow,0,0,0,0,0;0,0,0,0,0,6bk,m4g,m4g,0,2dc,2dc,0,1ds,1hc,lc,0,0,0,0;0,0,0,0,0,9hc,b28,b28,2dc,2dc,sg,0,1ds,1ds,1ds,e8,0,0,0;0,0,0,0,0,4qo,buo,5j4,2rk,2dc,0,0,16o,2yo,2yo,16o,0,0,0;0,0,0,0,0,2dc,5xc,2rk,2dc,0,0,0,2rk,2rk,2rk,0,0,0,0;0,0,0,0,0,16o,2yo,1ds,e8,0,0,0,2rk,2rk,2dc,0,0,0,0;0,0,0,0,16o,1ds,1hc,qo,ao,0,0,2dc,2dc,2dc,0,0,0,0,0;0,0,0,0,1ds,1ds,1s,68,68,2o,1kw,2dc,2dc,0,0,0,0,0,0;0,0,0,lc,1ds,e8,0,1c,1k,1k,2eo,2dc,0,0,0,0,0,0,0;0,0,lc,1ds,1ds,0,0,0,o,1lo,5js,2dc,0,0,0,0,0,0,0;0,0,lc,2yo,2yo,0,0,0,s,4rg,5jw,5js,2dc,0,0,0,0,0,0;0,lc,1ds,64g,c8w,0,0,0,cnw,nq6,bvg,5js,ca8,174,e8,0,0,0,0;0,lc,1ds,64g,ohs,188w,0,1eko,11y6,m5a,bvc,5ko,ca8,k6o,d9c,o0,74,0,0;e8,1ds,2yo,cg0,1ds0,5fy8,9tz4,47pk,2gim,m5a,bvg,bw8,ojc,19gw,1374,py8,dc,68,5c;e8,2rk,p34,2sxs,5lvk,5kow,avwg,4wzw,2gji,1d1a,oji,ol8,1dvg,1e9o,2o6w,q2g,e0,ds,5c;0,c8w,1edc,2sxs,5lvk,5lvk,5j40,59ng,2gla,1d32,nsu,1dz2,1dz2,2sqk,2rjw,sc,sc,ds,3k;0,ow0,p34,1edc,2sqo,5lvk,5kow,59ng,2gla,1d6m,1d6m,1d6m,2sqm,2t4u,2t4u,s8,rk,cg,3k;0,ow0,p34,1edc,2sqo,5lvk,5lhc,2mv0,2gou,1d6m,1d6m,2rr2,2t4u,2t4u,2t4u,1kg,rk,cg,3k;0,c8w,p34,1e68,2sqo,5lhc,5lhc,2mv0,124e,1d6m,1d6m,2ry6,2t4u,2t4u,2t4s,1kg,rk,cg,0;0,c8w,p34,1e68,2sqo,5lhc,5hjc,2mws,12bi,1ddq,2ry6,2sce,2t4u,2t4u,2t4o,1k0,qo,ao,74;0,c8w,p34,ow0,2sqo,5lhc,5fyw,2n0e,12bi,1ddq,2qda,2t4u,2t4u,2t4u,e7k,1k0,qo,ao,74;0,c8w,c8w,ow0,1ds0,5lhc,5fyw,2gou,15ha,1ddq,2qda,2t4u,2t4u,5m9o,1k0,1j4,ow,ow,74;0,c8w,c8w,ow0,1ds0,5lhc,2muw,12bi,1bsu,2qda,2qda,2t4u,5m9q,5j3s,1j4,1j4,ow,lc,0;0,c8w,c8w,ow0,1ds0,5lhc,2gjc,12bi,1bsu,2qd8,2qd8,2t4u,5m9q,2py8,1j4,1hc,ow,lc,0;0,5xc,c8w,c8w,1ds0,5hj4,2gl8,12bi,1bss,2qd8,2n7g,2t4u,5m9q,151c,1hc,1hc,lc,lc,0;0,4cg,c8w,c8w,1ds0,2oe8,120s,12bi,1bss,2qd8,2n7g,5m9q,5j3y,340,1hc,1ds,lc,e8,0;0,16o,c8w,buo,1ds0,2i34,124c,dfi,1bss,2qd4,2nlo,5m9q,5j3y,328,1hc,1ds,1ds,e8,0;0,16o,c8w,buo,1ds0,2i34,124c,3y4,1bso,2n7c,2oe4,5m9q,5cr2,328,1ds,1ds,16o,e8,0;0,sg,c8w,buo,1ds0,2i40,12bg,t8c,2qd4,2n7c,2t4s,5m9q,2jly,328,1ds,1ds,16o,e8,0;0,sg,c8w,buo,1ds0,2gj4,12bg,zjw,2qd4,2n7c,5m9o,5m9q,2jk6,328,1ds,1ds,16o,16o,0;0,sg,c8w,buo,1czk,2gj4,d18,zjw,2qd4,2n7c,5m9o,5j3y,sci,2yo,1ds,16o,16o,16o,0;0,sg,c8w,buo,1czk,2gj4,d18,1c70,2qd4,2n7c,5m9o,5j3y,32a,2yo,1ds,16o,16o,sg,0;0,sg,c8w,buo,1czk,2gkw,d18,1c70,2qd4,2n7c,5m9o,5cse,32a,2yo,1ds,16o,16o,sg,0;0,sg,c8w,buo,1czk,2gkw,dfg,1c70,2qd4,2n7c,5m9o,5cse,32a,2yo,1ds,16o,16o,sg,0;0,sg,buo,buo,1ds0,2i3c,cu4,1bss,2n7c,2n7c,5m9o,5cse,2yo,2yo,1ds,16o,16o,sg,0", 15: "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0;0,0,0,0,0,74,0,0,0,5c,5c,0,0,0,0,0,0;0,0,0,0,ao,ao,0,0,0,5c,cg,5c,0,0,0,0,0;0,0,0,3k,cg,ao,0,0,0,ao,cg,cg,3k,0,0,0,0;0,0,0,3k,cg,5c,0,0,0,lc,ow,cg,cg,3k,0,0,0;0,0,0,0,5c,5c,5c,0,e8,1ds,0,ow,ow,ao,0,0,0;0,0,0,0,0,68,68,0,16o,16o,0,lc,ow,lc,0,0,0;0,0,0,0,0,1s,68,yo,2rk,sg,0,lc,lc,e8,0,0,0;0,0,0,0,0,0,0,2jk,2jk,1s,e8,1ds,lc,0,0,0,0;0,0,0,0,0,0,1kw,5j4,1q8,68,1j4,1ds,0,0,0,0,0;0,0,0,0,0,0,4qo,4qo,0,qo,1j4,jk,0,0,0,0,0;0,0,0,0,0,4qo,4qo,4qo,0,1ds,1j4,cg,ao,0,0,0,0;0,0,0,0,0,4qo,5j4,1kw,16o,16o,74,ow,ao,0,0,0,0;0,0,0,0,0,5j4,5j4,16o,16o,0,0,ow,ow,74,0,0,0;0,0,0,0,sg,2rk,2rk,1ds,e8,0,0,lc,lc,lc,0,0,0;0,0,0,0,e8,1ds,1ds,e8,0,0,0,1ds,1ds,e8,0,0,0;0,0,0,0,0,ow,ow,74,0,0,e8,1ds,16o,0,0,0,0;0,0,0,0,lc,qo,cg,5c,0,0,16o,16o,0,0,0,0,0;0,0,0,74,ow,74,2o,34,2o,16o,16o,0,0,0,0,0,0;0,0,0,ao,ao,0,0,1k,1k,16o,16o,0,0,0,0,0,0;0,0,ao,ow,74,0,0,o,s,17c,16o,0,0,0,0,0,0;0,0,ow,1hc,e8,0,0,c,2e4,2sc,2rs,e8,0,0,0,0,0;0,74,ow,328,2rk,0,0,c,5ji,2sc,2s8,26w,74,0,0,0,0;0,74,ow,328,buo,6bk,0,m4u,5ji,2sc,2s8,5cg,9ps,bk,4g,0,0;0,74,1hc,64g,1ds0,188w,11xc,m4u,bvi,2sc,5y0,660,a40,j74,6o,68,1s;0,1ds,cjk,1edc,1edc,1czk,188w,izi,bwe,5z2,cak,ccc,oe4,mig,e0,6w,1s;0,64g,p6o,p34,1edc,1ds0,1894,j0e,bwe,cce,cce,ozi,pa4,mik,e4,6o,1s;0,64g,cjk,p34,p34,1e68,1bf0,m66,by6,by6,ozi,pa6,pa6,mws,ds,68,0;0,64g,cjk,cg0,p34,1e68,1bfg,m7y,by6,ola,oou,pa6,pa6,s8,ds,5c,0;0,64g,680,cg0,p34,1e68,1bfg,m7y,c1q,oou,ovy,pa6,pa6,s8,dc,5c,0;0,64g,64g,cg0,p34,1e68,m64,mbi,c1q,oou,pa6,pa6,pa4,s0,dc,5c,0;0,2yo,64g,cg0,ow0,1e68,m64,9oe,oou,oou,pa6,pa6,pa4,s0,dc,cg,0;0,2yo,64g,cg0,ow0,1e68,m7w,9oe,oou,nwe,pa6,1eke,mwo,rk,cg,ao,0;0,2yo,64g,cg0,ow0,1bew,m7y,b9a,oou,nwe,pa6,1eke,3xc,rk,cg,ao,0;0,2yo,64g,64g,ow0,1bfc,9oe,b9a,nwc,nwe,1eke,1eke,rk,qo,ao,ao,0;0,2yo,2yo,5xc,ow0,m54,6im,b9a,nwc,nwc,1eke,1czi,qo,qo,ao,ao,0;0,268,2yo,5xc,ow0,m60,6im,b98,nwc,o3g,1eke,1cyu,qo,ow,ao,74,0;0,268,2yo,5xc,nb4,m60,6im,b98,nwc,oho,1eke,nnk,qo,ow,ao,74,0;0,268,2yo,5xc,nb4,m60,6pq,nwc,nw8,1ekc,1eke,7uo,ow,ow,lc,74,0;0,lc,2yo,5xc,mww,9ko,6po,nwc,nw8,1ekc,1czi,1j4,ow,ow,lc,74,0;0,e8,2yo,5xc,mww,6f0,6po,nw8,mbc,1ekc,1czi,1j4,ow,ow,lc,74,0;0,e8,2yo,5xc,mww,6f0,8ak,nw8,mbc,1ekc,1czi,1hc,ow,lc,lc,74,0;0,e8,2yo,5xc,mww,6f0,8ak,nw8,mbc,1ekc,1cym,1hc,ow,lc,lc,74,0;0,e8,2yo,5xc,mww,6ik,8ak,nw8,mbc,1ekc,1cym,1hc,ow,lc,lc,0,0;0,e8,2yo,5xc,mww,6ik,8ak,nw8,mbc,1ekc,1cym,1hc,ow,lc,lc,0,0;0,e8,2rk,5xc,mww,6ew,8ak,nw8,mbc,1ekc,19se,1hc,ow,lc,lc,74,0" };
  var FPS = 15, HOLD = 5000, CELL = 2;
  var mark = document.querySelector(".eulst-lab .mark");
  if (!mark || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var small = matchMedia("(max-width: 760px)");
  var cache = {};
  function frames(n) {
    if (!cache[n]) cache[n] = FRAMES[n].split(";").map(function (f) { return f.split(",").map(function (r) { return parseInt(r, 36); }); });
    return cache[n];
  }
  var cv = mark.querySelector("canvas.anim"), g = cv && cv.getContext("2d"); if (!g) return;
  mark.classList.add("is-anim");
  var n = 0, t0 = performance.now(), shown = -1, color = "";
  function size() {
    n = small.matches ? 15 : 17; var G = n + 2;
    cv.width = G; cv.height = G; cv.style.width = cv.style.height = G * CELL + "px"; shown = -1;
  }
  function draw(i) {
    var c = getComputedStyle(mark).color;
    if (i === shown && c === color) return;
    shown = i; color = c;
    var f = frames(n)[i], G = n + 2;
    g.clearRect(0, 0, G, G); g.fillStyle = c;
    for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (f[y] >> (G - 1 - x) & 1) g.fillRect(x, y, 1, 1);
  }
  function loop(now) {
    var list = frames(n), play = list.length * 1000 / FPS, t = (now - t0) % (play + HOLD);
    draw(t < play ? Math.min(list.length - 1, Math.floor(t * FPS / 1000)) : list.length - 1);
    requestAnimationFrame(loop);
  }
  size();
  if (small.addEventListener) small.addEventListener("change", size);
  requestAnimationFrame(loop);
})();
