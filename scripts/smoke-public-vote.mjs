#!/usr/bin/env node

// One-shot, interactive smoke test for the deployed PUBLIC Voxen contract.
// It deliberately has no retry/resubmission path for either write.
import { readFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { decryptKeystoreJson } from 'ethers';
import { createAccount, createClient, isSuccessful } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

const RPC_URL = 'https://studio-next.genlayer.com/api';
const CHAIN_ID = 61997;
const CONTRACT = '0x3da4C8759A6D0a948C918969b63bd59d44bC588F';
const KEYSTORE_PATH = '/home/temitope/.genlayer-backups/voxen-account.json';
const EXPECTED_SIGNER = '0xEaAdc287dBA33381276DB7E935E7D5bfEE1d7bE4';

// Keep the SDK's Studio consensus metadata, but bind signing and reads to the
// explicit Studio Next endpoint and chain ID.
const studioNext = {
  ...studioDevnet,
  id: CHAIN_ID,
  name: 'GenLayer Studio Next',
  rpcUrls: {
    ...studioDevnet.rpcUrls,
    default: { ...studioDevnet.rpcUrls.default, http: [RPC_URL] },
  },
};

const json = (value) => JSON.stringify(value, (_key, item) => (
  typeof item === 'bigint' ? item.toString() : item
), 2);

function promptHidden(prompt) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('An interactive TTY is required to enter the keystore password.');
  }
  return new Promise((resolve, reject) => {
    let answer = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(answer);
        } else if (char === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Cancelled.'));
        } else if (char === '\u007f' || char === '\b') {
          answer = answer.slice(0, -1);
        } else if (char >= ' ') {
          answer += char;
        }
      }
    };
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function confirm(prompt) {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question(`${prompt} [y/N] `)).trim().toLowerCase() === 'y';
  } finally {
    readline.close();
  }
}

function normalizeKeystoreCrypto(keystoreText) {
  const keystore = JSON.parse(keystoreText);
  if (keystore.Crypto !== undefined) {
    if (keystore.crypto !== undefined) throw new Error('Keystore has both Crypto and crypto fields.');
    keystore.crypto = keystore.Crypto;
    delete keystore.Crypto;
  }
  if (keystore.crypto === undefined) throw new Error('Keystore has neither Crypto nor crypto fields.');
  return JSON.stringify(keystore);
}

async function readProposalIds(client) {
  const ids = [];
  let offset = 0;
  for (;;) {
    const page = await client.readContract({
      address: CONTRACT,
      functionName: 'get_proposal_ids',
      args: [offset, 50],
      jsonSafeReturn: true,
    });
    if (!page || !Array.isArray(page.ids) || !Number.isSafeInteger(Number(page.total))) {
      throw new Error('Contract returned an invalid proposal ID page.');
    }
    ids.push(...page.ids.map((id) => {
      if (typeof id !== 'string') throw new Error('Contract returned a non-string proposal ID.');
      return id;
    }));
    if (page.next_offset === null) return ids;
    if (!Number.isSafeInteger(Number(page.next_offset)) || Number(page.next_offset) <= offset) {
      throw new Error('Contract returned an invalid proposal pagination cursor.');
    }
    offset = Number(page.next_offset);
  }
}

async function waitForFinal(client, transactionId, label) {
  console.log(`Tracking ${label} transaction to final status...`);
  // This polls the one transaction only; it never signs or submits another.
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionId,
    waitUntil: 'finalized',
    interval: 3_000,
    retries: Number.MAX_SAFE_INTEGER,
    fullTransaction: true,
  });
  const status = String(receipt.statusName ?? receipt.status ?? 'unknown');
  console.log(`${label} final status: ${status}`);
  return {
    status,
    successful: isSuccessful(receipt),
    execution: receipt.txExecutionResultName ?? receipt.txExecutionResult ?? 'unknown',
  };
}

function numberAtLeastOne(value) {
  try {
    return BigInt(value) >= 1n;
  } catch {
    return false;
  }
}

function parseVoteExistingArgument(argv) {
  if (argv.length === 0) return null;
  if (argv.length === 2 && argv[0] === '--vote-existing' && argv[1].startsWith('proposal-')) {
    return argv[1];
  }
  throw new Error('Usage: node scripts/smoke-public-vote.mjs [--vote-existing proposal-N]');
}

function assertVotingWindow(proposal) {
  const now = Math.floor(Date.now() / 1000);
  if (proposal?.status !== 'PUBLISHED' || !Number.isInteger(proposal.start_time) || !Number.isInteger(proposal.end_time)
    || now < proposal.start_time || now >= proposal.end_time) {
    throw new Error('Proposal is outside its voting window.');
  }
  if (!Array.isArray(proposal.options) || proposal.options.length < 2) {
    throw new Error('Proposal has invalid vote options.');
  }
  return now;
}

// This exactly matches Transaction Kit RC2's `estimate({ preset: 'standard' })`:
// it obtains a policy quote only.  Do not use estimateTransactionFeesForWrite
// here: that calls Studio's sim_estimateTransactionFees, which is currently
// unable to execute cast_vote and returns an opaque -32000 error before signing.
async function estimateRc2StandardFees(client) {
  return client.estimateTransactionFees({
    appealRounds: 3n,
    rotations: [0n, 0n, 0n, 0n],
  });
}

async function main() {
  const existingProposalId = parseVoteExistingArgument(process.argv.slice(2));

  const report = {
    proposalTransactionId: null,
    proposalId: null,
    eligibilityStatus: null,
    voteTransactionId: null,
    finalTransactionStatus: null,
    tallyCounts: null,
    totalVotes: null,
  };
  try {
    const readClient = createClient({ chain: studioNext });
    const rpcChainId = Number(BigInt(await readClient.request({ method: 'eth_chainId' })));
    if (rpcChainId !== CHAIN_ID) {
      throw new Error(`Refusing smoke test: ${RPC_URL} reports chain ID ${rpcChainId}, expected ${CHAIN_ID}.`);
    }
    console.log(`RPC chain ID verified: ${rpcChainId}`);

    let password = await promptHidden(`Keystore password for ${KEYSTORE_PATH}: `);
    const passwordBytes = Buffer.from(password);
    password = '';
    let decrypted;
    try {
      const keystoreText = await readFile(KEYSTORE_PATH, 'utf8');
      decrypted = await decryptKeystoreJson(normalizeKeystoreCrypto(keystoreText), passwordBytes);
    } finally {
      passwordBytes.fill(0);
    }
    const account = createAccount(decrypted.privateKey);
    decrypted.privateKey = '';
    console.log(`Signer: ${account.address}`);
    if (account.address.toLowerCase() !== EXPECTED_SIGNER.toLowerCase()) {
      throw new Error(`Refusing smoke test: signer ${account.address} does not match expected signer ${EXPECTED_SIGNER}.`);
    }
    console.log('Signer address verified.');

    const client = createClient({ chain: studioNext, account });

    if (existingProposalId !== null) {
      report.proposalId = existingProposalId;
      const proposal = await readClient.readContract({
        address: CONTRACT, functionName: 'get_proposal', args: [report.proposalId], jsonSafeReturn: true,
      });
      console.log('Existing proposal:');
      console.log(json(proposal));
      const now = assertVotingWindow(proposal);
      console.log(`Voting window confirmed at ${new Date(now * 1000).toISOString()}: ${new Date(proposal.start_time * 1000).toISOString()} to ${new Date(proposal.end_time * 1000).toISOString()}`);
      const eligibility = await readClient.readContract({
        address: CONTRACT, functionName: 'check_eligibility', args: [report.proposalId, account.address], jsonSafeReturn: true,
      });
      report.eligibilityStatus = eligibility?.status ?? null;
      console.log(`Eligibility status: ${report.eligibilityStatus}`);
      if (eligibility?.status !== 'PUBLIC_ELIGIBLE' || eligibility?.eligible !== true) {
        throw new Error('Signer is not PUBLIC_ELIGIBLE; refusing to cast a vote.');
      }
      if (!await confirm(`Cast option 0 for existing ${report.proposalId} and submit exactly one vote transaction?`)) {
        console.log('Vote cancelled; no vote transaction was signed or submitted.');
        return;
      }
      // Re-read immediately before estimating/signing; never submit outside the window.
      assertVotingWindow(await readClient.readContract({
        address: CONTRACT, functionName: 'get_proposal', args: [report.proposalId], jsonSafeReturn: true,
      }));
      const voteFees = await estimateRc2StandardFees(client);
      report.voteTransactionId = await client.writeContract({
        account, address: CONTRACT, functionName: 'cast_vote', args: [report.proposalId, 0], value: 0n,
        fees: { distribution: voteFees.distribution, feeValue: voteFees.feeValue },
      });
      console.log(`Vote transaction ID: ${report.voteTransactionId}`);
      const voteFinal = await waitForFinal(client, report.voteTransactionId, 'Vote');
      report.finalTransactionStatus = voteFinal.status;
      if (!voteFinal.successful) throw new Error(`Vote finalized without success (execution: ${voteFinal.execution}).`);
      const tallies = await readClient.readContract({
        address: CONTRACT, functionName: 'get_proposal_tallies', args: [report.proposalId], jsonSafeReturn: true,
      });
      report.tallyCounts = tallies?.counts ?? null;
      report.totalVotes = tallies?.total_votes ?? null;
      console.log('Final tallies:');
      console.log(json(tallies));
      if (!numberAtLeastOne(report.totalVotes)) throw new Error('Final tallies did not contain at least one vote.');
      return;
    }

    const beforeIds = await readProposalIds(readClient);
    console.log(`Proposal IDs before write: ${beforeIds.length}`);

    const title = `PUBLIC smoke vote ${new Date().toISOString()} ${Math.random().toString(36).slice(2, 10)}`;
    console.log(`\nPrepared PUBLIC proposal: ${title}`);
    console.log('Voting will begin immediately after confirmation and close about one hour later.');
    if (!await confirm('Create this proposal and submit exactly one transaction?')) {
      console.log('Proposal creation cancelled; nothing was signed or submitted.');
      return;
    }

    // Set the window after confirmation so the voting start is as close as
    // possible to this one and only proposal submission.
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 60 * 60;
    const createArgs = [
      title,
      'One-shot Studio Next smoke-test proposal. Do not use for governance.',
      ['Option 0', 'Option 1'],
      startTime,
      endTime,
      'PUBLIC',
      null,
      null,
      false,
      'LIVE',
      'FINAL_ON_CAST',
      null,
    ];
    console.log(`Voting window: ${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()}`);

    // Exact signature from contracts/voxen.py and frontend/lib/voxen/create-proposal.ts:
    // create_proposal(title, description, options, start_time, end_time,
    // eligibility_mode, space_id, evidence_url, governance_guard_required,
    // result_visibility, vote_change_policy, poap_event_id)
    const proposalFees = await client.estimateTransactionFeesForWrite({
      account,
      address: CONTRACT,
      functionName: 'create_proposal',
      args: createArgs,
      value: 0n,
    });
    report.proposalTransactionId = await client.writeContract({
      account,
      address: CONTRACT,
      functionName: 'create_proposal',
      args: createArgs,
      value: 0n,
      fees: {
        distribution: proposalFees.distribution,
        messageAllocations: proposalFees.messageAllocations,
        feeValue: proposalFees.feeValue,
      },
    });
    console.log(`Proposal transaction ID: ${report.proposalTransactionId}`);
    const proposalFinal = await waitForFinal(client, report.proposalTransactionId, 'Proposal');
    if (!proposalFinal.successful) {
      throw new Error(`Proposal finalized without success (execution: ${proposalFinal.execution}).`);
    }

    const afterIds = await readProposalIds(readClient);
    const newIds = afterIds.filter((id) => !beforeIds.includes(id));
    if (newIds.length !== 1) {
      throw new Error(`Expected exactly one new proposal ID after finalization; found ${newIds.length}.`);
    }
    report.proposalId = newIds[0];
    console.log(`Generated proposal ID (before/after difference): ${report.proposalId}`);

    const proposal = await readClient.readContract({
      address: CONTRACT, functionName: 'get_proposal', args: [report.proposalId], jsonSafeReturn: true,
    });
    console.log('New proposal:');
    console.log(json(proposal));
    const eligibility = await readClient.readContract({
      address: CONTRACT, functionName: 'check_eligibility', args: [report.proposalId, account.address], jsonSafeReturn: true,
    });
    report.eligibilityStatus = eligibility?.status ?? null;
    console.log(`Eligibility status: ${report.eligibilityStatus}`);
    if (eligibility?.status !== 'PUBLIC_ELIGIBLE' || eligibility?.eligible !== true) {
      throw new Error('Signer is not PUBLIC_ELIGIBLE; refusing to cast a vote.');
    }

    if (!await confirm('Cast option 0 and submit exactly one vote transaction?')) {
      console.log('Vote cancelled; no vote transaction was signed or submitted.');
      return;
    }
    // Exact signature from contracts/voxen.py and frontend/lib/voxen/writes.ts:
    // cast_vote(proposal_id, option_index)
    const voteFees = await estimateRc2StandardFees(client);
    report.voteTransactionId = await client.writeContract({
      account, address: CONTRACT, functionName: 'cast_vote', args: [report.proposalId, 0], value: 0n,
      fees: { distribution: voteFees.distribution, feeValue: voteFees.feeValue },
    });
    console.log(`Vote transaction ID: ${report.voteTransactionId}`);
    const voteFinal = await waitForFinal(client, report.voteTransactionId, 'Vote');
    report.finalTransactionStatus = voteFinal.status;
    if (!voteFinal.successful) {
      throw new Error(`Vote finalized without success (execution: ${voteFinal.execution}).`);
    }

    const tallies = await readClient.readContract({
      address: CONTRACT, functionName: 'get_proposal_tallies', args: [report.proposalId], jsonSafeReturn: true,
    });
    report.tallyCounts = tallies?.counts ?? null;
    report.totalVotes = tallies?.total_votes ?? null;
    console.log('Final tallies:');
    console.log(json(tallies));
    if (!numberAtLeastOne(report.totalVotes)) throw new Error('Final tallies did not contain at least one vote.');
  } finally {
    console.log('\nSmoke-test report:');
    console.log(`Proposal transaction ID: ${report.proposalTransactionId ?? 'not submitted'}`);
    console.log(`Generated proposal ID: ${report.proposalId ?? 'not determined'}`);
    console.log(`Eligibility status: ${report.eligibilityStatus ?? 'not checked'}`);
    console.log(`Vote transaction ID: ${report.voteTransactionId ?? 'not submitted'}`);
    console.log(`Final transaction status: ${report.finalTransactionStatus ?? 'not reached'}`);
    console.log(`Tally counts: ${report.tallyCounts === null ? 'not read' : json(report.tallyCounts)}`);
    console.log(`Total votes: ${report.totalVotes ?? 'not read'}`);
  }
}

main().catch((error) => {
  console.error(`Smoke test aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
