import Link from "next/link";
import type { Space } from "@/types/voxen";
import { ArrowUpRight } from "lucide-react";
export function SpaceNode({ space, count }: { space: Space; count: number }) {
  return (
    <Link
      href={`/spaces/${space.id}`}
      className={`space-node space-${space.id}`}
    >
      <span className="space-symbol">{space.symbol}</span>
      <div>
        <span className="eyebrow">{space.category}</span>
        <h3>{space.name}</h3>
        <span className="muted">{count} active proposals</span>
      </div>
      <ArrowUpRight size={18} />
    </Link>
  );
}
