import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    // Wait for images/fonts if any
    await new Promise((r) => setTimeout(r, 150));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10; // 10mm margin
    const contentWidth = pdfWidth - margin * 2; // 190mm
    const pageContentHeight = pdfHeight - margin * 2; // 277mm

    const pageElements = element.querySelectorAll<HTMLElement>(".pdf-page");
    const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [element];

    for (let i = 0; i < pagesToRender.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const pageEl = pagesToRender[i];

      // 1. Render high-DPI canvas background
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, pageContentHeight);

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
            const yMm = margin + (relTop / pageRect.height) * pageContentHeight;
            const wMm = (rect.width / pageRect.width) * contentWidth;
            const hMm = (rect.height / pageRect.height) * pageContentHeight;

            pdf.link(xMm, yMm, wMm, hMm, { url: href });
          }
        });

        // 3. Add invisible vector text layer overlay for selectable text
        const textElements = pageEl.querySelectorAll<HTMLElement>(
          "h1, h2, h3, h4, p, span, td, th, li, a, code, strong, em, b, i"
        );

        pdf.setFontSize(9);
        // Set transparent text rendering mode so text is selectable/copyable over the canvas image
        pdf.setTextColor(0, 0, 0);

        textElements.forEach((el) => {
          // Only process leaf text containers or direct text nodes to avoid duplicate text layers
          if (el.children.length === 0 || Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) {
            const text = el.innerText?.trim();
            if (text && text.length > 0) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const relLeft = rect.left - pageRect.left;
                const relTop = rect.top - pageRect.top;

                const xMm = margin + (relLeft / pageRect.width) * contentWidth;
                const yMm = margin + (relTop / pageRect.height) * pageContentHeight + (rect.height / pageRect.height) * pageContentHeight * 0.75;

                try {
                  // jsPDF invisible text mode (renderingMode 3 = Neither fill nor stroke text / invisible)
                  pdf.text(text, xMm, yMm, {
                    renderingMode: "invisible",
                    maxWidth: (rect.width / pageRect.width) * contentWidth,
                  });
                } catch {
                  // Ignore font rendering edge cases silently
                }
              }
            }
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

