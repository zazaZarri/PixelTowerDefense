"use strict";
// ===== Casse del codice: puzzle a blocchi stile Scratch per sbloccare nuove truppe =====
const BLOCK_COL={act:"#4c97ff",var:"#ff8c1a"};
const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const calc=(v,[o,n])=>o==="+"?v+n:o==="−"?v-n:v*n;
// NUMERI: si parte da "start", le operazioni in fila devono arrivare a "target" (vale qualsiasi ordine che ci arriva)
// difficile: 3-4 operazioni con almeno una × e una +/− (così l'ordine conta) e 1-2 blocchi trappola che non servono
const randOp=v=>{ const r=Math.random(); return r<0.3?["×",rint(2,3)]:r<0.55&&v>5?["−",rint(2,Math.min(9,v-1))]:["+",rint(2,9)]; };
const opText=o=>"numero "+o[0]+" "+o[1];
function numPuzzle(){ for(;;){ const start=rint(2,9), ops=[]; let v=start, ok=true;
  for(let i=rint(3,4);i>0;i--){ const op=randOp(v); ops.push(op); v=calc(v,op); if(v<=0||v>150) ok=false; }
  const x=[randOp(start)]; if(Math.random()<0.5) x.push(randOp(start));
  const texts=[...ops,...x].map(opText);
  if(!ok||new Set(texts).size<texts.length||!ops.some(o=>o[0]==="×")||ops.every(o=>o[0]==="×")) continue;
  return {title:"NUMERI", num:{start,target:v}, goal:`Il lucchetto si apre quando numero = ${v}. Si parte da numero = ${start}: metti in fila le operazioni per arrivarci. Attenzione: non tutti i blocchi servono!`,
    lesson:"VARIABILE: \"numero\" è una scatola con dentro un valore. Ogni riga lo cambia, una dopo l'altra: per questo l'ordine delle operazioni cambia il risultato!",
    sol:ops.map(o=>["var",opText(o),0,o]), x:x.map(o=>["var",opText(o),0,o])}; } }
// SEQUENZA: azioni da mettere nell'unico ordine sensato
const seq=(title,goal,acts)=>({title, goal, sol:acts.map(a=>["act",a]),
  lesson:"SEQUENZA: il computer esegue le istruzioni una dopo l'altra, esattamente nell'ordine in cui le scrivi. Se l'ordine è sbagliato, il programma non funziona!"});
const PUZZLES=[
 seq("APRI LA CASSA","Metti le azioni in ordine per aprire la cassa.",["prendi la chiave","metti la chiave nella serratura","gira la chiave","apri il coperchio"]),
 numPuzzle,
];

const Chest={
  isOpen:false, deck:[],
  init(){ this.el=$("chest"); this.pool=$("chPool"); this.prog=$("chProg"); this.msg=$("chMsg");
    $("chClose").onclick=()=>this.close(); $("chOk").onclick=()=>this.close();
    $("chReset").onclick=()=>{ if(this.busy) return; this.program=[]; this.msg.textContent=""; this.render(); };
    $("chHelp").onclick=()=>this.help(); $("chRun").onclick=()=>this.run(); },
  // prossimo puzzle: la prima cassa è la sequenza facile, poi solo sfide coi numeri
  next(){ if(!this.deck.length){ this.deck=PUZZLES.map((_,i)=>i).filter(i=>i>0); for(let i=this.deck.length-1;i>0;i--){ const j=rint(0,i); [this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]]; }
      if(!this.seen) this.deck.unshift(0); this.seen=true; }
    const p=PUZZLES[this.deck.shift()]; return typeof p==="function"?p():p; },
  // reward = personaggio da sbloccare, oppure null (premio in oro)
  open(reward,onWin){ const P=this.next(); this.P=P; this.reward=reward; this.onWin=onWin; this.busy=false; this.program=[];
    this.blocks=P.sol.map((b,k)=>({c:b[0],t:b[1],i:b[2]||0,k,op:b[3]})).concat((P.x||[]).map(b=>({c:b[0],t:b[1],i:0,k:-1,op:b[3]})));
    for(let i=this.blocks.length-1;i>0;i--){ const j=rint(0,i); [this.blocks[i],this.blocks[j]]=[this.blocks[j],this.blocks[i]]; }
    $("chTitle").textContent="🔒 CASSA DEL CODICE · "+P.title; $("chGoal").textContent=P.goal;
    $("chWin").hidden=true; $("chGame").hidden=false; this.msg.textContent=""; this.msg.className="chmsg";
    this.isOpen=true; this.el.classList.remove("hidden"); this.render(); },
  close(){ this.isOpen=false; this.el.classList.add("hidden"); },
  blockEl(b,indent){ const d=document.createElement("div"); d.className="blk"; d.style.background=BLOCK_COL[b.c]; d.style.marginLeft=indent*24+"px"; d.textContent=b.t; return d; },
  render(){ this.pool.innerHTML=""; this.prog.innerHTML="";
    this.blocks.filter(b=>!this.program.includes(b)).forEach(b=>{ const d=this.blockEl(b,0);
      d.onclick=()=>{ if(this.busy) return; this.program.push(b); this.msg.textContent=""; this.render(); }; this.pool.appendChild(d); });
    this.program.forEach((b,j)=>{ const d=this.blockEl(b,b.i);
      d.onclick=()=>{ if(this.busy) return; this.program.splice(j,1); this.render(); }; this.prog.appendChild(d); });
    if(!this.program.length) this.prog.insertAdjacentHTML("beforeend",'<p class="dim">Clicca i blocchi a sinistra per metterli qui, nell\'ordine giusto.<br>Clicca un blocco qui per toglierlo.</p>');
    if(this.P.num){ const f=this.blockEl({c:"var",t:"numero = "+this.P.num.start},0); f.classList.add("fixed"); this.prog.prepend(f); } },  // primo blocco fisso
  // indice della prima riga sbagliata o mancante, -1 se il programma è giusto
  firstWrong(){ const n=this.P.sol.length; for(let j=0;j<Math.max(n,this.program.length);j++) if(!this.program[j]||this.program[j].k!==j) return j; return -1; },
  say(t,cls){ this.msg.textContent=t; this.msg.className="chmsg "+(cls||""); },
  help(){ if(this.busy) return; const bad=this.firstWrong(); if(bad<0) return;
    this.program=this.program.slice(0,bad); this.program.push(this.blocks.find(b=>b.k===bad)); this.render(); this.say("💡 Ecco un aiuto: ho sistemato la riga "+(bad+1)+"."); },
  // "esegue" il programma riga per riga e si ferma sul primo errore
  run(){ if(this.busy) return; if(!this.program.length) return this.say("Il programma è vuoto!","bad");
    if(this.P.num) return this.runNum();
    const bad=this.firstWrong(), els=[...this.prog.querySelectorAll(".blk")]; let j=0; this.busy=true; this.say("▶ Esecuzione...");
    const step=()=>{ els.forEach(e=>e.classList.remove("now"));
      if(j===bad){ this.busy=false; SFX.play("error");
        if(els[j]){ els[j].classList.add("wrong"); this.say("✗ Riga "+(j+1)+": questo blocco non va qui. Riprova!","bad"); }
        else this.say("✗ Il programma è finito ma la cassa è ancora chiusa: manca qualcosa!","bad");
        return; }
      if(j>=els.length){ this.busy=false; return this.win(); }
      els[j].classList.add("now"); SFX.play("click"); j++; setTimeout(step,320); };
    step(); },
  // calcola numero riga per riga e mostra il valore accanto a ogni blocco
  runNum(){ const {start,target}=this.P.num, els=[...this.prog.querySelectorAll(".blk:not(.fixed)")]; let v=start, j=0; this.busy=true;
    els.forEach(e=>{ e.dataset.v=""; e.classList.remove("wrong"); });
    const step=()=>{ els.forEach(e=>e.classList.remove("now"));
      if(j<els.length){ v=calc(v,this.program[j].op); els[j].classList.add("now"); els[j].dataset.v="→ "+v; this.say("numero = "+v); SFX.play("click"); j++; return setTimeout(step,600); }
      this.busy=false;
      if(v===target) return this.win();
      SFX.play("error"); this.say(`✗ Alla fine numero = ${v}, ma il lucchetto vuole ${target}. Prova un altro ordine o altri blocchi!`,"bad"); };
    step(); },
  win(){ const r=this.reward; this.onWin();
    $("chGame").hidden=true; $("chWin").hidden=false; $("chInfo").hidden=true; $("chTitle").textContent="🔓 CASSA APERTA!";
    if(r){ $("chRewardT").textContent="NUOVA TRUPPA SBLOCCATA: "; $("chReward").textContent=r.stats.name; $("chDesc").textContent=r.stats.description; }
    else { $("chRewardT").textContent="Hai già sbloccato tutte le truppe! Premio: "; $("chReward").textContent="+"+CHEST_GOLD+" ORO"; $("chDesc").textContent=""; }
    $("chLesson").textContent=this.P.lesson; this.spin(r); },
  // slot verticale con i personaggi → si ferma su "?" → animazione strana → rivela la truppa
  spin(r){ const cv=$("chSpr"), g=cv.getContext("2d"), W=cv.width, CH=cv.height, H=64, SPIN=2.6, WEIRD=1.3;
    const sprs=(typeof Game!=="undefined"?Game.defs:[]).map(d=>d.spr.n), pick=()=>sprs[rint(0,sprs.length-1)];
    const N=26, reel=[]; for(let i=0;i<N;i++) reel.push(pick()); reel.push("?", pick());
    const total=N*H, token=this.anim={}, t0=performance.now(); let last=-1, phase=0;
    const item=(it,cx,cy,s)=>{ if(it==="?"){ g.fillStyle=PAL[0]; g.fillRect(cx-s/2,cy-s/2,s,s); g.fillStyle="#5d275d"; g.fillRect(cx-s/2+3,cy-s/2+3,s-6,s-6);
        g.font=Math.round(s*0.6)+"px 'Press Start 2P', monospace"; g.textAlign="center"; g.textBaseline="middle"; g.fillStyle=PAL[4]; g.fillText("?",cx+2,cy+3); }
      else if(it) g.drawImage(it,cx-s/2,cy-s/2,s,s); };
    const frame=now=>{ if(this.anim!==token||!this.isOpen) return; const t=(now-t0)/1000; g.imageSmoothingEnabled=false;
      g.fillStyle="#0e0f1c"; g.fillRect(0,0,W,CH);
      if(t<SPIN){ const pos=total*(1-Math.pow(1-t/SPIN,3)), idx=Math.floor(pos/H+0.5);
        if(idx!==last){ last=idx; SFX.play("click"); }
        for(let i=idx-2;i<=idx+2;i++) if(reel[i]!==undefined) item(reel[i],W/2,CH/2+i*H-pos,56);
        g.fillStyle="rgba(14,15,28,0.65)"; g.fillRect(0,0,W,CH/2-H/2); g.fillRect(0,CH/2+H/2,W,CH/2-H/2);   // oscura sopra/sotto
        g.fillStyle=PAL[4]; g.fillRect(0,CH/2-H/2-2,W,2); g.fillRect(0,CH/2+H/2,W,2); }
      else if(t<SPIN+WEIRD){ if(phase<1){ phase=1; SFX.play("magic"); }
        const k=(t-SPIN)/WEIRD, j=k*10;   // trema, pulsa, cambia colore e glitch
        for(let i=0;i<5;i++){ g.fillStyle=`hsl(${(t*600+i*72)%360},90%,60%)`; g.fillRect(rint(0,W),rint(0,CH),rint(4,30)*k,2); }
        g.save(); g.translate(W/2+rint(-j,j),CH/2+rint(-j,j)); g.rotate(Math.sin(t*30)*0.3*k); const s=56*(1+Math.sin(t*25)*0.25*k+k*0.4);
        item("?",0,0,s); g.restore();
        if(k>0.85){ g.fillStyle=`rgba(255,255,255,${(k-0.85)/0.15})`; g.fillRect(0,0,W,CH); } }
      else { if(phase<2){ phase=2; SFX.play("boom"); SFX.play("clear"); $("chInfo").hidden=false; }
        const k=Math.min(1,(t-SPIN-WEIRD)/0.35), s=96*(k<1?k*1.25:1+Math.sin(t*4)*0.04);   // pop con rimbalzo
        g.save(); g.translate(W/2,CH/2); g.rotate(t*0.8); g.fillStyle="rgba(255,205,117,0.18)";
        for(let i=0;i<12;i++){ g.rotate(Math.PI/6); g.beginPath(); g.moveTo(0,0); g.lineTo(-12,-W); g.lineTo(12,-W); g.fill(); } g.restore();
        if(t-SPIN-WEIRD<0.4){ g.fillStyle=`rgba(255,255,255,${1-(t-SPIN-WEIRD)/0.4})`; g.fillRect(0,0,W,CH); }
        if(r) item(r.spr.n,W/2,CH/2,s);
        else { g.fillStyle=PAL[0]; g.beginPath(); g.arc(W/2,CH/2,s/2.2+2,0,7); g.fill(); g.fillStyle=PAL[4]; g.beginPath(); g.arc(W/2,CH/2,s/2.2,0,7); g.fill();
          g.font="16px 'Press Start 2P', monospace"; g.textAlign="center"; g.textBaseline="middle"; g.fillStyle=PAL[0]; g.fillText("+"+CHEST_GOLD,W/2,CH/2+1); } }
      requestAnimationFrame(frame); };
    requestAnimationFrame(frame); },
  // cassa sulla mappa (casella tx,ty)
  draw(c,tx,ty,t){ const x=tx*TILE+2, y=ty*TILE+4-Math.round(Math.abs(Math.sin(t*3))*2);
    c.fillStyle="rgba(0,0,0,.3)"; c.fillRect(tx*TILE+3,ty*TILE+14,10,2);
    c.fillStyle=PAL[0]; c.fillRect(x-1,y-1,14,12);
    c.fillStyle="#7a4a2e"; c.fillRect(x,y,12,10); c.fillStyle="#a0643a"; c.fillRect(x,y,12,4);
    c.fillStyle=PAL[0]; c.fillRect(x,y+4,12,1);
    c.fillStyle=PAL[4]; c.fillRect(x,y,1,10); c.fillRect(x+11,y,1,10); c.fillRect(x+5,y+3,2,4);
    c.fillStyle=PAL[0]; c.fillRect(x+5,y+5,2,1);
    if(Math.sin(t*5)>0.5){ c.fillStyle="#fff"; c.fillRect(x+11,y-4,1,3); c.fillRect(x+10,y-3,3,1); } },
};
