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

  /* The canonical startGame already has all 15 cards when it returns. Take the
     solo screen over immediately at that exact point. restoreSoloLineupReview()
     clears the legacy 450 ms openDeck timer before it can replace this screen. */
  const baseStartGame=window.startGame;
  if(typeof baseStartGame==='function'){
    window.startGame=function(mode='cpu'){
      const result=baseStartGame.apply(this,arguments);
      if(mode==='cpu')retryEntry();
      return result;
    };
  }

  /* Keep direct reset/play-again hooks as fallback for browsers whose global
     function binding was captured before startGame was replaced. */
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

  setInterval(guaranteeReview,40);
})();
