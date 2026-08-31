(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  const FALLBACK_ICE_SERVERS=[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:openrelay.metered.ca:80'},
    {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
    {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
    {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
  ];

  function mergePeerOptions(options){
    const source=options&&typeof options==='object'?options:{};
    const config=source.config&&typeof source.config==='object'?source.config:{};
    const existing=Array.isArray(config.iceServers)?config.iceServers:[];
    return {
      ...source,
      config:{
        sdpSemantics:'unified-plan',
        ...config,
        iceServers:[...existing,...FALLBACK_ICE_SERVERS]
      }
    };
  }

  function wrapPeer(NativePeer){
    if(typeof NativePeer!=='function'||NativePeer.__headlinerTurnWrapped)return;

    function HeadlinerPeer(idOrOptions,maybeOptions){
      if(new.target===undefined)return new HeadlinerPeer(idOrOptions,maybeOptions);
      if(typeof idOrOptions==='string')return new NativePeer(idOrOptions,mergePeerOptions(maybeOptions));
      return new NativePeer(mergePeerOptions(idOrOptions));
    }

    try{Object.setPrototypeOf(HeadlinerPeer,NativePeer)}catch(_){}
    HeadlinerPeer.prototype=NativePeer.prototype;
    HeadlinerPeer.__headlinerTurnWrapped=true;
    HeadlinerPeer.__headlinerNativePeer=NativePeer;
    window.Peer=HeadlinerPeer;
  }

  function watchPeerJsScript(root=document){
    root.querySelectorAll?.('script[src*="peerjs"]').forEach(script=>{
      if(script.dataset.headlinerTurnWatch==='1')return;
      script.dataset.headlinerTurnWatch='1';
      script.addEventListener('load',()=>wrapPeer(window.Peer),{once:true});
    });
  }

  if(window.Peer)wrapPeer(window.Peer);
  watchPeerJsScript();
  new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.matches?.('script[src*="peerjs"]'))watchPeerJsScript(node.parentElement||document);
        else watchPeerJsScript(node);
      }
    }
  }).observe(document.documentElement,{childList:true,subtree:true});

  let watchedConn=null;
  let watchedPc=null;
  let relayCandidateSeen=false;
  let lastIceState='';

  function setStatus(message,error=false){
    const feedback=document.querySelector('.network-feedback');
    const errorBox=document.querySelector('.network-error');
    if(error){
      if(errorBox)errorBox.textContent=message;
      else if(feedback)feedback.textContent=message;
      return;
    }
    if(feedback)feedback.textContent=message;
  }

  function describeIce(pc){
    const ice=pc?.iceConnectionState||'';
    if(!ice||ice===lastIceState)return;
    lastIceState=ice;
    if(ice==='checking')setStatus(relayCandidateSeen?'Sala localizada · tentando conexão direta/relay…':'Sala localizada · negociando conexão entre os aparelhos…');
    else if(ice==='connected'||ice==='completed')setStatus(relayCandidateSeen?'Conectado · relay disponível':'Conexão estabelecida');
    else if(ice==='failed')setStatus(relayCandidateSeen?'Sala localizada, mas a negociação WebRTC falhou mesmo com relay TURN.':'Sala localizada, mas a rede bloqueou a conexão WebRTC e nenhum relay TURN respondeu.',true);
    else if(ice==='disconnected')setStatus('A conexão entre os aparelhos oscilou. Tentando recuperar…');
  }

  function bindPeerConnection(pc){
    if(!pc||pc===watchedPc)return;
    watchedPc=pc;
    relayCandidateSeen=false;
    lastIceState='';
    try{
      pc.addEventListener('icecandidate',event=>{
        const candidate=String(event?.candidate?.candidate||'');
        if(candidate.includes(' typ relay ')){
          relayCandidateSeen=true;
          setStatus('Sala localizada · relay TURN disponível · concluindo conexão…');
        }
      });
      pc.addEventListener('iceconnectionstatechange',()=>describeIce(pc));
      pc.addEventListener('connectionstatechange',()=>{
        if(pc.connectionState==='connected')setStatus('Conexão estabelecida');
        else if(pc.connectionState==='failed')describeIce(pc);
      });
      describeIce(pc);
    }catch(_){}
  }

  setInterval(()=>{
    if(window.Peer&&!window.Peer.__headlinerTurnWrapped)wrapPeer(window.Peer);
    const conn=network.conn;
    if(conn&&conn!==watchedConn){
      watchedConn=conn;
      watchedPc=null;
      relayCandidateSeen=false;
      lastIceState='';
      setStatus('Sala localizada · iniciando conexão entre os aparelhos…');
    }
    if(conn){
      bindPeerConnection(conn.peerConnection);
      if(conn.open)setStatus('Conexão estabelecida');
    }
  },250);
})();
