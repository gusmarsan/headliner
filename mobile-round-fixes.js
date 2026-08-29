(function(){
  const mobileQuery=window.matchMedia?.('(max-width:760px)');
  if(!mobileQuery)return;

  const originalNextRound=window.nextRound;
  if(typeof originalNextRound!=='function')return;

  function mobile(){return mobileQuery.matches}
  function networkGame(){try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}}
  function role(){return window.HeadlinerNetwork?.role||null}
  function resultReady(){
    try{
      if(typeof state==='undefined'||!state||state.gameOver||!state.revealed)return false;
      return state.mode==='cpu'||state.phase==='RESULT';
    }catch(_){return false}
  }
  function redraw(){
    try{if(typeof renderCurrentState==='function')return renderCurrentState()}catch(_){}
    try{if(typeof renderGame==='function')renderGame()}catch(_){}
  }
  function releaseStaleLock(){
    if(!mobile()||!resultReady())return false;
    try{
      if(state.actionLocked){state.actionLocked=false;return true}
    }catch(_){}
    return false;
  }

  window.nextRound=function(){
    if(!mobile())return originalNextRound.apply(this,arguments);

    releaseStaleLock();
    let beforeRound=null;
    try{beforeRound=state?.round??null}catch(_){}
    const isGuest=networkGame()&&role()==='guest';
    const result=originalNextRound.apply(this,arguments);

    if(isGuest){
      /* A guest locks locally while waiting for the authoritative host state.
         If that acknowledgement never arrives, unlock and retry the intent once
         instead of leaving the mobile button permanently frozen. */
      setTimeout(()=>{
        try{
          if(!mobile()||!state||state.round!==beforeRound||state.phase!=='RESULT'||!state.revealed||!state.actionLocked)return;
          state.actionLocked=false;
          originalNextRound();
        }catch(_){}
      },900);
      setTimeout(()=>{
        try{
          if(!mobile()||!state||state.round!==beforeRound||state.phase!=='RESULT'||!state.revealed)return;
          if(state.actionLocked){state.actionLocked=false;redraw()}
        }catch(_){}
      },1900);
    }
    return result;
  };

  /* On mobile the result action can sit over several transformed board layers.
     Capture the pointer on the real button itself so a valid tap always reaches
     the round transition even if a later bubbling handler is swallowed. */
  document.addEventListener('pointerup',event=>{
    if(!mobile())return;
    const button=event.target?.closest?.('.round-controls button');
    if(!button||!/próxima rodada/i.test(button.textContent||''))return;
    event.preventDefault();
    event.stopPropagation();
    window.nextRound();
  },true);

  /* Host/solo never need to remain action-locked while a revealed RESULT is
     already waiting for “Próxima rodada”. Recover a stale lock after a short
     grace period; guests are handled by the acknowledgement retry above. */
  let lockedSince=0;
  setInterval(()=>{
    if(!mobile()||!resultReady()||(networkGame()&&role()==='guest')){lockedSince=0;return}
    try{
      if(!state.actionLocked){lockedSince=0;return}
      if(!lockedSince)lockedSince=Date.now();
      if(Date.now()-lockedSince>500){state.actionLocked=false;lockedSince=0;redraw()}
    }catch(_){lockedSince=0}
  },200);
})();
