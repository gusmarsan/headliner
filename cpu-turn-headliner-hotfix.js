(function(){
  const baseChooseAttr=window.chooseAttr;
  const baseBeginBattle=window.beginBattle;
  if(typeof baseChooseAttr!=='function'||typeof baseBeginBattle!=='function')return;

  function cpuTurnActive(){
    try{
      return !!(state&&state.mode==='cpu'&&!state.gameOver&&!state.revealed&&state.turn===P2&&player(P1).deck.length&&player(P2).deck.length);
    }catch(_){return false}
  }

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

  /* CPU-turn watchdog.
     A CPU turn has no legitimate long-lived locked state: chooseAttr is
     synchronous and Headliner selection happens before the attribute timer.
     If a transition/timer leaves the table displaying “rival escolhendo” for
     too long, recover the canonical flow. */
  let cpuKey=null;
  let cpuSince=0;
  let lastKick=0;

  setInterval(()=>{
    try{
      if(!cpuTurnActive()){
        cpuKey=null;
        cpuSince=0;
        lastKick=0;
        return;
      }

      const key=`${state.gameId}:${state.round}`;
      if(cpuKey!==key){
        cpuKey=key;
        cpuSince=Date.now();
        lastKick=0;
      }

      const elapsed=Date.now()-cpuSince;

      if(state.initialHeadlinerPending)clearInitialHeadlinerPending();

      /* If a previous transition left the lock behind, it is stale by now.
         There is no async CPU action that should hold this lock this long. */
      if(state.actionLocked&&elapsed>900){
        state.actionLocked=false;
        try{if(typeof renderGame==='function')renderGame()}catch(_){}
      }

      /* First recovery: re-enter the normal battle starter. This preserves the
         rival Headliner decision and the normal 700 ms attribute animation. */
      if(!state.actionLocked&&elapsed>950&&Date.now()-lastKick>850){
        lastKick=Date.now();
        try{window.beginBattle()}catch(_){}
      }

      /* Last-resort recovery: if beginBattle/timers still failed, choose the
         attribute directly. chooseAttr builds state.current itself, so this is
         safe even when the starter never completed. */
      if(cpuTurnActive()&&!state.actionLocked&&elapsed>2200){
        try{
          if(typeof window.cpuChooseAttribute==='function')window.cpuChooseAttribute();
          else if(typeof cpuChooseAttribute==='function')cpuChooseAttribute();
        }catch(_){}
      }
    }catch(_){}
  },180);
})();
