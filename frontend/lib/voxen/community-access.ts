import type { CommunityAccess } from "@/types/voxen";
export type CommunityAccessState =
  | { status: "disconnected" | "checking" | "unavailable" | "denied" }
  | { status: "verified"; access: CommunityAccess };

// Presentation validation only. Every future protected read/write must independently
// authenticate the wallet and authorize membership/role at the contract or backend.
export function parseCommunityAccess(value: unknown, wallet: string, communityId: string): CommunityAccessState {
  const a = value as Partial<CommunityAccess> | null;
  if (!a || a.wallet?.toLowerCase() !== wallet.toLowerCase() || a.communityId !== communityId)
    return { status: "unavailable" };
  if (a.role === "NONE" && a.whitelisted === false) return { status: "denied" };
  if (a.whitelisted === true && ["OWNER", "ADMIN", "MEMBER"].includes(a.role || ""))
    return { status: "verified", access: a as CommunityAccess };
  return { status: "unavailable" };
}
