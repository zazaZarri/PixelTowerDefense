"use strict";
// ===== Editor ARMI: disegna o carica un'immagine, scegli effetti, grandezza, suoni =====
const WeaponEditor={
  isOpen:false, tool:"pencil", color:"#f4f4f4", mirror:false, undo:[], recent:[],
  init(){
    const $=id=>document.getElementById(id);
    Object.assign(this,{ el:$("wEditor"), title:$("wTitle"), code:$("wCode"), hl:$("wHl"), nums:$("wNums"), err:$("wErr"), varList:$("wVarList"),
      pix:$("wPix"), pv:$("wPv"), pvStats:$("wPvStats"), sw:$("wSw"), res:$("wRes"), colorIn:$("wColor"), tsel:$("wTower"), del:$("wDelete") });
    this.px=this.pix.getContext("2d"); this.pvx=this.pv.getContext("2d"); this.pvx.imageSmoothingEnabled=false;
    for(const n of [8,10,12,16,20,24,32,48,64]){ const o=document.createElement("option"); o.value=n; o.textContent=n+"×"+n; this.res.appendChild(o); }
    this.res.onchange=()=>{ this.pushUndo(); this.spr=resizePx(this.spr,+this.res.value); this.changed(); };
    this.colorIn.oninput=()=>{ this.setColor(this.colorIn.value); };
    this.renderSw();
    document.querySelectorAll("[data-wtool]").forEach(b=>b.onclick=()=>this.setTool(b.dataset.wtool));
    $("wMirror").onclick=e=>{ this.mirror=!this.mirror; e.currentTarget.classList.toggle("on",this.mirror); this.drawPix(); };
    $("wFlip").onclick=()=>{ this.pushUndo(); const s=this.spr, o=blankPx(0); o.w=s.w; o.h=s.h; o.px=[]; for(let y=0;y<s.h;y++) for(let x=0;x<s.w;x++) o.px.push(s.px[y*s.w+(s.w-1-x)]); this.spr=o; this.changed(); };
    $("wRot").onclick=()=>{ this.pushUndo(); const s=this.spr, o={w:s.h,h:s.w,px:[]}; for(let y=0;y<o.h;y++) for(let x=0;x<o.w;x++) o.px.push(s.px[(s.h-1-x)*s.w+y]); this.spr=o; this.changed(); };
    $("wUndo").onclick=()=>this.doUndo();
    $("wOutline").onclick=()=>{ this.pushUndo(); const S=this.spr, out=S.px.slice();
      for(let y=0;y<S.h;y++) for(let x=0;x<S.w;x++){ if(S.px[y*S.w+x]) continue; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const c=this.get(x+dx,y+dy); if(c&&c!=="#1a1c2c"){ out[y*S.w+x]="#1a1c2c"; break; } } }
      S.px=out; this.changed(); };
    $("wClear").onclick=()=>{ this.pushUndo(); this.spr=blankPx(this.spr.w); this.changed(); };
    $("wUpload").onclick=()=>$("wFile").click();
    $("wFile").onchange=e=>{ const f=e.target.files[0]; if(f) this.loadImage(f); e.target.value=""; };
    // trascina un'immagine sulla griglia
    this.pix.addEventListener("dragover",e=>{ e.preventDefault(); });
    this.pix.addEventListener("drop",e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f&&f.type.startsWith("image/")) this.loadImage(f); });
    // incolla immagine con CTRL+V
    document.addEventListener("paste",e=>{ if(!this.isOpen) return; const it=[...(e.clipboardData||{}).items||[]].find(i=>i.type.startsWith("image/")); if(it){ e.preventDefault(); this.loadImage(it.getAsFile()); } });
    let down=false;
    const pos=e=>{ const r=this.pix.getBoundingClientRect(), k=288/r.width; const {cell,ox,oy}=this.geo(); return [Math.floor(((e.clientX-r.left)*k-ox)/cell),Math.floor(((e.clientY-r.top)*k-oy)/cell)]; };
    this.pix.addEventListener("pointerdown",e=>{ e.preventDefault(); this.pix.setPointerCapture(e.pointerId); const [x,y]=pos(e);
      if(this.tool==="picker"){ const c=this.get(x,y); if(c) this.setColor(c.slice(0,7)); this.setTool("pencil"); return; }
      this.pushUndo(); if(this.tool==="fill"){ this.fill(x,y,this.color); return; } down=true; this.paint(x,y,e.button===2); });
    this.pix.addEventListener("pointermove",e=>{ this.hover=pos(e); if(down) this.paint(this.hover[0],this.hover[1],e.buttons===2); else this.drawPix(); });
    this.pix.addEventListener("pointerleave",()=>{ this.hover=null; this.drawPix(); });
    window.addEventListener("pointerup",()=>{ down=false; });
    this.pix.addEventListener("contextmenu",e=>e.preventDefault());
    let tmr=0;
    this.code.addEventListener("input",()=>{ this.updCode(); clearTimeout(tmr); tmr=setTimeout(()=>this.apply(),250); });
    this.code.addEventListener("scroll",()=>{ this.hl.scrollTop=this.code.scrollTop; this.hl.scrollLeft=this.code.scrollLeft; this.nums.scrollTop=this.code.scrollTop; });
    this.code.addEventListener("keydown",e=>{ if(e.key==="Tab"){ e.preventDefault(); const t=this.code,a=t.selectionStart; t.value=t.value.slice(0,a)+"  "+t.value.slice(t.selectionEnd); t.selectionStart=t.selectionEnd=a+2; this.updCode(); }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){ e.preventDefault(); this.save(); } });
    document.addEventListener("keydown",e=>{ if(!this.isOpen) return; if(e.key==="Escape") this.close();
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&document.activeElement!==this.code){ e.preventDefault(); this.doUndo(); } });
    $("wSave").onclick=()=>this.save(); $("wCancel").onclick=()=>this.close(); $("wClose").onclick=()=>this.close();
    this.del.onclick=()=>{ if(this.editing&&confirm("Eliminare l'arma \""+this.editing.stats.name+"\"?")){ Game.deleteWeapon(this.editing.id); this.close(); } };
    this.tsel.onchange=()=>this.buildPreview(); $("wPvReset").onclick=()=>this.buildPreview();
    $("wPvSound").onclick=e=>{ this.pvSound=!this.pvSound; e.currentTarget.classList.toggle("on",this.pvSound); if(this.pvWorld) this.pvWorld.sound=this.pvSound; };
    this.pvSound=true; $("wPvSound").classList.add("on");
    this.varList.innerHTML=""; for(const [k,v,d] of WEAPON_VAR_DOCS){ const r=document.createElement("div"); r.className="var";
      r.innerHTML=`<code>var ${k} = ${v.replace(/</g,"&lt;")};</code><span>${d}</span>`; r.onclick=()=>this.insertVar(k,v); this.varList.appendChild(r); }
  },
  geo(){ const n=Math.max(this.spr.w,this.spr.h), cell=Math.floor(288/n); return {cell,ox:Math.floor((288-cell*this.spr.w)/2),oy:Math.floor((288-cell*this.spr.h)/2)}; },
  renderSw(){ this.sw.innerHTML=""; const cols=[...PAL,...this.recent.filter(c=>!PAL.includes(c))].slice(0,24);
    for(const c of cols){ const b=document.createElement("button"); b.className="sw"+(c===this.color?" on":""); b.style.background=c; b.title=c; b.onclick=()=>this.setColor(c); this.sw.appendChild(b); } },
  setColor(c){ this.color=c; this.colorIn.value=c.slice(0,7); if(!PAL.includes(c)&&!this.recent.includes(c)){ this.recent.unshift(c); this.recent=this.recent.slice(0,8); }
    if(this.tool==="eraser"||this.tool==="picker") this.setTool("pencil"); this.renderSw(); },
  setTool(t){ this.tool=t; document.querySelectorAll("[data-wtool]").forEach(b=>b.classList.toggle("on",b.dataset.wtool===t)); },
  syncRes(){ const n=Math.max(this.spr.w,this.spr.h); if([...this.res.options].some(o=>+o.value===n)) this.res.value=n; },

  open(w){
    this.editing=w||null; this.title.textContent=w?"ARMA: "+w.stats.name.toUpperCase():"NUOVA ARMA";
    this.code.value=w?w.code:NEW_WEAPON_CODE; this.spr=w?JSON.parse(JSON.stringify(w.sprite)):JSON.parse(JSON.stringify(W_SPRITES.star));
    this.undo=[]; this.del.style.display=w?"":"none"; this.syncRes();
    this.tsel.innerHTML=""; const nm=w?w.stats.name.toLowerCase():""; let pick=0;
    Game.defs.forEach((d,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=d.stats.name+(d.stats.weapon?" ("+d.stats.weapon+")":""); this.tsel.appendChild(o); if(nm&&d.stats.weapon.toLowerCase()===nm&&!pick) pick=i; });
    this.tsel.value=pick;
    this.isOpen=true; this.el.classList.remove("hidden"); this.updCode(); this.apply(); setTimeout(()=>this.code.focus(),30);
  },
  close(){ this.isOpen=false; this.el.classList.add("hidden"); },
  updCode(){ const v=this.code.value, n=v.split("\n").length; let s=""; for(let i=1;i<=n;i++) s+=i+"\n"; this.nums.textContent=s; this.hl.innerHTML=Editor.highlight(v)+"\n"; this.hl.scrollTop=this.code.scrollTop; },
  insertVar(k,v){ const t=this.code, re=new RegExp("^\\s*(var|let|const)\\s+"+k+"\\s*=.*$","m"), m=re.exec(t.value);
    if(m){ t.focus(); t.selectionStart=m.index; t.selectionEnd=m.index+m[0].length; }
    else { t.value=t.value.replace(/\s*$/,"")+"\nvar "+k+" = "+v+";\n"; this.updCode(); this.apply(); t.focus(); } },
  apply(){ const p=parseWeapon(this.code.value); this.parsed=p;
    this.err.className="err "+(p.ok&&!p.warn.length?"ok":"");
    this.err.textContent=p.ok?(p.warn.length?"⚠ "+p.warn.join(" · "):"✓ Codice valido"):"✗ Errore: "+p.error;
    if(p.ok){ const dup=Weapons.list.find(w=>w.stats.name.toLowerCase()===p.stats.name.toLowerCase()&&(!this.editing||w.id!==this.editing.id));
      if(dup){ this.err.className="err"; this.err.textContent="⚠ Esiste già un'arma chiamata \""+p.stats.name+"\": cambia var name"; } }
    this.drawPix(); this.buildPreview(); return p; },
  save(){ const p=this.apply(); if(!p.ok||this.err.textContent.startsWith("⚠ Esiste")) return this.shake();
    const oldName=this.editing?this.editing.stats.name:null;
    Game.saveWeapon({id:this.editing?this.editing.id:"w"+Date.now().toString(36),code:this.code.value,sprite:this.spr});
    if(oldName&&oldName.toLowerCase()!==p.stats.name.toLowerCase()) alert("Hai rinominato l'arma: aggiorna var weapon = \""+p.stats.name+"\" nei personaggi che la usavano.");
    this.close(); },
  shake(){ const w=this.el.querySelector(".win"); w.classList.remove("shake"); void w.offsetWidth; w.classList.add("shake"); SFX.play("error"); },

  // ---- immagine caricata → pixel ----
  loadImage(file){ const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ URL.revokeObjectURL(url); this.pushUndo();
      const W0=Math.min(512,img.width), H0=Math.round(img.height*W0/img.width), src=document.createElement("canvas"); src.width=W0; src.height=H0;
      const sg=src.getContext("2d"); sg.drawImage(img,0,0,W0,H0); const d=sg.getImageData(0,0,W0,H0).data;
      let x0=W0,y0=H0,x1=-1,y1=-1; for(let y=0;y<H0;y++) for(let x=0;x<W0;x++) if(d[(y*W0+x)*4+3]>30){ if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y; }
      if(x1<0){ x0=0;y0=0;x1=W0-1;y1=H0-1; }
      const bw=x1-x0+1, bh=y1-y0+1, n=+this.res.value, k=Math.min(n/bw,n/bh), tw=Math.max(1,Math.round(bw*k)), th=Math.max(1,Math.round(bh*k));
      const dst=document.createElement("canvas"); dst.width=tw; dst.height=th; const dg=dst.getContext("2d"); dg.imageSmoothingQuality="high";
      dg.drawImage(src,x0,y0,bw,bh,0,0,tw,th); const o=dg.getImageData(0,0,tw,th).data; const s={w:tw,h:th,px:[]};
      for(let i=0;i<tw*th;i++){ const a=o[i*4+3]; s.px.push(a<110?"":"#"+[o[i*4],o[i*4+1],o[i*4+2]].map(v=>v.toString(16).padStart(2,"0")).join("")); }
      this.spr=resizePx(s,n); this.changed(); this.err.className="err ok"; this.err.textContent="✓ Immagine caricata ("+n+"×"+n+"). Ritoccala con la matita, aggiungi il CONTORNO o cambia risoluzione."; };
    img.onerror=()=>{ alert("Immagine non valida"); }; img.src=url; },

  // ---- pixel ----
  pushUndo(){ this.undo.push(JSON.stringify(this.spr)); if(this.undo.length>60) this.undo.shift(); },
  doUndo(){ if(!this.undo.length) return; this.spr=JSON.parse(this.undo.pop()); this.syncRes(); this.changed(); },
  get(x,y){ const s=this.spr; return (x<0||y<0||x>=s.w||y>=s.h)?null:s.px[y*s.w+x]; },
  set(x,y,c){ const s=this.spr; if(x<0||y<0||x>=s.w||y>=s.h) return; s.px[y*s.w+x]=c; },
  paint(x,y,erase){ const c=(erase||this.tool==="eraser")?"":this.color; this.set(x,y,c); if(this.mirror) this.set(this.spr.w-1-x,y,c); this.changed(); },
  fill(x,y,c){ const t=this.get(x,y); if(t===null||t===c) return; const st=[[x,y]];
    while(st.length){ const [a,b]=st.pop(); if(this.get(a,b)!==t) continue; this.set(a,b,c); st.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]); } this.changed(); },
  changed(){ this.drawPix(); if(this.pvWp) this.pvWp.cv=pxToCanvas(this.spr); },
  drawPix(){ if(!this.spr) return; const g=this.px, s=this.spr, {cell,ox,oy}=this.geo();
    g.fillStyle="#11121f"; g.fillRect(0,0,288,288);
    for(let y=0;y<s.h;y++) for(let x=0;x<s.w;x++){ const c=s.px[y*s.w+x]; g.fillStyle=(x+y)%2?"#2a2d45":"#22243a"; g.fillRect(ox+x*cell,oy+y*cell,cell,cell); if(c){ g.fillStyle=c; g.fillRect(ox+x*cell,oy+y*cell,cell,cell); } }
    if(cell>=6){ g.fillStyle="rgba(255,255,255,0.07)"; for(let i=1;i<s.w;i++) g.fillRect(ox+i*cell,oy,1,cell*s.h); for(let i=1;i<s.h;i++) g.fillRect(ox,oy+i*cell,cell*s.w,1); }
    if(this.mirror){ g.fillStyle="rgba(255,205,117,0.6)"; g.fillRect(ox+s.w*cell/2-1,oy,2,cell*s.h); }
    if(this.hover){ const [x,y]=this.hover; if(x>=0&&y>=0&&x<s.w&&y<s.h){ g.strokeStyle="#fff"; g.lineWidth=2; g.strokeRect(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2); } }
    const m=document.getElementById("wMini"); if(m){ const mg=m.getContext("2d"); mg.imageSmoothingEnabled=false; mg.clearRect(0,0,m.width,m.height);
      const k=Math.max(1,Math.floor(Math.min(m.width/s.w,m.height/s.h))); mg.drawImage(pxToCanvas(s),(m.width-s.w*k)/2|0,(m.height-s.h*k)/2|0,s.w*k,s.h*k); } },

  // ---- anteprima ----
  buildPreview(){ if(!this.parsed||!this.parsed.ok) return; const def=Game.defs[+this.tsel.value]||Game.defs[0]; if(!def) return;
    const W=new World(Editor.pvPath,{preview:true,w:240,h:120,vol:0.6,onKill:e=>{ setTimeout(()=>{ if(this.pvWorld===W) Editor.spawnDummy(W,e.type,e.dist-40); },500); }});
    W.sound=this.pvSound; this.pvWorld=W; this.pvWp={stats:this.parsed.stats,cv:pxToCanvas(this.spr)};
    const t=new Tower(W,def,120,64); t.wpOverride=this.pvWp; W.towers.push(t); this.pvTower=t;
    ["goblin","slime","golem","bat"].forEach((ty,i)=>Editor.spawnDummy(W,ty,i*Editor.pvPath.length/4));
    const s=this.parsed.stats; this.pvStats.innerHTML=`Provata con <b>${esc(def.stats.name)}</b> · ${s.motion} · scia ${s.trail} · impatto ${s.hitEffect} · grandezza <b>${s.size}x</b> (${Math.round(this.spr.w*s.size)}px)`; },
  tick(dt){ if(!this.isOpen||!this.pvWorld) return; this.pvWorld.update(dt); const g=this.pvx; g.drawImage(Editor.pvBg,0,0);
    if(this.pvTower) drawRange(g,this.pvTower.x,this.pvTower.y,this.pvTower.st.range,"#ffffff",performance.now()/1000); this.pvWorld.draw(g); }
};
const NEW_WEAPON_CODE=`// 🎯 NUOVA ARMA
// Disegna il colpo a destra (o CARICA un'immagine / CTRL+V / trascinala sulla griglia)
// Poi nel personaggio scrivi: var weapon = "Mia Arma";
var name = "Mia Arma";
var size = 1;             // grandezza del colpo
var motion = "homing";    // homing | straight | wave | boomerang | lob | rain
var speedMult = 1;
var spin = 0;             // gradi al secondo
var rotate = true;        // punta nella direzione del volo
var trail = "sparkle";    // none | fire | smoke | sparkle | ice | magic | ghost | line | bubbles
var trailColor = "#ffcd75";
var trailAmount = 1;
var hitEffect = "spark";  // none | spark | explosion | frost | electric | poison | magic | confetti | smoke | splat
var hitColor = "#ffcd75";
var hitSize = 1;
var glow = false;
var glowColor = "#ffcd75";
var shake = 0;
var muzzle = "spark";     // none | spark | smoke | magic | fire
var shootSound = "throw";
var hitSound = "hit";
`;
