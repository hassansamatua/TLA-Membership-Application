import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

// EXACT PDF generation - literally copies the displayed card
export async function generateMembershipCardPDFExact(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting EXACT PDF generation...');
    
    // Find the actual displayed card element
    const cardElement = document.getElementById('membership-card-element');
    
    if (!cardElement) {
      throw new Error('Membership card element not found');
    }

    console.log('Found the actual card element, creating exact copy...');
    
    // Clone the exact card element to preserve all styling
    const clonedCard = cardElement.cloneNode(true) as HTMLElement;
    
    // Make sure the cloned element has the same styles
    clonedCard.style.cssText = cardElement.style.cssText;
    clonedCard.style.position = 'absolute';
    clonedCard.style.left = '-9999px'; // Move off-screen
    clonedCard.style.top = '0';
    clonedCard.style.visibility = 'visible';
    
    // Add to body temporarily
    document.body.appendChild(clonedCard);
    
    // Fix any problematic SVG elements in the clone
    const svgElements = clonedCard.querySelectorAll('svg');
    svgElements.forEach((svg) => {
      // Remove any problematic color functions from the SVG
      const elements = svg.querySelectorAll('*');
      elements.forEach((el) => {
        const svgEl = el as SVGElement;
        
        // Fix style attributes
        const style = svgEl.getAttribute('style');
        if (style) {
          const fixedStyle = style
            .replace(/lab\([^)]*\)/g, '#10b981')
            .replace(/color-interpolation-filters/g, 'sRGB');
          svgEl.setAttribute('style', fixedStyle);
        }
        
        // Fix fill attributes
        const fill = svgEl.getAttribute('fill');
        if (fill && fill.includes('lab')) {
          svgEl.setAttribute('fill', '#10b981');
        }
        
        // Fix stop-color attributes
        const stopColor = svgEl.getAttribute('stop-color');
        if (stopColor && stopColor.includes('lab')) {
          svgEl.setAttribute('stop-color', '#10b981');
        }
      });
    });
    
    // Wait a moment for any dynamic content to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the exact clone as canvas
    const canvas = await html2canvas(clonedCard, {
      scale: 3, // High quality
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Don't use onclone since we're already working with a clone
    });
    
    // Remove from body
    document.body.removeChild(clonedCard);
    
    // Create PDF with exact dimensions
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [336, 212]
    });

    // Add the exact card image to PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 336, 212);

    // Generate filename
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('EXACT PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating exact PDF:', error);
    throw error;
  }
}

// Alternative: Direct DOM capture without cloning
export async function generateMembershipCardPDFDirect(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting direct PDF generation...');
    
    // Find the actual displayed card element
    const cardElement = document.getElementById('membership-card-element');
    
    if (!cardElement) {
      throw new Error('Membership card element not found');
    }

    console.log('Capturing the actual displayed card...');
    
    // Temporarily make sure the card is visible and positioned correctly
    const originalPosition = cardElement.style.position;
    const originalZIndex = cardElement.style.zIndex;
    
    cardElement.style.position = 'relative';
    cardElement.style.zIndex = '9999';
    
    // Capture the actual card element directly
    const canvas = await html2canvas(cardElement, {
      scale: 3, // High quality
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Fix color issues during capture
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById('membership-card-element');
        if (clonedCard) {
          // Fix any color issues in the cloned document
          const svgElements = clonedCard.querySelectorAll('svg');
          svgElements.forEach((svg) => {
            const elements = svg.querySelectorAll('*');
            elements.forEach((el) => {
              const svgEl = el as SVGElement;
              const style = svgEl.getAttribute('style');
              if (style) {
                const fixedStyle = style.replace(/lab\([^)]*\)/g, '#10b981');
                svgEl.setAttribute('style', fixedStyle);
              }
            });
          });
        }
      }
    });
    
    // Restore original styles
    cardElement.style.position = originalPosition;
    cardElement.style.zIndex = originalZIndex;
    
    // Create PDF with exact dimensions
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [336, 212]
    });

    // Add the exact card image to PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 336, 212);

    // Generate filename
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('Direct PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating direct PDF:', error);
    throw error;
  }
}

// Print functions using the exact methods
export async function printMembershipCardExact(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting exact print process...');
    
    // Generate the exact PDF first
    await generateMembershipCardPDFExact(cardData);
    
    // Open print dialog after a short delay
    setTimeout(() => {
      window.print();
    }, 1000);
    
  } catch (error) {
    console.error('Error printing membership card:', error);
    throw error;
  }
}

export async function printMembershipCardDirect(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting direct print process...');
    
    // Generate the direct PDF first
    await generateMembershipCardPDFDirect(cardData);
    
    // Open print dialog after a short delay
    setTimeout(() => {
      window.print();
    }, 1000);
    
  } catch (error) {
    console.error('Error printing membership card:', error);
    throw error;
  }
}
