const fs=require("fs"),vm=require("vm");
const SRC=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const CUT=SRC.indexOf("/* ============================== REACT UI ============================== */");
const box={},sb={console,Math,Set,Object,Array,JSON,box};vm.createContext(sb);
vm.runInContext(SRC.slice(0,CUT).replace(/^\s*(import|export)\s.*$/gm,"")+`
 box.exports={initGame,mulberry32,advanceDraft,startPlanning,advancePlanning,
 megacorpHQs,epTotal,finalRank,drawMegacorpPool,MEGACORP_TIER};`,sb);
const E=box.exports;
console.log("seats  tiles  per-tier   Megacorps/game  2-HQ players/game  ended early  last Q");
for(const n of [2,3,4,5,6]){
  const pool=E.drawMegacorpPool(n,E.mulberry32(9));
  const per={};for(const t of pool){const tr=E.MEGACORP_TIER[t[0]];per[tr]=(per[tr]||0)+1;}
  let g=0,hq=0,two=0,early=0,q=0;
  for(let seed=1;seed<=250;seed++){
    const st=E.initGame(n-1,seed,["Seat 1"],undefined,true,undefined);
    st.players[0].isHuman=false;
    if(st.phase==="drafting"){E.advanceDraft(st,()=>{});E.startPlanning(st);}
    E.advancePlanning(st,E.mulberry32(seed+777),()=>{});
    if(st.phase!=="gameover")continue;
    g++;q+=st.quarter;if(st.quarter<12)early++;
    for(const p of st.players){const k=E.megacorpHQs(p).length;hq+=k;if(k>=2)two++;}
  }
  console.log(`${String(n).padStart(3)}  ${String(pool.length).padStart(5)}  ${JSON.stringify(per).padEnd(26)}`
   +`${(hq/g).toFixed(2).padStart(8)}  ${(two/g).toFixed(2).padStart(17)}`
   +`  ${(100*early/g).toFixed(0).padStart(10)}%  ${(q/g).toFixed(1).padStart(6)}`);
}
