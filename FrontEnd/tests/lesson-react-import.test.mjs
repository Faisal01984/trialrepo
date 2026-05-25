// Build-time guard: lesson.$id.tsx uses React.forwardRef, which requires the
// `React` namespace at runtime. The automatic JSX transform does NOT provide
// it, so the file must either:
//   1. import * as React from "react"
//   2. import React from "react"
// AND tsconfig must keep the automatic JSX runtime ("jsx": "react-jsx") so
// plain <Tag /> still compiles without manual React imports elsewhere.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const target = resolve(root, "src/routes/_app/lesson.$id.tsx");
const tsconfigPath = resolve(root, "tsconfig.json");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const src = readFileSync(target, "utf8");

// 1. JSX must parse.
try {
  await build({
    entryPoints: [target],
    bundle: false,
    write: false,
    loader: { ".tsx": "tsx" },
    logLevel: "silent",
    jsx: "automatic",
  });
} catch (e) {
  fail(`lesson.$id.tsx failed to parse: ${e.message}`);
}

// 2. If the file references the React namespace at runtime (forwardRef, memo,
//    lazy, createContext, createElement), it must import it.
const usesReactNs = /\bReact\.(forwardRef|memo|lazy|createContext|createElement|Fragment|Children|cloneElement)\b/.test(src);
const hasReactImport =
  /import\s+\*\s+as\s+React\s+from\s+["']react["']/.test(src) ||
  /import\s+React(\s*,\s*\{[^}]*\})?\s+from\s+["']react["']/.test(src);

if (usesReactNs && !hasReactImport) {
  fail("lesson.$id.tsx uses the React namespace (e.g. React.forwardRef) but does not import React. Add: import * as React from \"react\";");
}

// 3. tsconfig must keep the automatic JSX runtime so bare <Tag /> still works.
const tsconfigRaw = readFileSync(tsconfigPath, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"])\/\/.*$/gm, "$1");
let tsconfig;
try { tsconfig = JSON.parse(tsconfigRaw); }
catch (e) { fail(`Could not parse tsconfig.json: ${e.message}`); }

const jsx = tsconfig?.compilerOptions?.jsx;
if (jsx && jsx !== "react-jsx" && jsx !== "react-jsxdev" && jsx !== "preserve") {
  // "preserve" is fine because Vite's esbuild handles JSX itself.
  fail(`tsconfig.compilerOptions.jsx is "${jsx}" — must be "react-jsx" (or "preserve") so JSX works without manual React imports.`);
}

console.log("✓ lesson.$id.tsx React import + JSX runtime are valid");
