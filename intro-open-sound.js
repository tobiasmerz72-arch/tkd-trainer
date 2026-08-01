// Intro sound: attempts once on opening; iPhone may require the first touch.
(function(){
  function sound(){
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      const ctx=new AudioCtx();
      if(ctx.state==='suspended')ctx.resume();
      const now=ctx.currentTime;
      const master=ctx.createGain();
      master.gain.setValueAtTime(.0001,now);
      master.gain.exponentialRampToValueAtTime(.30,now+.02);
      master.gain.exponentialRampToValueAtTime(.0001,now+.72);
      master.connect(ctx.destination);
      const osc=ctx.createOscillator(),g=ctx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(180,now);osc.frequency.exponentialRampToValueAtTime(58,now+.48);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.65,now+.04);g.gain.exponentialRampToValueAtTime(.0001,now+.55);
      osc.connect(g);g.connect(master);osc.start(now);osc.stop(now+.58);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2.6);
      const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();src.buffer=buffer;f.type='bandpass';f.frequency.setValueAtTime(1500,now);f.frequency.exponentialRampToValueAtTime(320,now+.42);src.connect(f);f.connect(master);src.start(now);src.stop(now+.5);
      setTimeout(()=>ctx.close(),1000);
    }catch(_){ }
  }
  window.addEventListener('load',()=>setTimeout(sound,180),{once:true});
})();
