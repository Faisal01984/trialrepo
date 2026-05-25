#!/usr/bin/env node
// Build-time check: students can download quiz results and homework as PDF/DOCX.
// 1. Parses src/routes/_app/lesson.$id.tsx with esbuild (catches syntax/JSX issues).
// 2. Confirms src/lib/document-export.ts exports the quiz + homework helpers.
// 3. Confirms the lesson route imports those helpers and wires them to buttons.

import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const LESSON = "src/routes/_app/lesson.$id.tsx";
const EXPORT_LIB = "src/lib/document-export.ts";
const lessonSrc = readFileSync(LESSON, "utf8");
const libSrc = readFileSync(EXPORT_LIB, "utf8");
const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

for (const [file, src] of [[LESSON, lessonSrc], [EXPORT_LIB, libSrc]]) {
  try {
    transformSync(src, { loader: file.endsWith(".tsx") ? "tsx" : "ts", sourcefile: file });
    console.log(`✓ ${file} parses cleanly`);
  } catch (err) {
    console.error(`✗ ${file} parse failed:\n` + err.message);
    process.exit(1);
  }
}

// Required exports from document-export.ts (quiz results + homework templates).
const required = [
  "quizReportPdf",
  "quizReportDocx",
  "homeworkTemplatePdf",
  "homeworkTemplateDocx",
];
for (const fn of required) {
  ok(new RegExp(`export\\s+(async\\s+)?function\\s+${fn}\\b`).test(libSrc),
    `${fn} not exported from document-export.ts`);
}

// Lesson route must import those helpers.
for (const fn of required) {
  ok(new RegExp(`\\b${fn}\\b`).test(lessonSrc),
    `${fn} not referenced in lesson route`);
}

// Quiz result download buttons (student-facing): both PDF and DOCX wired.
ok(/onClick=\{downloadReportPdf\}/.test(lessonSrc),
  "Quiz 'Report PDF' button is not wired to downloadReportPdf");
ok(/onClick=\{downloadReportDocx\}/.test(lessonSrc),
  "Quiz 'Report DOCX' button is not wired to downloadReportDocx");
ok(/downloadReportPdf\(\)\s*\{\s*if\s*\(result\)\s*quizReportPdf\(/.test(lessonSrc),
  "downloadReportPdf must call quizReportPdf when a result exists");
ok(/downloadReportDocx\(\)\s*\{\s*if\s*\(result\)\s*void\s+quizReportDocx\(/.test(lessonSrc),
  "downloadReportDocx must call quizReportDocx when a result exists");

// Homework download buttons (student-facing): both PDF and DOCX wired.
ok(/downloadTemplate\(["']pdf["']\)/.test(lessonSrc),
  "Homework PDF button is not wired to downloadTemplate('pdf')");
ok(/downloadTemplate\(["']docx["']\)/.test(lessonSrc),
  "Homework DOCX button is not wired to downloadTemplate('docx')");
ok(/homeworkTemplatePdf\(lessonTitle,\s*homework\)/.test(lessonSrc),
  "downloadTemplate must call homeworkTemplatePdf(lessonTitle, homework)");
ok(/homeworkTemplateDocx\(lessonTitle,\s*homework\)/.test(lessonSrc),
  "downloadTemplate must call homeworkTemplateDocx(lessonTitle, homework)");

if (failures.length) {
  console.error("✗ Lesson download wiring checks failed:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✓ Quiz result PDF/DOCX downloads wired");
console.log("✓ Homework PDF/DOCX downloads wired");
console.log("\nAll lesson download checks passed.");
