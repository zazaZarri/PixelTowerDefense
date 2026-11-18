"use strict";
// ===== Editor personaggi: codice + pixel art + anteprima live =====
const Editor={
  open:false, mode:"tower", tool:"pencil", color:"9", mirror:false, undo:[],
  init(){
    const $=id=>document.getElementById(id);
    Object.assign(this,{ el:$("editor"), title:$("edTitle"), code:$("code"), hl:$("hl"), nums:$("lineNums"), err:$("edError"),
      varList:$("varList"), artCol:$("artCol"), pix:$("pix"), pv:$("preview"), pvStats:$("pvStats"), sw:$("swatches"), del:$("edDelete") });
    this.px=this.pix.getContext("2d"); this.pvx=this.pv.getContext("2d"); this.pvx.imageSmoothingEnabled=false;
    // palette
    const mk=(c,label)=>{ const b=document.createElement("button"); b.className="sw"; b.dataset.c=c; b.title=label||c;
      if(c===".") b.classList.add("erase"); else b.style.background=HEX_MAP[c];
      b.onclick=()=>{ this.color=c; if(this.tool==="eraser"||this.tool==="picker") this.setTool("pencil"); this.updSw(); }; this.sw.appendChild(b); };
    for(let i=0;i<16;i++) mk(HEXD[i],PAL[i]);
    this.updSw();
    document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>this.setTool(b.dataset.tool));
    $("btnMirror").onclick=e=>{ this.mirror=!this.mirror; e.currentTarget.classList.toggle("on",this.mirror); this.drawPix(); };
    $("btnUndo").onclick=()=>this.doUndo();
    $("btnRegen").onclick=()=>{ this.pushUndo(); this.auto=true; this.applyCode(true); };
    $("btnClear").onclick=()=>{ this.pushUndo(); this.auto=false; this.grid=Array(16).fill("................"); this.spriteChanged(); };
    $("btnShift").onclick=()=>{ this.pushUndo(); this.auto=false; this.grid=this.grid.map(r=>r.split("").reverse().join("")); this.spriteChanged(); };
    // pittura
    let down=false;
    const pos=e=>{ const r=this.pix.getBoundingClientRect(); return [Math.floor((e.clientX-r.left)/r.width*16),Math.floor((e.clientY-r.top)/r.height*16)]; };
    this.pix.addEventListener("pointerdown",e=>{ e.preventDefault(); this.pix.setPointerCapture(e.pointerId); const [x,y]=pos(e);
      if(this.tool==="picker"){ const c=this.grid[y]&&this.grid[y][x]; if(c&&c!=="."){ this.color=c; this.updSw(); } this.setTool("pencil"); return; }
      this.pushUndo(); if(this.tool==="fill"){ this.fill(x,y,this.color); return; } down=true; this.paint(x,y,e.button===2); });
    this.pix.addEventListener("pointermove",e=>{ const [x,y]=pos(e); this.hover=[x,y]; if(down) this.paint(x,y,e.buttons===2); else this.drawPix(); });
    this.pix.addEventListener("pointerleave",()=>{ this.hover=null; this.drawPix(); });
    window.addEventListener("pointerup",()=>{ down=false; });
    this.pix.addEventListener("contextmenu",e=>e.preventDefault());
    // codice
    let tmr=0;
    this.code.addEventListener("input",()=>{ this.updCode(); clearTimeout(tmr); tmr=setTimeout(()=>this.applyCode(),250); });
    this.code.addEventListener("scroll",()=>{ this.hl.scrollTop=this.code.scrollTop; this.hl.scrollLeft=this.code.scrollLeft; this.nums.scrollTop=this.code.scrollTop; });
    this.code.addEventListener("keydown",e=>{
      if(e.key==="Tab"){ e.preventDefault(); this.insertAt("  "); }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){ e.preventDefault(); this.save(); } });
    $("edSave").onclick=()=>this.save(); $("edCancel").onclick=()=>this.close(); $("edClose").onclick=()=>this.close();
    this.del.onclick=()=>{ if(this.editing && confirm("Eliminare \""+this.editing.stats.name+"\"?")){ Game.deleteDef(this.editing.id); this.close(); } };
    $("pvReset").onclick=()=>this.buildPreview();
    document.addEventListener("keydown",e=>{ if(!this.open) return; if(e.key==="Escape") this.close();
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&document.activeElement!==this.code){ e.preventDefault(); this.doUndo(); } });
    // sfondo anteprima
    this.pvBg=makeCanvas(240,120); const g=this.pvBg.getContext("2d"), R=mulberry32(3);
    g.fillStyle=PAL[6]; g.fillRect(0,0,240,120); for(let i=0;i<700;i++){ g.fillStyle=R()<0.5?PAL[5]:PAL[7]; g.fillRect(R()*240|0,R()*120|0,1,1); }
    this.pvPath=new Path([[24,28],[216,28],[216,100],[24,100],[24,28]],true);
    g.fillStyle="#c48a5a"; for(const s of this.pvPath.segs){ const x0=Math.min(s.ax,s.bx)-5,y0=Math.min(s.ay,s.by)-5; g.fillRect(x0,y0,Math.abs(s.bx-s.ax)+11,Math.abs(s.by-s.ay)+11); }
    g.fillStyle="#9c6640"; for(let i=0;i<260;i++){ const p=this.pvPath.posAt(R()*this.pvPath.length); g.fillRect(p.x+rand(-5,5)|0,p.y+rand(-5,5)|0,1,1); }
  },
  setTool(t){ this.tool=t; document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("on",b.dataset.tool===t)); },
  updSw(){ this.sw.querySelectorAll(".sw").forEach(b=>b.classList.toggle("on",b.dataset.c===this.color)); },
  renderVarList(docs){ this.varList.innerHTML=""; for(const [k,v,d] of docs){ const r=document.createElement("div"); r.className="var";
      r.innerHTML=`<code>var ${k} = ${v.replace(/</g,"&lt;")};</code><span>${d}</span>`; r.onclick=()=>this.insertVar(k,v); this.varList.appendChild(r); } },

  openTower(def){
    this.mode="tower"; this.editing=def||null; this.title.textContent=def?"EDITOR: "+def.stats.name.toUpperCase():"NUOVO PERSONAGGIO";
    this.code.value=def?def.code:NEW_TOWER_CODE; this.auto=def?def.auto:true;
    this.grid=def?def.sprite.slice():generateTowerGrid("#41a6f6","arrow"); this.undo=[];
    this.artCol.style.display=""; this.del.style.display=def?"":"none"; this.renderVarList(VAR_DOCS); this.renderChips(); this.show(); this.applyCode(true);
  },
  renderChips(){ const box=document.getElementById("wChips"); box.innerHTML='<span>ARMA:</span>';
    const add=(label,val,img)=>{ const b=document.createElement("button"); b.className="chip"; if(img){ const c=makeCanvas(img.width,img.height); c.getContext("2d").drawImage(img,0,0); box.appendChild(b); b.appendChild(c); }
      else box.appendChild(b); b.appendChild(document.createTextNode(label)); b.onclick=()=>this.setVar("weapon",JSON.stringify(val)); };
    add("nessuna (usa projectile)","",null); Weapons.list.forEach(w=>add(w.stats.name,w.stats.name,w.cv)); },
  setVar(k,v){ const t=this.code, re=new RegExp("^(\\s*(?:var|let|const)\\s+"+k+"\\s*=\\s*)[^;\\n]*(;?.*)$","m");
    if(re.test(t.value)) t.value=t.value.replace(re,(m,a,b)=>a+v+(b.startsWith(";")?b:";"+b)); else t.value=t.value.replace(/\s*$/,"")+"\nvar "+k+" = "+v+";\n";
    this.updCode(); this.applyCode(); },
  openRules(){ this.mode="rules"; this.editing=null; this.title.textContent="REGOLE DELLA PARTITA"; this.code.value=Game.rulesCode;
    this.artCol.style.display="none"; this.del.style.display="none"; this.renderVarList(RULE_DOCS); document.getElementById("wChips").innerHTML=""; this.show(); this.applyCode(); },
  show(){ this.open=true; this.el.classList.remove("hidden"); this.updCode(); this.drawPix(); setTimeout(()=>this.code.focus(),30); },
  close(){ this.open=false; this.el.classList.add("hidden"); },

  // ---- codice ----
  updCode(){ const v=this.code.value; const n=v.split("\n").length; let s=""; for(let i=1;i<=n;i++) s+=i+"\n"; this.nums.textContent=s;
    this.hl.innerHTML=this.highlight(v)+"\n"; this.hl.scrollTop=this.code.scrollTop; },
  highlight(src){ const esc=src.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return esc.replace(/(\/\/.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(var|let|const|true|false|Math)\b|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)(?=\s*=[^=])/gm,
      (m,c,s,k,n,id)=>c?`<i class="c">${c}</i>`:s?`<i class="s">${s}</i>`:k?`<i class="k">${k}</i>`:n?`<i class="n">${n}</i>`:`<i class="v">${id}</i>`); },
  insertAt(txt){ const t=this.code, a=t.selectionStart, b=t.selectionEnd; t.value=t.value.slice(0,a)+txt+t.value.slice(b); t.selectionStart=t.selectionEnd=a+txt.length; t.dispatchEvent(new Event("input")); },
  insertVar(k,v){ const t=this.code; const re=new RegExp("^\\s*(var|let|const)\\s+"+k+"\\s*=.*$","m"); const m=re.exec(t.value);
    if(m){ t.focus(); t.selectionStart=m.index; t.selectionEnd=m.index+m[0].length; }
    else { t.value=t.value.replace(/\s*$/,"")+"\nvar "+k+" = "+v+";\n"; t.dispatchEvent(new Event("input")); t.focus(); } },
  applyCode(forceSprite){
    if(this.mode==="rules"){ const p=parseRules(this.code.value); this.err.textContent=p.ok?"✓ OK":"✗ "+p.error; this.err.className="err "+(p.ok?"ok":""); return p; }
    const p=parseTower(this.code.value); this.parsed=p;
    this.err.className="err "+(p.ok&&!p.warn.length?"ok":"");
    this.err.textContent=p.ok?(p.warn.length?"⚠ "+p.warn.join(" · "):"✓ Codice valido"):"✗ Errore: "+p.error;
    if(!p.ok) return p;
    if(this.auto||forceSprite&&this.auto) this.grid=generateTowerGrid(p.stats.color,p.stats.projectile);
    this.drawPix(); this.buildPreview();
    const s=p.stats; this.pvStats.innerHTML=`<b>${s.name}</b> · DPS ≈ <b>${dps(s).toFixed(1)}</b> · RAGGIO ${Math.round(s.range)}px (${(s.range/16).toFixed(1)} caselle) · COSTO <b>${s.cost}</b>`;
    return p;
  },
  save(){
    if(this.mode==="rules"){ const p=this.applyCode(); if(!p.ok) return this.shake(); Game.setRules(this.code.value); this.close(); return; }
    const p=this.applyCode(); if(!p.ok) return this.shake();
    const raw={id:this.editing?this.editing.id:"u"+Date.now().toString(36), code:this.code.value, sprite:this.auto?null:this.grid.slice()};
    Game.saveDef(raw); this.close();
  },
  shake(){ const w=this.el.querySelector(".win"); w.classList.remove("shake"); void w.offsetWidth; w.classList.add("shake"); },

  // ---- pixel editor ----
  pushUndo(){ this.undo.push(this.grid.slice()); if(this.undo.length>60) this.undo.shift(); },
  doUndo(){ if(!this.undo.length) return; this.grid=this.undo.pop(); this.auto=false; this.spriteChanged(); },
  setPx(x,y,c){ if(x<0||y<0||x>15||y>15) return; const r=this.grid[y]; this.grid[y]=r.slice(0,x)+c+r.slice(x+1); },
  paint(x,y,erase){ const c=(erase||this.tool==="eraser")?".":this.color; this.setPx(x,y,c); if(this.mirror) this.setPx(15-x,y,c); this.auto=false; this.spriteChanged(); },
  fill(x,y,c){ if(x<0||y<0||x>15||y>15) return; const t=this.grid[y][x]; if(t===c) return; const st=[[x,y]];
    while(st.length){ const [a,b]=st.pop(); if(a<0||b<0||a>15||b>15||this.grid[b][a]!==t) continue; this.setPx(a,b,c); st.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]); }
    this.auto=false; this.spriteChanged(); },
  spriteChanged(){ this.drawPix(); if(this.previewTower){ const spr=buildTowerSprites(this.grid); this.previewTower.spr=spr; } },
  drawPix(){ if(!this.px||this.mode!=="tower"||!this.grid) return; const g=this.px, S=18;
    for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const c=this.grid[y][x];
      if(c==="."){ g.fillStyle=(x+y)%2?"#2a2d45":"#22243a"; } else g.fillStyle=HEX_MAP[c]; g.fillRect(x*S,y*S,S,S); }
    g.fillStyle="rgba(255,255,255,0.07)"; for(let i=1;i<16;i++){ g.fillRect(i*S,0,1,288); g.fillRect(0,i*S,288,1); }
    g.fillStyle="rgba(255,255,255,0.18)"; g.fillRect(0,12*S,288,1);
    if(this.mirror){ g.fillStyle="rgba(255,205,117,0.6)"; g.fillRect(8*S-1,0,2,288); }
    if(this.hover){ const [x,y]=this.hover; g.strokeStyle="#fff"; g.lineWidth=2; g.strokeRect(x*S+1,y*S+1,S-2,S-2); if(this.mirror) g.strokeRect((15-x)*S+1,y*S+1,S-2,S-2); }
    // miniatura reale
    const sm=document.getElementById("pixMini"); if(sm){ const m=sm.getContext("2d"); m.imageSmoothingEnabled=false; m.clearRect(0,0,sm.width,sm.height); m.drawImage(gridToCanvas(this.grid),0,0,sm.width,sm.height); }
  },

  // ---- anteprima live ----
  buildPreview(){ if(!this.parsed||!this.parsed.ok) return;
    const W=new World(this.pvPath,{preview:true,w:240,h:120,vol:0.6,onKill:e=>{ setTimeout(()=>{ if(this.pvWorld===W) this.spawnDummy(W,e.type,e.dist-40); },500); }});
    this.pvWorld=W; const def={stats:this.parsed.stats,spr:buildTowerSprites(this.grid)};
    this.previewTower=new Tower(W,def,120,64); W.towers.push(this.previewTower);
    ["goblin","slime","golem","bat"].forEach((t,i)=>this.spawnDummy(W,t,i*this.pvPath.length/4));
  },
  spawnDummy(W,type,dist){ const e=new Enemy(W,type,type==="golem"?2.2:4,0.9); e.dist=dist; e.updatePos(); W.enemies.push(e); },
  tick(dt){ if(!this.open||this.mode!=="tower"||!this.pvWorld) return; this.pvWorld.update(dt);
    const g=this.pvx; g.drawImage(this.pvBg,0,0); const t=this.previewTower; if(t) drawRange(g,t.x,t.y,t.st.range,"#ffffff",performance.now()/1000);
    this.pvWorld.draw(g); }
};
