import jsPDF from 'jspdf';
import {
  createMembershipCardWithData,
  type MembershipCardData,
} from './membershipCardTemplate';

/**
 * Bulk membership-card utilities for the admin console.
 *
 * Single PDF with one card per page (multi-page) avoids any cross-card
 * scaling artifacts and keeps the exported PDF identical to the per-user
 * download. Bulk print uses the same rasterised PNGs but lays them out
 * 2 per A4 page for batch printing on standard paper.
 */

const CARD_WIDTH = 336; // px (matches the existing template render box)
const CARD_HEIGHT = 212; // px

export interface BulkProgress {
  done: number;
  total: number;
  current?: MembershipCardData;
}

/**
 * Build a single PDF containing every supplied card on its own page.
 * Each card is rendered at its native 336x212 px size in landscape so the
 * output is pixel-identical to the single-card PDF download.
 */
export async function generateBulkMembershipCardsPDF(
  cards: MembershipCardData[],
  opts: { onProgress?: (p: BulkProgress) => void; fileName?: string } = {}
): Promise<void> {
  if (cards.length === 0) {
    throw new Error('No cards selected for bulk PDF export');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [CARD_WIDTH, CARD_HEIGHT],
  });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    opts.onProgress?.({ done: i, total: cards.length, current: card });

    let dataUrl: string;
    try {
      dataUrl = await createMembershipCardWithData(card);
    } catch (err) {
      console.warn(
        `[bulk-cards] failed to render card for ${card.membershipNumber}:`,
        err
      );
      continue;
    }

    if (i > 0) {
      pdf.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
    }
    pdf.addImage(dataUrl, 'PNG', 0, 0, CARD_WIDTH, CARD_HEIGHT);
  }

  opts.onProgress?.({ done: cards.length, total: cards.length });

  const fileName =
    opts.fileName ??
    `TLA_Membership_Cards_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

/**
 * Open a print window containing every selected card as PNGs laid out 2
 * per A4 page. Triggers the browser print dialog automatically.
 */
export async function printBulkMembershipCards(
  cards: MembershipCardData[],
  opts: { onProgress?: (p: BulkProgress) => void } = {}
): Promise<void> {
  if (cards.length === 0) {
    throw new Error('No cards selected for bulk print');
  }

  // Pre-render all card images BEFORE opening the popup. Rendering relies on
  // <canvas> APIs available on the current document, and popup blockers will
  // close detached windows during the long async work otherwise.
  const rendered: { card: MembershipCardData; dataUrl: string }[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    opts.onProgress?.({ done: i, total: cards.length, current: card });
    try {
      const dataUrl = await createMembershipCardWithData(card);
      rendered.push({ card, dataUrl });
    } catch (err) {
      console.warn(
        `[bulk-cards] failed to render card for ${card.membershipNumber}:`,
        err
      );
    }
  }
  opts.onProgress?.({ done: cards.length, total: cards.length });

  if (rendered.length === 0) {
    throw new Error('All selected cards failed to render');
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked: please allow popups to print the cards');
  }

  const cardsHtml = rendered
    .map(
      ({ card, dataUrl }) => `
        <div class="card">
          <img src="${dataUrl}" alt="TLA Membership Card ${escapeHtml(card.membershipNumber)}" />
        </div>`
    )
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>TLA Membership Cards (${rendered.length})</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; }
      .sheet {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8mm;
        justify-items: center;
      }
      .card {
        width: 86mm;
        height: 54mm;
        page-break-inside: avoid;
      }
      .card img {
        width: 86mm;
        height: 54mm;
        display: block;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Two cards per A4 page */
      .card:nth-child(2n) { page-break-after: always; }
      @media print {
        .sheet { gap: 8mm; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">${cardsHtml}</div>
    <script>
      window.onload = function () {
        setTimeout(function () { window.print(); }, 400);
      };
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
