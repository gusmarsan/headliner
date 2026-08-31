(()=>{
  let takeoverTimer=null;

  function cpuStateReady(){
    try{
      return !!(state&&state.mode==='cpu'&&!state.gameOver&&state.round===1&&state.players?.p1?.deck?.length);
    }catch(_){return false}
  }

  function reviewPending(){
    try{return cpuStateReady()&&state.__soloLineupReviewPending===true}
    catch(_){return false}
  }

  function injectStyles(){
    if(document.querySelector('style[data-solo-lineup-review-actions]'))return;
    const style=document.createElement('style');
    style.dataset.soloLineupReviewActions='1';
    style.textContent=`
      .solo-initial-lineup-review .solo-lineup-review-actions{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
        flex-wrap:wrap!important;
      }
      .solo-initial-lineup-review .solo-lineup-headliner-action{
        background:#a92d2d!important;
        border:2px solid #7d1f1f!important;
        color:#f6e7c7!important;
      }
      @media (max-width:760px){
        .solo-initial-lineup-review .solo-lineup-review-actions{
          gap:8px!important;
        }
        .solo-initial-lineup-review .solo-lineup-review-actions button{
          min-height:42px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function lineupCardsHTML(){
    const deck=state.players.p1.deck;
    return `<div class="private-deck-grid">${deck.map((card,index)=>`
      <article class="private-deck-item">
        <div class="position">${index===0?'Próxima carta':`Artista ${index+1}`}</div>
        <div class="private-card-button" aria-label="${card.name}, posição ${index+1}">
          ${typeof liveCardHTML==='function'?liveCardHTML(card,'deck'):''}
        </div>
      </article>`).join('')}</div>`;
  }

  function reviewActionsHTML(){
    return `<div class="private-round-actions solo-lineup-review-actions">
      <button type="button" class="primary" data-solo-lineup-done>Entendi meu line-up</button>
      <button type="button" class="secondary solo-lineup-headliner-action" data-solo-lineup-headliner>Escolher Headliner</button>
    </div>`;
  }

  function renderReview(){
    if(!reviewPending())return false;
    try{
      injectStyles();
      if(typeof closeModal==='function')closeModal();
      const app=document.querySelector('#app');
      if(!app)return false;

      app.innerHTML=`<main class="private-deck-screen solo-initial-lineup-review" aria-label="Seu line-up inicial">
        <div class="private-deck-shell">
          <div class="private-deck-head">
            <div>
              <span class="privacy-kicker">Consulta inicial</span>
              <h1>SEU LINE-UP</h1>
              <p>Confira suas 15 cartas. A ordem é fixa e não pode ser alterada.</p>
            </div>
          </div>
          ${reviewActionsHTML()}
          ${lineupCardsHTML()}
          ${reviewActionsHTML()}
        </div>
      </main>`;

      app.querySelectorAll('[data-solo-lineup-done]').forEach(button=>{
        button.addEventListener('click',finishReview,{once:true});
      });
      app.querySelectorAll('[data-solo-lineup-headliner]').forEach(button=>{
        button.addEventListener('click',chooseInitialHeadliner,{once:true});
      });
      return true;
    }catch(_){return false}
  }

  function takeOverFreshSolo(){
    if(!cpuStateReady())return false;
    try{
      /* reset()/startGame() have already created the canonical 30-card match.
         Stop only the legacy opening timer, then replace the table with a real
         review phase. No wrapping of startGame/reset is required. */
      if(typeof clearGameTimers==='function')clearGameTimers();
      state.__soloLineupReviewPending=true;
      state.__openingHeadlinerResolved=true;
      state.phase='SOLO_INITIAL_REVIEW';
      state.initialHeadlinerPending=false;
      state.actionLocked=false;
      return renderReview();
    }catch(_){return false}
  }

  function leaveReview(openHeadliner=false){
    if(!reviewPending())return;
    try{
      /* The opening Headliner opportunity now lives entirely inside this review.
         Once either action is chosen, never recreate the old blue table plaque. */
      state.__soloLineupReviewPending=false;
      state.__openingHeadlinerResolved=true;
      state.phase='ROUND';
      state.initialHeadlinerPending=false;
      state.actionLocked=false;
      if(typeof closeModal==='function')closeModal();
      if(typeof renderGame==='function')renderGame();

      if(openHeadliner){
        const slot=[0,1,2].find(i=>!player(P1).head[i]);
        if(slot!==undefined){
          setTimeout(()=>{
            try{
              if(!state||state.mode!=='cpu'||state.gameOver||state.round!==1)return;
              if(typeof window.openDeck==='function')window.openDeck(false,slot);
              else if(typeof openDeck==='function')openDeck(false,slot);
            }catch(_){}
          },0);
        }
      }
    }catch(_){}
  }

  function finishReview(){
    leaveReview(false);
  }

  function chooseInitialHeadliner(){
    leaveReview(true);
  }

  window.finishSoloLineupReview=finishReview;
  window.chooseSoloInitialHeadliner=chooseInitialHeadliner;
  window.restoreSoloLineupReview=takeOverFreshSolo;

  /* The original 1-player button runs reset() synchronously on the target.
     This bubbling listener runs immediately afterwards, when the shuffled state
     already exists, so the review cannot be skipped by global-binding issues. */
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.start-actions .ticket-mode');
    if(!button)return;
    const text=(button.textContent||'').replace(/\s+/g,' ').trim();
    if(!/1\s*jogador/i.test(text))return;

    clearTimeout(takeoverTimer);
    takeoverTimer=setTimeout(()=>{
      takeoverTimer=null;
      takeOverFreshSolo();
    },0);
  },false);

  /* Replays can invoke startGame without passing through the start screen.
     If a brand-new CPU match is detected with the legacy opening pending and no
     selected attribute/headliner yet, convert it to the same review once. */
  let seenGameId=null;
  setInterval(()=>{
    try{
      if(!cpuStateReady())return;
      if(state.gameId===seenGameId){
        if(reviewPending()&&!document.querySelector('.solo-initial-lineup-review'))renderReview();
        return;
      }
      seenGameId=state.gameId;
      if(state.selectedAttr==null&&state.revealed===false&&
         state.players.p1.head.filter(Boolean).length===0&&
         state.initialHeadlinerPending===true){
        takeOverFreshSolo();
      }
    }catch(_){}
  },80);
})();
