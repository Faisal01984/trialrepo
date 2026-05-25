// Real PDF / DOCX generators for lesson exports, quiz reports and homework templates.
// Every blob is verified (magic bytes + minimum size) before being saved so corrupt
// files never reach the user.
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];       // PK\x03\x04 (DOCX is a zip)
const MIN_PDF_BYTES = 200;
const MIN_DOCX_BYTES = 600;

async function verifyBlob(blob: Blob, kind: "pdf" | "docx"): Promise<{ ok: true } | { ok: false; reason: string }> {
  const expected = kind === "pdf" ? PDF_MAGIC : ZIP_MAGIC;
  const minSize = kind === "pdf" ? MIN_PDF_BYTES : MIN_DOCX_BYTES;
  if (blob.size < minSize) return { ok: false, reason: `File too small (${blob.size} bytes).` };
  const header = new Uint8Array(await blob.slice(0, expected.length).arrayBuffer());
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      return { ok: false, reason: `Invalid ${kind.toUpperCase()} header — file would not open.` };
    }
  }
  // DOCX must also contain the OOXML content-types entry.
  if (kind === "docx") {
    const sample = new TextDecoder("utf-8", { fatal: false }).decode(await blob.arrayBuffer());
    if (!sample.includes("[Content_Types].xml") || !sample.includes("word/document.xml")) {
      return { ok: false, reason: "DOCX is missing required Office Open XML parts." };
    }
  }
  return { ok: true };
}

async function saveVerified(blob: Blob, filename: string, kind: "pdf" | "docx") {
  const check = await verifyBlob(blob, kind);
  if (!check.ok) {
    console.error("Download verification failed:", filename, check.reason);
    toast.error(`Couldn't prepare ${filename}: ${check.reason}`);
    return false;
  }
  saveAs(blob, filename);
  return true;
}



type Block = { heading?: string; lines: string[] };

function lessonBlocks(title: string, meta: string, c: any): Block[] {
  const blocks: Block[] = [
    { heading: title, lines: [meta] },
    { heading: "Overview", lines: [c.overview ?? ""] },
  ];

  // Full Lesson Content
  if (c.fullLesson) {
    if (c.fullLesson.objectives?.length) {
      blocks.push({
        heading: "Learning Objectives",
        lines: c.fullLesson.objectives.map((o: string, i: number) => `${i + 1}. ${o}`),
      });
    }
    if (c.fullLesson.introduction) {
      blocks.push({
        heading: "Introduction",
        lines: [c.fullLesson.introduction],
      });
    }
    if (c.fullLesson.mainContent) {
      blocks.push({
        heading: "Main Lesson Content",
        lines: [c.fullLesson.mainContent],
      });
    }
    if (c.fullLesson.keyConcepts?.length) {
      blocks.push({
        heading: "Key Concepts",
        lines: c.fullLesson.keyConcepts.map((k: string, i: number) => `${i + 1}. ${k}`),
      });
    }
    if (c.fullLesson.workedExamples?.length) {
      blocks.push({
        heading: "Worked Examples",
        lines: c.fullLesson.workedExamples.flatMap((ex: any, i: number) => [
          `Example ${i + 1}:`,
          `Problem: ${ex.problem}`,
          `Solution: ${ex.solution}`,
          "",
        ]),
      });
    }
    if (c.fullLesson.commonMistakes?.length) {
      blocks.push({
        heading: "Common Mistakes to Avoid",
        lines: c.fullLesson.commonMistakes.map((m: string, i: number) => `${i + 1}. ${m}`),
      });
    }
    if (c.fullLesson.summary) {
      blocks.push({
        heading: "Summary & Recap",
        lines: [c.fullLesson.summary],
      });
    }
  }

  // Lesson Plan
  blocks.push({
    heading: "Lesson Plan",
    lines: (c.plan ?? []).map((p: any) => `• ${p.section} (${p.minutes} min): ${p.details}`),
  });

  // Worksheet
  blocks.push({
    heading: "Worksheet",
    lines: [
      ...(c.worksheet?.fillInBlanks ?? []).map((e: any, i: number) => `Fill in blank ${i + 1}: ${e.q}`),
      ...(c.worksheet?.trueOrFalse ?? []).map((e: any, i: number) => `True/False ${i + 1}: ${e.statement}`),
      ...(c.worksheet?.shortAnswer ?? []).map((e: any, i: number) => `Short Answer ${i + 1}: ${e.q}`),
      ...(c.worksheet?.longAnswer ?? []).map((e: any, i: number) => `Long Answer ${i + 1}: ${e.q}`),
      ...(c.worksheet?.exercises ?? []).map((e: any, i: number) => `${i + 1}. ${e.q}`),
    ],
  });

  // Quiz
  blocks.push({
    heading: "Quiz",
    lines: (c.quiz ?? []).flatMap((q: any, i: number) => [
      `${i + 1}. ${q.q}`,
      ...((q.options ?? []) as string[]).map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`),
      "",
    ]),
  });

  // Homework
  blocks.push({
    heading: "Homework",
    lines: (c.homework ?? []).map((h: any, i: number) => `${i + 1}. ${h.q}${h.guidance ? `  (${h.guidance})` : ""}`),
  });

  return blocks.filter((b) => b.lines.some((l) => l && l.trim().length));
}

export async function exportLessonPdf(lesson: { title: string; subject: string; grade: string; duration: number; language: string; content: any }) {
  const meta = `${lesson.subject} · ${lesson.grade} · ${lesson.duration} min · ${lesson.language}`;
  await blocksToPdf(lessonBlocks(lesson.title, meta, lesson.content ?? {}), safeName(lesson.title) + ".pdf");
}

export async function exportLessonDocx(lesson: { title: string; subject: string; grade: string; duration: number; language: string; content: any }) {
  const meta = `${lesson.subject} · ${lesson.grade} · ${lesson.duration} min · ${lesson.language}`;
  await blocksToDocx(lessonBlocks(lesson.title, meta, lesson.content ?? {}), safeName(lesson.title) + ".docx");
}

function quizReportBlocks(args: { title: string; score: number; total: number; quiz: any[]; answers: (number | string)[] }): Block[] {
  return [
    { heading: `Quiz Report — ${args.title}`, lines: [`Score: ${args.score} / ${args.total}`] },
    {
      heading: "Answers",
      lines: args.quiz.flatMap((q: any, i: number) => {
        if (q?.type === "short") {
          const ans = String(args.answers[i] ?? "").trim() || "—";
          const keywords: string[] = (q.keywords ?? []).map((k: string) => String(k).toLowerCase());
          const lower = ans.toLowerCase();
          const matched = keywords.filter((k) => lower.includes(k));
          const ratio = keywords.length ? matched.length / keywords.length : 0;
          const verdict = ratio >= 0.6 ? "Full credit" : "Needs improvement";
          return [
            `${i + 1}. ${q.q}  [Short answer]`,
            `   Your answer: ${ans}`,
            `   Model answer: ${q.expectedAnswer ?? "—"}`,
            `   Rubric: ${q.rubric ?? "—"}`,
            `   Keywords matched: ${matched.length}/${keywords.length} — ${verdict}`,
            "",
          ];
        }
        const idx = typeof args.answers[i] === "number" ? (args.answers[i] as number) : -1;
        return [
          `${i + 1}. ${q.q}  [MCQ]`,
          `   Your answer: ${q.options?.[idx] ?? "—"}`,
          `   Correct answer: ${q.options?.[q.answerIndex] ?? "—"}`,
          "",
        ];
      }),
    },
  ];
}

export async function quizReportPdf(args: { title: string; score: number; total: number; quiz: any[]; answers: (number | string)[] }) {
  await blocksToPdf(quizReportBlocks(args), "quiz-report.pdf");
}

export async function quizReportDocx(args: { title: string; score: number; total: number; quiz: any[]; answers: (number | string)[] }) {
  await blocksToDocx(quizReportBlocks(args), "quiz-report.docx");
}

export async function homeworkTemplatePdf(lessonTitle: string, homework: any[]) {
  const blocks: Block[] = [
    { heading: `Homework — ${lessonTitle}`, lines: ["Write your answers in the space below each question."] },
    {
      heading: "Questions",
      lines: (homework ?? []).flatMap((h: any, i: number) => [`${i + 1}. ${h.q}`, "Answer:", "", "", ""]),
    },
  ];
  if (!homework?.length) blocks[1].lines = ["1.", "", "", "2.", "", "", "3.", "", ""];
  await blocksToPdf(blocks, "homework-template.pdf");
}

export async function homeworkTemplateDocx(lessonTitle: string, homework: any[]) {
  const blocks: Block[] = [
    { heading: `Homework — ${lessonTitle}`, lines: ["Write your answers in the space below each question."] },
    {
      heading: "Questions",
      lines: (homework ?? []).flatMap((h: any, i: number) => [`${i + 1}. ${h.q}`, "Answer:", "", "", ""]),
    },
  ];
  if (!homework?.length) blocks[1].lines = ["1.", "", "", "2.", "", "", "3.", "", ""];
  await blocksToDocx(blocks, "homework-template.docx");
}

export type HomeworkReportRow = {
  full_name: string;
  roll_number: string;
  file_name: string;
  created_at: string;
};

function homeworkReportBlocks(lessonTitle: string, rows: HomeworkReportRow[]): Block[] {
  return [
    {
      heading: `Homework Submissions — ${lessonTitle}`,
      lines: [`Total submissions: ${rows.length}`, `Generated: ${new Date().toLocaleString()}`],
    },
    {
      heading: "Submissions",
      lines: rows.length
        ? rows.flatMap((r, i) => [
            `${i + 1}. ${r.full_name}  (Roll: ${r.roll_number})`,
            `   File: ${r.file_name}`,
            `   Submitted: ${new Date(r.created_at).toLocaleString()}`,
            "",
          ])
        : ["No submissions match the current filter."],
    },
  ];
}

export async function homeworkReportPdf(lessonTitle: string, rows: HomeworkReportRow[]) {
  await blocksToPdf(homeworkReportBlocks(lessonTitle, rows), safeName(lessonTitle) + "-homework-report.pdf");
}

export async function homeworkReportDocx(lessonTitle: string, rows: HomeworkReportRow[]) {
  await blocksToDocx(homeworkReportBlocks(lessonTitle, rows), safeName(lessonTitle) + "-homework-report.docx");
}

export async function teacherKeyPdf(lessonTitle: string, answerKey: any) {
  const blocks: Block[] = [
    { heading: `Teacher's Key — ${lessonTitle}`, lines: ["Confidential — for instructor use only."] },
    {
      heading: "Worksheet Answers",
      lines: (answerKey?.worksheet ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
    {
      heading: "Quiz Explanations",
      lines: (answerKey?.quizExplanations ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
    {
      heading: "Homework Model Answers",
      lines: (answerKey?.homework ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
  ];
  await blocksToPdf(blocks, safeName(lessonTitle) + "-teachers-key.pdf");
}

export async function teacherKeyDocx(lessonTitle: string, answerKey: any) {
  const blocks: Block[] = [
    { heading: `Teacher's Key — ${lessonTitle}`, lines: ["Confidential — for instructor use only."] },
    {
      heading: "Worksheet Answers",
      lines: (answerKey?.worksheet ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
    {
      heading: "Quiz Explanations",
      lines: (answerKey?.quizExplanations ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
    {
      heading: "Homework Model Answers",
      lines: (answerKey?.homework ?? []).map((a: string, i: number) => `${i + 1}. ${a}`),
    },
  ];
  await blocksToDocx(blocks, safeName(lessonTitle) + "-teachers-key.docx");
}

function safeName(s: string) {
  return (s || "lesson").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "lesson";
}

async function blocksToPdf(blocks: Block[], filename: string): Promise<boolean> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const writeLine = (text: string, size: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text || " ", width);
    for (const line of wrapped) {
      if (y + size + 4 > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  try {
    blocks.forEach((b, idx) => {
      if (idx > 0) y += 8;
      if (b.heading) writeLine(b.heading, idx === 0 ? 18 : 14, true);
      b.lines.forEach((l) => writeLine(l, 11, false));
    });
    const blob = doc.output("blob");
    return await saveVerified(blob, filename, "pdf");
  } catch (e) {
    console.error("PDF generation failed", e);
    toast.error("Couldn't generate PDF.");
    return false;
  }
}

async function blocksToDocx(blocks: Block[], filename: string): Promise<boolean> {
  try {
    const children: Paragraph[] = [];
    blocks.forEach((b, idx) => {
      if (b.heading) {
        children.push(new Paragraph({
          heading: idx === 0 ? HeadingLevel.TITLE : HeadingLevel.HEADING_1,
          children: [new TextRun({ text: b.heading, bold: true })],
        }));
      }
      b.lines.forEach((l) => children.push(new Paragraph({ children: [new TextRun(l || " ")] })));
    });
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    return await saveVerified(blob, filename, "docx");
  } catch (e) {
    console.error("DOCX generation failed", e);
    toast.error("Couldn't generate DOCX.");
    return false;
  }
}

