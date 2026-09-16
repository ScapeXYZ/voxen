import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, CheckCircle2, FileText, Fingerprint, Landmark, Network, ScanSearch, ShieldCheck, Vote } from "lucide-react";
import { LiveExplore } from "@/components/proposals/LiveExplore";
import { ACTIVE_NETWORK } from "@/lib/voxen/config";
import { LandingMotion } from "@/components/layout/LandingMotion";

const flow = [
  { icon: FileText, label: "Proposal", detail: "A clear question" },
  { icon: Fingerprint, label: "Eligibility", detail: "Who can take part" },
  { icon: Vote, label: "Vote", detail: "One wallet, one vote" },
  { icon: ScanSearch, label: "Consensus", detail: "Validators assess" },
  { icon: CheckCircle2, label: "Finalized", detail: "A traceable outcome" },
];

export default function Home() {
  return <main id="main" className="home">
    <LandingMotion />
    <section className="home-hero shell">
      <div className="hero-copy-block"><span className="eyebrow" data-landing-reveal><i className="live-dot" /> CIVIC INTELLIGENCE ON GENLAYER</span><h1 data-landing-reveal>Governance that can <em>explain itself.</em></h1><p data-landing-reveal>Voxen gives communities a clear path from proposal to verifiable decision—with participation rules, live voting, and consensus recorded onchain.</p><div className="hero-actions" data-landing-reveal><Link href="/explore" className="button primary">Explore proposals <ArrowUpRight size={17} /></Link><Link href="/create" className="button button-quiet">Create a proposal <ArrowRight size={17} /></Link></div></div>
      <section className="lifecycle-card" aria-labelledby="decision-lifecycle-heading">
        <header className="lifecycle-card-header">
          <h2 id="decision-lifecycle-heading">Decision lifecycle</h2>
          <span className="lifecycle-card-live"><i className="live-dot" /> Live system</span>
        </header>
        <ol className="lifecycle-card-list">
          {flow.map(({ icon: Icon, label, detail }, index) => (
            <li key={label} className={`lifecycle-card-item${index === 3 ? " flow-consensus" : ""}`}>
              <div className="lifecycle-card-stage">
                <span className="lifecycle-card-step">0{index + 1}</span>
                <span className="lifecycle-card-icon"><Icon size={18} aria-hidden="true" /></span>
                <strong>{label}</strong>
              </div>
              <small>{detail}</small>
            </li>
          ))}
        </ol>
        <footer className="lifecycle-card-footer"><Network size={15} aria-hidden="true" /><span>Every stage is explained and anchored onchain.</span></footer>
      </section>
    </section>
    <section className="network-strip" aria-label="Live Voxen network"><div className="shell"><span><i className="live-dot" /> Studio Next deployment</span><span>Eligibility checked at vote execution</span><span>Validator consensus before finality</span><Link href="/live-proof">Inspect live proof <ArrowUpRight size={15} /></Link></div></section>
    <section className="home-section shell" data-landing-reveal aria-labelledby="principles-heading"><div className="section-heading"><span className="eyebrow">01 / THE PRINCIPLES</span><div><h2 id="principles-heading">Governance is stronger when every step is visible.</h2></div><p>Voxen is built for people making decisions together—not for people who want to decipher a dashboard.</p></div><div className="principles-grid"><article className="surface-card"><Fingerprint size={23} /><span className="card-number">01</span><h3>Open participation</h3><p>PUBLIC voting is the default: any connected wallet can participate. Communities can add an eligibility rule when a decision needs one.</p></article><article className="surface-card"><ScanSearch size={23} /><span className="card-number">02</span><h3>Explainable review</h3><p>Governance Review compares a proposal against community rules, then gives people a clear outcome and supporting reason.</p></article><article className="surface-card"><ShieldCheck size={23} /><span className="card-number">03</span><h3>Verifiable outcomes</h3><p>Voting windows, eligibility, tallies, and finalized outcomes are enforced and recorded through the active network.</p></article></div></section>
    <section className="lifecycle-section" aria-labelledby="lifecycle-heading"><div className="shell lifecycle-layout"><div className="lifecycle-intro"><span className="eyebrow">02 / ONE DECISION, FIVE CLEAR STAGES</span><h2 id="lifecycle-heading">Less ambiguity. More shared context.</h2><p>Every decision moves through a visible sequence, from a clear proposal to a traceable outcome.</p><div className="lifecycle-status"><i className="live-dot" /> A decision, made legible</div><p className="lifecycle-note"><Network size={15} aria-hidden="true" /> Every stage has a human explanation and an onchain reference.</p></div><ol className="decision-lifecycle">{flow.map(({ icon: Icon, label, detail }, index) => <li key={label}><span>0{index + 1}</span><Icon size={20} aria-hidden="true" /><h3>{label}</h3><p>{detail}</p></li>)}</ol></div></section>
    <section className="home-section shell review-section reveal" aria-labelledby="review-heading"><div className="review-copy"><span className="eyebrow">03 / GOVERNANCE REVIEW</span><h2 id="review-heading">Independent review before a decision moves forward</h2><p>When a Community enables Governance Review, independent GenLayer validators assess a proposal against its rules and evidence. The result informs people; it does not replace their vote or break ties.</p><Link href="/communities" className="text-link">Learn about Communities <ArrowRight size={16} /></Link></div><div className="review-card proof-panel"><div><span className="eyebrow">REVIEW SIGNAL</span><span className="status-pill status-review">Needs review</span></div><h3>Rules and evidence are assessed together.</h3><dl><div><dt>Alignment</dt><dd>Community rules</dd></div><div><dt>Evidence</dt><dd>Supporting context</dd></div><div><dt>Outcome</dt><dd>Clear to participants</dd></div></dl><p><ShieldCheck size={15} /> Ties remain ties. No AI tie-breaking.</p></div></section>
    <section className="home-section shell eligibility-callout reveal" aria-labelledby="eligibility-heading"><div><span className="eyebrow">04 / PARTICIPATION RULES</span><h2 id="eligibility-heading">Clear participation rules for every vote</h2><p>Each proposal states who can participate before anyone casts a vote.</p></div><div className="eligibility-options"><article className="surface-card"><BadgeCheck size={22} /><span className="status-pill status-live">Default</span><h3>PUBLIC eligibility</h3><p>Anyone with a connected wallet can vote. The contract still checks timing and one vote per wallet.</p></article><article className="surface-card"><Landmark size={22} /><span className="status-pill status-review">Experimental</span><h3>POAP eligibility</h3><p>A connected credential can define participation. External verification availability is made explicit before submission.</p></article></div></section>
    <section className="proof-section-new" aria-labelledby="proof-heading"><div className="shell proof-section-grid"><div><span className="eyebrow">05 / LIVE PROOF</span><h2 id="proof-heading">Inspect the system behind every decision</h2><p>Voxen writes governance state to an Intelligent Contract on {ACTIVE_NETWORK.name}. Live proof connects the interface to the network facts behind it.</p><Link href="/live-proof" className="button button-light">View live proof <ArrowUpRight size={16} /></Link></div><div className="proof-panel proof-reference"><span className="eyebrow">ACTIVE DEPLOYMENT</span><dl><div><dt>Network</dt><dd>{ACTIVE_NETWORK.name}</dd></div><div><dt>Chain</dt><dd>{ACTIVE_NETWORK.chainId}</dd></div><div><dt>Contract</dt><dd><code>{ACTIVE_NETWORK.contract.slice(0, 10)}…{ACTIVE_NETWORK.contract.slice(-8)}</code></dd></div></dl><p><i className="live-dot" /> Connected governance state</p></div></div></section>
    <section className="home-section shell live-preview reveal" aria-labelledby="live-heading"><div className="section-heading section-heading-compact"><span className="eyebrow"><i className="live-dot" /> LIVE NETWORK</span><div><h2 id="live-heading">See governance in motion.</h2></div><Link href="/explore" className="text-link">View all proposals <ArrowRight size={16} /></Link></div><p className="live-preview-copy">Live proposal data from the active Studio Next deployment. Browse without connecting a wallet.</p><LiveExplore /></section>
    <section className="home-closing shell reveal"><span className="eyebrow">READY WHEN YOUR COMMUNITY IS</span><h2>Make your next decision transparent</h2><p>Create a proposal or explore how decisions move through Voxen.</p><div className="hero-actions"><Link href="/explore" className="button button-quiet">Explore proposals <ArrowRight size={16} /></Link><Link href="/create" className="button primary">Create a proposal <ArrowUpRight size={16} /></Link></div></section>
  </main>;
}
