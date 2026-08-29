(function(){
  if(!window.HeadlinerNetwork)return;

  const network=window.HeadlinerNetwork;
  const NAME_KEY='headlinerNetworkPlayerName:v1';
  const MSG_PROFILE='headliner:profile:v1';
  const MSG_INITIAL_READY='headliner:initial-ready:v1';
  const MSG_HEADLINER_SUBMIT='headliner:headliner-submit:v1';
  const MSG_PARALLEL_STATE='headliner:parallel-state:v1';
  const MSG_OPPONENT_READY='headliner:opponent-ready:v1';

  const legacy={
    renderCurrentState,
    finishInitialReview,
    selectPrivateSlot,
    previewPrivateHeadliner,
    cancelPrivateHeadlinerConfirm,
    commitPrivateHeadliner,
    finishPrivateRound,
    playerHandHTML,
    playerLabel,
    festivalLabel,
    startLocalGame,
    createNetworkRoom:window.createNetworkRoom,
    joinNetworkRoom:window.joinNetworkRoom,
    restoreHostRoom:window.restoreHostRoom
  };

  const runtime={
    localName:loadStoredName(),
    remoteName:'',
    boundConn:null,
    profileAttempts:0,
    initialLocalReady:new Set(),
    initialRemoteReady:new Set(),
    hostInitial:new Map(),
    localRound:null,
    hostRound:new Map(),
    observer:null
  };

  function networkActive(){return typeof isNetworkGame==='function'&&isNetworkGame()}
  function sanitizeName(value){
    return String(value||'')
      .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .'-]/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,24);
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function loadStoredName(){try{return sanitizeName(localStorage.getItem(NAME_KEY)||'')}catch(_){return ''}}
  function saveLocalName(value){
    const name=sanitizeName(value);
    runtime.localName=name;
    try{if(name)localStorage.setItem(NAME_KEY,name)}catch(_){}
    return name;
  }
  function fallbackName(side){return side===P1?'JOGADOR 1':'JOGADOR 2'}
  function nameForSide(side){
    if(!networkActive())return legacy.playerLabel(side);
    if(side===network.side)return runtime.localName||fallbackName(side);
    return runtime.remoteName||fallbackName(side);
  }
  function sideNameMap(){
    return {
      [network.side]:runtime.localName||fallbackName(network.side),
      [otherSide(network.side)]:runtime.remoteName||fallbackName(otherSide(network.side))
    };
  }

  playerLabel=function(side){return networkActive()?nameForSide(side):legacy.playerLabel(side)};
  festivalLabel=function(side){return networkActive()?`FESTIVAL DE ${nameForSide(side)}`:legacy.festivalLabel(side)};

  function injectStyles(){
    if(document.getElementById('headliner-multiplayer-gameplay-fixes'))return;
    const style=document.createElement('style');
    style.id='headliner-multiplayer-gameplay-fixes';
    style.textContent=`
      .network-name-label{display:block;margin:16px auto 6px;color:#123f50;font-family:var(--ui);font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      .network-name-input{width:min(360px,100%);height:54px;margin:0 auto 18px;padding:0 14px;border:3px solid #123f50;border-radius:2px;background:#fff0c8;color:#123f50;font-family:var(--ui);font-size:20px;font-weight:850;letter-spacing:.02em;text-align:center;outline:none;box-shadow:5px 5px 0 #d0a653}
      .network-name-input:focus{box-shadow:5px 5px 0 #c6533d,0 0 0 4px rgba(198,83,61,.2)}
      .parallel-ready-note{margin:10px auto 0!important;color:#276b55!important;font-size:11px!important;font-weight:900!important;letter-spacing:.06em;text-transform:uppercase}
      .parallel-wait-card{max-width:520px;margin:28px auto;padding:18px;border:2px dashed rgba(149,100,60,.7);background:rgba(255,246,216,.62);text-align:center}
      .parallel-wait-card strong{display:block;margin-bottom:7px;color:#123f50;font-family:var(--display);font-size:30px;font-weight:600;text-transform:uppercase}
      .parallel-own-deck .private-card-button{cursor:default}
      @media(max-width:760px){.network-name-input{height:50px;font-size:18px}.parallel-wait-card{margin:18px auto;padding:14px}.parallel-wait-card strong{font-size:26px}}
    `;
    document.head.appendChild(style);
  }
  injectStyles();

  function networkTicketMarkup({kicker,title,description='',content='',actions='',error='',footer=''}){
    return `<section class="network-card"><header class="network-ticket-head"><span>HEADLINER · DUPLA</span><span>BACKSTAGE PASS</span></header><div class="network-ticket-body"><span class="network-kicker">${kicker}</span><h1>${title}</h1>${description?`<p>${description}</p>`:''}${content}${actions}${error?`<div class="network-error" role="alert">${escapeHtml(error)}</div>`:''}<div class="network-feedback" role="status" aria-live="polite"></div></div><footer class="network-ticket-stub">${footer||'2 JOGADORES · 2 CELULARES'}</footer></section>`;
  }
  function renderNamedScreen(ticket){
    closeModal();
    const app=document.querySelector('#app');
    if(!app)return;
    app.innerHTML=`<main class="network-lobby-screen">${networkTicketMarkup(ticket)}</main>`;
  }
  function nameInputMarkup(){
    return `<label class="network-name-label" for="network-player-name">Seu nome</label><input id="network-player-name" class="network-name-input" type="text" maxlength="24" autocomplete="name" value="${escapeHtml(runtime.localName)}" placeholder="Digite seu nome" aria-label="Seu nome">`;
  }
  function readNameInput(){return saveLocalName(document.querySelector('#network-player-name')?.value||runtime.localName)}
  function showNamedError(message){
    let el=document.querySelector('.network-error');
    if(!el){el=document.createElement('div');el.className='network-error';document.querySelector('.network-ticket-body')?.appendChild(el)}
    if(el)el.textContent=message;
  }
  function requireName(){
    const name=readNameInput();
    if(name)return name;
    showNamedError('Digite seu nome antes de entrar na sala.');
    document.querySelector('#network-player-name')?.focus();
    return '';
  }

  function renderNamedLobby(error=''){
    renderNamedScreen({
      kicker:'Credencial para dois',
      title:'DUELO ONLINE',
      description:'Cada pessoa joga no próprio celular. Informe seu nome antes de criar ou entrar em uma sala.',
      content:nameInputMarkup(),
      actions:'<div class="network-actions"><button class="primary" onclick="createNamedNetworkRoom()">Criar sala</button><button class="secondary" onclick="openNamedNetworkJoin()">Entrar com código</button></div><div class="network-actions spaced"><button class="danger" onclick="networkBackToMenu()">Voltar ao menu</button></div>',
      error,
      footer:'ACESSO · PALCO PRINCIPAL'
    });
  }
  function renderNamedJoin(prefill='',error=''){
    const code=String(prefill||new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
    renderNamedScreen({
      kicker:'Apresente sua credencial',
      title:'CÓDIGO DA SALA',
      description:'Informe seu nome e o código de seis caracteres da sala.',
      content:`${nameInputMarkup()}<label class="network-name-label" for="network-room-input">Código</label><input id="network-room-input" class="network-room-input" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" value="${escapeHtml(code)}" aria-label="Código da sala">`,
      actions:'<div class="network-actions"><button class="primary" onclick="joinNamedNetworkRoom()">Entrar na sala</button><button class="secondary" onclick="renderNamedNetworkLobby()">Voltar</button></div>',
      error,
      footer:'ENTRADA · 2 CELULARES'
    });
    setTimeout(()=>document.querySelector(runtime.localName?'#network-room-input':'#network-player-name')?.focus(),30);
  }
  function renderNamedRestore(code){
    renderNamedScreen({
      kicker:'Credencial encontrada',
      title:`SALA ${escapeHtml(code)}`,
      description:'Existe uma mesa preservada neste celular. Confirme seu nome antes de retomar.',
      content:nameInputMarkup(),
      actions:`<div class="network-actions"><button class="primary" onclick="restoreNamedHostRoom('${escapeHtml(code)}')">Retomar sala</button><button class="secondary" onclick="createNamedNetworkRoom()">Criar nova sala</button></div>`,
      footer:'RECUPERAÇÃO · DONO DA SALA'
    });
  }

  window.renderNamedNetworkLobby=renderNamedLobby;
  window.renderNamedNetworkJoin=renderNamedJoin;
  window.openNamedNetworkJoin=function(){if(!requireName())return;renderNamedJoin('')};
  window.createNamedNetworkRoom=function(){if(!requireName())return;runtime.remoteName='';legacy.createNetworkRoom()};
  window.joinNamedNetworkRoom=function(){
    if(!requireName())return;
    const code=String(document.querySelector('#network-room-input')?.value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
    if(code.length!==6){showNamedError('O código precisa ter 6 caracteres.');document.querySelector('#network-room-input')?.focus();return}
    runtime.remoteName='';legacy.joinNetworkRoom(code);
  };
  window.restoreNamedHostRoom=function(code){if(!requireName())return;runtime.remoteName='';legacy.restoreHostRoom(code)};

  startLocalGame=function(){renderNamedLobby()};

  const params=new URLSearchParams(location.search);
  if(params.get('preview')!=='card'){
    const invited=String(params.get('room')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
    const hosted=String(params.get('host')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);
    const afterOnboarding=window.headlinerRunAfterOnboarding||((continuation)=>continuation());
    if(invited.length===6)setTimeout(()=>afterOnboarding(()=>renderNamedJoin(invited)),30);
    else if(hosted.length===6)setTimeout(()=>afterOnboarding(()=>renderNamedRestore(hosted)),30);
  }

  function sendPatch(payload){
    try{if(network.conn?.open){network.conn.send(payload);return true}}catch(_){}
    return false;
  }
  function sendProfile(){
    if(!runtime.localName||!network.conn?.open)return;
    sendPatch({type:MSG_PROFILE,name:runtime.localName});
    runtime.profileAttempts++;
  }
  function bindPatchChannel(){
    const conn=network.conn;
    if(!conn||conn===runtime.boundConn)return;
    runtime.boundConn=conn;
    runtime.remoteName='';runtime.profileAttempts=0;
    conn.on('data',handlePatchMessage);
    conn.on('open',()=>setTimeout(sendProfile,0));
    if(conn.open)setTimeout(sendProfile,0);
  }
  function syncNamesInDom(root=document.body){
    if(!root||!network.side)return;
    const names=sideNameMap();
    const replacements=[
      [/JOGADOR 1/g,names[P1]],[/Jogador 1/g,names[P1]],[/jogador 1/g,names[P1]],
      [/JOGADOR 2/g,names[P2]],[/Jogador 2/g,names[P2]],[/jogador 2/g,names[P2]]
    ];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    for(const textNode of nodes){
      let value=textNode.nodeValue;
      for(const [pattern,replacement] of replacements)value=value.replace(pattern,replacement);
      if(value!==textNode.nodeValue)textNode.nodeValue=value;
    }
  }
  function startNameObserver(){
    if(runtime.observer)return;
    runtime.observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){if(node.nodeType===1)syncNamesInDom(node);else if(node.nodeType===3)syncNamesInDom(record.target)}
      }
    });
    runtime.observer.observe(document.body,{childList:true,subtree:true});
  }
  startNameObserver();

  setInterval(()=>{
    bindPatchChannel();
    if(network.conn?.open&&!runtime.remoteName&&runtime.profileAttempts<12)sendProfile();
    if(networkActive())syncNamesInDom(document.body);
  },700);

  function gameKey(){return String(state?.gameId??'none')}
  function roundKey(){return `${gameKey()}:${state?.round??0}`}
  function getLocalRound(){
    const key=roundKey();
    if(!runtime.localRound||runtime.localRound.key!==key){runtime.localRound={key,slot:null,confirmIndex:null,submitted:false,choice:null,remoteReady:false}}
    return runtime.localRound;
  }
  function getHostInitial(){
    const key=gameKey();
    if(!runtime.hostInitial.has(key))runtime.hostInitial.set(key,{[P1]:false,[P2]:false});
    return runtime.hostInitial.get(key);
  }
  function getHostRound(){
    const key=roundKey();
    if(!runtime.hostRound.has(key))runtime.hostRound.set(key,{has:{[P1]:false,[P2]:false},choices:{[P1]:null,[P2]:null}});
    return runtime.hostRound.get(key);
  }
  function sendOfficialStateRequest(){
    if(network.role==='guest')sendPatch({type:'intent',action:'requestState',payload:{}});
  }
  function syncParallelState(reason){
    if(network.role!=='host'||!state)return;
    renderCurrentState();
    sendPatch({type:MSG_PARALLEL_STATE,reason,state});
  }

  function handlePatchMessage(message){
    if(!message||typeof message!=='object')return;
    if(message.type===MSG_PROFILE){
      const name=sanitizeName(message.name);
      if(name){runtime.remoteName=name;syncNamesInDom(document.body)}
      return;
    }
    if(message.type===MSG_INITIAL_READY&&network.role==='host'&&state?.phase==='INITIAL_REVIEW'&&String(message.gameId)===gameKey()){
      const ready=getHostInitial();ready[P2]=true;runtime.initialRemoteReady.add(gameKey());
      maybeCompleteInitial();renderCurrentState();return;
    }
    if(message.type===MSG_HEADLINER_SUBMIT&&network.role==='host'&&state?.phase==='ROUND_PRIVATE'&&String(message.gameId)===gameKey()&&Number(message.round)===Number(state.round)){
      const bucket=getHostRound();bucket.has[P2]=true;bucket.choices[P2]=normalizeChoice(P2,message.choice);
      const local=getLocalRound();local.remoteReady=true;
      maybeCompleteHeadliners();renderCurrentState();return;
    }
    if(message.type===MSG_OPPONENT_READY&&network.role==='guest'&&String(message.gameId)===gameKey()){
      if(message.phase==='initial')runtime.initialRemoteReady.add(gameKey());
      if(message.phase==='headliner'&&Number(message.round)===Number(state?.round))getLocalRound().remoteReady=true;
      renderCurrentState();return;
    }
    if(message.type===MSG_PARALLEL_STATE&&network.role==='guest'&&message.state){
      if(message.state.phase!=='ROUND_PRIVATE')runtime.localRound=null;
      sendOfficialStateRequest();
    }
  }

  function renderParallelInitial(){
    if(!state||state.phase!=='INITIAL_REVIEW')return legacy.renderCurrentState();
    closeModal();
    const side=network.side;
    const ready=runtime.initialLocalReady.has(gameKey());
    const otherReady=runtime.initialRemoteReady.has(gameKey());
    if(ready){
      const other=nameForSide(otherSide(side));
      document.querySelector('#app').innerHTML=`<main class="private-deck-screen"><div class="private-deck-shell">${privateDeckHeader(side,'SEU MONTE — ORDEM FIXA','15 cartas · não é possível reorganizar')}<div class="parallel-wait-card"><strong>Monte conferido</strong><p>Você terminou. ${otherReady?`${escapeHtml(other)} também terminou; preparando a rodada…`:`Aguardando ${escapeHtml(other)} terminar de conferir o próprio monte.`}</p></div>${privateDeckItems(side,false)}</div></main>`;
      return;
    }
    document.querySelector('#app').innerHTML=`<main class="private-deck-screen"><div class="private-deck-shell">${privateDeckHeader(side,'SEU MONTE — ORDEM FIXA','15 cartas · não é possível reorganizar')}<div class="private-round-actions"><button class="primary" onclick="finishInitialReview()">Terminei</button></div>${otherReady?`<p class="parallel-ready-note">${escapeHtml(nameForSide(otherSide(side)))} já terminou de conferir o próprio monte.</p>`:''}<div class="parallel-own-deck">${privateDeckItems(side,false)}</div><div class="private-round-actions"><button class="primary" onclick="finishInitialReview()">Terminei</button></div></div></main>`;
  }

  finishInitialReview=function(){
    if(!networkActive())return legacy.finishInitialReview();
    if(!state||state.phase!=='INITIAL_REVIEW')return;
    const key=gameKey();if(runtime.initialLocalReady.has(key))return;
    runtime.initialLocalReady.add(key);
    if(network.role==='host'){
      const ready=getHostInitial();ready[P1]=true;
      sendPatch({type:MSG_OPPONENT_READY,phase:'initial',gameId:key});
      maybeCompleteInitial();
    }else{
      sendPatch({type:MSG_INITIAL_READY,gameId:key});
    }
    renderCurrentState();
  };

  function maybeCompleteInitial(){
    if(network.role!=='host'||state?.phase!=='INITIAL_REVIEW')return;
    const ready=getHostInitial();if(!ready[P1]||!ready[P2])return;
    player(P1).lockedThisRound=false;player(P2).lockedThisRound=false;
    state.privateSlot=null;state.privateConfirmIndex=null;state.actionLocked=false;
    state.phase='ROUND_PRIVATE';state.privateOwner=P1;state.privatePurpose='headliner';
    runtime.localRound=null;
    syncParallelState('initial-complete');
  }

  function parallelSlotsHTML(side,selectedSlot){
    const owner=player(side);
    return `<div class="private-slots">${Array.from({length:3},(_,slot)=>{
      const card=owner.head[slot],selected=selectedSlot===slot;
      return card?`<div class="private-slot filled" aria-label="Vaga ${slot+1}: ${escapeHtml(card.name)}">${liveCardHTML(card,'headliner')}</div>`:`<button class="private-slot ${selected?'selected':''}" onclick="selectPrivateSlot(${slot})"><span class="private-slot-label">${selected?'Vaga escolhida':`Vaga ${slot+1}`}<br>${selected?'Escolha uma carta':''}</span></button>`;
    }).join('')}</div>`;
  }
  function renderParallelHeadliner(){
    if(!state||state.phase!=='ROUND_PRIVATE')return legacy.renderCurrentState();
    closeModal();
    const side=network.side,owner=player(side),local=getLocalRound();
    const opponent=nameForSide(otherSide(side));
    if(local.submitted){
      const label=local.choice?`Headliner: ${escapeHtml(player(side).deck[local.choice.index]?.name||local.choice.cardName||'escolhido')}`:'Sem novo Headliner nesta rodada';
      document.querySelector('#app').innerHTML=`<main class="private-deck-screen"><div class="private-deck-shell">${privateDeckHeader(side,'FASE DE HEADLINER',`rodada ${state.round} · escolhas simultâneas`)}<div class="parallel-wait-card"><strong>Escolha registrada</strong><p>${label}.</p><p>${local.remoteReady?`${escapeHtml(opponent)} também finalizou. Preparando o confronto…`:`Aguardando ${escapeHtml(opponent)} finalizar a própria escolha.`}</p></div>${privateDeckItems(side,false)}</div></main>`;
      return;
    }
    if(local.confirmIndex!==null){
      const card=owner.deck[local.confirmIndex];
      if(!card){local.confirmIndex=null;return renderParallelHeadliner()}
      document.querySelector('#app').innerHTML=`<main class="private-deck-screen"><section class="private-confirm"><span class="privacy-kicker">${escapeHtml(playerLabel(side))} · VAGA ${local.slot+1}</span><h1>TRAVAR COMO HEADLINER?</h1><div class="private-confirm-card">${liveCardHTML(card,'confirm')}</div><p><strong>${escapeHtml(card.name)}</strong> garante <strong>${fmt(card.pub)} pessoas</strong> no seu festival e sai definitivamente do monte quando os dois jogadores finalizarem.</p><div class="private-confirm-actions"><button class="secondary" onclick="cancelPrivateHeadlinerConfirm()">Voltar</button><button class="primary" onclick="commitPrivateHeadliner()">Confirmar Headliner</button></div></section></main>`;
      return;
    }
    const canChoose=owner.head.filter(Boolean).length<3&&owner.deck.length>0;
    const note=!canChoose?'Seu festival já tem 3 Headliners. Finalize sem escolher uma nova carta.':local.slot===null?'Escolha uma vaga vazia e depois qualquer carta do seu monte.':'Agora escolha qualquer carta do seu monte. A ordem não será alterada.';
    document.querySelector('#app').innerHTML=`<main class="private-deck-screen"><div class="private-deck-shell">${privateDeckHeader(side,'FASE DE HEADLINER',`rodada ${state.round} · escolhas simultâneas`)}<section class="private-round-panel"><h2>Seu Festival · ${fmt(headlinerTotal(side))} pessoas</h2>${parallelSlotsHTML(side,local.slot)}<p class="private-round-note">${note}</p>${local.remoteReady?`<p class="parallel-ready-note">${escapeHtml(opponent)} já finalizou. Sua escolha continua privada.</p>`:''}<div class="private-round-actions"><button class="primary" onclick="finishPrivateRound('${side}')">Continuar sem escolher Headliner</button></div></section>${privateDeckItems(side,canChoose&&local.slot!==null)}</div></main>`;
  }

  selectPrivateSlot=function(slot){
    if(!networkActive())return legacy.selectPrivateSlot(slot);
    if(state?.phase!=='ROUND_PRIVATE')return;
    const local=getLocalRound(),owner=player(network.side);
    if(local.submitted||!Number.isInteger(Number(slot))||slot<0||slot>2||owner.head[slot])return;
    local.slot=Number(slot);local.confirmIndex=null;renderParallelHeadliner();
  };
  previewPrivateHeadliner=function(index){
    if(!networkActive())return legacy.previewPrivateHeadliner(index);
    if(state?.phase!=='ROUND_PRIVATE')return;
    const local=getLocalRound(),owner=player(network.side),idx=Number(index);
    if(local.submitted||local.slot===null||!Number.isInteger(idx)||!owner.deck[idx]||owner.head[local.slot])return;
    local.confirmIndex=idx;renderParallelHeadliner();
  };
  cancelPrivateHeadlinerConfirm=function(){
    if(!networkActive())return legacy.cancelPrivateHeadlinerConfirm();
    const local=getLocalRound();local.confirmIndex=null;renderParallelHeadliner();
  };
  function normalizeChoice(side,choice){
    if(!choice)return null;
    const index=Number(choice.index),slot=Number(choice.slot),owner=player(side);
    if(!owner||!Number.isInteger(index)||!Number.isInteger(slot)||slot<0||slot>2||!owner.deck[index]||owner.head[slot])return null;
    return {index,slot,cardName:owner.deck[index].name};
  }
  function submitLocalHeadliner(choice){
    if(!state||state.phase!=='ROUND_PRIVATE')return;
    const local=getLocalRound();if(local.submitted)return;
    const normalized=normalizeChoice(network.side,choice);
    local.submitted=true;local.choice=normalized;
    if(network.role==='host'){
      const bucket=getHostRound();bucket.has[P1]=true;bucket.choices[P1]=normalized;
      sendPatch({type:MSG_OPPONENT_READY,phase:'headliner',gameId:gameKey(),round:state.round});
      maybeCompleteHeadliners();
    }else{
      sendPatch({type:MSG_HEADLINER_SUBMIT,gameId:gameKey(),round:state.round,choice:normalized});
    }
    renderCurrentState();
  }
  commitPrivateHeadliner=function(){
    if(!networkActive())return legacy.commitPrivateHeadliner();
    const local=getLocalRound();
    if(local.confirmIndex===null||local.slot===null)return;
    submitLocalHeadliner({index:local.confirmIndex,slot:local.slot});
  };
  finishPrivateRound=function(side){
    if(!networkActive())return legacy.finishPrivateRound(side);
    if(state?.phase!=='ROUND_PRIVATE'||(side&&side!==network.side))return;
    submitLocalHeadliner(null);
  };

  function maybeCompleteHeadliners(){
    if(network.role!=='host'||state?.phase!=='ROUND_PRIVATE')return;
    const bucket=getHostRound();if(!bucket.has[P1]||!bucket.has[P2])return;
    for(const side of [P1,P2]){
      const choice=normalizeChoice(side,bucket.choices[side]);
      if(choice)commitHeadliner(side,choice.index,choice.slot);
    }
    state.justLocked=null;state.privateSlot=null;state.privateConfirmIndex=null;state.privateOwner=null;state.privatePurpose='attribute';state.battleChooser=state.turn;state.actionLocked=false;
    if(!player(P1).deck.length||!player(P2).deck.length){finishGame();return}
    state.phase='ATTRIBUTE';
    runtime.hostRound.delete(roundKey());runtime.localRound=null;
    syncParallelState('headliners-complete');
  }

  renderCurrentState=function(){
    if(!networkActive())return legacy.renderCurrentState();
    if(!state)return legacy.renderCurrentState();
    if(state.phase==='INITIAL_REVIEW')return renderParallelInitial();
    if(state.phase==='ROUND_PRIVATE')return renderParallelHeadliner();
    return legacy.renderCurrentState();
  };

  function networkOwnHandHTML(){
    const owner=player(network.side);if(!owner)return '';
    const cards=owner.deck.slice(0,5),n=cards.length,middle=(n-1)/2,step=n>1?Math.max(72,Math.min(150,Math.round(680/(n-1)))):0;
    return `<div class="player-area"><div class="hand-fan">${cards.map((card,i)=>{const offset=i-middle,ratio=middle?offset/middle:0,x=Math.round(offset*step),angle=Math.round(ratio*2),drop=Math.round(Math.abs(ratio)*8);return `<button type="button" class="hand-card ${i===0?'is-next':''}" style="--hand-x:${x}px;--hand-x-mobile:${Math.round(x*.4)}px;--hand-rotate:${angle}deg;--hand-drop:${drop}px;--hand-drop-mobile:${Math.round(drop*.55)}px;z-index:${i+2}" onclick="openNetworkOwnDeck()" aria-label="${i===0?'Próxima carta: ':''}${card.name}. Abrir monte">${i===0?'<span class="next-card-marker" aria-hidden="true"><i>↓</i> Próxima carta</span>':''}${liveCardHTML(card,'hand')}</button>`}).join('')}</div></div>`;
  }
  playerHandHTML=function(){return networkActive()?networkOwnHandHTML():legacy.playerHandHTML()};
  window.openNetworkOwnDeck=function(){
    if(!networkActive()||!state||state.gameOver)return;
    const root=document.querySelector('#modal-root'),owner=player(network.side);if(!root||!owner)return;
    root.innerHTML=`<div class="modal"><div class="modal-card deck-modal-card"><div class="modal-head"><div><h2>Seu monte — ordem fixa</h2><div class="help">${escapeHtml(playerLabel(network.side))}, estas são as cartas que ainda estão no seu monte.</div></div><button class="close" onclick="closeModal()" aria-label="Fechar seu monte">×</button></div><div class="deck-grid">${owner.deck.map((card,index)=>`<div class="deck-entry"><div class="position">${index===0?'PRÓXIMA CARTA':`posição ${index+1}`}</div>${liveCardHTML(card,'deck')}</div>`).join('')}</div></div></div>`;
  };

  syncNamesInDom(document.body);
})();
