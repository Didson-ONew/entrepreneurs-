const fs=require('fs');
const src=fs.readFileSync('EntrepreneursGame.jsx','utf8');
const cut=src.indexOf('/* ============================== REACT UI ============================== */');
const vm=require('vm');const box={};const sb={console,Math,Set,Object,Array,JSON,box};
vm.createContext(sb);
vm.runInContext(src.slice(0,cut).replace(/^\s*(import|export)\s.*$/gm,'')+`box.exports={
  BP_DATA,INDUSTRIES,BASE_PRICE,SCALING,MEGACORP_TILES,buildBoard,mulberry32};`,sb);
const E=sb.box.exports;
const F=[],O=[];const chk=(c,l,d)=>{(c?O:F).push(l+(d?` — ${d}`:''));};

chk(E.BP_DATA.length===60,'60 BP cards');
for(const i of E.INDUSTRIES){
  const c=E.BP_DATA.filter(b=>b.ind===i);
  const lv=[1,2,3].map(l=>c.filter(b=>b.lvl===l).length);
  chk(c.length===10&&lv[0]===5&&lv[1]===3&&lv[2]===2,`${i}: 10 cards 5/3/2`,`${lv}`);
}
let e=[];
for(const b of E.BP_DATA){
  if(b.deps.length!==b.lvl)e.push(`${b.code} deps`);
  if(b.deps.reduce((s,d)=>s+d.val,0)!==b.opex)e.push(`${b.code} sum`);
  if(b.deps.some(d=>d.ind===b.ind))e.push(`${b.code} self`);
}
chk(!e.length,'Deps: count=level, sum=OPEX, no self-supply',e.slice(0,4).join(', '));

// chain uses every industry once per slot
const slot={0:{},1:{},2:{}};
for(const i of E.INDUSTRIES){const l3=E.BP_DATA.find(b=>b.ind===i&&b.lvl===3);
  l3.deps.forEach((d,k)=>slot[k][i]=d.ind);}
let uq=true;for(const k of [0,1,2])if(new Set(Object.values(slot[k])).size!==6)uq=false;
chk(uq,'Each of D1/D2/D3 uses all six industries once');
let cur='UT',seen=[cur];for(let i=0;i<6;i++){cur=slot[0][cur];seen.push(cur);}
chk(seen[6]==='UT'&&new Set(seen.slice(0,6)).size===6,'D1 is one closed 6-loop',seen.join('>'));

// native cheaper than upgrading
let nb=[];
for(const i of E.INDUSTRIES){
  const l1=E.BP_DATA.find(b=>b.ind===i&&b.lvl===1),l2=E.BP_DATA.find(b=>b.ind===i&&b.lvl===2),l3=E.BP_DATA.find(b=>b.ind===i&&b.lvl===3);
  if(l2.setup>=2*l1.setup)nb.push(`${i} L2`);
  if(l3.setup>=2*l2.setup)nb.push(`${i} L3`);
  if(l2.prod!==2*l1.prod||l3.prod!==2*l2.prod)nb.push(`${i} prod`);
}
chk(!nb.length,'Native cards beat upgrading; production doubles per level',nb.join(', '));

// megacorps 3-4 companies
let mc=[];
E.MEGACORP_TILES.forEach(([n,c])=>{const t=Object.values(c).reduce((a,b)=>a+b,0);if(t<3||t>4)mc.push(`${n}=${t}`);});
chk(!mc.length,'Every Megacorp needs 3-4 companies',mc.join(', '));
chk(E.MEGACORP_TILES.length===16,'16 Megacorp tiles');
const eps=E.MEGACORP_TILES.map(t=>t[2]);
chk(eps.every((v,i)=>i===0||v>=eps[i-1]),'Megacorp EP non-decreasing');

const board=E.buildBoard(E.mulberry32(1));
chk(Object.keys(board.graph).length===64,'64 plots');
chk(board.priceLattice['4,4']===6&&board.priceLattice['0,0']===1,'Price lattice 6 centre / 1 rim');

console.log(`PASSED ${O.length}`);O.forEach(o=>console.log('  [ok] '+o));
if(F.length){console.log(`\nFAILED ${F.length}`);F.forEach(f=>console.log('  [FAIL] '+f));}else console.log('\nNo failures.');
