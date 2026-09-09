import { CreateProposalForm } from "@/components/proposals/CreateProposalForm";
export default async function Create() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">FROM AN IDEA TO A SHARED DECISION</span>
      <h1>Create a proposal.</h1>
      <p className="page-subtitle">
        A proposal is a question for your community to decide by voting. Prepare
        a draft in six steps, then create a public proposal on Bradbury.
      </p>
      <CreateProposalForm />
    </main>
  );
}
