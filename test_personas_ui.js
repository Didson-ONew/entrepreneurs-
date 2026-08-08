/* Host toggles Personas in the waiting room; both players should be dealt one, see
   their own power, and see each other's. A non-host must not be able to toggle it. */
const { chromium } = require("playwright");
const URL="http://127.0.0.1:8080/";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function txt(p){try{return await p.evaluate(()=>document.body.innerText||"");}catch{return "";}}
async function waitText(p,re,ms=12000){const t0=Date.now();while(Date.now()-t0<ms){if(re.test(await txt(p)))return true;await sleep(150);}return false;}
(async()=>{
  const br=await chromium.launch();
  const mk=async()=>{const c=await br.newContext({viewport:{width:1500,height:950}});const p=await c.newPage();
    await p.addInitScript(()=>{try{localStorage.setItem("entrepreneurs_tutorial_seen","1");}catch(e){}});return p;};
  const A=await mk(), B=await mk();
  const errs=[]; A.on("pageerror",e=>errs.push("A:"+e.message)); B.on("pageerror",e=>errs.push("B:"+e.message));

  await A.goto(URL); await waitText(A,/ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]',"Ana");
  await A.getByText("0 bots",{exact:true}).click();
  await A.getByText("Create room",{exact:true}).click();
  await waitText(A,/ROOM CODE|Room code/);
  const code=(await txt(A)).match(/([0-9A-F]{6})/)[1];
  await B.goto(URL); await waitText(B,/ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]',"Bruno");
  await B.fill('input[placeholder="ROOM CODE"]',code);
  await B.getByText("Join room",{exact:true}).click();
  await waitText(A,/Bruno/);

  console.log("host sees the Personas toggle:", await A.getByText(/Personas OFF/).count()>0);
  console.log("guest does NOT get a toggle  :", await B.getByText(/Personas OFF/).count()===0);

  await A.getByText(/Personas OFF/).click();
  console.log("host turned it on            :", await waitText(A,/Personas ON/,5000));
  console.log("guest is told it is on       :", await waitText(B,/Personas are ON/,6000));

  await A.getByText(/Start game/).click();
  await waitText(A,/PLANNING & ACTION TRACKS|Draft your starting/);
  await waitText(B,/PLANNING & ACTION TRACKS|Draft your starting/);
  // draft through so the board renders
  for(let i=0;i<14;i++){
    for(const p of [A,B]){
      const t=await txt(p);
      if(/Draft your starting Blueprints/.test(t)&&!/Waiting for/.test(t)){
        const bs=await p.locator("button").all();
        for(const b of bs){const bt=await b.textContent().catch(()=>null);
          if(bt&&/left/.test(bt)&&await b.isEnabled().catch(()=>false)){await b.click().catch(()=>{});break;}}
        const go=p.getByText(/Start Year 1/);
        if(await go.count()&&await go.first().isEnabled().catch(()=>false))await go.first().click().catch(()=>{});
      }
    }
    await sleep(300);
  }
  await sleep(800);
  const NAMES=["Tech-Savvy","Preventive Doctor","Product Manager","Customer Oriented","Supply Chain Expert","Government Relationship"];
  const ta=await txt(A), tb=await txt(B);
  const mineA=NAMES.filter(n=>ta.includes(n)), mineB=NAMES.filter(n=>tb.includes(n));
  console.log("\\nAna sees personas   :", JSON.stringify(mineA));
  console.log("Bruno sees personas :", JSON.stringify(mineB));
  console.log("both players were dealt one and can see both:", mineA.length>=2 && mineB.length>=2);
  console.log("page errors:", errs.length?errs.slice(0,3):"none");
  await br.close(); process.exit(0);
})();
