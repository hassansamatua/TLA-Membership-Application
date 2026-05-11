import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

export async function generateMembershipCardPDF(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting PDF generation for membership card...');
    
    // Find the membership card element
    const cardElement = document.getElementById('membership-card-element');
    
    if (!cardElement) {
      throw new Error('Membership card element not found');
    }

    console.log('Found card element, capturing as canvas...');
    
    // Capture the card as a canvas with color handling fixes
    const canvas = await html2canvas(cardElement, {
      scale: 2, // Higher quality for printing
      backgroundColor: null, // Transparent background
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Fix for color parsing issues
      onclone: (clonedDoc) => {
        // Find all SVG elements and replace problematic color functions
        const svgElements = clonedDoc.querySelectorAll('svg');
        svgElements.forEach((svg) => {
          // Replace lab() and other unsupported color functions with hex values
          const elements = svg.querySelectorAll('*');
          elements.forEach((el) => {
            const styles = (el as SVGElement).getAttribute('style');
            if (styles) {
              // Replace any lab() color functions with hex equivalents
              const fixedStyles = styles
                .replace(/lab\([^)]+\)/g, '#10b981') // Replace lab colors with green
                .replace(/color-interpolation-filters/g, 'sRGB'); // Fix color interpolation
              (el as SVGElement).setAttribute('style', fixedStyles);
            }
            
            // Fix fill attributes that might use unsupported color functions
            const fill = (el as SVGElement).getAttribute('fill');
            if (fill && fill.includes('lab')) {
              (el as SVGElement).setAttribute('fill', '#10b981');
            }
            
            // Fix stop-color attributes
            const stopColor = (el as SVGElement).getAttribute('stop-color');
            if (stopColor && stopColor.includes('lab')) {
              (el as SVGElement).setAttribute('stop-color', '#10b981');
            }
          });
        });
      }
    });

    console.log('Canvas captured, creating PDF...');
    
    // Create PDF with credit card dimensions
    const pdfWidth = 336; // Same as card width
    const pdfHeight = 212; // Same as card height
    
    // Create PDF in landscape mode for better card display
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    // Add the card image to PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Generate filename with membership number and date
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    console.log('Saving PDF as:', fileName);
    
    // Save the PDF
    pdf.save(fileName);
    
    console.log('PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function printMembershipCard(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting print process for membership card...');
    
    // Generate PDF first
    await generateMembershipCardPDF(cardData);
    
    // After PDF is generated, open print dialog
    setTimeout(() => {
      window.print();
    }, 1000);
    
  } catch (error) {
    console.error('Error printing membership card:', error);
    throw error;
  }
}

// Alternative method: Create PDF from scratch using jsPDF drawing functions
export async function generateMembershipCardPDFNative(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Creating native PDF membership card...');
    
    // Create PDF with exact card dimensions
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size in mm
    });

    const cardWidth = 85.6;
    const cardHeight = 53.98;

    // Background gradient (simulated with rectangles)
    pdf.setFillColor(45, 62, 80); // #2d3e50
    pdf.rect(0, 0, cardWidth, cardHeight, 'F');

    // Green accent header
    pdf.setFillColor(16, 185, 129, 0.2); // rgba(16, 185, 129, 0.2)
    pdf.rect(0, 0, cardWidth, 12, 'F');

    // TLA Logo placeholder (you'd need to convert the logo to base64)
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255);
    pdf.text('TANZANIA LIBRARY AND', cardWidth * 0.6, 8);
    pdf.text('INFORMATION ASSOCIATION', cardWidth * 0.6, 11);
    pdf.setFontSize(5);
    pdf.setTextColor(16, 185, 129);
    pdf.text('(TLA)', cardWidth * 0.55, 13);

    // Member name
    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(4);
    pdf.text('MEMBER NAME', 5, 25);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    const userName = cardData.userName?.substring(0, 20) || 'Member Name';
    pdf.text(userName, 5, 30);

    // Membership number
    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(4);
    pdf.text('MEMBERSHIP No', 5, 35);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const membershipNumber = (cardData.membershipNumber || 'N/A').substring(0, 16);
    pdf.text(membershipNumber, 5, 40);

    // Membership type
    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(4);
    pdf.text('TYPE', 5, 45);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6);
    pdf.text((cardData.membershipType || 'Personal').toUpperCase(), 5, 49);

    // Phone number (if available)
    if (cardData.userPhone) {
      pdf.setTextColor(16, 185, 129);
      pdf.setFontSize(4);
      pdf.text('PHONE', cardWidth - 5, 45, { align: 'right' });
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(5);
      pdf.text(cardData.userPhone?.substring(0, 25) || 'N/A', cardWidth - 5, 49, { align: 'right' });
    }

    // Profile picture placeholder (circle with initial)
    if (cardData.profilePicture) {
      // You would need to convert the image to base64 and add it here
      // For now, we'll create a placeholder circle
      pdf.setFillColor(16, 185, 129);
      pdf.circle(cardWidth - 15, 35, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text(cardData.userName?.charAt(0)?.toUpperCase() || 'M', cardWidth - 15, 35, { align: 'center', baseline: 'middle' });
    }

    // Bottom text
    pdf.setTextColor(255, 255, 255, 0.7);
    pdf.setFontSize(3);
    pdf.text('Authorized Membership Card • TLA', 3, cardHeight - 2);

    // Save the PDF
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('Native PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating native PDF:', error);
    throw error;
  }
}
