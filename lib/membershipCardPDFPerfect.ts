import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

// Perfect PDF generation that exactly matches the display
export async function generateMembershipCardPDFPerfect(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting perfect PDF generation...');
    
    // Create a temporary div that exactly matches the displayed card design
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      width: 336px;
      height: 212px;
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    // Create the exact same SVG as in the component but with fixed colors
    tempDiv.innerHTML = `
      <svg width="336" height="212" xmlns="http://www.w3.org/2000/svg" style="position: absolute; inset: 0; border-radius: 16px; overflow: hidden;">
        <defs>
          <!-- Fixed gradients without lab() functions -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2d3e50" />
            <stop offset="50%" stop-color="#34495e" />
            <stop offset="100%" stop-color="#1a252f" />
          </linearGradient>
          
          <linearGradient id="greenAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          
          <pattern id="diagonalPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(16, 185, 129, 0.08)" stroke-width="20"/>
          </pattern>
          
          <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(16, 185, 129, 0.1)" />
            <stop offset="100%" stop-color="rgba(16, 185, 129, 0.05)" />
          </linearGradient>
        </defs>
        
        <!-- Main background -->
        <rect width="336" height="212" fill="url(#bgGradient)" rx="16" ry="16"/>
        
        <!-- Diagonal pattern overlay -->
        <rect width="336" height="212" fill="url(#diagonalPattern)" rx="16" ry="16"/>
        
        <!-- Green accent overlay for depth -->
        <rect width="336" height="212" fill="url(#overlay)" rx="16" ry="16"/>
        
        <!-- Large diagonal green stripe (top right) -->
        <polygon points="200,0 336,0 336,150 150,0" fill="rgba(16, 185, 129, 0.15)"/>
        
        <!-- Top header bar with green -->
        <rect width="336" height="50" fill="rgba(16, 185, 129, 0.2)" rx="16" ry="16"/>
        
        <!-- Logo Image -->
        <image href="/logo.png" x="9" y="4" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>
        
        <!-- Organization name -->
        <text x="190" y="30" font-family="Arial" font-size="12" font-weight="900" fill="white" text-anchor="middle">TANZANIA LIBRARY AND</text>
        <text x="190" y="50" font-family="Arial" font-size="12" font-weight="900" fill="white" text-anchor="middle">INFORMATION ASSOCIATION</text>
        <text x="175" y="70" font-family="Arial" font-size="10" fill="#10b981" text-anchor="middle" font-weight="600">(TLA)</text>
        
        <!-- Profile picture area -->
        <g>
          <rect x="233" y="67" width="90" height="90" fill="none" rx="8" ry="8"/>
          ${cardData.profilePicture ? `
            <defs>
              <clipPath id="profileClip">
                <rect x="233" y="67" width="90" height="90" rx="8" ry="8"/>
              </clipPath>
            </defs>
            <image href="${cardData.profilePicture}" x="233" y="67" width="90" height="90" clipPath="url(#profileClip)" preserveAspectRatio="xMidYMid slice"/>
          ` : `
            <rect x="233" y="67" width="90" height="90" fill="url(#greenAccent)" rx="8" ry="8"/>
            <text x="278" y="112" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${cardData.userName?.charAt(0)?.toUpperCase() || 'M'}</text>
          `}
        </g>
        
        <!-- Member name section -->
        <text x="20" y="95" font-family="Arial, sans-serif" font-size="8" fill="#10b981" font-weight="700" letter-spacing="1">MEMBER NAME</text>
        <text x="20" y="115" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="white">${cardData.userName?.substring(0, 20) || 'Member Name'}</text>
        
        <!-- Membership number -->
        <text x="20" y="130" font-family="Arial, sans-serif" font-size="8" fill="#10b981" font-weight="700" letter-spacing="0.5">MEMBERSHIP No</text>
        <text x="20" y="150" font-family="monospace" font-size="14" font-weight="bold" fill="white" letter-spacing="2">${(cardData.membershipNumber || 'N/A').substring(0, 16)}</text>
        
        <!-- Membership type and phone number side by side -->
        <g>
          <text x="20" y="170" font-family="Arial, sans-serif" font-size="7" fill="#10b981" font-weight="700">TYPE</text>
          <text x="20" y="185" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">
            ${(cardData.membershipType || 'Personal').toUpperCase()}
          </text>
          
          ${cardData.userPhone ? `
            <text x="165" y="170" font-family="Arial, sans-serif" font-size="7" fill="#10b981" font-weight="700" text-anchor="end">PHONE</text>
            <text x="201" y="185" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="end">
              ${cardData.userPhone?.substring(0, 25) || 'N/A'}
            </text>
          ` : ''}
        </g>
        
        <!-- Bottom accent bar with green -->
        <rect y="192" width="336" height="20" fill="rgba(16, 185, 129, 0.15)"/>
        <text x="16" y="205" font-family="Arial, sans-serif" font-size="8" fill="rgba(255, 255, 255, 0.7)">Authorized Membership Card • TLA</text>
      </svg>
    `;
    
    // Add to body temporarily
    document.body.appendChild(tempDiv);
    
    // Capture as canvas with high quality
    const canvas = await html2canvas(tempDiv, {
      scale: 3, // Even higher quality for perfect rendering
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // No need for onclone since we're using clean SVG
    });
    
    // Remove from body
    document.body.removeChild(tempDiv);
    
    // Create PDF with exact dimensions
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [336, 212]
    });

    // Add the card image to PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 336, 212);

    // Generate filename
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('Perfect PDF generated successfully!');
    
  } catch (error) {
    console.error('Error generating perfect PDF:', error);
    throw error;
  }
}

// Perfect print function
export async function printMembershipCardPerfect(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Starting perfect print process...');
    
    // Generate the perfect PDF first
    await generateMembershipCardPDFPerfect(cardData);
    
    // Open print dialog after a short delay
    setTimeout(() => {
      window.print();
    }, 1000);
    
  } catch (error) {
    console.error('Error printing membership card:', error);
    throw error;
  }
}
