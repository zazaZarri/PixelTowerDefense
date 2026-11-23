"use strict";
// ===== Valori di default + documentazione variabili =====
const PROJECTILES=["arrow","fireball","ice","lightning","bomb","laser"];
const TOWER_DEFAULTS={ name:"Torre", cost:50, damage:10, firerate:1, range:64, projectile:"arrow", projectileSpeed:220,
  shotCount:1, spread:12, splash:0, pierce:1, chain:0, slow:0, slowTime:1.5, critChance:0, critMult:2,
  targeting:"first", color:"#3b5dc9", vfxColor:"#ffcd75", upgradeCost:40, upgradeMult:1.3, maxLevel:5, description:"", weapon:"" };

const VAR_DOCS=[
 ["name",'"Arciere"',"Nome del personaggio"],
 ["cost","50","Prezzo in oro"],
 ["damage","10","Danno per colpo"],
 ["firerate","1.5","Colpi al secondo"],
 ["range","64","Raggio d'attacco in pixel (1 casella = 16)"],
 ["projectile",'"arrow"',"arrow | fireball | ice | lightning | bomb | laser"],
 ["weapon",'"Shuriken"',"Arma personalizzata da sparare (nome dall'elenco ARMI). Vuoto = usa projectile"],
 ["projectileSpeed","220","Velocità del proiettile (px/s)"],
 ["shotCount","1","Proiettili per colpo (multishot)"],
 ["spread","12","Apertura del multishot in gradi"],
 ["splash","0","Raggio del danno ad area (0 = niente)"],
 ["pierce","1","Nemici attraversati (arrow / laser)"],
 ["chain","0","Rimbalzi del fulmine (lightning)"],
 ["slow","0","Rallentamento 0 … 0.9"],
 ["slowTime","1.5","Durata del rallentamento (s)"],
 ["critChance","0.1","Probabilità di critico 0 … 1"],
 ["critMult","2","Moltiplicatore del critico"],
 ["targeting",'"first"',"first | last | strong | close"],
 ["color",'"#3b5dc9"',"Colore principale (sprite automatico)"],
 ["vfxColor",'"#ffcd75"',"Colore degli effetti"],
 ["upgradeCost","40","Costo upgrade (× livello attuale)"],
 ["upgradeMult","1.3","Moltiplicatore danno per livello"],
 ["maxLevel","5","Livello massimo"],
 ["description",'"..."',"Descrizione nel negozio"],
];

const RULES_DEFAULTS={ startGold:150, startLives:20, hpScale:1, enemySpeed:1, goldMult:1, firstWave:6, perWave:2, bossEvery:10, sellRefund:0.7, waveBonus:20, autoWaveDelay:3 };
const RULE_DOCS=[
 ["startGold","150","Oro iniziale"], ["startLives","20","Vite iniziali"], ["hpScale","1","Moltiplicatore vita nemici"],
 ["enemySpeed","1","Moltiplicatore velocità nemici"], ["goldMult","1","Moltiplicatore oro per uccisione"],
 ["firstWave","6","Nemici nella prima ondata"], ["perWave","2","Nemici in più a ogni ondata"], ["bossEvery","10","Boss ogni N ondate (0 = mai)"],
 ["sellRefund","0.7","Rimborso alla vendita (0 … 1)"], ["waveBonus","20","Oro bonus a fine ondata"],
 ["autoWaveDelay","3","Secondi tra ondate in modalità AUTO"],
];
const RULES_CODE=`// ⚙ REGOLE DELLA PARTITA
// Cambia i numeri e premi SALVA: la partita ricomincia.
var startGold = 150;
var startLives = 20;
var hpScale = 1;        // vita nemici
var enemySpeed = 1;     // velocità nemici
var goldMult = 1;       // oro per uccisione
var firstWave = 6;      // nemici nella prima ondata
var perWave = 2;        // nemici in più a ogni ondata
var bossEvery = 10;     // boss ogni N ondate
var sellRefund = 0.7;   // rimborso vendita
var waveBonus = 20;     // bonus fine ondata
var autoWaveDelay = 3;  // pausa tra ondate (AUTO)
`;

const NEW_TOWER_CODE=`// ✨ NUOVO PERSONAGGIO
// Scrivi le specifiche con: var nome = valore;
// Puoi usare anche calcoli: var damage = 5 * 2;
var name = "Eroe";
var cost = 60;
var damage = 10;
var firerate = 1.5;
var range = 70;
var projectile = "arrow";   // arrow | fireball | ice | lightning | bomb | laser
var projectileSpeed = 260;
var shotCount = 1;
var splash = 0;
var pierce = 1;
var slow = 0;
var critChance = 0.1;
var critMult = 2;
var color = "#41a6f6";
var vfxColor = "#ffcd75";
var upgradeCost = 40;
var upgradeMult = 1.3;
var maxLevel = 5;
var targeting = "first";
var weapon = "";          // nome di un'arma creata da te, es. "Shuriken"
var description = "Il mio eroe personalizzato.";
`;

const DEFAULT_TOWERS=[
`// 🏹 ARCIERE — rapido, ottimi critici
var name = "Arciere";
var cost = 50;
var damage = 7;
var firerate = 2.2;
var range = 72;
var projectile = "arrow";
var projectileSpeed = 320;
var pierce = 1;
var critChance = 0.15;
var critMult = 2.5;
var color = "#3b5dc9";
var vfxColor = "#f4f4f4";
var upgradeCost = 35;
var upgradeMult = 1.3;
var maxLevel = 5;
var targeting = "first";
var description = "Tiri rapidi e critici.";
`,
`// 🔥 PIROMANTE — palle di fuoco ad area
var name = "Piromante";
var cost = 85;
var damage = 14;
var firerate = 0.9;
var range = 64;
var projectile = "fireball";
var projectileSpeed = 170;
var splash = 20;
var critChance = 0.05;
var color = "#b13e53";
var vfxColor = "#ef7d57";
var upgradeCost = 55;
var upgradeMult = 1.35;
var maxLevel = 5;
var description = "Esplosioni infuocate.";
`,
`// ❄ CRIOMANTE — rallenta i nemici
var name = "Criomante";
var cost = 70;
var damage = 4;
var firerate = 1.2;
var range = 60;
var projectile = "ice";
var projectileSpeed = 200;
var splash = 12;
var slow = 0.5;
var slowTime = 2;
var color = "#41a6f6";
var vfxColor = "#73eff7";
var upgradeCost = 45;
var upgradeMult = 1.25;
var description = "Congela e rallenta.";
`,
`// ⚡ TESLA — fulmini a catena
var name = "Tesla";
var cost = 110;
var damage = 9;
var firerate = 1.1;
var range = 68;
var projectile = "lightning";
var chain = 3;
var critChance = 0.1;
var color = "#ffcd75";
var vfxColor = "#73eff7";
var upgradeCost = 70;
var upgradeMult = 1.3;
var targeting = "strong";
var description = "Il fulmine rimbalza.";
`,
`// 💣 CANNONE — bombe pesanti ad arco
var name = "Cannone";
var cost = 120;
var damage = 32;
var firerate = 0.45;
var range = 92;
var projectile = "bomb";
var projectileSpeed = 160;
var splash = 30;
var color = "#566c86";
var vfxColor = "#ef7d57";
var upgradeCost = 75;
var upgradeMult = 1.35;
var description = "Grandi esplosioni.";
`,
`// 🔮 LASER — raggio perforante
var name = "Oracolo";
var cost = 150;
var damage = 18;
var firerate = 0.8;
var range = 110;
var projectile = "laser";
var pierce = 4;
var critChance = 0.2;
var critMult = 2;
var color = "#5d275d";
var vfxColor = "#ff5ccf";
var upgradeCost = 90;
var upgradeMult = 1.3;
var targeting = "strong";
var description = "Raggio che trapassa.";
`];


const WEAPON_TOWERS=[
`// 🥷 NINJA — lancia 3 shuriken a ventaglio
var name = "Ninja";
var cost = 90;
var damage = 6;
var firerate = 1.6;
var range = 76;
var weapon = "Shuriken";
var projectileSpeed = 240;
var shotCount = 3;
var spread = 18;
var critChance = 0.2;
var critMult = 2;
var color = "#333c57";
var vfxColor = "#94b0c2";
var upgradeCost = 55;
var description = "Tre stelle ninja per colpo.";
`,
`// 🪓 BARBARO — l'ascia torna indietro
var name = "Barbaro";
var cost = 100;
var damage = 14;
var firerate = 0.7;
var range = 70;
var weapon = "Ascia";
var projectileSpeed = 150;
var color = "#ef7d57";
var vfxColor = "#b13e53";
var upgradeCost = 60;
var description = "Colpisce all'andata e al ritorno.";
`,
`// ☄ ASTROMANTE — pioggia di meteore
var name = "Astromante";
var cost = 160;
var damage = 28;
var firerate = 0.4;
var range = 100;
var weapon = "Meteora";
var projectileSpeed = 180;
var splash = 26;
var color = "#29366f";
var vfxColor = "#ef7d57";
var upgradeCost = 95;
var description = "Meteore che esplodono ad area.";
`,
`// 🧪 STREGA — bolle velenose che rallentano
var name = "Strega";
var cost = 80;
var damage = 5;
var firerate = 1.3;
var range = 66;
var weapon = "Bolla";
var projectileSpeed = 140;
var splash = 14;
var slow = 0.35;
var slowTime = 1.5;
var color = "#38b764";
var vfxColor = "#a7f070";
var upgradeCost = 50;
var description = "Veleno ad area che rallenta.";
`,
`// 💀 NEGROMANTE — teschi che inseguono
var name = "Negromante";
var cost = 130;
var damage = 20;
var firerate = 0.75;
var range = 84;
var weapon = "Teschio";
var projectileSpeed = 150;
var pierce = 2;
var critChance = 0.15;
var color = "#5d275d";
var vfxColor = "#b56cff";
var upgradeCost = 80;
var targeting = "strong";
var description = "Teschi spettrali a ricerca.";
`];

// ===== Parser del codice "var x = ..." =====
function runVars(code, known){
  const found=[...code.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
  const keys=[...new Set([...known,...found])];
  const body='"use strict";\n'+code+'\n;return {'+keys.map(k=>JSON.stringify(k)+':(typeof '+k+'!=="undefined"?'+k+':undefined)').join(",")+'};';
  return (new Function(body))();
}
function _num(s,k,min,max){ let v=Number(s[k]); if(!isFinite(v)) v=TOWER_DEFAULTS[k]; s[k]=Math.min(max,Math.max(min,v)); }
function parseTower(code){
  const warn=[];
  try{
    const v=runVars(code,Object.keys(TOWER_DEFAULTS)); const s={...TOWER_DEFAULTS};
    for(const k in v) if(v[k]!==undefined) s[k]=v[k];
    s.weapon=s.weapon?String(s.weapon).trim():""; if(s.weapon&&typeof Weapons!=="undefined"&&Weapons.list.length&&!Weapons.get(s.weapon)) warn.push('arma "'+s.weapon+'" non trovata');
    s.name=String(s.name).slice(0,18)||"Torre"; s.description=String(s.description||"").slice(0,80);
    _num(s,"cost",0,99999); s.cost=Math.round(s.cost); _num(s,"damage",0,99999); _num(s,"firerate",0.05,30); _num(s,"range",8,480);
    _num(s,"projectileSpeed",20,2000); _num(s,"shotCount",1,12); _num(s,"spread",0,90); _num(s,"splash",0,120);
    _num(s,"pierce",1,50); _num(s,"chain",0,20); _num(s,"slow",0,0.9); _num(s,"slowTime",0,20); _num(s,"critChance",0,1);
    _num(s,"critMult",1,20); _num(s,"upgradeCost",0,99999); _num(s,"upgradeMult",1,5); _num(s,"maxLevel",1,10); s.maxLevel=Math.round(s.maxLevel);
    s.projectile=String(s.projectile).toLowerCase(); if(!PROJECTILES.includes(s.projectile)){ warn.push('projectile "'+s.projectile+'" sconosciuto → uso "arrow"'); s.projectile="arrow"; }
    if(!TARGET_MODES.includes(s.targeting)){ if(v.targeting!==undefined) warn.push('targeting non valido → "first"'); s.targeting="first"; }
    for(const k of ["color","vfxColor"]) if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s[k]))){ warn.push(k+" non è un colore #hex"); s[k]=TOWER_DEFAULTS[k]; }
    return {ok:true,stats:s,warn};
  }catch(e){ return {ok:false,error:e.message,stats:{...TOWER_DEFAULTS},warn}; }
}
function parseRules(code){
  try{ const v=runVars(code,Object.keys(RULES_DEFAULTS)); const s={...RULES_DEFAULTS};
    for(const k in RULES_DEFAULTS){ const n=Number(v[k]); if(v[k]!==undefined && isFinite(n)) s[k]=n; }
    s.startGold=Math.max(0,Math.round(s.startGold)); s.startLives=Math.max(1,Math.round(s.startLives)); s.hpScale=Math.max(0.05,s.hpScale);
    s.enemySpeed=Math.min(5,Math.max(0.1,s.enemySpeed)); s.firstWave=Math.min(100,Math.max(1,Math.round(s.firstWave))); s.perWave=Math.min(20,Math.max(0,Math.round(s.perWave))); s.bossEvery=Math.max(0,Math.round(s.bossEvery));
    s.sellRefund=Math.min(1,Math.max(0,s.sellRefund)); s.autoWaveDelay=Math.max(0,s.autoWaveDelay);
    return {ok:true,stats:s,warn:[]};
  }catch(e){ return {ok:false,error:e.message,stats:{...RULES_DEFAULTS},warn:[]}; }
}

// ===== Salvataggio locale =====
const Store={
  loadDefs(){ try{ const j=JSON.parse(localStorage.getItem("ptd_defs_v1")); if(Array.isArray(j)&&j.length) return Store.migrate(j); }catch(e){}
    try{ localStorage.setItem("ptd_v2","1"); }catch(e){}
    return Store.defaultDefs(); },
  defaultDefs(){ return DEFAULT_TOWERS.concat(WEAPON_TOWERS).map((code,i)=>({id:"d"+i,code,sprite:null})); },
  migrate(raws){ try{ if(localStorage.getItem("ptd_v2")) return raws; localStorage.setItem("ptd_v2","1"); }catch(e){ return raws; }
    const have=new Set(raws.map(r=>r.id)); Store.defaultDefs().forEach(d=>{ if(!have.has(d.id)) raws.push(d); }); return raws; },
  saveDefs(raws){ try{ localStorage.setItem("ptd_defs_v1",JSON.stringify(raws)); }catch(e){} },
  // le vecchie regole usavano waveSize (moltiplicatore): lo sostituisco con firstWave/perWave
  loadRules(){ try{ const r=localStorage.getItem("ptd_rules_v1"); if(r) return /firstWave/.test(r)?r:r.replace(/^.*\bwaveSize\b.*$/m,"").trimEnd()+"\nvar firstWave = 6;      // nemici nella prima ondata\nvar perWave = 2;        // nemici in più a ogni ondata\n"; }catch(e){} return RULES_CODE; },
  saveRules(c){ try{ localStorage.setItem("ptd_rules_v1",c); }catch(e){} },
};
function hydrateDef(raw){
  const p=parseTower(raw.code||"");
  const auto=!(Array.isArray(raw.sprite)&&raw.sprite.length===16);
  const grid=auto?generateTowerGrid(p.stats.color,p.stats.weapon?"staff":p.stats.projectile):raw.sprite.map(r=>String(r).padEnd(16,".").slice(0,16));
  return {id:raw.id,code:raw.code,sprite:grid,auto,stats:p.stats,ok:p.ok,spr:buildTowerSprites(grid)};
}
function dps(s){ const n=s.projectile==="lightning"||s.projectile==="laser"?1:s.shotCount; return s.damage*s.firerate*n*(1+s.critChance*(s.critMult-1)); }
