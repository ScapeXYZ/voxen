// Picker interactions on desktop/mobile. No wallet or transaction is used.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const base = process.env.VOXEN_TEST_URL || "http://127.0.0.1:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/create");
      await page
        .getByRole("button", { name: "Load live test settings" })
        .click();
      for (let i = 0; i < 3; i++)
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
      const selection = page.getByRole("region", {
        name: "Voting requirement",
      });
      await selection.waitFor();
      assert.equal(
        await page.getByLabel("Credential contract address").isVisible(),
        false,
      );
      assert.equal(
        await selection.locator("details").getAttribute("open"),
        null,
      );
      await page.getByRole("button", { name: "Clear selection" }).click();
      assert.equal(await selection.count(), 0);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.locator(".form-error").waitFor();
      const search = page.getByRole("searchbox");
      await search.fill("not an available credential");
      await page
        .getByText(
          "No matching credentials. Try another name or use a custom credential.",
        )
        .waitFor();
      await search.fill("vOxEn holder");
      const card = page.getByRole("button", {
        name: /Voxen ERC1155 Holder Credential/,
      });
      await card.click();
      assert.match(
        await selection.innerText(),
        /Voxen ERC1155 Holder Credential/,
      );
      await page.getByRole("button", { name: "Change credential" }).click();
      await search.fill("ERC1155");
      await card.click();
      await page.getByText("Use custom credential", { exact: true }).click();
      await page.getByLabel("Friendly label").fill("Custom collection #70");
      await page
        .getByLabel("Credential type")
        .selectOption("ERC721");
      assert.equal(await page.getByLabel("Token ID").count(), 0);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      assert.match(
        await page.locator(".review-list").innerText(),
        /Custom collection #70/,
      );
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await page
        .getByRole("button", { name: /Voxen ERC1155 Holder Credential/ })
        .click();
      assert.match(
        await selection.innerText(),
        /Voxen ERC1155 Holder Credential/,
      );
      await selection.getByText("Technical details", { exact: true }).click();
      assert.match(await selection.innerText(), /501/);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      assert.match(
        await page.locator(".review-list").innerText(),
        /Voxen ERC1155 Holder Credential/,
      );
      assert.deepEqual(errors, []);
      await page.goto(base + "/proposals/proposal-3");
      const eligibility = page.locator(".eligibility-panel");
      await eligibility.getByRole("heading", { name: "Required credential", exact: true }).waitFor({timeout:60000});
      assert.match(await eligibility.innerText(), /Voxen ERC1155 Holder Credential/);
      assert.equal(await eligibility.locator("details").first().getAttribute("open"), null);
      assert.equal(await eligibility.locator(".mono").isVisible(), false);
      await eligibility.getByText("Technical details", {exact:true}).click();
      assert.match(await eligibility.innerText(), /501/);
      assert.match(await eligibility.innerText(), /ERC1155/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
    }
    console.log(
      "PASS: desktop/mobile credential search, empty results, select/change/clear, custom ERC721, canonical fixture restore, hidden details, review and no overflow.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
