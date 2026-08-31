(()=>{
  const MOBILE_QUERY='(max-width:760px)';

  function mobileViewport(){
    try{return !!window.matchMedia?.(MOBILE_QUERY).matches}
    catch(_){return window.innerWidth<=760}
  }

  function scheduledDue(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.revealed &&
        state.round%3===0 && state.headlinerSkippedRound!==state.round &&
        player(P1).head.filter(Boolean).length<3 && !player(P1).lockedThisRound;
    }catch(_){return false}
  }

  function injectStyles(){
    if(document.querySelector('style[data-headliner-scheduled-plaque]'))return;
    const style=document.createElement('style');
    style.dataset.headlinerScheduledPlaque='1';
    style.textContent=`
      .result-deck-button.headliner-scheduled-plaque{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:42px!important;
        padding:0 18px!important;
        background:#a92d2d!important;
        border:2px solid #7d1f1f!important;
        color:#f6e7c7!important;
        text-align:center!important;
        line-height:1!important;
        box-shadow:0 8px 18px rgba(0,0,0,.25)!important;
        position:relative!important;
        z-index:1001!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
      }
      .headliner-scheduled-mobile-host{
        display:none;
      }
      @media (min-width:761px){
        .round-controls.headliner-scheduled-plaque-wrap{
          display:flex!important;
          position:absolute!important;
          left:78%!important;
          top:58%!important;
          transform:translate(-50%,-50%)!important;
          margin:0!important;
          z-index:1000!important;
          pointer-events:auto!important;
          isolation:isolate!important;
        }
        .round-controls.headliner-scheduled-plaque-wrap .headliner-scheduled-plaque{
          left:50px!important;
          top:30px!important;
        }
      }
      @media (max-width:760px){
        /* On phones the battle layout is heavily transformed and the normal
           round-controls flow can end up behind the hand/headliner layers.
           Portal the scheduled CTA to the viewport so rounds 3/6/9 always
           expose the choice without changing the desktop layout. */
        .headliner-scheduled-mobile-host{
          display:flex!important;
          position:fixed!important;
          left:50%!important;
          top:58dvh!important;
          transform:translate(-50%,-50%)!important;
          width:max-content!important;
          max-width:calc(100vw - 24px)!important;
          justify-content:center!important;
          margin:0!important;
          z-index:190!important;
          pointer-events:auto!important;
          isolation:isolate!important;
        }
        .headliner-scheduled-mobile-host .headliner-scheduled-plaque{
          min-width:168px!important;
          max-width:calc(100vw - 24px)!important;
          left:auto!important;
          top:auto!important;
          font-size:12px!important;
        }
        .round-controls.headliner-scheduled-plaque-wrap{
          display:flex!important;
          position:relative!important;
          justify-content:center!important;
          z-index:1000!important;
          pointer-events:auto!important;
        }
        .round-controls.headliner-scheduled-plaque-wrap .headliner-scheduled-plaque{
          left:auto!important;
          top:auto!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function scheduledLabel(btn){
    return !!btn&&/escolher\s+headliner|escolha\s+o\s+headliner/i.test((btn.textContent||'').trim());
  }

  function mobileHost(){
    let host=document.querySelector('.headliner-scheduled-mobile-host');
    if(host)return host;
    host=document.createElement('div');
    host.className='headliner-scheduled-mobile-host';
    host.setAttribute('role','group');
    host.setAttribute('aria-label','Escolha de Headliner');
    document.body.appendChild(host);
    return host;
  }

  function clearMobileHost(){
    document.querySelectorAll('.headliner-scheduled-mobile-host').forEach(host=>host.remove());
  }

  function findPlaque(){
    const mobileButton=document.querySelector('.headliner-scheduled-mobile-host .result-deck-button');
    if(mobileButton&&scheduledLabel(mobileButton))return mobileButton;
    return [...document.querySelectorAll('.result-deck-button')].find(scheduledLabel)||null;
  }

  function makePlaque(){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='secondary ticket-control ticket-compact result-deck-button';
    btn.textContent='Escolha o Headliner';
    return btn;
  }

  function openScheduled(){
    if(!scheduledDue())return false;
    try{
      if(typeof window.openScheduledHeadliner==='function'){
        window.openScheduledHeadliner();
        return true;
      }
      const slot=[0,1,2].find(i=>!player(P1).head[i]);
      if(slot!==undefined&&typeof window.openDeck==='function'){
        window.openDeck(false,slot);
        return true;
      }
    }catch(_){}
    return false;
  }

  function wire(btn){
    if(!btn)return;

    /* Keep this function idempotent. Reassigning textContent on every
       MutationObserver pass creates another childList mutation and can lock the
       UI in an observer loop exactly when round 3 becomes revealed. */
    if(!btn.classList.contains('headliner-scheduled-plaque')){
      btn.classList.add('headliner-scheduled-plaque');
    }
    if((btn.textContent||'').trim()!=='Escolha o Headliner'){
      btn.textContent='Escolha o Headliner';
    }
    if(btn.getAttribute('aria-label')!=='Escolha o Headliner'){
      btn.setAttribute('aria-label','Escolha o Headliner');
    }
    const controls=btn.closest('.round-controls');
    if(controls&&!controls.classList.contains('headliner-scheduled-plaque-wrap')){
      controls.classList.add('headliner-scheduled-plaque-wrap');
    }

    if(btn.dataset.scheduledHeadlinerWired==='1')return;
    btn.dataset.scheduledHeadlinerWired='1';
    btn.addEventListener('click',event=>{
      if(!scheduledDue())return;
      event.preventDefault();
      event.stopPropagation();
      openScheduled();
    });
  }

  function ensureMobilePlaque(){
    const host=mobileHost();
    let btn=host.querySelector('.result-deck-button');

    if(!btn){
      const inline=[...document.querySelectorAll('.screen .battle-zone .round-controls .result-deck-button')]
        .find(scheduledLabel);
      btn=inline||makePlaque();
      host.replaceChildren(btn);
    }

    /* renderGame can recreate an inline copy while the portal survives.
       Remove only duplicate scheduled CTAs; opening-round Headliner controls
       use a different state and are untouched because this runs only when due. */
    document.querySelectorAll('.screen .battle-zone .round-controls .result-deck-button').forEach(other=>{
      if(other!==btn&&scheduledLabel(other))other.remove();
    });

    return btn;
  }

  function ensurePlaque(){
    injectStyles();
    if(!scheduledDue()){
      document.querySelectorAll('.headliner-scheduled-plaque').forEach(btn=>btn.classList.remove('headliner-scheduled-plaque'));
      document.querySelectorAll('.headliner-scheduled-plaque-wrap').forEach(el=>el.classList.remove('headliner-scheduled-plaque-wrap'));
      clearMobileHost();
      return false;
    }

    let btn=null;
    if(mobileViewport()){
      btn=ensureMobilePlaque();
    }else{
      clearMobileHost();
      btn=findPlaque();
      if(!btn){
        const controls=document.querySelector('.screen .battle-zone .round-controls');
        if(controls){
          btn=makePlaque();
          controls.appendChild(btn);
        }
      }
    }
    if(!btn)return false;

    wire(btn);
    try{
      if(state.__scheduledPlaqueShownRound!==state.round){
        state.__scheduledPlaqueShownRound=state.round;
        state.__scheduledPlaqueShownAt=Date.now();
      }
    }catch(_){}
    return true;
  }

  window.HeadlinerScheduledGate={
    isDue:scheduledDue,
    ensureVisible:ensurePlaque,
    isVisible(){return scheduledDue()&&!!findPlaque()},
    shownAt(){try{return state?.__scheduledPlaqueShownAt||0}catch(_){return 0}}
  };

  new MutationObserver(ensurePlaque).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(ensurePlaque,100);
  ensurePlaque();
})();
