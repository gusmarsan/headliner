(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  const baseJoin=window.joinNetworkRoom;
  const baseNamedJoin=window.joinNamedNetworkRoom;
  if(typeof baseJoin!=='function')return;

  let retryToken=0;
  let retryTimer=0;

  function sanitizeRoom(value){
    return String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
  }

  function connected(){
    return Boolean(network.connected||network.conn?.open||network.started);
  }

  function clearRetry(){
    retryToken++;
    if(retryTimer)clearTimeout(retryTimer);
    retryTimer=0;
  }

  function connectWithRetries(value){
    const code=sanitizeRoom(value);
    if(code.length!==6)return baseJoin(value);

    clearRetry();
    const token=retryToken;
    let attempt=0;
    const delays=[0,2600,3600,4600];

    const run=()=>{
      if(token!==retryToken||connected())return;
      attempt++;
      baseJoin(code);
      if(attempt<delays.length){
        retryTimer=setTimeout(run,delays[attempt]);
      }
    };

    run();
  }

  // Direct/manual entry and invite-link entry both use the resilient path.
  window.joinNetworkRoom=connectWithRetries;

  // The named multiplayer screen captured the original join function earlier.
  // Preserve its name validation, then retry the same valid room if PeerJS was
  // still registering the host when the first attempt happened.
  if(typeof baseNamedJoin==='function'){
    window.joinNamedNetworkRoom=function(){
      const code=sanitizeRoom(document.querySelector('#network-room-input')?.value||'');
      const result=baseNamedJoin.apply(this,arguments);
      if(code.length!==6)return result;

      const token=++retryToken;
      if(retryTimer)clearTimeout(retryTimer);
      let attempt=0;
      const delays=[2800,3800,4800];
      const retry=()=>{
        if(token!==retryToken||connected())return;
        baseJoin(code);
        if(attempt<delays.length){
          retryTimer=setTimeout(retry,delays[attempt++]);
        }
      };
      retryTimer=setTimeout(retry,delays[attempt++]);
      return result;
    };
  }

  // Do not expose/share a room code until the host PeerJS id is actually live.
  function syncHostReadyUi(){
    if(network.role!=='host'||!network.room||network.connected)return;
    const codeEl=document.querySelector('.network-room-code');
    if(!codeEl)return;

    if(!network.ready){
      if(!codeEl.dataset.roomCode)codeEl.dataset.roomCode=network.room;
      codeEl.textContent='······';
      codeEl.setAttribute('aria-label','Abrindo a sala');
    }else if(codeEl.textContent==='······'){
      codeEl.textContent=network.room;
      codeEl.setAttribute('aria-label',`Código da sala ${network.room}`);
    }
  }

  const observer=new MutationObserver(syncHostReadyUi);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{
    syncHostReadyUi();
    if(connected())clearRetry();
  },350);
  syncHostReadyUi();
})();
