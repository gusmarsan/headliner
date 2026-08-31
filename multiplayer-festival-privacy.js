(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  function gameState(){
    try{return typeof state!=='undefined'?state:null}catch(_){return null}
  }

  function networkActive(){
    const current=gameState();
    try{
      if(typeof window.isNetworkGame==='function'&&window.isNetworkGame())return true;
      if(typeof isNetworkGame==='function'&&isNetworkGame())return true;
    }catch(_){}
    return current?.mode==='network';
  }

  function liveNetworkGame(){
    const current=gameState();
    return !!current&&networkActive()&&!current.gameOver;
  }

  function injectPrivacyStyles(){
    if(document.getElementById('headliner-multiplayer-audience-privacy'))return;
    const style=document.createElement('style');
    style.id='headliner-multiplayer-audience-privacy';
    style.textContent=`
      html.headliner-network-live-private .local-public-counts{
        display:none!important;
      }
      html.headliner-network-live-private .headliner-zone:before,
      html.headliner-network-live-private .headliner-zone:after{
        content:none!important;
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function stripZoneTotals(root){
    if(!root)return;
    for(const zone of root.querySelectorAll?.('.headliner-zone')||[]){
      zone.removeAttribute('data-total');
    }
  }

  function scrubLiveGame(){
    injectPrivacyStyles();
    const active=liveNetworkGame();
    document.documentElement.classList.toggle('headliner-network-live-private',active);
    if(!active)return;

    const app=document.querySelector('#app');
    if(!app)return;

    // Multiplayer ao vivo não exibe placar agregado de Público de nenhum lado.
    app.querySelectorAll('.local-public-counts').forEach(node=>node.remove());

    // Os rótulos ao lado das áreas de Headliner usam data-total em pseudo-elementos.
    // Removemos de ambos os jogadores durante a partida; o resultado final continua intacto.
    stripZoneTotals(app);
  }

  const baseHeadZonesHTML=window.headZonesHTML;
  if(typeof baseHeadZonesHTML==='function'){
    window.headZonesHTML=function(){
      const html=baseHeadZonesHTML.apply(this,arguments);
      if(!liveNetworkGame())return html;
      const template=document.createElement('template');
      template.innerHTML=html;
      stripZoneTotals(template.content);
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

  // Cobre renders assíncronos e mudanças de fase que não passam pelos wrappers.
  const observer=new MutationObserver(scrubLiveGame);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(scrubLiveGame,250);
  scrubLiveGame();
})();
