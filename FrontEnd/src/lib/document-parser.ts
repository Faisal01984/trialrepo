// Client-side parser for PDF and DOCX files. Runs in the browser to keep the
// Worker SSR runtime free of native bindings.

export async function parseDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".docx")) return parseDocx(file);
  throw new Error("Unsupported file. Upload a .pdf or .docx file.");
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  // Use the bundled worker via Vite's ?url import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

async function parseDocx(file: File): Promise<string> {
  // @ts-expect-error - browser build has no types
  const mammoth: any = await import("mammoth/mammoth.browser.js");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return (value as string).trim();
}
