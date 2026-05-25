// Capture a DOM element as a clean multi-page PDF using html2canvas + jsPDF.
import { toast } from "sonner";

export async function downloadLessonAsPDF(el: HTMLElement, filename: string) {
  // html2canvas-pro supports modern CSS color functions (oklch/lab) used by the design system.
  const html2canvas = (await import("html2canvas-pro")).default;
  const { default: jsPDF } = await import("jspdf");

  // Render at 2x for sharpness.
  const canvas = await html2canvas(el, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  // Pixels per PDF point at the rendered scale.
  const pxPerPt = canvas.width / usableW;
  const pageSliceHeightPx = Math.floor(usableH * pxPerPt);

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pageSliceHeightPx, canvas.height - renderedPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) { toast.error("Could not render PDF."); return; }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (pageIndex > 0) pdf.addPage();
    const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
    const imgHeightPt = sliceHeight / pxPerPt;
    pdf.addImage(imgData, "JPEG", margin, margin, usableW, imgHeightPt, undefined, "FAST");

    renderedPx += sliceHeight;
    pageIndex += 1;
  }

  pdf.save(filename);
}
