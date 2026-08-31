(()=>{
  function freshOpening(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.round===1 &&
        state.revealed===false && state.selectedAttr==null &&
        state.__soloLineupReviewCompleted!==true &&
        state.players?.p1?.deck?.length>0 &&
        state.players.p1.head.filter(Boolean).length===0;
    }catch(_){return false}
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[char]);
  }

  function safeCard(card,index){
    let visual='';
    try{
      if(typeof liveCardHTML==='function')visual=liveCardHTML(card,'deck')||'';
    }catch(_){}
    if(!visual){
      visual=`<div style="width:150px;min-height:210px;border-radius:12px;background:#f1e3bc;color:#173945;padding:18px 12px;display:grid;place-items:center;text-align:center;font-weight:900;box-shadow:0 10px 24px rgba(0,0,0,.25)">${escapeHtml(card?.name||`Carta ${index+1}`)}</div>`;
    }
    return `<article class="private-deck-item">
      <div class="position">${index===0?'Próxima carta':`Artista ${index+1}`}</div>
      <div class="private-card-button" aria-label="${escapeHtml(card?.name||`Carta ${index+1}`)}, posição ${index+1}">${visual}</div>
    </article>`;
  }

  function finishFallback(){
    try{
      state.__soloLineupReviewCompleted=true;
      if(typeof window.finishSoloLineupReview==='function'){
        window.finishSoloLineupReview();
        return;
      }
      state.__soloLineupReviewPending=false;
      state.__soloLineupChoosingHeadliner=false;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='ROUND';
      state.actionLocked=false;
      if(typeof renderGame==='function')renderGame();
    }catch(_){}
  }

  function chooseFallbackHeadliner(){
    try{
      if(typeof window.chooseSoloInitialHeadliner==='function'){
        window.chooseSoloInitialHeadliner();
        setTimeout(ensure,0);
        return;
      }
    }catch(_){}
  }

  function hardRender(){
    if(!freshOpening())return false;
    try{
      const app=document.querySelector('#app');
      if(!app)return false;
      const deck=state.players.p1.deck;
      state.__soloLineupReviewPending=true;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='SOLO_INITIAL_REVIEW';
      state.actionLocked=false;

      app.innerHTML=`<main class="private-deck-screen solo-initial-lineup-review solo-lineup-hard-fallback" aria-label="Seu line-up inicial">
        <div class="private-deck-shell">
          <div class="private-deck-head"><div>
            <span class="privacy-kicker">Consulta inicial</span>
            <h1>SEU LINE-UP</h1>
            <p>Confira suas 15 cartas. A ordem é fixa e não pode ser alterada.</p>
          </div></div>
          <div class="private-round-actions solo-lineup-review-actions" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
            <button type="button" class="primary" data-hard-lineup-done>Entendi meu line-up</button>
            <button type="button" class="secondary solo-lineup-headliner-action" data-hard-lineup-headliner style="background:#a92d2d;border:2px solid #7d1f1f;color:#f6e7c7">Escolher Headliner</button>
          </div>
          <div class="private-deck-grid">${deck.map(safeCard).join('')}</div>
          <div class="private-round-actions solo-lineup-review-actions" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
            <button type="button" class="primary" data-hard-lineup-done>Entendi meu line-up</button>
            <button type="button" class="secondary solo-lineup-headliner-action" data-hard-lineup-headliner style="background:#a92d2d;border:2px solid #7d1f1f;color:#f6e7c7">Escolher Headliner</button>
          </div>
        </div>
      </main>`;
      app.querySelectorAll('[data-hard-lineup-done]').forEach(button=>button.addEventListener('click',finishFallback,{once:true}));
      app.querySelectorAll('[data-hard-lineup-headliner]').forEach(button=>button.addEventListener('click',chooseFallbackHeadliner,{once:true}));
      return true;
    }catch(_){return false}
  }

  function ensure(){
    if(!freshOpening())return false;
    try{if(typeof clearGameTimers==='function')clearGameTimers()}catch(_){}

    if(document.querySelector('.solo-initial-lineup-review'))return true;

    try{
      if(typeof window.restoreSoloLineupReview==='function'){
        window.restoreSoloLineupReview();
        if(document.querySelector('.solo-initial-lineup-review'))return true;
      }
    }catch(_){}

    return hardRender();
  }

  /* Mark the review as consumed before the existing handlers redraw the table. */
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-solo-lineup-done],[data-hard-lineup-done],[data-solo-headliner-confirm]')){
      try{if(state?.mode==='cpu')state.__soloLineupReviewCompleted=true}catch(_){}
    }
  },true);

  /* The solo button's inline reset runs during the same click. Queue ownership
     just after it, then retry while the fresh round-one state settles. */
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.start-actions .ticket-mode');
    if(!button)return;
    const text=(button.textContent||'').replace(/\s+/g,' ').trim();
    if(!/1\s*jogador/i.test(text))return;
    setTimeout(ensure,0);
    setTimeout(ensure,25);
    setTimeout(ensure,100);
    setTimeout(ensure,300);
  },true);

  /* Also covers Jogar novamente/reset paths that do not pass through the menu. */
  setInterval(ensure,80);
})();
