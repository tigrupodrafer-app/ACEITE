import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an element (like a browser "Print to PDF") and downloads a PDF.
 * Slices tall content across multiple A4 pages.
 */
export async function exportElementToPdf(element, fileName = 'documento.pdf', hideEls = []) {
  const hidden = hideEls.filter(Boolean);
  const prev = hidden.map(el => el.style.display);
  hidden.forEach(el => { el.style.display = 'none'; });

  let canvas;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  } finally {
    hidden.forEach((el, i) => { el.style.display = prev[i]; });
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, pageH = 297;
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const totalPages = Math.ceil(imgH / pageH);

  for (let p = 0; p < totalPages; p++) {
    // slice of the source canvas that fits this page
    const sliceY = p * (pageH * canvas.width / imgW);
    const sliceH = Math.min(canvas.height - sliceY, pageH * canvas.width / imgW);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    if (p > 0) pdf.addPage();
    const h = (sliceH * imgW) / canvas.width;
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, h);
  }

  pdf.save(fileName);
}