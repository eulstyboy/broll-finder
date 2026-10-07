  /* ---------- Figma plug-in bridge (added by figma-plugin/build.py) ---------- */
  // The window talks to the plug-in's main thread with postMessage. The drawing is
  // inserted as one vector layer; the project travels with it so the layer can be reopened.
  var figmaTarget=null,figmaSelection=null;
  function figmaPost(msg){try{parent.postMessage({pluginMessage:msg},'*');}catch(e){}}
  function figmaSyncBar(){
    var ins=$('figmaInsert'),edit=$('figmaEdit'),fresh=$('figmaNew');if(!ins)return;
    ins.textContent=figmaTarget?'Update layer':'Insert in Figma';
    ins.setAttribute('data-tip',figmaTarget?'replace the Figma layer you are editing':'add this drawing to the Figma page as one vector');
    fresh.hidden=!figmaTarget;
    edit.hidden=!figmaSelection||figmaSelection.id===figmaTarget;
    if(figmaSelection)edit.setAttribute('data-tip','edit the selected layer “'+figmaSelection.name+'”');
  }
  function figmaHasArt(){return state.contours.length>0||Object.keys(state.nodes).some(function(k){return nodeActive(k)&&state.nodes[k].filled;});}
  // SVG for the main thread, in drawing order:
  //   grid (optional) — every circle of the grid as a thin outline
  //   then, for each separate shape: fill (its merged outline, with a uniform stroke on it when there is one),
  //   rings (its variable-width stroke, filled) and plain (its stroke outlines without width points)
  function figmaPolygon(sg){return sampleOutline(sg,2).map(function(p){return[p.x,p.y];});}
  function figmaInside(poly,x,y){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function figmaArea(poly){var s=0;for(var i=0,j=poly.length-1;i<poly.length;j=i++)s+=(poly[j][0]+poly[i][0])*(poly[j][1]-poly[i][1]);return Math.abs(s/2);}
  // the merged outline split into separate shapes: each outer boundary with the holes it directly contains
  function figmaShapes(){
    var chains=(mergedSvgString(false,true)||[]).filter(function(sg){return sg&&sg.segs&&sg.segs.length;});
    var polys=chains.map(figmaPolygon),depth=polys.map(function(p,i){var q=p[0];return polys.reduce(function(n,o,j){return n+(j!==i&&o.length>2&&figmaInside(o,q[0],q[1])?1:0);},0);});
    var shapes=[];chains.forEach(function(sg,i){if(depth[i]%2===0)shapes.push({outer:i,chains:[sg],poly:polys[i],holes:[],area:figmaArea(polys[i])});});
    chains.forEach(function(sg,i){if(depth[i]%2===0)return;var q=polys[i][0],best=null;
      shapes.forEach(function(s){if(depth[s.outer]===depth[i]-1&&figmaInside(s.poly,q[0],q[1])&&(!best||s.area<best.area))best=s;});
      if(best){best.chains.push(sg);best.holes.push(polys[i]);}});
    return shapes;
  }
  function figmaShapeAt(shapes,p){
    for(var i=0;i<shapes.length;i++){var s=shapes[i];if(figmaInside(s.poly,p.x,p.y)&&!s.holes.some(function(h){return figmaInside(h,p.x,p.y);}))return i;}
    var best=0,bd=Infinity;shapes.forEach(function(s,i){s.poly.forEach(function(q){var d=Math.hypot(q[0]-p.x,q[1]-p.y);if(d<bd){bd=d;best=i;}});});return best;
  }
  function figmaArtwork(withGrid){
    var size=canvasSize(),body='',layout=[],shapes=figmaShapes();
    var uniform=strokeOn()&&!widthPoints().length,strokeAttrs=' stroke="'+state.strokeColor+'" stroke-width="'+state.strokeWidth+'" stroke-linejoin="round" stroke-linecap="round"';
    if(withGrid){
      var rings=activeKeys().filter(function(k){return trueRadius(k)>=.5;}).map(function(k){return segsToSvg(circleSegs(k));});
      if(rings.length)body+='<path fill="none" stroke="#8a8a8a" stroke-opacity="'+fmt(Math.max(.15,state.guideOpacity))+'" stroke-width="1" d="'+rings.join(' ')+'"/>';
      else withGrid=false;
    }
    var perShape=shapes.map(function(){return{rings:[],plain:[]};});
    if(strokeOn()&&!uniform){
      state.contours.forEach(function(c){var keys=memberKeys(c),anchor=keys.length?nodeCenter(keys[0]):null;
        appearanceOutline(c).forEach(function(sg,i){var at=figmaShapeAt(shapes,anchor||sg.start),v=variableStroke(c.id,i);if(!perShape[at])return;if(v)perShape[at].rings.push(ringsToSvg(v));else perShape[at].plain.push(segsToSvg(sg));});});
      Object.keys(state.nodes).forEach(function(k){if(nodeActive(k)&&state.nodes[k].filled){var at=figmaShapeAt(shapes,nodeCenter(k));if(perShape[at])perShape[at].plain.push(segsToSvg(circleSegs(k)));}});
    }
    shapes.forEach(function(sh,i){var parts=[],d=sh.chains.map(segsToSvg).join(' ');
      if(fillOn()||uniform){body+='<path fill="'+(fillOn()?state.shapeColor:'none')+'" fill-rule="nonzero"'+(uniform?strokeAttrs:'')+' d="'+d+'"/>';parts.push('fill');}
      if(perShape[i].rings.length){body+='<path fill="'+state.strokeColor+'" fill-rule="nonzero" d="'+perShape[i].rings.join(' ')+'"/>';parts.push('rings');}
      if(perShape[i].plain.length){body+='<path fill="none"'+strokeAttrs+' d="'+perShape[i].plain.join(' ')+'"/>';parts.push('plain');}
      if(parts.length)layout.push(parts);
    });
    return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+fmt(size.W)+'" height="'+fmt(size.H)+'" viewBox="0 0 '+fmt(size.W)+' '+fmt(size.H)+'">'+body+'</svg>',layout:layout,grid:!!withGrid,
      sameColour:!fillOn()||!strokeOn()||state.shapeColor.toLowerCase()===String(state.strokeColor).toLowerCase()};
  }
  async function figmaInsert(){
    finishControlEdit();closeSizePopup(true);
    if(geometryBusy)await whenIdle();
    if(!figmaHasArt()){setStatus('Nothing to insert yet: draw a shape first.');return;}
    if(!fillOn()&&!strokeOn()){setStatus('Fill and stroke are both off: turn one on to insert.');return;}
    var art;try{art=figmaArtwork($('figmaGridIn').checked);}catch(e){setStatus('Could not prepare the vector for Figma.');return;}
    setStatus(figmaTarget?'Updating the Figma layer…':'Inserting into Figma…');
    figmaPost({type:'insert',svg:art.svg,layout:art.layout,grid:art.grid,sameColour:art.sameColour,project:projectJson(false),target:figmaTarget,name:'Hofmann Trace'});
  }
  function figmaLoad(project,target,name){
    if(project&&loadProject(project)){figmaTarget=target||null;if(target)setStatus('Editing the Figma layer “'+name+'”. Update layer replaces it.');}
    else figmaTarget=null;
    figmaSyncBar();
  }
  window.addEventListener('message',function(e){
    var m=e.data&&e.data.pluginMessage;if(!m||typeof m!=='object')return;
    if((m.type==='init'||m.type==='load')&&typeof m.grid==='boolean')$('figmaGridIn').checked=m.grid;
    if(m.type==='init'){
      if(m.project)figmaLoad(m.project,m.target,m.name);
      storageAllowed=true;storageResolve();figmaSyncBar();
    }else if(m.type==='load'){cancelWork();figmaLoad(m.project,m.target,m.name);}
    else if(m.type==='inserted'){figmaTarget=m.id;figmaSyncBar();setStatus(m.updated?'Figma layer updated.':'Inserted in Figma. Run the plug-in on this layer, or use Update layer, to edit it later.');}
    else if(m.type==='selection'){figmaSelection=m.id?{id:m.id,name:m.name}:null;figmaSyncBar();}
    else if(m.type==='error'){setStatus(m.message||'Figma refused the change.');}
  });
  $('figmaInsert').addEventListener('click',figmaInsert);
  $('figmaGridIn').addEventListener('change',function(){figmaPost({type:'prefs',grid:this.checked});});
  $('figmaEdit').addEventListener('click',function(){figmaPost({type:'open-selection'});});
  $('figmaNew').addEventListener('click',function(){figmaTarget=null;figmaSyncBar();setStatus('The next insert creates a new layer.');});
  // window resize from the bottom-right corner. Figma resizes the window a moment after each request, so a
  // fast drag can leave the window behind the pointer and lose it: while dragging, the window is asked to be a
  // little larger than the pointer (the pointer stays inside it) and gets its exact size on release.
  (function(){var grip=$('figmaGrip'),drag=null,frame=null,SLACK=120;
    function size(e,slack){return{width:drag.w+e.screenX-drag.x+slack,height:drag.h+e.screenY-drag.y+slack};}
    function request(e,slack){var s=size(e,slack);drag.last=e;if(frame)return;frame=requestAnimationFrame(function(){frame=null;figmaPost(Object.assign({type:'resize'},s));});}
    function finish(){if(!drag)return;var e=drag.last;if(frame){cancelAnimationFrame(frame);frame=null;}if(e)figmaPost(Object.assign({type:'resize'},size(e,0)));drag=null;grip.classList.remove('dragging');}
    grip.addEventListener('pointerdown',function(e){drag={x:e.screenX,y:e.screenY,w:window.innerWidth,h:window.innerHeight,last:null};grip.classList.add('dragging');try{grip.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();});
    grip.addEventListener('pointermove',function(e){if(drag)request(e,SLACK);});
    grip.addEventListener('pointerup',finish);grip.addEventListener('pointercancel',finish);grip.addEventListener('lostpointercapture',finish);
    window.addEventListener('blur',finish);
  })();
