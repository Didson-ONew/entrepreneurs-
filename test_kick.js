/* The reported situation: a player closes their browser for good mid-game and the table
   is stuck. The host must be able to hand that seat to a bot and carry on. Also checks
   that a closed tab no longer loses the session. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function txt(p){ try { return await p.evaluate(()=> (document.getElementById("root")||{}).innerText || ""); } catch { return ""; } }
async function waitText(p,re,ms=12000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(re.test(await txt(p))) return true; await sleep(150);} return false; }

(async()=>{
  const br=await chromium.launch();
  const ctxA=await br.newContext({viewport:{width:1500,height:950}});
  let ctxB=await br.newContext({viewport:{width:1500,height:950}});
  const A=await ctxA.newPage();
  await A.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} }); let B=await ctxB.newPage();
  await B.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errs=[]; A.on("pageerror",e=>errs.push("A:"+e.message));

  // --- lobby ---
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
  console.log("=== LOBBY KICK ===");
  const removeBtn = A.getByText("remove", { exact: true });
  console.log("host sees a remove control:", await removeBtn.count() > 0);

  // --- session survives closing the tab ---
  console.log("\n=== CLOSED TAB ===");
  await B.close(); await ctxB.close();
  console.log("Bruno closed his browser entirely");
  ctxB = await br.newContext({ viewport:{width:1500,height:950}, storageState: undefined });
  // reuse the SAME profile dir is not possible here, so verify via a plain reload instead:
  // reopen in the original context is gone, so this leg is covered by test_resume.js.

  // --- mid-game takeover ---
  console.log("\n=== MID-GAME TAKEOVER ===");
  await A.getByText(/Start game/).click();
  const started = await waitText(A,/PLANNING & ACTION TRACKS|Draft your starting/);
  console.log("host entered the game:", started);

  // Bruno never acts (his browser is gone). Drive Ana only until she is blocked on him.
  let stuckOn=null;
  for(let i=0;i<40;i++){
    const t=await txt(A);
    if(/Draft your starting Blueprints/.test(t) && !/Waiting for/.test(t)){
      const btns=await A.locator("button").all();
      for(const b of btns){
        const bt=await b.textContent().catch(()=>null);
        if(bt&&/left/.test(bt)&&await b.isEnabled().catch(()=>false)){ await b.click({timeout:2000}).catch(()=>{}); break; }
      }
      const go=A.getByText(/Start Year 1/);
      if(await go.count()&&await go.first().isEnabled().catch(()=>false)) await go.first().click({timeout:2000}).catch(()=>{});
    }
    const m=(await txt(A)).match(/Waiting for ([^\u2026\n]+)/);
    if(m && /Bruno/.test(m[1])){ stuckOn=m[1].trim(); break; }
    await sleep(300);
  }
  console.log("host is blocked waiting on:", stuckOn || "(not blocked)");

  const kickBtn = A.getByText(/Replace .* with a bot/);
  const hasKick = await kickBtn.count() > 0;
  console.log("host sees the takeover button:", hasKick);
  if(hasKick){
    A.on("dialog", d => d.accept());
    await kickBtn.first().click({timeout:3000}).catch(()=>{});
    await sleep(2500);
    const after=await txt(A);
    const stillStuck=/Waiting for Bruno(?! \(bot\))/.test(after);
    console.log("still stuck on the vanished player:", stillStuck);
    // Ana may still owe her own picks; keep playing and confirm the game proceeds
    for(let i=0;i<60;i++){
      const t=await txt(A);
      if(/PLANNING & ACTION TRACKS/.test(t)) break;
      if(/Draft your starting Blueprints/.test(t) && !/Waiting for/.test(t)){
        const btns=await A.locator("button").all();
        let clicked=false;
        for(const b of btns){
          const bt=await b.textContent().catch(()=>null);
          if(bt&&/left/.test(bt)&&await b.isEnabled().catch(()=>false)){ await b.click({timeout:2000}).catch(()=>{}); clicked=true; break; }
        }
        const go=A.getByText(/Start Year 1/);
        if(await go.count()&&await go.first().isEnabled().catch(()=>false)) await go.first().click({timeout:2000}).catch(()=>{});
        if(!clicked && !(await go.count())) break;
      }
      await sleep(300);
    }
    const fin=await txt(A);
    console.log("game reached normal play:", /PLANNING & ACTION TRACKS/.test(fin));
    console.log("vanished seat is now a bot:", /Bruno \(bot\)/.test(fin));
    // and the game keeps running on its own
    for(let i=0;i<25;i++){
      const t=await txt(A);
      if(/Pass this action/.test(t)){ await A.getByText("Pass this action").first().click({timeout:2000}).catch(()=>{}); }
      else {
        for(const nm of ["M&A","R&D","Raise Capital"]){
          const b=A.getByRole("button",{name:nm,exact:true});
          if(await b.count()&&!(await b.first().isDisabled().catch(()=>true))){ await b.first().click({timeout:2000}).catch(()=>{}); break; }
        }
      }
      await sleep(220);
    }
    const q=(await txt(A)).match(/\bQ(\d)\b[\s\S]{0,80}?(Planning|Action|Production|Revenue|Closing)/);
    console.log("play continues normally, now at quarter:", q?q[1]:"?");
  }
  console.log("\npage errors:", errs.length?errs.slice(0,3):"none");
  await br.close(); process.exit(0);
})();
