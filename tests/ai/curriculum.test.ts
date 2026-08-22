import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/log", () => ({ logAgentCall: vi.fn() }));

import { parseAndValidateCurriculum } from "@/lib/ai/agents/curriculum-architect";
import { CurriculumInvalidError } from "@/lib/ai/agents/curriculum-architect";

const valid = {
  title: "Test Course",
  summary: "A small valid course.",
  concepts: [
    { id: "a", name: "A", description: "First.", prerequisiteIds: [], difficultyTier: 1 },
    { id: "b", name: "B", description: "Second.", prerequisiteIds: ["a"], difficultyTier: 2 },
    { id: "c", name: "C", description: "Third.", prerequisiteIds: ["b"], difficultyTier: 3 },
    { id: "d", name: "D", description: "Fourth.", prerequisiteIds: ["c"], difficultyTier: 3 },
  ],
  diagnostics: [
    { conceptId: "a", stem: "Q1", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "x", difficulty: -1 },
    { conceptId: "b", stem: "Q2", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "y", difficulty: 0 },
    { conceptId: "c", stem: "Q3", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "x", difficulty: 1 },
  ],
};

describe("parseAndValidateCurriculum", () => {
  it("accepts a valid curriculum graph", () => {
    const out = parseAndValidateCurriculum(JSON.stringify(valid));
    expect(out.concepts).toHaveLength(4);
    expect(out.diagnostics.length).toBeGreaterThanOrEqual(3);
  });

  it("parses JSON even when wrapped in markdown fences and prose", () => {
    const wrapped = "Sure! Here is the course:\n```json\n" + JSON.stringify(valid) + "\n```\nEnjoy.";
    const out = parseAndValidateCurriculum(wrapped);
    expect(out.title).toBe("Test Course");
  });

  it("rejects a graph containing a prerequisite cycle", () => {
    const cyclic = {
      ...valid,
      concepts: [
        { id: "a", name: "A", description: "x", prerequisiteIds: ["c"], difficultyTier: 1 },
        { id: "b", name: "B", description: "x", prerequisiteIds: ["a"], difficultyTier: 2 },
        { id: "c", name: "C", description: "x", prerequisiteIds: ["b"], difficultyTier: 3 },
        { id: "d", name: "D", description: "x", prerequisiteIds: [], difficultyTier: 1 },
      ],
    };
    expect(() => parseAndValidateCurriculum(JSON.stringify(cyclic))).toThrow(CurriculumInvalidError);
  });

  it("drops diagnostics that reference unknown concepts and fails if too few remain", () => {
    // 3 items satisfy the schema, but all reference a non-existent concept, so
    // after dropping the invalid ones fewer than 3 remain -> engine rejects it.
    const badDiag = {
      ...valid,
      diagnostics: [
        { conceptId: "ghost", stem: "Q1", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "x", difficulty: 0 },
        { conceptId: "ghost", stem: "Q2", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "x", difficulty: 0 },
        { conceptId: "ghost", stem: "Q3", choices: [{ id: "x", text: "1" }, { id: "y", text: "2" }], answerId: "x", difficulty: 0 },
      ],
    };
    expect(() => parseAndValidateCurriculum(JSON.stringify(badDiag))).toThrow(CurriculumInvalidError);
  });

  it("rejects schema-invalid payloads (too few concepts)", () => {
    const tiny = { ...valid, concepts: valid.concepts.slice(0, 1) };
    expect(() => parseAndValidateCurriculum(JSON.stringify(tiny))).toThrow();
  });
});
