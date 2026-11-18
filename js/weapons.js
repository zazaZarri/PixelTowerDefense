"use strict";
// ===== ARMI: cosa spara il personaggio (sprite, movimento, effetti, suoni) =====
const MOTIONS=["homing","straight","wave","boomerang","lob","rain"];
const TRAILS=["none","fire","smoke","sparkle","ice","magic","ghost","line","bubbles"];
const HIT_FX=["none","spark","explosion","frost","electric","poison","magic","confetti","smoke","splat"];
const MUZZLES=["none","spark","smoke","magic","fire"];
const WEAPON_DEFAULTS={ name:"Arma", size:1, motion:"homing", speedMult:1, spin:0, rotate:true, hitRadius:0, lobHeight:1,
  trail:"none", trailColor:"#f4f4f4", trailAmount:1, hitEffect:"spark", hitColor:"#f4f4f4", hitSize:1,
  glow:false, glowColor:"#ffcd75", shake:0, muzzle:"spark", shootSound:"throw", hitSound:"hit" };

const WEAPON_VAR_DOCS=[
 ["name",'"Shuriken"',"Nome (da usare nel personaggio: var weapon = \"...\")"],
 ["size","1","Grandezza del colpo (1 = normale, 2 = doppio, 0.5 = metà)"],
 ["motion",'"homing"',"homing | straight | wave | boomerang | lob | rain"],
 ["speedMult","1","Moltiplicatore della velocità del colpo"],
 ["spin","0","Rotazione in gradi al secondo (es. 720)"],
 ["rotate","true","Punta nella direzione del volo"],
 ["hitRadius","0","Raggio di impatto (0 = dalla grandezza)"],
 ["lobHeight","1","Altezza della parabola (lob)"],
 ["trail",'"sparkle"',"none | fire | smoke | sparkle | ice | magic | ghost | line | bubbles"],
 ["trailColor",'"#f4f4f4"',"Colore della scia"],
 ["trailAmount","1","Quantità di scia (0 … 5)"],
 ["hitEffect",'"spark"',"none | spark | explosion | frost | electric | poison | magic | confetti | smoke | splat"],
 ["hitColor",'"#f4f4f4"',"Colore dell'effetto all'impatto"],
 ["hitSize","1","Grandezza dell'effetto all'impatto"],
 ["glow","false","Alone luminoso attorno al colpo"],
 ["glowColor",'"#ffcd75"',"Colore dell'alone"],
 ["shake","0","Scossa dello schermo all'impatto (0 … 8)"],
 ["muzzle",'"spark"',"Effetto allo sparo: none | spark | smoke | magic | fire"],
 ["shootSound",'"throw"',SHOOT_SOUNDS.join(" | ")],
 ["hitSound",'"hit"',HIT_SOUNDS.join(" | ")],
];

function parseWeapon(code){
  const warn=[];
  try{ const v=runVars(code,Object.keys(WEAPON_DEFAULTS)); const s={...WEAPON_DEFAULTS};
    for(const k in v) if(v[k]!==undefined) s[k]=v[k];
    s.name=String(s.name).slice(0,18)||"Arma";
    const num=(k,a,b)=>{ let x=Number(s[k]); if(!isFinite(x)) x=WEAPON_DEFAULTS[k]; s[k]=Math.min(b,Math.max(a,x)); };
    num("size",0.25,8); num("speedMult",0.1,10); num("spin",-5000,5000); num("hitRadius",0,80); num("lobHeight",0,5);
    num("trailAmount",0,5); num("hitSize",0,6); num("shake",0,8); s.rotate=!!s.rotate; s.glow=!!s.glow;
    const pick=(k,list)=>{ s[k]=String(s[k]).toLowerCase(); if(!list.includes(s[k])){ warn.push(k+' "'+s[k]+'" sconosciuto'); s[k]=WEAPON_DEFAULTS[k]; } };
    pick("motion",MOTIONS); pick("trail",TRAILS); pick("hitEffect",HIT_FX); pick("muzzle",MUZZLES); pick("shootSound",SHOOT_SOUNDS); pick("hitSound",HIT_SOUNDS);
    for(const k of ["trailColor","hitColor","glowColor"]) if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s[k]))){ warn.push(k+" non è un colore #hex"); s[k]=WEAPON_DEFAULTS[k]; }
    return {ok:true,stats:s,warn};
  }catch(e){ return {ok:false,error:e.message,stats:{...WEAPON_DEFAULTS},warn}; }
}

// ---- sprite a colori liberi: {w,h,px:["#rrggbb" | ""]} ----
function rowsToPx(rows,map){ const h=rows.length,w=rows[0].length,px=[]; for(const r of rows) for(const ch of r) px.push(map[ch]||""); return {w,h,px}; }
function outlinePx(s,color="#1a1c2c"){ const w=s.w+2,h=s.h+2,px=Array(w*h).fill("");
  for(let y=0;y<s.h;y++) for(let x=0;x<s.w;x++) px[(y+1)*w+x+1]=s.px[y*s.w+x];
  const out=px.slice(); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(px[y*w+x]) continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy; if(X>=0&&Y>=0&&X<w&&Y<h&&px[Y*w+X]&&px[Y*w+X]!==color){ out[y*w+x]=color; break; } } }
  return {w,h,px:out}; }
function pxToCanvas(s){ const c=makeCanvas(s.w,s.h), g=c.getContext("2d");
  for(let y=0;y<s.h;y++) for(let x=0;x<s.w;x++){ const col=s.px[y*s.w+x]; if(col){ g.fillStyle=col; g.fillRect(x,y,1,1);} } return c; }
function blankPx(n){ return {w:n,h:n,px:Array(n*n).fill("")}; }
function resizePx(s,n){ const o=blankPx(n), ox=Math.floor((n-s.w)/2), oy=Math.floor((n-s.h)/2);
  for(let y=0;y<s.h;y++) for(let x=0;x<s.w;x++){ const X=x+ox,Y=y+oy; if(X>=0&&Y>=0&&X<n&&Y<n) o.px[Y*n+X]=s.px[y*s.w+x]; } return o; }

const W_SPRITES=(()=>{ const O=null;
  const k="#1a1c2c";
  return {
    shuriken: outlinePx(rowsToPx([".....s.....",".....s.....","....sws....","....sws....","...ssdss...","sswwdkdwwss","...ssdss...","....sws....","....sws....",".....s.....",".....s....."],{s:"#94b0c2",w:"#f4f4f4",d:"#566c86",k:"#333c57"})),
    axe: outlinePx(rowsToPx(["......ss...",".....ssss..","....swsss..","...bbssss..","...bb.sss..","..bb...s...","..bb.......",".bb........",".bb........","bb.........","b.........."],{s:"#94b0c2",w:"#f4f4f4",b:"#9c6640"})),
    meteor: outlinePx(rowsToPx(["...rrrr...","..rrorrr..",".rroyorrr.","rroyyyorrr","rroyyyyorr","rrroyyorrr","rrrroorrdr",".rrrrrrdr.","..rddddd..","...dddd..."],{r:"#b13e53",o:"#ef7d57",y:"#ffcd75",d:"#5d275d"})),
    bubble: outlinePx(rowsToPx(["...gggg...","..gffffg..",".gfwwfffg.","gfwffffffg","gfwffffffg","gffffffffg","gffffffffg",".gffffffg.","..gffffg..","...gggg..."],{g:"#a7f070",f:"#38b76488",w:"#f4f4f4"}),"#257179"),
    skull: outlinePx(rowsToPx(["..wwwww..",".wwwwwww.","wwwwwwwww","wkkwwwkkw","wkkwwwkkw","wwwwkwwww",".wwwwwww.","..wgwgw..","..wwwww.."],{w:"#f4f4f4",k:"#5d275d",g:"#94b0c2"})),
    star: outlinePx(rowsToPx(["....y....","....y....","...yyy...","yyyywyyyy",".yyyyyyy.","..yyyyy..","..yyoyy..",".yyo.oyy.",".yo...oy."],{y:"#ffcd75",w:"#f4f4f4",o:"#ef7d57"})),
    dagger: outlinePx(rowsToPx(["...g........","bbbgssssssw.","bbbgsssssssw","bbbgssssssw.","...g........"],{b:"#9c6640",g:"#ffcd75",s:"#94b0c2",w:"#f4f4f4"})),
  }; })();

const DEFAULT_WEAPONS=[
 {key:"shuriken",code:`// ⭐ SHURIKEN — stella ninja rotante
var name = "Shuriken";
var size = 1;
var motion = "straight";
var speedMult = 1.2;
var spin = 900;
var rotate = false;
var trail = "line";
var trailColor = "#94b0c2";
var hitEffect = "spark";
var hitColor = "#f4f4f4";
var shootSound = "swish";
var hitSound = "crack";
`},
 {key:"axe",code:`// 🪓 ASCIA — torna indietro come un boomerang
var name = "Ascia";
var size = 1;
var motion = "boomerang";
var spin = 720;
var rotate = false;
var trail = "ghost";
var hitEffect = "splat";
var hitColor = "#b13e53";
var shake = 1;
var shootSound = "swish";
var hitSound = "thud";
`},
 {key:"meteor",code:`// ☄ METEORA — cade dal cielo ed esplode
var name = "Meteora";
var size = 1.5;
var motion = "rain";
var speedMult = 1.4;
var spin = 200;
var rotate = false;
var trail = "fire";
var trailColor = "#ef7d57";
var trailAmount = 2;
var hitEffect = "explosion";
var hitColor = "#ef7d57";
var hitSize = 1.5;
var glow = true;
var glowColor = "#ef7d57";
var shake = 4;
var muzzle = "magic";
var shootSound = "magic";
var hitSound = "boom";
`},
 {key:"bubble",code:`// 🫧 BOLLA VELENOSA — ondeggia e scoppia
var name = "Bolla";
var size = 1;
var motion = "wave";
var speedMult = 0.8;
var rotate = false;
var trail = "bubbles";
var trailColor = "#a7f070";
var hitEffect = "poison";
var hitColor = "#a7f070";
var hitSize = 1.2;
var shootSound = "pop";
var hitSound = "splat";
`},
 {key:"skull",code:`// 💀 TESCHIO SPETTRALE — insegue il nemico
var name = "Teschio";
var size = 1;
var motion = "homing";
var speedMult = 0.9;
var rotate = false;
var trail = "magic";
var trailColor = "#b56cff";
var trailAmount = 2;
var hitEffect = "magic";
var hitColor = "#b56cff";
var glow = true;
var glowColor = "#5d275d";
var muzzle = "magic";
var shootSound = "magic";
var hitSound = "magic";
`},
 {key:"star",code:`// ✨ STELLA — scintille e coriandoli
var name = "Stella";
var size = 1;
var motion = "homing";
var spin = 360;
var rotate = false;
var trail = "sparkle";
var trailColor = "#ffcd75";
var trailAmount = 2;
var hitEffect = "confetti";
var hitColor = "#ffcd75";
var glow = true;
var shootSound = "chime";
var hitSound = "pop";
`},
 {key:"dagger",code:`// 🗡 PUGNALE — veloce e dritto
var name = "Pugnale";
var size = 1;
var motion = "straight";
var speedMult = 1.6;
var rotate = true;
var trail = "line";
var trailColor = "#f4f4f4";
var hitEffect = "spark";
var shootSound = "throw";
var hitSound = "hit";
`},
];

const Weapons={ list:[], get(n){ if(!n) return null; n=String(n).toLowerCase().trim(); return this.list.find(w=>w.stats.name.toLowerCase()===n)||null; } };
const WStore={
  load(){ try{ const j=JSON.parse(localStorage.getItem("ptd_weapons_v1")); if(Array.isArray(j)) return j; }catch(e){}
    return DEFAULT_WEAPONS.map((d,i)=>({id:"w"+i,code:d.code,sprite:W_SPRITES[d.key]})); },
  save(raws){ try{ localStorage.setItem("ptd_weapons_v1",JSON.stringify(raws)); }catch(e){ alert("Spazio di salvataggio pieno: usa immagini più piccole."); } },
};
function hydrateWeapon(raw){ const p=parseWeapon(raw.code||""); let sp=raw.sprite;
  if(!sp||!Array.isArray(sp.px)||sp.px.length!==sp.w*sp.h) sp=W_SPRITES.star;
  const cv=pxToCanvas(sp); return {id:raw.id,code:raw.code,sprite:sp,stats:p.stats,ok:p.ok,cv}; }
