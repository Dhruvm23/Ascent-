import type { CurriculumOutput } from "@/lib/ai/schemas";

/**
 * Curated, hand-authored curricula for the three pre-seeded demo subjects.
 * These are the guaranteed-working safety net: the live "type any subject"
 * flow uses the Curriculum Architect Agent, but these caches ensure a fast,
 * reliable demo across three deliberately different domains (music, biology,
 * history) — the clearest proof the engine is genuinely subject-agnostic.
 *
 * Each graph is a valid DAG (validated in the seed/offline scripts before it's
 * committed to the cache).
 */

export interface SeedSubject {
  subject: string;
  goalText: string;
  /** External concept ids that make up the goal route ("summit"). */
  goalConceptIds: string[];
  curriculum: CurriculumOutput;
}

const musicTheory: SeedSubject = {
  subject: "Music Theory Fundamentals",
  goalText: "Learn enough theory to start writing my own songs in 6 weeks.",
  goalConceptIds: ["chord-progressions", "melody-writing"],
  curriculum: {
    title: "Music Theory Fundamentals",
    summary:
      "From individual pitches up to writing your own chord progressions and melodies — the core theory a songwriter actually uses.",
    concepts: [
      {
        id: "pitch-notes",
        name: "Pitch & Notes",
        description:
          "Musical sound is organised into named pitches (A–G) that repeat every octave.",
        prerequisiteIds: [],
        difficultyTier: 1,
      },
      {
        id: "rhythm-basics",
        name: "Rhythm Basics",
        description:
          "Notes have durations, and beats group into measures that give music its pulse.",
        prerequisiteIds: [],
        difficultyTier: 1,
      },
      {
        id: "intervals",
        name: "Intervals",
        description:
          "An interval is the distance in pitch between two notes, the building block of melody and harmony.",
        prerequisiteIds: ["pitch-notes"],
        difficultyTier: 2,
      },
      {
        id: "scales",
        name: "Scales",
        description:
          "A scale is an ordered set of intervals from a starting note, defining a key's palette of pitches.",
        prerequisiteIds: ["intervals"],
        difficultyTier: 2,
      },
      {
        id: "key-signatures",
        name: "Key Signatures",
        description:
          "Key signatures encode which notes are sharp or flat, telling you the scale a piece is built on.",
        prerequisiteIds: ["scales"],
        difficultyTier: 3,
      },
      {
        id: "chords",
        name: "Chords",
        description:
          "Chords stack intervals (usually thirds) to sound multiple notes together as harmony.",
        prerequisiteIds: ["intervals", "scales"],
        difficultyTier: 3,
      },
      {
        id: "chord-progressions",
        name: "Chord Progressions",
        description:
          "Progressions arrange chords in sequences that create tension and resolution within a key.",
        prerequisiteIds: ["chords", "key-signatures"],
        difficultyTier: 4,
      },
      {
        id: "melody-writing",
        name: "Melody Writing",
        description:
          "Melodies combine scale pitches and rhythm into a memorable line that fits the harmony.",
        prerequisiteIds: ["scales", "rhythm-basics"],
        difficultyTier: 4,
      },
    ],
    diagnostics: [
      {
        conceptId: "pitch-notes",
        stem: "How many distinct letter names are used for musical pitches before they repeat?",
        choices: [
          { id: "a", text: "5" },
          { id: "b", text: "7" },
          { id: "c", text: "12" },
        ],
        answerId: "b",
        difficulty: -2,
      },
      {
        conceptId: "rhythm-basics",
        stem: "In 4/4 time, how many quarter-note beats are in one measure?",
        choices: [
          { id: "a", text: "2" },
          { id: "b", text: "3" },
          { id: "c", text: "4" },
        ],
        answerId: "c",
        difficulty: -1.5,
      },
      {
        conceptId: "intervals",
        stem: "The distance from C to G (counting C as 1) is called a:",
        choices: [
          { id: "a", text: "Third" },
          { id: "b", text: "Fifth" },
          { id: "c", text: "Octave" },
        ],
        answerId: "b",
        difficulty: 0,
      },
      {
        conceptId: "scales",
        stem: "A major scale is defined by a fixed pattern of which building blocks?",
        choices: [
          { id: "a", text: "Whole and half steps (intervals)" },
          { id: "b", text: "Only the note names A–G" },
          { id: "c", text: "Rhythmic durations" },
        ],
        answerId: "a",
        difficulty: 0.5,
      },
      {
        conceptId: "key-signatures",
        stem: "A key signature with one sharp (F#) most commonly indicates which major key?",
        choices: [
          { id: "a", text: "C major" },
          { id: "b", text: "G major" },
          { id: "c", text: "F major" },
        ],
        answerId: "b",
        difficulty: 1.5,
      },
      {
        conceptId: "chords",
        stem: "A basic major triad is built by stacking which intervals above the root?",
        choices: [
          { id: "a", text: "A major third then a minor third" },
          { id: "b", text: "Two octaves" },
          { id: "c", text: "A second then a fourth" },
        ],
        answerId: "a",
        difficulty: 1,
      },
      {
        conceptId: "chord-progressions",
        stem: "The very common I–V–vi–IV progression is described in terms of:",
        choices: [
          { id: "a", text: "Chords built on scale degrees of a key" },
          { id: "b", text: "Rhythmic note values" },
          { id: "c", text: "Individual unrelated pitches" },
        ],
        answerId: "a",
        difficulty: 2,
      },
      {
        conceptId: "melody-writing",
        stem: "A strong melody most often draws its pitches from:",
        choices: [
          { id: "a", text: "Random notes across the keyboard" },
          { id: "b", text: "The scale of the song's key, shaped by rhythm" },
          { id: "c", text: "Only the lowest bass notes" },
        ],
        answerId: "b",
        difficulty: 2,
      },
    ],
  },
};

const cellBiology: SeedSubject = {
  subject: "Cell Biology Basics",
  goalText: "Understand how cells are structured and how they make energy and divide.",
  goalConceptIds: ["mitochondria-energy", "cell-division"],
  curriculum: {
    title: "Cell Biology Basics",
    summary:
      "The foundations of the cell: from cell theory and membranes to organelles, energy production, and division.",
    concepts: [
      {
        id: "cell-theory",
        name: "Cell Theory",
        description:
          "All living things are made of cells, and all cells arise from pre-existing cells.",
        prerequisiteIds: [],
        difficultyTier: 1,
      },
      {
        id: "prokaryote-eukaryote",
        name: "Prokaryotes vs Eukaryotes",
        description:
          "Cells are either prokaryotic (no nucleus) or eukaryotic (membrane-bound nucleus and organelles).",
        prerequisiteIds: ["cell-theory"],
        difficultyTier: 2,
      },
      {
        id: "cell-membrane",
        name: "Cell Membrane",
        description:
          "The phospholipid bilayer controls what enters and leaves the cell (selective permeability).",
        prerequisiteIds: ["cell-theory"],
        difficultyTier: 2,
      },
      {
        id: "organelles",
        name: "Organelles",
        description:
          "Eukaryotic cells contain specialised compartments, each performing a distinct job.",
        prerequisiteIds: ["prokaryote-eukaryote", "cell-membrane"],
        difficultyTier: 3,
      },
      {
        id: "nucleus-dna",
        name: "Nucleus & DNA",
        description:
          "The nucleus stores DNA, the instructions that direct the cell's activities.",
        prerequisiteIds: ["organelles"],
        difficultyTier: 3,
      },
      {
        id: "mitochondria-energy",
        name: "Mitochondria & Energy",
        description:
          "Mitochondria carry out cellular respiration, converting nutrients into usable ATP energy.",
        prerequisiteIds: ["organelles"],
        difficultyTier: 4,
      },
      {
        id: "cell-division",
        name: "Cell Division",
        description:
          "Mitosis copies DNA and splits one cell into two identical daughter cells.",
        prerequisiteIds: ["nucleus-dna"],
        difficultyTier: 5,
      },
    ],
    diagnostics: [
      {
        conceptId: "cell-theory",
        stem: "According to cell theory, where do new cells come from?",
        choices: [
          { id: "a", text: "They form spontaneously from non-living matter" },
          { id: "b", text: "From the division of pre-existing cells" },
          { id: "c", text: "From crystallised proteins" },
        ],
        answerId: "b",
        difficulty: -2,
      },
      {
        conceptId: "prokaryote-eukaryote",
        stem: "The defining difference of a eukaryotic cell is that it has:",
        choices: [
          { id: "a", text: "A membrane-bound nucleus" },
          { id: "b", text: "A cell wall" },
          { id: "c", text: "No DNA" },
        ],
        answerId: "a",
        difficulty: 0,
      },
      {
        conceptId: "cell-membrane",
        stem: "The cell membrane is primarily composed of a:",
        choices: [
          { id: "a", text: "Single layer of sugar" },
          { id: "b", text: "Phospholipid bilayer" },
          { id: "c", text: "Solid protein shell" },
        ],
        answerId: "b",
        difficulty: 0.5,
      },
      {
        conceptId: "organelles",
        stem: "What best describes the role of organelles?",
        choices: [
          { id: "a", text: "Specialised compartments with distinct functions" },
          { id: "b", text: "Random empty spaces in the cell" },
          { id: "c", text: "Copies of the whole cell" },
        ],
        answerId: "a",
        difficulty: 1,
      },
      {
        conceptId: "nucleus-dna",
        stem: "The nucleus is best described as the cell's:",
        choices: [
          { id: "a", text: "Energy factory" },
          { id: "b", text: "Information store (holds DNA)" },
          { id: "c", text: "Waste bin" },
        ],
        answerId: "b",
        difficulty: 1,
      },
      {
        conceptId: "mitochondria-energy",
        stem: "Mitochondria are known as the powerhouse of the cell because they:",
        choices: [
          { id: "a", text: "Produce ATP through cellular respiration" },
          { id: "b", text: "Store genetic information" },
          { id: "c", text: "Digest foreign particles" },
        ],
        answerId: "a",
        difficulty: 2,
      },
      {
        conceptId: "cell-division",
        stem: "Mitosis produces:",
        choices: [
          { id: "a", text: "Two genetically identical daughter cells" },
          { id: "b", text: "Four genetically different cells" },
          { id: "c", text: "One larger cell" },
        ],
        answerId: "a",
        difficulty: 2.5,
      },
    ],
  },
};

const wwiCauses: SeedSubject = {
  subject: "Causes of World War I",
  goalText: "Understand why the First World War broke out in 1914.",
  goalConceptIds: ["outbreak-war"],
  curriculum: {
    title: "Causes of World War I",
    summary:
      "The long-run and short-run causes of 1914: from nationalism and alliances to the July Crisis and the outbreak of war.",
    concepts: [
      {
        id: "europe-1900",
        name: "Europe Around 1900",
        description:
          "The political map of the Great Powers and their rivalries set the stage for conflict.",
        prerequisiteIds: [],
        difficultyTier: 1,
      },
      {
        id: "nationalism",
        name: "Nationalism",
        description:
          "Intense national pride and ethnic self-determination raised tensions across Europe.",
        prerequisiteIds: ["europe-1900"],
        difficultyTier: 2,
      },
      {
        id: "imperialism",
        name: "Imperialism",
        description:
          "Competition for colonies and global influence strained relations between the powers.",
        prerequisiteIds: ["europe-1900"],
        difficultyTier: 2,
      },
      {
        id: "militarism",
        name: "Militarism",
        description:
          "Arms races and glorification of military power made war seem both likely and winnable.",
        prerequisiteIds: ["europe-1900"],
        difficultyTier: 2,
      },
      {
        id: "alliance-system",
        name: "The Alliance System",
        description:
          "Interlocking alliances meant a local conflict could pull in every major power.",
        prerequisiteIds: ["nationalism", "imperialism", "militarism"],
        difficultyTier: 3,
      },
      {
        id: "balkan-tensions",
        name: "Balkan Tensions",
        description:
          "The unstable Balkans — the 'powder keg of Europe' — were a flashpoint of nationalist rivalry.",
        prerequisiteIds: ["nationalism"],
        difficultyTier: 3,
      },
      {
        id: "assassination-sarajevo",
        name: "Assassination at Sarajevo",
        description:
          "The 1914 killing of Archduke Franz Ferdinand was the spark that lit the crisis.",
        prerequisiteIds: ["balkan-tensions", "alliance-system"],
        difficultyTier: 4,
      },
      {
        id: "july-crisis",
        name: "The July Crisis",
        description:
          "A month of ultimatums and mobilisations turned a regional murder into a continental war.",
        prerequisiteIds: ["assassination-sarajevo"],
        difficultyTier: 4,
      },
      {
        id: "outbreak-war",
        name: "Outbreak of War",
        description:
          "Mobilisation schedules and alliance obligations cascaded into full-scale war by August 1914.",
        prerequisiteIds: ["july-crisis", "alliance-system"],
        difficultyTier: 5,
      },
    ],
    diagnostics: [
      {
        conceptId: "europe-1900",
        stem: "By 1900, relations among Europe's Great Powers were best characterised by:",
        choices: [
          { id: "a", text: "Lasting peace and cooperation" },
          { id: "b", text: "Rivalry and competing interests" },
          { id: "c", text: "A single unified government" },
        ],
        answerId: "b",
        difficulty: -1.5,
      },
      {
        conceptId: "nationalism",
        stem: "Nationalism in this period most directly refers to:",
        choices: [
          { id: "a", text: "Strong pride in and loyalty to one's nation or ethnic group" },
          { id: "b", text: "A style of industrial production" },
          { id: "c", text: "A trade agreement between empires" },
        ],
        answerId: "a",
        difficulty: 0,
      },
      {
        conceptId: "militarism",
        stem: "Militarism contributed to war by:",
        choices: [
          { id: "a", text: "Encouraging arms races and readiness to use force" },
          { id: "b", text: "Reducing the size of armies" },
          { id: "c", text: "Banning alliances" },
        ],
        answerId: "a",
        difficulty: 0.5,
      },
      {
        conceptId: "alliance-system",
        stem: "Why did the alliance system make a wider war more likely?",
        choices: [
          { id: "a", text: "It isolated every country" },
          { id: "b", text: "It obligated powers to join their partners' conflicts" },
          { id: "c", text: "It disarmed the major powers" },
        ],
        answerId: "b",
        difficulty: 1.5,
      },
      {
        conceptId: "balkan-tensions",
        stem: "The Balkans were nicknamed the 'powder keg of Europe' because they were:",
        choices: [
          { id: "a", text: "A peaceful, stable region" },
          { id: "b", text: "A volatile flashpoint of nationalist rivalry" },
          { id: "c", text: "Uninhabited" },
        ],
        answerId: "b",
        difficulty: 1.5,
      },
      {
        conceptId: "assassination-sarajevo",
        stem: "The event widely seen as the immediate spark of WWI was the assassination of:",
        choices: [
          { id: "a", text: "Archduke Franz Ferdinand" },
          { id: "b", text: "Kaiser Wilhelm II" },
          { id: "c", text: "Tsar Nicholas II" },
        ],
        answerId: "a",
        difficulty: 1,
      },
      {
        conceptId: "july-crisis",
        stem: "During the July Crisis, the step-by-step escalation was driven largely by:",
        choices: [
          { id: "a", text: "Ultimatums and military mobilisations" },
          { id: "b", text: "A shared peace treaty" },
          { id: "c", text: "Economic aid packages" },
        ],
        answerId: "a",
        difficulty: 2,
      },
      {
        conceptId: "outbreak-war",
        stem: "The rapid slide into full-scale war in August 1914 was accelerated by:",
        choices: [
          { id: "a", text: "Rigid mobilisation timetables and alliance obligations" },
          { id: "b", text: "A lack of any standing armies" },
          { id: "c", text: "The absence of any alliances" },
        ],
        answerId: "a",
        difficulty: 2.5,
      },
    ],
  },
};

export const SEED_SUBJECTS: SeedSubject[] = [musicTheory, cellBiology, wwiCauses];

/** The subject deliberately treated as the primary "guaranteed" demo fallback. */
export const PRIMARY_FALLBACK_SUBJECT = "Music Theory Fundamentals";
