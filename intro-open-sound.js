/* v5.4 startup sound — retries on first user gesture when autoplay is blocked. */
(function(){
  let played=false;
  let context=null;

  function createSound(){
    if(played)return true;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return false;
      context=context||new AudioCtx();
      if(context.state==='suspended'){
        context.resume().catch(()=>{});
        if(context.state==='suspended')return false;
      }

      const ctx=context;
      const now=ctx.currentTime+.015;
      const master=ctx.createGain();
      master.gain.setValueAtTime(.0001,now);
      master.gain.exponentialRampToValueAtTime(.24,now+.025);
      master.gain.exponentialRampToValueAtTime(.0001,now+.95);
      master.connect(ctx.destination);

      // Low cinematic impact.
      const low=ctx.createOscillator();
      const lowGain=ctx.createGain();
      low.type='sine';
      low.frequency.setValueAtTime(150,now);
      low.frequency.exponentialRampToValueAtTime(48,now+.52);
      lowGain.gain.setValueAtTime(.0001,now);
      lowGain.gain.exponentialRampToValueAtTime(.62,now+.035);
      lowGain.gain.exponentialRampToValueAtTime(.0001,now+.62);
      low.connect(lowGain);lowGain.connect(master);
      low.start(now);low.stop(now+.66);

      // Short airy whoosh.
      const length=Math.floor(ctx.sampleRate*.62);
      const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<length;i++){
        const p=i/length;
        data[i]=(Math.random()*2-1)*Math.sin(Math.PI*p)*Math.pow(1-p,.65);
      }
      const noise=ctx.createBufferSource();
      const filter=ctx.createBiquadFilter();
      const noiseGain=ctx.createGain();
      noise.buffer=buffer;
      filter.type='bandpass';filter.Q.value=.7;
      filter.frequency.setValueAtTime(1850,now);
      filter.frequency.exponentialRampToValueAtTime(360,now+.55);
      noiseGain.gain.setValueAtTime(.0001,now);
      noiseGain.gain.exponentialRampToValueAtTime(.35,now+.035);
      noiseGain.gain.exponentialRampToValueAtTime(.0001,now+.61);
      noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(master);
      noise.start(now);noise.stop(now+.64);

      // Small bright finish.
      const chime=ctx.createOscillator();
      const chimeGain=ctx.createGain();
      chime.type='sine';
      chime.frequency.setValueAtTime(660,now+.19);
      chime.frequency.exponentialRampToValueAtTime(990,now+.52);
      chimeGain.gain.setValueAtTime(.0001,now);
      chimeGain.gain.setValueAtTime(.0001,now+.18);
      chimeGain.gain.exponentialRampToValueAtTime(.12,now+.23);
      chimeGain.gain.exponentialRampToValueAtTime(.0001,now+.82);
      chime.connect(chimeGain);chimeGain.connect(master);
      chime.start(now+.18);chime.stop(now+.85);

      played=true;
      document.documentElement.classList.add('intro-sound-played');
      return true;
    }catch(_){return false}
  }

  window.playTKDIntroSound=createSound;

  window.addEventListener('load',()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.documentElement.classList.add('splash-visible');
    }));
    setTimeout(createSound,180);
  },{once:true});

  function firstGesture(){
    createSound();
    window.removeEventListener('pointerdown',firstGesture,true);
    window.removeEventListener('touchstart',firstGesture,true);
    window.removeEventListener('keydown',firstGesture,true);
  }
  window.addEventListener('pointerdown',firstGesture,true);
  window.addEventListener('touchstart',firstGesture,{capture:true,passive:true});
  window.addEventListener('keydown',firstGesture,true);
})();
