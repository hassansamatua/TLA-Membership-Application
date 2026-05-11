import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

// DIRECT method - captures the actual displayed card element
export async function generateMembershipCardPDFDirect(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting DIRECT PDF generation from displayed card...');
    
    // Find the actual displayed card element
    const cardElement = document.getElementById('membership-card-element');
    
    if (!cardElement) {
      throw new Error('Membership card element not found on page');
    }

    console.log('Found the actual displayed card element');
    
    // Make sure the card is visible and properly positioned
    const originalPosition = cardElement.style.position;
    const originalZIndex = cardElement.style.zIndex;
    const originalVisibility = cardElement.style.visibility;
    
    // Temporarily ensure the card is visible
    cardElement.style.position = 'relative';
    cardElement.style.zIndex = '9999';
    cardElement.style.visibility = 'visible';
    
    // Wait a moment for any dynamic content to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the actual displayed card element directly
    const canvas = await html2canvas(cardElement, {
      scale: 4, // ULTRA high quality
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Enhanced settings for better quality
      windowWidth: 336,
      windowHeight: 212,
      scrollX: 0,
      scrollY: 0,
      // Fix any color issues during capture
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById('membership-card-element');
        if (clonedCard) {
          // Ensure all images in the clone are loaded
          const images = clonedCard.querySelectorAll('img');
          images.forEach((img) => {
            const imgEl = img as HTMLImageElement;
            if (!imgEl.complete) {
              imgEl.style.display = 'none'; // Hide unloaded images
            }
          });
        }
      }
    });
    
    // Restore original styles
    cardElement.style.position = originalPosition;
    cardElement.style.zIndex = originalZIndex;
    cardElement.style.visibility = originalVisibility;
    
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
    
    console.log('DIRECT PDF generated successfully from displayed card!');
    
  } catch (error) {
    console.error('Error generating direct PDF:', error);
    throw error;
  }
}

// Print function using the direct method
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
