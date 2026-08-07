/* Checks the rules changes: 3 workers at 2P, industry bonus once per game,
   and that a distressed company is attributed to nobody. */
const fs=require("fs");
const src=fs.readFileSync("EntrepreneursGame.jsx","utf8");
const cut=src.indexOf("/* ============================== REACT UI ============================== */");
const vm=require("vm");const box={};const sb={console,Math,Set,Object,Array,JSON,box};
vm.createContext(sb);
vm.runInContext(src.slice(0,cut).replace(/^\s*import\s.*$/gm,"")+`box.exports={
  initGame,mulberry32,startPlanning,runClosingRest,newPlayer,buildBoard,makeDemandPool,
  makePriceMatrix,doBuyPlot,doLaunch,sellCompany,getBizTooltipInfo,BP_DATA,epTotal,
  workersPerPlayer,activeBiz,bizInd};`,sb);
const E=sb.box.exports;

console.log("=== 3 WORKERS AT TWO PLAYERS ===");
for (const [h,b,exp] of [[2,0,3],[1,1,3],[3,0,2],[2,2,2],[1,3,2]]) {
  const st=E.initGame(b,7,Array.from({length:h},(_,i)=>"P"+i));
  E.startPlanning(st);
  const per={};
  st.planningQueue.forEach(id=>{per[id]=(per[id]||0)+1;});
  const counts=[...new Set(Object.values(per))];
  console.log(`  ${h}H+${b}bot = ${st.players.length}p -> ${counts.join("/")} workers each (expected ${exp}) ${counts.length===1&&counts[0]===exp?"OK":"FAIL"}`);
}

console.log("\n=== INDUSTRY BONUS SCORES ONCE PER GAME ===");
const st=E.initGame(1,11,["Ana"]);
const p=st.players[0];
const plots=Object.keys(st.board.graph);
// give Ana one RE company
const pk=plots.find(k=>!(k in st.board.owner));
E.doBuyPlot(st,p,pk,()=>{});
const bp=E.BP_DATA.find(b=>b.ind==="RE"&&b.lvl===1);
p.hand=[bp]; E.doLaunch(st,p,bp,E.mulberry32(2),()=>{},[pk]);
const before=p.epBank;
st.quarter=4; E.runClosingRest(st,()=>{});
const afterQ4=p.epBank;
st.quarter=8; E.runClosingRest(st,()=>{});
const afterQ8=p.epBank;
st.quarter=12; E.runClosingRest(st,()=>{});
const afterQ12=p.epBank;
console.log(`  EP from year-ends: Q4 +${(afterQ4-before).toFixed(0)}, Q8 +${(afterQ8-afterQ4).toFixed(0)}, Q12 +${(afterQ12-afterQ8).toFixed(0)}`);
console.log(`  industriesScored: ${JSON.stringify(p.industriesScored)}`);
console.log(`  RE bonus paid exactly once: ${p.industriesScored.filter(i=>i==="RE").length===1?"OK":"FAIL"}`);
console.log(`  no repeat industry EP after Q4: ${(afterQ8-afterQ4)<5&&(afterQ12-afterQ8)<5?"OK":"FAIL"}`);

// a second industry should still pay when first fielded
const pk2=plots.find(k=>!(k in st.board.owner));
E.doBuyPlot(st,p,pk2,()=>{});
const bp2=E.BP_DATA.find(b=>b.ind==="HO"&&b.lvl===1);
p.hand=[bp2]; E.doLaunch(st,p,bp2,E.mulberry32(3),()=>{},[pk2]);
const b4=p.epBank; st.quarter=12; E.runClosingRest(st,()=>{});
console.log(`  entering HO later still pays 5: ${(p.epBank-b4)>=5?"OK":"FAIL"} (+${(p.epBank-b4).toFixed(0)})`);
console.log(`  final industriesScored: ${JSON.stringify(p.industriesScored)}`);

console.log("\n=== DISTRESSED COMPANY HAS NO OWNER ===");
const biz=p.businesses[0];
console.log(`  before sale, tooltip owner: ${(E.getBizTooltipInfo(st,biz).owner||{}).name}`);
E.sellCompany(p,biz,false);
const info=E.getBizTooltipInfo(st,biz);
console.log(`  after sale, tooltip owner: ${info.owner===null?"(nobody)":(info.owner||{}).name} ${info.owner===null?"OK":"FAIL"}`);
