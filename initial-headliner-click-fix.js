(()=>{
  let lastActivation=0;
  let lastForcedRender=0;
  let syncing=false;

  function roundOneBase(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver &&
        state.round===1 && !state.revealed &&
        player(P1).head.filter(Boolean).length<3;
    }catch(_){return false}
  }

  function ensureOpeningMarker(){
    try{
      if(!roundOneBase())return;
      /* Keep the lifecycle on the game-state object itself. This avoids the old
         timing bug where the same state object was created before mode/round
         finished initializing and was then incorrectly treated as resolved. */
      if(typeof state.__openingHeadlinerResolved!=='boolean'){
        state.__openingHeadlinerResolved=false;
      }
    }catch(_){}
  }

  function openingDue(){
    ensureOpeningMarker();
    try{
      return roundOneBase() &&
        state.__openingHeadlinerResolved!==true &&
        state.selectedAttr==null;
    }catch(_){return false}
  }

  function markResolved(){
    try{
      if(!state || state.mode!=='cpu')return;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
    }catch(_){}
  }

  window.HeadlinerInitialGate={
    isResolved(){
      ensureOpeningMarker();
      try{return !roundOneBase() || state.__openingHeadlinerResolved===true}
      catch(_){return true}
    },
    isDue:openingDue,
    resolve:markResolved
  };

  /* The first-screen Headliner offer is optional, but it must exist before the
     first confrontation. beginBattle may render the table, but cannot consume
     this offer until the player either selects a Headliner or an attribute. */
  const baseBeginBattle=window.beginBattle;
  if(typeof baseBeginBattle==='function'){
    window.beginBattle=function(){
      if(openingDue()){
        try{
          state.initialHeadlinerPending=true;
          if(Date.now()-lastForcedRender>100 && typeof renderGame==='function'){
            lastForcedRender=Date.now();
            renderGame();
          }
        }catch(_){}
        return;
      }
      return baseBeginBattle.apply(this,arguments);
    };
  }

  /* Choosing an attribute is the explicit "seguir sem Headliner" action. */
  const baseChooseAttr=window.chooseAttr;
  if(typeof baseChooseAttr==='function'){
    window.chooseAttr=function(attr,fromCpu=false){
      if(!fromCpu && openingDue())markResolved();
      return baseChooseAttr.apply(this,arguments);
    };
  }

  /* Locking a Headliner resolves the opening offer. */
  const baseLockHeadliner=window.lockHeadliner;
  if(typeof baseLockHeadliner==='function'){
    window.lockHeadliner=function(index,slot){
      const wasOpening=openingDue();
      if(wasOpening)markResolved();
      const result=baseLockHeadliner.apply(this,arguments);
      try{
        if(wasOpening && state?.mode==='cpu' && !state.revealed && state.turn===P2){
          setTimeout(()=>{try{window.beginBattle()}catch(_){}},60);
        }
      }catch(_){}
      return result;
    };
  }

  /* "Agora não" inside the opening deck also resolves the offer. Closing the
     modal with X does not: the plaque remains available on the table. */
  const baseSkipHeadliner=window.skipHeadliner;
  if(typeof baseSkipHeadliner==='function'){
    window.skipHeadliner=function(){
      const wasOpening=openingDue();
      if(wasOpening)markResolved();
      const result=baseSkipHeadliner.apply(this,arguments);
      try{
        if(wasOpening && state?.mode==='cpu' && !state.revealed && state.turn===P2){
          setTimeout(()=>{try{window.beginBattle()}catch(_){}},60);
        }
      }catch(_){}
      return result;
    };
  }

  function findButton(){
    return [...document.querySelectorAll('.result-deck-button')]
      .find(btn=>/escolher\s+headliner/i.test((btn.textContent||'').trim()))||null;
  }

  function openInitial(){
    if(!openingDue())return false;
    const now=Date.now();
    if(now-lastActivation<300)return true;
    lastActivation=now;
    try{
      state.initialHeadlinerPending=true;
      if(typeof window.openInitialHeadliner==='function'){
        window.openInitialHeadliner();
        return true;
      }
      const slot=[0,1,2].find(i=>!player(P1).head[i]);
      if(slot!==undefined && typeof window.openDeck==='function'){
        window.openDeck(false,slot);
        return true;
      }
    }catch(_){}
    return false;
  }

  function wireButton(btn){
    if(!btn)return;
    const controls=btn.closest('.round-controls');
    if(controls){
      controls.style.setProperty('display','flex','important');
      controls.style.setProperty('z-index','1000','important');
      controls.style.setProperty('pointer-events','auto','important');
      controls.style.setProperty('isolation','isolate','important');

      /* Desktop: park the opening Headliner plaque beside the right-hand cup,
         away from the central battle area. Use percentages so it follows the
         tabletop composition across common desktop aspect ratios. */
      if(window.matchMedia?.('(min-width:761px)').matches){
        controls.style.setProperty('position','absolute','important');
        controls.style.setProperty('left','78%','important');
        controls.style.setProperty('top','58%','important');
        controls.style.setProperty('transform','translate(-50%,-50%)','important');
        controls.style.setProperty('margin','0','important');
      }else{
        controls.style.setProperty('position','relative','important');
        controls.style.removeProperty('left');
        controls.style.removeProperty('top');
        controls.style.removeProperty('transform');
      }
    }
    btn.style.setProperty('display','inline-flex','important');
    btn.style.setProperty('position','relative','important');
    btn.style.setProperty('z-index','1001','important');
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('touch-action','manipulation','important');

    if(btn.dataset.initialHeadlinerClickFixed==='1')return;
    btn.dataset.initialHeadlinerClickFixed='1';
    btn.addEventListener('click',event=>{
      if(!openingDue())return;
      event.preventDefault();
      event.stopPropagation();
      openInitial();
    });
  }

  function ensureOpeningCTA(){
    if(syncing || !openingDue())return;
    try{
      /* Canonical battleHTML renders the plaque from this flag. Restore it if
         any older helper cleared it during startup, then redraw exactly once. */
      if(!state.initialHeadlinerPending){
        state.initialHeadlinerPending=true;
        if(Date.now()-lastForcedRender>120 && typeof renderGame==='function'){
          syncing=true;
          lastForcedRender=Date.now();
          try{renderGame()}finally{syncing=false}
          return;
        }
      }

      let btn=findButton();
      if(!btn){
        /* Do not depend only on a redraw. If the table is already mounted, add
           the same canonical plaque directly to its round-controls container. */
        const controls=document.querySelector('.screen .battle-zone .round-controls');
        if(controls){
          btn=document.createElement('button');
          btn.type='button';
          btn.className='secondary ticket-control ticket-compact result-deck-button';
          btn.textContent='Escolher Headliner';
          btn.setAttribute('aria-label','Escolher Headliner');
          controls.appendChild(btn);
        }
      }
      if(!btn)return;

      wireButton(btn);

      /* Headliner is optional: when it is the player's attribute turn, all five
         attributes remain active while the plaque is visible. */
      if(state.turn===P1){
        document.querySelectorAll('.attr-btn[disabled]').forEach(button=>{button.disabled=false});
      }
    }catch(_){}
  }

  /* Android-safe hit testing for the visible plaque. */
  document.addEventListener('pointerup',event=>{
    if(!openingDue())return;
    const btn=findButton();
    if(!btn)return;
    const rect=btn.getBoundingClientRect();
    if(event.clientX<rect.left || event.clientX>rect.right ||
       event.clientY<rect.top || event.clientY>rect.bottom)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openInitial();
  },true);

  new MutationObserver(ensureOpeningCTA)
    .observe(document.documentElement,{childList:true,subtree:true});
  setInterval(ensureOpeningCTA,100);
  ensureOpeningCTA();
})();
