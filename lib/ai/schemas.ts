import { z } from "zod";

/**
 * Strict schemas for every structured agent output. LLM responses are parsed
 * through these before they're allowed anywhere near the database or engine —
 * a graph that doesn't validate is rejected and regenerated / fallen back on.
 */

export const choiceSchema = z.object({
  id: z.string().min(1).max(8),
  text: z.string().min(1).max(400),
});

export const conceptSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "concept id must be kebab-case a-z 0-9 -"),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  prerequisiteIds: z.array(z.string().max(60)).max(8).default([]),
  difficultyTier: z.coerce.number().int().min(1).max(5),
});

export const diagnosticItemSchema = z.object({
  conceptId: z.string().min(1).max(60),
  stem: z.string().min(1).max(600),
  choices: z.array(choiceSchema).min(2).max(5),
  answerId: z.string().min(1).max(8),
  difficulty: z.coerce.number().min(-3).max(3).default(0),
});

export const curriculumSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  concepts: z.array(conceptSchema).min(4).max(24),
  diagnostics: z.array(diagnosticItemSchema).min(3).max(24),
});

export type CurriculumOutput = z.infer<typeof curriculumSchema>;
export type ConceptOutput = z.infer<typeof conceptSchema>;
export type DiagnosticItemOutput = z.infer<typeof diagnosticItemSchema>;

export const quizItemsSchema = z.object({
  items: z
    .array(
      z.object({
        stem: z.string().min(1).max(600),
        choices: z.array(choiceSchema).min(2).max(5),
        answerId: z.string().min(1).max(8),
        explanation: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export type QuizItemsOutput = z.infer<typeof quizItemsSchema>;

export const gradingSchema = z.object({
  correctness: z.coerce.number().min(0).max(1),
  completeness: z.coerce.number().min(0).max(1),
  misconception: z.boolean().default(false),
  misconceptionNote: z.string().max(400).optional().default(""),
  feedback: z.string().min(1).max(800),
});

export type GradingOutput = z.infer<typeof gradingSchema>;
