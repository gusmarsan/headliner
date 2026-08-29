(function(){
  const network=window.HeadlinerNetwork;
  if(!network||typeof window.renderCurrentState!=='function')return;

  const baseRenderCurrentState=window.renderCurrentState;
  const baseMaybeStartEncore=typeof window.maybeStartEncore==='function'?window.maybeStartEncore:null;
  const runtime={warningShown:new Set(),warningTimer:null,finishing:false};

  function networkActive(){
    try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}
  }
  function lineupRound(round){
    const value=Number(round);
    return Number.isInteger(value)&&value>=1&&(value-1)%3===0;
  }
  function headCount(side){
    try{return player(side).head.filter(Boolean).length}catch(_){return 0}
  }
  function deadline(){
    const value=state?.lineupDeadline;
    if(!value||!value.chaserSide||!Number.isFinite(Number(value.lastChanceRound)))return null;
    return value;
  }
  function createDeadline(leaderSide,chaserSide){
    if(!state||deadline())return;
    state.encore=null;
    state.lineupDeadline={
      leaderSide,
      chaserSide,
      triggerRound:Number(state.round),
      lastChanceRound:Number(state.round)+3
    };
  }
  function reconcileDeadline(){
    if(!networkActive()||network.role!=='host'||!state||state.gameOver)return;
    const p1=headCount(P1),p2=headCount(P2),current=deadline();
    if(p1===3&&p2<3){
      if(!current)createDeadline(P1,P2);
      state.encore=null;
    }else if(p2===3&&p1<3){
      if(!current)createDeadline(P2,P1);
      state.encore=null;
    }
  }

  /* In the two-player game, completing the first festival no longer starts the
     legacy Encore countdown. The other player instead receives one complete
     three-round block and reaches the next lineup window as their last chance. */
  window.maybeStartEncore=function(side){
    if(!networkActive())return baseMaybeStartEncore?baseMaybeStartEncore(side):undefined;
    if(!state||state.gameOver)return;

    const p1=headCount(P1),p2=headCount(P2),current=deadline();
    if(p1===3&&p2<3){createDeadline(P1,P2);state.encore=null;return}
    if(p2===3&&p1<3){createDeadline(P2,P1);state.encore=null;return}

    if(p1===3&&p2===3){
      /* If both players complete the festival in the very same lineup window,
         preserve the old behaviour: the current confrontation can still resolve
         and the normal next-round check closes the match. If this happens at a
         previously announced last chance, the render hook below ends it there. */
      if(current&&Number(current.triggerRound)!==Number(state.round)){
        state.encore=null;
      }else{
        state.lineupDeadline=null;
        if(state.encore===null)state.encore=3;
      }
    }
  };

  function skipUnavailableLineup(){
    if(!networkActive()||network.role!=='host'||!state||state.phase!=='ROUND_PRIVATE'||lineupRound(state.round))return false;
    state.justLocked=null;
    state.privateSlot=null;
    state.privateConfirmIndex=null;
    state.privateOwner=null;
    state.privatePurpose='attribute';
    state.battleChooser=state.turn;
    state.actionLocked=false;
    state.phase='ATTRIBUTE';
    return true;
  }
  function replaceText(root,from,to){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    for(const textNode of nodes){
      if(textNode.nodeValue?.includes(from))textNode.nodeValue=textNode.nodeValue.replaceAll(from,to);
    }
  }
  function isLastChance(){
    const current=deadline();
    return !!(current&&Number(state?.round)===Number(current.lastChanceRound));
  }
  function decorateLineupHour(){
    if(!networkActive()||!state||state.phase!=='ROUND_PRIVATE'||!lineupRound(state.round))return;
    const root=document.querySelector('#app');
    if(!root)return;

    const lastChance=isLastChance();
    replaceText(root,'FASE DE HEADLINER',lastChance?'Última chance':'Hora da escalação');
    replaceText(root,'Sem novo Headliner nesta rodada',lastChance?'Sem novo Headliner na Última chance':'Sem novo Headliner nesta Hora da escalação');

    const panel=root.querySelector('.private-round-panel');
    if(panel&&!panel.querySelector('.lineup-hour-note')){
      const note=document.createElement('p');
      note.className=`lineup-hour-note${lastChance?' is-last-chance':''}`;
      note.textContent=lastChance
        ?'Última oportunidade para fechar o festival. Escolha até 1 Headliner ou siga sem escalar.'
        :'Escolha até 1 Headliner ou siga sem escalar. A decisão é opcional.';
      panel.insertBefore(note,panel.firstChild);
    }
    const skipButton=[...root.querySelectorAll('.private-round-actions button')].find(button=>/continuar sem escolher headliner/i.test(button.textContent||''));
    if(skipButton)skipButton.textContent='Seguir sem escalar';
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function warningKey(current){return `${state?.gameId??'game'}:${current.triggerRound}:${current.chaserSide}`}
  function showDeadlineWarning(){
    const current=deadline();
    if(!networkActive()||!state||!current||network.side!==current.chaserSide)return;
    if(Number(state.round)!==Number(current.triggerRound)||state.phase!=='ATTRIBUTE')return;

    const key=warningKey(current);
    if(runtime.warningShown.has(key))return;
    const screen=document.querySelector('#app .screen');
    if(!screen)return;

    runtime.warningShown.add(key);
    clearTimeout(runtime.warningTimer);
    document.querySelector('.lineup-deadline-alert')?.remove();
    const alert=document.createElement('div');
    alert.className='lineup-deadline-alert';
    alert.setAttribute('role','status');
    alert.innerHTML=`<strong>Atenção, ${escapeHtml(playerLabel(current.chaserSide))}!</strong><span>Você tem 3 rodadas pra fechar o festival.</span>`;
    screen.appendChild(alert);
    runtime.warningTimer=setTimeout(()=>alert.remove(),5200);
  }

  function finishAfterLastChance(){
    const current=deadline();
    if(!networkActive()||network.role!=='host'||!state||state.gameOver||runtime.finishing||!current)return false;
    if(Number(state.round)!==Number(current.lastChanceRound)||state.phase!=='ATTRIBUTE')return false;

    runtime.finishing=true;
    state.encore=null;
    state.lineupDeadline=null;
    setTimeout(()=>{runtime.finishing=false},0);
    finishGame();
    return true;
  }

  const style=document.createElement('style');
  style.textContent=`
    .lineup-hour-note{
      margin:0 auto 12px!important;
      max-width:520px;
      color:#276b55!important;
      font-size:11px!important;
      font-weight:900!important;
      letter-spacing:.055em;
      text-align:center;
      text-transform:uppercase;
    }
    .lineup-hour-note.is-last-chance{color:#a44836!important}
    .lineup-deadline-alert{
      position:absolute;
      left:50%;
      top:13%;
      z-index:80;
      width:min(430px,calc(100vw - 28px));
      transform:translateX(-50%) rotate(-.35deg);
      padding:13px 18px 12px;
      border:2px solid #7f432f;
      background:#f4dfaa;
      color:#173d49;
      box-shadow:6px 6px 0 rgba(97,48,35,.82),0 12px 28px rgba(0,0,0,.28);
      text-align:center;
      pointer-events:none;
      animation:lineupDeadlineIn .24s ease-out both;
    }
    .lineup-deadline-alert strong{
      display:block;
      margin-bottom:3px;
      color:#a44836;
      font-family:var(--display);
      font-size:27px;
      font-weight:700;
      line-height:.95;
      text-transform:none;
    }
    .lineup-deadline-alert span{
      display:block;
      font-family:var(--ui);
      font-size:13px;
      font-weight:850;
      line-height:1.25;
    }
    @keyframes lineupDeadlineIn{
      from{opacity:0;transform:translate(-50%,-8px) rotate(-.35deg) scale(.97)}
      to{opacity:1;transform:translate(-50%,0) rotate(-.35deg) scale(1)}
    }
    @media(max-width:760px){
      .lineup-deadline-alert{top:11%;padding:11px 13px 10px;width:calc(100vw - 24px)}
      .lineup-deadline-alert strong{font-size:24px}
      .lineup-deadline-alert span{font-size:12px}
    }
  `;
  document.head.appendChild(style);

  window.renderCurrentState=function(){
    reconcileDeadline();
    if(finishAfterLastChance())return;

    const skipped=skipUnavailableLineup();
    const result=baseRenderCurrentState.apply(this,arguments);
    if(!skipped)decorateLineupHour();
    showDeadlineWarning();
    return result;
  };
})();
