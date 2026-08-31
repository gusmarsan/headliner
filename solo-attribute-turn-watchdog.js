(()=>{
  let turnKey=null;
  let turnSince=0;
  let lastKick=0;
  let lastRender=0;

  function active(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && !state.revealed &&
        state.round>=2 && player(P1).deck.length && player(P2).deck.length;
    }catch(_){return false}
  }

  function modalBlocking(){
    try{
      return !!document.querySelector('#modal-root .deck-modal-card, #modal-root .confirm-box, #modal-root .deck-modal, #modal-root .modal-card');
    }catch(_){return false}
  }

  function currentReady(){
    try{return !!(state.current && state.current[P1] && state.current[P2])}
    catch(_){return false}
  }

  function redraw(){
    if(Date.now()-lastRender<180)return;
    lastRender=Date.now();
    try{if(typeof renderGame==='function')renderGame()}catch(_){}
  }

  function clearStaleOpeningFlag(){
    try{
      if(state.round>1 && state.initialHeadlinerPending){
        state.initialHeadlinerPending=false;
        return true;
      }
    }catch(_){}
    return false;
  }

  function enablePlayerAttributes(){
    try{
      if(state.turn!==P1 || state.revealed || state.actionLocked || !currentReady())return false;
      let changed=false;
      document.querySelectorAll('.attr-btn').forEach(btn=>{
        if(btn.disabled){btn.disabled=false;changed=true}
        btn.style.pointerEvents='auto';
      });
      return changed;
    }catch(_){return false}
  }

  function kickBattle(){
    try{
      if(typeof window.beginBattle==='function'){
        window.beginBattle();
        return true;
      }
      if(typeof beginBattle==='function'){
        beginBattle();
        return true;
      }
    }catch(_){}
    return false;
  }

  function kickCpuAttribute(){
    try{
      if(typeof window.cpuChooseAttribute==='function'){
        window.cpuChooseAttribute();
        return true;
      }
      if(typeof cpuChooseAttribute==='function'){
        cpuChooseAttribute();
        return true;
      }
    }catch(_){}
    return false;
  }

  setInterval(()=>{
    try{
      if(!active() || modalBlocking()){
        turnKey=null;
        turnSince=0;
        lastKick=0;
        return;
      }

      const key=`${state.gameId??'solo'}:${state.round}:${state.turn}`;
      if(turnKey!==key){
        turnKey=key;
        turnSince=Date.now();
        lastKick=0;
      }
      const elapsed=Date.now()-turnSince;

      /* An opening-Headliner flag is valid only in round one. If it leaks into
         later rounds, canonical beginBattle refuses to run and the match looks
         frozen at attribute selection. */
      if(clearStaleOpeningFlag())redraw();

      /* Attribute selection itself is never a locked Headliner state. Release a
         stale transition lock once the new round has had time to mount. */
      if(state.actionLocked && state.selectedAttr==null && elapsed>550){
        state.actionLocked=false;
        redraw();
      }

      if(!currentReady()){
        if(!state.actionLocked && elapsed>350 && Date.now()-lastKick>500){
          lastKick=Date.now();
          kickBattle();
        }
        return;
      }

      if(state.turn===P1){
        if(state.actionLocked)return;
        enablePlayerAttributes();
        return;
      }

      if(state.turn===P2 && state.selectedAttr==null && !state.actionLocked){
        if(elapsed>750 && Date.now()-lastKick>650){
          lastKick=Date.now();
          kickCpuAttribute();
        }
      }
    }catch(_){}
  },140);
})();
