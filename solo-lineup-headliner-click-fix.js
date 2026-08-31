(()=>{
  let lastActivation=0;
  const selector='[data-solo-lineup-headliner],[data-hard-lineup-headliner]';

  function visibleReview(){
    try{
      return !!document.querySelector('.solo-initial-lineup-review') &&
        !!state && state.mode==='cpu' && !state.gameOver && state.round===1;
    }catch(_){return false}
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
      .solo-initial-lineup-review [data-hard-lineup-headliner]{
        position:relative!important;
        z-index:10001!important;
        pointer-events:auto!important;
        cursor:pointer!important;
        touch-action:manipulation!important;
        user-select:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function buttonFromEvent(event){
    const direct=event.target?.closest?.(selector);
    if(direct)return direct;
    const x=Number(event.clientX),y=Number(event.clientY);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    return [...document.querySelectorAll(selector)].find(button=>{
      const rect=button.getBoundingClientRect();
      return rect.width>0&&rect.height>0&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
    })||null;
  }

  function activate(button){
    if(!button||!visibleReview())return false;
    const now=Date.now();
    if(now-lastActivation<180)return true;
    lastActivation=now;

    try{
      /* The visible screen is authoritative. Recover from any stale internal
         flag left by startup guards before opening Headliner selection. */
      state.__soloLineupReviewPending=true;
      state.__soloLineupReviewCompleted=false;
      state.__soloLineupChoosingHeadliner=false;
      state.__soloLineupConfirmIndex=null;
      state.__openingHeadlinerResolved=true;
      state.initialHeadlinerPending=false;
      state.phase='SOLO_INITIAL_REVIEW';
      state.actionLocked=false;

      if(typeof window.chooseSoloInitialHeadliner==='function'){
        window.chooseSoloInitialHeadliner();
        return true;
      }
    }catch(_){}
    return false;
  }

  function handle(event){
    if(!visibleReview())return;
    const button=buttonFromEvent(event);
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activate(button);
  }

  /* pointerup handles touch/mouse before a synthetic click can be swallowed by
     another layer. click remains as keyboard/legacy-browser fallback. */
  document.addEventListener('pointerup',handle,true);
  document.addEventListener('click',handle,true);

  /* Also give each rendered button a direct handler. This covers browsers that
     retarget pointer events while the scrollable lineup is moving. */
  function wire(){
    injectStyles();
    document.querySelectorAll(selector).forEach(button=>{
      if(button.dataset.soloHeadlinerDirectWired==='1')return;
      button.dataset.soloHeadlinerDirectWired='1';
      button.disabled=false;
      button.style.setProperty('pointer-events','auto','important');
      button.addEventListener('pointerup',event=>{
        if(!visibleReview())return;
        event.preventDefault();
        event.stopPropagation();
        activate(button);
      });
    });
  }

  injectStyles();
  wire();
  new MutationObserver(wire).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(wire,120);
})();
