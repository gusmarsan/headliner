(function(){
  const network=window.HeadlinerNetwork;
  if(!network||typeof window.renderCurrentState!=='function')return;

  const baseRenderCurrentState=window.renderCurrentState;

  function networkActive(){
    try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}
  }
  function lineupRound(round){
    const value=Number(round);
    return Number.isInteger(value)&&value>=1&&(value-1)%3===0;
  }
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
  function decorateLineupHour(){
    if(!networkActive()||!state||state.phase!=='ROUND_PRIVATE'||!lineupRound(state.round))return;
    const root=document.querySelector('#app');
    if(!root)return;
    replaceText(root,'FASE DE HEADLINER','HORA DA ESCALAÇÃO');
    replaceText(root,'Sem novo Headliner nesta rodada','Sem novo Headliner nesta Hora da escalação');
    const header=root.querySelector('.private-deck-shell');
    const panel=root.querySelector('.private-round-panel');
    if(panel&&!panel.querySelector('.lineup-hour-note')){
      const note=document.createElement('p');
      note.className='lineup-hour-note';
      note.textContent='Escolha até 1 Headliner ou siga sem escalar. A decisão é opcional.';
      panel.insertBefore(note,panel.firstChild);
    }
    const skipButton=[...root.querySelectorAll('.private-round-actions button')].find(button=>/continuar sem escolher headliner/i.test(button.textContent||''));
    if(skipButton)skipButton.textContent='Seguir sem escalar';
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
  `;
  document.head.appendChild(style);

  window.renderCurrentState=function(){
    const skipped=skipUnavailableLineup();
    const result=baseRenderCurrentState.apply(this,arguments);
    if(!skipped)decorateLineupHour();
    return result;
  };
})();
