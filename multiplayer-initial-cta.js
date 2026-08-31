(function(){
  const network=window.HeadlinerNetwork;
  if(!network||typeof window.renderCurrentState!=='function')return;

  const baseRenderCurrentState=window.renderCurrentState;
  let decisionGame='';
  let wantsHeadliner=null;
  let autoSkipSentForGame='';

  function networkActive(){
    try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}
  }

  function gameKey(){
    try{return String(state?.gameId??'none')}catch(_){return 'none'}
  }

  function resetDecisionIfNeeded(){
    if(!networkActive()||!state)return;
    const key=gameKey();
    if(state.phase==='INITIAL_REVIEW'&&decisionGame!==key){
      decisionGame=key;
      wantsHeadliner=null;
      autoSkipSentForGame='';
    }
  }

  window.networkInitialReviewDecision=function(scale){
    if(!networkActive()||!state||state.phase!=='INITIAL_REVIEW')return;
    decisionGame=gameKey();
    wantsHeadliner=!!scale;
    if(typeof window.finishInitialReview==='function')window.finishInitialReview();
  };

  function refineInitialReviewCta(){
    resetDecisionIfNeeded();
    if(!networkActive()||!state||state.phase!=='INITIAL_REVIEW')return;
    const root=document.querySelector('#app');
    if(!root)return;

    const actionRows=[...root.querySelectorAll('.private-round-actions')];
    if(!actionRows.length)return;

    const first=actionRows[0];
    const alreadyReady=!first.querySelector('button');
    if(alreadyReady)return;

    first.innerHTML=`<button class="secondary" type="button" onclick="networkInitialReviewDecision(false)">Entendi meu line-up</button><button class="primary" type="button" onclick="networkInitialReviewDecision(true)">Escalar</button>`;
    actionRows.slice(1).forEach(row=>row.remove());
  }

  function applyInitialDecision(){
    if(!networkActive()||!state)return;
    const key=gameKey();
    if(decisionGame!==key||wantsHeadliner!==false)return;
    if(state.phase!=='ROUND_PRIVATE'||Number(state.round)!==1)return;
    if(autoSkipSentForGame===key)return;
    if(typeof window.finishPrivateRound!=='function')return;

    autoSkipSentForGame=key;
    setTimeout(()=>{
      try{
        if(networkActive()&&state?.phase==='ROUND_PRIVATE'&&Number(state?.round)===1){
          window.finishPrivateRound(network.side);
        }
      }catch(_){}
    },0);
  }

  window.renderCurrentState=function(){
    const result=baseRenderCurrentState.apply(this,arguments);
    refineInitialReviewCta();
    applyInitialDecision();
    return result;
  };

  const observer=new MutationObserver(()=>{
    refineInitialReviewCta();
    applyInitialDecision();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(()=>{
    refineInitialReviewCta();
    applyInitialDecision();
  },0);
})();
