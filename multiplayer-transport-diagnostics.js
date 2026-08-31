(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  let boundPeer=null;
  let boundConn=null;
  let lastPeerError='';
  let lastIce='';
  let lastConn='';
  let reconnectTimer=0;

  function code(){return String(network.room||'').toUpperCase()}
  function genericErrorVisible(){
    const el=document.querySelector('.network-error');
    return el&&/não encontrei essa sala|não foi possível conectar|conexão caiu/i.test(el.textContent||'');
  }
  function ensureDiag(message){
    const body=document.querySelector('.network-ticket-body');
    if(!body)return;
    let el=document.querySelector('.network-transport-diagnostic');
    if(!el){
      el=document.createElement('div');
      el.className='network-transport-diagnostic';
      el.style.cssText='margin:10px auto 0;padding:9px 11px;border:1px dashed rgba(23,61,73,.45);background:rgba(255,245,213,.55);color:#173d49;font-size:11px;font-weight:800;line-height:1.35;max-width:560px';
      body.appendChild(el);
    }
    el.textContent=message;
  }
  function describe(){
    if(network.connected)return '';
    if(lastPeerError==='peer-unavailable')return `Diagnóstico: o servidor de sinalização não encontrou a sala ${code()} ativa.`;
    if(['network','server-error','socket-error','socket-closed'].includes(lastPeerError))return `Diagnóstico: falha de sinalização (${lastPeerError}). O aparelho não conseguiu manter contato com o PeerJS Cloud.`;
    if(lastPeerError==='webrtc'||lastIce==='failed')return `Diagnóstico: a sala foi localizada, mas a conexão WebRTC entre os aparelhos falhou (ICE ${lastIce||'failed'}).`;
    if(lastConn==='failed')return 'Diagnóstico: a sala foi localizada, mas a conexão direta entre os aparelhos falhou.';
    if(lastIce==='checking'||lastConn==='connecting')return `Diagnóstico: sala localizada; WebRTC ainda tentando conectar (ICE ${lastIce||'checking'}).`;
    if(network.peer?.open)return 'Diagnóstico: o convidado chegou ao PeerJS; aguardando resposta da sala.';
    return 'Diagnóstico: tentando alcançar o servidor de sinalização.';
  }
  function refreshDiagnostic(){
    if(network.role!=='guest'||network.connected)return;
    if(genericErrorVisible()||document.querySelector('.network-wait-screen'))ensureDiag(describe());
  }

  function scheduleHostReconnect(){
    if(network.role!=='host'||network.connected)return;
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(()=>{
      const peer=network.peer;
      if(!peer||peer.destroyed)return;
      try{
        if(peer.disconnected&&typeof peer.reconnect==='function')peer.reconnect();
      }catch(_){}
    },500);
  }

  function bindPeer(){
    const peer=network.peer;
    if(!peer||peer===boundPeer)return;
    boundPeer=peer;
    lastPeerError='';
    peer.on('open',()=>{lastPeerError=''; if(network.role==='host')network.ready=true;});
    peer.on('disconnected',()=>{
      if(network.role==='host'){
        network.ready=false;
        try{window.renderHostWaiting?.('A conexão da sala oscilou. Reconectando…')}catch(_){}
        scheduleHostReconnect();
      }
    });
    peer.on('error',err=>{
      lastPeerError=String(err?.type||'unknown');
      refreshDiagnostic();
      if(network.role==='host'&&['network','socket-error','socket-closed'].includes(lastPeerError))scheduleHostReconnect();
    });
  }

  function bindConn(){
    const conn=network.conn;
    if(!conn||conn===boundConn)return;
    boundConn=conn;
    lastIce='';lastConn='';
    conn.on('open',()=>{lastIce='connected';lastConn='connected'});
    conn.on('error',()=>{lastConn='failed';refreshDiagnostic()});
    const pc=conn.peerConnection;
    if(!pc)return;
    const sync=()=>{
      lastIce=String(pc.iceConnectionState||lastIce||'');
      lastConn=String(pc.connectionState||lastConn||'');
      refreshDiagnostic();
    };
    pc.addEventListener?.('iceconnectionstatechange',sync);
    pc.addEventListener?.('connectionstatechange',sync);
    sync();
  }

  const observer=new MutationObserver(refreshDiagnostic);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{bindPeer();bindConn();refreshDiagnostic();},200);
  bindPeer();bindConn();
})();
