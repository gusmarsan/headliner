(function(){
  try{
    if(!document.querySelector('style[data-mobile-table-production]')){
      const style=document.createElement('style');
      style.dataset.mobileTableProduction='true';
      style.textContent=`
@media (max-width:760px){
  .table{
    background:#0b0d0f url('/assets/table-mobile-props-v1.webp?v=f924c0ce') center center/cover no-repeat!important;
  }

  .mobile-table-props{
    display:none!important;
  }
}
`;
      document.head.appendChild(style);
    }
  }catch(_){}

  const mobileQuery=window.matchMedia?.('(max-width:760px)');
  if(!mobileQuery)return;

  const originalNextRound=window.nextRound;
  if(typeof originalNextRound!=='function')return;

  /* Initial Headliner choice is optional. Keep the five attributes active and
     treat choosing an attribute as explicitly skipping that opening window. */
  const originalChooseAttr=window.chooseAttr;
  function unlockOptionalInitialHeadliner(){
    try{
      if(!state||state.mode!=='cpu'||state.gameOver||state.revealed||state.turn!==P1||!state.initialHeadlinerPending)return;
      document.querySelectorAll('.attr-btn[disabled]').forEach(button=>{button.disabled=false});
      const instruction=document.querySelector('.result-strip.round-instruction');
      if(instruction&&/^Escolha seu primeiro Headliner\.?$/i.test((instruction.textContent||'').trim())){
        instruction.textContent='Escolha 1 atributo à esquerda.';
      }
    }catch(_){}
  }
  if(typeof originalChooseAttr==='function'){
    window.chooseAttr=function(attr,fromCpu=false){
      try{
        if(!fromCpu&&state?.mode==='cpu'&&state?.round===1&&state?.initialHeadlinerPending&&state?.turn===P1&&!state?.revealed){
          state.initialHeadlinerPending=false;
        }
      }catch(_){}
      return originalChooseAttr.apply(this,arguments);
    };
  }
  setInterval(unlockOptionalInitialHeadliner,80);

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
  function headlinerSelectionDue(){
    try{
      if(window.HeadlinerScheduledGate&&typeof window.HeadlinerScheduledGate.isDue==='function'){
        return !!window.HeadlinerScheduledGate.isDue();
      }
      return state?.mode==='cpu'&&state.revealed&&state.round%3===0&&
        state.headlinerSkippedRound!==state.round&&
        player(P1).head.filter(Boolean).length<3&&!player(P1).lockedThisRound;
    }catch(_){return false}
  }
  function scheduledPlaqueReady(){
    try{
      if(!headlinerSelectionDue())return true;
      if(window.HeadlinerScheduledGate&&typeof window.HeadlinerScheduledGate.ensureVisible==='function'){
        window.HeadlinerScheduledGate.ensureVisible();
      }
      return !!document.querySelector('.result-deck-button.headliner-scheduled-plaque, .result-deck-button');
    }catch(_){return false}
  }
  function headlinerModalOpen(){
    try{
      return !!document.querySelector('#modal-root .deck-modal-card, #modal-root .confirm-box');
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

    /* Never leave a scheduled Headliner result state before the plaque has
       actually been mounted at least once. This fixes the invisible-gate race. */
    if(headlinerSelectionDue()&&!scheduledPlaqueReady()){
      releaseStaleLock();
      redraw();
      return;
    }

    releaseStaleLock();
    let beforeRound=null;
    try{beforeRound=state?.round??null}catch(_){}

    if(networkGame()&&role()==='guest'){
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
    if(!mobile()||!resultReady()||headlinerModalOpen()){
      if(autoAdvanceKey!==null||autoAdvanceTimer)clearAutoAdvance();
      return;
    }

    /* On rounds 3/6/9..., start the five-second result timer only after the
       Headliner plaque is truly visible. The user therefore never loses the
       opportunity because rendering lagged behind the timer. */
    if(headlinerSelectionDue()&&!scheduledPlaqueReady()){
      if(autoAdvanceKey!==null||autoAdvanceTimer)clearAutoAdvance();
      redraw();
      return;
    }

    const key=resultKey();
    if(!key||key===autoAdvanceKey)return;
    if(autoAdvanceTimer)clearTimeout(autoAdvanceTimer);
    autoAdvanceKey=key;
    autoAdvanceTimer=setTimeout(()=>{
      autoAdvanceTimer=null;
      if(!mobile()||!resultReady()||resultKey()!==key)return;
      if(headlinerModalOpen()){
        autoAdvanceKey=null;
        armAutoAdvance();
        return;
      }
      if(headlinerSelectionDue()&&!scheduledPlaqueReady()){
        autoAdvanceKey=null;
        redraw();
        armAutoAdvance();
        return;
      }
      window.nextRound();

      setTimeout(()=>{
        if(!mobile()||!resultReady()||resultKey()!==key)return;
        autoAdvanceKey=null;
        armAutoAdvance();
      },2600);
    },AUTO_ADVANCE_MS);
  }

  setInterval(armAutoAdvance,100);

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
