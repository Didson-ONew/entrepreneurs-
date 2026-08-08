/* Does the market-aware draft actually beat the old one? Seat 0 uses it, seats 1-3 use
   the naive value-per-cost draft. Everything else is identical. */
const fs=require("fs");
const src=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const cut=src.indexOf("/* ============================== REACT UI ============================== */");
const vm=require("vm");const box={};const sb={console,Math,Set,Object,Array,JSON,box};
vm.createContext(sb);
vm.runInContext(src.slice(0,cut).replace(/^\s*(import|export)\s.*$/gm,"")+`box.exports={
  initGame,mulberry32,botChoosePlanningTrack,placeMeeple,consumePlanningTurn,buildResolutionQueue,
  botResolveOneAction,runProduction,runBotRevenue,runB2B,runClosingRest,placeNewLH,finalizeGame,
  activeBiz,INDUSTRIES,makeTracks};`,sb);
const E=sb.box.exports;

function play(seed, aware){
  const st=E.initGame(3,seed,undefined,aware);
  const rng=E.mulberry32(seed*13+5);
  st.players.forEach(p=>{if(p.isHuman){p.isHuman=false;p.archetype="balanced";}});
  for(let k=0;k<(st.humanDraftCount||0);k++){
    const av=E.INDUSTRIES.filter(i=>st.decks[i].length); if(!av.length)break;
    st.players[0].hand.push(st.decks[av[Math.floor(rng()*av.length)]].shift());
  }
  st.phase="planning";
  for(let q=1;q<=12;q++){
    st.quarter=q; st.tracks=E.makeTracks();
    st.planningQueue=[...st.turnOrder,...st.turnOrder];
    let g=0;
    while(st.planningQueue.length&&g++<60){
      const pid=st.planningQueue[0];const p=st.players.find(x=>x.id===pid);
      const tr=E.botChoosePlanningTrack(st,p);
      if(!E.placeMeeple(st,pid,tr)){st.planningQueue.shift();continue;}
      E.consumePlanningTurn(st,pid,tr);
    }
    for(const e of E.buildResolutionQueue(st)){
      const p=st.players.find(x=>x.id===e.playerId);
      for(let i=0;i<e.actionsRemaining;i++)E.botResolveOneAction(st,p,e.track,rng,()=>{});
    }
    E.runProduction(st,()=>{});E.runBotRevenue(st);E.runB2B(st,()=>{});
    E.placeNewLH(st,rng,()=>{});E.runClosingRest(st,()=>{});
  }
  E.finalizeGame(st);
  return st;
}

const N=120;
let wins=0, epAware=0, epNaive=0, ties=0;
for(let g=0;g<N;g++){
  const st=play(700000+g,[0]);                 // only seat 0 reads the draft
  const me=st.players.find(p=>p.id===0);
  const others=st.players.filter(p=>p.id!==0);
  const best=Math.max(...others.map(p=>p.epBank));
  if(me.epBank>best)wins++; else if(me.epBank===best)ties++;
  epAware+=me.epBank;
  epNaive+=others.reduce((a,p)=>a+p.epBank,0)/others.length;
}
console.log(`${N} games: seat 0 drafts market-aware, seats 1-3 draft naively\n`);
console.log(`  market-aware bot wins outright : ${wins} (${(100*wins/N).toFixed(0)}%)   ties ${ties}`);
console.log(`  expected if all equal          : ${(100/4).toFixed(0)}%`);
console.log(`  avg EP  market-aware ${ (epAware/N).toFixed(1) }  vs  naive ${ (epNaive/N).toFixed(1) }`);
