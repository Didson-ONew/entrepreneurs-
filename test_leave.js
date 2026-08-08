/* A player who created a room by mistake must be able to get back to the lobby,
   and their abandoned room must not linger. */
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8080/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function txt(p){ try { return await p.evaluate(()=> (document.getElementById("root")||{}).innerText || ""); } catch { return ""; } }
async function waitText(p,re,ms=8000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(re.test(await txt(p))) return true; await sleep(120);} return false; }

(async()=>{
  const br=await chromium.launch();
  const ctxA=await br.newContext({viewport:{width:1200,height:900}});
  const ctxB=await br.newContext({viewport:{width:1200,height:900}});
  const A=await ctxA.newPage(), B=await ctxB.newPage();
  // BOTH pages: a page without this flag opens the first-run tutorial, whose full-screen
  // click-catcher swallows every click and hangs the run on that player's first turn.
  for (const p of [A, B]) await p.addInitScript(() => { try { localStorage.setItem('entrepreneurs_tutorial_seen','1'); } catch(e) {} });
  const errs=[]; A.on("pageerror",e=>errs.push(e.message)); B.on("pageerror",e=>errs.push(e.message));

  // Ana hosts properly
  await A.goto(URL); await waitText(A,/ENTREPRENEURS/);
  await A.fill('input[placeholder="Your name"]',"Ana");
  await A.getByText("1 bot",{exact:true}).click();
  await A.getByText("Create room",{exact:true}).click();
  await waitText(A,/Room code/);
  const codeA=(await txt(A)).match(/([0-9A-F]{6})/)[1];
  console.log("Ana's room:",codeA);

  // Bruno creates one BY MISTAKE instead of joining
  await B.goto(URL); await waitText(B,/ENTREPRENEURS/);
  await B.fill('input[placeholder="Your name"]',"Bruno");
  await B.getByText("Create room",{exact:true}).click();
  await waitText(B,/Room code/);
  const codeB=(await txt(B)).match(/([0-9A-F]{6})/)[1];
  console.log("Bruno wrongly created:",codeB);

  // reload: does he get stuck in his own waiting room? (the reported symptom)
  await B.reload();
  const stuck=await waitText(B,/Room code/,6000);
  console.log("after reload Bruno is back in his waiting room:",stuck,"(the bug report)");

  // the new escape hatch
  const btn=B.getByText(/Cancel this room and go back/);
  console.log("escape button present:",await btn.count()>0);
  await btn.first().click();
  const backToLobby=await waitText(B,/Create room/,8000);
  console.log("Bruno is back at the lobby:",backToLobby);

  // his abandoned room should be gone from the server
  const gone=await B.evaluate(async(c)=>{
    const r=await fetch("/api/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:c,name:"X"})});
    return (await r.json()).error||"joined";
  },codeB);
  console.log("abandoned room cleaned up:",gone==="No such room.",`(server said: ${gone})`);

  // and he can now join Ana properly
  await B.fill('input[placeholder="Your name"]',"Bruno");
  await B.fill('input[placeholder="ROOM CODE"]',codeA);
  await B.getByText("Join room",{exact:true}).click();
  const joined=await waitText(B,new RegExp(codeA),8000);
  console.log("Bruno joined Ana's room:",joined);
  const anaSees=await waitText(A,/Bruno/,6000);
  console.log("Ana sees Bruno arrive:",anaSees);
  console.log("page errors:",errs.length?errs.slice(0,3):"none");
  await br.close(); process.exit(0);
})();
