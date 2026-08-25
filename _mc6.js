const fs=require("fs"),vm=require("vm");
const SRC=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const CUT=SRC.indexOf("/* ============================== REACT UI ============================== */");
const box={},sb={console,Math,Set,Object,Array,JSON,box};vm.createContext(sb);
vm.runInContext(SRC.slice(0,CUT).replace(/^\s*(import|export)\s.*$/gm,"")+`
 box.exports={initGame,mulberry32,advanceDraft,startPlanning,advancePlanning,
 megacorpHQs,epTotal,finalRank,drawMegacorpPool,MEGACORP_TIER};`,sb);
const E=box.exports;
const pool=E.drawMegacorpPool(6,E.mulberry32(9));
let g=0,hq=0,two=0,early=0,q=0;
for(let seed=1;seed<=200;seed++){
  const st=E.initGame(5,seed,["Seat 1"],undefined,true,undefined);
  st.players[0].isHuman=false;
  if(st.phase==="drafting"){E.advanceDraft(st,()=>{});E.startPlanning(st);}
  E.advancePlanning(st,E.mulberry32(seed+777),()=>{});
  if(st.phase!=="gameover")continue;
  g++;q+=st.quarter;if(st.quarter<12)early++;
  for(const p of st.players){const k=E.megacorpHQs(p).length;hq+=k;if(k>=2)two++;}
}
console.log(`6 seats: ${pool.length} tiles, Megacorps/game ${(hq/g).toFixed(2)}, `
 +`2-HQ players/game ${(two/g).toFixed(2)}, ended early ${(100*early/g).toFixed(0)}%, last Q ${(q/g).toFixed(1)}`);
