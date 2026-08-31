(()=>{
  let lastActivation=0;
  const selector='[data-solo-lineup-headliner],[data-hard-lineup-headliner]';

  function reviewPending(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.round===1 &&
        state.__soloLineupReviewPending===true;
    }catch(_){return false}
  }

  function choosingHeadliner(){
    try{return reviewPending()&&state.__soloLineupChoosingHeadliner===true}
    catch(_){return false}
  }

  function injectStyles(){
    if(document.querySelector('style[data-solo-lineup-headliner-click-fix]'))return;
    const style=document.createElement('style');
    style.dataset.soloLineupHeadlinerClickFix='1';
    style.textContent=`
      .solo-initial-lineup-review .solo-lineup-review-actions,
      .solo-initial-lineup-review .private-round-actions{
        position:relative!important;
        z-index:40!important;
        pointer-events:auto!important;
      }
      .solo-initial-lineup-review [data-solo-lineup-headliner],
      .solo-initial-lineup-review [data-hard-lineup-headliner]{
        position:relative!important;
        z-index:41!important;
        pointer-events:auto!important;
        cursor:pointer!important;
        touch-action:manipulation!important;
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

  function activate(){
    if(!reviewPending()||choosingHeadliner())return false;
    const now=Date.now();
    if(now-lastActivation<250)return true;
    lastActivation=now;
    try{
      if(typeof window.chooseSoloInitialHeadliner==='function'){
        window.chooseSoloInitialHeadliner();
        return true;
      }
    }catch(_){}
    return false;
  }

  document.addEventListener('click',event=>{
    if(!reviewPending()||choosingHeadliner())return;
    const button=buttonFromEvent(event);
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activate();
  },true);

  injectStyles();
  new MutationObserver(injectStyles).observe(document.documentElement,{childList:true,subtree:true});
})();
