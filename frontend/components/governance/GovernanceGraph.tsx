"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BrainCircuit, ClipboardPenLine, Trophy, Vote } from "lucide-react";

const nodes = [
  { title: "Create proposal", description: "Define the decision, choices and voting period.", href: "/create", icon: ClipboardPenLine },
  { title: "Check eligibility", description: "Verify who is allowed to participate.", href: "/explore", icon: BadgeCheck },
  { title: "AI governance review", description: "Validator consensus reviews the proposal against governance rules.", href: "/communities", icon: BrainCircuit },
  { title: "Community votes", description: "Eligible wallets cast one vote each.", href: "/explore", icon: Vote },
  { title: "Final result", description: "The outcome is finalized and recorded onchain.", href: "/live-proof", icon: Trophy },
] as const;

export function GovernanceGraph() {
  const [active, setActive] = useState(0);
  const detailRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectNode = (index: number) => {
    setActive(index);
    window.setTimeout(() => detailRef.current?.focus({ preventScroll: false }), 0);
  };
  const moveFocus = (index: number) => {
    setActive(index);
    window.setTimeout(() => buttonRefs.current[index]?.focus({ preventScroll: true }), 0);
  };
  const node = nodes[active];
  return <section className="governance-graph" aria-label="Voxen governance flow">
    <div className="governance-graph-heading"><span className="eyebrow">THE GOVERNANCE FLOW</span><p>Follow an idea from a clear proposal to a shared result.</p></div>
    <ol className="governance-nodes">{nodes.map((item, index) => {
      const Icon = item.icon;
      return <li key={item.title} className={`governance-node node-${index + 1}`}>
      <button
        ref={(element) => { buttonRefs.current[index] = element; }}
        type="button"
        className={active === index ? "is-active" : ""}
        onClick={() => selectNode(index)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); moveFocus((index + 1) % nodes.length); }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); moveFocus((index + nodes.length - 1) % nodes.length); }
          if (event.key === "Home") { event.preventDefault(); moveFocus(0); }
          if (event.key === "End") { event.preventDefault(); moveFocus(nodes.length - 1); }
        }}
        aria-pressed={active === index}
        aria-controls="governance-flow-detail"
      >
          <span className="governance-node-top"><span>0{index + 1}</span><Icon size={18} aria-hidden="true" /></span>
          <strong>{item.title}</strong><span>{item.description}</span>
        </button>
        {index < nodes.length - 1 && <i className="governance-connector" aria-hidden="true"><ArrowRight size={15} /></i>}
      </li>;
    })}</ol>
    <article id="governance-flow-detail" className="governance-flow-detail" ref={detailRef} tabIndex={-1} aria-live="polite">
      <div><span className="eyebrow">0{active + 1} / IN FOCUS</span><h2>{node.title}</h2><p>{node.description}</p></div>
      <div className="governance-detail-actions"><div><button type="button" onClick={() => selectNode((active + nodes.length - 1) % nodes.length)} aria-label="Previous governance stage"><ArrowLeft size={16} /></button><button type="button" onClick={() => selectNode((active + 1) % nodes.length)} aria-label="Next governance stage"><ArrowRight size={16} /></button></div><Link href={node.href} className="text-link">Explore this stage <ArrowRight size={15} /></Link></div>
    </article>
  </section>;
}
