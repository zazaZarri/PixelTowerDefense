"use strict";
// ===== Palette (Sweetie 16) + helper grafici pixel =====
const PAL = ["#1a1c2c","#5d275d","#b13e53","#ef7d57","#ffcd75","#a7f070","#38b764","#257179",
             "#29366f","#3b5dc9","#41a6f6","#73eff7","#f4f4f4","#94b0c2","#566c86","#333c57"];
const HEXD = "0123456789abcdef";
const PAL_DARK  = "00123678089adef0";
const PAL_LIGHT = "f234cc569abcccde";

function hexToRgb(h){ h = String(h).replace("#",""); if(h.length===3) h=h.split("").map(c=>c+c).join("");
  const n = parseInt(h,16)||0; return [(n>>16)&255,(n>>8)&255,n&255]; }
function nearestPal(hex){ const [r,g,b]=hexToRgb(hex); let best=9, bd=1e12;
  for(let i=1;i<16;i++){ const [r2,g2,b2]=hexToRgb(PAL[i]); const d=(r-r2)**2*0.3+(g-g2)**2*0.59+(b-b2)**2*0.11; if(d<bd){bd=d;best=i;} }
  return best; }

function makeCanvas(w,h){ const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").imageSmoothingEnabled=false; return c; }
function spriteFromRows(rows,map){ const h=rows.length, w=rows[0].length; const c=makeCanvas(w,h), g=c.getContext("2d");
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const col=map[rows[y][x]]; if(col){ g.fillStyle=col; g.fillRect(x,y,1,1);} }
  return c; }
const HEX_MAP = {}; for(let i=0;i<16;i++) HEX_MAP[HEXD[i]] = PAL[i];
function gridToCanvas(grid){ return spriteFromRows(grid, HEX_MAP); }
function silhouette(src,color){ const c=makeCanvas(src.width,src.height), g=c.getContext("2d");
  g.drawImage(src,0,0); g.globalCompositeOperation="source-in"; g.fillStyle=color; g.fillRect(0,0,c.width,c.height); return c; }
function flipH(src){ const c=makeCanvas(src.width,src.height), g=c.getContext("2d"); g.translate(src.width,0); g.scale(-1,1); g.drawImage(src,0,0); return c; }

// ===== Primitive pixel =====
function pline(ctx,x0,y0,x1,y1,w=1){ const dx=x1-x0, dy=y1-y0; const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)))); const o=(w/2)|0;
  for(let i=0;i<=n;i++) ctx.fillRect(Math.round(x0+dx*i/n)-o, Math.round(y0+dy*i/n)-o, w, w); }
function pcircle(ctx,x,y,r,t=1){ const n=Math.max(8,Math.ceil(r*6.3));
  for(let i=0;i<n;i++){ const a=i/n*6.2832; ctx.fillRect(Math.round(x+Math.cos(a)*r), Math.round(y+Math.sin(a)*r), t, t);} }
function pdisc(ctx,x,y,r){ x=Math.round(x); y=Math.round(y); r=Math.max(0,Math.round(r));
  for(let dy=-r;dy<=r;dy++){ const w=Math.round(Math.sqrt(r*r-dy*dy)); ctx.fillRect(x-w,y+dy,w*2+1,1);} }

// ===== Font bitmap 3x5 =====
const FONT = {
"0":[7,5,5,5,7],"1":[2,6,2,2,7],"2":[7,1,7,4,7],"3":[7,1,7,1,7],"4":[5,5,7,1,1],"5":[7,4,7,1,7],"6":[7,4,7,5,7],
"7":[7,1,2,2,2],"8":[7,5,7,5,7],"9":[7,5,7,1,7],"A":[2,5,7,5,5],"B":[6,5,6,5,6],"C":[3,4,4,4,3],"D":[6,5,5,5,6],
"E":[7,4,6,4,7],"F":[7,4,6,4,4],"G":[3,4,5,5,3],"H":[5,5,7,5,5],"I":[7,2,2,2,7],"J":[1,1,1,5,2],"K":[5,5,6,5,5],
"L":[4,4,4,4,7],"M":[5,7,7,5,5],"N":[6,5,5,5,5],"O":[2,5,5,5,2],"P":[6,5,6,4,4],"Q":[2,5,5,6,3],"R":[6,5,6,5,5],
"S":[3,4,2,1,6],"T":[7,2,2,2,2],"U":[5,5,5,5,7],"V":[5,5,5,5,2],"W":[5,5,7,7,5],"X":[5,5,2,5,5],"Y":[5,5,2,2,2],
"Z":[7,1,2,4,7],"+":[0,2,7,2,0],"-":[0,0,7,0,0],"!":[2,2,2,0,2],"?":[7,1,2,0,2]," ":[0,0,0,0,0],"$":[3,6,2,3,6],
".":[0,0,0,0,2],":":[0,2,0,2,0],"/":[1,1,2,4,4],"x":[0,5,2,5,0],"%":[5,1,2,4,5],"'":[2,2,0,0,0]
};
function textWidth(str,s=1){ return String(str).length*4*s - s; }
function _glyphs(ctx,str,x,y,s){ for(let i=0;i<str.length;i++){ const g=FONT[str[i]]||FONT[" "];
  for(let r=0;r<5;r++){ const b=g[r]; if(!b) continue; for(let c=0;c<3;c++) if(b&(4>>c)) ctx.fillRect(x+i*4*s+c*s, y+r*s, s, s);} } }
function drawText(ctx,str,x,y,color,s=1,outline=PAL[0],align="left"){
  str = String(str).toUpperCase().replace(/[ÀÁ]/g,"A").replace(/[ÈÉ]/g,"E").replace(/[ÌÍ]/g,"I").replace(/[ÒÓ]/g,"O").replace(/[ÙÚ]/g,"U");
  if(align==="center") x -= Math.floor(textWidth(str,s)/2); else if(align==="right") x -= textWidth(str,s);
  x=Math.round(x); y=Math.round(y);
  if(outline){ ctx.fillStyle=outline; for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]]) _glyphs(ctx,str,x+ox*s,y+oy*s,s); }
  ctx.fillStyle=color; _glyphs(ctx,str,x,y,s);
}
const rand=(a,b)=>a+Math.random()*(b-a);
const lerp=(a,b,k)=>a+(b-a)*k;
