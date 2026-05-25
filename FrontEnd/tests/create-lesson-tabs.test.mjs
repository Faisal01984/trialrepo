#!/usr/bin/env node
// Lightweight build-time check for src/routes/_app/create-lesson.tsx
// 1. Parses the file with esbuild — any unbalanced JSX closing tag fails the build.
// 2. Confirms all four tabs (document / youtube / image / manual) are declared
//    with matching <TabsTrigger> and <TabsContent> pairs, and that <Tabs> closes.
//
// Run with:  node tests/create-lesson-tabs.test.mjs

import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const FILE = "src/routes/_app/create-lesson.tsx";
const src = readFileSync(FILE, "utf8");

const failures = [];
function expect(cond, msg) { if (!cond) failures.push(msg); }

// 1. Parse — esbuild throws on any unbalanced JSX or syntax error.
try {
  transformSync(src, { loader: "tsx", sourcefile: FILE });
  console.log("✓ JSX parses cleanly");
} catch (err) {
  console.error("✗ JSX parse failed:");
  console.error(err.message);
  process.exit(1);
}

// 2. Structural checks.
const TABS = ["document", "youtube", "image", "manual"];
for (const tab of TABS) {
  const trigger = new RegExp(`<TabsTrigger\\s+value="${tab}"`).test(src);
  const content = new RegExp(`<TabsContent\\s+value="${tab}"`).test(src);
  expect(trigger, `missing <TabsTrigger value="${tab}">`);
  expect(content, `missing <TabsContent value="${tab}">`);
}

const triggerOpens = (src.match(/<TabsTrigger\b/g) || []).length;
const triggerCloses = (src.match(/<\/TabsTrigger>/g) || []).length;
expect(triggerOpens === triggerCloses,
  `TabsTrigger open/close mismatch: ${triggerOpens} vs ${triggerCloses}`);
expect(triggerOpens === TABS.length,
  `expected ${TABS.length} TabsTriggers, found ${triggerOpens}`);

const contentOpens = (src.match(/<TabsContent\b/g) || []).length;
const contentCloses = (src.match(/<\/TabsContent>/g) || []).length;
expect(contentOpens === contentCloses,
  `TabsContent open/close mismatch: ${contentOpens} vs ${contentCloses}`);
expect(contentOpens === TABS.length,
  `expected ${TABS.length} TabsContents, found ${contentOpens}`);

const tabsOpens = (src.match(/<Tabs\s[^>]*>/g) || []).length;
const tabsCloses = (src.match(/<\/Tabs>/g) || []).length;
expect(tabsOpens === 1 && tabsCloses === 1,
  `expected exactly one <Tabs>…</Tabs>, found open=${tabsOpens} close=${tabsCloses}`);

if (failures.length) {
  console.error("✗ Structural checks failed:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ All ${TABS.length} tabs declared with matching trigger + content`);
console.log("✓ <Tabs> balanced");
console.log("\nAll create-lesson tab checks passed.");
