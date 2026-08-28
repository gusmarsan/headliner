(function(){
  // Small global bridge for inline recovery actions used by the network UI.
  if(typeof window.renderHostWaiting==='function')return;
  window.renderHostWaiting=function(error=''){
    const network=window.HeadlinerNetwork;
    if(!network)return window.renderNetworkLobby?.('A sala não está mais disponível.');
    try{closeModal()}catch(_){}
    const root=document.querySelector('#app');
    if(!root)return;
    root.innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker"><i class="network-status-dot ${network.connected?'online':''}"></i>${network.connected?'Jogador 2 conectado':'Aguardando Jogador 2'}</span><h1>SUA SALA</h1><span class="network-room-code">${network.room||''}</span><p class="network-room-help">Envie este código ou compartilhe o convite. A partida continua quando o outro celular conectar.</p><div class="network-actions"><button class="primary" onclick="shareNetworkInvite()">Compartilhar convite</button><button class="secondary" onclick="copyNetworkInvite()">Copiar link</button></div>${error?`<div class="network-error">${error}</div>`:''}<div class="network-actions" style="margin-top:18px"><button class="secondary" onclick="networkBackToMenu()">Cancelar sala</button></div></section></main>`;
  };
})();
