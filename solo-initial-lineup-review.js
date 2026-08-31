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

  function choosingHeadliner(){
    try{return reviewPending()&&state.__soloLineupChoosingHeadliner===true}
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
      .solo-initial-lineup-review.is-choosing-headliner .private-deck-item{
        cursor:pointer;
      }
      .solo-initial-lineup-review.is-choosing-headliner .private-card-button{
        cursor:pointer!important;
      }
      .solo-initial-lineup-review.is-choosing-headliner .private-deck-item:hover{
        border-color:rgba(169,45,45,.75)!important;
        background:rgba(169,45,45,.08)!important;
        transform:translateY(-3px);
      }
      .solo-headliner-choice-note{
        margin:10px auto 14px!important;
        color:#ffffff!important;
        font-weight:900!important;
        text-align:center!important;
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
    const selectable=choosingHeadliner();
    return `<div class="private-deck-grid">${deck.map((card,index)=>`
      <article class="private-deck-item" ${selectable?`data-solo-headliner-card="${index}" role="button" tabindex="0" aria-label="Escolher ${card.name} como Headliner"`:''}>
        <div class="position">${index===0?'Próxima carta':`Artista ${index+1}`}</div>
        <div class="private-card-button" aria-label="${card.name}, posição ${index+1}">
          ${typeof liveCardHTML==='function'?liveCardHTML(card,'deck'):''}
        </div>
      </article>`).join('')}</div>`;
  }

  function reviewActionsHTML(){
    if(choosingHeadliner()){
      return `<div class="private-round-actions solo-lineup-review-actions">
        <button type="button" class="secondary" data-solo-lineup-cancel-headliner>Voltar ao line-up</button>
      </div>`;
    }
    return `<div class="private-round-actions solo-lineup-review-actions">
      <button type="button" class="primary" data-solo-lineup-done>Entendi meu line-up</button>
      <button type="button" class="secondary solo-lineup-headliner-action" data-solo-lineup-headliner>Escolher Headliner</button>
    </div>`;
  }

  function wireReviewActions(app){
    app.querySelectorAll('[data-solo-lineup-done]').forEach(button=>{
      button.addEventListener('click',finishReview,{once:true});
    });
    app.querySelectorAll('[data-solo-lineup-headliner]').forEach(button=>{
      button.addEventListener('click',chooseInitialHeadliner,{once:true});
    });
    app.querySelectorAll('[data-solo-lineup-cancel-headliner]').forEach(button=>{
      button.addEventListener('click',cancelInitialHeadlinerChoice,{once:true});
    });
    app.querySelectorAll('[data-solo-headliner-card]').forEach(item=>{
      const activate=()=>previewInitialHeadliner(Number(item.dataset.soloHeadlinerCard));
      item.addEventListener('click',activate);
      item.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();
        activate();
      });
    });
  }

  function renderReview(){
    if(!reviewPending())return false;
    try{
      injectStyles();
      if(typeof closeModal==='function')closeModal();
      const app=document.querySelector('#app');
      if(!app)return false;
      const selecting=choosingHeadliner();

      app.innerHTML=`<main class="private-deck-screen solo-initial-lineup-review ${selecting?'is-choosing-headliner':''}" aria-label="Seu line-up inicial">
        <div class="private-deck-shell">
          <div class="private-deck-head">
            <div>
              <span class="privacy-kicker">Consulta inicial</span>
              <h1>SEU LINE-UP</h1>
              <p>${selecting?'Escolha qualquer uma das suas 15 cartas para ser seu primeiro Headliner.':'Confira suas 15 cartas. A ordem é fixa e não pode ser alterada.'}</p>
            </div>
          </div>
          ${selecting?'<p class="solo-headliner-choice-note">Toque na carta que você quer reservar como Headliner.</p>':''}
          ${reviewActionsHTML()}
          ${lineupCardsHTML()}
          ${reviewActionsHTML()}
        </div>
      </main>`;

      wireReviewActions(app);
      return true;
    }catch(_){return false}
  }

  function renderInitialHeadlinerConfirm(index){
    if(!choosingHeadliner())return false;
    try{
      const owner=player(P1),card=owner?.deck?.[index];
      if(!card)return false;
      state.__soloLineupConfirmIndex=index;
      const app=document.querySelector('#app');
      if(!app)return false;
      const audience=typeof fmt==='function'?fmt(card.pub):Number(card.pub||0).toLocaleString('pt-BR');
      app.innerHTML=`<main class="private-deck-screen solo-initial-lineup-review" aria-label="Confirmar Headliner">
        <section class="private-confirm solo-initial-headliner-confirm">
          <span class="privacy-kicker">SEU LINE-UP · PRIMEIRO HEADLINER</span>
          <h1>Travar como Headliner?</h1>
          <div class="private-confirm-card">${typeof liveCardHTML==='function'?liveCardHTML(card,'confirm'):''}</div>
          <p><strong>${card.name}</strong> garante <strong>${audience} pessoas</strong> no seu festival e sai definitivamente do monte.</p>
          <div class="private-confirm-actions">
            <button type="button" class="secondary" data-solo-headliner-confirm-back>Voltar</button>
            <button type="button" class="primary" data-solo-headliner-confirm>Confirmar Headliner</button>
          </div>
        </section>
      </main>`;
      app.querySelector('[data-solo-headliner-confirm-back]')?.addEventListener('click',()=>{
        state.__soloLineupConfirmIndex=null;
        renderReview();
      },{once:true});
      app.querySelector('[data-solo-headliner-confirm]')?.addEventListener('click',confirmInitialHeadliner,{once:true});
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
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.phase='SOLO_INITIAL_REVIEW';
      state.initialHeadlinerPending=false;
      state.actionLocked=false;
      return renderReview();
    }catch(_){return false}
  }

  function leaveReview(){
    if(!reviewPending())return;
    try{
      state.__soloLineupReviewPending=false;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.phase='ROUND';
      state.initialHeadlinerPending=false;
      state.actionLocked=false;
      if(typeof closeModal==='function')closeModal();
      if(typeof renderGame==='function')renderGame();
    }catch(_){}
  }

  function finishReview(){
    leaveReview();
  }

  function chooseInitialHeadliner(){
    if(!reviewPending())return;
    try{
      state.__soloLineupChoosingHeadliner=true;
      state.__soloLineupConfirmIndex=null;
      renderReview();
    }catch(_){}
  }

  function cancelInitialHeadlinerChoice(){
    if(!reviewPending())return;
    try{
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      renderReview();
    }catch(_){}
  }

  function previewInitialHeadliner(index){
    if(!choosingHeadliner())return;
    renderInitialHeadlinerConfirm(index);
  }

  function confirmInitialHeadliner(){
    if(!reviewPending())return;
    try{
      const index=Number(state.__soloLineupConfirmIndex);
      const owner=player(P1);
      const slot=[0,1,2].find(i=>!owner.head[i]);
      if(slot===undefined||!Number.isInteger(index)||!owner.deck[index]){
        state.__soloLineupConfirmIndex=null;
        renderReview();
        return;
      }
      state.actionLocked=true;
      const card=typeof commitHeadliner==='function'?commitHeadliner(P1,index,slot):null;
      if(!card){
        state.actionLocked=false;
        state.__soloLineupConfirmIndex=null;
        renderReview();
        return;
      }
      state.__soloLineupReviewPending=false;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.phase='ROUND';
      state.initialHeadlinerPending=false;
      state.justLocked=null;
      state.actionLocked=false;
      if(typeof closeModal==='function')closeModal();
      if(typeof renderGame==='function')renderGame();
      if(typeof toast==='function')toast(`${card.name} agora é Headliner. 🔒`);
    }catch(_){
      try{state.actionLocked=false}catch(__){}}
    }
  }

  window.finishSoloLineupReview=finishReview;
  window.chooseSoloInitialHeadliner=chooseInitialHeadliner;
  window.restoreSoloLineupReview=takeOverFreshSolo;

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

  let seenGameId=null;
  setInterval(()=>{
    try{
      if(!cpuStateReady())return;
      if(state.gameId===seenGameId){
        if(reviewPending()&&!document.querySelector('.solo-initial-lineup-review')){
          if(Number.isInteger(state.__soloLineupConfirmIndex))renderInitialHeadlinerConfirm(state.__soloLineupConfirmIndex);
          else renderReview();
        }
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
