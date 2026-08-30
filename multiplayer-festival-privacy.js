(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  function networkActive(){
    try{return typeof isNetworkGame==='function'&&isNetworkGame()}catch(_){return false}
  }
  function opponentSide(){
    if(!network.side)return null;
    try{
      if(typeof otherSide==='function')return otherSide(network.side);
      return network.side===P1?P2:P1;
    }catch(_){return null}
  }
  function stripOpponentZoneTotal(root){
    if(!root)return;
    const opponent=opponentSide();
    if(!opponent)return;
    for(const zone of root.querySelectorAll?.('.headliner-zone')||[]){
      if(zone.querySelector(`.slot[data-side="${opponent}"]`))zone.removeAttribute('data-total');
    }
  }
  function scrubLiveGame(){
    if(!networkActive()||!window.state||state.gameOver)return;
    const app=document.querySelector('#app');
    if(!app)return;

    // The old local two-player HUD exposes both accumulated festival totals.
    // In network multiplayer there must be no aggregate opponent score during play.
    app.querySelectorAll('.local-public-counts').forEach(node=>node.remove());

    // The Headliner zones also expose the accumulated total through data-total,
    // which is rendered beside the cards by CSS. Remove it only from the rival.
    stripOpponentZoneTotal(app);
  }

  const baseHeadZonesHTML=window.headZonesHTML;
  if(typeof baseHeadZonesHTML==='function'){
    window.headZonesHTML=function(){
      const html=baseHeadZonesHTML.apply(this,arguments);
      if(!networkActive()||!window.state||state.gameOver)return html;
      const template=document.createElement('template');
      template.innerHTML=html;
      stripOpponentZoneTotal(template.content);
      return template.innerHTML;
    };
  }

  const baseRenderGame=window.renderGame;
  if(typeof baseRenderGame==='function'){
    window.renderGame=function(){
      const result=baseRenderGame.apply(this,arguments);
      scrubLiveGame();
      return result;
    };
  }

  const baseRenderCurrentState=window.renderCurrentState;
  if(typeof baseRenderCurrentState==='function'){
    window.renderCurrentState=function(){
      const result=baseRenderCurrentState.apply(this,arguments);
      scrubLiveGame();
      return result;
    };
  }

  // Fallback for any asynchronous render path that bypasses the wrappers above.
  const observer=new MutationObserver(()=>scrubLiveGame());
  observer.observe(document.body,{childList:true,subtree:true});
  scrubLiveGame();
})();
