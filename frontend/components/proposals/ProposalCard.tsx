import { sampleSpaces } from "@/lib/voxen/sample-data";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Proposal } from "@/types/voxen";
import {
  StatusBadge,
  EligibilityBadge,
  GovernanceGuardBadge,
} from "@/components/governance/Badges";
export function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  return (
    <Link href={`/proposals/${p.id}`} className="proposal-card">
      <div className="row">
        <StatusBadge status={p.status} />
        <ArrowUpRight size={17} />
      </div>
      <h3>{p.title}</h3>
      <p className="small">
        {sampleSpaces.find((s) => s.id === p.spaceId)?.name ||
          "Standalone proposal"}
      </p>
      <p>{p.description}</p>
      <div className="card-tags">
        <EligibilityBadge eligibility={p.eligibility} />
        <GovernanceGuardBadge review={p.guard} />
      </div>
      <div className="card-foot">
        <span>{p.participation} participants</span>
        <span>Sample proposal</span>
      </div>
    </Link>
  );
}
export function ProposalNode({ proposal }: { proposal: Proposal }) {
  return (
    <Link href={`/proposals/${proposal.id}`} className="proposal-node">
      <div className="row">
        <span className="eyebrow">
          {sampleSpaces.find((s) => s.id === proposal.spaceId)?.name ||
            "Standalone"}
        </span>
        <StatusBadge status={proposal.status} />
      </div>
      <h3>{proposal.title}</h3>
      <div className="proposal-node-metadata">
        <EligibilityBadge eligibility={proposal.eligibility} />
        <GovernanceGuardBadge review={proposal.guard} />
      </div>
      <div className="proposal-node-footer">
        <span>{proposal.participation} participants</span>
        <ArrowUpRight size={15} />
      </div>
    </Link>
  );
}
