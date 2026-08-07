import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    // Wait for images/fonts if any
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(element, {
      scale: 2, // High DPI for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Ensure cloned element is visible for capture if needed
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.style.display = "block";
        }
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10; // 10mm margin
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (contentHeight - heightLeft);
      pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return false;
  }
}
