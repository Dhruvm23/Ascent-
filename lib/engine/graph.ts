import type { ConceptNode } from "./types";

/**
 * Generic DAG utilities over a curriculum graph. No subject knowledge here —
 * just ids and prerequisite edges. Used to validate LLM-generated graphs,
 * lay them out by elevation, and extract the subgraph a goal requires.
 */

export interface GraphValidation {
  ok: boolean;
  errors: string[];
}

export function validateGraph(nodes: ConceptNode[]): GraphValidation {
  const errors: string[] = [];
  if (nodes.length === 0) errors.push("Graph has no concepts.");

  const ids = new Set<string>();
  for (const n of nodes) {
    if (!n.id) errors.push("A concept is missing an id.");
    if (ids.has(n.id)) errors.push(`Duplicate concept id: ${n.id}`);
    ids.add(n.id);
  }

  for (const n of nodes) {
    for (const p of n.prerequisiteIds) {
      if (p === n.id) errors.push(`Concept "${n.id}" lists itself as a prerequisite.`);
      if (!ids.has(p)) errors.push(`Concept "${n.id}" has unknown prerequisite "${p}".`);
    }
  }

  const cycle = findCycle(nodes);
  if (cycle) errors.push(`Prerequisite cycle detected: ${cycle.join(" -> ")}`);

  const roots = nodes.filter((n) => n.prerequisiteIds.length === 0);
  if (nodes.length > 0 && roots.length === 0) {
    errors.push("Graph has no root concept (every concept depends on another).");
  }

  return { ok: errors.length === 0, errors };
}

/** Returns a cycle path if one exists, else null. */
export function findCycle(nodes: ConceptNode[]): string[] | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const state = new Map<string, 0 | 1 | 2>(); // 0=unseen 1=in-stack 2=done
  const stack: string[] = [];

  function dfs(id: string): string[] | null {
    state.set(id, 1);
    stack.push(id);
    const node = byId.get(id);
    for (const p of node?.prerequisiteIds ?? []) {
      if (!byId.has(p)) continue;
      const s = state.get(p) ?? 0;
      if (s === 1) {
        const idx = stack.indexOf(p);
        return [...stack.slice(idx), p];
      }
      if (s === 0) {
        const found = dfs(p);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  }

  for (const n of nodes) {
    if ((state.get(n.id) ?? 0) === 0) {
      const found = dfs(n.id);
      if (found) return found;
    }
  }
  return null;
}

/** Kahn topological sort. Throws if the graph contains a cycle. */
export function topologicalSort(nodes: ConceptNode[]): ConceptNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const n of nodes) indegree.set(n.id, 0);
  for (const n of nodes) {
    for (const p of n.prerequisiteIds) {
      if (!byId.has(p)) continue;
      indegree.set(n.id, (indegree.get(n.id) ?? 0) + 1);
      dependents.set(p, [...(dependents.get(p) ?? []), n.id]);
    }
  }

  // Stable order: seed the queue by difficulty then name for determinism.
  const queue = nodes
    .filter((n) => (indegree.get(n.id) ?? 0) === 0)
    .sort(sortByTierThenName)
    .map((n) => n.id);

  const out: ConceptNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(byId.get(id)!);
    const next: string[] = [];
    for (const d of dependents.get(id) ?? []) {
      indegree.set(d, (indegree.get(d) ?? 0) - 1);
      if ((indegree.get(d) ?? 0) === 0) next.push(d);
    }
    next.sort((a, b) => sortByTierThenName(byId.get(a)!, byId.get(b)!));
    queue.push(...next);
  }

  if (out.length !== nodes.length) {
    throw new Error("Cannot topologically sort a cyclic graph.");
  }
  return out;
}

/**
 * Elevation = longest prerequisite chain length ending at a node. Roots sit in
 * the valley (0); deeper concepts sit higher up the climb. Drives the map layout.
 */
export function computeElevation(nodes: ConceptNode[]): Map<string, number> {
  const ordered = topologicalSort(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  for (const n of ordered) {
    const prereqDepths = n.prerequisiteIds
      .filter((p) => byId.has(p))
      .map((p) => depth.get(p) ?? 0);
    depth.set(n.id, prereqDepths.length ? Math.max(...prereqDepths) + 1 : 0);
  }
  return depth;
}

/**
 * All concepts required to reach the targets: the targets plus the transitive
 * closure of their prerequisites. This is the "route to the summit" for a goal.
 */
export function extractSubgraph(nodes: ConceptNode[], targetIds: string[]): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const required = new Set<string>();
  const stack = [...targetIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (required.has(id) || !byId.has(id)) continue;
    required.add(id);
    for (const p of byId.get(id)!.prerequisiteIds) stack.push(p);
  }
  return required;
}

function sortByTierThenName(a: ConceptNode, b: ConceptNode): number {
  if (a.difficultyTier !== b.difficultyTier) return a.difficultyTier - b.difficultyTier;
  return a.name.localeCompare(b.name);
}
