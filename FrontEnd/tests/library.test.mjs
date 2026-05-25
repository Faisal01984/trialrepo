#!/usr/bin/env node
// Lightweight build-time check for src/routes/_app/library.tsx
// 1. Parses the file with esbuild — any syntax / unbalanced JSX fails the build.
// 2. Confirms the search input is wired to a state setter.
// 3. Confirms the delete action calls supabase.delete() on the lessons table
//    and is wired to a click handler.

import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const FILE = "src/routes/_app/library.tsx";
const src = readFileSync(FILE, "utf8");
const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

try {
  transformSync(src, { loader: "tsx", sourcefile: FILE });
  console.log("✓ JSX parses cleanly");
} catch (err) {
  console.error("✗ JSX parse failed:\n" + err.message);
  process.exit(1);
}

// Search wiring: an <Input placeholder="Search …"> with value + onChange tied to state.
ok(/<Input[^>]*placeholder=["']Search[^"']*["'][^>]*value=\{[^}]+\}[^>]*onChange=\{/.test(src),
  "search Input is missing value/onChange wiring");
ok(/\.filter\(/.test(src),
  "filtered list (.filter(...)) not found — search has no effect");

// Delete wiring: a handler that calls supabase.from('lessons').delete() and a button onClick.
ok(/supabase\.from\(["']lessons["']\)\.delete\(\)/.test(src),
  "delete call to supabase.from('lessons').delete() not found");
ok(/onClick=\{\(\)\s*=>\s*del\(/.test(src) || /onClick=\{\s*\(\)\s*=>\s*del\(/.test(src),
  "delete button is not wired to del() handler");
ok(/aria-label=["']Delete["']/.test(src),
  "delete button is missing aria-label=\"Delete\"");

if (failures.length) {
  console.error("✗ Library wiring checks failed:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("✓ Search input wired to state + filter");
console.log("✓ Delete action wired to supabase.delete()");
console.log("\nAll library page checks passed.");
