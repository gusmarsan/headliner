(()=>{
  let lastActivation=0;
  let trackedState=null;
  let resolved=false;
  let lastForcedRender=0;

  function syncState(){
    try{
      if(typeof state==='undefined'||state===trackedState)return;
      trackedState=state;
      resolved=false;
      if(!state||state.mode!=='cpu'||state.round!==1||state.revealed){resolved=true;return}
      if(player(P1).head.filter(Boolean).length>0)resolved=true;
    }catch(_){}
  }

  function openingState(){
    syncState();
    try{
      return !!state&&state.mode==='cpu'&&!state.gameOver&&state.round===1&&!state.revealed&&
        player(P1).head.filter(Boolean).length<3&&!resolved;
    }catch(_){return false}
  }

  function markResolved(){
    syncState();
    resolved=true;
    try{if(state?.mode==='cpu')state.initialHeadlinerPending=false}catch(_){}
  }

  window.HeadlinerInitialGate={
    isResolved(){syncState();return resolved},
    resolve:markResolved
  };

  /* The opening opportunity is its own pre-round state. If some legacy code or
     watchdog cleared the old flag too early, restore it before the first battle
     begins and redraw once so the CTA is physically present. */
  const baseBeginBattle=window.beginBattle;
  if(typeof baseBeginBattle==='function'){
    window.beginBattle=function(){
      syncState();
      if(openingState()){
        try{
          if(!state.initialHeadlinerPending)state.initialHeadlinerPending=true;
          if(Date.now()-lastForcedRender>80&&typeof renderGame==='function'){
            lastForcedRender=Date.now();
            renderGame();
          }
        }catch(_){}
        return;
      }
      return baseBeginBattle.apply(this,arguments);
    };
  }

  /* Choosing an attribute explicitly skips the optional opening Headliner. */
  const baseChooseAttr=window.chooseAttr;
  if(typeof baseChooseAttr==='function'){
    window.chooseAttr=function(attr,fromCpu=false){
      if(!fromCpu&&openingState())markResolved();
      return baseChooseAttr.apply(this,arguments);
    };
  }

  /* Locking the opening Headliner also resolves the pre-round gate. If the CPU
     owns the first attribute choice, resume it immediately afterwards. */
  const baseLockHeadliner=window.lockHeadliner;
  if(typeof baseLockHeadliner==='function'){
    window.lockHeadliner=function(index,slot){
      const wasOpening=openingState();
      if(wasOpening)markResolved();
      const result=baseLockHeadliner.apply(this,arguments);
      try{
        if(wasOpening&&state?.mode==='cpu'&&!state.revealed&&state.turn===P2){
          setTimeout(()=>{try{window.beginBattle()}catch(_){}},60);
        }
      }catch(_){}
      return result;
    };
  }

  const baseSkipHeadliner=window.skipHeadliner;
  if(typeof baseSkipHeadliner==='function'){
    window.skipHeadliner=function(){
      const wasOpening=openingState();
      if(wasOpening)markResolved();
      const result=baseSkipHeadliner.apply(this,arguments);
      try{
        if(wasOpening&&state?.mode==='cpu'&&!state.revealed&&state.turn===P2){
          setTimeout(()=>{try{window.beginBattle()}catch(_){}},60);
        }
      }catch(_){}
      return result;
    };
  }

  function initialButton(){
    if(!openingState())return null;
    return [...document.querySelectorAll('.result-deck-button')]
      .find(btn=>/escolher\s+headliner/i.test((btn.textContent||'').trim()))||null;
  }

  function openInitial(){
    if(!openingState())return false;
    const now=Date.now();
    if(now-lastActivation<350)return true;
    lastActivation=now;
    try{
      state.initialHeadlinerPending=true;
      if(typeof window.openInitialHeadliner==='function'){
        window.openInitialHeadliner();
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

  function ensureOpeningCTA(){
    syncState();
    if(!openingState())return;

    try{
      /* Round 1 must visibly offer Headliner before the first confrontation. */
      if(!state.initialHeadlinerPending){
        state.initialHeadlinerPending=true;
        if(Date.now()-lastForcedRender>100&&typeof renderGame==='function'){
          lastForcedRender=Date.now();
          renderGame();
          return;
        }
      }

      let btn=initialButton();
      if(!btn&&Date.now()-lastForcedRender>180&&typeof renderGame==='function'){
        lastForcedRender=Date.now();
        renderGame();
        btn=initialButton();
      }
      if(!btn)return;

      const controls=btn.closest('.round-controls');
      if(controls){
        controls.style.setProperty('display','flex','important');
        controls.style.setProperty('position','relative','important');
        controls.style.setProperty('z-index','1000','important');
        controls.style.setProperty('pointer-events','auto','important');
        controls.style.setProperty('isolation','isolate','important');
      }
      btn.style.setProperty('display','inline-flex','important');
      btn.style.setProperty('position','relative','important');
      btn.style.setProperty('z-index','1001','important');
      btn.style.setProperty('pointer-events','auto','important');
      btn.style.setProperty('touch-action','manipulation','important');

      /* The opening choice is optional. If it is the player's attribute turn,
         keep the five attributes active at the same time. */
      if(state.turn===P1){
        document.querySelectorAll('.attr-btn[disabled]').forEach(button=>{button.disabled=false});
      }

      if(btn.dataset.initialHeadlinerClickFixed==='1')return;
      btn.dataset.initialHeadlinerClickFixed='1';
      btn.addEventListener('click',event=>{
        if(!openingState())return;
        event.preventDefault();
        event.stopPropagation();
        openInitial();
      });
    }catch(_){}
  }

  document.addEventListener('pointerup',event=>{
    const btn=initialButton();
    if(!btn)return;
    const rect=btn.getBoundingClientRect();
    const inside=event.clientX>=rect.left&&event.clientX<=rect.right&&
      event.clientY>=rect.top&&event.clientY<=rect.bottom;
    if(!inside)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openInitial();
  },true);

  const observer=new MutationObserver(ensureOpeningCTA);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(ensureOpeningCTA,100);
  ensureOpeningCTA();
})();
