(function(){
  const baseChooseAttr=window.chooseAttr;
  const baseBeginBattle=window.beginBattle;
  if(typeof baseChooseAttr!=='function'||typeof baseBeginBattle!=='function')return;

  function cpuTurnActive(){
    try{
      return !!(state&&state.mode==='cpu'&&!state.gameOver&&!state.revealed&&state.turn===P2&&player(P1).deck.length&&player(P2).deck.length);
    }catch(_){return false}
  }

  function openingHeadlinerStillDue(){
    try{
      if(!state||state.mode!=='cpu'||state.gameOver||state.round!==1||state.revealed)return false;
      if(state.__openingHeadlinerResolved===true)return false;
      if(window.HeadlinerInitialGate&&typeof window.HeadlinerInitialGate.isDue==='function'){
        return !!window.HeadlinerInitialGate.isDue();
      }
      /* Safe fallback for the tiny interval before the opening-gate helper has
         loaded: never consume round-one pending merely because that helper is
         not available yet. */
      return state.selectedAttr==null&&player(P1).head.filter(Boolean).length<3;
    }catch(_){return false}
  }

  function clearInitialHeadlinerPending(){
    try{
      if(typeof state==='undefined'||!state||state.mode!=='cpu'||!state.initialHeadlinerPending)return false;
      if(openingHeadlinerStillDue())return false;
      state.initialHeadlinerPending=false;
      try{if(typeof closeModal==='function')closeModal()}catch(_){}
      return true;
    }catch(_){return false}
  }

  window.chooseAttr=function(attr,fromCpu=false){
    try{
      if(!fromCpu&&state?.mode==='cpu'&&state.turn===P1&&state.initialHeadlinerPending){
        clearInitialHeadlinerPending();
      }
    }catch(_){}
    return baseChooseAttr.apply(this,arguments);
  };

  window.beginBattle=function(){
    try{
      /* The rival/CPU flow is not allowed to consume the opening plaque. Once
         the opening decision is genuinely resolved, stale pending can be freed. */
      if(state?.mode==='cpu'&&state.turn===P2&&state.initialHeadlinerPending&&!openingHeadlinerStillDue()){
        clearInitialHeadlinerPending();
      }
    }catch(_){}
    return baseBeginBattle.apply(this,arguments);
  };

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

      /* Opening Headliner is a legitimate pre-battle state, not a stall. */
      if(openingHeadlinerStillDue()){
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

      if(state.actionLocked&&elapsed>900){
        state.actionLocked=false;
        try{if(typeof renderGame==='function')renderGame()}catch(_){}
      }

      if(!state.actionLocked&&elapsed>950&&Date.now()-lastKick>850){
        lastKick=Date.now();
        try{window.beginBattle()}catch(_){}
      }

      if(cpuTurnActive()&&!state.actionLocked&&elapsed>2200){
        try{
          if(typeof window.cpuChooseAttribute==='function')window.cpuChooseAttribute();
          else if(typeof cpuChooseAttribute==='function')cpuChooseAttribute();
        }catch(_){}
      }
    }catch(_){}
  },180);
})();
