import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { SEED_SUBJECTS } from "../lib/seed-data/subjects";
import { ensureCourse } from "../lib/courses";
import { curriculumToNodes } from "../lib/ai/agents/curriculum-architect";
import { validateGraph } from "../lib/engine/graph";
import { initialSm2, sm2Update } from "../lib/engine/sm2";

/**
 * Seed script.
 *  - Validates + caches all three curated curricula (music, biology, history).
 *  - Seeds two documented test accounts: a fresh learner and a mid-journey
 *    "climber" whose music-theory graph is already partly ascended (so judges
 *    can see a populated Cognitive Fingerprint without redoing onboarding).
 *
 * Test credentials (also in the README):
 *    learner@test.dev  / climbing123   (fresh)
 *    climber@test.dev  / summit123     (mid-journey, Music Theory)
 */

const NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Clearing existing data...");
  await prisma.agentLog.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.masteryState.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizItem.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.course.deleteMany();
  await prisma.curriculumCache.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding curricula (validated before caching)...");
  const courseBySubject = new Map<string, string>();
  for (const s of SEED_SUBJECTS) {
    const validation = validateGraph(curriculumToNodes(s.curriculum));
    if (!validation.ok) {
      throw new Error(`Seed subject "${s.subject}" is invalid: ${validation.errors.join("; ")}`);
    }
    const { id } = await ensureCourse({
      subject: s.subject,
      curriculum: s.curriculum,
      isCached: true,
    });
    courseBySubject.set(s.subject, id);
    console.log(`  ✓ ${s.subject} (${s.curriculum.concepts.length} concepts)`);
  }

  console.log("Seeding test accounts...");
  await prisma.user.create({
    data: {
      email: "learner@test.dev",
      name: "Alex Rivera",
      passwordHash: await bcrypt.hash("climbing123", 10),
      presentationMode: "focus",
      interests: ["Basketball", "Cooking"],
    },
  });

  const climber = await prisma.user.create({
    data: {
      email: "climber@test.dev",
      name: "Sam Okafor",
      passwordHash: await bcrypt.hash("summit123", 10),
      presentationMode: "mastery",
      interests: ["Space", "Investing"],
    },
  });

  // Mid-journey enrolment for the climber in Music Theory.
  const music = SEED_SUBJECTS[0];
  const musicCourseId = courseBySubject.get(music.subject)!;
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: climber.id,
      courseId: musicCourseId,
      goalText: music.goalText,
      goalConceptIds: music.goalConceptIds,
      targetWeeks: 6,
      diagnosticDone: true,
      startedAt: daysAgo(12),
    },
  });

  const concepts = await prisma.concept.findMany({
    where: { courseId: musicCourseId },
    orderBy: { elevation: "asc" },
  });

  // Craft a believable ascent: valley concepts mastered, mid-slope in progress,
  // one misconception flagged, summit concepts untouched.
  let index = 0;
  for (const concept of concepts) {
    let pKnown = 0.2;
    let misconception = false;
    let sm2 = initialSm2(daysAgo(10));
    let interactions: { correct: boolean; conf: number; latency: number }[] = [];

    if (index === 0) {
      // Mastered, and now DUE for review (shows the spaced-repetition prompt).
      pKnown = 0.92;
      sm2 = sm2Update(sm2Update(initialSm2(daysAgo(9)), 5, daysAgo(9)), 4, daysAgo(8));
      sm2 = { ...sm2, dueAt: daysAgo(1).toISOString() };
      interactions = [
        { correct: true, conf: 0.8, latency: 5200 },
        { correct: true, conf: 0.9, latency: 4300 },
      ];
    } else if (index <= 2) {
      pKnown = 0.88;
      sm2 = sm2Update(initialSm2(daysAgo(6)), 5, daysAgo(6));
      interactions = [{ correct: true, conf: 0.7, latency: 6000 }];
    } else if (index === 3) {
      pKnown = 0.54; // in progress
      interactions = [
        { correct: false, conf: 0.4, latency: 14000 },
        { correct: true, conf: 0.5, latency: 9000 },
      ];
    } else if (index === 4) {
      // A flagged misconception: confidently wrong.
      pKnown = 0.41;
      misconception = true;
      interactions = [{ correct: false, conf: 0.85, latency: 2600 }];
    }

    const state = await prisma.masteryState.create({
      data: {
        enrollmentId: enrollment.id,
        conceptId: concept.id,
        pKnown,
        easeFactor: sm2.easeFactor,
        intervalDays: sm2.intervalDays,
        repetitions: sm2.repetitions,
        dueAt: new Date(sm2.dueAt),
        lastReviewedAt: new Date(sm2.lastReviewedAt),
        misconception,
      },
    });
    void state;

    for (const it of interactions) {
      await prisma.interaction.create({
        data: {
          enrollmentId: enrollment.id,
          conceptId: concept.externalId,
          type: "quiz",
          correct: it.correct,
          latencyMs: it.latency,
          confidence: it.conf,
          answerChanges: it.correct ? 0 : 1,
          attempts: 1,
          createdAt: daysAgo(8 - Math.min(index, 6)),
        },
      });
    }
    index++;
  }

  // A couple of sample agent-log rows so /dev/logs isn't empty on first load.
  await prisma.agentLog.createMany({
    data: [
      {
        userId: climber.id,
        agent: "curriculum-architect",
        taskType: "curriculum",
        modelRequested: "deepseek/deepseek-chat-v3-0324:free",
        modelServed: "deepseek/deepseek-chat-v3-0324:free",
        attempts: 1,
        latencyMs: 4200,
        promptTokens: 520,
        completionTokens: 900,
        cached: false,
        status: "ok",
        createdAt: daysAgo(12),
      },
      {
        userId: climber.id,
        agent: "tutor",
        taskType: "explanation",
        modelRequested: "deepseek/deepseek-chat-v3-0324:free",
        modelServed: "meta-llama/llama-3.3-70b-instruct:free",
        attempts: 2,
        latencyMs: 3100,
        promptTokens: 240,
        completionTokens: 380,
        cached: false,
        status: "fallback",
        createdAt: daysAgo(11),
      },
    ],
  });

  console.log("\nSeed complete.");
  console.log("  learner@test.dev / climbing123   (fresh)");
  console.log("  climber@test.dev / summit123     (mid-journey, Music Theory)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
