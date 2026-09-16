#!/usr/bin/env node

// One-off deployment helper for Studio Next. This deliberately does not use
// GenLayer CLI network selection: genlayer-js signs local-key transactions
// using client.chain.id.
import { readFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { decryptKeystoreJson } from 'ethers';
import { createAccount, createClient, isSuccessful } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

const RPC_URL = 'https://studio-next.genlayer.com/api';
const CHAIN_ID = 61997;
const ARTIFACT_PATH = new URL('../artifacts/voxen.compact.py', import.meta.url);
const KEYSTORE_PATH = '/home/temitope/.genlayer-backups/voxen-account.json';
const EXPECTED_SIGNER = '0xEaAdc287dBA33381276DB7E935E7D5bfEE1d7bE4';

// Retain the SDK's Studio consensus contract metadata, but do not inherit its
// endpoint or permit its chain ID to select the signing domain.
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
    const onData = (chunk) => {
      const input = chunk.toString('utf8');
      for (const char of input) {
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
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function confirmDeployment() {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question('Sign and submit this deployment? [y/N] ')).trim().toLowerCase() === 'y';
  } finally {
    readline.close();
  }
}

function normalizeKeystoreCrypto(keystoreText) {
  const keystore = JSON.parse(keystoreText);
  if (keystore.Crypto !== undefined) {
    if (keystore.crypto !== undefined) {
      throw new Error('Keystore contains both "Crypto" and "crypto" fields.');
    }
    // ethers expects lowercase `crypto`; this conversion exists only in RAM.
    keystore.crypto = keystore.Crypto;
    delete keystore.Crypto;
  }
  if (keystore.crypto === undefined) {
    throw new Error('Keystore has neither a "Crypto" nor a "crypto" field.');
  }
  return JSON.stringify(keystore);
}

function receiptContractAddress(receipt) {
  const data = receipt.data;
  if (!data || typeof data !== 'object') return undefined;
  const address = data.contract_address;
  return typeof address === 'string' ? address : undefined;
}

async function main() {
  if (process.argv.length !== 2) {
    throw new Error('This script accepts no command-line arguments.');
  }

  const code = new Uint8Array(await readFile(ARTIFACT_PATH));
  if (code.length === 0) throw new Error(`Artifact is empty: ${ARTIFACT_PATH.pathname}`);

  const readClient = createClient({ chain: studioNext });
  const rpcChainId = Number(BigInt(await readClient.request({ method: 'eth_chainId' })));
  if (rpcChainId !== CHAIN_ID) {
    throw new Error(`Refusing deployment: ${RPC_URL} reports chain ID ${rpcChainId}, expected ${CHAIN_ID}.`);
  }

  // This validates the exact bytes submitted below without creating a contract.
  await readClient.getContractSchemaForCode(code);

  let password = await promptHidden(`Keystore password for ${KEYSTORE_PATH}: `);
  const passwordBytes = Buffer.from(password);
  password = '';
  let decrypted;
  try {
    const keystoreText = await readFile(KEYSTORE_PATH, 'utf8');
    decrypted = await decryptKeystoreJson(normalizeKeystoreCrypto(keystoreText), passwordBytes);
  } finally {
    // Do not retain the password after the decrypt call.
    passwordBytes.fill(0);
  }

  const account = createAccount(decrypted.privateKey);
  decrypted.privateKey = '';
  if (account.address.toLowerCase() !== EXPECTED_SIGNER.toLowerCase()) {
    throw new Error(`Refusing deployment: decrypted signer is ${account.address}, not the expected address.`);
  }

  const client = createClient({ chain: studioNext, account });
  // genlayer-js@2.0.0-rc.1 has no artifact-specific deploy simulation API.
  // This is its documented current-policy deployment fee preset; the exact
  // `code` bytes above are the bytes passed to deployContract below.
  const estimate = await client.estimateTransactionFees();
  console.log(`\nArtifact: ${ARTIFACT_PATH.pathname} (${code.length} bytes)`);
  console.log(`Signer: ${account.address}`);
  console.log(`RPC chain ID: ${rpcChainId}`);
  console.log('Deployment fee estimate:');
  console.log(json(estimate));

  if (!await confirmDeployment()) {
    console.log('Deployment cancelled; nothing was signed or submitted.');
    return;
  }

  // No retry or resubmission path exists in this script.
  const transactionId = await client.deployContract({
    account,
    code,
    fees: {
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations,
      feeValue: estimate.feeValue,
    },
  });
  console.log(`Transaction ID: ${transactionId}`);
  console.log('Tracking transaction to finalized status...');

  // Polling only observes this one submission; it never signs or submits again.
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionId,
    waitUntil: 'finalized',
    interval: 3_000,
    retries: Number.MAX_SAFE_INTEGER,
    fullTransaction: true,
  });
  console.log(`Final status: ${receipt.statusName ?? receipt.status}`);

  if (!isSuccessful(receipt)) {
    console.log(`Deployment finalized without success (execution: ${receipt.txExecutionResultName ?? receipt.txExecutionResult ?? 'unknown'}).`);
    return;
  }

  const contractAddress = receiptContractAddress(receipt);
  if (contractAddress) {
    console.log(`Contract address: ${contractAddress}`);
  } else {
    console.log('Deployment finalized successfully, but its receipt did not return a contract address.');
  }
}

main().catch((error) => {
  console.error(`Deployment aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
