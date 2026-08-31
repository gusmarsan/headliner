(()=>{
  const BUTTON_SELECTOR='[data-solo-lineup-headliner],[data-hard-lineup-headliner]';

  function openingScreen(){
    const screen=document.querySelector('.solo-initial-lineup-review');
    try{
      if(!screen||!state||state.mode!=='cpu'||state.gameOver||state.round!==1)return null;
      return screen;
    }catch(_){return null}
  }

  function injectStyles(){
    if(document.querySelector('style[data-solo-lineup-headliner-click-fix]'))return;
    const style=document.createElement('style');
    style.dataset.soloLineupHeadlinerClickFix='1';
    style.textContent=`
      .solo-initial-lineup-review .solo-lineup-review-actions,
      .solo-initial-lineup-review .private-round-actions{
        position:relative!important;
        z-index:10000!important;
        pointer-events:auto!important;
      }
      .solo-initial-lineup-review [data-solo-lineup-headliner],
      .solo-initial-lineup-review [data-hard-lineup-headliner],
      .solo-initial-lineup-review [data-authoritative-lineup-cancel]{
        position:relative!important;
        z-index:10001!important;
        pointer-events:auto!important;
        cursor:pointer!important;
        touch-action:manipulation!important;
        user-select:none!important;
      }
      .solo-initial-lineup-review.is-choosing-headliner .private-deck-item{
        cursor:pointer!important;
        pointer-events:auto!important;
      }
      .solo-initial-lineup-review.is-choosing-headliner .private-card-button{
        cursor:pointer!important;
        pointer-events:auto!important;
      }
      .solo-initial-lineup-review.is-choosing-headliner .private-deck-item:hover{
        border-color:rgba(169,45,45,.75)!important;
        background:rgba(169,45,45,.08)!important;
        transform:translateY(-3px);
      }
      .solo-headliner-choice-note{
        margin:10px auto 14px!important;
        color:#fff!important;
        font-weight:900!important;
        text-align:center!important;
      }
    `;
    document.head.appendChild(style);
  }

  function forceChoiceState(){
    try{
      state.__soloLineupReviewPending=true;
      state.__soloLineupReviewCompleted=false;
      state.__soloLineupChoosingHeadliner=true;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='SOLO_INITIAL_REVIEW';
      state.actionLocked=false;
      return true;
    }catch(_){return false}
  }

  function restoreReview(){
    try{
      state.__soloLineupReviewPending=true;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='SOLO_INITIAL_REVIEW';
      state.actionLocked=false;
      if(typeof window.restoreSoloLineupReview==='function'){
        window.restoreSoloLineupReview();
        return;
      }
    }catch(_){}
  }

  function confirmHeadliner(index){
    try{
      const owner=player(P1);
      const slot=[0,1,2].find(i=>!owner.head[i]);
      if(slot===undefined||!Number.isInteger(index)||!owner.deck[index])return false;
      state.actionLocked=true;
      const card=typeof commitHeadliner==='function'?commitHeadliner(P1,index,slot):null;
      if(!card){state.actionLocked=false;return false}

      state.__soloLineupReviewPending=false;
      state.__soloLineupReviewCompleted=true;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='ROUND';
      state.justLocked=null;
      state.actionLocked=false;
      if(typeof closeModal==='function')closeModal();
      if(typeof renderGame==='function')renderGame();
      if(typeof toast==='function')toast(`${card.name} agora é Headliner. 🔒`);
      return true;
    }catch(_){
      try{state.actionLocked=false}catch(__){}
      return false;
    }
  }

  function showConfirm(index){
    if(!forceChoiceState())return false;
    try{
      const owner=player(P1),card=owner?.deck?.[index];
      if(!card)return false;
      state.__soloLineupConfirmIndex=index;
      const app=document.querySelector('#app');
      if(!app)return false;
      const audience=typeof fmt==='function'?fmt(card.pub):Number(card.pub||0).toLocaleString('pt-BR');
      const visual=typeof liveCardHTML==='function'?liveCardHTML(card,'confirm'):'';
      app.innerHTML=`<main class="private-deck-screen solo-initial-lineup-review" aria-label="Confirmar Headliner">
        <section class="private-confirm solo-initial-headliner-confirm">
          <span class="privacy-kicker">SEU LINE-UP · PRIMEIRO HEADLINER</span>
          <h1>Travar como Headliner?</h1>
          <div class="private-confirm-card">${visual}</div>
          <p><strong>${card.name}</strong> garante <strong>${audience} pessoas</strong> no seu festival e sai definitivamente do monte.</p>
          <div class="private-confirm-actions">
            <button type="button" class="secondary" data-authoritative-headliner-back>Voltar</button>
            <button type="button" class="primary" data-authoritative-headliner-confirm>Confirmar Headliner</button>
          </div>
        </section>
      </main>`;
      app.querySelector('[data-authoritative-headliner-back]')?.addEventListener('click',()=>{
        restoreReview();
        setTimeout(enterChoiceMode,0);
      },{once:true});
      app.querySelector('[data-authoritative-headliner-confirm]')?.addEventListener('click',()=>confirmHeadliner(index),{once:true});
      return true;
    }catch(_){return false}
  }

  function wireCards(screen){
    const cards=[...screen.querySelectorAll('.private-deck-grid .private-deck-item')];
    cards.forEach((item,index)=>{
      item.dataset.authoritativeHeadlinerIndex=String(index);
      item.setAttribute('role','button');
      item.setAttribute('tabindex','0');
      item.style.setProperty('pointer-events','auto','important');
      const inner=item.querySelector('.private-card-button');
      if(inner){
        inner.style.setProperty('pointer-events','auto','important');
        if('disabled' in inner)inner.disabled=false;
      }
      if(item.dataset.authoritativeHeadlinerWired==='1')return;
      item.dataset.authoritativeHeadlinerWired='1';
      const activate=event=>{
        event.preventDefault();
        event.stopPropagation();
        showConfirm(index);
      };
      item.addEventListener('click',activate,true);
      item.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        activate(event);
      },true);
    });
  }

  function enterChoiceMode(){
    const screen=openingScreen();
    if(!screen||!forceChoiceState())return false;
    injectStyles();
    screen.classList.add('is-choosing-headliner');

    const headerText=screen.querySelector('.private-deck-head p');
    if(headerText)headerText.textContent='Escolha qualquer uma das suas 15 cartas para ser seu primeiro Headliner.';

    if(!screen.querySelector('.solo-headliner-choice-note')){
      const note=document.createElement('p');
      note.className='solo-headliner-choice-note';
      note.textContent='Toque na carta que você quer reservar como Headliner.';
      const firstActions=screen.querySelector('.solo-lineup-review-actions,.private-round-actions');
      if(firstActions)firstActions.before(note);
      else screen.querySelector('.private-deck-shell')?.prepend(note);
    }

    screen.querySelectorAll('.solo-lineup-review-actions,.private-round-actions').forEach(actions=>{
      actions.innerHTML='<button type="button" class="secondary" data-authoritative-lineup-cancel>Voltar ao line-up</button>';
      actions.querySelector('[data-authoritative-lineup-cancel]')?.addEventListener('click',restoreReview,{once:true});
    });

    wireCards(screen);
    return true;
  }

  function buttonAt(event){
    const direct=event.target?.closest?.(BUTTON_SELECTOR);
    if(direct)return direct;
    const x=Number(event.clientX),y=Number(event.clientY);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    return [...document.querySelectorAll(BUTTON_SELECTOR)].find(button=>{
      const rect=button.getBoundingClientRect();
      return rect.width>0&&rect.height>0&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
    })||null;
  }

  function intercept(event){
    if(!openingScreen())return;
    const button=buttonAt(event);
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterChoiceMode();
  }

  /* Use pointerdown so the action happens before any legacy click handler or
     overlay can consume the interaction. Keyboard activation remains covered by
     click. */
  document.addEventListener('pointerdown',intercept,true);
  document.addEventListener('click',event=>{
    if(event.detail!==0)return;
    intercept(event);
  },true);

  function wireButtons(){
    injectStyles();
    document.querySelectorAll(BUTTON_SELECTOR).forEach(button=>{
      button.disabled=false;
      button.style.setProperty('pointer-events','auto','important');
      button.style.setProperty('z-index','10001','important');
    });
  }

  wireButtons();
  new MutationObserver(wireButtons).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(wireButtons,120);
})();
