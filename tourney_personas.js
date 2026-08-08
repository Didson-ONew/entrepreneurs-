/* 400 four-player games. All six personas rotate through every seat; two sit out each
   game. Bots all use the same 'balanced' policy so the persona is the only difference. */
const fs=require("fs");
const src=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const cut=src.indexOf("/* ============================== REACT UI ============================== */");
const vm=require("vm");const box={};const sb={console,Math,Set,Object,Array,JSON,box};
vm.createContext(sb);
vm.runInContext(src.slice(0,cut).replace(/^\s*(import|export)\s.*$/gm,"")+`box.exports={
  initGame,mulberry32,botChoosePlanningTrack,placeMeeple,consumePlanningTurn,buildResolutionQueue,
  botResolveOneAction,runProduction,runBotRevenue,runB2B,runClosingRest,placeNewLH,finalizeGame,
  activeBiz,bizInd,INDUSTRIES,makeTracks,PERSONAS,PERSONA_KEYS,plotCount};`,sb);
const E=box.exports;
const K=E.PERSONA_KEYS;
const stat={}; K.concat(["none"]).forEach(k=>stat[k]={g:0,w:0,last:0,ep:0,cash:0,biz:0,seats:[0,0,0,0]});

function play(seed, personas){
  const st=E.initGame(3,seed);
  const rng=E.mulberry32(seed*104729+11);
  st.players.forEach((p,i)=>{p.isHuman=false;p.archetype="balanced";p.persona=personas[i];});
  for(let k=0;k<(st.humanDraftCount||0);k++){
    const av=E.INDUSTRIES.filter(i=>st.decks[i].length); if(!av.length)break;
    st.players[0].hand.push(st.decks[av[Math.floor(rng()*av.length)]].shift());
  }
  st.phase="planning";
  for(let q=1;q<=12;q++){
    st.quarter=q;st.tracks=E.makeTracks();
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

const N=400;
for(let g=0;g<N;g++){
  const start=g%K.length;
  const four=[0,1,2,3].map(i=>K[(start+i)%K.length]);
  const rot=g%4;
  const assign=[0,1,2,3].map(i=>four[(i+rot)%4]);
  const st=play(800000+g,assign);
  const best=Math.max(...st.players.map(p=>p.epBank));
  const worst=Math.min(...st.players.map(p=>p.epBank));
  const winners=st.players.filter(p=>p.epBank===best);
  st.players.forEach(p=>{
    const k=p.persona||"none"; const s=stat[k];
    s.g++; s.ep+=p.epBank; s.cash+=p.cash; s.biz+=E.activeBiz(p).length;
    s.seats[st.turnOrder.indexOf(p.id)]++;
    if(p.epBank===best&&winners.length===1)s.w++;
    if(p.epBank===worst)s.last++;
  });
}
const rows=K.map(k=>({k,...stat[k],
  win:100*stat[k].w/stat[k].g, lastp:100*stat[k].last/stat[k].g,
  avg:stat[k].ep/stat[k].g})).sort((a,b)=>b.win-a.win);
console.log(`${N} games, every persona plays ${rows[0].g} of them, rotating seats\n`);
console.log("  persona                    ind   win%   last%   avg EP   companies");
rows.forEach(r=>console.log(
  `  ${E.PERSONAS[r.k].name.padEnd(24)} ${E.PERSONAS[r.k].ind}  ${r.win.toFixed(0).padStart(5)}%  ${r.lastp.toFixed(0).padStart(5)}%  ${r.avg.toFixed(1).padStart(7)}  ${(r.biz/r.g).toFixed(2).padStart(9)}`));
console.log(`\n  fair share is 25% \u2014 spread ${(rows[0].win-rows[rows.length-1].win).toFixed(0)} points between best and worst`);
console.log("\n  seat distribution (should be even)");
rows.forEach(r=>console.log(`  ${E.PERSONAS[r.k].name.padEnd(24)} ${JSON.stringify(r.seats)}`));
