// Run with PLAYWRIGHT_PATH pointing to an installed Playwright module, or install it in your test environment.
// All write scenarios below are intercepted fixtures; this test NEVER authorizes a real transaction.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const base = process.env.VOXEN_TEST_URL || "http://127.0.0.1:3100";
const holder = "0x25c8a9c84461840500544c8b4d58C802C389dbD5";
const other = "0x0000000000000000000000000000000000000001";
const contract = "0xA7c7B3F81dbbC511029a9A07FDfBf97dC1A822f7";
const rpc = "https://rpc-bradbury.genlayer.com";
async function wallet(page, address = holder, chain = "0x107d", pending) {
  await page.addInitScript(
    ({ address, chain, pending, contract, rpc }) => {
      const listeners = {};
      let account = address;
      let network = chain;
      window.testSends = 0;
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }) => {
          if (method === "eth_accounts" || method === "eth_requestAccounts")
            return [account];
          if (method === "eth_chainId") return network;
          if (method === "wallet_switchEthereumChain") {
            network = "0x107d";
            listeners.chainChanged?.(network);
            return null;
          }
          if (method === "eth_sendTransaction") {
            window.testSends++;
            await new Promise((r) => setTimeout(r, 700));
            throw { code: 4001, message: "User rejected request" };
          }
          throw Error("Test wallet forbids " + method);
        },
        on: (event, fn) => {
          listeners[event] = fn;
        },
        removeListener: () => {},
      };
      window.setTestAccount = (next) => {
        account = next;
        listeners.accountsChanged?.([next]);
      };
      window.setTestChain = (next) => {
        network = next;
        listeners.chainChanged?.(next);
      };
      if (pending)
        sessionStorage.setItem(
          `voxen:vote:${rpc}:${contract}:proposal-3:${address.toLowerCase()}`,
          JSON.stringify(pending),
        );
    },
    { address, chain, pending, contract, rpc },
  );
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/proposals/proposal-3");
  await page
    .getByText("Connect your wallet to check whether you can vote.", {
      exact: true,
    })
    .waitFor({ timeout: 60000 });
  assert.equal(
    await page.locator(".voting-panel button.primary").isDisabled(),
    true,
  );
  assert.match(
    await page.locator(".voting-panel").innerText(),
    /Voting has ended/,
  );
  await wallet(page);
  await page.reload();
  await page
    .getByText("Eligible to vote", { exact: true })
    .waitFor({ timeout: 60000 });
  assert.match(
    await page.locator(".voting-panel").innerText(),
    /Your recorded choice: Approve/,
  );
  assert.equal(
    await page.locator(".voting-panel button.primary").isDisabled(),
    true,
  );
  assert.equal(await page.evaluate(() => window.testSends), 0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "mobile overflow",
    );
  }
  await page.evaluate((other) => window.setTestAccount(other), other);
  await page
    .getByText("This wallet does not hold the required credential.", { exact: true })
    .waitFor({ timeout: 60000 });
  await page.evaluate(() => window.setTestChain("0x1"));
  await page
    .getByText("Switch to GenLayer Bradbury to continue.", { exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".voting-panel button.primary").isDisabled(),
    true,
  );
  await page.evaluate(() => window.setTestChain("0x107d"));
  await page.route("**/eligibility?wallet=*", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({
      status: 502,
      json: { technical: "fixture RPC failure" },
    });
  });
  await page.evaluate((holder) => window.setTestAccount(holder), holder);
  await page
    .getByText("Checking credential ownership...", { exact: true })
    .waitFor();
  await page
    .getByText("We couldn't verify your voting eligibility. Try again.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.getByText("fixture RPC failure", { exact: true }).isVisible(),
    false,
  );
  await page.unroute("**/eligibility?wallet=*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByText("Eligible to vote", { exact: true })
    .waitFor({ timeout: 60000 });
  const menus = page.locator(".wallet-menu");
  await menus.first().locator("summary").click();
  await menus
    .first()
    .getByRole("button", { name: "Disconnect", exact: true })
    .click();
  await page
    .getByText("Connect your wallet to check whether you can vote.", {
      exact: true,
    })
    .waitFor();
  // Active window is an explicitly mocked fixture ONLY, never changed on-chain.
  const live = await (
    await page.request.get(base + "/api/voxen/proposals/proposal-3")
  ).json();
  const active = structuredClone(live);
  active.proposal.status = "PUBLISHED";
  active.timeWindow = {
    start: Math.floor(Date.now() / 1000) - 10,
    end: Math.floor(Date.now() / 1000) + 3600,
    window: "WITHIN",
    observedTime: Math.floor(Date.now() / 1000),
  };
  active.proposal.startsAt = new Date(
    active.timeWindow.start * 1000,
  ).toISOString();
  active.proposal.endsAt = new Date(active.timeWindow.end * 1000).toISOString();
  async function fixture(target, ballot = null) {
    const observed = { proposalReads: 0, voteReads: 0, ballot };
    await target.route("**/api/voxen/proposals/proposal-3", (r) => {
      observed.proposalReads++;
      return r.fulfill({ json: active });
    });
    await target.route("**/api/voxen/proposals/proposal-3?wallet=*", (r) => {
      observed.voteReads++;
      return r.fulfill({ json: { vote: observed.ballot } });
    });
    await target.route("**/eligibility?wallet=*", (r) =>
      r.fulfill({
        json: {
          eligible: true,
          observedBalance: "1",
          checkedAt: new Date().toISOString(),
        },
      }),
    );
    return observed;
  }
  const rejected = await browser.newPage();
  rejected.on("pageerror", (e) => errors.push(e.message));
  await wallet(rejected);
  await fixture(rejected);
  await rejected.goto(base + "/proposals/proposal-3");
  await rejected
    .getByText("Eligible to vote", { exact: true })
    .waitFor();
  await rejected.locator(".vote-option").first().click();
  await rejected
    .getByRole("button", { name: "Cast vote", exact: true })
    .click();
  await rejected
    .getByRole("status")
    .filter({ hasText: /^Preparing vote$/ })
    .waitFor();
  await rejected
    .getByRole("status")
    .filter({ hasText: /^Submitting$/ })
    .waitFor({ timeout: 60000 });
  await rejected
    .getByText("You canceled the wallet request. No vote was submitted.", {
      exact: true,
    })
    .waitFor({ timeout: 60000 });
  assert.equal(await rejected.evaluate(() => window.testSends), 1);
  // Resume a MOCK submitted transaction; verify polling error stays pending and 5 is never presented as finalized.
  const tracked = await browser.newPage();
  tracked.on("pageerror", (e) => errors.push(e.message));
  const txId = "0x" + "ab".repeat(32);
  await wallet(tracked, holder, "0x107d", { txId, stage: "processing" });
  const refreshed = await fixture(tracked);
  let stage = "processing",
    unavailable = true;
  await tracked.route("**/api/voxen/transactions/*", (r) =>
    unavailable
      ? r.fulfill({
          status: 502,
          json: { technical: "fixture monitoring failure" },
        })
      : r.fulfill({ json: { stage, txId } }),
  );
  await tracked.goto(base + "/proposals/proposal-3");
  await tracked
    .getByText(/Transaction status is temporarily unavailable/)
    .waitFor();
  assert.equal(
    await tracked.locator(".voting-panel button.primary").isDisabled(),
    true,
  );
  unavailable = false;
  stage = "accepted";
  refreshed.ballot = { optionIndex: 1 };
  active.proposal.options[1].votes = 1;
  active.proposal.participation = 2;
  await tracked
    .getByRole("button", { name: "Retry transaction status" })
    .click();
  await tracked
    .getByRole("status")
    .filter({ hasText: /^Accepted by GenLayer$/ })
    .waitFor();
  assert.equal(
    await tracked
      .getByRole("status")
      .filter({ hasText: /^Finalized$/ })
      .count(),
    0,
  );
  await tracked
    .getByText("Your recorded choice: Reject", { exact: true })
    .waitFor();
  assert.ok(
    refreshed.proposalReads >= 2 && refreshed.voteReads >= 2,
    "Acceptance refreshes proposal/tally and ballot",
  );
  assert.match(
    await tracked.locator(".voting-panel").innerText(),
    /2 participants/,
  );
  assert.equal(
    await tracked.locator(".voting-panel button.primary").isDisabled(),
    true,
    "FINAL_ON_CAST locks refreshed ballot",
  );
  stage = "finalized";
  await tracked
    .getByRole("status")
    .filter({ hasText: /^Finalized$/ })
    .waitFor({ timeout: 15000 });
  assert.equal(await tracked.evaluate(() => window.testSends), 0);
  await page.goto(base + "/live-proof");
  await page
    .getByRole("status")
    .filter({ hasText: /^Live$/ })
    .waitFor({ timeout: 60000 });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: live disconnected/holder/non-holder/wrong-network/expired pages, eligibility failure+retry, disconnect, mobile; MOCK wallet rejection and consensus monitoring/accepted/finalized. No real vote sent.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
