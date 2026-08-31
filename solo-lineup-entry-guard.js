(()=>{
  let handledGameId=null;

  function freshSoloState(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.round===1 &&
        state.revealed===false && state.selectedAttr==null &&
        state.players?.p1?.deck?.length>0;
    }catch(_){return false}
  }

  function guaranteeReview(){
    if(!freshSoloState())return false;
    const gameId=state.gameId;
    if(gameId==null || gameId===handledGameId)return state.__soloLineupReviewPending===true;

    /* Never mark a game as handled before the review has actually mounted.
       Older cached runtimes can expose the review helper a few ticks later. */
    if(state.__soloLineupReviewPending===true){
      handledGameId=gameId;
      return true;
    }

    const restore=window.restoreSoloLineupReview;
    if(typeof restore!=='function')return false;

    try{
      const mounted=restore()===true || state.__soloLineupReviewPending===true;
      if(mounted){
        handledGameId=gameId;
        return true;
      }
    }catch(_){}
    return false;
  }

  function retryEntry(){
    handledGameId=null;
    guaranteeReview();
    setTimeout(guaranteeReview,0);
    setTimeout(guaranteeReview,30);
    setTimeout(guaranteeReview,90);
    setTimeout(guaranteeReview,220);
  }

  /* Directly bind the canonical solo start action as a second guarantee.
     reset() still creates the normal 30-card match; immediately afterwards the
     review phase takes ownership and cancels the legacy 450 ms deck timer. */
  const baseReset=window.reset;
  if(typeof baseReset==='function'){
    window.reset=function(){
      const result=baseReset.apply(this,arguments);
      retryEntry();
      return result;
    };
  }

  const basePlayAgain=window.playAgain;
  if(typeof basePlayAgain==='function'){
    window.playAgain=function(){
      const result=basePlayAgain.apply(this,arguments);
      retryEntry();
      return result;
    };
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.start-actions .ticket-mode');
    if(!button)return;
    const text=(button.textContent||'').replace(/\s+/g,' ').trim();
    if(!/1\s*jogador/i.test(text))return;
    retryEntry();
  },false);

  /* Last-resort watcher: every fresh solo game must enter the review exactly
     once. It keeps retrying until the review helper reports a real mount. */
  setInterval(guaranteeReview,40);
})();
