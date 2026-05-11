import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

// Alternative PDF generation using native jsPDF drawing (no SVG conversion)
export async function generateMembershipCardPDFNative(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting native PDF generation for membership card...');
    
    // Create PDF with exact card dimensions (credit card size)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size in mm
    });

    const cardWidth = 85.6;
    const cardHeight = 53.98;

    // Background gradient (simulated with rectangles)
    // Main background - dark gray
    pdf.setFillColor(45, 62, 80); // #2d3e50
    pdf.rect(0, 0, cardWidth, cardHeight, 'F');

    // Green accent header
    pdf.setFillColor(16, 185, 129, 0.2); // rgba(16, 185, 129, 0.2)
    pdf.rect(0, 0, cardWidth, 12, 'F');

    // Add diagonal stripe pattern (simplified)
    pdf.setDrawColor(16, 185, 129, 0.1);
    for (let i = -cardHeight; i < cardWidth; i += 8) {
      pdf.line(i, 0, i + cardHeight, cardHeight);
    }

    // TLA Logo area (simplified text representation)
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255);
    pdf.text('TANZANIA LIBRARY', cardWidth * 0.6, 8);
    pdf.text('AND INFORMATION', cardWidth * 0.6, 11);
    pdf.text('ASSOCIATION', cardWidth * 0.6, 14);
    pdf.setFontSize(5);
    pdf.setTextColor(16, 185, 129);
    pdf.text('(TLA)', cardWidth * 0.55, 16);

    // Profile picture area
    const profileX = cardWidth - 20;
    const profileY = 18;
    const profileSize = 15;
    
    // Profile frame
    pdf.setDrawColor(16, 185, 129);
    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(profileX, profileY, profileSize, profileSize, 2, 2, 'F');
    
    // Profile initial
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    const initial = cardData.userName?.charAt(0)?.toUpperCase() || 'M';
    pdf.text(initial, profileX + profileSize/2, profileY + profileSize/2 + 1, { align: 'center' });

    // Member name section
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
    pdf.setFont('helvetica', 'normal');
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

    // Bottom accent bar
    pdf.setFillColor(16, 185, 129, 0.15);
    pdf.rect(0, cardHeight - 5, cardWidth, 5, 'F');
    
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

// Fallback method: Create a simplified HTML version for canvas conversion
export async function generateMembershipCardPDFFallback(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting fallback PDF generation...');
    
    // Create a temporary div with simplified HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      width: 336px;
      height: 212px;
      background: linear-gradient(135deg, #2d3e50 0%, #34495e 50%, #1a252f 100%);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      font-family: Arial, sans-serif;
      color: white;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    tempDiv.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
        <div style="font-size: 12px; font-weight: bold; text-align: center;">TANZANIA LIBRARY AND INFORMATION ASSOCIATION</div>
        <div style="font-size: 10px; color: #10b981; text-align: center;">(TLA)</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <div style="font-size: 8px; color: #10b981; font-weight: bold; margin-bottom: 2px;">MEMBER NAME</div>
          <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">${cardData.userName?.substring(0, 20) || 'Member Name'}</div>
          
          <div style="font-size: 8px; color: #10b981; font-weight: bold; margin-bottom: 2px;">MEMBERSHIP No</div>
          <div style="font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 2px; margin-bottom: 8px;">${(cardData.membershipNumber || 'N/A').substring(0, 16)}</div>
          
          <div style="display: flex; justify-content: space-between;">
            <div>
              <div style="font-size: 7px; color: #10b981; font-weight: bold;">TYPE</div>
              <div style="font-size: 11px; font-weight: bold;">${(cardData.membershipType || 'Personal').toUpperCase()}</div>
            </div>
            ${cardData.userPhone ? `
              <div style="text-align: right;">
                <div style="font-size: 7px; color: #10b981; font-weight: bold;">PHONE</div>
                <div style="font-size: 9px; font-weight: bold;">${cardData.userPhone?.substring(0, 25)}</div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="width: 90px; height: 90px; background: #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-left: 15px;">
          <div style="font-size: 40px; font-weight: bold;">${cardData.userName?.charAt(0)?.toUpperCase() || 'M'}</div>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 5px; left: 10px; right: 10px; text-align: center; font-size: 8px; color: rgba(255, 255, 255, 0.7);">
        Authorized Membership Card • TLA
      </div>
    `;
    
    // Add to body temporarily
    document.body.appendChild(tempDiv);
    
    // Capture as canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true
    });
    
    // Remove from body
    document.body.removeChild(tempDiv);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [336, 212]
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 336, 212);

    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('Fallback PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating fallback PDF:', error);
    throw error;
  }
}
