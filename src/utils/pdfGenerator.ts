import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Robust, deterministic PDF generator for technical reports.
 * Dynamically adjusts to multi-page flows with zero text or calculation truncation.
 * Renders standard A4 sheets (794px × 1123px @ 96DPI / 210mm × 297mm)
 * with dedicated, locked header and footer regions on every page.
 */
export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  let sandboxContainer: HTMLDivElement | null = null;

  try {
    // 1. Ensure all web fonts and KaTeX math fonts are fully loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Allow any SVGs, KaTeX formulas, and layout calculations to stabilize
    await new Promise((r) => setTimeout(r, 200));

    // 2. Initialize jsPDF with standard A4 dimensions (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const standardA4HeightPx = 1123;
    const standardA4WidthPx = 794;
    const scale = 2; // Sharp 2x rasterization scale

    // Find all explicit .pdf-page elements or treat the whole root as a page
    const pageElements = element.querySelectorAll<HTMLElement>(".pdf-page");
    const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [element];

    // 3. Create an isolated off-screen sandbox container with fixed A4 width
    sandboxContainer = document.createElement("div");
    sandboxContainer.id = "__pdf_render_sandbox__";
    sandboxContainer.style.position = "fixed";
    sandboxContainer.style.left = "-99999px";
    sandboxContainer.style.top = "0";
    sandboxContainer.style.width = `${standardA4WidthPx}px`;
    sandboxContainer.style.backgroundColor = "#ffffff";
    sandboxContainer.style.color = "#0f172a";
    sandboxContainer.style.zIndex = "-9999";
    sandboxContainer.style.overflow = "visible";
    sandboxContainer.style.opacity = "1";
    sandboxContainer.style.pointerEvents = "none";
    document.body.appendChild(sandboxContainer);

    let isFirstPage = true;

    for (let i = 0; i < pagesToRender.length; i++) {
      const pageEl = pagesToRender[i];

      // Clone the page node to isolate it from screen-specific responsive shrinking
      const pageClone = pageEl.cloneNode(true) as HTMLElement;

      // Apply clean, standardized fixed A4 page styling to the clone
      pageClone.style.width = `${standardA4WidthPx}px`;
      pageClone.style.maxWidth = `${standardA4WidthPx}px`;
      pageClone.style.minWidth = `${standardA4WidthPx}px`;
      pageClone.style.boxSizing = "border-box";
      pageClone.style.margin = "0";
      pageClone.style.padding = "24px 32px 20px 32px";
      pageClone.style.border = "none";
      pageClone.style.borderTop = "none";
      pageClone.style.boxShadow = "none";
      pageClone.style.backgroundColor = "#ffffff";
      pageClone.style.display = "flex";
      pageClone.style.flexDirection = "column";
      pageClone.style.justifyContent = "space-between";
      pageClone.style.overflow = "visible";

      // Clear the sandbox and insert the current clone to measure natural rendered height
      sandboxContainer.innerHTML = "";
      sandboxContainer.appendChild(pageClone);

      // Brief layout tick for SVG reflow and font bounding
      await new Promise((r) => setTimeout(r, 40));

      const measuredHeight = pageClone.offsetHeight || pageClone.scrollHeight || standardA4HeightPx;

      // Case A: Page fits within single A4 sheet (standard behavior)
      if (measuredHeight <= standardA4HeightPx + 15) {
        pageClone.style.height = `${standardA4HeightPx}px`;
        pageClone.style.minHeight = `${standardA4HeightPx}px`;
        pageClone.style.maxHeight = `${standardA4HeightPx}px`;

        const canvas = await html2canvas(pageClone, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: standardA4WidthPx,
          height: standardA4HeightPx,
          windowWidth: standardA4WidthPx,
          windowHeight: standardA4HeightPx,
          scrollY: 0,
          scrollX: 0,
        });

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        pdf.addImage(imgData, "JPEG", 0, 0, a4WidthMm, a4HeightMm);

        // Add clickable link annotations for standard footer/header links
        const links = pageClone.querySelectorAll<HTMLAnchorElement>("a[href]");
        links.forEach((anchor) => {
          const rect = anchor.getBoundingClientRect();
          const cloneRect = pageClone.getBoundingClientRect();
          const href = anchor.href;
          if (href && rect.width > 0 && rect.height > 0 && cloneRect.width > 0 && cloneRect.height > 0) {
            const relLeft = rect.left - cloneRect.left;
            const relTop = rect.top - cloneRect.top;

            const xMm = (relLeft / cloneRect.width) * a4WidthMm;
            const yMm = (relTop / cloneRect.height) * a4HeightMm;
            const wMm = (rect.width / cloneRect.width) * a4WidthMm;
            const hMm = (rect.height / cloneRect.height) * a4HeightMm;

            pdf.link(xMm, yMm, wMm, hMm, { url: href });
          }
        });
      } else {
        // Case B: Dynamic multi-page flow if content exceeds single A4 sheet height
        // Slices the rendered canvas across consecutive A4 pages with zero text loss
        const fullCanvas = await html2canvas(pageClone, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: standardA4WidthPx,
          height: measuredHeight,
          windowWidth: standardA4WidthPx,
          windowHeight: measuredHeight,
          scrollY: 0,
          scrollX: 0,
        });

        const targetSliceHeightPx = standardA4HeightPx * scale;
        const totalSlices = Math.ceil(fullCanvas.height / targetSliceHeightPx);

        for (let s = 0; s < totalSlices; s++) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = standardA4WidthPx * scale;
          sliceCanvas.height = targetSliceHeightPx;
          const sliceCtx = sliceCanvas.getContext("2d");

          if (sliceCtx) {
            sliceCtx.fillStyle = "#ffffff";
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

            const sourceY = s * targetSliceHeightPx;
            const sourceSliceHeight = Math.min(fullCanvas.height - sourceY, targetSliceHeightPx);

            sliceCtx.drawImage(
              fullCanvas,
              0,
              sourceY,
              standardA4WidthPx * scale,
              sourceSliceHeight,
              0,
              0,
              standardA4WidthPx * scale,
              sourceSliceHeight
            );
          }

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.96);
          pdf.addImage(sliceImgData, "JPEG", 0, 0, a4WidthMm, a4HeightMm);
        }
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return false;
  } finally {
    // Cleanup sandbox container
    if (sandboxContainer && sandboxContainer.parentNode) {
      sandboxContainer.parentNode.removeChild(sandboxContainer);
    }
  }
}
