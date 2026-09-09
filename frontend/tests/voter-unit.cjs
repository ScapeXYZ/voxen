// Dependency-free runner using the repository's TypeScript compiler and Node assertions.
// RPC and wallet effects are replaced with explicit fixtures. Never sends a transaction.
const ts = require("typescript"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const cache = new Map();
let writeRequest, sdkConfig;
let transactionReceipt = { status: 5, txExecutionResult: 1 };
const fakeSdk = {
  ...require("genlayer-js"),
  createClient: (config) => {
    sdkConfig = config;
    return {
      getTransaction: async () => transactionReceipt,
      writeContract: async (request) => {
        writeRequest = request;
        await config.provider.request({
          method: "eth_sendTransaction",
          params: [],
        });
        return "0x" + "bb".repeat(32);
      },
    };
  },
};
function load(filename) {
  const absolute = path.resolve(root, filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} };
  cache.set(absolute, module);
  const js = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) =>
      name === "genlayer-js" &&
      (filename.endsWith("writes.ts") || filename.endsWith("transactions.ts"))
        ? fakeSdk
        : name.startsWith("@/")
          ? load(name.slice(2) + ".ts")
          : name.startsWith(".")
            ? load(
                path.relative(
                  root,
                  path.resolve(path.dirname(absolute), name),
                ) + ".ts",
              )
            : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
(async () => {
  const { transactionStage } = load("lib/voxen/transaction-state.ts");
  for (const [receipt, expected] of [
    [{ status: 5, txExecutionResult: 1 }, "accepted"],
    [{ status: 5, statusName: "FINALIZED", txExecutionResult: 1 }, "accepted"],
    [{ status: 7, txExecutionResult: 1 }, "finalized"],
    [{ status: 5, txExecutionResult: 2 }, "failed"],
    [{ status: 7, txExecutionResult: 2 }, "failed"],
    [{ status: 5 }, "processing"],
    [{ status: 7 }, "processing"],
    [{ status: 3, txExecutionResult: 2 }, "processing"],
    [{ status: 8 }, "failed"],
    [{ status: 11, txExecutionResult: 1 }, "accepted"],
  ])
    assert.equal(transactionStage(receipt), expected, JSON.stringify(receipt));
  const { voteError } = load("lib/voxen/errors.ts");
  assert.match(
    voteError(new Error("Outside voting window")).message,
    /Voting is not active/,
  );
  assert.match(
    voteError({ code: 4001, message: "User rejected" }).message,
    /canceled/,
  );
  assert.match(
    voteError(new Error("Vote is final")).message,
    /cannot be changed/,
  );
  const { verifyEligibility, evmClient } = load("lib/voxen/eligibility.ts");
  const wallet = "0x0000000000000000000000000000000000000001";
  let balance = 1000000000000000001n,
    call;
  evmClient.getChainId = async () => 4221;
  evmClient.getBalance = async () => balance;
  evmClient.readContract = async (args) => {
    call = args;
    return balance;
  };
  assert.equal(
    (
      await verifyEligibility(wallet, {
        mode: "GEN_HOLDING",
        minimum: "1.000000000000000001",
        chainId: 4221,
      })
    ).eligible,
    true,
  );
  balance--;
  assert.equal(
    (
      await verifyEligibility(wallet, {
        mode: "GEN_HOLDING",
        minimum: "1.000000000000000001",
        chainId: 4221,
      })
    ).eligible,
    false,
  );
  const nft = {
    mode: "POAP_NFT",
    chainId: 4221,
    contract: wallet,
    label: "Friendly label 999",
    standard: "ERC1155",
    tokenId: "501",
  };
  balance = 1n;
  assert.equal((await verifyEligibility(wallet, nft)).eligible, true);
  assert.deepEqual(call.args, [wallet, 501n]);
  balance = 0n;
  assert.equal((await verifyEligibility(wallet, nft)).eligible, false);
  await assert.rejects(
    verifyEligibility(wallet, { ...nft, tokenId: undefined }),
    /token ID/,
  );
  await verifyEligibility(wallet, {
    ...nft,
    standard: "ERC721",
    tokenId: undefined,
  });
  assert.deepEqual(call.args, [wallet]);
  evmClient.getChainId = async () => 1;
  await assert.rejects(verifyEligibility(wallet, nft), /network/);
  const { readVoteTransaction } = load("lib/voxen/transactions.ts");
  const hash = "0x" + "ab".repeat(32);
  assert.equal((await readVoteTransaction(hash, "genlayer")).stage, "accepted");
  evmClient.getTransactionReceipt = async () => {
    const e = new Error("not found");
    e.name = "TransactionReceiptNotFoundError";
    throw e;
  };
  assert.equal((await readVoteTransaction(hash, "evm")).stage, "submitted");
  evmClient.getTransactionReceipt = async () => ({ status: "reverted" });
  assert.equal((await readVoteTransaction(hash, "evm")).stage, "failed");
  const { testnetBradbury } = require("genlayer-js/chains");
  const { parseAbi, encodeEventTopics, encodeAbiParameters } = require("viem");
  const event = parseAbi([
    "event CreatedTransaction(bytes32 indexed txId, uint256 txSlot)",
  ]);
  evmClient.getTransactionReceipt = async () => ({
    status: "success",
    logs: [
      {
        address: testnetBradbury.consensusMainContract.address,
        topics: encodeEventTopics({
          abi: event,
          eventName: "CreatedTransaction",
          args: { txId: hash },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [1n]),
      },
    ],
  });
  assert.equal((await readVoteTransaction(hash, "evm")).txId, hash);
  evmClient.getTransactionReceipt = async () => ({
    status: "success",
    logs: [],
  });
  await assert.rejects(readVoteTransaction(hash, "evm"), /do not resubmit/i);
  const { submitVote } = load("lib/voxen/writes.ts");
  let account = wallet,
    chain = "0x107d",
    sends = 0;
  global.localStorage = { getItem: () => null };
  global.window = {
    ethereum: {
      request: async ({ method }) => {
        if (method === "eth_accounts") return [account];
        if (method === "eth_chainId") return chain;
        if (method === "eth_sendTransaction") {
          sends++;
          return "0x" + "aa".repeat(32);
        }
        throw Error(method);
      },
    },
  };
  const now = Math.floor(Date.now() / 1000);
  let p = {
      status: "PUBLISHED",
      options: [{}, {}],
      voteChangePolicy: "CHANGE_UNTIL_CLOSE",
    },
    ballot = null,
    eligible = true,
    windowState = "WITHIN";
  global.fetch = async (url) => ({
    ok: true,
    json: async () =>
      url.includes("/eligibility?")
        ? { eligible }
        : url.includes("?wallet=")
          ? { vote: ballot }
          : {
              proposal: p,
              timeWindow: {
                start: now - 10,
                end: now + 1000,
                window: windowState,
              },
            },
  });
  const stages = [];
  await submitVote("proposal-3", wallet, 1, (s) => stages.push(s.stage));
  assert.deepEqual(writeRequest, {
    address: "0xA7c7B3F81dbbC511029a9A07FDfBf97dC1A822f7",
    functionName: "cast_vote",
    args: ["proposal-3", 1],
    value: 0n,
  });
  assert.deepEqual(stages, ["submitting", "submitted", "processing"]);
  assert.equal(sends, 1);
  windowState = "ENDED";
  await assert.rejects(
    submitVote("proposal-3", wallet, 0, () => {}),
    /Outside voting window/,
  );
  windowState = "WITHIN";
  p.status = "CLOSED";
  await assert.rejects(
    submitVote("proposal-3", wallet, 0, () => {}),
    /not published/,
  );
  p.status = "PUBLISHED";
  eligible = false;
  await assert.rejects(
    submitVote("proposal-3", wallet, 0, () => {}),
    /Eligibility/,
  );
  eligible = true;
  ballot = { optionIndex: 0 };
  p.voteChangePolicy = "FINAL_ON_CAST";
  await assert.rejects(
    submitVote("proposal-3", wallet, 1, () => {}),
    /Vote is final/,
  );
  p.voteChangePolicy = "CHANGE_UNTIL_CLOSE";
  await assert.rejects(
    submitVote("proposal-3", wallet, 0, () => {}),
    /Same option/,
  );
  await submitVote("proposal-3", wallet, 1, () => {});
  assert.equal(sends, 2);
  chain = "0x1";
  await assert.rejects(
    submitVote("proposal-3", wallet, 1, () => {}),
    /network/,
  );
  chain = "0x107d";
  account = "0x0000000000000000000000000000000000000002";
  await assert.rejects(
    submitVote("proposal-3", wallet, 1, () => {}),
    /wallet changed/,
  );
  assert.equal(sends, 2);
  // Creation argument order and null encoding are part of the deployed interface.
  const {
    createProposalArgs,
    emptyProposalForm,
    validateProposalForm,
    smokeTestForm,
  } = load("lib/voxen/create-proposal.ts");
  const form = {
    ...smokeTestForm(),
    start: new Date((now - 10) * 1000).toISOString(),
    end: new Date((now + 3600) * 1000).toISOString(),
    evidence: "https://example.org/proof?x=1",
  };
  assert.deepEqual(createProposalArgs(form, ["Approve", "Reject"]), [
    "Voxen Frontend Live Vote Test",
    form.description,
    ["Approve", "Reject"],
    now - 10,
    now + 3600,
    "POAP_NFT",
    null,
    form.evidence,
    false,
    "LIVE",
    "FINAL_ON_CAST",
    null,
    "0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b",
    "Voxen ERC1155 Holder Credential",
    "ERC1155",
    4221,
    501n,
  ]);
  const gen = createProposalArgs(
    {
      ...form,
      mode: "GEN_HOLDING",
      minimum: "1.000000000000000001",
      evidence: "",
    },
    ["Yes", "No"],
  );
  assert.equal(gen[5], "GEN");
  assert.equal(gen[7], null);
  assert.equal(gen[11], 1000000000000000001n);
  assert.deepEqual(gen.slice(12), [null, null, null, null, null]);
  assert.equal(
    createProposalArgs({ ...form, credentialMetadata: "", standard: "ERC721", token: "" }, [
      "Yes",
      "No",
    ])[16],
    null,
  );
  assert.equal(
    createProposalArgs({ ...form, credentialMetadata: "", label: "Token 999", token: "0" }, [
      "Yes",
      "No",
    ])[16],
    0n,
  );
  for (const patch of [
    { space: "commons" },
    { guard: true },
    { mode: "OTHER" },
    { chain: "1" },
    { token: "label" },
    { visibility: "OTHER" },
    { policy: "OTHER" },
    { end: form.start },
  ])
    assert.throws(() =>
      createProposalArgs({ ...form, ...patch }, ["Yes", "No"]),
    );
  assert.throws(() => createProposalArgs(form, ["Same", "Same"]));
  assert.throws(() =>
    createProposalArgs(
      { ...form, mode: "GEN_HOLDING", minimum: (2n ** 256n).toString() },
      ["Yes", "No"],
    ),
  );
  const { createCatalogProvider, credentialFields, credentialProblem } = load("lib/voxen/credentials/provider.ts");
  const { credentialCatalog } = load("lib/voxen/credentials/catalog.ts");
  const fixture = credentialCatalog[0];
  const arbitrary = { ...fixture, id: "test-only", name: "Test label #70", verification: { ...fixture.verification, tokenId: "901" } };
  const provider = createCatalogProvider([fixture, arbitrary]);
  assert.equal((await provider.search("" )).length, 2);
  assert.equal((await provider.search("TEST #70"))[0].id, arbitrary.id);
  assert.equal((await provider.search("no match")).length, 0);
  const selected = { ...form, ...credentialFields(arbitrary) };
  assert.equal(createProposalArgs(selected, ["Yes", "No"])[16], 901n);
  assert.equal(JSON.parse(selected.credentialMetadata).verification.providerCredentialId, fixture.verification.providerCredentialId);
  assert.equal(createProposalArgs({ ...selected, ...credentialFields(fixture) }, ["Yes", "No"])[16], 501n);
  assert.throws(() => createProposalArgs({ ...selected, token: "70" }, ["Yes", "No"]));
  assert.throws(() => credentialFields({ ...arbitrary, verification: undefined }));
  for (const patch of [{ mode: "POAP_EVENT" }, { chainId: 1 }, { tokenId: undefined }, { contractAddress: "" }, { providerCredentialId: "" }, { tokenId: Number.MAX_SAFE_INTEGER + 1 }])
    assert.ok(credentialProblem({ ...arbitrary, verification: { ...arbitrary.verification, ...patch } }));
  const collection = { ...arbitrary, verification: { ...arbitrary.verification, mode: "ERC721_COLLECTION", tokenId: undefined } };
  const collectionArgs = createProposalArgs({ ...form, ...credentialFields(collection) }, ["Yes", "No"]);
  assert.equal(collectionArgs[14], "ERC721"); assert.equal(collectionArgs[16], null);
  assert.ok(credentialProblem({ ...collection, verification: { ...collection.verification, tokenId: "70" } }));
  assert.throws(() => createProposalArgs({ ...form, contract: "", label: "", token: "", credentialMetadata: "" }, ["Yes", "No"]));
  assert.equal(createProposalArgs({ ...form, credentialMetadata: "", label: "Custom #70", token: "501" }, ["Yes", "No"])[16], 501n);
  console.log("PASS: arbitrary catalog search, canonical selection/change/clear/custom mapping, ERC721/ERC1155, unsupported/missing metadata, #70 never inferred.");
  const { createProposal } = load("lib/voxen/writes.ts");
  account = wallet;
  chain = "0x107d";
  await createProposal(form, ["Approve", "Reject"], wallet, () => {});
  assert.equal(writeRequest.functionName, "create_proposal");
  assert.deepEqual(
    writeRequest.args,
    createProposalArgs(form, ["Approve", "Reject"]),
  );
  console.log(
    "PASS: exact GEN threshold, ERC721/ERC1155 balances/token ID, network rejection; cast signature and eligibility/time/ballot/account guards; status 5 vs 7 and execution failure. All effects mocked.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
