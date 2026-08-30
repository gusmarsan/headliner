(function(){
  const PUBLIC_GAME_URL='https://headliner-pink.vercel.app/';
  const network=window.HeadlinerNetwork;
  if(!network)return;

  const baseJoin=window.joinNetworkRoom;
  const baseLobby=window.renderNetworkLobby;
  const baseBackToMenu=window.networkBackToMenu;

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
    }catch(_){
      return false;
    }
  }

  // Always share the public production domain. If the host is testing from a
  // Vercel preview/deployment URL, the guest must not inherit that private URL.
  window.copyNetworkInvite=async function(){
    const room=sanitizeRoom(network.room);
    if(room.length!==6)return;
    const ok=await copyText(publicInviteUrl(room));
    feedback(ok?'Link copiado · convite pronto para enviar':'Não consegui copiar o link. Use o código da sala.');
  };

  window.shareNetworkInvite=async function(){
    const room=sanitizeRoom(network.room);
    if(room.length!==6)return;
    const url=publicInviteUrl(room);
    const data={
      title:'Headliner — duelo',
      text:`Entre na minha partida de Headliner. Código: ${room}`,
      url
    };

    if(navigator.share){
      try{
        await navigator.share(data);
        feedback('Convite compartilhado');
        return;
      }catch(err){
        if(err?.name==='AbortError')return;
      }
    }

    const ok=await copyText(url);
    feedback(ok?'Link copiado · convite pronto para enviar':'Não consegui compartilhar. Use o código da sala.');
  };

  const inviteRoom=sanitizeRoom(new URLSearchParams(location.search).get('room'));
  let inviteCancelled=false;
  let inviteRetryTimer=0;
  let inviteAttempt=0;
  const MAX_INVITE_ATTEMPTS=15;

  function guestConnected(){
    return Boolean(network.connected||network.conn?.open||network.started);
  }

  function clearInviteRetry(){
    if(inviteRetryTimer)clearTimeout(inviteRetryTimer);
    inviteRetryTimer=0;
  }

  function currentUrlStillHasInvite(){
    return sanitizeRoom(new URLSearchParams(location.search).get('room'))===inviteRoom;
  }

  function scheduleInviteAttempt(delay){
    clearInviteRetry();
    if(inviteCancelled||inviteRoom.length!==6||guestConnected()||inviteAttempt>=MAX_INVITE_ATTEMPTS)return;
    inviteRetryTimer=setTimeout(runInviteAttempt,delay);
  }

  function runInviteAttempt(){
    clearInviteRetry();
    if(inviteCancelled||inviteRoom.length!==6||guestConnected()||!currentUrlStillHasInvite())return;
    if(document.visibilityState==='hidden'){
      scheduleInviteAttempt(1200);
      return;
    }
    if(typeof baseJoin!=='function')return;

    inviteAttempt+=1;
    baseJoin(inviteRoom);

    // A native share action can briefly suspend the host browser on mobile.
    // Keep trying from the invite URL so the guest connects automatically as
    // soon as the host returns, instead of falling back to manual code entry.
    scheduleInviteAttempt(inviteAttempt<3?5500:8000);
  }

  function startInviteFlow(){
    if(inviteRoom.length!==6)return;
    const afterOnboarding=window.headlinerRunAfterOnboarding||((continuation)=>continuation());
    afterOnboarding(()=>setTimeout(runInviteAttempt,120));
  }

  // If the guest explicitly backs out, respect that choice and stop retries.
  if(typeof baseLobby==='function'){
    window.renderNetworkLobby=function(){
      inviteCancelled=true;
      clearInviteRetry();
      return baseLobby.apply(this,arguments);
    };
  }
  if(typeof baseBackToMenu==='function'){
    window.networkBackToMenu=function(){
      inviteCancelled=true;
      clearInviteRetry();
      return baseBackToMenu.apply(this,arguments);
    };
  }

  function reviveOnForeground(){
    if(document.visibilityState==='hidden')return;

    // Host side: after returning from WhatsApp/share sheet, reconnect PeerJS
    // if the browser suspended its websocket while it was in the background.
    if(network.role==='host'&&network.room){
      const peer=network.peer;
      try{
        if(peer&&!peer.destroyed&&peer.disconnected&&typeof peer.reconnect==='function')peer.reconnect();
        else if((!peer||peer.destroyed)&&typeof window.restoreHostRoom==='function')window.restoreHostRoom(network.room);
      }catch(_){}
    }

    if(inviteRoom.length===6&&!guestConnected()&&!inviteCancelled)scheduleInviteAttempt(250);
  }

  document.addEventListener('visibilitychange',reviveOnForeground);
  window.addEventListener('pageshow',reviveOnForeground);
  window.addEventListener('online',reviveOnForeground);

  startInviteFlow();
})();
