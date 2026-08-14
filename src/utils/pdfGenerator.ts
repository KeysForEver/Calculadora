import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    // Wait for DOM layout, SVGs and fonts to settle
    await new Promise((r) => setTimeout(r, 250));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10; // 10mm margin
    const contentWidth = pdfWidth - margin * 2; // 190mm
    const maxContentHeight = pdfHeight - margin * 2; // 277mm

    const pageElements = element.querySelectorAll<HTMLElement>(".pdf-page");
    const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [element];

    for (let i = 0; i < pagesToRender.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const pageEl = pagesToRender[i];

      // 1. Render high-DPI canvas background with crisp fidelity
      const canvas = await html2canvas(pageEl, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: pageEl.scrollWidth || 1024,
      });

      // Calculate exact proportional height so pages never distort or squeeze
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const calculatedHeightMm = (imgHeightPx * contentWidth) / imgWidthPx;
      const finalRenderHeightMm = Math.min(calculatedHeightMm, maxContentHeight);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, finalRenderHeightMm);

      // 2. Add clickable link annotations for <a> tags
      const pageRect = pageEl.getBoundingClientRect();
      if (pageRect.width > 0 && pageRect.height > 0) {
        const links = pageEl.querySelectorAll<HTMLAnchorElement>("a[href]");
        links.forEach((anchor) => {
          const rect = anchor.getBoundingClientRect();
          const href = anchor.href;
          if (href && rect.width > 0 && rect.height > 0) {
            const relLeft = rect.left - pageRect.left;
            const relTop = rect.top - pageRect.top;

            const xMm = margin + (relLeft / pageRect.width) * contentWidth;
            const yMm = margin + (relTop / pageRect.height) * finalRenderHeightMm;
            const wMm = (rect.width / pageRect.width) * contentWidth;
            const hMm = (rect.height / pageRect.height) * finalRenderHeightMm;

            pdf.link(xMm, yMm, wMm, hMm, { url: href });
          }
        });
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return false;
  }
}


