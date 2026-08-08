const fs=require('fs');
const src=fs.readFileSync('EntrepreneursGame.jsx','utf8');
const cut=src.indexOf('/* ============================== REACT UI ============================== */');
const vm=require('vm');const box={};const sb={console,Math,Set,Object,Array,JSON,box};
vm.createContext(sb);
vm.runInContext(src.slice(0,cut).replace(/^\s*(import|export)\s.*$/gm,'')+`box.exports={
  initGame,mulberry32,startPlanning,advancePlanning,placeMeeple,consumePlanningTurn,
  humanCompleteResolutionAction,advanceResolution,humanLiquidationDone,finishDelivery,
  doBuyPlot,doLaunch,doLoan,plotValue,discsFree,canLaunchMore,SCALING,findFootprint,
  finishQuarterAfterLH,finishQuarterAfterRepay,doPlaceLH,skipDelivery,isCrossDistrictEdge,
  activeBiz,INDUSTRIES,byId,eligibleSlotsFor,humanDeliver,doRepayLoan,LOAN_REPAY_RATE,
  bizInd,epTotal};`,sb);
const E=sb.box.exports;

const st=E.initGame(1,4242,['Ana','Bruno']);   // 2 humans + 1 bot
const rng=E.mulberry32(77);
const logs=[];
const log=(m,pid)=>logs.push(m);
const humans=st.players.filter(p=>p.isHuman).map(p=>p.id);
console.log('players:',st.players.map(p=>`${p.id}:${p.name}${p.isHuman?'(H)':'(bot)'}`).join('  '));
console.log('seating:',JSON.stringify(st.turnOrder));

// --- DRAFT: each human in queue order ---
let guard=0;
while(st.phase==='drafting'&&guard++<40){
  const pid=st.awaitingPlayerId;
  const p=E.byId(st,pid);
  const need=st.draftCounts[pid];
  while(p.hand.length<need){
    const av=E.INDUSTRIES.filter(i=>st.decks[i].length);
    if(!av.length)break;
    p.hand.push(st.decks[av[0]].shift());
  }
  st.draftQueue=st.draftQueue.filter(x=>x!==pid);
  if(st.draftQueue.length){st.awaitingPlayerId=st.draftQueue[0];}
  else{st.awaitingPlayerId=null;st.phase='planning';E.startPlanning(st);E.advancePlanning(st,rng,log);}
}
console.log('after draft: phase',st.phase,'| hands',st.players.map(p=>p.hand.length).join('/'));

const phaseSeen={};
let iter=0;
while(st.phase!=='gameover'&&iter++<4000){
  phaseSeen[st.phase]=(phaseSeen[st.phase]||0)+1;
  if(st.phase==='planning'){
    const pid=st.planningQueue[0];
    if(pid===undefined){E.advancePlanning(st,rng,log);continue;}
    const p=E.byId(st,pid);
    if(!p.isHuman){E.advancePlanning(st,rng,log);continue;}
    const tr=['ma','rd','raise_capital'].find(t=>st.tracks[t].some(x=>x===null))||'raise_capital';
    if(E.placeMeeple(st,pid,tr))E.consumePlanningTurn(st,pid,tr);
    else st.planningQueue.shift();
    E.advancePlanning(st,rng,log);
  }
  else if(st.phase==='resolving'){
    if(!st.pendingHumanAction){E.advanceResolution(st,rng,log);continue;}
    const ent=st.pendingHumanAction;
    const p=E.byId(st,ent.playerId);
    // simple but real strategy: get cash, buy land, build
    if(ent.track==='raise_capital'&&p.cash<25&&E.discsFree(st,p)>0){E.doLoan(st,p,log);}
    else if(ent.track==='ma'){
      const bp=p.hand.find(b=>p.cash>=b.setup+6);
      const owned=Object.entries(st.board.owner).filter(([k,v])=>v===p.id&&!(k in st.board.occupiedBy)).map(([k])=>k);
      if(bp&&E.canLaunchMore(p)&&E.discsFree(st,p)>0){
        const need=E.SCALING[bp.ind]==='H'?bp.lvl:1;
        if(owned.length>=need)E.doLaunch(st,p,bp,rng,log,owned.slice(0,need));
        else{const un=Object.keys(st.board.graph).filter(k=>!(k in st.board.owner));
          const cheap=un.map(k=>[k,E.plotValue(st,k)]).sort((a,b)=>a[1]-b[1])[0];
          if(cheap&&p.cash>=cheap[1])E.doBuyPlot(st,p,cheap[0],log);}
      } else {
        const un=Object.keys(st.board.graph).filter(k=>!(k in st.board.owner));
        const cheap=un.map(k=>[k,E.plotValue(st,k)]).sort((a,b)=>a[1]-b[1])[0];
        if(cheap&&p.cash>=cheap[1]&&E.discsFree(st,p)>0)E.doBuyPlot(st,p,cheap[0],log);
      }
    }
    E.humanCompleteResolutionAction(st,rng,log);
  }
  else if(st.phase==='liquidating'){
    E.humanLiquidationDone(st,rng,log);
  }
  else if(st.phase==='delivering'){
    const pid=st.awaitingPlayerId;
    const p=E.byId(st,pid);
    const b=p.businesses.find(x=>x.id===st.deliveringBizId);
    if(b){
      const slots=E.eligibleSlotsFor(st,b);
      if(slots.length&&(st.deliveryRemaining[b.id]||0)>0){
        const s0=slots[0];
        E.humanDeliver(st,p,s0.tileKey,s0.rowIdx,s0.levelIdx,s0.cross,log);
        if((st.deliveryRemaining[b.id]||0)<=0&&(st.crossSellRemaining[b.id]||0)<=0)E.finishDelivery(st,log,rng);
      } else { E.skipDelivery(st,p,b.id,log); E.finishDelivery(st,log,rng); }
    } else E.finishDelivery(st,log,rng);
  }
  else if(st.phase==='placingLH'){
    const edges=[];
    for(const a of Object.keys(st.board.graph))
      for(const b of st.board.graph[a])
        if(a<b&&E.isCrossDistrictEdge(st.board,a,b)&&!st.board.lhEdges.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a)))edges.push([a,b]);
    if(edges.length){const[a,b]=edges[Math.floor(rng()*edges.length)];E.doPlaceLH(st,a,b,log);}
    E.finishQuarterAfterLH(st,log,rng);
  }
  else if(st.phase==='repayingLoans'){
    const p=E.byId(st,st.awaitingPlayerId);
    while(p.discsInBank>0&&p.cash>=E.LOAN_REPAY_RATE[st.quarter])E.doRepayLoan(p,st.quarter,log);
    E.finishQuarterAfterRepay(st,log,rng);
  }
  else if(st.phase==='production'){ E.advanceResolution(st,rng,log); }
  else { console.log('UNKNOWN PHASE',st.phase); break; }
}
console.log('\niterations:',iter,'| final phase:',st.phase,'| quarter:',st.quarter);
console.log('phases exercised:',JSON.stringify(phaseSeen));
console.log('\nFINAL:');
st.players.forEach(p=>console.log(`  ${p.name.padEnd(16)} ${p.isHuman?'HUMAN':'bot  '}  ${E.epTotal(p).toFixed(0)} EP  $${Math.round(p.cash)}  ${E.activeBiz(p).length} biz  ${p.discsInBank} discs`));
const bothPlayed=humans.every(id=>{const p=E.byId(st,id);return p.businesses.length>0||p.epBank!==0;});
console.log('\nBoth humans participated:',bothPlayed);
console.log('Game completed 12 quarters:',st.quarter>=12&&st.phase==='gameover');
