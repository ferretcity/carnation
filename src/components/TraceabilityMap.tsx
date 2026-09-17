import { useMemo } from "react";
import { useHandbookStore } from "../store";
import type { Handbook, Page } from "../types";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH = 240;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 40;
const ROW_GAP = 14;
const LEFT_PADDING = 20;
const GAP_INSET = (COLUMN_WIDTH - NODE_WIDTH) / 2;
const LANE_TOP = 34;
const LANE_GAP = 10;

interface LaidOutNode {
  page: Page;
  sectionTitle: string;
  x: number;
  y: number;
}

interface LaidOutEdge {
  from: LaidOutNode;
  to: LaidOutNode;
  laneY: number;
}

function layout(handbook: Handbook) {
  const sections = handbook.sections.filter((s) => s.pages.length > 0);
  const nodeList: LaidOutNode[] = [];
  const byPageId = new Map<string, LaidOutNode>();
  let maxRows = 0;

  // Row/column positions are assigned first; edges (below) need every node's
  // final position, so this pass only builds the node list.
  const raw = sections.map((section, colIndex) => {
    maxRows = Math.max(maxRows, section.pages.length);
    return section.pages.map((p, rowIndex) => ({
      page: p,
      sectionTitle: section.title,
      colIndex,
      rowIndex,
    }));
  });

  const edgeSources = raw.flat().filter((n) => n.page.servesPageId);

  const gridTop = LANE_TOP + Math.max(edgeSources.length, 0) * LANE_GAP + 10;

  raw.flat().forEach(({ page, sectionTitle, colIndex, rowIndex }) => {
    const node: LaidOutNode = {
      page,
      sectionTitle,
      x: LEFT_PADDING + colIndex * COLUMN_WIDTH,
      y: gridTop + rowIndex * (NODE_HEIGHT + ROW_GAP),
    };
    nodeList.push(node);
    byPageId.set(page.id, node);
  });

  const width = LEFT_PADDING * 2 + sections.length * COLUMN_WIDTH - (COLUMN_WIDTH - NODE_WIDTH);
  const height = gridTop + maxRows * (NODE_HEIGHT + ROW_GAP) + 20;

  const edges: LaidOutEdge[] = nodeList
    .filter((n) => n.page.servesPageId && byPageId.has(n.page.servesPageId))
    .map((n, i) => ({ from: n, to: byPageId.get(n.page.servesPageId!)!, laneY: LANE_TOP + i * LANE_GAP }));

  return { nodes: nodeList, edges, width, height, sections };
}

/** An orthogonal path that routes through the empty gaps between columns and a
 * dedicated lane above every row, so it never passes behind another page's box. */
function edgePath({ from, to, laneY }: LaidOutEdge): string {
  const sourceOnRight = from.x > to.x;
  const srcX = sourceOnRight ? from.x : from.x + NODE_WIDTH;
  const srcGapX = sourceOnRight ? from.x - GAP_INSET : from.x + NODE_WIDTH + GAP_INSET;
  const tgtX = sourceOnRight ? to.x + NODE_WIDTH : to.x;
  const tgtGapX = sourceOnRight ? to.x + NODE_WIDTH + GAP_INSET : to.x - GAP_INSET;
  const srcY = from.y + NODE_HEIGHT / 2;
  const tgtY = to.y + NODE_HEIGHT / 2;

  return [
    `M ${srcX} ${srcY}`,
    `L ${srcGapX} ${srcY}`,
    `L ${srcGapX} ${laneY}`,
    `L ${tgtGapX} ${laneY}`,
    `L ${tgtGapX} ${tgtY}`,
    `L ${tgtX} ${tgtY}`,
  ].join(" ");
}

export function TraceabilityMap() {
  const handbook = useHandbookStore((s) => s.handbook);
  const selectedPageId = useHandbookStore((s) => s.selectedPageId);
  const selectPage = useHandbookStore((s) => s.selectPage);
  const setView = useHandbookStore((s) => s.setView);

  const { nodes, edges, width, height, sections } = useMemo(
    () => (handbook ? layout(handbook) : { nodes: [], edges: [], width: 0, height: 0, sections: [] }),
    [handbook],
  );

  if (!handbook) return null;

  function openInEditor(pageId: string) {
    selectPage(pageId);
    setView("editor");
  }

  return (
    <div className="flex-1 overflow-auto px-5 pb-5 pt-3">
      <p className="mb-3 text-xs text-muted-foreground">
        Lines trace each page back to the Mission/Beliefs page it exists to serve. Click
        any page to open it. Set a page's "Serves" field in the editor to add a line.
      </p>
      <div className="overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
          {sections.map((section, i) => (
            <text
              key={section.id}
              x={LEFT_PADDING + i * COLUMN_WIDTH + NODE_WIDTH / 2}
              y={16}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] uppercase tracking-wide"
            >
              {section.title}
            </text>
          ))}

          {edges.map((edge) => (
            <path
              key={`${edge.from.page.id}-${edge.to.page.id}`}
              d={edgePath(edge)}
              className="fill-none stroke-primary opacity-70"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ))}

          {nodes.map((n) => (
            <g
              key={n.page.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onClick={() => openInEditor(n.page.id)}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                className={cn(
                  "fill-card stroke-border",
                  (n.page.kind === "mission" || n.page.kind === "value") && "stroke-primary",
                  n.page.id === selectedPageId && "fill-accent stroke-primary",
                )}
                strokeWidth={n.page.id === selectedPageId ? 2 : 1}
              />
              <text x={12} y={NODE_HEIGHT / 2 + 5} className="fill-foreground text-xs">
                {n.page.title.length > 24 ? `${n.page.title.slice(0, 23)}…` : n.page.title}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
