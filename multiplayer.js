(function(){
  const ROOM_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const NETWORK_MODE='network';
  const PEERJS_URL='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
  const HOST_STATE_PREFIX='headlinerNetworkHostState:';
  const network={peer:null,conn:null,role:null,side:null,room:null,connected:false,ready:false,seq:0,lastSeq:-1,intentionalClose:false,peerLoading:null,started:false};
  window.HeadlinerNetwork=network;

  const base={
    isLocalGame,
    phaseIsPrivate,
    renderStart,
    renderCurrentState,
    renderGame,
    opponentHandHTML,
    playerHandHTML,
    headZonesHTML,
    finishInitialReview,
    commitPrivateHeadliner,
    finishPrivateRound,
    chooseAttr,
    nextRound,
    finishGame,
    playAgain,
    requestExitToMenu,
    exitToMenu
  };

  function isNetworkGame(){return state?.mode===NETWORK_MODE}
  window.isNetworkGame=isNetworkGame;
  isLocalGame=function(){return base.isLocalGame()||isNetworkGame()};
  phaseIsPrivate=function(){return isNetworkGame()?['INITIAL_REVIEW','ROUND_PRIVATE'].includes(state?.phase):base.phaseIsPrivate()};

  function injectNetworkStyles(){
    if(document.getElementById('headliner-network-styles'))return;
    const style=document.createElement('style');
    style.id='headliner-network-styles';
    style.textContent=`
      .network-lobby-screen,.network-wait-screen{position:fixed;inset:0;z-index:70;min-height:100svh;display:grid;place-items:center;padding:24px;color:#173d49;background:#071b24 url('assets/cover-official-desktop.png') center/cover no-repeat;overflow:auto;isolation:isolate}
      .network-lobby-screen:before,.network-wait-screen:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(5,18,25,.72),rgba(5,20,28,.9)),radial-gradient(circle at 50% 26%,rgba(28,137,167,.24),transparent 54%)}
      .network-card{position:relative;z-index:1;width:min(680px,calc(100vw - 32px));padding:0;border:3px solid #86522f;border-radius:4px;background:linear-gradient(112deg,rgba(255,255,255,.18),transparent 28%),repeating-linear-gradient(0deg,rgba(104,70,37,.035) 0 1px,transparent 1px 4px),#efdba8;color:#173d49;box-shadow:11px 11px 0 #6e3d27,0 30px 78px rgba(0,0,0,.5);text-align:center;overflow:hidden}
      .network-card:before{content:"";position:absolute;inset:8px;border:1px solid rgba(110,72,38,.42);pointer-events:none}
      .network-ticket-head,.network-ticket-stub{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#123f50;color:#f8e4ac;font-family:var(--ui);font-size:9px;font-weight:900;letter-spacing:.17em;text-transform:uppercase}
      .network-ticket-head:after{content:"";position:absolute;left:0;right:0;bottom:-2px;border-bottom:2px dashed rgba(116,72,39,.62)}
      .network-ticket-stub{justify-content:center;min-height:34px;background:#d0a653;color:#173d49;border-top:2px dashed rgba(116,72,39,.62)}
      .network-ticket-body{position:relative;padding:clamp(25px,5vw,42px) clamp(18px,6vw,52px) 28px}
      .network-card h1,.network-card h2{margin:0;color:#123f50;font-family:var(--display);font-size:clamp(42px,8vw,70px);font-weight:600;line-height:.86;letter-spacing:.025em;text-transform:uppercase}
      .network-card h2{font-size:clamp(34px,6vw,52px)}
      .network-card p{max-width:500px;margin:15px auto 21px;color:#486165;font-family:var(--ui);font-size:14px;font-weight:650;line-height:1.5}
      .network-kicker{display:block;margin-bottom:9px;color:#a44836;font-family:var(--ui);font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
      .network-actions{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.network-actions.spaced{margin-top:18px}.network-actions .primary,.network-actions .secondary,.network-actions .danger{min-height:46px;min-width:180px;border-radius:2px;white-space:normal}
      .network-actions .primary{background:#c6533d;color:#fff1c8;border-color:#7d3328}.network-actions .primary:hover{background:#aa4133}.network-actions .secondary{background:#164e62;color:#fff0c1;border-color:#0b3544}.network-actions .secondary:hover{background:#103e4f}.network-actions .danger{background:#f0dfb4;color:#8d392f;border:1px solid rgba(124,64,42,.48)}
      .network-room-code{display:block;margin:14px auto 10px;padding:13px 23px 10px;width:max-content;max-width:100%;border:3px solid #123f50;background:#f8ebc9;color:#123f50;font-family:var(--display);font-size:clamp(50px,11vw,82px);font-weight:600;letter-spacing:.13em;line-height:.9;box-shadow:6px 6px 0 #c6533d;transform:rotate(-1deg)}
      .network-room-help{margin:8px auto 20px!important;font-size:12px!important}.network-room-input{width:min(360px,100%);height:64px;margin:8px auto 18px;padding:0 15px;border:3px solid #123f50;border-radius:2px;background:#fff0c8;color:#123f50;font-family:var(--display);font-size:36px;font-weight:600;letter-spacing:.14em;text-align:center;text-transform:uppercase;outline:none;box-shadow:5px 5px 0 #d0a653}.network-room-input:focus{box-shadow:5px 5px 0 #c6533d,0 0 0 4px rgba(198,83,61,.2)}
      .network-status-dot{display:inline-block;width:9px;height:9px;margin-right:7px;border-radius:50%;background:#d1a543;box-shadow:0 0 0 3px rgba(209,165,67,.2)}.network-status-dot.online{background:#2f9b68;box-shadow:0 0 0 3px rgba(47,155,104,.18)}
      .network-feedback{min-height:18px;margin:12px auto 0;color:#276b55;font-size:11px;font-weight:850;letter-spacing:.05em;text-transform:uppercase}
      .network-chip{position:fixed;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:40;padding:6px 9px;border:1px solid rgba(247,233,200,.45);background:rgba(7,28,37,.9);color:#f8e8bd;font-size:10px;font-weight:850;letter-spacing:.04em;pointer-events:none;box-shadow:0 5px 14px rgba(0,0,0,.24)}
      .network-turn-note{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:41;max-width:min(520px,88vw);padding:7px 12px;border:1px solid rgba(229,189,85,.65);background:rgba(12,50,65,.94);color:#f8e3aa;font-size:11px;font-weight:900;letter-spacing:.06em;text-align:center;text-transform:uppercase;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.24)}
      .network-error{margin:13px auto 0;padding:10px 12px;border:2px solid #a54435;background:#f4d0b3;color:#7a3029;font-size:12px;font-weight:750;line-height:1.4}
      .network-confirm-modal{z-index:260}.network-confirm-ticket{width:min(540px,calc(100vw - 24px));padding:28px 24px;border:3px solid #86522f;background:#efdba8;color:#173d49;box-shadow:9px 9px 0 #6e3d27;text-align:center}.network-confirm-ticket h2{margin:0;color:#123f50;font-family:var(--display);font-size:clamp(34px,8vw,52px);font-weight:600;text-transform:uppercase}.network-confirm-ticket p{margin:12px auto 20px;max-width:400px;color:#4d6264;line-height:1.5}
      .network-copy-field{width:100%;margin:9px 0 17px;padding:11px;border:2px solid #123f50;background:#fff3d2;color:#173d49;font-size:12px;font-weight:700}
      .network-rematch-panel{margin:22px auto 0;padding:16px;border:2px dashed #95643c;background:rgba(255,246,216,.55)}.network-rematch-panel strong{display:block;color:#123f50;font-family:var(--display);font-size:28px;font-weight:600;text-transform:uppercase}.network-rematch-panel p{margin:6px auto 14px!important;font-size:12px!important}.network-rematch-wait{display:inline-flex;align-items:center;gap:8px;color:#8e432f;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.network-rematch-wait:before{content:"";width:9px;height:9px;border-radius:50%;background:#c6533d;box-shadow:0 0 0 4px rgba(198,83,61,.16);animation:networkPulse 1.1s ease-in-out infinite}@keyframes networkPulse{50%{opacity:.4;transform:scale(.72)}}
      .network-end-modal .modal-card{width:min(780px,calc(100vw - 24px))!important}.network-end-modal .end-box{padding-bottom:28px}
      @media(max-width:760px){.network-lobby-screen,.network-wait-screen{padding:10px;background-image:url('assets/cover-official-mobile.png')}.network-card{width:100%;max-height:calc(100svh - 20px);box-shadow:7px 7px 0 #6e3d27;overflow:auto}.network-ticket-head{padding:8px 11px;font-size:8px}.network-ticket-body{padding:23px 13px 20px}.network-card p{font-size:13px;margin-top:12px;margin-bottom:17px}.network-actions{flex-direction:column}.network-actions .primary,.network-actions .secondary,.network-actions .danger{width:min(310px,100%);min-height:44px}.network-room-code{font-size:clamp(46px,15vw,66px);padding:11px 13px 8px;letter-spacing:.1em;box-shadow:4px 4px 0 #c6533d}.network-room-input{height:57px;font-size:31px}.network-chip{font-size:9px}.network-turn-note{top:max(5px,env(safe-area-inset-top));font-size:9px;padding:5px 8px}.network-confirm-ticket{padding:24px 15px}.network-rematch-panel{padding:13px 9px}.network-rematch-panel strong{font-size:24px}}
    `;
    document.head.appendChild(style);
  }
  injectNetworkStyles();

  function ensurePeerJS(){
    if(window.Peer)return Promise.resolve(window.Peer);
    if(network.peerLoading)return network.peerLoading;
    network.peerLoading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=PEERJS_URL;s.async=true;
      s.onload=()=>window.Peer?resolve(window.Peer):reject(new Error('PeerJS não carregou.'));
      s.onerror=()=>reject(new Error('Não foi possível carregar a conexão multiplayer.'));
      document.head.appendChild(s);
    }).finally(()=>{network.peerLoading=null});
    return network.peerLoading;
  }

  function sanitizeRoom(value){return String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)}
  function randomRoom(){let code='';for(let i=0;i<6;i++)code+=ROOM_CHARS[Math.floor(Math.random()*ROOM_CHARS.length)];return code}
  function peerId(room){return `headliner-${room.toLowerCase()}`}
  function inviteUrl(room){const url=new URL(location.origin+location.pathname);url.searchParams.set('room',room);return url.toString()}
  function hostUrl(room){const url=new URL(location.origin+location.pathname);url.searchParams.set('host',room);return url.toString()}
  function setUrl(kind,room){try{history.replaceState(null,'',kind&&room?`${location.pathname}?${kind}=${encodeURIComponent(room)}`:location.pathname)}catch(_){}}

  function closeNetworkTransport(){
    network.intentionalClose=true;
    try{network.conn?.close()}catch(_){}
    try{network.peer?.destroy()}catch(_){}
    network.peer=null;network.conn=null;network.connected=false;network.ready=false;network.started=false;
    setTimeout(()=>{network.intentionalClose=false},0);
  }
  function resetNetworkRuntime(){
    closeNetworkTransport();
    network.role=null;network.side=null;network.room=null;network.seq=0;network.lastSeq=-1;
  }

  function networkTicket({kicker,title,description='',content='',actions='',error='',footer=''}){
    return `<section class="network-card"><header class="network-ticket-head"><span>HEADLINER · DUPLA</span><span>BACKSTAGE PASS</span></header><div class="network-ticket-body"><span class="network-kicker">${kicker}</span><h1>${title}</h1>${description?`<p>${description}</p>`:''}${content}${actions}${error?`<div class="network-error" role="alert">${error}</div>`:''}<div class="network-feedback" role="status" aria-live="polite"></div></div><footer class="network-ticket-stub">${footer||'2 JOGADORES · 2 CELULARES'}</footer></section>`;
  }
  function renderNetworkScreen({kind='lobby',...ticket}){
    closeModal();
    $('#app').innerHTML=`<main class="${kind==='wait'?'network-wait-screen':'network-lobby-screen'}">${networkTicket(ticket)}</main>`;
  }
  function showNetworkFeedback(message){const el=document.querySelector('.network-feedback');if(el)el.textContent=message}

  function renderNetworkLobby(error=''){
    renderNetworkScreen({kicker:'Credencial para dois',title:'DUELO ONLINE',description:'Um jogador abre a sala e entrega o código. O outro apresenta a credencial no próprio celular.',actions:'<div class="network-actions"><button class="primary" onclick="createNetworkRoom()">Criar sala</button><button class="secondary" onclick="renderNetworkJoin()">Entrar com código</button></div><div class="network-actions spaced"><button class="danger" onclick="networkBackToMenu()">Voltar ao menu</button></div>',error,footer:'ACESSO · PALCO PRINCIPAL'});
  }
  window.renderNetworkLobby=renderNetworkLobby;

  function renderNetworkJoin(prefill='',error=''){
    const code=sanitizeRoom(prefill||network.room||new URLSearchParams(location.search).get('room'));
    renderNetworkScreen({kicker:'Apresente sua credencial',title:'CÓDIGO DA SALA',description:'Digite os seis caracteres exibidos no celular de quem criou a partida.',content:`<input id="network-room-input" class="network-room-input" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" value="${code}" aria-label="Código da sala">`,actions:'<div class="network-actions"><button class="primary" onclick="joinNetworkRoom(document.querySelector(\'#network-room-input\').value)">Entrar na sala</button><button class="secondary" onclick="renderNetworkLobby()">Voltar</button></div>',error,footer:'ENTRADA · JOGADOR 2'});
    setTimeout(()=>document.querySelector('#network-room-input')?.focus(),30);
  }
  window.renderNetworkJoin=renderNetworkJoin;

  function renderHostWaiting(error=''){
    const status=network.connected?'Jogador 2 conectado':network.ready?'Aguardando Jogador 2':'Abrindo a sala';
    const description=network.connected?'Credenciais conferidas. Preparando a mesa…':network.ready?'Envie o código ou o convite. A partida começa quando a segunda credencial entrar.':'Reservando sua mesa e imprimindo a credencial…';
    const actions=network.ready?'<div class="network-actions"><button class="primary" onclick="shareNetworkInvite()">Compartilhar convite</button><button class="secondary" onclick="copyNetworkInvite()">Copiar link</button></div>':'';
    renderNetworkScreen({kicker:`<i class="network-status-dot ${network.connected?'online':''}"></i>${status}`,title:network.connected?'DUPLA CONFIRMADA':'SUA SALA',description,content:`<span class="network-room-code">${network.room||'······'}</span>`,actions:`${actions}<div class="network-actions spaced"><button class="danger" onclick="confirmNetworkExit('Cancelar esta sala?','O código deixará de aceitar novas conexões.')">Cancelar sala</button></div>`,error,footer:`SALA ${network.room||'EM PREPARO'} · JOGADOR 1`});
  }
  window.renderHostWaiting=renderHostWaiting;

  function renderGuestConnecting(error=''){
    renderNetworkScreen({kicker:`<i class="network-status-dot ${network.connected?'online':''}"></i>${network.connected?'Credencial aceita':'Validando credencial'}`,title:`SALA ${network.room||''}`,description:network.connected?'O Jogador 1 está preparando a mesa. A partida começa em instantes.':'Procurando a sala e conferindo o código…',actions:`<div class="network-actions"><button class="secondary" onclick="renderNetworkJoin('${network.room||''}')">Trocar código</button></div>`,error,footer:'ENTRADA · JOGADOR 2'});
  }

  function renderNetworkWaiting(){
    if(!state||!isNetworkGame())return;
    const owner=state.privateOwner;
    const purpose=state.phase==='INITIAL_REVIEW'?'conferir o próprio monte':'definir o Headliner da rodada';
    renderNetworkScreen({kind:'wait',kicker:`Rodada ${state.round} · sala ${network.room}`,title:`AGUARDANDO ${playerLabel(owner)}`,description:`${playerLabel(owner)} está no outro celular para ${purpose}. Nenhuma carta privada dele aparece aqui.`,content:`<p class="network-room-help">Sua credencial: <strong>${playerLabel(network.side)}</strong> · ${player(network.side)?.deck.length||0} cartas · ${fmt(headlinerTotal(network.side))} pessoas</p>`,actions:'<div class="network-actions spaced"><button class="danger" onclick="requestExitToMenu()">Abandonar partida</button></div>',footer:`SALA ${network.room} · ${playerLabel(network.side)}`});
  }

  function networkBackToMenu(){resetNetworkRuntime();state=null;closeModal();setUrl();renderStart()}
  window.networkBackToMenu=networkBackToMenu;

  function confirmNetworkExit(title='Abandonar a partida?',message='A conexão com o outro celular será encerrada.'){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal network-confirm-modal"><section class="network-confirm-ticket"><span class="network-kicker">Saída da área credenciada</span><h2>${title}</h2><p>${message}</p><div class="network-actions"><button class="secondary" onclick="closeModal()">Continuar aqui</button><button class="primary" onclick="networkBackToMenu()">Confirmar saída</button></div></section></div>`;
  }
  window.confirmNetworkExit=confirmNetworkExit;
  requestExitToMenu=function(){if(!isNetworkGame())return base.requestExitToMenu();confirmNetworkExit()};

  function renderCopyFallback(text){
    const root=$('#modal-root');
    root.innerHTML=`<div class="modal network-confirm-modal"><section class="network-confirm-ticket"><span class="network-kicker">Convite da sala ${network.room}</span><h2>COPIAR CONVITE</h2><p>Copie o endereço abaixo e envie ao Jogador 2.</p><input class="network-copy-field" value="${text}" readonly aria-label="Link do convite" onclick="this.select()"><div class="network-actions"><button class="primary" onclick="document.querySelector('.network-copy-field').select();document.execCommand('copy');closeModal();showNetworkFeedback('Link copiado')">Copiar link</button><button class="secondary" onclick="closeModal()">Fechar</button></div></section></div>`;
  }
  window.showNetworkFeedback=showNetworkFeedback;

  async function copyNetworkInvite(){
    const text=inviteUrl(network.room);
    try{await navigator.clipboard.writeText(text);showNetworkFeedback('Link copiado · convite pronto para enviar')}catch(_){renderCopyFallback(text)}
  }
  window.copyNetworkInvite=copyNetworkInvite;
  async function shareNetworkInvite(){
    const url=inviteUrl(network.room),data={title:'Headliner — duelo',text:`Entre na minha partida de Headliner. Código: ${network.room}`,url};
    if(navigator.share){try{await navigator.share(data);showNetworkFeedback('Convite compartilhado');return}catch(err){if(err?.name==='AbortError')return}}
    copyNetworkInvite();
  }
  window.shareNetworkInvite=shareNetworkInvite;

  function bindConnection(conn){
    network.conn=conn;
    conn.on('open',()=>{
      network.connected=true;
      if(network.role==='host'){
        if(!state||state.mode!==NETWORK_MODE){renderHostWaiting();setTimeout(()=>{if(network.connected&&(!state||state.mode!==NETWORK_MODE))initializeNetworkMatch()},450)}
        else{renderCurrentState();broadcastState()}
      }else{
        renderGuestConnecting();
        safeSend({type:'hello',room:network.room});
      }
    });
    conn.on('data',handleNetworkMessage);
    conn.on('close',()=>{
      network.connected=false;
      if(network.intentionalClose)return;
      if(network.role==='host')renderConnectionLost('O Jogador 2 desconectou. Ele pode entrar novamente com o mesmo código.');
      else renderConnectionLost('A conexão com o Jogador 1 foi encerrada.');
    });
    conn.on('error',()=>{if(!network.intentionalClose)renderConnectionLost('A conexão entre os celulares falhou.')});
  }

  function safeSend(payload){
    try{if(network.conn?.open){network.conn.send(payload);return true}}catch(_){}
    return false;
  }

  async function createNetworkRoom(){
    resetNetworkRuntime();state=null;network.role='host';network.side=P1;network.room=randomRoom();setUrl('host',network.room);renderHostWaiting();
    try{
      await ensurePeerJS();
      const peer=new Peer(peerId(network.room));network.peer=peer;
      peer.on('open',()=>{network.ready=true;renderHostWaiting()});
      peer.on('connection',conn=>{
        if(network.conn?.open){try{conn.send({type:'busy'})}catch(_){};conn.close();return}
        bindConnection(conn);
      });
      peer.on('error',err=>{
        if(err?.type==='unavailable-id'){network.room=randomRoom();setUrl('host',network.room);createNetworkRoom();return}
        renderHostWaiting('Não foi possível abrir a sala. Tente novamente.');
      });
    }catch(err){renderNetworkLobby(err?.message||'Não foi possível iniciar o multiplayer.')}
  }
  window.createNetworkRoom=createNetworkRoom;

  async function joinNetworkRoom(value){
    const code=sanitizeRoom(value);if(code.length!==6){renderNetworkJoin(code,'O código precisa ter 6 caracteres.');return}
    resetNetworkRuntime();state=null;network.role='guest';network.side=P2;network.room=code;setUrl('room',code);renderGuestConnecting();
    try{
      await ensurePeerJS();
      const peer=new Peer();network.peer=peer;
      peer.on('open',()=>{
        const conn=peer.connect(peerId(code),{reliable:true,serialization:'json'});bindConnection(conn);
        const timer=setTimeout(()=>{if(!network.connected)renderNetworkJoin(code,'Não encontrei essa sala. Confira o código ou peça para o Jogador 1 criar outra.')},9000);
        conn.on('open',()=>clearTimeout(timer));
      });
      peer.on('error',err=>{
        if(['peer-unavailable','network','server-error','socket-error'].includes(err?.type))renderNetworkJoin(code,'Não encontrei essa sala ou a conexão caiu. Tente de novo.');
        else renderNetworkJoin(code,'Não foi possível conectar os celulares.');
      });
    }catch(err){renderNetworkJoin(code,err?.message||'Não foi possível iniciar o multiplayer.')}
  }
  window.joinNetworkRoom=joinNetworkRoom;

  function renderConnectionLost(message){
    renderNetworkScreen({kind:'wait',kicker:'Conexão interrompida',title:'PARTIDA PAUSADA',description:message,actions:`<div class="network-actions">${network.role==='guest'?`<button class="primary" onclick="joinNetworkRoom('${network.room}')">Reconectar</button>`:`<button class="primary" onclick="renderHostWaiting()">Exibir credencial</button>`}<button class="secondary" onclick="confirmNetworkExit()">Abandonar partida</button></div>`,error:'O estado da mesa foi preservado. Reconecte antes de continuar.',footer:`SALA ${network.room||''} · OFFLINE`});
  }

  function initializeNetworkMatch(){
    if(network.role!=='host')return;
    clearGameTimers();closeModal();
    const pool=balanced30(),gameId=++gameSerial;
    state={gameId,mode:NETWORK_MODE,round:1,turn:P1,players:{[P1]:{deck:pool.slice(0,15),head:[],lockedThisRound:false},[P2]:{deck:pool.slice(15),head:[],lockedThisRound:false}},pot:[],selectedAttr:null,revealed:false,current:null,lastResult:'',lastWinner:null,pendingWinner:null,encore:null,gameOver:false,phase:'INITIAL_REVIEW',privateOwner:P1,privatePurpose:'initial',privateSlot:null,privateConfirmIndex:null,battleChooser:null,actionLocked:false,justLocked:null,networkEnd:null,networkRematch:{requests:{[P1]:false,[P2]:false},declinedBy:null}};
    network.started=true;renderCurrentState();broadcastState();
  }

  function cardName(card){return card?.name||null}
  function snapshotState(){
    if(!state)return null;
    const snap={...state};
    snap.players={
      [P1]:{...player(P1),deck:player(P1).deck.map(cardName),head:player(P1).head.map(cardName)},
      [P2]:{...player(P2),deck:player(P2).deck.map(cardName),head:player(P2).head.map(cardName)}
    };
    snap.pot=(state.pot||[]).map(cardName);
    snap.current=state.current?{[P1]:cardName(state.current[P1]),[P2]:cardName(state.current[P2])}:null;
    return snap;
  }
  function hydrateState(snap){
    const byName=new Map(CARDS.map(c=>[c.name,c]));
    const card=n=>n?byName.get(n)||null:null;
    const hydrated={...snap};
    hydrated.players={
      [P1]:{...snap.players[P1],deck:snap.players[P1].deck.map(card).filter(Boolean),head:snap.players[P1].head.map(card)},
      [P2]:{...snap.players[P2],deck:snap.players[P2].deck.map(card).filter(Boolean),head:snap.players[P2].head.map(card)}
    };
    hydrated.pot=(snap.pot||[]).map(card).filter(Boolean);
    hydrated.current=snap.current?{[P1]:card(snap.current[P1]),[P2]:card(snap.current[P2])}:null;
    return hydrated;
  }
  function persistHostState(snap){
    if(network.role!=='host'||!network.room||!snap)return;
    try{localStorage.setItem(HOST_STATE_PREFIX+network.room,JSON.stringify({savedAt:Date.now(),seq:network.seq,state:snap}))}catch(_){}
  }
  function broadcastState(){
    if(network.role!=='host'||!state)return;
    const snap=snapshotState();network.seq++;persistHostState(snap);safeSend({type:'state',seq:network.seq,state:snap});
  }

  function handleNetworkMessage(message){
    if(!message||typeof message!=='object')return;
    if(message.type==='busy'&&network.role==='guest'){renderNetworkJoin(network.room,'Essa sala já tem dois jogadores.');return}
    if(message.type==='hello'&&network.role==='host'){if(state)broadcastState();return}
    if(message.type==='state'&&network.role==='guest'){
      if(!message.state||Number(message.seq)<=network.lastSeq)return;
      network.lastSeq=Number(message.seq);state=hydrateState(message.state);network.started=true;renderCurrentState();return;
    }
    if(message.type==='intent'&&network.role==='host')handleRemoteIntent(message.action,message.payload||{});
  }

  function sendIntent(action,payload={}){
    if(network.role!=='guest'||!network.connected)return false;
    return safeSend({type:'intent',action,payload,round:state?.round,phase:state?.phase});
  }

  function handleRemoteIntent(action,payload){
    if(!state||!isNetworkGame()||network.role!=='host')return;
    switch(action){
      case 'finishInitial': if(state.phase==='INITIAL_REVIEW'&&state.privateOwner===P2)networkFinishInitial(P2); break;
      case 'lockHeadliner': if(state.phase==='ROUND_PRIVATE'&&state.privateOwner===P2)networkCommitHeadliner(P2,Number(payload.index),Number(payload.slot)); break;
      case 'finishPrivate': if(state.phase==='ROUND_PRIVATE'&&state.privateOwner===P2)networkFinishPrivate(P2); break;
      case 'chooseAttr': if(state.phase==='ATTRIBUTE'&&state.turn===P2)networkChooseAttribute(String(payload.attr||'')); break;
      case 'nextRound': if(state.phase==='RESULT'&&state.revealed)networkNextRound(); break;
      case 'requestRematch': if(state.gameOver)networkRequestRematch(P2); break;
      case 'declineRematch': if(state.gameOver)networkDeclineRematch(P2); break;
      case 'playAgain': if(state.gameOver)networkRequestRematch(P2); break;
      case 'requestState': broadcastState(); break;
    }
  }

  function networkFinishInitial(side){
    if(!state||state.phase!=='INITIAL_REVIEW'||state.privateOwner!==side)return;
    state.privateSlot=null;state.privateConfirmIndex=null;state.actionLocked=false;
    if(side===P1){state.privateOwner=P2;state.privatePurpose='initial';}
    else{player(P1).lockedThisRound=false;player(P2).lockedThisRound=false;state.phase='ROUND_PRIVATE';state.privateOwner=P1;state.privatePurpose='headliner';}
    renderCurrentState();broadcastState();
  }
  finishInitialReview=function(){
    if(!isNetworkGame())return base.finishInitialReview();
    if(state.phase!=='INITIAL_REVIEW'||state.privateOwner!==network.side||state.actionLocked)return;
    if(network.role==='host')networkFinishInitial(P1);else{state.actionLocked=true;sendIntent('finishInitial');renderNetworkWaiting()}
  };

  function networkCommitHeadliner(side,index,slot){
    if(!state||state.phase!=='ROUND_PRIVATE'||state.privateOwner!==side||state.actionLocked)return;
    if(!Number.isInteger(index)||!Number.isInteger(slot))return;
    state.actionLocked=true;const card=commitHeadliner(side,index,slot);state.actionLocked=false;
    if(!card)return;
    state.privateConfirmIndex=null;state.privateSlot=null;renderCurrentState();broadcastState();
    const gameId=state.gameId;
    setTimeout(()=>{if(state&&state.gameId===gameId&&isNetworkGame()&&state.justLocked){state.justLocked=null;renderCurrentState();broadcastState()}},760);
  }
  commitPrivateHeadliner=function(){
    if(!isNetworkGame())return base.commitPrivateHeadliner();
    if(state.phase!=='ROUND_PRIVATE'||state.privateOwner!==network.side||state.privateConfirmIndex===null||state.privateSlot===null||state.actionLocked)return;
    const index=state.privateConfirmIndex,slot=state.privateSlot;
    if(network.role==='host')networkCommitHeadliner(P1,index,slot);
    else{state.actionLocked=true;sendIntent('lockHeadliner',{index,slot});renderNetworkWaiting()}
  };

  function networkFinishPrivate(side){
    if(!state||state.phase!=='ROUND_PRIVATE'||state.privateOwner!==side||state.actionLocked||state.privateConfirmIndex!==null)return;
    state.privateSlot=null;state.privateConfirmIndex=null;
    if(side===P1){state.privateOwner=P2;state.privatePurpose='headliner';state.phase='ROUND_PRIVATE';}
    else networkPrepareAttribute(false);
    renderCurrentState();broadcastState();
  }
  finishPrivateRound=function(side){
    if(!isNetworkGame())return base.finishPrivateRound(side);
    if(state.phase!=='ROUND_PRIVATE'||state.privateOwner!==side||side!==network.side||state.actionLocked||state.privateConfirmIndex!==null)return;
    if(network.role==='host')networkFinishPrivate(P1);else{state.actionLocked=true;sendIntent('finishPrivate');renderNetworkWaiting()}
  };

  function networkPrepareAttribute(render=true){
    if(!player(P1).deck.length||!player(P2).deck.length){finishGame();return}
    state.privateSlot=null;state.privateConfirmIndex=null;state.privateOwner=null;state.privatePurpose='attribute';state.battleChooser=state.turn;state.actionLocked=false;state.phase='ATTRIBUTE';
    if(render)renderCurrentState();
  }

  function networkChooseAttribute(attr){
    if(!state||state.phase!=='ATTRIBUTE'||state.turn!==state.battleChooser||state.revealed||state.actionLocked)return;
    base.chooseAttr(attr,false);
    if(!state||!isNetworkGame())return;
    renderCurrentState();broadcastState();
  }
  chooseAttr=function(attr,fromCpu=false){
    if(!isNetworkGame())return base.chooseAttr(attr,fromCpu);
    if(state.phase!=='ATTRIBUTE'||state.turn!==network.side||state.battleChooser!==network.side||state.revealed||state.actionLocked)return;
    if(network.role==='host')networkChooseAttribute(attr);else{state.actionLocked=true;sendIntent('chooseAttr',{attr});renderCurrentState()}
  };

  function networkNextRound(){
    if(!state||state.gameOver||state.actionLocked||!state.revealed||state.phase!=='RESULT')return;
    state.actionLocked=true;
    if(state.encore!==null){
      state.encore--;
      if(player(P1).head.filter(Boolean).length===3&&player(P2).head.filter(Boolean).length===3){state.actionLocked=false;finishGame();return}
      if(state.encore<=0){state.actionLocked=false;finishGame();return}
    }
    if(!player(P1).deck.length||!player(P2).deck.length){state.actionLocked=false;finishGame();return}
    state.round++;state.selectedAttr=null;state.revealed=false;state.current=null;state.lastResult='';state.lastWinner=null;player(P1).lockedThisRound=false;player(P2).lockedThisRound=false;state.battleChooser=null;state.privateOwner=P1;state.privatePurpose='headliner';state.privateSlot=null;state.privateConfirmIndex=null;state.phase='ROUND_PRIVATE';state.actionLocked=false;
    renderCurrentState();broadcastState();
  }
  nextRound=function(){
    if(!isNetworkGame())return base.nextRound();
    if(!state||state.phase!=='RESULT'||!state.revealed||state.actionLocked)return;
    if(network.role==='host')networkNextRound();else{state.actionLocked=true;sendIntent('nextRound');renderCurrentState()}
  };

  function networkEndPayload(){
    const p1Total=headlinerTotal(P1),p2Total=headlinerTotal(P2),winner=p1Total===p2Total?null:(p1Total>p2Total?P1:P2);
    return {winner,p1Total,p2Total,name:winner?festivalName(player(winner).head):''};
  }
  finishGame=function(){
    if(!isNetworkGame())return base.finishGame();
    if(!state||state.gameOver)return;
    if(network.role!=='host'){sendIntent('requestState');return}
    state.gameOver=true;state.phase='GAME_OVER';state.actionLocked=false;clearGameTimers();state.networkEnd=networkEndPayload();renderCurrentState();broadcastState();
  };

  function ensureNetworkRematch(){
    if(!state.networkRematch)state.networkRematch={requests:{[P1]:false,[P2]:false},declinedBy:null};
    if(!state.networkRematch.requests)state.networkRematch.requests={[P1]:false,[P2]:false};
    return state.networkRematch;
  }
  function networkRequestRematch(side){
    if(network.role!=='host'||!state?.gameOver)return;
    const rematch=ensureNetworkRematch();rematch.declinedBy=null;rematch.requests[side]=true;
    if(rematch.requests[P1]&&rematch.requests[P2]){initializeNetworkMatch();return}
    renderCurrentState();broadcastState();
  }
  function networkDeclineRematch(side){
    if(network.role!=='host'||!state?.gameOver)return;
    const rematch=ensureNetworkRematch();rematch.declinedBy=side;rematch.requests[side]=false;renderCurrentState();broadcastState();
  }
  function requestNetworkRematch(){
    if(!isNetworkGame()||!state?.gameOver)return;
    if(network.role==='host')networkRequestRematch(P1);
    else{const rematch=ensureNetworkRematch();rematch.declinedBy=null;rematch.requests[P2]=true;renderCurrentState();if(!sendIntent('requestRematch'))renderConnectionLost('Não foi possível enviar o pedido de revanche.')}
  }
  function declineNetworkRematch(){
    if(!isNetworkGame()||!state?.gameOver)return;
    if(network.role==='host')networkDeclineRematch(P1);
    else{const rematch=ensureNetworkRematch();rematch.declinedBy=P2;rematch.requests[P2]=false;renderCurrentState();if(!sendIntent('declineRematch'))renderConnectionLost('Não foi possível responder ao pedido de revanche.')}
  }
  window.requestNetworkRematch=requestNetworkRematch;
  window.declineNetworkRematch=declineNetworkRematch;

  function networkRematchHTML(mine,opponent){
    const rematch=ensureNetworkRematch(),mineAsked=!!rematch.requests[mine],otherAsked=!!rematch.requests[opponent];
    if(rematch.declinedBy)return `<div class="network-rematch-panel"><strong>REVANCHE RECUSADA</strong><p>${rematch.declinedBy===mine?'Você recusou o novo duelo.':'O rival encerrou o pedido de revanche.'}</p><div class="network-actions"><button class="secondary" onclick="confirmNetworkExit('Voltar ao menu?','A sala atual será encerrada.')">Voltar ao menu</button></div></div>`;
    if(otherAsked&&!mineAsked)return `<div class="network-rematch-panel"><strong>REVANCHE PEDIDA</strong><p>O rival quer outro duelo com uma nova distribuição de cartas.</p><div class="network-actions"><button class="primary" onclick="requestNetworkRematch()">Aceitar revanche</button><button class="danger" onclick="declineNetworkRematch()">Recusar</button></div></div>`;
    if(mineAsked&&!otherAsked)return `<div class="network-rematch-panel"><strong>PEDIDO ENVIADO</strong><p>A revanche começa somente se o rival aceitar.</p><span class="network-rematch-wait">Aguardando resposta</span><div class="network-actions spaced"><button class="danger" onclick="confirmNetworkExit('Cancelar e sair?','Seu pedido de revanche será encerrado.')">Cancelar pedido</button></div></div>`;
    return `<div class="network-rematch-panel"><strong>MAIS UM SHOW?</strong><p>A revanche só começa depois que os dois jogadores confirmarem.</p><div class="network-actions"><button class="primary" onclick="requestNetworkRematch()">Pedir revanche</button><button class="secondary" onclick="confirmNetworkExit('Voltar ao menu?','A sala atual será encerrada.')">Voltar ao menu</button></div></div>`;
  }

  function renderNetworkGameOver(){
    base.renderGame();
    const end=state.networkEnd||networkEndPayload(),mine=network.side,opponent=otherSide(mine),winner=end.winner;
    const title=!winner?'EMPATE!':winner===mine?'VOCÊ GANHOU!':'VOCÊ PERDEU!';
    const festival=winner?`<p>O festival vencedor vai se chamar:</p><div class="festival-name">${end.name}</div>`:`<p>Os dois festivais terminaram com o mesmo Público.</p>`;
    const mineTotal=mine===P1?end.p1Total:end.p2Total,oppTotal=opponent===P1?end.p1Total:end.p2Total;
    const root=$('#modal-root');root.innerHTML=`<div class="modal network-end-modal"><div class="modal-card"><div class="end-box"><div class="winner">${title}</div>${festival}<div class="score-row"><div class="score-pill">Seu festival<strong>${fmt(mineTotal)}</strong>pessoas</div><div class="score-pill">Festival rival<strong>${fmt(oppTotal)}</strong>pessoas</div></div>${networkRematchHTML(mine,opponent)}</div></div></div>`;
    decorateNetworkTable();
  }
  playAgain=function(){if(!isNetworkGame())return base.playAgain();requestNetworkRematch()};

  function ownBottomHandHTML(){const count=player(network.side).deck.length;return `<div class="player-area"><div class="local-bottom-hand">${cardBackFanHTML(count)}<div class="count-badge">${count}</div></div></div>`}
  function remoteTopHandHTML(){const side=otherSide(network.side),count=player(side).deck.length;return `<div class="opponent-area"><div class="opponent-fan">${cardBackFanHTML(count,true)}<div class="count-badge">${count}</div></div></div>`}
  opponentHandHTML=function(){return isNetworkGame()?remoteTopHandHTML():base.opponentHandHTML()};
  playerHandHTML=function(){return isNetworkGame()?ownBottomHandHTML():base.playerHandHTML()};
  headZonesHTML=function(){
    if(!isNetworkGame())return base.headZonesHTML();
    const self=network.side,opp=otherSide(self);
    const make=(side,opponent=false)=>Array.from({length:3},(_,slot)=>{const card=player(side).head[slot],fresh=state.justLocked&&state.justLocked.side===side&&state.justLocked.slot===slot;return `<div class="slot ${card?'filled':''} ${fresh?'just-locked':''}" data-side="${side}" data-slot="${slot}">${card?liveCardHTML(card,'headliner'):''}</div>`}).join('');
    return `<div class="headliner-zone opp" data-total="${festivalLabel(opp)} · ${fmt(headlinerTotal(opp))}">${make(opp,true)}</div><div class="headliner-zone you" data-total="${festivalLabel(self)} · ${fmt(headlinerTotal(self))}">${make(self,false)}</div>`;
  };

  function decorateNetworkTable(){
    if(!isNetworkGame())return;
    document.querySelectorAll('.network-chip,.network-turn-note').forEach(el=>el.remove());
    const chip=document.createElement('div');chip.className='network-chip';chip.textContent=`${playerLabel(network.side)} · SALA ${network.room} · ${network.connected?'CONECTADO':'OFFLINE'}`;document.body.appendChild(chip);
    if(state.gameOver)return;
    let text='';
    if(state.phase==='ATTRIBUTE')text=state.turn===network.side?'SUA VEZ · escolha o atributo':'AGUARDE · o outro jogador está escolhendo o atributo';
    else if(state.phase==='RESULT')text='CONFRONTO REVELADO';
    if(text){const note=document.createElement('div');note.className='network-turn-note';note.textContent=text;document.body.appendChild(note)}
    if(state.phase==='ATTRIBUTE'&&state.turn!==network.side)document.querySelectorAll('.attr-btn').forEach(btn=>btn.disabled=true);
  }

  renderCurrentState=function(){
    if(!isNetworkGame())return base.renderCurrentState();
    if(!state)return renderNetworkLobby();
    if(state.gameOver)return renderNetworkGameOver();
    if(['INITIAL_REVIEW','ROUND_PRIVATE'].includes(state.phase)){
      if(state.privateOwner!==network.side)return renderNetworkWaiting();
      if(state.phase==='INITIAL_REVIEW')return renderInitialPrivateDeck();
      return renderPrivateHeadliner();
    }
    base.renderGame();decorateNetworkTable();
  };
  renderGame=function(){
    if(!isNetworkGame())return base.renderGame();
    base.renderGame();decorateNetworkTable();
  };

  exitToMenu=function(){
    if(!isNetworkGame())return base.exitToMenu();
    resetNetworkRuntime();state=null;closeModal();setUrl();renderStart();
  };

  renderStart=function(){
    closeModal();
    document.querySelector('#app').innerHTML=`<div class="start-screen"><div class="start-utility"><button class="utility-icon-btn" onclick="openSettings()" aria-label="Configurações" title="Configurações">${UI_ICON.settings}</button></div><div class="start-box" style="position:relative;z-index:2"><h1>Escolha o modo</h1><p class="start-lead">Monte o festival definitivo, dispute atributos e proteja até 3 artistas como Headliners.</p><div class="start-actions"><button class="mode ticket-control ticket-mode" onclick="reset()"><span class="mode-kicker">Solo</span><strong>1 jogador</strong><small>Contra o computador</small></button><button class="mode alt ticket-control ticket-mode" onclick="startLocalGame()"><span class="mode-kicker">Duelo</span><strong>2 jogadores</strong><small>Cada um no seu celular</small></button></div><div class="start-meta"><span>50 artistas</span><i></i><span>30 por partida</span><i></i><span>15 para cada lado</span></div></div></div>`;
  };
  startLocalGame=function(){renderNetworkLobby()};

  async function restoreHostRoom(code){
    const room=sanitizeRoom(code);if(room.length!==6)return renderNetworkLobby();
    let saved=null;try{saved=JSON.parse(localStorage.getItem(HOST_STATE_PREFIX+room)||'null')}catch(_){}
    resetNetworkRuntime();network.role='host';network.side=P1;network.room=room;setUrl('host',room);
    if(saved?.state){state=hydrateState(saved.state);network.seq=Number(saved.seq)||0;network.started=true}
    renderHostWaiting();
    try{
      await ensurePeerJS();const peer=new Peer(peerId(room));network.peer=peer;
      peer.on('open',()=>{network.ready=true;renderHostWaiting()});
      peer.on('connection',conn=>{if(network.conn?.open){conn.close();return}bindConnection(conn)});
      peer.on('error',()=>renderHostWaiting('Não consegui restaurar a sala. Crie uma nova partida.'));
    }catch(_){renderHostWaiting('Não consegui restaurar a sala. Crie uma nova partida.')}
  }
  window.restoreHostRoom=restoreHostRoom;

  const params=new URLSearchParams(location.search);
  if(params.get('preview')!=='card'){
    const invited=sanitizeRoom(params.get('room'));
    const hosted=sanitizeRoom(params.get('host'));
    const afterOnboarding=window.headlinerRunAfterOnboarding||((continuation)=>continuation());
    if(invited.length===6)setTimeout(()=>afterOnboarding(()=>renderNetworkJoin(invited)),0);
    else if(hosted.length===6)setTimeout(()=>afterOnboarding(()=>{
      renderNetworkScreen({kicker:'Credencial encontrada',title:`SALA ${hosted}`,description:'Existe uma mesa preservada neste celular. Retome a credencial ou abra uma sala nova.',actions:`<div class="network-actions"><button class="primary" onclick="restoreHostRoom('${hosted}')">Retomar sala</button><button class="secondary" onclick="createNetworkRoom()">Criar nova sala</button></div>`,footer:'RECUPERAÇÃO · JOGADOR 1'});
    }),0);
  }
})();
