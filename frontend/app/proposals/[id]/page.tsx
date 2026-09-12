import { LiveProposalView } from "@/components/proposals/LiveProposalView";
export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LiveProposalView id={id} />;
}
