(function(){
  try{
    if(new URLSearchParams(window.location.search).get('mesa')==='props'){
      document.documentElement.classList.add('mesa-props-test');
      if(!document.querySelector('style[data-mobile-table-props-test]')){
        const style=document.createElement('style');
        style.dataset.mobileTablePropsTest='true';
        style.textContent=`
@media (max-width:760px){
  html.mesa-props-test .table{
    background:#0b0d0f url('/assets/table-mobile-props-v1.webp?v=f924c0ce') center center/cover no-repeat!important;
  }
  html.mesa-props-test .mobile-table-props{
    display:none!important;
  }
}
`;
        document.head.appendChild(style);
      }
    }
  }catch(_){}

  const mobileQuery=window.matchMedia?.('(max-width:760px)');
  if(!mobileQuery)return;

  const originalNextRound=window.nextRound;
  if(typeof originalNextRound!=='function')return;

  const AUTO_ADVANCE_MS=5000;
  let autoAdvanceKey=null;
  let autoAdvanceTimer=null;

  /* Round result timing is now a game-wide rule, not a mobile-only fix. */
  function mobile(){return true}
  function networkGame(){try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}}
  function role(){return window.HeadlinerNetwork?.role||null}
  function resultReady(){
    try{
      if(typeof state==='undefined'||!state||state.gameOver||!state.revealed)return false;
      return state.mode==='cpu'||state.phase==='RESULT';
    }catch(_){return false}
  }
  function resultKey(){
    try{return `${state?.gameId??state?.mode??'game'}:${state?.round??'round'}`}
    catch(_){return null}
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
       canonical transition once instead of leaving the game stuck. */
    try{
      if(state?.mode==='cpu'&&state.round===beforeRound&&resultReady())forceCpuAdvance();
      else if(networkGame()&&role()==='host'&&state?.round===beforeRound&&state?.phase==='RESULT'&&state?.revealed){
        state.actionLocked=false;
        originalNextRound();
      }
    }catch(_){}
    return result;
  };

  function clearAutoAdvance(){
    if(autoAdvanceTimer){clearTimeout(autoAdvanceTimer);autoAdvanceTimer=null}
    autoAdvanceKey=null;
  }
  function armAutoAdvance(){
    if(!mobile()||!resultReady()){
      if(autoAdvanceKey!==null||autoAdvanceTimer)clearAutoAdvance();
      return;
    }
    const key=resultKey();
    if(!key||key===autoAdvanceKey)return;
    if(autoAdvanceTimer)clearTimeout(autoAdvanceTimer);
    autoAdvanceKey=key;
    autoAdvanceTimer=setTimeout(()=>{
      autoAdvanceTimer=null;
      if(!mobile()||!resultReady()||resultKey()!==key)return;
      window.nextRound();

      /* Network guests advance asynchronously. If the same result somehow
         remains after the connection recovery window, arm one fresh 5 s cycle
         instead of leaving the match permanently parked. */
      setTimeout(()=>{
        if(!mobile()||!resultReady()||resultKey()!==key)return;
        autoAdvanceKey=null;
        armAutoAdvance();
      },2600);
    },AUTO_ADVANCE_MS);
  }

  /* Detect the exact moment a revealed result becomes stable. The result stays
     on screen for five seconds, then the same hardened nextRound flow advances
     to the next attribute-selection state. */
  setInterval(armAutoAdvance,100);

  /* A completed result should never remain locked while it is being shown.
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
