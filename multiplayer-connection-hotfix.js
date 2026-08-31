(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  // The room code must only become visible after PeerJS has actually
  // registered the host id. Otherwise the guest can receive peer-unavailable
  // even though the host screen already appears to have a valid room.
  function syncHostReadyUi(){
    if(network.role!=='host'||!network.room||network.connected)return;
    const codeEl=document.querySelector('.network-room-code');
    if(!codeEl)return;

    if(!network.ready){
      if(codeEl.textContent!=='······')codeEl.textContent='······';
      codeEl.setAttribute('aria-label','Abrindo a sala');
    }else{
      if(codeEl.textContent!==network.room)codeEl.textContent=network.room;
      codeEl.setAttribute('aria-label',`Código da sala ${network.room}`);
    }
  }

  const observer=new MutationObserver(syncHostReadyUi);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(syncHostReadyUi,300);
  syncHostReadyUi();
})();
