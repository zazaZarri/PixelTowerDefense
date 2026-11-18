"use strict";
// ===== Percorso =====
class Path {
  constructor(pts, loop=false){ this.pts=pts; this.loop=loop; this.segs=[]; let L=0;
    for(let i=0;i<pts.length-1;i++){ const [ax,ay]=pts[i],[bx,by]=pts[i+1]; const len=Math.hypot(bx-ax,by-ay)||1;
      this.segs.push({ax,ay,bx,by,len,s:L,dx:(bx-ax)/len,dy:(by-ay)/len}); L+=len; }
    this.length=L; }
  posAt(d){ if(this.loop) d=((d%this.length)+this.length)%this.length; const S=this.segs;
    if(d<=0){ const s=S[0]; return {x:s.ax+s.dx*d,y:s.ay+s.dy*d,dx:s.dx,dy:s.dy}; }
    for(const s of S) if(d<=s.s+s.len){ const k=d-s.s; return {x:s.ax+s.dx*k,y:s.ay+s.dy*k,dx:s.dx,dy:s.dy}; }
    const s=S[S.length-1]; return {x:s.bx,y:s.by,dx:s.dx,dy:s.dy}; }
}

// ===== Nemico =====
class Enemy {
  constructor(world,type,hpMult=1,spdMult=1){
    const T=ENEMY_TYPES[type]; this.world=world; this.type=type; this.T=T; this.art=ENEMY_ART[T.art||type];
    this.maxHp=Math.max(1,Math.round(T.hp*hpMult)); this.hp=this.maxHp; this.speed=T.speed*spdMult*rand(0.94,1.06);
    this.gold=T.gold; this.armor=T.armor; this.r=T.radius; this.fly=!!T.fly; this.boss=!!T.boss; this.scale=T.scale||1;
    this.dist=0; this.slowT=0; this.slowA=0; this.flash=0; this.anim=Math.random()*4; this.face=1;
    this.dead=false; this.reached=false; this.offset=rand(-3,3); this.updatePos();
  }
  get curSpeed(){ return this.speed*(this.slowT>0?1-this.slowA:1); }
  updatePos(){ const p=this.world.path.posAt(this.dist);
    this.x=p.x-p.dy*this.offset; this.y=p.y+p.dx*this.offset;
    if(p.dx<-0.3) this.face=-1; else if(p.dx>0.3) this.face=1;
    const h=this.art.h*this.scale; const bob=this.fly?Math.sin(this.anim*1.5)*2:0;
    this.bottom=this.fly?this.y-6+bob:this.y+4; this.hx=this.x; this.hy=this.bottom-h/2; }
  update(dt){
    const fx=this.world.fx;
    if(this.slowT>0){ this.slowT-=dt; if(Math.random()<dt*10) fx.part({x:this.x+rand(-4,4),y:this.hy+rand(-4,4),vy:-8,life:0.5,colors:[PAL[12],PAL[11],PAL[10]],drag:1,add:true}); }
    const sp=this.curSpeed; this.dist+=sp*dt; this.anim+=dt*Math.max(3,sp/9); this.flash-=dt;
    this.updatePos();
    if(!this.world.path.loop && this.dist>=this.world.path.length) this.reached=true;
  }
  hit(dmg,crit){
    if(this.dead) return 0;
    const d=Math.max(1,Math.round(dmg-this.armor)); this.hp-=d; this.flash=0.07;
    if(this.world.showDmg) this.world.fx.text(this.x+rand(-3,3),this.hy-8,crit?d+"!":String(d),crit?PAL[4]:PAL[12],crit?2:1,crit?0.9:0.6);
    if(this.hp<=0) this.die();
    return d;
  }
  die(){
    this.dead=true; const fx=this.world.fx, c=this.T.colors;
    fx.burst(this.x,this.hy,this.boss?70:16,c,this.boss?130:70,{life:0.6,grav:140,drag:1.5,size:this.boss?2:1,up:-30});
    fx.burst(this.x,this.hy,this.boss?20:6,["#ffffff",c[0]],50,{life:0.25,add:true});
    fx.smoke(this.x,this.hy,this.boss?14:4,this.boss?2:1);
    fx.ring(this.x,this.hy,this.boss?34:10,"#f4f4f4",0.25);
    if(this.boss){ fx.explosion(this.x,this.hy,34,PAL[3]); fx.shake=Math.min(8,fx.shake+6); }
    this.world.snd(this.boss?"bossdie":"death");
    this.world.onKill(this);
  }
  draw(ctx){
    const A=this.art, fi=Math.floor(this.anim)%A.n.length, w=A.w*this.scale, h=A.h*this.scale;
    const left=Math.round(this.x-w/2), top=Math.round(this.bottom-h);
    const sw=Math.round(w*(this.fly?0.5:0.8)), sx=Math.round(this.x-sw/2), sy=Math.round(this.y+2);
    ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.fillRect(sx+1,sy,sw-2,1); ctx.fillRect(sx,sy+1,sw,1); ctx.fillRect(sx+1,sy+2,sw-2,1);
    const F=this.face<0;
    ctx.drawImage((F?A.f:A.n)[fi],left,top,w,h);
    if(this.slowT>0){ ctx.globalAlpha=0.5; ctx.drawImage((F?A.if:A.in)[fi],left,top,w,h); ctx.globalAlpha=1; }
    if(this.flash>0) ctx.drawImage((F?A.wf:A.wn)[fi],left,top,w,h);
    if(this.boss){ ctx.fillStyle=PAL[0]; ctx.fillRect(this.x-6,top-5,13,5); ctx.fillStyle=PAL[4];
      ctx.fillRect(this.x-5,top-2,11,2); ctx.fillRect(this.x-5,top-4,1,2); ctx.fillRect(this.x,top-4,1,2); ctx.fillRect(this.x+5,top-4,1,2);
      ctx.fillStyle=PAL[2]; ctx.fillRect(this.x,top-2,1,1); }
    if(this.hp<this.maxHp){ const bw=this.boss?26:10, r=Math.max(0,this.hp/this.maxHp), bx=Math.round(this.x-bw/2), by=top-(this.boss?8:4);
      ctx.fillStyle=PAL[0]; ctx.fillRect(bx-1,by-1,bw+2,4); ctx.fillStyle=PAL[15]; ctx.fillRect(bx,by,bw,2);
      ctx.fillStyle=r>0.5?PAL[5]:r>0.25?PAL[4]:PAL[2]; ctx.fillRect(bx,by,Math.max(1,Math.round(bw*r)),2); }
  }
}

// ===== Proiettile (built-in o arma personalizzata) =====
class Projectile {
  constructor(world,tower,target,st,crit,angOff=0,wp=null){
    this.world=world; this.tower=tower; this.st=st; this.crit=crit; this.type=st.projectile; this.target=target; this.wp=wp;
    this.x=tower.mx; this.y=tower.my; this.hitSet=new Set(); this.pierce=Math.max(1,Math.round(st.pierce)); this.age=0; this.dead=false;
    this.color=st.vfxColor; let sp=st.projectileSpeed; this.rot=0; this.hist=[];
    let motion=this.type==="bomb"?"lob":"homing";
    if(wp){ const ws=this.ws=wp.stats; sp*=ws.speedMult; motion=ws.motion; this.color=ws.trailColor; this.size=ws.size;
      this.hr=ws.hitRadius>0?ws.hitRadius:Math.max(2,Math.max(wp.cv.width,wp.cv.height)*ws.size/2-1); }
    this.sp=sp; this.motion=motion;
    if(motion==="lob"||motion==="rain"){
      this.arc=true; let px=target.x, py=target.y, T=0.3; const fall=motion==="rain";
      for(let i=0;i<2;i++){ T=fall?Math.max(0.35,150/sp):Math.max(0.3,Math.hypot(px-this.x,py-this.y)/sp); const p=world.path.posAt(target.dist+target.curSpeed*T); px=p.x; py=p.y; }
      this.tx=px; this.ty=py; this.T=T; this.t=0;
      if(fall){ this.sx=px-40+rand(-8,8); this.sy=py-160; this.h=0; } else { this.sx=this.x; this.sy=this.y; this.h=Math.max(14,Math.hypot(px-this.sx,py-this.sy)*0.4)*(wp?this.ws.lobHeight:1); }
      this.gy=this.sy;
    } else {
      const a=Math.atan2(target.hy-this.y,target.hx-this.x)+angOff; this.vx=Math.cos(a)*sp; this.vy=Math.sin(a)*sp; this.ang=a;
      this.homing=angOff===0 && (motion==="homing"||motion==="wave"); this.bx=this.x; this.by=this.y;
      if(motion==="boomerang"){ this.out=true; this.travel=0; this.maxTravel=st.range*1.1; }
    }
  }
  update(dt){
    this.age+=dt; const W=this.world, fx=W.fx, px0=this.x, py0=this.y;
    if(this.ws) this.rot+=this.ws.spin*dt*Math.PI/180;
    if(this.arc){
      this.t+=dt; const k=Math.min(1,this.t/this.T); this.x=lerp(this.sx,this.tx,k); this.gy=lerp(this.sy,this.ty,k);
      this.y=this.motion==="rain"?this.gy:this.gy-Math.sin(k*Math.PI)*this.h; this.ang=Math.atan2(this.y-py0,this.x-px0);
      if(this.ws) this.emitTrail(dt);
      else if(Math.random()<0.7) fx.part({x:this.x,y:this.y-2,vx:rand(-8,8),vy:rand(-10,0),life:0.35,colors:[PAL[4],PAL[3],PAL[14]],add:Math.random()<0.5,drag:2});
      if(k>=1){ this.land(this.x,this.motion==="rain"?this.ty:this.gy); this.dead=true; }
      return;
    }
    const t=this.target;
    if(this.motion==="boomerang"){
      if(this.out){ this.travel+=this.sp*dt; if(this.travel>=this.maxTravel){ this.out=false; this.hitSet.clear(); } }
      else { const dx=this.tower.mx-this.bx, dy=this.tower.my-this.by, d=Math.hypot(dx,dy); if(d<6||this.age>6){ this.dead=true; return; }
        this.vx=dx/d*this.sp; this.vy=dy/d*this.sp; }
    } else if(this.homing && t && !t.dead){ const a=Math.atan2(t.hy-this.by,t.hx-this.bx); this.vx=Math.cos(a)*this.sp; this.vy=Math.sin(a)*this.sp; }
    else this.homing=false;
    this.bx+=this.vx*dt; this.by+=this.vy*dt; this.ang=Math.atan2(this.vy,this.vx);
    if(this.motion==="wave"){ const o=Math.sin(this.age*14)*5*(this.size||1); this.x=this.bx-Math.sin(this.ang)*o; this.y=this.by+Math.cos(this.ang)*o; }
    else { this.x=this.bx; this.y=this.by; }
    if(this.ws) this.emitTrail(dt);
    else if(this.type==="fireball"){ fx.part({x:this.x+rand(-1,1),y:this.y+rand(-1,1),vx:rand(-6,6),vy:rand(-14,-2),life:rand(0.2,0.45),colors:["#ffffff",PAL[4],this.color,PAL[2],PAL[15]],size:2,add:true,drag:2,shrink:true}); }
    else if(this.type==="ice"){ if(Math.random()<0.7) fx.part({x:this.x,y:this.y,vx:rand(-10,10),vy:rand(-10,10),life:0.3,colors:["#ffffff",PAL[11],this.color],add:true,drag:3}); }
    else if(Math.random()<0.4) fx.part({x:this.x,y:this.y,life:0.15,colors:[this.color],drag:0,add:true});
    const hr=this.hr||2;
    for(const e of W.enemies){ if(e.dead||this.hitSet.has(e)) continue;
      const dx=e.hx-this.x, dy=e.hy-this.y, rr=e.r*e.scale+hr; if(dx*dx+dy*dy<rr*rr){ this.onHit(e); if(this.dead) break; } }
    if(this.motion!=="boomerang" && (this.age>3 || this.x<-30||this.x>W.w+30||this.y<-30||this.y>W.h+30)) this.dead=true;
  }
  emitTrail(dt){ const ws=this.ws; if(ws.trail==="ghost"){ this.hist.push([this.x,this.y,this.drawAng()]); if(this.hist.length>6) this.hist.shift(); }
    else if(ws.trail!=="none") this.world.fx.trail(ws.trail,this.x,this.y,ws.trailColor,ws.size,ws.trailAmount,dt); }
  impactFx(x,y,area){ const W=this.world, fx=W.fx;
    if(this.ws){ const ws=this.ws; fx.hitFx(ws.hitEffect,x,y,ws.hitColor,ws.hitSize*(area?Math.max(1,area/10):1)*Math.max(0.6,ws.size));
      if(area) fx.ring(x,y,area,ws.hitColor,0.3,1); if(ws.shake) fx.shake=Math.min(8,fx.shake+ws.shake); W.snd(ws.hitSound); return; }
    if(this.type==="ice"){ if(area){ fx.flash(x,y,area,PAL[11],0.12); fx.ring(x,y,area,PAL[11],0.35,2); fx.burst(x,y,Math.round(area*1.2),["#ffffff",PAL[11],PAL[10],PAL[9]],area*4,{life:0.5,grav:60,add:true}); }
      else { fx.burst(x,y,8,["#ffffff",PAL[11],PAL[10]],50,{life:0.4,grav:80}); fx.ring(x,y,6,PAL[11],0.2); } W.snd("crack"); }
    else if(area){ fx.explosion(x,y,area,this.color); W.snd("boom",this.type==="bomb"?1:0.6); }
    else if(this.type==="fireball"){ fx.burst(x,y,10,["#ffffff",PAL[4],this.color,PAL[2]],60,{add:true,life:0.35}); fx.smoke(x,y,2); W.snd("hit"); }
    else { fx.burst(x,y,5,["#ffffff",this.color],45,{life:0.2,add:true}); W.snd("hit"); } }
  onHit(e){
    const W=this.world; this.hitSet.add(e);
    if(this.st.splash>0 && this.motion!=="boomerang"){ this.explode(e.hx,e.hy); this.dead=true; return; }
    W.applyHit(e,this.st,this.crit,1,this.tower); this.impactFx(e.hx,e.hy,0);
    if(this.motion==="boomerang") return;
    this.pierce--; if(this.pierce<=0) this.dead=true; else this.homing=false;
  }
  land(x,y){ const r=this.st.splash>0?this.st.splash:(this.ws?Math.max(8,this.hr+2):10); this.explode(x,y,r); }
  explode(x,y,r){ const W=this.world, st=this.st; r=r||(st.splash>0?st.splash:10);
    this.impactFx(x,y,r);
    for(const e of W.enemies){ if(e.dead) continue; const dx=e.hx-x, dy=e.hy-y, rr=r+e.r*e.scale; if(dx*dx+dy*dy<=rr*rr) W.applyHit(e,st,this.crit,1,this.tower); } }
  drawAng(){ const ws=this.ws; let a=(ws.rotate?this.ang||0:0)+this.rot; const q=Math.PI/8; return Math.round(a/q)*q; }
  draw(ctx){
    const x=Math.round(this.x), y=Math.round(this.y);
    if(this.wp){ const cv=this.wp.cv, s=this.size, w=Math.max(1,Math.round(cv.width*s)), h=Math.max(1,Math.round(cv.height*s)), ws=this.ws;
      if(this.arc){ const gy=Math.round(this.motion==="rain"?this.ty:this.gy), k=this.motion==="rain"?Math.min(1,this.t/this.T):1; const sw=Math.max(2,Math.round(w*0.7*(0.4+0.6*k)));
        ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fillRect(Math.round(this.x-sw/2),gy+2,sw,2); }
      if(ws.glow){ ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.35+Math.random()*0.1; ctx.fillStyle=ws.glowColor; pdisc(ctx,x,y,Math.max(w,h)/2+2); ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over"; }
      for(let i=0;i<this.hist.length;i++){ const [hx,hy,ha]=this.hist[i]; ctx.globalAlpha=(i+1)/this.hist.length*0.35; ctx.save(); ctx.translate(Math.round(hx),Math.round(hy)); ctx.rotate(ha); ctx.drawImage(cv,-w/2|0,-h/2|0,w,h); ctx.restore(); }
      ctx.globalAlpha=1; ctx.save(); ctx.translate(x,y); const a=this.drawAng(); if(a) ctx.rotate(a); ctx.drawImage(cv,-(w/2)|0,-(h/2)|0,w,h); ctx.restore(); return; }
    switch(this.type){
      case "bomb": { ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fillRect(x-2,Math.round(this.gy)+2,5,2);
        ctx.fillStyle=PAL[0]; ctx.fillRect(x-2,y-1,5,3); ctx.fillRect(x-1,y-2,3,5); ctx.fillStyle=PAL[15]; ctx.fillRect(x-1,y-1,3,3);
        ctx.fillStyle=PAL[14]; ctx.fillRect(x-1,y-1,1,1); ctx.fillStyle=PAL[4]; ctx.fillRect(x+1,y-3,1,1); break; }
      case "fireball": ctx.fillStyle=this.color; pdisc(ctx,x,y,2); ctx.fillStyle=PAL[4]; ctx.fillRect(x-1,y-1,2,2); ctx.fillStyle="#fff"; ctx.fillRect(x,y,1,1); break;
      case "ice": ctx.fillStyle=PAL[10]; ctx.fillRect(x-1,y-2,2,5); ctx.fillRect(x-2,y-1,4,2); ctx.fillStyle="#fff"; ctx.fillRect(x-1,y-1,1,2); break;
      case "arrow": { const c=Math.cos(this.ang), s=Math.sin(this.ang);
        ctx.fillStyle=PAL[3]; pline(ctx,x-c*5,y-s*5,x,y,1); ctx.fillStyle=PAL[12]; ctx.fillRect(Math.round(x-c*6),Math.round(y-s*6),1,1);
        ctx.fillStyle=this.color; ctx.fillRect(x,y,1,1); ctx.fillRect(Math.round(x-c),Math.round(y-s),1,1); break; }
      default: ctx.fillStyle=this.color; ctx.fillRect(x-1,y-1,3,3); ctx.fillStyle="#fff"; ctx.fillRect(x,y,1,1);
    }
  }
}

// ===== Torre (personaggio) =====
const TARGET_MODES=["first","last","strong","close"];
const TARGET_LABEL={first:"PRIMO",last:"ULTIMO",strong:"PIU FORTE",close:"VICINO"};
class Tower {
  constructor(world,def,x,y){
    this.world=world; this.def=def; this.base=def.stats; this.spr=def.spr; this.x=x; this.y=y;
    this.level=1; this.cd=0.3; this.recoil=0; this.flash=0; this.face=1; this.phase=Math.random()*6;
    this.kills=0; this.dmgDone=0; this.spent=this.base.cost; this.targeting=TARGET_MODES.includes(this.base.targeting)?this.base.targeting:"first";
    this.st=this.compute(); this.drop=world.preview?0:0.28; this.landed=world.preview;
    const m=MUZZLE[this.base.projectile]||[13,2]; this.muz=m;
  }
  compute(){ const b=this.base, L=this.level-1;
    return Object.assign({},b,{ damage:b.damage*Math.pow(b.upgradeMult,L), firerate:b.firerate*(1+0.12*L),
      range:b.range*(1+0.07*L), splash:b.splash*(1+0.06*L), chain:b.chain>0?b.chain+Math.floor(L/2):0 }); }
  get upgradePrice(){ return Math.round(this.base.upgradeCost*this.level); }
  get canUpgrade(){ return this.level<this.base.maxLevel; }
  upgrade(){ this.level++; this.st=this.compute(); const fx=this.world.fx;
    fx.ring(this.x,this.y,12,PAL[4],0.4,1); fx.ring(this.x,this.y,this.st.range,PAL[4],0.5,1);
    for(let i=0;i<22;i++) fx.part({x:this.x+rand(-7,7),y:this.y+rand(-2,8),vy:rand(-50,-20),life:rand(0.5,0.9),colors:["#ffffff",PAL[4],PAL[3]],add:true,drag:1.5,blink:Math.random()<0.5});
    fx.text(this.x,this.y-18,"LV "+this.level,PAL[4],1,1); this.world.snd("upgrade"); }
  get left(){ return Math.round(this.x-8); } get top(){ return Math.round(this.y-11); }
  get mx(){ return this.left+(this.face>0?this.muz[0]:15-this.muz[0]); }
  get my(){ return this.top+this.muz[1]; }
  findTarget(){ const r2=this.st.range*this.st.range; let best=null, bv=-Infinity;
    for(const e of this.world.enemies){ if(e.dead) continue; const dx=e.hx-this.x, dy=e.hy-this.y, d2=dx*dx+dy*dy; if(d2>r2) continue;
      let v; switch(this.targeting){ case "last": v=-e.dist; break; case "strong": v=e.hp; break; case "close": v=-d2; break; default: v=e.dist; }
      if(v>bv){ bv=v; best=e; } }
    return best; }
  update(dt){
    this.cd-=dt; this.recoil=Math.max(0,this.recoil-dt*8); this.flash-=dt; this.phase+=dt;
    if(!this.landed){ this.drop-=dt; if(this.drop<=0){ this.landed=true; const fx=this.world.fx;
      fx.burst(this.x,this.y+6,14,[PAL[13],PAL[14]],50,{life:0.4,drag:4}); fx.smoke(this.x,this.y+5,5); fx.ring(this.x,this.y+5,11,"#ffffff",0.25); fx.shake=Math.max(fx.shake,1.5); this.world.snd("place"); } return; }
    const t=this.findTarget(); this.target=t;
    if(t){ this.face=t.hx<this.x-1?-1:(t.hx>this.x+1?1:this.face); if(this.cd<=0){ this.fire(t); this.cd=1/Math.max(0.05,this.st.firerate); } }
  }
  fire(t){
    const st=this.st, W=this.world, fx=W.fx; this.recoil=1; this.flash=0.05;
    const crit=Math.random()<st.critChance; const n=Math.max(1,Math.round(st.shotCount));
    const wp=this.wpOverride||(st.weapon?Weapons.get(st.weapon):null);
    if(wp){ const ws=wp.stats; for(let i=0;i<n;i++){ const off=n>1?(i-(n-1)/2)*st.spread*Math.PI/180:0; W.proj.push(new Projectile(W,this,t,st,crit,off,wp)); }
      W.snd(ws.shootSound); const m=ws.muzzle, mx=this.mx, my=this.my;
      if(m==="spark") fx.burst(mx,my,4,["#ffffff",ws.trailColor],35,{life:0.18,add:true});
      else if(m==="smoke") fx.smoke(mx,my,3);
      else if(m==="magic"){ fx.ring(mx,my,5,ws.trailColor,0.2); fx.burst(mx,my,6,["#ffffff",ws.trailColor],30,{life:0.3,add:true}); }
      else if(m==="fire") fx.burst(mx,my,8,["#ffffff",PAL[4],PAL[3],PAL[2]],45,{life:0.25,add:true,up:-20});
      return; }
    W.snd(TYPE_SHOOT[st.projectile],st.projectile==="bomb"?1:0.8);
    if(st.projectile==="lightning") this.zap(t,crit);
    else if(st.projectile==="laser") this.laser(t,crit);
    else for(let i=0;i<n;i++){ const off=n>1?(i-(n-1)/2)*st.spread*Math.PI/180:0; W.proj.push(new Projectile(W,this,t,st,crit,off)); }
    fx.burst(this.mx,this.my,st.projectile==="bomb"?10:4,["#ffffff",st.vfxColor],st.projectile==="bomb"?60:35,{life:0.18,add:true});
    if(st.projectile==="bomb"){ fx.smoke(this.mx,this.my,3); fx.shake=Math.max(fx.shake,1); }
    fx.flash(this.mx,this.my,2,st.vfxColor,0.05);
  }
  zap(t,crit){ const st=this.st, W=this.world, fx=W.fx; let cur=t, fx0=this.mx, fy0=this.my, mult=1; const hit=new Set();
    for(let k=0;k<=st.chain && cur;k++){
      W.applyHit(cur,st,crit,mult,this); hit.add(cur);
      fx.lightning(fx0,fy0,cur.hx,cur.hy,st.vfxColor); fx.burst(cur.hx,cur.hy,6,["#ffffff",st.vfxColor],55,{add:true,life:0.22});
      fx.flash(cur.hx,cur.hy,4,st.vfxColor,0.08);
      if(st.splash>0) { fx.ring(cur.hx,cur.hy,st.splash,st.vfxColor,0.25); for(const e of W.enemies) if(!e.dead && e!==cur && Math.hypot(e.hx-cur.hx,e.hy-cur.hy)<st.splash) W.applyHit(e,st,crit,mult*0.5,this); }
      fx0=cur.hx; fy0=cur.hy; mult*=0.8; let nx=null, nd=48*48;
      for(const e of W.enemies){ if(e.dead||hit.has(e)) continue; const d=(e.hx-fx0)**2+(e.hy-fy0)**2; if(d<nd){nd=d;nx=e;} }
      cur=nx; } }
  laser(t,crit){ const st=this.st, W=this.world, fx=W.fx, ax=this.mx, ay=this.my;
    const a=Math.atan2(t.hy-ay,t.hx-ax), ux=Math.cos(a), uy=Math.sin(a); const P=Math.max(1,Math.round(st.pierce));
    let targets=[t], ex=t.hx, ey=t.hy;
    if(P>1){ const L=st.range*1.15; targets=[];
      for(const e of W.enemies){ if(e.dead) continue; const dx=e.hx-ax, dy=e.hy-ay, tt=dx*ux+dy*uy; if(tt<0||tt>L) continue;
        if(Math.abs(dx*uy-dy*ux)<e.r*e.scale+2) targets.push([tt,e]); }
      targets.sort((p,q)=>p[0]-q[0]); targets=targets.slice(0,P).map(p=>p[1]); if(!targets.length) targets=[t];
      ex=ax+ux*L; ey=ay+uy*L; }
    for(const e of targets){ W.applyHit(e,st,crit,1,this); fx.burst(e.hx,e.hy,6,["#ffffff",st.vfxColor],60,{add:true,life:0.25}); fx.flash(e.hx,e.hy,3,st.vfxColor,0.08); }
    fx.beam([[ax,ay],[ex,ey]],st.vfxColor,0.14,3);
    if(st.splash>0) for(const e0 of targets){ fx.ring(e0.hx,e0.hy,st.splash,st.vfxColor,0.25); for(const e of W.enemies) if(!e.dead&&!targets.includes(e)&&Math.hypot(e.hx-e0.hx,e.hy-e0.hy)<st.splash) W.applyHit(e,st,crit,0.5,this); } }
  draw(ctx){
    const S=this.spr, F=this.face<0, img=F?S.f:S.n, wimg=F?S.wf:S.w;
    const dropY=this.landed?0:-Math.round(this.drop*this.drop*500);
    const L=this.left, T=this.top+dropY;
    ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.fillRect(L+2,this.top+15,12,2); ctx.fillRect(L+3,this.top+17,10,1);
    const bob=Math.sin(this.phase*2.4)>0.55?-1:0; const rx=-this.face*Math.round(this.recoil*1.5);
    ctx.drawImage(img,0,12,16,4,L,T+12,16,4);
    ctx.drawImage(img,0,0,16,12,L+rx,T+bob,16,12);
    if(this.flash>0){ ctx.globalAlpha=0.7; ctx.drawImage(wimg,0,0,16,12,L+rx,T+bob,16,12); ctx.globalAlpha=1; }
    for(let i=0;i<this.level-1;i++){ ctx.fillStyle=PAL[0]; ctx.fillRect(L+2+i*3,T+16,3,3); ctx.fillStyle=PAL[4]; ctx.fillRect(L+3+i*3,T+17,1,1); }
  }
}

// ===== Mondo =====
class World {
  constructor(path,opt={}){ this.path=path; this.enemies=[]; this.towers=[]; this.proj=[]; this.fx=new FX();
    this.preview=!!opt.preview; this.killCb=opt.onKill||null; this.leakCb=opt.onLeak||null; this.showDmg=true;
    this.w=opt.w||480; this.h=opt.h||272; this.sound=opt.sound!==false; this.vol=opt.vol||1; }
  snd(n,v=1){ if(this.sound) SFX.play(n,v*this.vol); }
  onKill(e){ if(this.killCb) this.killCb(e); }
  applyHit(e,st,crit,mult,tower){ if(e.dead) return;
    const d=e.hit(st.damage*mult*(crit?st.critMult:1),crit); if(tower){ tower.dmgDone+=d; if(e.dead) tower.kills++; }
    if(st.slow>0 && !e.dead){ e.slowA=Math.min(0.9,Math.max(e.slowT>0?e.slowA:0,st.slow)); e.slowT=Math.max(e.slowT,st.slowTime); } }
  update(dt){
    for(const t of this.towers) t.update(dt);
    for(const e of this.enemies) if(!e.dead) e.update(dt);
    for(const e of this.enemies) if(e.reached && !e.dead){ e.dead=true; if(this.leakCb) this.leakCb(e); }
    this.enemies=this.enemies.filter(e=>!e.dead);
    for(const p of this.proj) if(!p.dead) p.update(dt);
    this.proj=this.proj.filter(p=>!p.dead);
    this.fx.update(dt);
  }
  draw(ctx){
    const ents=[]; for(const t of this.towers) ents.push([t.y+8,t]); for(const e of this.enemies) if(!e.fly) ents.push([e.y+4,e]);
    ents.sort((a,b)=>a[0]-b[0]); for(const [,o] of ents) o.draw(ctx);
    for(const e of this.enemies) if(e.fly) e.draw(ctx);
    for(const p of this.proj) p.draw(ctx);
    this.fx.draw(ctx);
  }
}

function drawRange(ctx,x,y,r,color,t){ r=Math.round(r);
  ctx.globalAlpha=0.10; ctx.fillStyle=color; pdisc(ctx,x,y,r);
  ctx.globalAlpha=0.85; const n=Math.max(12,Math.ceil(r*6.28/2)), off=Math.floor(t*10);
  for(let i=0;i<n;i++){ if(((i+off)%4)>1) continue; const a=i/n*6.2832; ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),1,1); }
  ctx.globalAlpha=1; }
