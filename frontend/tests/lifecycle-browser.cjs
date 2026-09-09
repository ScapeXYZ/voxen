// Read fixtures only. No wallet transaction methods are installed.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.VOXEN_TEST_URL || 'http://127.0.0.1:3100';
const epoch = Date.parse('2030-09-10T12:00:00Z');
function proposal(id, start, end, status = 'PUBLISHED') {
 return {id:`proposal-${id}`,title:`Scheduled decision ${id}`,description:'A public decision',creator:'0x0000000000000000000000000000000000000001',communityId:'space-1',status,
 startsAt:new Date(epoch+start).toISOString(),endsAt:new Date(epoch+end).toISOString(),source:'live',guardRequired:false,
 eligibility:{mode:'GEN_HOLDING',minimum:'10',chainId:4221},options:[{id:'0',label:'Approve',votes:2},{id:'1',label:'Reject',votes:1}],
 participation:3,resultVisibility:'LIVE',voteChangePolicy:'CHANGE_UNTIL_CLOSE',talliesHidden:false};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:epoch});
 const proposals=[proposal(1,60000,120000),proposal(2,-60000,60000),proposal(3,-120000,-60000),{...proposal(4,-120000,-60000,'FINALIZED'),result:'Approve'}];
 await page.route('**/api/voxen/proposals?*',r=>r.fulfill({json:{proposals,total:proposals.length,nextOffset:null}}));
 await page.goto(base+'/explore');await page.getByRole('heading',{name:'Scheduled decision 1'}).waitFor();
 for(const [filter,count] of [['Live',1],['Upcoming',1],['Ended',2],['All',4]]){
  await page.getByRole('button',{name:filter,exact:true}).click();assert.equal(await page.locator('.proposal-card').count(),count);
 }
 proposals.unshift(proposal(6,-60000,60000));
 await page.clock.fastForward(15000);
 await page.getByRole('heading',{name:'Scheduled decision 6'}).waitFor();
 assert.doesNotMatch(await page.locator('main').innerText(),/Sample proposal/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Upcoming',exact:true}).click();
 await page.clock.fastForward(61000);assert.equal(await page.locator('.proposal-card').count(),0);
 await page.getByRole('button',{name:'Live',exact:true}).click();assert.match(await page.locator('.proposal-card').innerText(),/Scheduled decision 1/);
 await page.clock.fastForward(60000);
 await page.getByRole('button',{name:'Ended',exact:true}).click();assert.equal(await page.locator('.proposal-card').count(),5);
 await page.addInitScript(()=>{window.ethereum={isMetaMask:true,request:async({method})=>{
  if(['eth_accounts','eth_requestAccounts'].includes(method))return ['0x0000000000000000000000000000000000000001'];
  if(method==='eth_chainId')return '0x107d';throw Error('Test forbids '+method);
 },on:()=>{},removeListener:()=>{}};});
 let eligible=true;
 await page.route('**/api/voxen/proposals/proposal-5/eligibility?*',r=>r.fulfill({json:{eligible,observedBalance:eligible?'10000000000000000000':'0',checkedAt:new Date(epoch).toISOString()}}));
 await page.route('**/api/voxen/proposals/proposal-5?wallet=*',r=>r.fulfill({json:{vote:null}}));
 let reads=0;const p=proposal(5,180000,240000);
 await page.route('**/api/voxen/proposals/proposal-5',r=>{
  reads++;return r.fulfill({json:{proposal:p,timeWindow:{start:(epoch+180000)/1000,end:(epoch+240000)/1000,observedTime:epoch/1000,window:'BEFORE'},result:null,fetchedAt:new Date(epoch).toISOString()}});
 });
 await page.goto(base+'/proposals/proposal-5');await page.getByRole('heading',{name:p.title}).waitFor();
 await page.getByText("Eligible to vote",{exact:true}).waitFor();
 assert.equal(await page.locator('.vote-option input').first().isDisabled(),true);
 await page.clock.fastForward(60000);
 await page.waitForFunction(()=>!document.querySelector('.vote-option input')?.disabled);
 assert.ok(reads>1,'boundary refetch');
 assert.match(await page.locator('main').innerText(),/10 GEN/);
 await page.locator('.vote-option input').first().check();
 await page.waitForFunction(()=>!document.querySelector('.voting-panel button.primary')?.disabled);
 eligible=false;await page.clock.fastForward(30000);
 await page.getByText("You're not eligible for this proposal.",{exact:true}).waitFor();
 assert.equal(await page.locator('.voting-panel button.primary').isDisabled(),true,'ineligible live voter cannot submit');
 await page.clock.fastForward(60000);
 await page.waitForFunction(()=>document.querySelector('.vote-option input')?.disabled);
 assert.match(await page.locator('main').innerText(),/Final result has not yet been finalized/);
 assert.deepEqual(errors,[]);
 console.log('PASS: public disconnected discovery, filters, finalization distinction, mobile, upcoming/live/ended transitions boundary refetch, and non-member eligibility independent of lifecycle without creator action.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
