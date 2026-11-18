"use strict";
// ===== Gioco principale =====
const $=id=>document.getElementById(id);
const Game={
  init(){
    this.cv=$("game"); this.ctx=this.cv.getContext("2d"); this.ctx.imageSmoothingEnabled=false;
    SFX.init(); this.map=new GameMap(7);
    Weapons.list=WStore.load().map(hydrateWeapon);
    this.defs=Store.loadDefs().map(hydrateDef); this.persist();
    this.rulesCode=Store.loadRules(); this.rules=parseRules(this.rulesCode).stats;
    this.speed=1; this.autoWave=false; this.time=0; this.best=+(localStorage.getItem("ptd_best")||0);
    this.bindUI(); this.reset(); this.resize(); window.addEventListener("resize",()=>this.resize());
    Editor.init(); WeaponEditor.init(); this.renderWeapons();
    $("btnSound").classList.toggle("on",!SFX.muted); $("btnSound").textContent=SFX.muted?"🔇":"🔊"; $("btnMusic").classList.toggle("on",SFX.musicOn);
    requestAnimationFrame(t=>this.loop(t));
  },
  reset(){
    const R=this.rules;
    this.world=new World(this.map.path,{onKill:e=>this.onKill(e),onLeak:e=>this.onLeak(e)});
    this.gold=R.startGold; this.lives=R.startLives; this.wave=0; this.queue=[]; this.spawnT=0; this.waveActive=false;
    this.occ=new Map(); this.selDef=null; this.selTower=null; this.over=false; this.paused=false; this.banner=null; this.redFlash=0; this.autoT=0;
    $("overlay").classList.add("hidden"); this.setBanner("PREPARATI!","PIAZZA I PERSONAGGI E PREMI ONDATA");
    this.renderShop(); this.renderInfo(); this.updTop();
  },
  // ---------- UI ----------
  bindUI(){
    $("btnWave").onclick=()=>this.startWave();
    $("btnSpeed").onclick=()=>{ this.speed=this.speed>=3?1:this.speed+1; $("btnSpeed").textContent="x"+this.speed; };
    $("btnPause").onclick=()=>this.togglePause();
    $("btnAuto").onclick=()=>{ this.autoWave=!this.autoWave; $("btnAuto").classList.toggle("on",this.autoWave); if(this.autoWave&&!this.waveActive) this.autoT=1; };
    $("btnRules").onclick=()=>Editor.openRules();
    $("btnSound").onclick=()=>{ SFX.setMute(!SFX.muted); $("btnSound").textContent=SFX.muted?"🔇":"🔊"; $("btnSound").classList.toggle("on",!SFX.muted); };
    $("btnMusic").onclick=()=>{ SFX.ensure(); SFX.setMusic(!SFX.musicOn); $("btnMusic").classList.toggle("on",SFX.musicOn); };
    $("btnNewWeapon").onclick=()=>WeaponEditor.open(null);
    document.addEventListener("click",e=>{ if(e.target.closest("button,.card")) SFX.play("click"); });
    $("btnNew").onclick=()=>Editor.openTower(null);
    $("btnRestart").onclick=()=>this.reset();
    $("btnExport").onclick=()=>{ const blob=new Blob([JSON.stringify({towers:this.rawDefs(),weapons:this.rawWeapons()},null,2)],{type:"application/json"});
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="personaggi.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
    $("btnImport").onclick=()=>$("fileImport").click();
    $("fileImport").onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ try{ const j=JSON.parse(t); const arr=Array.isArray(j)?j:j.towers; if(!Array.isArray(arr)) throw 0;
        if(j.weapons&&Array.isArray(j.weapons)){ j.weapons.filter(o=>o&&typeof o.code==="string").forEach((o,i)=>Weapons.list.push(hydrateWeapon({id:"wi"+Date.now().toString(36)+i,code:o.code,sprite:o.sprite}))); this.persistW(); this.renderWeapons(); }
        arr.filter(o=>o&&typeof o.code==="string").forEach((o,i)=>this.defs.push(hydrateDef({id:"i"+Date.now().toString(36)+i,code:o.code,sprite:o.sprite})));
        this.persist(); this.renderShop(); }catch(_){ alert("File non valido"); } }); e.target.value=""; };
    $("btnResetDefs").onclick=()=>{ if(confirm("Ripristinare i personaggi di default? (i tuoi verranno cancellati)")){ this.defs=Store.defaultDefs().map(hydrateDef); this.persist(); this.renderShop(); } };
    const cv=this.cv;
    cv.addEventListener("mousemove",e=>{ const p=this.mouse(e); this.hover=[Math.floor(p[0]/TILE),Math.floor(p[1]/TILE)]; this.mpos=p; });
    cv.addEventListener("mouseleave",()=>{ this.hover=null; });
    cv.addEventListener("mousedown",e=>{ if(e.button!==0) return; this.click(e.shiftKey); });
    cv.addEventListener("contextmenu",e=>{ e.preventDefault(); this.selDef=null; this.selTower=null; this.renderShop(); this.renderInfo(); });
    document.addEventListener("keydown",e=>{ if(Editor.open||WeaponEditor.isOpen||e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT") return;
      if(e.key==="Escape"){ this.selDef=null; this.selTower=null; this.renderShop(); this.renderInfo(); }
      else if(e.key===" "){ e.preventDefault(); this.startWave(); }
      else if(e.key==="p"||e.key==="P") this.togglePause();
      else if(e.key==="u"||e.key==="U") this.upgradeSel();
      else if(e.key==="Delete"||e.key==="Backspace") this.sellSel();
      else if(/^[1-9]$/.test(e.key)){ const d=this.defs[+e.key-1]; if(d) this.pickDef(d); } });
  },
  mouse(e){ const r=this.cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*GW,(e.clientY-r.top)/r.height*GH]; },
  resize(){ const st=$("stage"); const s=Math.min((st.clientWidth-8)/GW,(st.clientHeight-8)/GH); const k=s>=1?Math.floor(s):s;
    this.cv.style.width=Math.floor(GW*k)+"px"; this.cv.style.height=Math.floor(GH*k)+"px"; },
  togglePause(){ if(this.over) return; this.paused=!this.paused; $("btnPause").textContent=this.paused?"▶":"❚❚"; },
  updTop(){ $("gold").textContent=Math.floor(this.gold); $("lives").textContent=Math.max(0,this.lives); $("wave").textContent=this.wave;
    $("btnWave").disabled=this.waveActive||this.over; $("best").textContent=this.best;
    document.querySelectorAll(".card").forEach(c=>{ const d=this.defs.find(x=>x.id===c.dataset.id); c.classList.toggle("poor",!!d&&d.stats.cost>this.gold); });
    const up=$("btnUp"); if(up&&this.selTower) up.disabled=!this.selTower.canUpgrade||this.gold<this.selTower.upgradePrice; },
  rawDefs(){ return this.defs.map(d=>({id:d.id,code:d.code,sprite:d.auto?null:d.sprite})); },
  persist(){ Store.saveDefs(this.rawDefs()); },
  rawWeapons(){ return Weapons.list.map(w=>({id:w.id,code:w.code,sprite:w.sprite})); },
  persistW(){ WStore.save(this.rawWeapons()); },
  saveWeapon(raw){ const h=hydrateWeapon(raw); const i=Weapons.list.findIndex(w=>w.id===raw.id); if(i>=0) Weapons.list[i]=h; else Weapons.list.push(h);
    this.persistW(); this.renderWeapons(); this.defs=this.defs.map(d=>d.auto?d:d); this.renderShop(); },
  deleteWeapon(id){ Weapons.list=Weapons.list.filter(w=>w.id!==id); this.persistW(); this.renderWeapons(); },
  renderWeapons(){ const box=$("weapons"); box.innerHTML="";
    Weapons.list.forEach(w=>{ const c=document.createElement("div"); c.className="wcard"; c.title=w.stats.name+" · "+w.stats.motion+" · "+w.stats.hitEffect;
      const cv=makeCanvas(w.cv.width,w.cv.height); cv.getContext("2d").drawImage(w.cv,0,0); cv.className="wico"; c.appendChild(cv);
      const n=document.createElement("span"); n.textContent=w.stats.name; c.appendChild(n);
      const users=this.defs.filter(d=>d.stats.weapon&&d.stats.weapon.toLowerCase()===w.stats.name.toLowerCase()).length; if(users){ const b=document.createElement("i"); b.textContent=users; c.appendChild(b); }
      c.onclick=()=>WeaponEditor.open(w); box.appendChild(c); }); },
  saveDef(raw){ const h=hydrateDef(raw); const i=this.defs.findIndex(d=>d.id===raw.id); if(i>=0) this.defs[i]=h; else this.defs.push(h);
    this.persist(); if(this.selDef&&this.selDef.id===raw.id) this.selDef=h; this.renderShop(); this.renderWeapons(); },
  deleteDef(id){ this.defs=this.defs.filter(d=>d.id!==id); if(this.selDef&&this.selDef.id===id) this.selDef=null; this.persist(); this.renderShop(); },
  setRules(code){ this.rulesCode=code; Store.saveRules(code); this.rules=parseRules(code).stats; this.reset(); },
  pickDef(d){ if(this.over) return; this.selDef=this.selDef===d?null:d; this.selTower=null; this.renderShop(); this.renderInfo(); },
  renderShop(){ const box=$("shop"); box.innerHTML="";
    this.defs.forEach((d,i)=>{ const s=d.stats, c=document.createElement("div"); c.className="card"+(this.selDef===d?" sel":"")+(d.ok?"":" bad"); c.dataset.id=d.id;
      const cv=makeCanvas(16,16); cv.getContext("2d").drawImage(d.spr.n,0,0); cv.className="ico16";
      c.appendChild(cv);
      const t=document.createElement("div"); t.className="ct";
      t.innerHTML=`<div class="nm">${i<9?`<kbd>${i+1}</kbd>`:""}${esc(s.name)}</div><div class="st">DPS ${dps(s).toFixed(0)} · ${s.weapon?esc(s.weapon):s.projectile}</div><div class="cost">● ${s.cost}</div>`;
      c.appendChild(t);
      const b=document.createElement("button"); b.className="edit"; b.title="Modifica"; b.textContent="✎"; b.onclick=e=>{ e.stopPropagation(); Editor.openTower(d); };
      c.appendChild(b); c.onclick=()=>this.pickDef(d); c.title=s.description; box.appendChild(c); });
    this.updTop(); },
  renderInfo(){ const box=$("info"), t=this.selTower;
    if(!t){ box.innerHTML=this.selDef?`<h2>PIAZZA: ${esc(this.selDef.stats.name)}</h2><p class="dim">Clicca su una casella d'erba libera.<br>SHIFT+clic = piazza più volte · tasto destro = annulla</p>`
      :`<h2>INFO</h2><p class="dim">Seleziona un personaggio dal negozio, oppure clicca una torre sulla mappa per potenziarla.</p>`; return; }
    const s=t.st, n=t.canUpgrade;
    box.innerHTML=`<h2>${esc(s.name)} <span class="lv">LV ${t.level}/${t.base.maxLevel}</span></h2>
      <div class="kv"><span>Danno</span><b>${s.damage.toFixed(1)}</b><span>Cadenza</span><b>${s.firerate.toFixed(2)}/s</b>
      <span>Raggio</span><b>${Math.round(s.range)}</b><span>DPS</span><b>${dps(s).toFixed(1)}</b>
      ${s.splash>0?`<span>Area</span><b>${Math.round(s.splash)}</b>`:""}${s.chain>0?`<span>Catena</span><b>${s.chain}</b>`:""}${s.slow>0?`<span>Rallenta</span><b>${Math.round(s.slow*100)}%</b>`:""}
      <span>Uccisioni</span><b id="iK">${t.kills}</b><span>Danno tot.</span><b id="iD">${Math.round(t.dmgDone)}</b></div>
      <button class="btn small wide" id="btnTgt">MIRA: ${TARGET_LABEL[t.targeting]}</button>
      <div class="row"><button class="btn green" id="btnUp" ${n&&this.gold>=t.upgradePrice?"":"disabled"}>${n?"▲ UP "+t.upgradePrice:"MAX"}</button>
      <button class="btn red" id="btnSell">VENDI ${Math.round(t.spent*this.rules.sellRefund)}</button></div>`;
    $("btnUp").onclick=()=>this.upgradeSel(); $("btnSell").onclick=()=>this.sellSel();
    $("btnTgt").onclick=()=>{ t.targeting=TARGET_MODES[(TARGET_MODES.indexOf(t.targeting)+1)%4]; this.renderInfo(); }; },
  upgradeSel(){ const t=this.selTower; if(!t||!t.canUpgrade) return; const p=t.upgradePrice; if(this.gold<p){ this.noGold(t.x,t.y-16); return; }
    this.gold-=p; t.spent+=p; t.upgrade(); this.renderInfo(); this.updTop(); },
  sellSel(){ const t=this.selTower; if(!t) return; const g=Math.round(t.spent*this.rules.sellRefund); this.gold+=g;
    this.world.towers=this.world.towers.filter(x=>x!==t); this.occ.delete(t.tx+","+t.ty);
    SFX.play("sell"); const fx=this.world.fx; fx.burst(t.x,t.y,20,[PAL[13],PAL[14],PAL[4]],70,{grav:120,life:0.6,up:-40}); fx.smoke(t.x,t.y,6); fx.text(t.x,t.y-14,"+"+g,PAL[4],1,1);
    this.selTower=null; this.renderInfo(); this.updTop(); },
  noGold(x,y){ SFX.play("error"); this.world.fx.text(x,y,"ORO INSUFFICIENTE",PAL[2],1,0.9); },
  click(shift){
    if(this.over||!this.hover) return; const [c,r]=this.hover; const key=c+","+r;
    if(this.selDef){ const d=this.selDef;
      if(!this.map.buildable(c,r)||this.occ.has(key)){ this.world.fx.text(c*TILE+8,r*TILE,"NO",PAL[2]); SFX.play("error"); return; }
      if(this.gold<d.stats.cost){ this.noGold(c*TILE+8,r*TILE); return; }
      this.gold-=d.stats.cost; const t=new Tower(this.world,d,c*TILE+8,r*TILE+8); t.tx=c; t.ty=r; this.world.towers.push(t); this.occ.set(key,t);
      if(!shift){ this.selDef=null; this.selTower=t; this.renderShop(); } this.renderInfo(); this.updTop(); return; }
    const t=this.occ.get(key); this.selTower=t||null; this.renderInfo();
  },
  // ---------- ondate ----------
  buildWave(n){ const R=this.rules, q=[]; const count=Math.max(1,Math.round((5+n*1.7)*R.waveSize)); const gap=Math.max(0.28,0.85-n*0.02);
    for(let i=0;i<count;i++){ const pool=[["slime",Math.max(1,6-n*0.5)]]; if(n>=2) pool.push(["goblin",3]); if(n>=4) pool.push(["bat",2+n*0.05]); if(n>=6) pool.push(["golem",1+n*0.08]);
      let tot=pool.reduce((a,p)=>a+p[1],0), x=Math.random()*tot, type=pool[0][0]; for(const [k,w] of pool){ x-=w; if(x<=0){ type=k; break; } }
      q.push({type,gap:gap*(type==="golem"?1.5:type==="bat"?0.6:1)}); }
    if(n%5===0) for(let i=0;i<Math.round(n/2);i++) q.push({type:"bat",gap:0.18});
    if(R.bossEvery>0&&n%R.bossEvery===0) q.push({type:"boss",gap:1.5});
    this.hpMult=R.hpScale*(1+(n-1)*0.2)*Math.pow(1.045,n-1);
    return q; },
  startWave(){ if(this.waveActive||this.over) return; this.wave++; this.queue=this.buildWave(this.wave); this.spawnT=0.3; this.waveActive=true; this.autoT=0;
    const boss=this.rules.bossEvery>0&&this.wave%this.rules.bossEvery===0;
    SFX.play(boss?"boss":"wave"); this.setBanner("ONDATA "+this.wave,boss?"!! ARRIVA IL BOSS !!":this.queue.length+" NEMICI"); this.updTop(); },
  spawn(type){ const e=new Enemy(this.world,type,this.hpMult,this.rules.enemySpeed); this.world.enemies.push(e);
    const fx=this.world.fx; fx.burst(6,56,type==="boss"?30:8,[PAL[11],PAL[9],PAL[1]],50,{add:true,life:0.4}); fx.ring(6,56,type==="boss"?20:8,PAL[11],0.3);
    if(type==="boss") fx.shake=5; },
  onKill(e){ const g=Math.max(1,Math.round(e.gold*this.rules.goldMult)); this.gold+=g; const fx=this.world.fx;
    fx.text(e.x,e.hy-14,"+"+g,PAL[4],1,0.9); SFX.play("coin");
    for(let i=0;i<Math.min(8,2+g/3);i++) fx.part({x:e.x,y:e.hy,vx:rand(-30,30),vy:rand(-70,-30),grav:200,drag:0.5,life:rand(0.5,0.8),colors:[PAL[4],PAL[4],PAL[3]],size:2,blink:false});
    this.updTop(); },
  onLeak(e){ SFX.play("leak"); this.lives-=e.boss?5:1; this.redFlash=0.35; const fx=this.world.fx; fx.shake=Math.min(8,fx.shake+3);
    fx.burst(456,120,14,[PAL[2],PAL[3],"#fff"],60,{add:true}); fx.text(456,100,"-"+(e.boss?5:1),PAL[2],2,1);
    if(this.lives<=0) this.gameOver(); this.updTop(); },
  gameOver(){ SFX.play("gameover"); this.over=true; this.lives=0; if(this.wave>this.best){ this.best=this.wave; try{localStorage.setItem("ptd_best",this.best);}catch(_){} }
    $("ovWave").textContent=this.wave; $("overlay").classList.remove("hidden"); this.updTop(); },
  setBanner(t,s){ this.banner={t,s,age:0,life:2.6}; },
  // ---------- loop ----------
  loop(ts){ const dt=Math.min(0.05,(ts-(this.last||ts))/1000); this.last=ts;
    if(!this.paused&&!Editor.open&&!WeaponEditor.isOpen&&!this.over) for(let i=0;i<this.speed;i++) this.update(dt);
    else if(this.over) this.world.fx.update(dt);
    this.draw(); Editor.tick(dt); WeaponEditor.tick(dt);
    if((this._ui=(this._ui||0)+dt)>0.3){ this._ui=0; const t=this.selTower; if(t&&$("iK")){ $("iK").textContent=t.kills; $("iD").textContent=Math.round(t.dmgDone); } }
    requestAnimationFrame(t=>this.loop(t)); },
  update(dt){
    this.time+=dt; const fx=this.world.fx;
    if(this.queue.length){ this.spawnT-=dt; if(this.spawnT<=0){ const q=this.queue.shift(); this.spawn(q.type); this.spawnT=q.gap; } }
    this.world.update(dt);
    if(this.waveActive&&!this.queue.length&&!this.world.enemies.length&&!this.over){ this.waveActive=false; const b=Math.round(this.rules.waveBonus+this.wave*3);
      this.gold+=b; SFX.play("clear"); this.setBanner("ONDATA SUPERATA","+"+b+" ORO"); if(this.autoWave) this.autoT=this.rules.autoWaveDelay; this.updTop(); }
    if(this.autoWave&&this.autoT>0&&!this.waveActive){ this.autoT-=dt; if(this.autoT<=0) this.startWave(); }
    // ambiente
    if(Math.random()<dt*1.2) fx.part({x:rand(0,GW),y:rand(0,GH),vx:rand(-4,4),vy:rand(-6,-2),life:rand(2,4),colors:[PAL[5],PAL[4],PAL[5]],add:true,drag:0,sway:rand(0,6),blink:Math.random()<0.5});
    if(Math.random()<dt*0.6) fx.part({x:rand(-10,GW),y:-3,vx:rand(8,18),vy:rand(10,18),life:20,colors:[Math.random()<0.5?PAL[5]:PAL[3]],drag:0,sway:rand(0,6),size:1});
    if(Math.random()<dt*14){ const a=rand(0,6.28); fx.part({x:6+Math.cos(a)*10,y:56+Math.sin(a)*14,vx:-Math.cos(a)*14,vy:-Math.sin(a)*20,life:0.6,colors:[PAL[11],PAL[9],PAL[1]],add:true,drag:0}); }
    if(Math.random()<dt*12) fx.part({x:463+rand(-1,1),y:113,vx:rand(-3,3),vy:rand(-22,-10),life:rand(0.2,0.45),colors:["#fff",PAL[4],PAL[3],PAL[2]],add:true,drag:1,shrink:true,size:2});
    this.redFlash-=dt;
  },
  draw(){
    const c=this.ctx, W=this.world, t=performance.now()/1000;
    c.save(); const s=W.fx.shake; if(s>0.2) c.translate(Math.round(rand(-s,s)),Math.round(rand(-s,s)));
    c.drawImage(this.map.bg,0,0);
    this.drawPortal(c,t); this.drawFlag(c,t);
    if(this.selTower) drawRange(c,this.selTower.x,this.selTower.y,this.selTower.st.range,"#ffffff",t);
    W.draw(c);
    if(this.selTower){ const T=this.selTower; c.fillStyle=PAL[4]; const L=T.x-9, Tp=T.y-13, k=(Math.sin(t*6)>0)?1:0;
      c.fillRect(L-k,Tp-k,3,1); c.fillRect(L-k,Tp-k,1,3); c.fillRect(L+16+k,Tp-k,3,1); c.fillRect(L+18+k,Tp-k,1,3);
      c.fillRect(L-k,Tp+22+k,3,1); c.fillRect(L-k,Tp+20+k,1,3); c.fillRect(L+16+k,Tp+22+k,3,1); c.fillRect(L+18+k,Tp+20+k,1,3); }
    if(this.hover&&!this.over){ const [hc,hr]=this.hover, x=hc*TILE, y=hr*TILE;
      if(this.selDef){ const ok=this.map.buildable(hc,hr)&&!this.occ.has(hc+","+hr)&&this.gold>=this.selDef.stats.cost;
        drawRange(c,x+8,y+8,this.selDef.stats.range,ok?"#ffffff":PAL[2],t);
        c.globalAlpha=0.65; c.drawImage(this.selDef.spr.n,x,y-3); c.globalAlpha=1;
        c.fillStyle=ok?PAL[5]:PAL[2]; c.fillRect(x,y,TILE,1); c.fillRect(x,y+TILE-1,TILE,1); c.fillRect(x,y,1,TILE); c.fillRect(x+TILE-1,y,1,TILE); }
      else if(this.occ.has(hc+","+hr)||this.map.buildable(hc,hr)){ c.fillStyle="rgba(255,255,255,0.35)"; c.fillRect(x,y,TILE,1); c.fillRect(x,y+TILE-1,TILE,1); c.fillRect(x,y,1,TILE); c.fillRect(x+TILE-1,y,1,TILE); } }
    c.restore();
    if(this.redFlash>0){ c.globalAlpha=Math.min(0.5,this.redFlash); c.fillStyle=PAL[2]; c.fillRect(0,0,GW,4); c.fillRect(0,GH-4,GW,4); c.fillRect(0,0,4,GH); c.fillRect(GW-4,0,4,GH); c.globalAlpha=1; }
    const B=this.banner; if(B&&!this.paused&&!Editor.open&&!WeaponEditor.isOpen){ B.age+=1/60; const k=B.age/B.life; if(k>=1) this.banner=null; else {
      const xin=k<0.15?(1-k/0.15):k>0.85?-(k-0.85)/0.15:0, ox=Math.round(xin*GW);
      c.fillStyle="rgba(26,28,44,0.75)"; c.fillRect(0,100,GW,44); c.fillStyle=PAL[4]; c.fillRect(0,100,GW,1); c.fillRect(0,143,GW,1);
      drawText(c,B.t,GW/2+ox,107,PAL[12],3,PAL[0],"center"); if(B.s) drawText(c,B.s,GW/2-ox,131,PAL[4],1,PAL[0],"center"); } }
    if(this.paused) { c.fillStyle="rgba(26,28,44,0.55)"; c.fillRect(0,0,GW,GH); drawText(c,"PAUSA",GW/2,120,PAL[12],4,PAL[0],"center"); }
    if(this.autoT>0&&this.autoWave&&!this.waveActive) drawText(c,"PROSSIMA ONDATA "+Math.ceil(this.autoT),GW/2,4,PAL[12],1,PAL[0],"center");
  },
  drawPortal(c,t){ const cx=6, cy=56;
    c.fillStyle=PAL[0]; for(let y=-13;y<=13;y++){ const w=Math.round(7*Math.sqrt(1-(y/13.5)**2)); c.fillRect(cx-w,cy+y,w*2+1,1); }
    c.fillStyle=PAL[1]; for(let y=-11;y<=11;y++){ const w=Math.round(5*Math.sqrt(1-(y/11.5)**2)); c.fillRect(cx-w,cy+y,w*2+1,1); }
    for(let i=0;i<18;i++){ const a=t*3+i/18*6.283; c.fillStyle=i%2?PAL[9]:PAL[11]; c.fillRect(Math.round(cx+Math.cos(a)*6),Math.round(cy+Math.sin(a)*12),1,1); }
    for(let i=0;i<10;i++){ const a=-t*4+i/10*6.283; c.fillStyle=i%2?PAL[12]:PAL[11]; c.fillRect(Math.round(cx+Math.cos(a)*3),Math.round(cy+Math.sin(a)*6),1,1); } },
  drawFlag(c,t){ const x=464, y=54; c.fillStyle=PAL[0]; c.fillRect(x,y,1,15);
    for(let i=0;i<8;i++){ const o=Math.round(Math.sin(t*6-i*0.8)*(i/8)*2); c.fillStyle=PAL[0]; c.fillRect(x+1+i,y+o-1,1,7); c.fillStyle=i<4?PAL[9]:PAL[10]; c.fillRect(x+1+i,y+o,1,5); c.fillStyle=PAL[4]; if(i>2&&i<6) c.fillRect(x+1+i,y+o+2,1,1); } },
};
function esc(s){ return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }
window.addEventListener("load",()=>Game.init());
