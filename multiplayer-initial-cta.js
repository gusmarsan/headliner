(function(){
  const network=window.HeadlinerNetwork;
  if(!network||typeof window.renderCurrentState!=='function')return;

  const baseRenderCurrentState=window.renderCurrentState;

  function networkActive(){
    try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}
  }

  function refineInitialReviewCta(){
    if(!networkActive()||!state||state.phase!=='INITIAL_REVIEW')return;
    const root=document.querySelector('#app');
    if(!root)return;

    const buttons=[...root.querySelectorAll('.private-round-actions button')]
      .filter(button=>/^terminei$/i.test((button.textContent||'').trim()));
    if(!buttons.length)return;

    buttons[0].textContent='Escalar';
    buttons.slice(1).forEach(button=>{
      const actions=button.closest('.private-round-actions');
      if(actions&&actions.querySelectorAll('button').length===1)actions.remove();
      else button.remove();
    });
  }

  window.renderCurrentState=function(){
    const result=baseRenderCurrentState.apply(this,arguments);
    refineInitialReviewCta();
    return result;
  };

  setTimeout(refineInitialReviewCta,0);
})();
