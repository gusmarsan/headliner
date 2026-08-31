(()=>{
  function roundOneBase(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver &&
        state.round===1 && !state.revealed &&
        player(P1).head.filter(Boolean).length<3;
    }catch(_){return false}
  }

  function ensureOpeningMarker(){
    try{
      if(!roundOneBase())return;
      if(typeof state.__openingHeadlinerResolved!=='boolean'){
        state.__openingHeadlinerResolved=false;
      }
    }catch(_){}
  }

  function openingDue(){
    ensureOpeningMarker();
    try{
      return roundOneBase() &&
        state.__openingHeadlinerResolved!==true &&
        state.selectedAttr==null;
    }catch(_){return false}
  }

  function markResolved(){
    try{
      if(!state || state.mode!=='cpu')return;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
    }catch(_){}
  }

  window.HeadlinerInitialGate={
    isResolved(){
      ensureOpeningMarker();
      try{return !roundOneBase() || state.__openingHeadlinerResolved===true}
      catch(_){return true}
    },
    isDue:openingDue,
    resolve:markResolved
  };

  /* Keep the lifecycle protection for older entry paths, but the opening choice
     is no longer represented by a table plaque. The solo lineup review owns the
     initial Headliner decision now. */
  const baseBeginBattle=window.beginBattle;
  if(typeof baseBeginBattle==='function'){
    window.beginBattle=function(){
      if(openingDue())return;
      return baseBeginBattle.apply(this,arguments);
    };
  }

  const baseChooseAttr=window.chooseAttr;
  if(typeof baseChooseAttr==='function'){
    window.chooseAttr=function(attr,fromCpu=false){
      if(!fromCpu && openingDue())markResolved();
      return baseChooseAttr.apply(this,arguments);
    };
  }

  const baseLockHeadliner=window.lockHeadliner;
  if(typeof baseLockHeadliner==='function'){
    window.lockHeadliner=function(index,slot){
      if(openingDue())markResolved();
      return baseLockHeadliner.apply(this,arguments);
    };
  }

  const baseSkipHeadliner=window.skipHeadliner;
  if(typeof baseSkipHeadliner==='function'){
    window.skipHeadliner=function(){
      if(openingDue())markResolved();
      return baseSkipHeadliner.apply(this,arguments);
    };
  }

  function findLegacyOpeningPlaque(){
    return [...document.querySelectorAll('.result-deck-button')]
      .find(btn=>/escolher\s+headliner/i.test((btn.textContent||'').trim()) &&
        !btn.classList.contains('headliner-scheduled-plaque'))||null;
  }

  function suppressLegacyOpeningUI(){
    try{
      if(!roundOneBase())return;

      /* battleHTML can briefly create the old blue button during startGame().
         Remove it in the same mutation cycle, before paint, so the opening UI is
         owned exclusively by the lineup review. */
      const btn=findLegacyOpeningPlaque();
      if(btn)btn.remove();

      if(state.turn===P1){
        document.querySelectorAll('.attr-btn[disabled]').forEach(button=>{button.disabled=false});
      }
      const instruction=document.querySelector('.result-strip.round-instruction');
      if(instruction&&/^Escolha seu primeiro Headliner\.?$/i.test((instruction.textContent||'').trim())){
        instruction.textContent='Escolha 1 atributo à esquerda.';
      }
    }catch(_){}
  }

  new MutationObserver(suppressLegacyOpeningUI)
    .observe(document.documentElement,{childList:true,subtree:true});
  setInterval(suppressLegacyOpeningUI,100);
  suppressLegacyOpeningUI();
})();
