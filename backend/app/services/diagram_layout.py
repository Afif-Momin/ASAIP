from __future__ import annotations

from ..schemas import Diagram, DiagramNode, Position
from .diagram_vocab import TIER_ORDER, normalize_diagram

# Shared geometry (mirrored in frontend/src/lib/diagram.ts) so every renderer agrees.
NODE_W = 220
NODE_H = 88
COLUMN_PITCH = 350
ROW_SLOT = 128


def layout_diagram(diagram: Diagram) -> Diagram:
    """Assign clean left-to-right tier columns with barycenter ordering to reduce crossings."""
    by_tier: dict[str, list[DiagramNode]] = {tier: [] for tier in TIER_ORDER}
    for node in diagram.nodes:
        by_tier.setdefault(node.tier or "application", []).append(node)
    tiers = [tier for tier in TIER_ORDER if by_tier.get(tier)]
    # Include any unexpected tier names at the end so nothing is dropped.
    tiers += [tier for tier in by_tier if tier not in TIER_ORDER and by_tier[tier]]

    neighbors: dict[str, list[str]] = {node.id: [] for node in diagram.nodes}
    for edge in diagram.edges:
        neighbors.setdefault(edge.source, []).append(edge.target)
        neighbors.setdefault(edge.target, []).append(edge.source)

    placed_index: dict[str, float] = {}
    max_rows = max((len(by_tier[tier]) for tier in tiers), default=1)
    for col, tier in enumerate(tiers):
        nodes = by_tier[tier]
        def barycenter(node: DiagramNode) -> float:
            vals = [placed_index[n] for n in neighbors.get(node.id, []) if n in placed_index]
            return sum(vals) / len(vals) if vals else float(len(placed_index)) + len(nodes)
        ordered = sorted(nodes, key=lambda node: (barycenter(node), node.label.lower()))
        start = (max_rows - len(ordered)) / 2 * ROW_SLOT
        for row, node in enumerate(ordered):
            node.position = Position(x=col * COLUMN_PITCH, y=start + row * ROW_SLOT)
            placed_index[node.id] = row
    return diagram


def finalize_diagram(diagram: Diagram) -> Diagram:
    return layout_diagram(normalize_diagram(diagram))