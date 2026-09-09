"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Network, List, Search, ArrowUpRight } from "lucide-react";
import type { Community, Proposal } from "@/types/voxen";
import {
  ProposalNode,
  ProposalCard,
} from "@/components/proposals/ProposalCard";
import { SpaceNode } from "@/components/spaces/SpaceNode";
import { SpatialCanvas, graphPosition, type GraphPoint } from "./SpatialCanvas";

type Group = {
  id: string;
  space?: Community;
  proposals: Proposal[];
  point: GraphPoint;
  nodes: { proposal: Proposal; point: GraphPoint }[];
};
const hub: GraphPoint = { x: 555, y: 340, width: 270, height: 120 };
/** Stable sample cluster coordinates; extra Communities receive connected rows below the overview. */
function layoutGroups(spaces: Community[], proposals: Proposal[]): Group[] {
  const definitions: { space?: Community; id: string; proposals: Proposal[] }[] =
    spaces.map((space) => ({
      space,
      id: space.id,
      proposals: proposals.filter((p) => p.spaceId === space.id),
    }));
  const standalone = proposals.filter(
    (p) => !spaces.some((s) => s.id === p.spaceId),
  );
  if (standalone.length)
    definitions.push({ id: "standalone", proposals: standalone });
  return definitions.map((group, index) => {
    const positions = [
      { x: 65, y: 90 },
      { x: 1055, y: 100 },
      { x: 415, y: 645 },
    ];
    const base = positions[index] || { x: 65, y: 930 + (index - 3) * 290 };
    const point = { ...base, width: 270, height: 115 };
    const nodes = group.proposals.map((proposal, child) => {
      let position;
      if (index === 0 && child === 0) position = { x: 55, y: 330 };
      else if (index === 0 && child === 1) position = { x: 420, y: 45 };
      else if (index === 1 && child === 0) position = { x: 1030, y: 350 };
      else if (index === 2 && child === 0) position = { x: 870, y: 630 };
      else
        position = {
          x: 390 + (child % 2) * 350,
          y: 940 + index * 530 + Math.floor(child / 2) * 240,
        };
      return { proposal, point: { ...position, width: 310, height: 190 } };
    });
    return { ...group, point, nodes };
  });
}
function connection(a: GraphPoint, b: GraphPoint) {
  const ax = a.x + a.width / 2,
    ay = a.y + a.height / 2,
    bx = b.x + b.width / 2,
    by = b.y + b.height / 2;
  // End at node borders; connectors never run through node text.
  if (Math.abs(bx - ax) > Math.abs(by - ay)) {
    const start = ax + (Math.sign(bx - ax) * a.width) / 2,
      end = bx - (Math.sign(bx - ax) * b.width) / 2;
    return `M${start} ${ay} C${(start + end) / 2} ${ay} ${(start + end) / 2} ${by} ${end} ${by}`;
  }
  const start = ay + (Math.sign(by - ay) * a.height) / 2,
    end = by - (Math.sign(by - ay) * b.height) / 2;
  return `M${ax} ${start} C${ax} ${(start + end) / 2} ${bx} ${(start + end) / 2} ${bx} ${end}`;
}
export function ExploreNetwork({
  spaces,
  proposals,
}: {
  spaces: Community[];
  proposals: Proposal[];
}) {
  const [view, setView] = useState<"network" | "list">("network");
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [focus, setFocus] = useState<GraphPoint | null>(null);
  const allGroups = useMemo(
    () => layoutGroups(spaces, proposals),
    [spaces, proposals],
  );
  const groups = allGroups
    .map((group) => {
      const spaceMatches = group.space?.name
        .toLowerCase()
        .includes(query.toLowerCase());
      return {
        ...group,
        nodes: group.nodes.filter(
          ({ proposal }) =>
            spaceMatches ||
            proposal.title.toLowerCase().includes(query.toLowerCase()),
        ),
      };
    })
    .filter(
      (group) =>
        group.nodes.length ||
        !query ||
        group.space?.name.toLowerCase().includes(query.toLowerCase()),
    );
  const filtered = groups.flatMap((group) =>
    group.nodes.map((n) => n.proposal),
  );
  const worldHeight = Math.max(
    855,
    ...allGroups.flatMap((g) => [
      g.point.y + g.point.height + 40,
      ...g.nodes.map((n) => n.point.y + n.point.height + 40),
    ]),
  );
  function reset() {
    setFocus(null);
    setActiveGroup(null);
  }
  function focusGroup(group: Group) {
    setActiveGroup(group.id);
    const points = [group.point, ...group.nodes.map((n) => n.point)];
    const x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y));
    setFocus({
      x,
      y,
      width: Math.max(...points.map((p) => p.x + p.width)) - x,
      height: Math.max(...points.map((p) => p.y + p.height)) - y,
    });
  }
  return (
    <>
      <div className="explore-toolbar">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search proposals and Communities"
            placeholder="Search Communities or proposals"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              reset();
            }}
          />
        </label>
        <div className="segmented">
          {(
            [
              { name: "network", icon: Network },
              { name: "list", icon: List },
            ] as const
          ).map(({ name, icon: Icon }) => (
            <button
              key={
                name === "network"
                  ? "Network · connections"
                  : "List · browse proposals"
              }
              aria-pressed={view === name}
              className={view === name ? "selected" : ""}
              onClick={() => {
                setView(name);
                reset();
              }}
            >
              <Icon size={15} />
              {name === "network"
                ? "Network · connections"
                : "List · browse proposals"}
            </button>
          ))}
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="empty" role="status">
          No decisions found. Try another search.
        </div>
      ) : view === "network" ? (
        <>
          <div
            className="atlas-navigation"
            aria-label="Focus a Community in the network"
          >
            <button aria-pressed={activeGroup === null} onClick={reset}>
              All connections
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                aria-pressed={activeGroup === group.id}
                onClick={() => focusGroup(group)}
              >
                <span className="dot" />
                {group.space?.name || "Public proposals"}
              </button>
            ))}
            <span>{filtered.length} sample proposals</span>
          </div>
          <SpatialCanvas
            width={1400}
            height={worldHeight}
            label="VOXEN / GOVERNANCE NETWORK"
            className="atlas-canvas"
            focus={focus}
            onOverview={reset}
            caption={
              <>
                <span className="atlas-space-key" />
                Community
                <span className="atlas-proposal-key" />
                Proposal
                <span className="atlas-line-key" />
                Belongs to
              </>
            }
          >
            <svg
              className="spatial-edges atlas-edges"
              viewBox={`0 0 1400 ${worldHeight}`}
              aria-hidden="true"
            >
              {groups.map((group) => (
                <g
                  key={group.id}
                  className={
                    activeGroup === group.id
                      ? "edge-highlight"
                      : activeGroup
                        ? "edge-muted"
                        : ""
                  }
                >
                  <path
                    className="network-membership-edge"
                    d={connection(hub, group.point)}
                  />
                  {group.nodes.map((node) => (
                    <path
                      key={node.proposal.id}
                      d={connection(group.point, node.point)}
                    />
                  ))}
                </g>
              ))}
            </svg>
            <div className="atlas-hub" style={graphPosition(hub)}>
              <span className="eyebrow">THE SHARED NETWORK</span>
              <strong>
                Independent Communities.
                <br />
                Connected decisions.
              </strong>
              <Link href="/create-community">
                Create your Community
                <ArrowUpRight size={13} />
              </Link>
            </div>
            {groups.map((group) => (
              <section
                key={group.id}
                className={`atlas-group ${activeGroup && activeGroup !== group.id ? "is-distant" : ""}`}
                aria-label={`${group.space?.name || "Public proposal"} proposal connections`}
              >
                <div
                  className="atlas-space"
                  style={graphPosition(group.point)}
                  onFocus={(event) => {
                    if (event.target.matches(":focus-visible")) {
                      setActiveGroup(group.id);
                      setFocus(group.point);
                    }
                  }}
                >
                  {group.space ? (
                    <SpaceNode
                      space={group.space}
                      count={
                        proposals.filter(
                          (p) => p.spaceId === group.id && p.status === "OPEN",
                        ).length
                      }
                    />
                  ) : (
                    <div className="space-node">
                      <Network size={24} />
                      <h3>Public proposals</h3>
                    </div>
                  )}
                </div>
                <div className="atlas-proposals">
                  {group.nodes.length ? (
                    group.nodes.map(({ proposal, point }) => (
                      <div
                        key={proposal.id}
                        className="atlas-proposal"
                        style={graphPosition(point)}
                        onFocus={(event) => {
                          if (event.target.matches(":focus-visible")) {
                            setActiveGroup(group.id);
                            setFocus(point);
                          }
                        }}
                      >
                        <ProposalNode proposal={proposal} />
                      </div>
                    ))
                  ) : (
                    <p
                      className="atlas-empty"
                      style={graphPosition({
                        ...group.point,
                        y: group.point.y + 150,
                      })}
                    >
                      No matching proposals in this Community.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </SpatialCanvas>
          <div className="atlas-afterword">
            <span>Every branch begins with a community.</span>
            <p>
              Choose a Community or proposal to open its details. Participation and
              review state shown here are illustrative.
            </p>
          </div>
        </>
      ) : (
        <div className="proposal-grid">
          {filtered.length ? (
            filtered.map((p) => <ProposalCard key={p.id} proposal={p} />)
          ) : (
            <div className="empty">No proposals in the matching Communities.</div>
          )}
        </div>
      )}
    </>
  );
}
