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
    if(!freshSoloState())return;
    const gameId=state.gameId;
    if(gameId==null || gameId===handledGameId)return;
    handledGameId=gameId;

    /* The main review script may already have taken over through the 1-player
       click. If so, just remember this game. Otherwise force the review once,
       without relying on initialHeadlinerPending (which older helpers can clear). */
    if(state.__soloLineupReviewPending===true)return;
    try{
      if(typeof window.restoreSoloLineupReview==='function'){
        window.restoreSoloLineupReview();
      }
    }catch(_){}
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.start-actions .ticket-mode');
    if(!button)return;
    const text=(button.textContent||'').replace(/\s+/g,' ').trim();
    if(!/1\s*jogador/i.test(text))return;
    setTimeout(guaranteeReview,0);
    setTimeout(guaranteeReview,40);
  },false);

  setInterval(guaranteeReview,40);
})();
