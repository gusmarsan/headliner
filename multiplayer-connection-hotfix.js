(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  // Do not expose/share a room code until the host PeerJS id is actually live.
  // The guest connection itself stays untouched: one clean attempt through the
  // canonical multiplayer flow is more reliable than destroying/recreating the
  // guest Peer every few seconds.
  function syncHostReadyUi(){
    if(network.role!=='host'||!network.room||network.connected)return;
    const codeEl=document.querySelector('.network-room-code');
    if(!codeEl)return;

    if(!network.ready){
      if(codeEl.textContent!=='······')codeEl.textContent='······';
      codeEl.setAttribute('aria-label','Abrindo a sala');
    }else if(codeEl.textContent!==network.room){
      codeEl.textContent=network.room;
      codeEl.setAttribute('aria-label',`Código da sala ${network.room}`);
    }
  }

  const observer=new MutationObserver(syncHostReadyUi);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(syncHostReadyUi,350);
  syncHostReadyUi();
})();
