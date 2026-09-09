import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { liveProof as p } from "@/lib/voxen/proof";
import { AddressDisplay } from "./AddressDisplay";
export function LiveProofPanel({ full = false }: { full?: boolean }) {
  return (
    <div className="proof-panel">
      <div className="proof-intro">
        <span className="eyebrow">
          <Radio size={14} /> Bradbury Testnet
        </span>
        <h2>
          Real credential.
          <br />
          Real vote.
          <br />
          <span className="muted">Verifiable progress.</span>
        </h2>
        <p>Voxen has already been tested end-to-end on GenLayer Bradbury.</p>
        <p>
          An eligible credential holder successfully voted. A non-holder’s vote
          was rejected. The tally updated only for the successful vote.
        </p>
        <details>
          <summary>What is Bradbury Testnet?</summary>
          <p>
            Testnet environment used to demonstrate Voxen before production
            deployment.
          </p>
        </details>
        <span className="badge status-open">
          Successful holder eligibility proof
        </span>
        <p className="small">
          Recorded deployment evidence supplied by the project. This is not a
          live RPC feed.
        </p>
        {!full && (
          <Link className="text-link" href="/live-proof">
            Read the proof <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <div className="proof-record">
        <div className="row">
          <span className="eyebrow">EXECUTION RECORD</span>
          <span className="mono">{p.proposal}</span>
        </div>
        <h3>{p.title}</h3>
        <details>
          <summary>Technical proof</summary>
          <dl>
            <dt>Voxen Intelligent Contract</dt>
            <dd>
              <AddressDisplay address={p.contract} />
            </dd>
            <dt>ERC1155 badge contract</dt>
            <dd>
              <AddressDisplay address={p.badge} />
            </dd>
            <dt>Credential token ID</dt>
            <dd className="mono">501</dd>
          </dl>
        </details>
        <div className="proof-tally">
          <div>
            <strong>1</strong>
            <span>Approve</span>
          </div>
          <div>
            <strong>0</strong>
            <span>Reject</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Total votes</span>
          </div>
        </div>
        <div className="record-footer">
          <span className="dot" /> Holder vote accepted · tally updated
        </div>
      </div>
    </div>
  );
}
