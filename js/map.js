"use strict";
// ===== Mappa: griglia 30x17 caselle da 16px =====
const TILE=16, COLS=30, ROWS=17, GW=480, GH=272;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

class GameMap {
  constructor(seed=7){
    this.seed=seed;
    this.wp=[[-1,3],[6,3],[6,12],[13,12],[13,4],[20,4],[20,13],[26,13],[26,7],[28,7]];
    this.tiles=new Uint8Array(COLS*ROWS); // 0 erba, 1 sentiero, 2 albero, 3 castello
    this.pathSet=new Set();
    for(let i=0;i<this.wp.length-1;i++){ let [c,r]=this.wp[i]; const [c2,r2]=this.wp[i+1];
      const sc=Math.sign(c2-c), sr=Math.sign(r2-r);
      while(true){ if(this.inB(c,r)){ this.tiles[r*COLS+c]=1; this.pathSet.add(r*COLS+c); } if(c===c2&&r===r2) break; c+=sc; r+=sr; } }
    for(let r=3;r<=8;r++) for(let c=28;c<30;c++) this.tiles[r*COLS+c]=3;
    this.path=new Path(this.wp.map(([c,r])=>[c*TILE+8,r*TILE+8]));
    const R=mulberry32(seed);
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ if(this.get(c,r)!==0) continue;
      let near=false; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(this.pathSet.has((r+dy)*COLS+(c+dx)) && this.inB(c+dx,r+dy)) near=true;
      if(!near && R()<0.075) this.tiles[r*COLS+c]=2; }
    this.bg=this.render();
  }
  inB(c,r){ return c>=0&&c<COLS&&r>=0&&r<ROWS; }
  get(c,r){ return this.inB(c,r)?this.tiles[r*COLS+c]:255; }
  buildable(c,r){ return this.get(c,r)===0; }
  isPath(c,r){ return !this.inB(c,r) || this.pathSet.has(r*COLS+c); }

  render(){
    const cv=makeCanvas(GW,GH), g=cv.getContext("2d"), R=mulberry32(this.seed+11);
    g.fillStyle=PAL[6]; g.fillRect(0,0,GW,GH);
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if((r+c)%2){ g.fillStyle="rgba(0,0,0,0.035)"; g.fillRect(c*TILE,r*TILE,TILE,TILE); }
    for(let i=0;i<3200;i++){ g.fillStyle=R()<0.5?PAL[5]:PAL[7]; g.fillRect(R()*GW|0,R()*GH|0,1,1); }
    for(let i=0;i<260;i++){ const x=R()*GW|0, y=R()*GH|0; g.fillStyle=R()<0.5?PAL[5]:"#2c8f50"; g.fillRect(x,y,1,2); g.fillRect(x+2,y,1,2); g.fillRect(x+1,y-1,1,2); }
    // sentiero
    const D1="#c48a5a", D2="#9c6640", D3="#e0b07a", DE="#6e4128";
    for(const k of this.pathSet){ const c=k%COLS, r=(k/COLS)|0, x=c*TILE, y=r*TILE;
      g.fillStyle=D1; g.fillRect(x,y,TILE,TILE);
      for(let i=0;i<9;i++){ g.fillStyle=R()<0.55?D2:D3; g.fillRect(x+(R()*15|0),y+(R()*15|0),R()<0.3?2:1,1); }
      if(R()<0.35){ const px=x+2+(R()*11|0), py=y+2+(R()*11|0); g.fillStyle=PAL[14]; g.fillRect(px,py,2,2); g.fillStyle=PAL[13]; g.fillRect(px,py,1,1); } }
    for(const k of this.pathSet){ const c=k%COLS, r=(k/COLS)|0, x=c*TILE, y=r*TILE;
      if(!this.isPath(c,r-1)){ g.fillStyle=DE; g.fillRect(x,y,TILE,1); g.fillStyle=D2; g.fillRect(x,y+1,TILE,1); }
      if(!this.isPath(c,r+1)){ g.fillStyle=D3; g.fillRect(x,y+TILE-2,TILE,1); g.fillStyle=DE; g.fillRect(x,y+TILE-1,TILE,1); }
      if(!this.isPath(c-1,r)){ g.fillStyle=DE; g.fillRect(x,y,1,TILE); g.fillStyle=D2; g.fillRect(x+1,y,1,TILE); }
      if(!this.isPath(c+1,r)){ g.fillStyle=D2; g.fillRect(x+TILE-2,y,1,TILE); g.fillStyle=DE; g.fillRect(x+TILE-1,y,1,TILE); } }
    // decorazioni
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ if(this.get(c,r)!==0) continue; const x=c*TILE, y=r*TILE, q=R();
      if(q<0.16){ const n=1+(R()*3|0); for(let i=0;i<n;i++){ const fx=x+2+(R()*12|0), fy=y+3+(R()*10|0);
          g.fillStyle=PAL[7]; g.fillRect(fx,fy+1,1,2); g.fillStyle=[PAL[2],PAL[4],PAL[12],PAL[10],PAL[3]][R()*5|0];
          g.fillRect(fx-1,fy,3,1); g.fillRect(fx,fy-1,1,3); g.fillStyle=PAL[4]; g.fillRect(fx,fy,1,1); } }
      else if(q<0.22){ const rx=x+3+(R()*8|0), ry=y+4+(R()*8|0); g.fillStyle="rgba(0,0,0,.25)"; g.fillRect(rx,ry+3,5,1);
        g.fillStyle=PAL[0]; g.fillRect(rx,ry,5,3); g.fillRect(rx+1,ry-1,3,1); g.fillStyle=PAL[14]; g.fillRect(rx+1,ry,3,2); g.fillStyle=PAL[13]; g.fillRect(rx+1,ry,2,1); }
      else if(q<0.25){ const mx=x+5+(R()*6|0), my=y+5+(R()*6|0); g.fillStyle=PAL[12]; g.fillRect(mx,my+2,2,2); g.fillStyle=PAL[2]; g.fillRect(mx-1,my,4,2); g.fillStyle=PAL[12]; g.fillRect(mx,my,1,1); } }
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(this.get(c,r)===2) this.drawTree(g,c*TILE,r*TILE,R);
    this.drawCastle(g);
    return cv;
  }
  drawTree(g,px,py,R){
    g.fillStyle="rgba(0,0,0,0.25)"; g.fillRect(px+3,py+14,11,2); g.fillRect(px+5,py+16,7,1);
    g.fillStyle=PAL[0]; g.fillRect(px+6,py+10,4,6); g.fillStyle="#7a4a2e"; g.fillRect(px+7,py+11,2,4);
    const cx=px+8, cy=py+5, rad=6.6;
    for(let y=-7;y<=7;y++) for(let x=-7;x<=7;x++){ const d=Math.hypot(x,y); if(d>rad) continue;
      let col; if(d>rad-1) col=PAL[0]; else { const l=(-x-y)/7+(R()-0.5)*0.5; col=l>0.45?PAL[5]:l>-0.35?PAL[6]:PAL[7]; }
      g.fillStyle=col; g.fillRect(cx+x,cy+y,1,1); }
    if(R()<0.4){ g.fillStyle=PAL[2]; g.fillRect(cx-2,cy+1,1,1); g.fillRect(cx+2,cy-2,1,1); g.fillRect(cx+1,cy+3,1,1); }
  }
  drawCastle(g){
    const x=448, y=72;
    const box=(bx,by,w,h,fill)=>{ g.fillStyle=PAL[0]; g.fillRect(bx-1,by-1,w+2,h+2); g.fillStyle=fill; g.fillRect(bx,by,w,h); };
    const bricks=(bx,by,w,h)=>{ g.fillStyle=PAL[14]; for(let r=0;r*4<h;r++){ g.fillRect(bx,by+r*4+3,w,1); for(let c=(r%2)*3;c<w;c+=6) g.fillRect(bx+c,by+r*4,1,3); }
      g.fillStyle=PAL[12]; g.fillRect(bx,by,w,1); };
    g.fillStyle="rgba(0,0,0,.28)"; g.fillRect(x,y+71,32,3);
    box(x+2,y+28,29,42,PAL[13]); bricks(x+2,y+28,29,42);
    for(let i=0;i<5;i++) box(x+2+i*6,y+23,4,5,PAL[13]);
    box(x+9,y+8,15,21,PAL[13]); bricks(x+9,y+8,15,21);
    for(let k=0;k<=11;k++){ const w=Math.round(1+k*1.45), cx=x+16; g.fillStyle=PAL[0]; g.fillRect(cx-w-1,y-4+k,w*2+3,1);
      g.fillStyle=PAL[2]; g.fillRect(cx-w,y-4+k,w*2+1,1); g.fillStyle=PAL[3]; g.fillRect(cx-w,y-4+k,Math.max(1,w-1),1); }
    g.fillStyle=PAL[0]; g.fillRect(x+14,y+13,5,7); g.fillStyle=PAL[4]; g.fillRect(x+15,y+14,3,5); g.fillStyle=PAL[3]; g.fillRect(x+15,y+17,3,2);
    g.fillStyle=PAL[0]; g.fillRect(x+22,y+34,4,6); g.fillStyle=PAL[4]; g.fillRect(x+23,y+35,2,4);
    // porta
    g.fillStyle=PAL[0]; g.fillRect(x+2,y+40,11,17); g.fillStyle=PAL[15]; g.fillRect(x+3,y+42,9,15);
    g.fillStyle=PAL[0]; for(let i=0;i<3;i++) g.fillRect(x+5+i*3,y+43,1,14); g.fillStyle=PAL[13]; g.fillRect(x+2,y+40,1,1); g.fillRect(x+12,y+40,1,1);
    g.fillStyle=PAL[4]; g.fillRect(x+10,y+50,1,1);
    // torcia
    g.fillStyle=PAL[0]; g.fillRect(x+14,y+42,3,6); g.fillStyle="#7a4a2e"; g.fillRect(x+15,y+43,1,4);
  }
}
