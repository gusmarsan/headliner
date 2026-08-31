(()=>{
  const baseStartGame=window.startGame;
  if(typeof baseStartGame!=='function')return;

  let rendering=false;

  function reviewPending(){
    try{
      return !!(state&&state.mode==='cpu'&&!state.gameOver&&state.round===1&&state.__soloLineupReviewPending===true);
    }catch(_){return false}
  }

  function renderReview(){
    if(rendering||!reviewPending())return;
    rendering=true;
    try{
      /* Reuse the game's own deck viewer, but keep this as a pure review step.
         Headliner choice happens only after the player confirms the line-up. */
      if(typeof window.openDeck==='function')window.openDeck(false);
      else if(typeof openDeck==='function')openDeck(false);

      const root=document.querySelector('#modal-root');
      const card=root?.querySelector('.deck-modal-card');
      if(!card)return;

      const title=card.querySelector('.modal-head h2');
      if(title)title.textContent='Seu line-up';
      const help=card.querySelector('.modal-head .help');
      if(help)help.textContent='Confira suas 15 cartas. A ordem é fixa e não pode ser alterada.';

      /* This opening screen is intentionally completed by the explicit CTA,
         not by the generic modal X. */
      card.querySelector('.modal-head .close')?.remove();

      card.querySelector('.solo-lineup-review-footer')?.remove();
      const footer=document.createElement('div');
      footer.className='deck-modal-footer solo-lineup-review-footer';
      footer.innerHTML='<div class="deck-modal-cta-stack"><button type="button" class="primary deck-modal-cta" data-solo-lineup-done>Entendi meu line-up</button></div>';
      card.appendChild(footer);

      footer.querySelector('[data-solo-lineup-done]')?.addEventListener('click',finishReview,{once:true});
    }catch(_){
    }finally{
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

  window.finishSoloLineupReview=finishReview;

  window.startGame=function(mode='cpu'){
    const result=baseStartGame.apply(this,arguments);
    try{
      if(mode!=='cpu'||!state)return result;

      /* The canonical startGame still schedules the legacy opening deck modal.
         Cancel that single startup timer and replace it with the dedicated
         line-up review so the first Headliner offer remains a separate choice. */
      if(typeof clearGameTimers==='function')clearGameTimers();
      state.__soloLineupReviewPending=true;
      state.__openingHeadlinerResolved=true;
      state.phase='SOLO_INITIAL_REVIEW';
      state.initialHeadlinerPending=false;
      renderReview();
    }catch(_){}
    return result;
  };

  /* reset() was declared before this runtime patch. Point it explicitly at the
     wrapped starter so both first play and replay use the restored review. */
  window.reset=function(){window.startGame('cpu')};

  const baseRenderCurrentState=window.renderCurrentState;
  if(typeof baseRenderCurrentState==='function'){
    window.renderCurrentState=function(){
      if(reviewPending())return renderReview();
      return baseRenderCurrentState.apply(this,arguments);
    };
  }

  /* If another render path clears the modal while the review is still pending,
     restore it without allowing the table to consume this opening step. */
  setInterval(()=>{
    if(!reviewPending())return;
    if(!document.querySelector('#modal-root .solo-lineup-review-footer'))renderReview();
  },120);
})();
