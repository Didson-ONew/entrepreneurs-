const fs=require("fs"),vm=require("vm");
const SRC=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const CUT=SRC.indexOf("/* ============================== REACT UI ============================== */");
let logic=SRC.slice(0,CUT).replace(/^\s*(import|export)\s.*$/gm,"");
const N="  const leftover = Math.max(0, remaining);\n  p.cash += earned + leftover * 1;";
logic=logic.replace(N,"  const leftover = Math.max(0, remaining);\n  __e.s(bizProd(biz),leftover);\n  p.cash += earned + leftover * 1;");
const e={p:0,l:0};
const box={},sb={console,Math,Set,Object,Array,JSON,box,__e:{s:(p,l)=>{e.p+=p;e.l+=l;}}};
vm.createContext(sb);
vm.runInContext(logic+`box.exports={initGame,mulberry32,advanceDraft,startPlanning,advancePlanning,
 epTotal,finalRank,activeBiz,megacorpHQs,drawMegacorpPool};`,sb);
const E=box.exports;
console.log("seats tiles  waste  winEP  lead2nd  leadLast  Mcorps  2HQ/game  early  lastQ");
for(const n of [2,3,4,5,6]){
  e.p=0;e.l=0;
  let g=0,wep=0,g2=0,gl=0,hq=0,two=0,early=0,q=0;
  const seeds = n>=6?120:180;
  for(let seed=1;seed<=seeds;seed++){
    const st=E.initGame(n-1,seed,["Seat 1"],undefined,true,undefined);
    st.players[0].isHuman=false;
    if(st.phase==="drafting"){E.advanceDraft(st,()=>{});E.startPlanning(st);}
    E.advancePlanning(st,E.mulberry32(seed+777),()=>{});
    if(st.phase!=="gameover")continue;
    g++;q+=st.quarter;if(st.quarter<12)early++;
    const r=[...st.players].sort(E.finalRank);
    wep+=E.epTotal(r[0]);g2+=E.epTotal(r[0])-E.epTotal(r[1]);gl+=E.epTotal(r[0])-E.epTotal(r[r.length-1]);
    for(const p of st.players){const k=E.megacorpHQs(p).length;hq+=k;if(k>=2)two++;}
  }
  console.log(`${String(n).padStart(3)} ${String(E.drawMegacorpPool(n,E.mulberry32(3)).length).padStart(6)}`
   +`  ${(100*e.l/e.p).toFixed(0).padStart(4)}% ${(wep/g).toFixed(0).padStart(6)}`
   +`  ${(g2/g).toFixed(1).padStart(7)}  ${(gl/g).toFixed(1).padStart(8)}  ${(hq/g).toFixed(2).padStart(6)}`
   +`  ${(two/g).toFixed(2).padStart(8)}  ${(100*early/g).toFixed(0).padStart(4)}%  ${(q/g).toFixed(1).padStart(5)}`);
}
