/* The tutorial must be reachable mid-game and must physically point at the region it
   is describing. */
const { chromium } = require("playwright");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function txt(p){try{return await p.evaluate(()=>document.body.innerText||"");}catch{return "";}}
(async()=>{
  const br=await chromium.launch();
  const p=await br.newPage({viewport:{width:1920,height:1030}});
  await p.addInitScript(()=>{try{localStorage.setItem("entrepreneurs_tutorial_seen","1");}catch(e){}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto("file:///home/claude/webgame/Entrepreneurs.html"); await sleep(450);
  await p.getByText("Start Game").click(); await sleep(400);
  for(let d=0;d<6;d++){
    const bs=await p.locator("button").all(); let c=false;
    for(const b of bs){const t=await b.textContent().catch(()=>null);
      if(t&&/left/.test(t)&&await b.isEnabled().catch(()=>false)){await b.click().catch(()=>{});await sleep(110);c=true;break;}}
    const go=p.getByText(/Start Year 1/);
    if(await go.count()&&await go.first().isEnabled().catch(()=>false)){await go.first().click().catch(()=>{});await sleep(400);break;}
    if(!c)break;
  }
  await sleep(500);
  console.log("regions tagged on screen:", await p.evaluate(()=>document.querySelectorAll("[data-tut]").length));
  const btn=p.getByText("How to play",{exact:true});
  console.log("'How to play' available mid-game:", await btn.count()>0);
  await btn.first().click(); await sleep(500);
  console.log("tutorial opened:", /HOW TO PLAY/.test(await txt(p)));

  const TARGETS=["board","pots","prices","tracks","tracks","board","ledger","standings"];
  let hits=0, arts=0;
  for(let i=0;i<8;i++){
    await sleep(450);
    const d=await p.evaluate((want)=>{
      const spot=document.querySelector(".tut-spot");
      const el=document.querySelector(`[data-tut="${want}"]`);
      if(!spot||!el)return {ok:false,spot:!!spot,el:!!el};
      const s=spot.getBoundingClientRect(), e=el.getBoundingClientRect();
      const near=Math.abs(s.left-(e.left-4))<3 && Math.abs(s.top-(e.top-4))<3;
      return {ok:near, svg:!!document.querySelector(".tut-spot")&&document.querySelectorAll("svg").length};
    }, TARGETS[i]);
    // the diagram lives in the card, which is the deepest element still containing the label
    const hasArt=await p.evaluate(()=>{
      const cards=Array.from(document.querySelectorAll("div")).filter(x=>/HOW TO PLAY/.test(x.innerText||""));
      if(!cards.length)return false;
      const deepest=cards.reduce((a,b)=>(b.contains(a)?a:b));
      return deepest.querySelectorAll("svg").length>0;
    });
    if(d.ok)hits++;
    if(hasArt)arts++;
    const title=(await txt(p)).match(/HOW TO PLAY\s+\d+\/8\s*\n?\s*([^\n]+)/);
    console.log(`  step ${i+1}: spotlight on '${TARGETS[i]}' = ${d.ok}${hasArt?"  (with diagram)":""}`);
    const nx=p.getByText("Next",{exact:true});
    if(await nx.count()&&await nx.first().isEnabled().catch(()=>false))await nx.first().click().catch(()=>{});
  }
  console.log(`\nspotlight landed on the right region: ${hits}/8`);
  console.log(`steps with an animated diagram: ${arts}/8`);
  await p.screenshot({path:"shot_tut_spot.png"});
  console.log("errors:", errs.length?errs.slice(0,2):"none");
  await br.close();
})();
