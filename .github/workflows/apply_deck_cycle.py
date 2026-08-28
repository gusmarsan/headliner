from pathlib import Path
import subprocess

INDEX = Path('index.html')
OLD = "function balanced30(){const groups=['classic','punk','alt','metal','electronic'];let picked=[];groups.forEach(g=>picked.push(...shuffle(CARDS.filter(c=>c.group===g)).slice(0,6)));return shuffle(picked)}"
NEW = r"""// DECK_CYCLE_START
const DECK_CYCLE_VERSION=1;
const DECK_CYCLE_STORAGE_KEY=`headlinerDeckCycle:v${DECK_CYCLE_VERSION}`;
let deckCycleMemory=null;
function deckCycleRandomIndex(max){
  if(max<=1)return 0;
  try{
    const cryptoObj=globalThis.crypto;
    if(cryptoObj&&typeof cryptoObj.getRandomValues==='function'){
      const range=0x100000000,limit=range-(range%max),buf=new Uint32Array(1);
      do{cryptoObj.getRandomValues(buf)}while(buf[0]>=limit);
      return buf[0]%max;
    }
  }catch(_){/* Math.random fallback below */}
  return Math.floor(Math.random()*max);
}
function deckCycleShuffle(items){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){const j=deckCycleRandomIndex(i+1);[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
function readDeckCycle(){
  if(deckCycleMemory)return deckCycleMemory;
  try{
    const raw=localStorage.getItem(DECK_CYCLE_STORAGE_KEY);
    if(!raw)return null;
    deckCycleMemory=JSON.parse(raw);
    return deckCycleMemory;
  }catch(_){return null}
}
function writeDeckCycle(history){
  deckCycleMemory=history;
  try{localStorage.setItem(DECK_CYCLE_STORAGE_KEY,JSON.stringify(history))}catch(_){/* keep in-memory rotation for this tab */}
}
function deckCycleHistoryIsValid(history,signature,validNames){
  return !!history&&history.version===DECK_CYCLE_VERSION&&history.signature===signature&&
    Array.isArray(history.lastGame)&&history.lastGame.length===30&&new Set(history.lastGame).size===30&&
    history.lastGame.every(name=>validNames.has(name))&&
    history.appearances&&typeof history.appearances==='object'&&history.streaks&&typeof history.streaks==='object';
}
function deckCycleCandidateOrder(cards,history){
  return deckCycleShuffle(cards).sort((a,b)=>{
    const streakA=Math.max(0,Number(history?.streaks?.[a.name])||0),streakB=Math.max(0,Number(history?.streaks?.[b.name])||0);
    const riskA=streakA>=2?1:0,riskB=streakB>=2?1:0;
    if(riskA!==riskB)return riskA-riskB;
    const seenA=Math.max(0,Number(history?.appearances?.[a.name])||0),seenB=Math.max(0,Number(history?.appearances?.[b.name])||0);
    return seenA-seenB;
  });
}
function balanced30(){
  const groups=['classic','punk','alt','metal','electronic'],targetPerGroup=6;
  const signature=CARDS.map(c=>`${c.name}:${c.group}`).sort().join('|');
  const validNames=new Set(CARDS.map(c=>c.name)),byName=new Map(CARDS.map(c=>[c.name,c]));
  const makeFirstPool=()=>{
    let picked=[];
    const canBalance=groups.every(group=>CARDS.filter(c=>c.group===group).length>=targetPerGroup);
    if(canBalance)groups.forEach(group=>picked.push(...deckCycleShuffle(CARDS.filter(c=>c.group===group)).slice(0,targetPerGroup)));
    else picked=deckCycleShuffle(CARDS).slice(0,30);
    return deckCycleShuffle(picked);
  };

  let history=readDeckCycle();
  if(!deckCycleHistoryIsValid(history,signature,validNames))history=null;
  let selected;

  if(!history){
    selected=makeFirstPool();
  }else{
    const lastSet=new Set(history.lastGame);
    const remaining=CARDS.filter(card=>!lastSet.has(card.name));
    if(CARDS.length===50&&remaining.length===20){
      const groupNeeds=new Map();
      let balancedFeasible=true,totalRepeatsNeeded=0;
      for(const group of groups){
        const remainingCount=remaining.filter(card=>card.group===group).length;
        const previousCount=history.lastGame.map(name=>byName.get(name)).filter(card=>card&&card.group===group).length;
        const need=targetPerGroup-remainingCount;
        groupNeeds.set(group,need);
        totalRepeatsNeeded+=need;
        if(need<0||need>previousCount)balancedFeasible=false;
      }
      if(totalRepeatsNeeded!==10)balancedFeasible=false;

      let repeats=[];
      if(balancedFeasible){
        for(const group of groups){
          const need=groupNeeds.get(group);
          const candidates=history.lastGame.map(name=>byName.get(name)).filter(card=>card&&card.group===group);
          repeats.push(...deckCycleCandidateOrder(candidates,history).slice(0,need));
        }
      }else{
        const candidates=history.lastGame.map(name=>byName.get(name)).filter(Boolean);
        repeats=deckCycleCandidateOrder(candidates,history).slice(0,10);
      }
      selected=deckCycleShuffle([...remaining,...repeats]);
    }else{
      history=null;
      selected=makeFirstPool();
    }
  }

  if(selected.length!==30||new Set(selected.map(card=>card.name)).size!==30){
    history=null;
    selected=makeFirstPool();
  }

  const previousSet=new Set(history?.lastGame||[]),selectedSet=new Set(selected.map(card=>card.name));
  const appearances={},streaks={};
  for(const card of CARDS){
    const name=card.name;
    const previousAppearances=Math.max(0,Number(history?.appearances?.[name])||0);
    const previousStreak=Math.max(0,Number(history?.streaks?.[name])||0);
    appearances[name]=previousAppearances+(selectedSet.has(name)?1:0);
    streaks[name]=selectedSet.has(name)?(previousSet.has(name)?previousStreak+1:1):0;
  }
  writeDeckCycle({
    version:DECK_CYCLE_VERSION,
    signature,
    gameNumber:(Math.max(0,Number(history?.gameNumber)||0)+1),
    lastGame:selected.map(card=>card.name),
    appearances,
    streaks
  });
  return selected;
}
// DECK_CYCLE_END"""

html = INDEX.read_text(encoding='utf-8')
count = html.count(OLD)
if count != 1:
    raise SystemExit(f'Expected exactly one balanced30 target, found {count}')
html = html.replace(OLD, NEW, 1)
INDEX.write_text(html, encoding='utf-8')

start = html.index('// DECK_CYCLE_START')
end = html.index('// DECK_CYCLE_END') + len('// DECK_CYCLE_END')
deck_js = Path('/tmp/deck-cycle.js')
deck_js.write_text(html[start:end], encoding='utf-8')

test_js = r"""
const fs=require('fs');
const vm=require('vm');
const {webcrypto}=require('crypto');
const groups=['classic','punk','alt','metal','electronic'];
const CARDS=[];
for(const group of groups)for(let i=1;i<=10;i++)CARDS.push({name:`${group}-${i}`,group});
const backing=new Map();
const localStorage={getItem:key=>backing.has(key)?backing.get(key):null,setItem:(key,value)=>backing.set(key,String(value))};
const context={CARDS,localStorage,crypto:webcrypto,Uint32Array,Math,JSON,Set,Map,Number,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('/tmp/deck-cycle.js','utf8'),context);
let previous=null;
const appearances=new Map(CARDS.map(c=>[c.name,0]));
const streaks=new Map(CARDS.map(c=>[c.name,0]));
for(let game=1;game<=120;game++){
  const pool=vm.runInContext('balanced30()',context);
  const names=pool.map(c=>c.name),set=new Set(names);
  if(pool.length!==30||set.size!==30)throw new Error(`game ${game}: pool is not 30 unique cards`);
  for(const group of groups){
    const count=pool.filter(c=>c.group===group).length;
    if(count!==6)throw new Error(`game ${game}: ${group} has ${count}, expected 6`);
  }
  if(previous){
    const intersection=[...set].filter(name=>previous.has(name)).length;
    const union=new Set([...set,...previous]).size;
    if(intersection!==10)throw new Error(`game ${game}: intersection ${intersection}, expected 10`);
    if(union!==50)throw new Error(`game ${game}: consecutive games cover ${union}, expected 50`);
  }
  for(const card of CARDS){
    const inGame=set.has(card.name);
    appearances.set(card.name,appearances.get(card.name)+(inGame?1:0));
    streaks.set(card.name,inGame?(previous?.has(card.name)?streaks.get(card.name)+1:1):0);
    if(streaks.get(card.name)>2)throw new Error(`game ${game}: ${card.name} appeared 3 games in a row`);
  }
  previous=set;
}
const values=[...appearances.values()];
const spread=Math.max(...values)-Math.min(...values);
if(spread>4)throw new Error(`appearance spread too wide: ${spread}`);
vm.runInContext('deckCycleMemory=null',context);
backing.set('headlinerDeckCycle:v1','{broken json');
const recovered=vm.runInContext('balanced30()',context);
if(recovered.length!==30||new Set(recovered.map(c=>c.name)).size!==30)throw new Error('corrupt storage recovery failed');
console.log(`Deck rotation validated: 120 games; exact 20+10; consecutive union 50; max appearance spread ${spread}.`);
"""
Path('/tmp/test-deck-cycle.js').write_text(test_js, encoding='utf-8')
subprocess.run(['node', '--check', str(deck_js)], check=True)
subprocess.run(['node', '/tmp/test-deck-cycle.js'], check=True)
print('Deck cycle patch and tests passed.')
