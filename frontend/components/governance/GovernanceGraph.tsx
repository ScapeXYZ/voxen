"use client";

import { useState } from "react";
import {
  Network,
  FileText,
  Fingerprint,
  Shield,
  GitBranch,
  MousePointer2,
  Command,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SpatialCanvas, graphPosition } from "./SpatialCanvas";

const stages = [
  {
    name: "Space",
    headline: "A shared purpose.",
    detail:
      "Bring your people together and define the principles that guide your decisions.",
    short: "Community and governance rules",
    icon: Network,
    href: "/spaces",
    cta: "Discover Spaces",
    x: 40,
    y: 70,
    width: 240,
    height: 135,
  },
  {
    name: "Proposal",
    headline: "An idea becomes a decision.",
    detail:
      "Frame a clear question, choose 2–6 options, and set the voting window and policies.",
    short: "The question being decided",
    icon: FileText,
    href: "/create",
    cta: "Create a proposal",
    x: 375,
    y: 35,
    width: 240,
    height: 135,
  },
  {
    name: "Eligibility",
    headline: "The right people, verified.",
    detail:
      "Every vote requires GEN holding or an NFT / POAP credential. No public voting, token locking, or participation fee.",
    short: "Who is allowed to vote",
    icon: Fingerprint,
    href: "#participation",
    cta: "Understand eligibility",
    x: 750,
    y: 70,
    width: 255,
    height: 135,
  },
  {
    name: "Governance Guard",
    headline: "Your principles enter the process.",
    detail:
      "When enabled, Guard reviews a proposal against its Space constitution. The Space decides whether non-compliance blocks or warns.",
    short: "Checks proposals against Space rules",
    icon: Shield,
    href: "#governance-guard",
    cta: "Meet Governance Guard",
    x: 910,
    y: 335,
    width: 260,
    height: 135,
  },
  {
    name: "Validator Consensus",
    headline: "Independent perspectives. A shared review.",
    detail:
      "GenLayer validators assess compliance, risk, confidence, and evidence consistency. This review informs governance; it never breaks a tied vote.",
    short: "Independent consensus",
    icon: GitBranch,
    href: "#governance-guard",
    cta: "Explore validator review",
    x: 555,
    y: 420,
    width: 275,
    height: 135,
  },
  {
    name: "Vote",
    headline: "Every eligible voice counts equally.",
    detail:
      "One wallet equals one vote. A proposal declares whether a vote is final on cast or may change until close.",
    short: "Eligible wallets cast one vote",
    icon: MousePointer2,
    href: "/explore",
    cta: "Explore decisions",
    x: 210,
    y: 355,
    width: 230,
    height: 135,
  },
  {
    name: "Finalized Decision",
    headline: "A shared outcome. A traceable process.",
    detail:
      "After voting closes, the decision can be finalized. Results follow the proposal’s visibility policy, and tied results remain tied.",
    short: "Recorded outcome",
    icon: Command,
    href: "/live-proof",
    cta: "Read the Bradbury proof",
    x: 35,
    y: 610,
    width: 285,
    height: 135,
  },
];
const edges = [
  { d: "M280 135C325 135 330 102 375 102", x: 324, y: 103, label: "proposes" },
  { d: "M615 102C675 102 690 135 750 135", x: 681, y: 102, label: "requires" },
  {
    d: "M877 205C877 275 1040 265 1040 335",
    x: 993,
    y: 261,
    label: "optional review",
  },
  { d: "M910 400C870 400 885 487 830 487", x: 877, y: 446, label: "assesses" },
  { d: "M555 487C495 487 500 422 440 422", x: 497, y: 442, label: "informs" },
  { d: "M325 490C325 555 177 545 177 610", x: 263, y: 560, label: "finalizes" },
];
export function GovernanceGraph() {
  const [active, setActive] = useState<number | null>(null);
  const stage = active === null ? null : stages[active];
  function move(direction: number) {
    setActive((current) =>
      current === null
        ? 0
        : Math.min(stages.length - 1, Math.max(0, current + direction)),
    );
  }
  return (
    <section
      className="governance-story"
      aria-label="How Voxen connects a community to a decision"
    >
      <SpatialCanvas
        width={1210}
        height={785}
        label="THE GOVERNANCE FLOW"
        focus={stage}
        onOverview={() => setActive(null)}
        className={stage ? "story-canvas has-story-focus" : "story-canvas"}
        caption={
          <>
            <span className="legend-square" />
            Seven connected steps. One shared decision.
          </>
        }
      >
        <svg
          className="spatial-edges story-edges"
          viewBox="0 0 1210 785"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="governance-direction"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0 0L5 3L0 6" fill="none" stroke="currentColor" />
            </marker>
          </defs>
          {edges.map((edge, i) => (
            <g
              key={edge.label}
              className={
                active === i || active === i + 1 ? "edge-highlight" : ""
              }
            >
              <path d={edge.d} markerEnd="url(#governance-direction)" />
              <text x={edge.x} y={edge.y} textAnchor="middle">
                {edge.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="graph-field-note" aria-hidden="true">
          <span>THE VOXEN PROCESS</span>
          <strong>
            Shared intent.
            <br />
            Connected decisions.
          </strong>
          <p>Follow an idea through the network.</p>
        </div>
        <ol className="story-node-list">
          {stages.map((s, i) => (
            <li
              key={s.name}
              className={`story-node-wrap ${i === 6 ? "outcome-node" : ""} ${i === 3 || i === 4 ? "review-node" : ""} ${active === i ? "is-active" : active !== null && Math.abs(active - i) > 1 ? "is-distant" : ""}`}
              style={graphPosition(s)}
            >
              <button
                className="story-node"
                aria-pressed={active === i}
                aria-controls="governance-story-detail"
                title={s.detail}
                onClick={() => setActive(i)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible"))
                    setActive(i);
                }}
              >
                <span className="story-node-meta">
                  <span>
                    0{i + 1} /{" "}
                    {i === 6
                      ? "OUTCOME"
                      : i === 3 || i === 4
                        ? "REVIEW"
                        : "GOVERNANCE"}
                  </span>
                  <s.icon size={18} />
                </span>
                <span className="story-node-name">{s.name}</span>
                <span className="story-node-description">{s.short}</span>
                <span className="node-port" aria-hidden="true" />
              </button>
              <div className="story-mobile-detail">
                <p>{s.detail}</p>
                <Link href={s.href}>
                  {s.cta}
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </SpatialCanvas>
      <div id="governance-story-detail" className="story-detail">
        <div className="story-detail-copy" aria-live="polite">
          <span className="eyebrow">
            {stage
              ? `0${active! + 1} / ${stage.name.toUpperCase()}`
              : "READ THE NETWORK"}
          </span>
          <h3>{stage ? stage.headline : "Every connection has a purpose."}</h3>
          <p>
            {stage
              ? stage.detail
              : "Choose a node to follow the decision-making process, or take a guided journey from Space to finalized outcome."}
          </p>
        </div>
        <div className="story-detail-actions">
          {stage && (
            <Link href={stage.href} className="text-link">
              {stage.cta}
              <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="story-navigation">
            <button
              className="button"
              aria-label="Previous governance step"
              disabled={active === null || active === 0}
              onClick={() => move(-1)}
            >
              <ArrowLeft size={15} />
            </button>
            <span className="mono">
              {active === null ? "OVERVIEW" : `0${active + 1} / 07`}
            </span>
            <button
              className="button"
              aria-label={
                active === null
                  ? "Start governance journey"
                  : "Next governance step"
              }
              disabled={active === 6}
              onClick={() => move(1)}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
