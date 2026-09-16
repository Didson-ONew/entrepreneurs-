/* Host toggles Personas in the waiting room; both players should be dealt one, see
   their own power, and see each other's. A non-host must not be able to toggle it. */
const { launchBrowser } = require("./testkit.js");
/* The runner picks a free port rather than assuming 8080 is idle, so read where
   the server actually is. */
const BASE = process.env.BASE || "http://127.0.0.1:8080";
const URL = BASE + "/";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function txt(p){try{return await p.evaluate(()=>document.body.innerText||"");}catch{return "";}}
async function waitText(p,re,ms=12000){const t0=Date.now();while(Date.now()-t0<ms){if(re.test(await txt(p)))return true;await sleep(150);}return false;}

/* This test used to print its findings and exit 0 regardless, so a run that said
   "host sees the Personas toggle: false" still counted as a pass. Assertions now
   reach the exit code. */
let fails=0;
function check(label,ok,detail){
  if(!ok)fails++;
  console.log(`${ok?" ok  ":" FAIL"}  ${label}${detail?"  ["+detail+"]":""}`);
}

/* The toggle is an OptionToggle: the name and the ON/OFF state are two separate
   spans inside one box, so there is no single node reading "Personas OFF" to match
   on. Find the name, then read the box around it - and whether that box is a button
   is exactly what separates the host from a guest. */
async function personaRow(p){
  return await p.evaluate(()=>{
    const el=[...document.querySelectorAll("span")].find(s=>s.textContent.trim()==="Personas");
    if(!el)return null;
    const box=el.closest("button")||el.closest("div[class*='rounded-md']");
    return box?{text:box.innerText.replace(/\s+/g," ").trim(),clickable:box.tagName==="BUTTON"}:null;
  });
}
async function waitRow(p,re,ms=6000){const t0=Date.now();while(Date.now()-t0<ms){const r=await personaRow(p);if(r&&re.test(r.text))return true;await sleep(150);}return false;}
(async()=>{
  const br=await launchBrowser();
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

  /* Rooms are created with personas ON (server.js, room defaults), so wait for the
     guest's first lobby frame rather than reading straight away - until it lands the
     row renders from a null lobby and shows OFF, which is not a disagreement with the
     host, just an unpopulated client. */
  check("the guest receives the table rules", await waitRow(B,/ON/,8000));

  const hostRow=await personaRow(A), guestRow=await personaRow(B);
  check("the host gets a Personas toggle", !!(hostRow&&hostRow.clickable), hostRow&&hostRow.text);
  check("it starts on, as a new room does", !!(hostRow&&/ON/.test(hostRow.text)), hostRow&&hostRow.text);
  check("a guest sees the setting but cannot change it",
    !!(guestRow&&!guestRow.clickable), guestRow&&guestRow.text);

  /* Toggle both ways: off proves the host can change it and that the change reaches
     the guest, on puts it back so the rest of the test can check the dealing. */
  const toggle=()=>A.getByRole("button").filter({hasText:"Personas"}).first().click();
  await toggle();
  check("the host can turn it off", await waitRow(A,/OFF/,5000));
  check("and the guest is shown the change", await waitRow(B,/OFF/,6000));
  await toggle();
  check("and back on again", await waitRow(A,/ON/,5000));
  check("which the guest also sees", await waitRow(B,/ON/,6000));

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
  const NAMES=["Systems Architect","Public Health Director","White-Label Supplier","Resort Developer","Supply Chain Expert","Concession Holder"];
  const ta=await txt(A), tb=await txt(B);
  const mineA=NAMES.filter(n=>ta.includes(n)), mineB=NAMES.filter(n=>tb.includes(n));
  check("Ana was dealt a persona and can see both", mineA.length>=2, JSON.stringify(mineA));
  check("Bruno was dealt a persona and can see both", mineB.length>=2, JSON.stringify(mineB));
  check("no page errors", errs.length===0, errs.slice(0,3).join(" | "));
  await br.close();
  console.log(fails?`\n${fails} check(s) failed`:"\nall checks passed");
  process.exit(fails);
})();
