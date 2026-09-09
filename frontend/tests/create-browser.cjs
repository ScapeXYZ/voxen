// Browser tests use a rejecting wallet and explicit transaction fixtures. No real proposal is created.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.env.VOXEN_TEST_URL||'http://127.0.0.1:3100';
const wallet='0x25c8a9c84461840500544c8b4d58C802C389dbD5';
const txId='0x'+'cd'.repeat(32);
async function installWallet(page,pending){await page.addInitScript(({wallet,pending})=>{
 window.createSends=0;const events={};window.ethereum={isMetaMask:true,request:async({method})=>{
  if(method==='eth_accounts'||method==='eth_requestAccounts')return [wallet];
  if(method==='eth_chainId')return '0x107d';
  if(method==='eth_sendTransaction'){window.createSends++;await new Promise(r=>setTimeout(r,800));throw {code:4001,message:'User rejected request'};}
  throw Error('Test forbids '+method);
 },on:(event,fn)=>events[event]=fn,removeListener:()=>{}};
 if(pending)sessionStorage.setItem(`voxen:create:https://rpc-bradbury.genlayer.com:0xA7c7B3F81dbbC511029a9A07FDfBf97dC1A822f7:${wallet.toLowerCase()}`,JSON.stringify(pending));
},{wallet,pending});}
async function review(page){for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Review before submitting'}).waitFor();}
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/create');
 await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal(await page.getByLabel('Proposal title').evaluate(el=>el.validity.valueMissing),true);
 await page.getByRole('button',{name:'Save local draft',exact:true}).click();assert.ok(await page.evaluate(()=>localStorage.getItem('voxen:proposal-draft')));
 await page.getByRole('button',{name:'Load live test settings'}).click();
 assert.equal(await page.locator('select option[value="commons"]').count(),0);
 await review(page);await page.getByText('Connect your wallet to create this proposal.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Create proposal',exact:true}).isDisabled(),true);
 assert.match(await page.locator('.review-list').innerText(),/Voting window/);assert.match(await page.locator('.review-list').innerText(),/Voxen ERC1155 Holder Credential/);
 await page.getByRole('button',{name:'Save local draft',exact:true}).click();const draft=await page.evaluate(()=>localStorage.getItem('voxen:proposal-draft'));
 assert.equal(JSON.parse(draft).startsAt,undefined,'Draft stores readable fields; timestamp conversion happens at submission');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile form overflow');}
 await installWallet(page);await page.reload();await page.getByRole('button',{name:'Resume saved draft'}).click();await review(page);
 await page.getByRole('button',{name:'Create proposal',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Create proposal',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Create proposal',exact:true}).click();
 await page.getByRole('status').filter({hasText:/^Preparing proposal$/}).waitFor();
 await page.getByRole('status').filter({hasText:/^Submitting$/}).waitFor({timeout:60000});
 await page.getByText('You cancelled the transaction.',{exact:true}).waitFor({timeout:60000});
 assert.equal(await page.evaluate(()=>window.createSends),1);assert.equal(await page.evaluate(()=>localStorage.getItem('voxen:proposal-draft')),draft,'Failure retains draft');
 // Validate GEN path, unsupported credential configuration, and invalid/expired window.
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByText('Use custom credential',{exact:true}).click();await page.getByLabel('Token ID').fill('not-a-token');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('alert').filter({hasText:/numeric ERC1155/}).waitFor();
 await page.getByLabel('GEN holding',{exact:true}).check();await page.getByLabel('Minimum GEN balance').fill('1.000000000000000001');
 await page.getByRole('button',{name:'Continue',exact:true}).click();assert.match(await page.locator('.review-list').innerText(),/1.000000000000000001 GEN/);
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByLabel('End date and time').fill('2000-01-01T00:00');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('alert').filter({hasText:/end time is after/}).waitFor();
 // Seed ONLY a mock public transaction reference; responses are fixture states, not chain claims.
 const tracked=await browser.newPage();tracked.on('pageerror',e=>errors.push(e.message));await installWallet(tracked,{txId,stage:'processing'});
 let stage='submitted';await tracked.route('**/api/voxen/transactions/*',r=>r.fulfill({json:{stage,txId}}));
 await tracked.goto(base+'/create');await tracked.getByRole('status').filter({hasText:/^Submitted$/}).waitFor();
 stage='processing';await tracked.getByRole('status').filter({hasText:/^Consensus processing$/}).waitFor({timeout:15000});
 stage='accepted';await tracked.getByRole('status').filter({hasText:/^Accepted by GenLayer$/}).waitFor({timeout:15000});
 await tracked.getByRole('heading',{name:'Proposal created',exact:true}).waitFor();assert.equal(await tracked.getByRole('link',{name:'View proposal'}).count(),0,'Never guess a proposal ID');assert.equal(await tracked.getByRole('status').filter({hasText:/^Finalized$/}).count(),0);
 stage='finalized';await tracked.getByRole('status').filter({hasText:/^Finalized$/}).waitFor({timeout:15000});assert.equal(await tracked.evaluate(()=>window.createSends),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: five-step create, disconnected/connected, local drafts, GEN/NFT, window/token validation, mobile, wallet rejection, mocked transaction lifecycle and no guessed ID. No live proposal created.');
})().catch(error=>{console.error(error);process.exit(1)});
