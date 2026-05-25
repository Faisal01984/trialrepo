import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  subject: z.string().min(1).max(120),
  grade: z.string().min(1).max(60),
  topic: z.string().min(1).max(200),
  duration: z.number().min(5).max(240),
  objectives: z.string().max(20000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]),
  language: z.string().min(1).max(60),
  sourceText: z.string().max(200000).optional().default(""),
  sourceFileName: z.string().max(300).optional().default(""),
});

const SYSTEM = `You are an expert curriculum designer. Generate a complete classroom lesson package as STRICT JSON matching this TypeScript shape:
{
  "title": string,
  "overview": string,
  "fullLesson": {
    "objectives": string[],
    "introduction": string,
    "mainContent": string,
    "keyConcepts": string[],
    "workedExamples": { "problem": string, "solution": string }[],
    "commonMistakes": string[],
    "summary": string
  },
  "plan": { "section": string, "minutes": number, "details": string }[],
  "worksheet": {
    "instructions": string,
    "fillInBlanks": { "q": string, "answer": string }[],
    "trueOrFalse": { "statement": string, "answer": boolean }[],
    "shortAnswer": { "q": string, "answer": string }[],
    "longAnswer": { "q": string }[],
    "exercises": { "q": string, "type": "short"|"long"|"fill" }[]
  },
  "quiz": (
    | { "type": "mcq", "q": string, "options": string[], "answerIndex": number, "explanation": string }
    | { "type": "short", "q": string, "expectedAnswer": string, "keywords": string[], "rubric": string }
  )[],
  "homework": { "q": string, "guidance": string }[],
  "answerKey": { "worksheet": string[], "quizExplanations": string[], "homework": string[] }
}
Return ONLY the JSON object, no markdown, no commentary.`;

export const generateLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "teacher").maybeSingle();
    if (!roleRow) {
      return { ok: false as const, error: "Only teachers can generate lessons." };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI service is not configured." };
    }

    const sourceBlock = data.sourceText
      ? `\n\nSOURCE DOCUMENT${data.sourceFileName ? ` (${data.sourceFileName})` : ""} — ground EVERY part of the lesson strictly in this text:\n"""\n${data.sourceText.slice(0, 120000)}\n"""`
      : "";

    const langInstruction =
  data.language === "Roman Hindi"
    ? `Write the ENTIRE lesson in Roman Hindi — Hindi language using Latin alphabet (e.g. "Aaj hum AI ke baare mein padhenge"). Do NOT use Devanagari script. Keep English technical terms where natural. Keep all JSON keys in English.`
    : data.language === "Hindi"
      ? `Write the ENTIRE lesson in Hindi using Devanagari script. Keep all JSON keys in English.`
      : data.language === "Arabic"
        ? `Write the ENTIRE lesson in Modern Standard Arabic (الفصحى) using Arabic script. The text must flow right-to-left. Use clear, simple Arabic suitable for students. Keep all JSON keys in English. Make sure ALL fields including introduction, mainContent, summary, worksheet questions, quiz questions and answers are fully written in Arabic.`
        : `Write the ENTIRE lesson in English. Keep all JSON keys in English.`;

    const userPrompt = `${langInstruction}
Subject: ${data.subject}
Grade/Class: ${data.grade}
Topic: ${data.topic}
Total duration: ${data.duration} minutes
Difficulty: ${data.difficulty}
Learning objectives: ${data.objectives || "(infer reasonable objectives)"}

Requirements:
- fullLesson: Write a COMPLETE, DETAILED lesson a student can read and understand on their own.
  * objectives: 3-5 clear learning goals
  * introduction: Engaging opening (2-3 paragraphs) that hooks the student
  * mainContent: DETAILED explanation (minimum 5-6 paragraphs) with real-life examples and simple analogies
  * keyConcepts: 5-8 important terms/ideas as bullet points
  * workedExamples: EXACTLY 3 fully solved examples with step-by-step solutions
  * commonMistakes: 3-5 mistakes students often make
  * summary: 2-3 paragraph recap of everything learned

- plan: EXACTLY 5 sections — "Warm-up", "Concepts", "Activity", "Recap", "Homework". Minutes must sum to total duration.

- worksheet:
  * fillInBlanks: EXACTLY 5 questions with answers
  * trueOrFalse: EXACTLY 5 statements with boolean answers
  * shortAnswer: EXACTLY 5 questions with model answers
  * longAnswer: EXACTLY 2 creative/analytical questions

- quiz: EXACTLY 10 items — first 7 MCQs (4 options each, answerIndex 0-3, include explanation), then 3 short-answer questions with expectedAnswer, keywords, rubric.

- homework: EXACTLY 5 deep-learning questions with guidance.

- answerKey: Complete answers for worksheet, quiz explanations, homework model answers.
${sourceBlock}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { ok: false as const, error: "Lesson generation is temporarily unavailable. Please try again shortly." };
      }

      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return { ok: true as const, lesson: parsed };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "Failed to generate lesson." };
    }
  });
