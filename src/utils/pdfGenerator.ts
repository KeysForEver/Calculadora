import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Robust, deterministic PDF generator for technical reports.
 * Uses an offscreen A4 sandbox container to ensure identical high-DPI rendering
 * regardless of the user's current screen resolution, device type (mobile/tablet/desktop),
 * or browser window size.
 */
export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  let sandboxContainer: HTMLDivElement | null = null;

  try {
    // 1. Ensure all web fonts and KaTeX math fonts are fully loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Allow any SVGs and layout calculations to stabilize
    await new Promise((r) => setTimeout(r, 200));

    // 2. Initialize jsPDF with standard A4 dimensions
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10; // 10mm margin on all sides
    const contentWidth = pdfWidth - margin * 2; // 190mm printable width
    const maxContentHeight = pdfHeight - margin * 2; // 277mm printable height

    // Find all explicit .pdf-page elements or treat the whole root as a single page
    const pageElements = element.querySelectorAll<HTMLElement>(".pdf-page");
    const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [element];

    // 3. Create an isolated off-screen sandbox container with fixed A4 desktop width (794px = 210mm @ 96DPI)
    sandboxContainer = document.createElement("div");
    sandboxContainer.id = "__pdf_render_sandbox__";
    sandboxContainer.style.position = "fixed";
    sandboxContainer.style.left = "-99999px";
    sandboxContainer.style.top = "0";
    sandboxContainer.style.width = "794px";
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

      // Apply clean, standardized print page styling to the clone
      pageClone.style.width = "794px";
      pageClone.style.maxWidth = "794px";
      pageClone.style.minWidth = "794px";
      pageClone.style.boxSizing = "border-box";
      pageClone.style.margin = "0";
      pageClone.style.padding = "28px 36px";
      pageClone.style.border = "none";
      pageClone.style.borderTop = "none";
      pageClone.style.boxShadow = "none";
      pageClone.style.backgroundColor = "#ffffff";
      pageClone.style.minHeight = "auto";
      pageClone.style.display = "block";

      // Clear the sandbox and insert the current clone
      sandboxContainer.innerHTML = "";
      sandboxContainer.appendChild(pageClone);

      // Brief layout tick for SVG reflow and font bounding
      await new Promise((r) => setTimeout(r, 40));

      // High-resolution rasterization (scale: 2 gives crystal sharp 1588px width canvas)
      const canvas = await html2canvas(pageClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
        scrollY: 0,
        scrollX: 0,
      });

      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const naturalHeightMm = (imgHeightPx * contentWidth) / imgWidthPx;

      // Check if content fits in 1 page or requires multi-page splitting
      // Allow slight 5mm tolerance for single-page fitting
      if (naturalHeightMm <= maxContentHeight + 5) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const renderHeightMm = Math.min(naturalHeightMm, maxContentHeight);
        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, renderHeightMm);

        // Add clickable link annotations for standard footer/header links
        const links = pageClone.querySelectorAll<HTMLAnchorElement>("a[href]");
        links.forEach((anchor) => {
          const rect = anchor.getBoundingClientRect();
          const cloneRect = pageClone.getBoundingClientRect();
          const href = anchor.href;
          if (href && rect.width > 0 && rect.height > 0 && cloneRect.width > 0) {
            const relLeft = rect.left - cloneRect.left;
            const relTop = rect.top - cloneRect.top;

            const xMm = margin + (relLeft / cloneRect.width) * contentWidth;
            const yMm = margin + (relTop / cloneRect.height) * renderHeightMm;
            const wMm = (rect.width / cloneRect.width) * contentWidth;
            const hMm = (rect.height / cloneRect.height) * renderHeightMm;

            pdf.link(xMm, yMm, wMm, hMm, { url: href });
          }
        });
      } else {
        // Multi-page slicing: Slice the tall canvas into clean sequential A4 pages without squishing
        const sliceHeightPx = Math.floor((maxContentHeight / contentWidth) * imgWidthPx);
        const totalSlices = Math.ceil(imgHeightPx / sliceHeightPx);

        for (let s = 0; s < totalSlices; s++) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const currentSliceY = s * sliceHeightPx;
          const currentSliceHeight = Math.min(sliceHeightPx, imgHeightPx - currentSliceY);

          // Create a slice canvas
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = imgWidthPx;
          sliceCanvas.height = currentSliceHeight;
          const ctx = sliceCanvas.getContext("2d");

          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, imgWidthPx, currentSliceHeight);
            ctx.drawImage(
              canvas,
              0,
              currentSliceY,
              imgWidthPx,
              currentSliceHeight,
              0,
              0,
              imgWidthPx,
              currentSliceHeight
            );
          }

          const sliceHeightMm = (currentSliceHeight * contentWidth) / imgWidthPx;
          const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.96);
          pdf.addImage(sliceImgData, "JPEG", margin, margin, contentWidth, sliceHeightMm);
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
