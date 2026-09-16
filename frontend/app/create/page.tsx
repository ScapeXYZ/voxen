import { CreateProposalForm } from "@/components/proposals/CreateProposalForm";
import { voxenConfig } from "@/lib/voxen/config";
export default async function Create() {
  return (
    <main id="main" className="shell create-page">
      <span className="eyebrow">Studio Next · Governance workspace</span>
      <h1>Create a proposal</h1>
      <p className="page-subtitle">
        Prepare a clear decision, set its participation rules, and publish it to the active governance contract.
      </p>
      <CreateProposalForm />
    </main>
  );
}
