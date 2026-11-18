"use strict";
// ===== Sistema VFX pixel: particelle, anelli, lampi, raggi, numeri =====
class FX {
  constructor(){ this.p=[]; this.t=[]; this.rings=[]; this.beams=[]; this.flashes=[]; this.shake=0; }

  part(o){ o.age=0; o.life=o.life||0.5; o.size=o.size||1; o.grav=o.grav||0; o.drag=o.drag===undefined?2:o.drag;
    o.vx=o.vx||0; o.vy=o.vy||0; if(this.p.length<1400) this.p.push(o); return o; }

  burst(x,y,n,colors,speed=60,opt={}){
    for(let i=0;i<n;i++){ const a=Math.random()*6.2832, s=speed*(0.3+Math.random()*0.7);
      this.part({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s+(opt.up||0),life:(opt.life||0.5)*(0.6+Math.random()*0.8),
        colors,size:(opt.size||1)+(Math.random()<0.3?1:0),grav:opt.grav||0,drag:opt.drag===undefined?3:opt.drag,add:opt.add,shrink:opt.shrink}); }
  }
  smoke(x,y,n,big=1){
    for(let i=0;i<n;i++) this.part({x:x+rand(-4,4)*big,y:y+rand(-3,3)*big,vx:rand(-10,10),vy:rand(-26,-8),
      life:rand(0.5,1.1),colors:[PAL[13],PAL[14],PAL[15]],size:(2+Math.random()*2|0)*big,drag:1.5,shrink:true});
  }
  text(x,y,str,color,scale=1,life=0.8){ if(this.t.length<120) this.t.push({x,y,str,color,scale,life,age:0}); }
  ring(x,y,r,color,life=0.3,thick=1){ this.rings.push({x,y,r,color,life,thick,age:0}); }
  flash(x,y,r,color,life=0.08){ this.flashes.push({x,y,r,color,life,age:0}); }
  beam(pts,color,life=0.12,width=3){ this.beams.push({pts,color,life,width,age:0}); }
  lightning(x0,y0,x1,y1,color){
    const d=Math.hypot(x1-x0,y1-y0), n=Math.max(3,Math.round(d/7)); const nx=-(y1-y0)/(d||1), ny=(x1-x0)/(d||1);
    const pts=[[x0,y0]]; for(let i=1;i<n;i++){ const k=i/n, o=rand(-4,4); pts.push([x0+(x1-x0)*k+nx*o, y0+(y1-y0)*k+ny*o]); }
    pts.push([x1,y1]); this.beams.push({pts,color,life:0.16,width:1,age:0,jag:true});
  }
  explosion(x,y,r,color){
    r=Math.max(6,r);
    this.flash(x,y,r*0.6,"#ffffff",0.06); this.flash(x,y,r,color,0.14);
    this.ring(x,y,r,color,0.32,2); this.ring(x,y,r*0.55,PAL[4],0.22,1);
    this.burst(x,y,Math.round(r*1.4),["#ffffff",PAL[4],color,PAL[2],PAL[15]],r*4.5,{life:0.5,add:true,size:2,drag:4,shrink:true});
    this.burst(x,y,Math.round(r*0.6),[PAL[4],PAL[3]],r*3,{life:0.7,grav:160,drag:1,up:-40});
    this.smoke(x,y,Math.round(r/2.5));
    this.shake=Math.min(6,this.shake+r/9);
  }

  update(dt){
    const P=this.p;
    for(let i=P.length-1;i>=0;i--){ const o=P[i]; o.age+=dt; if(o.age>=o.life){ P[i]=P[P.length-1]; P.pop(); continue; }
      const k=Math.max(0,1-o.drag*dt); o.vx*=k; o.vy*=k; o.vy+=o.grav*dt; o.x+=o.vx*dt; o.y+=o.vy*dt;
      if(o.sway) o.x+=Math.sin(o.age*3+o.sway)*dt*6; }
    for(const o of this.t){ o.age+=dt; o.y-=(o.age<0.15?40:12)*dt; }
    this.t=this.t.filter(o=>o.age<o.life);
    for(const a of [this.rings,this.beams,this.flashes]) for(const o of a) o.age+=dt;
    this.rings=this.rings.filter(o=>o.age<o.life); this.beams=this.beams.filter(o=>o.age<o.life); this.flashes=this.flashes.filter(o=>o.age<o.life);
    this.shake=Math.max(0,this.shake-dt*14);
  }

  draw(ctx){
    // particelle normali
    for(const o of this.p){ if(o.add) continue; this._dp(ctx,o); }
    ctx.globalCompositeOperation="lighter";
    for(const o of this.p){ if(o.add) this._dp(ctx,o); }
    for(const f of this.flashes){ ctx.globalAlpha=0.6*(1-f.age/f.life); ctx.fillStyle=f.color; pdisc(ctx,f.x,f.y,f.r*(0.7+0.3*f.age/f.life)); }
    for(const b of this.beams){ const k=1-b.age/b.life;
      if(b.jag && Math.random()<0.5) for(let i=1;i<b.pts.length-1;i++){ b.pts[i][0]+=rand(-1,1); b.pts[i][1]+=rand(-1,1); }
      const w=Math.max(1,Math.round(b.width*(0.6+0.4*k)+(Math.random()<0.3?1:0)));
      ctx.globalAlpha=0.45*k; ctx.fillStyle=b.color;
      for(let i=0;i<b.pts.length-1;i++) pline(ctx,b.pts[i][0],b.pts[i][1],b.pts[i+1][0],b.pts[i+1][1],w+2);
      ctx.globalAlpha=k; ctx.fillStyle=b.jag?"#ffffff":b.color;
      for(let i=0;i<b.pts.length-1;i++) pline(ctx,b.pts[i][0],b.pts[i][1],b.pts[i+1][0],b.pts[i+1][1],b.jag?1:Math.max(1,w-1));
      if(!b.jag){ ctx.fillStyle="#ffffff"; ctx.globalAlpha=k*0.9; for(let i=0;i<b.pts.length-1;i++) pline(ctx,b.pts[i][0],b.pts[i][1],b.pts[i+1][0],b.pts[i+1][1],1); }
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    for(const r of this.rings){ const k=r.age/r.life, e=1-(1-k)*(1-k);
      ctx.globalAlpha=1-k; ctx.fillStyle=r.color; pcircle(ctx,r.x,r.y,Math.max(1,r.r*e),r.thick); }
    ctx.globalAlpha=1;
    for(const o of this.t){ const k=o.age/o.life; ctx.globalAlpha=k>0.6?1-(k-0.6)/0.4:1;
      const s=o.scale*(o.age<0.08?1:1); drawText(ctx,o.str,o.x,o.y,o.color,s,PAL[0],"center"); }
    ctx.globalAlpha=1;
  }
  _dp(ctx,o){ const k=o.age/o.life; const c=o.colors; ctx.fillStyle=c[Math.min(c.length-1,(k*c.length)|0)];
    let s=o.size; if(o.shrink) s=Math.max(1,Math.round(o.size*(1-k)));
    if(o.blink && ((o.age*8)|0)%2) return;
    ctx.fillRect(Math.round(o.x-s/2),Math.round(o.y-s/2),s,s); }
}

// ===== Scie ed effetti d'impatto per le armi personalizzate =====
FX.prototype.trail=function(kind,x,y,color,size,amount,dt){
  const n=amount*dt*60, r=Math.max(1,size*3);
  for(let i=0;i<Math.floor(n)+(Math.random()<n%1?1:0);i++){
    switch(kind){
      case "fire": this.part({x:x+rand(-r,r)/2,y:y+rand(-r,r)/2,vx:rand(-6,6),vy:rand(-16,-2),life:rand(0.2,0.45),colors:["#ffffff",PAL[4],color,PAL[2],PAL[15]],size:Math.max(1,Math.round(size*2)),add:true,drag:2,shrink:true}); break;
      case "smoke": this.part({x:x+rand(-2,2),y:y+rand(-2,2),vx:rand(-5,5),vy:rand(-10,-2),life:rand(0.4,0.8),colors:[PAL[13],PAL[14],PAL[15]],size:Math.max(1,Math.round(size*2)),drag:1.5,shrink:true}); break;
      case "sparkle": this.part({x:x+rand(-r,r),y:y+rand(-r,r),life:rand(0.25,0.5),colors:["#ffffff",color],add:true,drag:0,blink:true}); break;
      case "ice": this.part({x:x+rand(-r,r)/2,y:y+rand(-r,r)/2,vx:rand(-8,8),vy:rand(-4,10),life:0.35,colors:["#ffffff",PAL[11],color],add:true,drag:3}); break;
      case "magic": this.part({x:x+rand(-r,r),y:y+rand(-r,r),vx:rand(-6,6),vy:rand(-20,-8),life:rand(0.4,0.7),colors:["#ffffff",color,PAL[1]],add:true,drag:1,blink:Math.random()<0.5}); break;
      case "line": this.part({x,y,life:0.14,colors:[color],drag:0,add:true}); break;
      case "bubbles": this.part({x:x+rand(-r,r)/2,y:y+rand(-r,r)/2,vx:rand(-4,4),vy:rand(-14,-4),life:rand(0.4,0.8),colors:[color,"#ffffff"],size:Math.random()<0.4?2:1,drag:1}); break;
    }
  }
};
FX.prototype.hitFx=function(kind,x,y,color,size){
  size=Math.max(0.2,size);
  switch(kind){
    case "spark": this.burst(x,y,Math.round(6*size),["#ffffff",color],50*size,{life:0.22,add:true}); this.ring(x,y,5*size,color,0.15); break;
    case "explosion": this.explosion(x,y,10*size,color); break;
    case "frost": this.flash(x,y,5*size,PAL[11],0.1); this.ring(x,y,8*size,PAL[11],0.3,1); this.burst(x,y,Math.round(10*size),["#ffffff",PAL[11],color],55*size,{life:0.45,grav:90}); break;
    case "electric": this.flash(x,y,4*size,color,0.08); for(let i=0;i<3;i++){ const a=rand(0,6.28),L=rand(6,12)*size; this.lightning(x,y,x+Math.cos(a)*L,y+Math.sin(a)*L,color); } this.burst(x,y,Math.round(5*size),["#ffffff",color],60,{add:true,life:0.2}); break;
    case "poison": this.ring(x,y,7*size,color,0.3); this.burst(x,y,Math.round(8*size),[color,PAL[6],PAL[7]],45*size,{life:0.5,grav:120,up:-30});
      for(let i=0;i<6*size;i++) this.part({x:x+rand(-6,6)*size,y:y+rand(-3,3),vy:rand(-18,-6),life:rand(0.5,1),colors:[color,PAL[6]],size:Math.random()<0.5?2:1,drag:0.5}); break;
    case "magic": this.ring(x,y,9*size,color,0.35,1); this.ring(x,y,5*size,"#ffffff",0.25); this.flash(x,y,4*size,color,0.1);
      for(let i=0;i<10*size;i++) this.part({x:x+rand(-6,6)*size,y:y+rand(-6,6)*size,vy:rand(-30,-10),life:rand(0.4,0.8),colors:["#ffffff",color],add:true,drag:1,blink:true}); break;
    case "confetti": { const cs=[PAL[2],PAL[4],PAL[5],PAL[10],PAL[12],PAL[3],color]; for(let i=0;i<14*size;i++) this.part({x,y,vx:rand(-60,60)*size,vy:rand(-90,-20)*size,grav:220,drag:1.5,life:rand(0.5,0.9),colors:[cs[(Math.random()*cs.length)|0]],size:Math.random()<0.5?2:1}); this.flash(x,y,3*size,"#ffffff",0.06); break; }
    case "smoke": this.smoke(x,y,Math.round(5*size),Math.max(1,Math.round(size))); break;
    case "splat": this.burst(x,y,Math.round(10*size),[color,PAL[0]],70*size,{life:0.45,grav:200,up:-40,drag:1}); this.flash(x,y,3*size,color,0.06); break;
  }
};
