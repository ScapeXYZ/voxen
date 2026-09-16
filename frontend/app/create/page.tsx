import { CreateProposalForm } from "@/components/proposals/CreateProposalForm";
import { voxenConfig } from "@/lib/voxen/config";
export default async function Create() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">FROM AN IDEA TO A SHARED DECISION</span>
      <h1>Create a proposal.</h1>
      <p className="page-subtitle">
        A proposal is a question for your community to decide by voting. Prepare
        a proposal in five steps, then submit it to {voxenConfig.networkName}.
      </p>
      <CreateProposalForm />
    </main>
  );
}
