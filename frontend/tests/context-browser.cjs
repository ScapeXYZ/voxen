const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const base = process.env.VOXEN_TEST_URL || "http://127.0.0.1:3100";
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
 for (const width of [1440,390]) for (const reference of ["", "https://example.org/discussion"]) {
  const page = await browser.newPage({viewport:{width,height:900}});
  await page.goto(base+"/create");
  assert.equal(await page.getByRole("button",{name:"Load live test settings"}).count(), process.env.PRODUCTION_TEST ? 0 : 1);
  assert.equal(await page.locator(".step-sidebar li").count(),5);
  assert.doesNotMatch(await page.locator("form").innerText(),/Governance Guard|integration is pending/);
  await page.getByLabel("Proposal title").fill("Choose our next location");
  await page.getByLabel("Description",{exact:true}).fill("Select a location for the next gathering.");
  await page.getByLabel("Supporting reference (optional)").fill(reference);
  if(reference) await page.getByText("Reference added",{exact:true}).waitFor();
  const next = () => page.getByRole("button",{name:"Continue",exact:true}).click();
  await next();
  const choices=page.getByPlaceholder("Enter a choice");
  assert.deepEqual(await choices.evaluateAll(nodes=>nodes.map(n=>n.value)),["",""]);
  await next(); await page.getByText("Step 2 of 5",{exact:true}).waitFor();
  await choices.nth(0).fill("Lagos"); await choices.nth(1).fill("Lagos");
  await next(); await page.locator(".form-error").waitFor();
  await choices.nth(1).fill("Abuja");
  for(const choice of ["Accra","Nairobi","Dakar","Kigali"]) {
   await page.getByRole("button",{name:"Add option",exact:true}).click();
   await choices.last().fill(choice);
  }
  assert.equal(await choices.count(),6);
  assert.equal(await page.getByRole("button",{name:"Add option",exact:true}).isDisabled(),true);
  await page.getByRole("button",{name:"Remove option 6",exact:true}).click();
  await next();
  const local = ms => new Date(ms-new Date(ms).getTimezoneOffset()*60000).toISOString().slice(0,16);
  await page.getByLabel("Start date and time").fill(local(Date.now()+3600000));
  await page.getByLabel("End date and time").fill(local(Date.now()+7200000));
  await next(); await page.getByLabel("Minimum GEN balance").fill("1"); await next();
  await page.getByText("Step 5 of 5",{exact:true}).waitFor();
  assert.match(await page.locator(".review-list").innerText(),/Lagos \/ Abuja \/ Accra \/ Nairobi \/ Dakar/);
  assert.equal(await page.getByRole("heading",{name:"Supporting reference",exact:true}).count(),reference?1:0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();
 }

 const detail = await browser.newPage();
 for (const evidenceUrl of ["https://example.org/context", undefined, "javascript:alert(1)"]) {
  await detail.route("**/api/voxen/proposals/proposal-3", r => r.fulfill({json:{
   proposal:{id:"proposal-3",title:"Context fixture",description:"Browser fixture only",creator:"0x"+"ab".repeat(20),
    status:"DRAFT",startsAt:"2030-01-01T00:00:00Z",endsAt:"2030-01-02T00:00:00Z",
    eligibility:{mode:"GEN_HOLDING",minimum:"1"},voteChangePolicy:"FINAL_ON_CAST",resultVisibility:"LIVE",
    options:[{id:"0",label:"Lagos",votes:0},{id:"1",label:"Abuja",votes:0}],participation:0,source:"live",evidenceUrl},
   timeWindow:{start:1893456000,end:1893542400,window:"BEFORE",observedTime:1800000000},
   result:null,fetchedAt:"Browser fixture"
  }}));
  await detail.goto(base+"/proposals/proposal-3");
  await detail.getByRole("heading",{name:"Context fixture",exact:true}).waitFor();
  const valid = evidenceUrl?.startsWith("https:");
  assert.equal(await detail.getByRole("heading",{name:"Supporting reference",exact:true}).count(),valid?1:0);
  if(valid) {
   await detail.getByText("Provided by the proposal creator for additional context.",{exact:true}).waitFor();
   assert.equal(await detail.getByRole("link",{name:"example.org ↗",exact:true}).getAttribute("href"),evidenceUrl);
  }
  assert.equal(await detail.getByRole("heading",{name:"Governance Review",exact:true}).count(),0);
  await detail.unroute("**/api/voxen/proposals/proposal-3");
 }
 await detail.close();
 console.log("PASS: blank/distinct/arbitrary choices, 2–6 choices, optional context, hostname preview, five steps, GEN, review, mobile, helper environment gating.");
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
