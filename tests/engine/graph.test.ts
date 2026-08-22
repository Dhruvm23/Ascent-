import { describe, it, expect } from "vitest";
import {
  validateGraph,
  findCycle,
  topologicalSort,
  computeElevation,
  extractSubgraph,
} from "@/lib/engine/graph";
import type { ConceptNode } from "@/lib/engine/types";

const linear: ConceptNode[] = [
  { id: "a", name: "A", prerequisiteIds: [], difficultyTier: 1 },
  { id: "b", name: "B", prerequisiteIds: ["a"], difficultyTier: 2 },
  { id: "c", name: "C", prerequisiteIds: ["b"], difficultyTier: 3 },
];

const diamond: ConceptNode[] = [
  { id: "root", name: "Root", prerequisiteIds: [], difficultyTier: 1 },
  { id: "left", name: "Left", prerequisiteIds: ["root"], difficultyTier: 2 },
  { id: "right", name: "Right", prerequisiteIds: ["root"], difficultyTier: 2 },
  { id: "top", name: "Top", prerequisiteIds: ["left", "right"], difficultyTier: 3 },
];

describe("validateGraph", () => {
  it("accepts a valid DAG", () => {
    expect(validateGraph(linear).ok).toBe(true);
    expect(validateGraph(diamond).ok).toBe(true);
  });

  it("rejects unknown prerequisite ids", () => {
    const bad: ConceptNode[] = [
      { id: "a", name: "A", prerequisiteIds: ["ghost"], difficultyTier: 1 },
    ];
    const res = validateGraph(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/unknown prerequisite/i);
  });

  it("rejects duplicate ids", () => {
    const bad: ConceptNode[] = [
      { id: "a", name: "A", prerequisiteIds: [], difficultyTier: 1 },
      { id: "a", name: "A2", prerequisiteIds: [], difficultyTier: 1 },
    ];
    expect(validateGraph(bad).ok).toBe(false);
  });

  it("detects a cycle", () => {
    const cyclic: ConceptNode[] = [
      { id: "a", name: "A", prerequisiteIds: ["c"], difficultyTier: 1 },
      { id: "b", name: "B", prerequisiteIds: ["a"], difficultyTier: 1 },
      { id: "c", name: "C", prerequisiteIds: ["b"], difficultyTier: 1 },
    ];
    const res = validateGraph(cyclic);
    expect(res.ok).toBe(false);
    expect(findCycle(cyclic)).not.toBeNull();
  });

  it("flags a graph with no root", () => {
    const rootless: ConceptNode[] = [
      { id: "a", name: "A", prerequisiteIds: ["b"], difficultyTier: 1 },
      { id: "b", name: "B", prerequisiteIds: ["a"], difficultyTier: 1 },
    ];
    expect(validateGraph(rootless).ok).toBe(false);
  });
});

describe("topologicalSort", () => {
  it("orders prerequisites before dependents", () => {
    const order = topologicalSort(diamond).map((n) => n.id);
    expect(order.indexOf("root")).toBeLessThan(order.indexOf("left"));
    expect(order.indexOf("left")).toBeLessThan(order.indexOf("top"));
    expect(order.indexOf("right")).toBeLessThan(order.indexOf("top"));
  });

  it("throws on a cyclic graph", () => {
    const cyclic: ConceptNode[] = [
      { id: "a", name: "A", prerequisiteIds: ["b"], difficultyTier: 1 },
      { id: "b", name: "B", prerequisiteIds: ["a"], difficultyTier: 1 },
    ];
    expect(() => topologicalSort(cyclic)).toThrow();
  });
});

describe("computeElevation", () => {
  it("assigns roots to the valley and deeper concepts higher", () => {
    const elev = computeElevation(linear);
    expect(elev.get("a")).toBe(0);
    expect(elev.get("b")).toBe(1);
    expect(elev.get("c")).toBe(2);
  });

  it("uses the longest prerequisite chain for elevation", () => {
    const elev = computeElevation(diamond);
    expect(elev.get("root")).toBe(0);
    expect(elev.get("top")).toBe(2);
  });
});

describe("extractSubgraph", () => {
  it("includes the target plus all transitive prerequisites", () => {
    const sub = extractSubgraph(diamond, ["top"]);
    expect(sub).toEqual(new Set(["top", "left", "right", "root"]));
  });

  it("returns just the target and its chain for a leaf goal", () => {
    const sub = extractSubgraph(linear, ["b"]);
    expect(sub).toEqual(new Set(["b", "a"]));
    expect(sub.has("c")).toBe(false);
  });
});
