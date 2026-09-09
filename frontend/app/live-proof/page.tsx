import { LiveProposalView } from "@/components/proposals/LiveProposalView";
import { LiveProofPanel } from "@/components/governance/LiveProofPanel";
import { BRADBURY } from "@/lib/voxen/config";
export default function Proof() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">FIELD RECORD / 001</span>
      <div className="page-heading">
        <div>
          <h1>Live Proof</h1>
          <p>
            An eligible holder voted, a non-holder was rejected, and only the
            successful vote changed the tally.
          </p>
        </div>
        <span className="badge status-open">BRADBURY TESTNET</span>
      </div>
      <LiveProofPanel full />
      <LiveProposalView id="proposal-3" compact />
      <section className="detail-section">
        <span className="eyebrow">01 / HOLDER PATH · PROPOSAL-3</span>
        <h2>A credential opened the door.</h2>
        <ol className="proof-steps">
          {[
            "Badge deployed",
            "Wallet holding verified",
            "Proposal created",
            "Proposal opened",
            "Eligibility checked",
            "Holder vote accepted",
            "Tally updated",
          ].map((s, i) => (
            <li key={s}>
              <span className="mono">0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </section>
      <section className="panel rejection">
        <span className="eyebrow">02 / NON-HOLDER PATH · PROPOSAL-2</span>
        <h2>The same gate rejected a non-holder.</h2>
        <div className="rejection-flow">
          <span>Non-holder attempted vote</span>
          <span>→</span>
          <span>Eligibility rejected</span>
          <span>→</span>
          <span>Tally unchanged</span>
        </div>
        <p>
          No absolute tally is supplied for proposal-2. This record describes
          the rejected attempt and unchanged tally only.
        </p>
      </section>
      <section className="detail-columns detail-section">
        <div>
          <h2>What this demonstrates</h2>
          <p>
            The recorded credential test accepted an eligible holder and
            rejected a non-holder. The accepted vote updated proposal-3 to
            Approve 1, Reject 0, Total 1.
          </p>
          <p className="muted">
            This is a specific testnet execution, not an audit or a guarantee of
            all eligibility modes, credentials, or security properties.
            Transaction hashes and block references were not supplied. Current
            contract state is queried separately above.
          </p>
        </div>
        <details className="panel">
          <summary>Technical proof · deployment details</summary>
          <dl>
            <dt>Intelligent Contract RPC</dt>
            <dd className="mono wrap">{BRADBURY.rpc}</dd>
            <dt>EVM RPC</dt>
            <dd className="mono wrap">{BRADBURY.evmRpc}</dd>
            <dt>External chain ID</dt>
            <dd>4221</dd>
          </dl>
          <p className="small muted">
            Application trust is pinned to RPC and contract configuration.
            Wallet chain ID alone is not proof of Bradbury identity.
          </p>
        </details>
      </section>
    </main>
  );
}
