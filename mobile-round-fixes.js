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
  function sendGuestIntent(action){
    const net=window.HeadlinerNetwork;
    if(!net||net.role!=='guest'||!net.conn?.open)return false;
    try{
      net.conn.send({type:'intent',action,payload:{},round:state?.round,phase:state?.phase});
      return true;
    }catch(_){return false}
  }
  function forceCpuAdvance(){
    try{
      if(!mobile()||!state||state.mode!=='cpu'||state.gameOver||!state.revealed)return false;
      state.actionLocked=false;
      if(state.encore!==null){
        state.encore--;
        if(player(P1).head.filter(Boolean).length===3&&player(P2).head.filter(Boolean).length===3){finishGame();return true}
        if(state.encore<=0){finishGame();return true}
      }
      if(!player(P1).deck.length||!player(P2).deck.length){finishGame();return true}
      state.round++;
      state.selectedAttr=null;
      state.revealed=false;
      state.current=null;
      state.lastResult='';
      state.lastWinner=null;
      player(P1).lockedThisRound=false;
      player(P2).lockedThisRound=false;
      state.battleChooser=null;
      state.actionLocked=false;
      renderGame();
      if(state.turn===P2&&typeof scheduleGame==='function'&&typeof beginBattle==='function')scheduleGame(beginBattle,600,'cpu');
      return true;
    }catch(_){return false}
  }

  window.nextRound=function(){
    if(!mobile())return originalNextRound.apply(this,arguments);
    if(!resultReady())return;

    releaseStaleLock();
    let beforeRound=null;
    try{beforeRound=state?.round??null}catch(_){}

    if(networkGame()&&role()==='guest'){
      /* Send from the actual open PeerJS connection. The legacy helper also
         checks network.connected, which can briefly be stale on mobile and used
         to leave actionLocked=true even though no intent was sent. */
      const sent=sendGuestIntent('nextRound');
      if(!sent){
        try{state.actionLocked=false}catch(_){}
        redraw();
        return;
      }
      try{state.actionLocked=true}catch(_){}
      redraw();

      setTimeout(()=>{
        try{
          if(!mobile()||!state||state.round!==beforeRound||state.phase!=='RESULT'||!state.revealed)return;
          sendGuestIntent('requestState');
        }catch(_){}
      },650);
      setTimeout(()=>{
        try{
          if(!mobile()||!state||state.round!==beforeRound||state.phase!=='RESULT'||!state.revealed)return;
          state.actionLocked=false;
          sendGuestIntent('nextRound');
        }catch(_){}
      },1200);
      setTimeout(()=>{
        try{
          if(!mobile()||!state||state.round!==beforeRound||state.phase!=='RESULT'||!state.revealed)return;
          state.actionLocked=false;
          redraw();
        }catch(_){}
      },2200);
      return;
    }

    const result=originalNextRound.apply(this,arguments);

    /* The CPU transition is synchronous. If the original handler returned
       without advancing despite a valid revealed result, perform the same
       canonical transition once instead of leaving the button inert. */
    try{
      if(state?.mode==='cpu'&&state.round===beforeRound&&resultReady())forceCpuAdvance();
      else if(networkGame()&&role()==='host'&&state?.round===beforeRound&&state?.phase==='RESULT'&&state?.revealed){
        state.actionLocked=false;
        originalNextRound();
      }
    }catch(_){}
    return result;
  };

  let lastActivationAt=0;
  function activate(button,event){
    if(!button||!/próxima rodada/i.test(button.textContent||''))return false;
    const now=Date.now();
    if(now-lastActivationAt<350)return true;
    lastActivationAt=now;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.nextRound();
    return true;
  }

  /* Normal mobile click path. */
  document.addEventListener('click',event=>{
    if(!mobile())return;
    activate(event.target?.closest?.('.round-controls button'),event);
  },true);

  /* Fallback for transformed/overlapped board layers: even if another visual
     layer becomes the touch target, a touch released inside the visible button
     rectangle still activates Próxima rodada. */
  document.addEventListener('touchend',event=>{
    if(!mobile())return;
    const button=document.querySelector('.round-controls button');
    if(!button||!/próxima rodada/i.test(button.textContent||''))return;
    const touch=event.changedTouches?.[0];
    if(!touch)return;
    const rect=button.getBoundingClientRect();
    if(touch.clientX<rect.left||touch.clientX>rect.right||touch.clientY<rect.top||touch.clientY>rect.bottom)return;
    activate(button,event);
  },true);

  /* A completed result should never remain locked while waiting for the user.
     Guests use the acknowledgement timers above; host/solo can be safely freed. */
  let lockedSince=0;
  setInterval(()=>{
    if(!mobile()||!resultReady()||(networkGame()&&role()==='guest')){lockedSince=0;return}
    try{
      if(!state.actionLocked){lockedSince=0;return}
      if(!lockedSince)lockedSince=Date.now();
      if(Date.now()-lockedSince>450){state.actionLocked=false;lockedSince=0;redraw()}
    }catch(_){lockedSince=0}
  },180);
})();
