(()=>{
  let lastActivation=0;

  function initialChoicePending(){
    try{
      return !!state && state.mode==='cpu' && !state.gameOver && state.round===1 &&
        !!state.initialHeadlinerPending && !state.revealed &&
        player(P1).head.filter(Boolean).length<3;
    }catch(_){return false}
  }

  function initialButton(){
    if(!initialChoicePending())return null;
    return [...document.querySelectorAll('.result-deck-button')]
      .find(btn=>/escolher\s+headliner/i.test((btn.textContent||'').trim()))||null;
  }

  function openInitial(){
    if(!initialChoicePending())return false;
    const now=Date.now();
    if(now-lastActivation<350)return true;
    lastActivation=now;
    try{
      if(typeof window.openInitialHeadliner==='function'){
        window.openInitialHeadliner();
        return true;
      }
      const slot=[0,1,2].find(i=>!player(P1).head[i]);
      if(slot!==undefined && typeof window.openDeck==='function'){
        window.openDeck(false,slot);
        return true;
      }
    }catch(_){}
    return false;
  }

  function hardenButton(){
    const btn=initialButton();
    if(!btn)return;
    const controls=btn.closest('.round-controls');
    if(controls){
      controls.style.setProperty('position','relative','important');
      controls.style.setProperty('z-index','1000','important');
      controls.style.setProperty('pointer-events','auto','important');
      controls.style.setProperty('isolation','isolate','important');
    }
    btn.style.setProperty('position','relative','important');
    btn.style.setProperty('z-index','1001','important');
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('touch-action','manipulation','important');

    if(btn.dataset.initialHeadlinerClickFixed==='1')return;
    btn.dataset.initialHeadlinerClickFixed='1';
    btn.addEventListener('click',event=>{
      if(!initialChoicePending())return;
      event.preventDefault();
      event.stopPropagation();
      openInitial();
    });
  }

  /* Android browsers can occasionally hit-test another decorative table layer
     even while the CTA is visually above it. Capture the pointer at document
     level and honor the button's actual rectangle, independent of event.target. */
  document.addEventListener('pointerup',event=>{
    const btn=initialButton();
    if(!btn)return;
    const rect=btn.getBoundingClientRect();
    const inside=event.clientX>=rect.left && event.clientX<=rect.right &&
      event.clientY>=rect.top && event.clientY<=rect.bottom;
    if(!inside)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openInitial();
  },true);

  const observer=new MutationObserver(hardenButton);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(hardenButton,120);
  hardenButton();
})();
