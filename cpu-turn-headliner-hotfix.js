(function(){
  const baseChooseAttr=window.chooseAttr;
  const baseBeginBattle=window.beginBattle;
  if(typeof baseChooseAttr!=='function'||typeof baseBeginBattle!=='function')return;

  function clearInitialHeadlinerPending(){
    try{
      if(typeof state==='undefined'||!state||state.mode!=='cpu'||!state.initialHeadlinerPending)return false;
      state.initialHeadlinerPending=false;
      try{if(typeof closeModal==='function')closeModal()}catch(_){}
      return true;
    }catch(_){return false}
  }

  window.chooseAttr=function(attr,fromCpu=false){
    try{
      /* Choosing an attribute is an explicit decision to keep playing without
         selecting the optional opening Headliner. Clear the old gate before
         the canonical attribute handler evaluates the round. */
      if(!fromCpu&&state?.mode==='cpu'&&state.turn===P1&&state.initialHeadlinerPending){
        clearInitialHeadlinerPending();
      }
    }catch(_){}
    return baseChooseAttr.apply(this,arguments);
  };

  window.beginBattle=function(){
    try{
      /* The opening Headliner is optional. A stale pending flag must never
         prevent the CPU from starting its attribute choice on a later turn. */
      if(state?.mode==='cpu'&&state.turn===P2&&state.initialHeadlinerPending){
        clearInitialHeadlinerPending();
      }
    }catch(_){}
    return baseBeginBattle.apply(this,arguments);
  };

  /* Defensive recovery for any transition that reaches the rival turn with
     the legacy flag still alive. This also protects future round-flow changes. */
  let recoveredKey=null;
  setInterval(()=>{
    try{
      if(!state||state.mode!=='cpu'||state.gameOver||state.revealed||state.turn!==P2||!state.initialHeadlinerPending)return;
      const key=`${state.gameId}:${state.round}`;
      clearInitialHeadlinerPending();
      if(recoveredKey===key)return;
      recoveredKey=key;
      if(!state.actionLocked)window.beginBattle();
    }catch(_){}
  },250);
})();
