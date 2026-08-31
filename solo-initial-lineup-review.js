(()=>{
  const baseStartGame=window.startGame;
  if(typeof baseStartGame!=='function')return;

  let rendering=false;
  let starting=false;

  function reviewPending(){
    try{
      return !!(state&&state.mode==='cpu'&&!state.gameOver&&state.round===1&&state.__soloLineupReviewPending===true);
    }catch(_){return false}
  }

  function renderReview(){
    if(rendering||!reviewPending())return;
    rendering=true;
    try{
      if(typeof window.openDeck==='function')window.openDeck(false);
      else if(typeof openDeck==='function')openDeck(false);

      const root=document.querySelector('#modal-root');
      const card=root?.querySelector('.deck-modal-card');
      if(!card)return;

      const title=card.querySelector('.modal-head h2');
      if(title)title.textContent='Seu line-up';
      const help=card.querySelector('.modal-head .help');
      if(help)help.textContent='Confira suas 15 cartas. A ordem é fixa e não pode ser alterada.';

      card.querySelector('.modal-head .close')?.remove();
      card.querySelector('.solo-lineup-review-footer')?.remove();

      const footer=document.createElement('div');
      footer.className='deck-modal-footer solo-lineup-review-footer';
      footer.innerHTML='<div class="deck-modal-cta-stack"><button type="button" class="primary deck-modal-cta" data-solo-lineup-done>Entendi meu line-up</button></div>';
      card.appendChild(footer);
      footer.querySelector('[data-solo-lineup-done]')?.addEventListener('click',finishReview,{once:true});
    }catch(_){}finally{
      rendering=false;
    }
  }

  function finishReview(){
    if(!reviewPending())return;
    try{
      state.__soloLineupReviewPending=false;
      state.__openingHeadlinerResolved=false;
      state.phase='ROUND';
      state.initialHeadlinerPending=true;
      if(typeof closeModal==='function')closeModal();
      if(typeof renderGame==='function')renderGame();
    }catch(_){}
  }

  function startSoloWithReview(){
    if(starting)return;
    starting=true;
    try{
      /* Start from the canonical game setup, then immediately replace the old
         startup modal/timer with the dedicated 15-card line-up review. */
      baseStartGame.call(window,'cpu');
      if(typeof clearGameTimers==='function')clearGameTimers();
      if(!state||state.mode!=='cpu')return;

      state.__soloLineupReviewPending=true;
      state.__openingHeadlinerResolved=true;
      state.phase='SOLO_INITIAL_REVIEW';
      state.initialHeadlinerPending=false;
      renderReview();
    }catch(_){}finally{
      starting=false;
    }
  }

  window.finishSoloLineupReview=finishReview;
  window.startSoloWithReview=startSoloWithReview;

  /* Keep programmatic solo starts on the same path. */
  window.startGame=function(mode='cpu'){
    if(mode==='cpu')return startSoloWithReview();
    return baseStartGame.apply(this,arguments);
  };
  window.reset=startSoloWithReview;

  /* Most important: the original start-screen button has inline onclick=reset().
     Capture it before the legacy inline handler, so the first tap always enters
     the restored review even if an old global reset binding survives in cache. */
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.start-actions .ticket-mode');
    if(!button)return;
    const text=(button.textContent||'').replace(/\s+/g,' ').trim();
    if(!/1\s*jogador/i.test(text))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startSoloWithReview();
  },true);

  const baseRenderCurrentState=window.renderCurrentState;
  if(typeof baseRenderCurrentState==='function'){
    window.renderCurrentState=function(){
      if(reviewPending())return renderReview();
      return baseRenderCurrentState.apply(this,arguments);
    };
  }

  /* Protect the review from unrelated table renders until the user confirms. */
  setInterval(()=>{
    if(!reviewPending())return;
    if(!document.querySelector('#modal-root .solo-lineup-review-footer'))renderReview();
  },120);
})();
