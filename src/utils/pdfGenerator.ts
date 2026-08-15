import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Robust, deterministic PDF generator for technical reports.
 * Renders each .pdf-page as an exact A4 sheet (794px × 1123px @ 96DPI)
 * with dedicated, locked header and footer regions on every single page.
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

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    // Find all explicit .pdf-page elements or treat the whole root as a single page
    const pageElements = element.querySelectorAll<HTMLElement>(".pdf-page");
    const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [element];

    // 3. Create an isolated off-screen sandbox container with fixed A4 dimensions
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

      // Apply clean, standardized fixed A4 page styling to the clone
      pageClone.style.width = "794px";
      pageClone.style.maxWidth = "794px";
      pageClone.style.minWidth = "794px";
      pageClone.style.height = "1123px";
      pageClone.style.minHeight = "1123px";
      pageClone.style.maxHeight = "1123px";
      pageClone.style.boxSizing = "border-box";
      pageClone.style.margin = "0";
      pageClone.style.padding = "28px 36px 24px 36px";
      pageClone.style.border = "none";
      pageClone.style.borderTop = "none";
      pageClone.style.boxShadow = "none";
      pageClone.style.backgroundColor = "#ffffff";
      pageClone.style.display = "flex";
      pageClone.style.flexDirection = "column";
      pageClone.style.justifyContent = "space-between";
      pageClone.style.overflow = "hidden";

      // Clear the sandbox and insert the current clone
      sandboxContainer.innerHTML = "";
      sandboxContainer.appendChild(pageClone);

      // Brief layout tick for SVG reflow and font bounding
      await new Promise((r) => setTimeout(r, 40));

      // High-resolution rasterization (scale: 2 gives crystal sharp 1588px × 2246px canvas)
      const canvas = await html2canvas(pageClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
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
