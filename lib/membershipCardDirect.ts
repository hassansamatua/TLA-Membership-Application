import jsPDF from 'jspdf';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

const CARD_WIDTH = 336;
const CARD_HEIGHT = 212;
const RENDER_SCALE = 4; // 4x for crisp output

/**
 * Fetch a same-origin asset and convert it to a data URL so it can be
 * inlined into a serialized <svg> for drawing onto a <canvas>.
 */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Inline every <image href="..."> in the cloned SVG as a data URL so the
 * SVG can be rasterised cleanly via <img>.src = svgBlob.
 */
async function inlineSvgImages(svg: SVGSVGElement): Promise<void> {
  const images = Array.from(svg.querySelectorAll('image'));
  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute('href') || img.getAttribute('xlink:href') || '';
      if (!href || href.startsWith('data:')) return;
      const dataUrl = await urlToDataUrl(href);
      if (dataUrl) {
        img.setAttribute('href', dataUrl);
        img.removeAttribute('xlink:href');
      } else {
        // Asset failed to load: drop the broken reference so the fallback
        // shapes/text in the SVG remain visible.
        img.remove();
      }
    })
  );
}

/**
 * Render the live <svg id="…"> inside the displayed card into a PNG canvas.
 * Bypasses html2canvas entirely so Tailwind v4 `oklch()` / `lab()` colours
 * elsewhere on the page cannot crash the export.
 */
async function renderCardSvgToCanvas(): Promise<HTMLCanvasElement> {
  const cardElement = document.getElementById('membership-card-element');
  if (!cardElement) {
    throw new Error('Membership card element not found on page');
  }
  const sourceSvg = cardElement.querySelector('svg');
  if (!sourceSvg) {
    throw new Error('Membership card SVG not found inside element');
  }

  // Clone so we can mutate (inline images) without touching the live DOM
  const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clonedSvg.setAttribute('width', String(CARD_WIDTH));
  clonedSvg.setAttribute('height', String(CARD_HEIGHT));
  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`);
  }

  await inlineSvgImages(clonedSvg);

  const serialized = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([serialized], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to rasterise card SVG'));
      el.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH * RENDER_SCALE;
    canvas.height = CARD_HEIGHT * RENDER_SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

// DIRECT method - rasterises the exact displayed SVG to a PDF
export async function generateMembershipCardPDFDirect(
  cardData: MembershipCardData
): Promise<void> {
  const canvas = await renderCardSvgToCanvas();

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [CARD_WIDTH, CARD_HEIGHT],
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', 0, 0, CARD_WIDTH, CARD_HEIGHT);

  const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date()
    .toISOString()
    .split('T')[0]}.pdf`;
  pdf.save(fileName);
}

// Print function using the direct method - prints the rasterised card
export async function printMembershipCardDirect(
  cardData: MembershipCardData
): Promise<void> {
  const canvas = await renderCardSvgToCanvas();
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked: please allow popups to print the card');
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>TLA Membership Card - ${cardData.membershipNumber}</title>
    <style>
      @page { size: 86mm 54mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      img { width: 86mm; height: 54mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="TLA Membership Card" />
    <script>
      window.onload = function () {
        setTimeout(function () { window.print(); window.close(); }, 250);
      };
    </script>
  </body>
</html>`);
  printWindow.document.close();
}
