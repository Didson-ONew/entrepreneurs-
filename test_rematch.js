/* Play Again must open a fresh waiting room with the same players. */
const { chromium } = require("playwright");
const URL="http://127.0.0.1:8080/";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function txt(p){try{return await p.evaluate(()=>(document.getElementById("root")||{}).innerText||"");}catch{return "";}}
async function waitText(p,re,ms=15000){const t0=Date.now();while(Date.now()-t0<ms){if(re.test(await txt(p)))return true;await sleep(150);}return false;}
async function act(p){
  const t=await txt(p);
  if(/Draft your starting Blueprints/.test(t)&&!/Waiting for/.test(t)){
    const bs=await p.locator("button").all();
    for(const b of bs){const bt=await b.textContent().catch(()=>null);
      if(bt&&/left/.test(bt)&&await b.isEnabled().catch(()=>false)){await b.click({timeout:1500}).catch(()=>{});return true;}}
    const go=p.getByText(/Start Year 1/);
    if(await go.count()&&await go.first().isEnabled().catch(()=>false)){await go.first().click({timeout:1500}).catch(()=>{});return true;}
  }
  if(/Placing Logistic Hub/.test(t)){
    const ok=await p.evaluate(()=>{const d=Array.from(document.querySelectorAll("div")).filter(x=>getComputedStyle(x).backgroundColor==="rgb(13, 40, 24)");if(!d.length)return false;d[0].click();return true;});
    await sleep(100);
    const cf=p.getByText("Confirm placement");
    if(await cf.count()&&await cf.first().isEnabled().catch(()=>false)){await cf.first().click({timeout:1500}).catch(()=>{});return true;}
    if(!ok){const rb=p.getByText("Reset selection");if(await rb.count())await rb.first().click({timeout:1500}).catch(()=>{});}
    return true;
  }
  if(/Recycle remainder/.test(t)){await p.getByText(/Recycle remainder/).first().click({timeout:1500}).catch(()=>{});return true;}
  if(/Done repaying|^Done$/m.test(t)){const d=p.getByRole("button",{name:"Done"});if(await d.count()){await d.first().click({timeout:1500}).catch(()=>{});return true;}}
  if(/Pass this action/.test(t)){await p.getByText("Pass this action").first().click({timeout:1500}).catch(()=>{});return true;}
  for(const nm of ["M&A","R&D","Raise Capital","Board Meeting"]){
    const b=p.getByRole("button",{name:nm,exact:true});
    if(await b.count()&&!(await b.first().isDisabled().catch(()=>true))){await b.first().click({timeout:1500}).catch(()=>{});return true;}
  }
  return false;
}
(async()=>{
  const br=await chromium.launch();
  const cA=await br.newContext({viewport:{width:1500,height:950}});
  const cB=await br.newContext({viewport:{width:1500,height:950}});
  const A=await cA.newPage(), B=await cB.newPage();
  await A.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errs=[];A.on("pageerror",e=>errs.push("A:"+e.message));B.on("pageerror",e=>errs.push("B:"+e.message));
  await A.goto(URL); await waitText(A,/ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]',"Ana");
  await A.getByText("1 bot",{exact:true}).click();
  await A.getByText("Create room",{exact:true}).click();
  await waitText(A,/ROOM CODE|Room code/);
  const code=(await txt(A)).match(/([0-9A-F]{6})/)[1];
  await B.goto(URL); await waitText(B,/ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]',"Bruno");
  await B.fill('input[placeholder="ROOM CODE"]',code);
  await B.getByText("Join room",{exact:true}).click();
  await waitText(A,/Bruno/);
  await A.getByText(/Start game/).click();
  await waitText(A,/PLANNING & ACTION TRACKS|Draft your starting/);
  console.log("game started");
  let steps=0;
  while(steps++<900){
    const t=await txt(A);
    if(/Game Over/.test(t))break;
    let did=false;
    for(const p of [A,B]){ if(await act(p)){did=true;break;} }
    await sleep(did?110:200);
  }
  const over=/Game Over/.test(await txt(A));
  console.log("reached Game Over:",over,"in",steps,"steps");
  if(!over){console.log("(did not finish in budget - rematch untested)");await br.close();process.exit(0);}
  const bOver=await waitText(B,/Game Over/,8000);
  console.log("B also sees Game Over:",bOver);
  console.log("B sees the waiting-for-host note:", /Waiting for the host to start a rematch/.test(await txt(B)));
  const btn=A.getByText(/Play again/);
  console.log("host sees Play again:",await btn.count()>0);
  await btn.first().click({timeout:3000}).catch(()=>{});
  const aBack=await waitText(A,/ROOM CODE|Room code/,10000);
  const bBack=await waitText(B,/ROOM CODE|Room code/,10000);
  console.log("host back in a waiting room:",aBack);
  console.log("other player back in the waiting room too:",bBack);
  const names=await txt(A);
  console.log("same players still listed:", /Ana/.test(names)&&/Bruno/.test(names));
  console.log("host can start again:", await A.getByText(/Start game/).count()>0);
  console.log("errors:",errs.length?errs.slice(0,2):"none");
  await br.close();process.exit(0);
})();
