import jsPDF from 'jspdf';
import { loadImageComprehensive } from './imageLoader';

export interface MembershipCardData {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
}

// Helper function for rounded rectangles (polyfill for older browsers)
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Create a base template image of the membership card
export async function createMembershipCardTemplate(): Promise<string> {
  try {
    console.log('Creating ULTRA HIGH QUALITY membership card template...');
    
    // Create an ULTRA high-resolution canvas (4x scale for TOP quality)
    const scale = 4; // Increased from 3 to 4 for maximum quality
    const canvas = document.createElement('canvas');
    canvas.width = 336 * scale;
    canvas.height = 212 * scale;
    const ctx = canvas.getContext('2d')!;
    
    // Scale context for ULTRA high DPI rendering
    ctx.scale(scale, scale);
    
    // Enable BEST image rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set best possible text rendering
    (ctx as any).textRenderingOptimization = 'optimizeQuality';
    (ctx as any).globalAlpha = 1.0;
    
    // Draw the exact background design from the SVG
    // 1. Main background gradient
    const gradient = ctx.createLinearGradient(0, 0, 336, 212);
    gradient.addColorStop(0, '#2d3e50');
    gradient.addColorStop(0.5, '#34495e');
    gradient.addColorStop(1, '#1a252f');
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, 336, 212, 16);
    ctx.fill();
    
    // 2. Diagonal pattern overlay
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 20;
    for (let i = -212; i < 336; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 212, 212);
      ctx.stroke();
    }
    
    // 3. Green accent overlay
    const overlayGradient = ctx.createLinearGradient(0, 0, 336, 212);
    overlayGradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
    overlayGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    ctx.fillStyle = overlayGradient;
    roundRect(ctx, 0, 0, 336, 212, 16);
    ctx.fill();
    
    // 4. Large diagonal green stripe
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(336, 0);
    ctx.lineTo(336, 150);
    ctx.lineTo(150, 0);
    ctx.closePath();
    ctx.fill();
    
    // 5. Top header bar
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    roundRect(ctx, 0, 0, 336, 50, 16);
    ctx.fill();
    
    // 6. Draw TLA logo area - Load actual logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo (3).png'; // Use the same path as the SVG
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => {
          console.warn('Logo image failed to load, using text fallback');
          resolve(null); // Continue without logo
        };
      });
      
      // Draw the logo if loaded successfully
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, -20, -20, 130, 130);
      } else {
        // Fallback: Draw TLA text logo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TLA', 65, 65);
      }
    } catch (logoError) {
      console.warn('Logo loading error:', logoError);
      // Fallback: Draw TLA text logo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TLA', 65, 65);
    }
    
    // 7. Organization name text - EXACT match to SVG
    ctx.fillStyle = 'white';
    ctx.font = '900 12px Arial'; // font-weight 900 matches SVG font-weight="900"
    ctx.textAlign = 'center';
    ctx.fillText('TANZANIA LIBRARY AND', 190, 30);
    ctx.fillText('INFORMATION ASSOCIATION', 190, 50);
    
    ctx.font = '600 10px Arial'; // font-weight 600 matches SVG font-weight="600"
    ctx.fillStyle = '#10b981';
    ctx.fillText('(TLA)', 175, 70);
    
    // 8. Profile picture placeholder area
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, 233, 67, 90, 90, 8);
    ctx.stroke();
    
    // 9. Labels (static text) - EXACT match to SVG
    ctx.fillStyle = '#10b981';
    ctx.font = '700 8px Arial'; // font-weight 700 matches SVG font-weight="700"
    ctx.textAlign = 'left';
    ctx.fillText('MEMBER NAME', 20, 95);
    ctx.fillText('MEMBERSHIP No', 20, 130);
    ctx.fillText('TYPE', 20, 170);
    ctx.fillText('PHONE', 165, 170);
    
    // 10. Bottom accent bar
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(0, 192, 336, 20);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '8px Arial';
    ctx.fillText('Authorized Membership Card • TLA', 16, 205);
    
    // Convert to data URL at MAXIMUM quality
    const templateDataURL = canvas.toDataURL('image/png', 1.0);
    console.log('ULTRA HIGH QUALITY template created successfully');
    
    return templateDataURL;
    
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

// Overlay data on the template and create final card
export async function createMembershipCardWithData(cardData: MembershipCardData): Promise<string> {
  try {
    console.log('Creating ULTRA HIGH QUALITY membership card with data...');
    
    // Get the base template
    const templateDataURL = await createMembershipCardTemplate();
    
    // Create a new ULTRA high-resolution canvas for the final card
    const scale = 4; // Increased to 4x for maximum quality
    const canvas = document.createElement('canvas');
    canvas.width = 336 * scale;
    canvas.height = 212 * scale;
    const ctx = canvas.getContext('2d')!;
    
    // Scale context for ULTRA high DPI rendering
    ctx.scale(scale, scale);
    
    // Enable BEST image rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set best possible text rendering
    (ctx as any).textRenderingOptimization = 'optimizeQuality';
    (ctx as any).globalAlpha = 1.0;
    
    // Draw the template first
    const img = new Image();
    img.src = templateDataURL;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    ctx.drawImage(img, 0, 0, 336, 212);
    
    // Now overlay the dynamic data with exact SVG matching
    
    // 1. Profile picture or initial - Comprehensive loading
    if (cardData.profilePicture && cardData.profilePicture.trim() !== '') {
      console.log('Loading profile picture with comprehensive method:', cardData.profilePicture);
      
      const profileImg = await loadImageComprehensive(cardData.profilePicture);
      
      if (profileImg && profileImg.complete && profileImg.naturalWidth > 0) {
        console.log('Profile picture loaded successfully, dimensions:', profileImg.naturalWidth, 'x', profileImg.naturalHeight);
        
        // Create rounded rectangle for profile picture
        ctx.save();
        roundRect(ctx, 233, 67, 90, 90, 8);
        ctx.clip();
        
        // Calculate aspect ratio to cover the area properly
        const imgRatio = profileImg.naturalWidth / profileImg.naturalHeight;
        const targetRatio = 90 / 90; // Square target
        
        let drawWidth = 90;
        let drawHeight = 90;
        let drawX = 233;
        let drawY = 67;
        
        if (imgRatio > targetRatio) {
          // Image is wider than tall
          drawHeight = 90 / imgRatio;
          drawY = 67 + (90 - drawHeight) / 2;
        } else {
          // Image is taller than wide
          drawWidth = 90 * imgRatio;
          drawX = 233 + (90 - drawWidth) / 2;
        }
        
        ctx.drawImage(profileImg, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        console.log('Profile picture drawn successfully');
      } else {
        console.log('Profile picture failed to load with all methods, using initial fallback');
        drawProfileInitial(ctx, cardData.userName);
      }
    } else {
      console.log('No profile picture provided, using initial');
      drawProfileInitial(ctx, cardData.userName);
    }
    
    // 2. User name - EXACT match to SVG (fontSize="13" fontWeight="bold")
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Arial'; // matches SVG fontSize="13" fontWeight="bold"
    ctx.textAlign = 'left';
    ctx.fillText(cardData.userName?.substring(0, 20) || 'Member Name', 20, 115);
    
    // 3. Membership number - EXACT match to SVG (fontSize="14" fontWeight="bold" fontFamily="monospace" letterSpacing="2")
    ctx.font = 'bold 14px monospace'; // matches SVG fontSize="14" fontWeight="bold" fontFamily="monospace"
    // Simulate letter spacing by adding spaces between characters
    const membershipNumber = (cardData.membershipNumber || 'N/A').substring(0, 16);
    const spacedNumber = membershipNumber.split('').join(' ');
    ctx.fillText(spacedNumber, 20, 150);
    
    // 4. Membership type - EXACT match to SVG (fontSize="11" fontWeight="bold")
    ctx.font = 'bold 11px Arial'; // matches SVG fontSize="11" fontWeight="bold"
    ctx.fillText((cardData.membershipType || 'Personal').toUpperCase(), 20, 185);
    
    // 5. Phone number - EXACT match to SVG (fontSize="9" fontWeight="bold")
    if (cardData.userPhone) {
      ctx.font = 'bold 9px Arial'; // matches SVG fontSize="9" fontWeight="bold"
      ctx.textAlign = 'right';
      ctx.fillText(cardData.userPhone?.substring(0, 25) || 'N/A', 201, 185);
    }
    
    // Convert to final data URL at MAXIMUM quality
    const finalDataURL = canvas.toDataURL('image/png', 1.0);
    console.log('ULTRA HIGH QUALITY final card created successfully');
    
    return finalDataURL;
    
  } catch (error) {
    console.error('Error creating card with data:', error);
    throw error;
  }
}

// Helper function to draw profile initial
function drawProfileInitial(ctx: CanvasRenderingContext2D, userName?: string) {
  // Background for initial - EXACT match to SVG gradient
  const gradient = ctx.createLinearGradient(233, 67, 323, 157);
  gradient.addColorStop(0, '#10b981'); // matches SVG stop-color="#10b981"
  gradient.addColorStop(1, '#059669'); // matches SVG stop-color="#059669"
  ctx.fillStyle = gradient;
  roundRect(ctx, 233, 67, 90, 90, 8);
  ctx.fill();
  
  // Initial text - EXACT match to SVG (fontSize="40" fontWeight="bold")
  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px Arial'; // matches SVG fontSize="40" fontWeight="bold"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(userName?.charAt(0)?.toUpperCase() || 'M', 278, 112);
}

// Generate PDF from the final card image
export async function generateMembershipCardPDFFromTemplate(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Generating ULTIMATE TOP QUALITY PDF with rounded corners...');
    
    // Create the final card with data (already ULTRA high resolution)
    const finalCardDataURL = await createMembershipCardWithData(cardData);
    
    // Create an ULTIMATE high-resolution canvas to apply rounded corners
    const scale = 4; // ULTIMATE 4x scale for TOP quality
    const canvas = document.createElement('canvas');
    canvas.width = 336 * scale;
    canvas.height = 212 * scale;
    const ctx = canvas.getContext('2d')!;
    
    // Scale context for ULTIMATE high DPI rendering
    ctx.scale(scale, scale);
    
    // Enable BEST image rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set best possible text rendering
    (ctx as any).textRenderingOptimization = 'optimizeQuality';
    (ctx as any).globalAlpha = 1.0;
    
    // Load the final card image
    const img = new Image();
    img.src = finalCardDataURL;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // Apply rounded corners clipping at ULTIMATE high resolution
    ctx.save();
    roundRect(ctx, 0, 0, 336, 212, 16);
    ctx.clip();
    
    // Draw the ULTIMATE high-resolution image with rounded corners
    ctx.drawImage(img, 0, 0, 336, 212);
    ctx.restore();
    
    // Convert to ULTIMATE quality data URL with rounded corners
    const roundedCardDataURL = canvas.toDataURL('image/png', 1.0);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [336, 212]
    });
    
    // Add the ULTIMATE quality rounded card image to PDF
    pdf.addImage(roundedCardDataURL, 'PNG', 0, 0, 336, 212);
    
    // Generate filename
    const fileName = `TLA_Membership_Card_${cardData.membershipNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('ULTIMATE TOP QUALITY PDF with rounded corners generated successfully!');
    
  } catch (error) {
    console.error('Error generating PDF from template:', error);
    throw error;
  }
}

// Print from template
export async function printMembershipCardFromTemplate(cardData: MembershipCardData): Promise<void> {
  try {
    console.log('Printing from template...');
    
    // Generate PDF first
    await generateMembershipCardPDFFromTemplate(cardData);
    
    // Open print dialog
    setTimeout(() => {
      window.print();
    }, 1000);
    
  } catch (error) {
    console.error('Error printing from template:', error);
    throw error;
  }
}
