(function(){
  const ROOM_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const NETWORK_MODE='network';
  const PEERJS_URL='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
  const HOST_STATE_PREFIX='headlinerNetworkHostState:';
  const network={peer:null,conn:null,role:null,side:null,room:null,connected:false,seq:0,lastSeq:-1,intentionalClose:false,peerLoading:null,started:false};
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
      .network-lobby-screen,.network-wait-screen{position:fixed;inset:0;z-index:70;min-height:100svh;display:grid;place-items:center;padding:20px;color:#fff0c8;background:#081d27 url('assets/festival-top.webp') center/cover no-repeat;overflow:auto}
      .network-lobby-screen:before,.network-wait-screen:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,14,19,.78),rgba(6,24,32,.94)),radial-gradient(circle at 50% 32%,rgba(41,157,190,.38),transparent 50%)}
      .network-card{position:relative;z-index:1;width:min(590px,94vw);padding:30px;border:3px solid #e1bd67;background:#123d50;box-shadow:12px 12px 0 rgba(4,13,18,.68),0 28px 70px rgba(0,0,0,.44);text-align:center}
      .network-card h1{margin:0;color:#fff0c4;font-family:var(--display);font-size:clamp(42px,9vw,72px);font-weight:600;line-height:.84;letter-spacing:.025em;text-transform:uppercase}
      .network-card h2{margin:5px 0 0;color:#fff0c4;font-family:var(--display);font-size:clamp(30px,7vw,50px);font-weight:600;line-height:.9;text-transform:uppercase}
      .network-card p{max-width:460px;margin:16px auto 22px;color:#d7e9e3;font-size:15px;line-height:1.45}
      .network-kicker{display:block;margin-bottom:8px;color:#e4bd57;font-family:var(--ui);font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
      .network-actions{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.network-actions .primary,.network-actions .secondary{min-height:46px;min-width:180px}
      .network-room-code{display:block;margin:14px auto 8px;padding:10px 18px;width:max-content;max-width:100%;border:2px solid #e1bd67;background:#f1dfae;color:#173d49;font-family:var(--display);font-size:clamp(38px,10vw,68px);font-weight:600;letter-spacing:.12em;line-height:1}
      .network-room-help{margin:6px auto 18px!important;font-size:12px!important;opacity:.9}.network-room-input{width:min(330px,100%);height:54px;margin:8px auto 16px;padding:0 14px;border:2px solid #e1bd67;border-radius:0;background:#f7e6bb;color:#173d49;font-family:var(--display);font-size:30px;font-weight:600;letter-spacing:.12em;text-align:center;text-transform:uppercase;outline:none}.network-room-input:focus{box-shadow:0 0 0 4px rgba(255,213,102,.25)}
      .network-status-dot{display:inline-block;width:9px;height:9px;margin-right:7px;border-radius:50%;background:#e5bd55;box-shadow:0 0 0 3px rgba(229,189,85,.2)}.network-status-dot.online{background:#65d18d;box-shadow:0 0 0 3px rgba(101,209,141,.2)}
      .network-chip{position:fixed;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:40;padding:6px 9px;border:1px solid rgba(247,233,200,.45);background:rgba(7,28,37,.86);color:#f8e8bd;font-size:10px;font-weight:850;letter-spacing:.04em;pointer-events:none;box-shadow:0 5px 14px rgba(0,0,0,.24)}
      .network-turn-note{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:41;max-width:min(520px,88vw);padding:7px 12px;border:1px solid rgba(229,189,85,.65);background:rgba(12,50,65,.92);color:#f8e3aa;font-size:11px;font-weight:900;letter-spacing:.06em;text-align:center;text-transform:uppercase;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.24)}
      .network-error{margin:12px auto 0;padding:9px 10px;border:1px solid #d56a54;background:rgba(129,42,33,.45);color:#ffe2d5;font-size:12px;line-height:1.35}
      @media(max-width:760px){.network-lobby-screen,.network-wait-screen{padding:12px}.network-card{padding:25px 16px}.network-card p{font-size:14px}.network-actions{flex-direction:column}.network-actions .primary,.network-actions .secondary{width:min(300px,100%)}.network-room-code{font-size:52px}.network-room-input{font-size:27px}.network-chip{font-size:9px}.network-turn-note{top:max(5px,env(safe-area-inset-top));font-size:9px;padding:5px 8px}}
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
    network.peer=null;network.conn=null;network.connected=false;network.started=false;
    setTimeout(()=>{network.intentionalClose=false},0);
  }
  function resetNetworkRuntime(){
    closeNetworkTransport();
    network.role=null;network.side=null;network.room=null;network.seq=0;network.lastSeq=-1;
  }

  function renderNetworkLobby(error=''){
    closeModal();
    $('#app').innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker">2 jogadores · 2 celulares</span><h1>DUELO ONLINE</h1><p>Um jogador cria a partida e envia o código ou o link. O outro entra pelo próprio celular.</p><div class="network-actions"><button class="primary" onclick="createNetworkRoom()">Criar partida</button><button class="secondary" onclick="renderNetworkJoin()">Entrar em partida</button></div>${error?`<div class="network-error">${error}</div>`:''}<div class="network-actions" style="margin-top:18px"><button class="secondary" onclick="networkBackToMenu()">Voltar</button></div></section></main>`;
  }
  window.renderNetworkLobby=renderNetworkLobby;

  function renderNetworkJoin(prefill='',error=''){
    const code=sanitizeRoom(prefill||network.room||new URLSearchParams(location.search).get('room'));
    closeModal();
    $('#app').innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker">Entrar na partida</span><h1>CÓDIGO DA SALA</h1><p>Digite o código que apareceu no celular de quem criou a partida.</p><input id="network-room-input" class="network-room-input" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" value="${code}" aria-label="Código da sala"><div class="network-actions"><button class="primary" onclick="joinNetworkRoom(document.querySelector('#network-room-input').value)">Entrar</button><button class="secondary" onclick="renderNetworkLobby()">Voltar</button></div>${error?`<div class="network-error">${error}</div>`:''}</section></main>`;
    setTimeout(()=>document.querySelector('#network-room-input')?.focus(),30);
  }
  window.renderNetworkJoin=renderNetworkJoin;

  function renderHostWaiting(error=''){
    closeModal();
    $('#app').innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker"><i class="network-status-dot ${network.connected?'online':''}"></i>${network.connected?'Jogador 2 conectado':'Aguardando Jogador 2'}</span><h1>SUA SALA</h1><span class="network-room-code">${network.room}</span><p class="network-room-help">Envie este código ou compartilhe o convite. A partida começa automaticamente quando o outro celular conectar.</p><div class="network-actions"><button class="primary" onclick="shareNetworkInvite()">Compartilhar convite</button><button class="secondary" onclick="copyNetworkInvite()">Copiar link</button></div>${error?`<div class="network-error">${error}</div>`:''}<div class="network-actions" style="margin-top:18px"><button class="secondary" onclick="networkBackToMenu()">Cancelar sala</button></div></section></main>`;
  }

  function renderGuestConnecting(error=''){
    closeModal();
    $('#app').innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker"><i class="network-status-dot ${network.connected?'online':''}"></i>${network.connected?'Conectado':'Conectando'}</span><h1>SALA ${network.room||''}</h1><p>${network.connected?'Sincronizando a partida…':'Procurando o outro celular…'}</p>${error?`<div class="network-error">${error}</div>`:''}<div class="network-actions"><button class="secondary" onclick="renderNetworkJoin('${network.room||''}')">Voltar</button></div></section></main>`;
  }

  function renderNetworkWaiting(){
    if(!state||!isNetworkGame())return;
    const owner=state.privateOwner;
    const purpose=state.phase==='INITIAL_REVIEW'?'conferir o próprio monte':'definir o Headliner da rodada';
    closeModal();
    $('#app').innerHTML=`<main class="network-wait-screen"><section class="network-card"><span class="network-kicker">Rodada ${state.round} · sala ${network.room}</span><h2>AGUARDANDO ${playerLabel(owner)}</h2><p>${playerLabel(owner)} está no outro celular para ${purpose}. Nenhuma carta privada dele aparece aqui.</p><div class="network-room-help">Seu lado: <strong>${playerLabel(network.side)}</strong> · ${player(network.side)?.deck.length||0} cartas no monte · ${fmt(headlinerTotal(network.side))} pessoas no festival</div><div class="network-actions" style="margin-top:18px"><button class="secondary" onclick="requestExitToMenu()">Voltar ao menu</button></div></section></main>`;
  }

  function networkBackToMenu(){resetNetworkRuntime();state=null;setUrl();renderStart()}
  window.networkBackToMenu=networkBackToMenu;

  async function copyNetworkInvite(){
    const text=inviteUrl(network.room);
    try{await navigator.clipboard.writeText(text);toast('Link copiado.')}catch(_){window.prompt('Copie este link:',text)}
  }
  window.copyNetworkInvite=copyNetworkInvite;
  async function shareNetworkInvite(){
    const url=inviteUrl(network.room),data={title:'Headliner — duelo',text:`Entre na minha partida de Headliner. Código: ${network.room}`,url};
    if(navigator.share){try{await navigator.share(data);return}catch(_){}}
    copyNetworkInvite();
  }
  window.shareNetworkInvite=shareNetworkInvite;

  function bindConnection(conn){
    network.conn=conn;
    conn.on('open',()=>{
      network.connected=true;
      if(network.role==='host'){
        if(!state||state.mode!==NETWORK_MODE)initializeNetworkMatch();
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
      peer.on('open',()=>renderHostWaiting());
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
    closeModal();
    $('#app').innerHTML=`<main class="network-wait-screen"><section class="network-card"><span class="network-kicker">Conexão interrompida</span><h2>PARTIDA PAUSADA</h2><p>${message}</p><div class="network-actions">${network.role==='guest'?`<button class="primary" onclick="joinNetworkRoom('${network.room}')">Reconectar</button>`:`<button class="primary" onclick="renderHostWaiting()">Mostrar código da sala</button>`}<button class="secondary" onclick="networkBackToMenu()">Voltar ao menu</button></div></section></main>`;
  }

  function initializeNetworkMatch(){
    if(network.role!=='host')return;
    clearGameTimers();closeModal();
    const pool=balanced30(),gameId=++gameSerial;
    state={gameId,mode:NETWORK_MODE,round:1,turn:P1,players:{[P1]:{deck:pool.slice(0,15),head:[],lockedThisRound:false},[P2]:{deck:pool.slice(15),head:[],lockedThisRound:false}},pot:[],selectedAttr:null,revealed:false,current:null,lastResult:'',lastWinner:null,pendingWinner:null,encore:null,gameOver:false,phase:'INITIAL_REVIEW',privateOwner:P1,privatePurpose:'initial',privateSlot:null,privateConfirmIndex:null,battleChooser:null,actionLocked:false,justLocked:null,networkEnd:null};
    network.started=true;network.seq=0;renderCurrentState();broadcastState();
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
      case 'playAgain': if(state.gameOver)initializeNetworkMatch(); break;
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

  function renderNetworkGameOver(){
    base.renderGame();
    const end=state.networkEnd||networkEndPayload(),mine=network.side,opponent=otherSide(mine),winner=end.winner;
    const title=!winner?'EMPATE!':winner===mine?'VOCÊ GANHOU!':'VOCÊ PERDEU!';
    const festival=winner?`<p>O festival vencedor vai se chamar:</p><div class="festival-name">${end.name}</div>`:`<p>Os dois festivais terminaram com o mesmo Público.</p>`;
    const mineTotal=mine===P1?end.p1Total:end.p2Total,oppTotal=opponent===P1?end.p1Total:end.p2Total;
    const root=$('#modal-root');root.innerHTML=`<div class="modal"><div class="modal-card" style="width:min(880px,96vw)"><div class="end-box"><div class="winner">${title}</div>${festival}<div class="score-row"><div class="score-pill">Seu festival<strong>${fmt(mineTotal)}</strong>pessoas</div><div class="score-pill">Festival rival<strong>${fmt(oppTotal)}</strong>pessoas</div></div><button class="primary" onclick="playAgain()">Jogar de novo</button></div></div></div>`;
    decorateNetworkTable();
  }
  playAgain=function(){
    if(!isNetworkGame())return base.playAgain();
    if(network.role==='host')initializeNetworkMatch();else sendIntent('playAgain');
  };

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
    document.querySelector('#app').innerHTML=`<div class="start-screen"><div class="start-utility"><button class="utility-icon-btn" onclick="openSettings()" aria-label="Configurações" title="Configurações">${UI_ICON.settings}</button></div><div class="start-box" style="position:relative;z-index:2"><h1>Escolha o modo</h1><p class="start-lead">Monte o festival definitivo, dispute atributos e proteja até 3 artistas como Headliners.</p><div class="start-actions"><button class="mode" onclick="reset()"><span class="mode-kicker">Solo</span><strong>1 jogador</strong><small>Contra o computador</small></button><button class="mode alt" onclick="startLocalGame()"><span class="mode-kicker">Duelo</span><strong>2 jogadores</strong><small>Cada um no seu celular</small></button></div><div class="start-meta"><span>50 artistas</span><i></i><span>30 por partida</span><i></i><span>15 para cada lado</span></div></div></div>`;
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
      peer.on('open',()=>renderHostWaiting());
      peer.on('connection',conn=>{if(network.conn?.open){conn.close();return}bindConnection(conn)});
      peer.on('error',()=>renderHostWaiting('Não consegui restaurar a sala. Crie uma nova partida.'));
    }catch(_){renderHostWaiting('Não consegui restaurar a sala. Crie uma nova partida.')}
  }
  window.restoreHostRoom=restoreHostRoom;

  const params=new URLSearchParams(location.search);
  if(params.get('preview')!=='card'){
    const invited=sanitizeRoom(params.get('room'));
    const hosted=sanitizeRoom(params.get('host'));
    if(invited.length===6)setTimeout(()=>renderNetworkJoin(invited),0);
    else if(hosted.length===6)setTimeout(()=>{
      closeModal();$('#app').innerHTML=`<main class="network-lobby-screen"><section class="network-card"><span class="network-kicker">Sala anterior</span><h1>${hosted}</h1><p>Você pode tentar retomar esta sala neste celular ou começar de novo.</p><div class="network-actions"><button class="primary" onclick="restoreHostRoom('${hosted}')">Retomar sala</button><button class="secondary" onclick="createNetworkRoom()">Criar nova sala</button></div></section></main>`;
    },0);
  }
})();
