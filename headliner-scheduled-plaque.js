(()=>{
  function scheduledDue(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.revealed &&
        state.round%3===0 && state.headlinerSkippedRound!==state.round &&
        player(P1).head.filter(Boolean).length<3 && !player(P1).lockedThisRound;
    }catch(_){return false}
  }

  function injectStyles(){
    if(document.querySelector('style[data-headliner-scheduled-plaque]'))return;
    const style=document.createElement('style');
    style.dataset.headlinerScheduledPlaque='1';
    style.textContent=`
      .result-deck-button.headliner-scheduled-plaque{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:42px!important;
        padding:0 18px!important;
        background:#a92d2d!important;
        border:2px solid #7d1f1f!important;
        color:#f6e7c7!important;
        text-align:center!important;
        line-height:1!important;
        box-shadow:0 8px 18px rgba(0,0,0,.25)!important;
        position:relative!important;
        z-index:1001!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
      }
      @media (min-width:761px){
        .round-controls.headliner-scheduled-plaque-wrap{
          display:flex!important;
          position:absolute!important;
          left:78%!important;
          top:58%!important;
          transform:translate(-50%,-50%)!important;
          margin:0!important;
          z-index:1000!important;
          pointer-events:auto!important;
          isolation:isolate!important;
        }
        .round-controls.headliner-scheduled-plaque-wrap .headliner-scheduled-plaque{
          left:50px!important;
          top:30px!important;
        }
      }
      @media (max-width:760px){
        .round-controls.headliner-scheduled-plaque-wrap{
          display:flex!important;
          position:relative!important;
          justify-content:center!important;
          z-index:1000!important;
          pointer-events:auto!important;
        }
        .round-controls.headliner-scheduled-plaque-wrap .headliner-scheduled-plaque{
          left:auto!important;
          top:auto!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function sync(){
    injectStyles();
    const buttons=[...document.querySelectorAll('.result-deck-button')]
      .filter(btn=>/escolher\s+headliner|escolha\s+o\s+headliner/i.test((btn.textContent||'').trim()));

    for(const btn of buttons){
      const controls=btn.closest('.round-controls');
      if(scheduledDue()){
        btn.classList.add('headliner-scheduled-plaque');
        btn.textContent='Escolha o Headliner';
        btn.setAttribute('aria-label','Escolha o Headliner');
        controls?.classList.add('headliner-scheduled-plaque-wrap');
      }else{
        btn.classList.remove('headliner-scheduled-plaque');
        controls?.classList.remove('headliner-scheduled-plaque-wrap');
      }
    }
  }

  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(sync,100);
  sync();
})();
