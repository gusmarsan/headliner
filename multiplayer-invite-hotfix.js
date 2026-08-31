(function(){
  const PUBLIC_GAME_URL='https://headliner-pink.vercel.app/';
  const network=window.HeadlinerNetwork;
  if(!network)return;

  const baseJoin=window.joinNetworkRoom;
  const baseNamedJoin=window.joinNamedNetworkRoom;
  const baseLobby=window.renderNetworkLobby;
  const baseBackToMenu=window.networkBackToMenu;
  const baseRestoreHost=window.restoreHostRoom;
  if(typeof baseJoin!=='function')return;

  function sanitizeRoom(value){
    return String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
  }

  function publicInviteUrl(room){
    const url=new URL(PUBLIC_GAME_URL);
    url.searchParams.set('room',sanitizeRoom(room));
    return url.toString();
  }

  function feedback(message){
    try{window.showNetworkFeedback?.(message)}catch(_){}
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(_){}
    try{
      const area=document.createElement('textarea');
      area.value=text;
      area.setAttribute('readonly','');
      area.style.position='fixed';
      area.style.opacity='0';
      document.body.appendChild(area);
      area.select();
      const ok=document.execCommand('copy');
      area.remove();
      return ok;
    }catch(_){return false}
  }

  function hostHealthy(){
    const peer=network.peer;
    return !!peer&&!peer.destroyed&&!peer.disconnected&&network.ready===true;
  }

  window.copyNetworkInvite=async function(){
    const room=sanitizeRoom(network.room);
    if(room.length!==6||!hostHealthy()){
      feedback('A sala ainda está conectando. Aguarde o código ficar disponível.');
      return;
    }
    const ok=await copyText(publicInviteUrl(room));
    feedback(ok?'Link copiado · convite pronto para enviar':'Não consegui copiar o link. Use o código da sala.');
  };

  window.shareNetworkInvite=async function(){
    const room=sanitizeRoom(network.room);
    if(room.length!==6||!hostHealthy()){
      feedback('A sala ainda está conectando. Aguarde o código ficar disponível.');
      return;
    }
    const url=publicInviteUrl(room);
    const data={title:'Headliner — duelo',text:`Entre na minha partida de Headliner. Código: ${room}`,url};
    if(navigator.share){
      try{await navigator.share(data);feedback('Convite compartilhado');return}
      catch(err){if(err?.name==='AbortError')return}
    }
    const ok=await copyText(url);
    feedback(ok?'Link copiado · convite pronto para enviar':'Não consegui compartilhar. Use o código da sala.');
  };

  /* ---------- Host liveness ----------
     PeerJS can emit `disconnected` while the page remains alive (mobile network
     changes, browser backgrounding, share sheets). In that state the room id is
     no longer discoverable even though the old UI used to keep showing it. */
  let watchedHostPeer=null;
  let hostRecoveryTimer=0;

  function clearHostRecovery(){
    if(hostRecoveryTimer)clearTimeout(hostRecoveryTimer);
    hostRecoveryTimer=0;
  }

  function renderHostReadiness(){
    const code=document.querySelector('.network-room-code');
    if(!code||network.role!=='host')return;
    if(!hostHealthy()){
      code.textContent='······';
      code.setAttribute('aria-label','Reconectando a sala');
    }
  }

  function scheduleHostRecovery(delay=700){
    clearHostRecovery();
    if(network.role!=='host'||!network.room||network.connected)return;
    hostRecoveryTimer=setTimeout(recoverHost,delay);
  }

  function recoverHost(){
    clearHostRecovery();
    if(network.role!=='host'||!network.room||network.connected)return;
    if(document.visibilityState==='hidden'){
      scheduleHostRecovery(1200);
      return;
    }
    const peer=network.peer;
    try{
      if(peer&&!peer.destroyed&&peer.disconnected&&typeof peer.reconnect==='function'){
        network.ready=false;
        renderHostReadiness();
        peer.reconnect();
        scheduleHostRecovery(3500);
        return;
      }
      if(!peer||peer.destroyed){
        network.ready=false;
        renderHostReadiness();
        if(typeof baseRestoreHost==='function')baseRestoreHost(network.room);
      }
    }catch(_){scheduleHostRecovery(1800)}
  }

  function watchHostPeer(){
    if(network.role!=='host')return;
    const peer=network.peer;
    if(!peer||peer===watchedHostPeer)return;
    watchedHostPeer=peer;
    peer.on('open',()=>{
      if(network.peer!==peer||network.role!=='host')return;
      network.ready=true;
      clearHostRecovery();
    });
    peer.on('disconnected',()=>{
      if(network.peer!==peer||network.role!=='host')return;
      network.ready=false;
      renderHostReadiness();
      scheduleHostRecovery(500);
    });
    peer.on('error',err=>{
      if(network.peer!==peer||network.role!=='host')return;
      if(['network','server-error','socket-error','socket-closed','disconnected'].includes(err?.type)){
        network.ready=false;
        renderHostReadiness();
        scheduleHostRecovery(900);
      }
    });
  }

  /* ---------- Guest controlled retries ----------
     The canonical join waits up to 9 s. We never start another attempt before
     that one has had time to finish, so one attempt cannot destroy the next. */
  let guestToken=0;
  let guestTimer=0;
  let guestCode='';
  let guestAttempts=0;
  let guestActive=false;
  const MAX_GUEST_ATTEMPTS=4;
  const RETRY_DELAY=11000;

  function guestConnected(){
    return Boolean(network.connected||network.conn?.open||network.started);
  }

  function cancelGuestRetries(){
    guestToken++;
    if(guestTimer)clearTimeout(guestTimer);
    guestTimer=0;
    guestCode='';
    guestAttempts=0;
    guestActive=false;
  }

  function retryStatus(final=false){
    if(!guestActive||guestConnected())return;
    const apply=()=>{
      const error=document.querySelector('.network-error');
      if(!error)return;
      if(final){
        error.textContent='A sala não respondeu após várias tentativas. No celular do Jogador 1, confirme se o código ainda está visível e crie uma sala nova se ele tiver sumido.';
      }else{
        error.textContent=`A sala ainda não respondeu. Tentando novamente… (${Math.min(guestAttempts+1,MAX_GUEST_ATTEMPTS)}/${MAX_GUEST_ATTEMPTS})`;
      }
    };
    setTimeout(apply,0);
    setTimeout(apply,250);
  }

  function scheduleGuestRetry(token){
    if(token!==guestToken||!guestActive||guestConnected())return;
    if(guestAttempts>=MAX_GUEST_ATTEMPTS){retryStatus(true);return}
    if(guestTimer)clearTimeout(guestTimer);
    guestTimer=setTimeout(()=>runGuestRetry(token),RETRY_DELAY);
  }

  function runGuestRetry(token){
    guestTimer=0;
    if(token!==guestToken||!guestActive||guestConnected())return;
    if(document.visibilityState==='hidden'){
      guestTimer=setTimeout(()=>runGuestRetry(token),1200);
      return;
    }
    if(guestAttempts>=MAX_GUEST_ATTEMPTS){retryStatus(true);return}
    guestAttempts++;
    retryStatus(false);
    baseJoin(guestCode);
    scheduleGuestRetry(token);
  }

  function beginGuestRetryFlow(code,initialAlreadyStarted=false){
    const safe=sanitizeRoom(code);
    if(safe.length!==6)return;
    cancelGuestRetries();
    guestActive=true;
    guestCode=safe;
    guestAttempts=initialAlreadyStarted?1:0;
    const token=guestToken;
    if(!initialAlreadyStarted){
      guestAttempts=1;
      baseJoin(safe);
    }
    scheduleGuestRetry(token);
  }

  /* Manual/name-based entry captured the original join before previous hotfixes.
     Wrap that exact path too; this was the hole in the earlier fixes. */
  if(typeof baseNamedJoin==='function'){
    window.joinNamedNetworkRoom=function(){
      const code=sanitizeRoom(document.querySelector('#network-room-input')?.value||'');
      const result=baseNamedJoin.apply(this,arguments);
      if(code.length===6)beginGuestRetryFlow(code,true);
      return result;
    };
  }

  /* Direct entry (legacy screen / external callers) also gets controlled retry. */
  window.joinNetworkRoom=function(value){
    const code=sanitizeRoom(value);
    if(code.length!==6)return baseJoin(value);
    beginGuestRetryFlow(code,false);
  };

  /* Invite links keep the public stable domain and use the same retry engine. */
  const inviteRoom=sanitizeRoom(new URLSearchParams(location.search).get('room'));
  let inviteCancelled=false;

  function startInviteFlow(){
    if(inviteRoom.length!==6)return;
    const afterOnboarding=window.headlinerRunAfterOnboarding||((continuation)=>continuation());
    afterOnboarding(()=>setTimeout(()=>{
      if(!inviteCancelled&&!guestConnected())beginGuestRetryFlow(inviteRoom,false);
    },180));
  }

  if(typeof baseLobby==='function'){
    window.renderNetworkLobby=function(){
      inviteCancelled=true;
      cancelGuestRetries();
      return baseLobby.apply(this,arguments);
    };
  }
  if(typeof baseBackToMenu==='function'){
    window.networkBackToMenu=function(){
      inviteCancelled=true;
      cancelGuestRetries();
      return baseBackToMenu.apply(this,arguments);
    };
  }

  function foregroundRecovery(){
    if(document.visibilityState==='hidden')return;
    watchHostPeer();
    if(network.role==='host'&&network.room&&!network.connected&&!hostHealthy())scheduleHostRecovery(150);
    if(guestActive&&!guestConnected()&&!guestTimer)scheduleGuestRetry(guestToken);
  }

  document.addEventListener('visibilitychange',foregroundRecovery);
  window.addEventListener('pageshow',foregroundRecovery);
  window.addEventListener('online',foregroundRecovery);

  setInterval(()=>{
    watchHostPeer();
    if(network.role==='host'&&network.room&&!network.connected&&!hostHealthy())scheduleHostRecovery(300);
    if(guestConnected())cancelGuestRetries();
    else if(guestActive)retryStatus(false);
  },900);

  startInviteFlow();
})();
