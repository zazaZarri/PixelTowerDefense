"use strict";
// ===== Nemici: statistiche base (modificabili) =====
const ENEMY_TYPES = {
  slime:  { hp:30,   speed:26, gold:4,   armor:0, radius:5,  colors:[PAL[5],PAL[6],PAL[12]] },
  goblin: { hp:48,   speed:36, gold:5,   armor:0, radius:5,  colors:[PAL[6],PAL[1],PAL[5]] },
  bat:    { hp:26,   speed:58, gold:5,   armor:0, radius:5,  colors:[PAL[1],PAL[2],PAL[12]], fly:true },
  golem:  { hp:170,  speed:18, gold:12,  armor:3, radius:6,  colors:[PAL[13],PAL[14],PAL[11]] },
  boss:   { hp:1600, speed:14, gold:120, armor:6, radius:11, colors:[PAL[3],PAL[2],PAL[4]], boss:true, scale:2, art:"bossArt" },
};

const ENEMY_ART = {};
(function buildEnemyArt(){
  const O = PAL[0];
  function build(name, frames, pal){
    const n = frames.map(r=>spriteFromRows(r,pal)); const f = n.map(flipH);
    ENEMY_ART[name] = { n, f, wn:n.map(c=>silhouette(c,"#fff")), wf:f.map(c=>silhouette(c,"#fff")),
      in:n.map(c=>silhouette(c,PAL[11])), if:f.map(c=>silhouette(c,PAL[11])), w:n[0].width, h:n[0].height };
  }
  const SA = ["............","....oooo....","...ollllo...","..ollwlllo..",".olllllllgo.",".olkllkllgo.",
              "oglkllklgggo","ogglllllgggo","oggggggggggo",".oooooooooo."];
  const SB = ["............","............",SA[1],SA[2],SA[3],SA[5],SA[6],SA[7],SA[8],SA[9]];
  build("slime",[SA,SB],{o:O,g:PAL[6],l:PAL[5],w:PAL[12],k:O});

  const GT = ["..oooooo..","o.oggggo.o","ogoggggogo",".ogrggrgo.","..oggggo..","..ogddgo..",".obbbbbbo.","ogbbybbbgo",".obbbbbbo."];
  build("goblin",[GT.concat(["..ob..bo..","..oo..oo.."]), GT.concat(["...obbo...","...oooo..."])],
        {o:O,g:PAL[6],r:PAL[2],d:PAL[7],b:PAL[1],y:PAL[4]});

  const BA = ["o....oo....o","oo..oppo..oo","opooprrpoopo","oppppppppppo",".oppoppoppo.","..oo.oo.oo..","............","............"];
  const BB = ["............",".....oo.....","....oppo....","..ooprrpoo..",".oppppppppo.","oppoppppoppo","opo.oppo.opo","oo...oo...oo"];
  build("bat",[BA,BB],{o:O,p:PAL[1],r:PAL[2]});

  const LT = ["...oooooo...","..ollllllo..","..olcllcso..","..osssssso..","oooossssoooo","ollsoddosllo",
              "olssssssssso","osdsssssdsso","oo.osssso.oo","...osddso..."];
  const LA = LT.concat(["..oso..oso..","..ooo..ooo.."]), LB = LT.concat(["...osooso...","...oooooo..."]);
  build("golem",[LA,LB],{o:O,l:PAL[13],s:PAL[14],d:PAL[15],c:PAL[11]});
  build("bossArt",[LA,LB],{o:O,l:PAL[3],s:PAL[2],d:PAL[1],c:PAL[4]});
})();

// ===== Generatore sprite torri 16x16 =====
const TPL_HERO = [
"......OOOO......", ".....OMMMMO.....", "....OMMMMMMO....", "...OMMMMMMMMO...",
"....OSSSSSSO....", "....OSESSESO....", "....OSSSSSSO....", "...OMMOSSOMMO...",
"..OSMMMMMMMMSO..", "..OSOMMmmMMOSO..", "...OOMMmmMMOO...", "....OmmOOmmO....",
"..OOOOOOOOOOOO..", ".OBBBBBBBBBBBBO.", ".ObBbBBbBBbBbbO.", "..OOOOOOOOOOOO.."];
const TPL_CANNON = [
"................", "................", "................", "................",
"....OOOOOOOOOO..", "...OMMMMMMMMMMO.", "..OMMMmmmmmmMMGO", "..OMMmmmmmmmMMGO",
"..OMMMmmmmmmMMO.", "...OmmmmmmmmmO..", "....OMMOOOMMO...", "....OOO...OOO...",
TPL_HERO[12], TPL_HERO[13], TPL_HERO[14], TPL_HERO[15]];

const MUZZLE = { arrow:[14,7], bomb:[15,6], laser:[13,1] };

function generateTowerGrid(color, projectile){
  const mi = nearestPal(color||"#3b5dc9"); const M = HEXD[mi], D = PAL_DARK[mi];
  const isC = projectile==="bomb";
  const g = (isC?TPL_CANNON:TPL_HERO).map(r=>r.split(""));
  const set=(x,y,c)=>{ if(y>=0&&y<16&&x>=0&&x<16) g[y][x]=c; };
  const empty=(x,y,c)=>{ if(g[y] && g[y][x]===".") g[y][x]=c; };
  let W="3", G="4", L="c";
  if(!isC){
    if(projectile==="arrow"){
      [[13,4],[14,5],[14,6],[14,7],[14,8],[14,9],[13,10]].forEach(([x,y])=>set(x,y,"W"));
      [[15,5],[15,6],[15,7],[15,8],[15,9],[14,4],[14,10]].forEach(([x,y])=>empty(x,y,"O"));
      for(let y=5;y<=9;y++) empty(13,y,"c");
    } else if(projectile==="laser"){
      G="b"; L="c";
      set(13,0,"G"); set(12,1,"G"); set(13,1,"L"); set(14,1,"G"); set(13,2,"G");
      [[12,0],[14,0],[11,1],[15,1],[12,2],[14,2],[13,3]].forEach(([x,y])=>empty(x,y,"O"));
    } else {
      if(projectile==="fireball"){W="3";G="2";L="4";}
      else if(projectile==="ice"){W="d";G="a";L="b";}
      else if(projectile==="lightning"){W="e";G="4";L="c";}
      else {W="e";G=M;L=PAL_LIGHT[mi];}
      for(let y=4;y<=11;y++){ set(13,y,"W"); empty(12,y,"O"); empty(14,y,"O"); }
      for(let y=1;y<=3;y++) for(let x=12;x<=14;x++) set(x,y,"G");
      set(13,2,"L");
      for(let x=12;x<=14;x++) empty(x,0,"O");
      for(let y=1;y<=3;y++){ empty(11,y,"O"); empty(15,y,"O"); }
    }
  }
  const skin=(mi===4||mi===3)?"c":"4";
  const map={".":".","O":"0","M":M,"m":D,"S":skin,"E":"0","B":"d","b":"e","W":W,"G":G,"L":L};
  return g.map(r=>r.map(c=>map[c]!==undefined?map[c]:c).join(""));
}

function buildTowerSprites(grid){
  const n = gridToCanvas(grid), f = flipH(n);
  return { n, f, w:silhouette(n,"#fff"), wf:silhouette(f,"#fff") };
}
