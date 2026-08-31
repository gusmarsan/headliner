(function(){
  const baseChooseAttr=window.chooseAttr;
  const baseBeginBattle=window.beginBattle;
  const baseCpuLockHeadliner=window.cpuLockHeadliner;
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

  /* Rival gets the same cadence as the player: one opening opportunity, then
     only at the start of a round that follows a completed block of three. */
  if(typeof baseCpuLockHeadliner==='function'){
    window.cpuLockHeadliner=function(){
      try{
        if(state?.mode==='cpu'){
          const scheduled=state.round===1||(state.round>1&&(state.round-1)%3===0);
          if(!scheduled)return;
        }
      }catch(_){}
      return baseCpuLockHeadliner.apply(this,arguments);
    };
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
