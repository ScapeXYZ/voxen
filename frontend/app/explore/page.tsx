import { LiveExplore } from "@/components/proposals/LiveExplore";
export default function Explore() {
  return <main id="main" className="shell page">
    <span className="eyebrow">Live network · Bradbury</span>
    <h1>Explore proposals</h1>
    <p>Browse publicly without connecting a wallet or joining a Community. Each proposal sets its own voting eligibility.</p>
    <LiveExplore />
  </main>;
}
