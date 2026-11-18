"use strict";
// ===== Audio: effetti sonori sintetizzati (WebAudio) + musica chiptune =====
const SFX = {
  ctx:null, muted:false, musicOn:true, last:{}, voices:0,
  init(){
    try{ this.muted=localStorage.getItem("ptd_mute")==="1"; this.musicOn=localStorage.getItem("ptd_music")!=="0"; }catch(e){}
    const unlock=()=>this.ensure(); window.addEventListener("pointerdown",unlock); window.addEventListener("keydown",unlock);
  },
  ensure(){
    if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; const c=this.ctx=new AC();
      this.master=c.createGain(); this.master.gain.value=this.muted?0:0.6; this.master.connect(c.destination);
      const comp=c.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=6; comp.connect(this.master);
      this.sfx=c.createGain(); this.sfx.gain.value=0.7; this.sfx.connect(comp);
      this.mus=c.createGain(); this.mus.gain.value=0.16; this.mus.connect(this.master);
      const len=c.sampleRate; this.nb=c.createBuffer(1,len,c.sampleRate); const d=this.nb.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      if(this.musicOn) Music.start(); }
    if(this.ctx.state==="suspended") this.ctx.resume();
  },
  setMute(m){ this.muted=m; try{localStorage.setItem("ptd_mute",m?"1":"0");}catch(e){} if(this.master) this.master.gain.setTargetAtTime(m?0:0.6,this.ctx.currentTime,0.02); },
  setMusic(on){ this.musicOn=on; try{localStorage.setItem("ptd_music",on?"1":"0");}catch(e){} if(!this.ctx) return; on?Music.start():Music.stop(); },
  // oscillatore con inviluppo
  tone({type="square",f=440,f2,dur=0.1,vol=0.3,delay=0,attack=0.005,out}){
    const c=this.ctx, t=c.currentTime+delay, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(out||this.sfx); o.start(t); o.stop(t+dur+0.02); this._v(dur+delay);
  },
  noise({dur=0.1,vol=0.3,delay=0,filter="lowpass",f=2000,f2,q=1,out}){
    const c=this.ctx, t=c.currentTime+delay, s=c.createBufferSource(), fl=c.createBiquadFilter(), g=c.createGain();
    s.buffer=this.nb; s.loop=true; fl.type=filter; fl.frequency.setValueAtTime(f,t); fl.Q.value=q; if(f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(out||this.sfx); s.start(t,Math.random()*0.5); s.stop(t+dur+0.02); this._v(dur+delay);
  },
  _v(d){ this.voices++; setTimeout(()=>this.voices--,d*1000+50); },
  play(name,v=1){
    if(!this.ctx||this.muted||!name||name==="none") return; const fn=SOUNDS[name]; if(!fn) return;
    const now=this.ctx.currentTime, gap=SOUND_GAP[name]||0.045; if(this.last[name]&&now-this.last[name]<gap) return;
    if(this.voices>34) return; this.last[name]=now; fn(this,Math.min(1.5,v));
  }
};
const SOUND_GAP={hit:0.05,death:0.06,coin:0.07,bow:0.05,throw:0.05,swish:0.05,crack:0.05};
const SOUNDS={
  bow:(s,v)=>{ s.noise({dur:0.06,vol:0.25*v,filter:"bandpass",f:2600,q:2}); s.tone({type:"triangle",f:320,f2:110,dur:0.09,vol:0.25*v}); },
  throw:(s,v)=>{ s.noise({dur:0.12,vol:0.3*v,filter:"bandpass",f:700,f2:3200,q:3}); },
  swish:(s,v)=>{ s.noise({dur:0.16,vol:0.28*v,filter:"bandpass",f:3500,f2:900,q:4}); s.tone({type:"sine",f:900,f2:1600,dur:0.08,vol:0.08*v}); },
  fire:(s,v)=>{ s.noise({dur:0.28,vol:0.35*v,filter:"lowpass",f:1400,f2:250}); s.tone({type:"sawtooth",f:140,f2:60,dur:0.2,vol:0.1*v}); },
  ice:(s,v)=>{ s.tone({type:"sine",f:1800,f2:2600,dur:0.12,vol:0.18*v}); s.tone({type:"sine",f:2700,dur:0.18,vol:0.1*v,delay:0.04}); },
  zap:(s,v)=>{ s.tone({type:"sawtooth",f:1100,f2:180,dur:0.14,vol:0.18*v}); s.tone({type:"square",f:70,f2:50,dur:0.12,vol:0.12*v}); s.noise({dur:0.09,vol:0.22*v,filter:"highpass",f:3000}); },
  cannon:(s,v)=>{ s.noise({dur:0.3,vol:0.6*v,filter:"lowpass",f:700,f2:90}); s.tone({type:"sine",f:120,f2:40,dur:0.25,vol:0.5*v}); },
  boom:(s,v)=>{ s.noise({dur:0.55,vol:0.7*v,filter:"lowpass",f:1100,f2:60}); s.tone({type:"sine",f:90,f2:30,dur:0.45,vol:0.55*v}); },
  laser:(s,v)=>{ s.tone({type:"square",f:1500,f2:180,dur:0.16,vol:0.14*v}); s.tone({type:"sine",f:3000,f2:400,dur:0.14,vol:0.12*v}); },
  magic:(s,v)=>{ [880,1320,1760].forEach((f,i)=>s.tone({type:"sine",f,dur:0.14,vol:0.13*v,delay:i*0.035})); s.noise({dur:0.15,vol:0.06*v,filter:"highpass",f:5000}); },
  pop:(s,v)=>{ s.tone({type:"sine",f:380,f2:1000,dur:0.07,vol:0.3*v}); },
  chime:(s,v)=>{ s.tone({type:"triangle",f:1568,dur:0.3,vol:0.16*v}); s.tone({type:"triangle",f:2093,dur:0.35,vol:0.12*v,delay:0.05}); },
  hit:(s,v)=>{ s.noise({dur:0.045,vol:0.22*v,filter:"bandpass",f:1600,q:1.5}); s.tone({type:"square",f:230,f2:110,dur:0.045,vol:0.07*v}); },
  thud:(s,v)=>{ s.tone({type:"sine",f:170,f2:55,dur:0.12,vol:0.4*v}); s.noise({dur:0.07,vol:0.25*v,filter:"lowpass",f:500}); },
  crack:(s,v)=>{ s.noise({dur:0.07,vol:0.3*v,filter:"highpass",f:2800}); s.tone({type:"triangle",f:2400,f2:1200,dur:0.06,vol:0.08*v}); },
  splat:(s,v)=>{ s.noise({dur:0.14,vol:0.35*v,filter:"lowpass",f:1000,f2:180}); s.tone({type:"sine",f:320,f2:70,dur:0.12,vol:0.2*v}); },
  death:(s,v)=>{ s.tone({type:"square",f:520,f2:90,dur:0.16,vol:0.12*v}); s.noise({dur:0.12,vol:0.18*v,filter:"lowpass",f:2000,f2:300}); },
  bossdie:(s,v)=>{ SOUNDS.boom(s,1.3); s.tone({type:"sawtooth",f:300,f2:35,dur:1.2,vol:0.3}); [523,392,262].forEach((f,i)=>s.tone({type:"square",f,dur:0.2,vol:0.12,delay:0.3+i*0.15})); },
  coin:(s,v)=>{ s.tone({type:"square",f:988,dur:0.06,vol:0.09*v}); s.tone({type:"square",f:1319,dur:0.14,vol:0.09*v,delay:0.06}); },
  place:(s,v)=>{ s.tone({type:"sine",f:200,f2:70,dur:0.14,vol:0.45}); s.noise({dur:0.12,vol:0.3,filter:"lowpass",f:900}); },
  upgrade:(s,v)=>{ [523,659,784,1047].forEach((f,i)=>s.tone({type:"square",f,dur:0.12,vol:0.12,delay:i*0.07})); },
  sell:(s,v)=>{ s.tone({type:"square",f:784,dur:0.08,vol:0.12}); s.tone({type:"square",f:523,dur:0.12,vol:0.12,delay:0.08}); SOUNDS.coin(s,1); },
  wave:(s,v)=>{ [392,523,659,784].forEach((f,i)=>s.tone({type:"square",f,dur:i===3?0.35:0.1,vol:0.13,delay:i*0.1})); },
  boss:(s,v)=>{ s.tone({type:"sawtooth",f:82,dur:1.2,vol:0.35}); s.tone({type:"sawtooth",f:87,dur:1.2,vol:0.25}); s.noise({dur:1,vol:0.2,filter:"lowpass",f:300}); },
  leak:(s,v)=>{ s.tone({type:"square",f:330,f2:140,dur:0.25,vol:0.2}); s.tone({type:"square",f:165,f2:70,dur:0.3,vol:0.15,delay:0.05}); },
  gameover:(s,v)=>{ [392,330,262,196].forEach((f,i)=>s.tone({type:"square",f,dur:i===3?0.7:0.22,vol:0.15,delay:i*0.25})); },
  clear:(s,v)=>{ [523,659,784,1047,1319].forEach((f,i)=>s.tone({type:"triangle",f,dur:0.14,vol:0.16,delay:i*0.06})); },
  click:(s,v)=>{ s.tone({type:"square",f:1200,dur:0.025,vol:0.07}); },
  error:(s,v)=>{ s.tone({type:"square",f:140,dur:0.08,vol:0.15}); s.tone({type:"square",f:110,dur:0.1,vol:0.15,delay:0.1}); },
};
const SHOOT_SOUNDS=["none","bow","throw","swish","fire","ice","zap","cannon","laser","magic","pop","chime"];
const HIT_SOUNDS=["none","hit","thud","crack","splat","boom","zap","chime","pop","magic","ice"];
const TYPE_SHOOT={arrow:"bow",fireball:"fire",ice:"ice",lightning:"zap",bomb:"cannon",laser:"laser"};

// ===== Musica chiptune in loop =====
const Music={
  on:false, step:0, next:0, timer:null, bpm:132,
  chords:[[45,[69,72,76]],[41,[65,69,72]],[48,[67,72,76]],[43,[67,71,74]]],
  mel:[76,0,74,72,74,0,72,69, 72,0,69,65,67,0,69,0, 72,74,76,0,79,0,76,74, 74,0,71,67,71,74,0,0],
  hz:m=>440*Math.pow(2,(m-69)/12),
  start(){ if(this.on||!SFX.ctx) return; this.on=true; this.next=SFX.ctx.currentTime+0.1; this.timer=setInterval(()=>this.sched(),60); },
  stop(){ this.on=false; clearInterval(this.timer); },
  sched(){ const c=SFX.ctx, st=60/this.bpm/4; if(!this.on) return;
    while(this.next<c.currentTime+0.25){ const s=this.step%64, bar=Math.floor(s/16), [bass,arp]=this.chords[bar], t=this.next-c.currentTime;
      if(t>=0){
        if(s%2===0) SFX.tone({type:"triangle",f:this.hz(bass+(s%4===2?12:0)),dur:st*1.8,vol:0.5,delay:t,out:SFX.mus});
        SFX.tone({type:"square",f:this.hz(arp[[0,1,2,1][s%4]]+12),dur:st*0.8,vol:0.07,delay:t,out:SFX.mus});
        if(s%2===0){ const m=this.mel[(this.step>>1)%32]; if(m) SFX.tone({type:"square",f:this.hz(m),dur:st*1.7,vol:0.11,delay:t,out:SFX.mus}); }
        if(s%4===2) SFX.noise({dur:0.04,vol:0.12,filter:"highpass",f:7000,delay:t,out:SFX.mus});
        if(s%8===0) SFX.noise({dur:0.08,vol:0.3,filter:"lowpass",f:400,delay:t,out:SFX.mus});
      }
      this.next+=st; this.step++; } }
};
