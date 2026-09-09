import { notFound } from "next/navigation";
import { voxenData } from "@/lib/voxen/data";
import { ProposalDetails } from "@/components/proposals/ProposalDetails";
import { LiveProposalView } from "@/components/proposals/LiveProposalView";
export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (/^proposal-/.test(id)) return <LiveProposalView id={id} />;
  const p = await voxenData.getProposal(id);
  if (!p) notFound();
  const space = p.spaceId ? await voxenData.getSpace(p.spaceId) : undefined;
  return <ProposalDetails p={p} space={space} />;
}
