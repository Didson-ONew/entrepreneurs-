/* Reproduces the reported failure: one player's event stream never delivers (as when a
   proxy or tunnel buffers text/event-stream). That player must still see the game start
   and be able to play, via the polling fallback. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function txt(p){ try { return await p.evaluate(()=> (document.getElementById("root")||{}).innerText || ""); } catch { return ""; } }
async function waitText(p,re,ms=12000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(re.test(await txt(p))) return true; await sleep(150);} return false; }

(async()=>{
  const br=await chromium.launch();
  const ctxA=await br.newContext({viewport:{width:1400,height:950}});
  const ctxB=await br.newContext({viewport:{width:1400,height:950}});
  const A=await ctxA.newPage(), B=await ctxB.newPage();
  await A.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errs=[]; A.on("pageerror",e=>errs.push("A:"+e.message)); B.on("pageerror",e=>errs.push("B:"+e.message));

  // B is the friend: kill his event stream at the network layer, exactly like a
  // tunnel that refuses to forward SSE.
  await ctxB.route("**/api/stream**", (route) => route.abort());
  console.log("B's event stream is blocked (simulating the tunnel problem)\n");

  await A.goto(URL); await waitText(A,/ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]',"Ana");
  await A.getByText("1 bot",{exact:true}).click();
  await A.getByText("Create room",{exact:true}).click();
  await waitText(A,/Room code/);
  const code=(await txt(A)).match(/([0-9A-F]{6})/)[1];

  await B.goto(URL); await waitText(B,/ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]',"Bruno");
  await B.fill('input[placeholder="ROOM CODE"]',code);
  await B.getByText("Join room",{exact:true}).click();
  const bInLobby = await waitText(B,/Room code/);
  console.log("B reaches the waiting room without SSE:", bInLobby);
  const aSeesB = await waitText(A,/Bruno/);
  console.log("A sees B in the room:", aSeesB);

  console.log("\n--- host presses Start ---");
  await A.getByText(/Start game/).click();

  const aIn = await waitText(A,/PLANNING & ACTION TRACKS|Draft your starting/);
  const bIn = await waitText(B,/PLANNING & ACTION TRACKS|Draft your starting/);
  console.log("A entered the game:", aIn);
  console.log("B entered the game WITHOUT a working stream:", bIn, bIn ? "" : "  <-- the reported bug");

  const pill = await B.evaluate(()=>{
    const s=Array.from(document.querySelectorAll("span")).find(x=>/^(live|syncing|offline)$/.test(x.textContent.trim()));
    return s?s.textContent.trim():"(none)";
  });
  console.log("B's connection indicator reads:", pill);

  // B must also be able to act and have it reflected for A
  let bActed=false;
  for(let i=0;i<50 && !bActed;i++){
    for(const p of [A,B]){
      const t=await txt(p);
      if(/Draft your starting Blueprints/.test(t) && !/Waiting for/.test(t)){
        const btns=await p.locator("button").all();
        for(const b of btns){
          const bt=await b.textContent().catch(()=>null);
          if(bt&&/left/.test(bt)&&await b.isEnabled().catch(()=>false)){
            await b.click({timeout:2000}).catch(()=>{});
            if(p===B) bActed=true;
            break;
          }
        }
        const go=p.getByText(/Start Year 1/);
        if(await go.count()&&await go.first().isEnabled().catch(()=>false)) await go.first().click({timeout:2000}).catch(()=>{});
      }
    }
    await sleep(250);
  }
  console.log("B could draft cards:", bActed);

  // and the two stay in sync
  await sleep(2500);
  const qa=(await txt(A)).match(/\bQ(\d)\b[\s\S]{0,80}?(Planning|Action|Production|Revenue|Closing)/);
  const qb=(await txt(B)).match(/\bQ(\d)\b[\s\S]{0,80}?(Planning|Action|Production|Revenue|Closing)/);
  console.log(`quarters - A: ${qa?qa[1]:"draft"} | B: ${qb?qb[1]:"draft"} | in sync: ${JSON.stringify(qa&&qa[1])===JSON.stringify(qb&&qb[1])}`);
  console.log("page errors:", errs.length?errs.slice(0,3):"none");
  await br.close(); process.exit(0);
})();
