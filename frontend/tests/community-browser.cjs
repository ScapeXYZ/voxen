// Membership responses are intercepted here only. Production has no fixture grant.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.VOXEN_TEST_URL || 'http://127.0.0.1:3100';
const wallet = '0x0000000000000000000000000000000000000001';
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');
 await page.getByText(/Browse public proposals without joining/).waitFor();
 await page.goto(base+'/communities/commons');
 await page.getByText('Connect your wallet to access this Community.',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Community management',{exact:true}).count(),0);
 await page.addInitScript(wallet=>{
  const listeners={};window.ethereum={isMetaMask:true,request:async({method})=>{
   if(['eth_accounts','eth_requestAccounts'].includes(method))return [wallet];
   if(method==='eth_chainId')return '0x107d';
   throw Error('Test forbids '+method);
  },on:(event,fn)=>listeners[event]=fn,removeListener:()=>{}};
  window.changeWallet=()=>listeners.accountsChanged?.(['0x0000000000000000000000000000000000000002']);
 },wallet);
 await page.reload();
 await page.getByText('Community access verification is unavailable. Full workspace features remain locked.',{exact:true}).waitFor();
 let role='NONE'; let mismatch=false;
 await page.route('**/api/voxen/communities/*/access?*',async r=>{
  await new Promise(resolve=>setTimeout(resolve,500));
  await r.fulfill({json:{wallet,communityId:mismatch?'wrong':'commons',role,whitelisted:role!=='NONE'}});
 });
 for (const next of ['NONE','MEMBER','ADMIN','OWNER']) {
  role=next;await page.reload();
  await page.getByText('Checking Community access...',{exact:true}).waitFor();
  await page.getByText(next==='NONE'?'You can view this Community, but this wallet does not have access to its full workspace.':'Community access verified.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Community management',{exact:true}).count(),['OWNER','ADMIN'].includes(next)?1:0);
  assert.equal(await page.getByRole('button',{name:'Manage admins and ownership · pending'}).count(),next==='OWNER'?1:0);
  for(const button of await page.getByLabel('Community workspace access',{exact:true}).locator('button').all()) assert.equal(await button.isDisabled(),true);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow '+next);
  }
 }
 await page.evaluate(()=>window.changeWallet());
 await page.getByText('Community access verification is unavailable. Full workspace features remain locked.',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Community management',{exact:true}).count(),0);
 mismatch=true;await page.reload();
 await page.getByText('Community access verification is unavailable. Full workspace features remain locked.',{exact:true}).waitFor();
 await page.goto(base+'/create?space=commons');
 assert.equal(await page.locator('option[value="commons"]').count(),0);
 await page.goto(base+'/explore');
 await page.getByRole("main").getByText(/Browse publicly without connecting a wallet/).waitFor();
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: public visitor/connected, disconnected/checking/unavailable/non-member/member/admin/owner Community fixtures, account invalidation, scope mismatch, mobile and no sample creation selector. No transactions.');
})().catch(e=>{console.error(e);process.exit(1)});
