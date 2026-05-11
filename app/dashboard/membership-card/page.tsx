"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiDownload, FiShare2, FiPrinter, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';

interface MembershipStatus {
  success: boolean;
  cycle?: {
    year: number;
    startDate: string;
    dueDate: string;
    expiryDate: string;
  };
  membership?: {
    membershipNumber: string;
    membershipType: string;
    status: string;
    paymentStatus: string;
    joinedDate: string;
    expiryDate: string;
    amountPaid: number | string;
  } | null;
  canAccessIdCard?: boolean;
}

export default function MembershipCardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [printInProgress, setPrintInProgress] = useState(false);

  const loadMembershipStatus = async () => {
    try {
      const res = await fetch('/api/membership/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMembershipStatus(data);
        console.log('🔍 Membership Card - Refreshed membership status:', data);
      } else {
        setError('Failed to load membership status');
      }
    } catch (err) {
      setError('Error loading membership status');
      console.error('Error loading membership status:', err);
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1); // Force re-render
    loadMembershipStatus(); // Reload data
  };

  useEffect(() => {
    loadMembershipStatus();
  }, [refreshKey]);

  const handleDownload = async () => {
    // Prevent multiple downloads
    if (downloadInProgress) {
      console.log('⚠️ Download already in progress, ignoring...');
      return;
    }
    setDownloadInProgress(true);
    
    console.log('🎨 Starting card download with pure canvas method...');
    
    try {
      // Create canvas with exact actual card size (85.6mm × 54mm at 300 DPI)
      const cardWidthMM = 85.6; // Standard credit card width in mm
      const cardHeightMM = 54;   // Standard credit card height in mm
      const dpi = 300; // High DPI for print quality
      const mmToPx = dpi / 25.4; // Convert mm to pixels
      
      const canvasWidth = Math.round(cardWidthMM * mmToPx);
      const canvasHeight = Math.round(cardHeightMM * mmToPx);
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d')!;
      
      // Set transparent background
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // No scaling needed since we're using exact dimensions
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Create rounded corners for the entire card
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasWidth, canvasHeight, 16);
      ctx.clip();
      
      // Fill with transparent background first
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw main background gradient (matching the displayed card)
      const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      bgGradient.addColorStop(0, '#2d3e50');
      bgGradient.addColorStop(0.5, '#34495e');
      bgGradient.addColorStop(1, '#1a252f');
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasWidth, canvasHeight, 16);
      ctx.fill();
      
      // Draw diagonal pattern overlay (matching the displayed card)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.round(20 * (canvasWidth / 336)); // Scale line width
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate(Math.PI / 4); // 45 degree rotation
      for (let i = -canvasHeight; i < canvasWidth; i += Math.round(60 * (canvasWidth / 336))) {
        ctx.beginPath();
        ctx.moveTo(i, -canvasHeight);
        ctx.lineTo(i, canvasHeight);
        ctx.stroke();
      }
      ctx.restore();
      
      // Draw green overlay for depth
      const overlayGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      overlayGradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
      overlayGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
      ctx.fillStyle = overlayGradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasWidth, canvasHeight, 16);
      ctx.fill();
      
      // Draw large diagonal green stripe (top right)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.beginPath();
      ctx.moveTo(canvasWidth * 0.6, 0);
      ctx.lineTo(canvasWidth, 0);
      ctx.lineTo(canvasWidth, canvasHeight * 0.7);
      ctx.lineTo(canvasWidth * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      
      // Draw top header bar with green
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasWidth, canvasHeight * 0.23, 16);
      ctx.fill();
      
      // Draw TLA logo image
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo (3).png';
      
      // Draw profile picture
      const profileImg = new Image();
      profileImg.crossOrigin = 'anonymous';
      
      // Set profile picture source if available
      if (user?.profile?.personalInfo?.profilePicture) {
        const profilePath = user.profile.personalInfo.profilePicture.startsWith('/uploads/') 
          ? user.profile.personalInfo.profilePicture 
          : `/uploads/profile-pictures/${user.profile.personalInfo.profilePicture?.split('/').pop()}`;
        profileImg.src = profilePath;
      }
      
      // Define completeCardDrawing function first
      const completeCardDrawing = () => {
        // Draw organization name
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(12 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('TANZANIA LIBRARY AND', canvasWidth / 2, canvasHeight * 0.15);
        ctx.fillText('INFORMATION ASSOCIATION', canvasWidth / 2, canvasHeight * 0.23);
        
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(10 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText('(TLA)', canvasWidth / 2, canvasHeight * 0.29);
        
        // Draw member name section
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(8 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('MEMBER NAME', canvasWidth * 0.05, canvasHeight * 0.35);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(13 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText((user?.name || 'Member Name').toUpperCase(), canvasWidth * 0.05, canvasHeight * 0.43);
        
        // Draw membership number
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(8 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText('MEMBERSHIP No', canvasWidth * 0.05, canvasHeight * 0.52); // Moved up more
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(14 * (canvasWidth / 336))}px monospace`;
        const membershipNumber = membershipStatus?.membership?.membershipNumber || 'N/A';
        const spacedNumber = membershipNumber.substring(0, 16).split('').join(' ');
        ctx.fillText(spacedNumber, canvasWidth * 0.05, canvasHeight * 0.60); // Moved up more
        
        // Draw membership type
        const typeY = canvasHeight * 0.72; // Moved up
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(7 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText('TYPE', canvasWidth * 0.05, typeY - canvasHeight * 0.06); // Increased gap
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(11 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText(membershipStatus?.membership?.membershipType?.toUpperCase() || 'PERSONAL', canvasWidth * 0.05, typeY);
        
        // Draw phone number if available
        const phoneY = typeY + canvasHeight * 0.13; // Moved up (reduced gap)
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(7 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.fillText('PHONE', canvasWidth * 0.05, phoneY - canvasHeight * 0.06); // Increased gap
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.round(11 * (canvasWidth / 336))}px Arial, sans-serif`;
        
        // Use the same path as the displayed card
        const phone = user?.profile?.contactInfo?.phone || 'N/A';
        console.log('Found phone:', phone);
        ctx.fillText(phone, canvasWidth * 0.05, phoneY);
        
        // Draw card details strip
        const stripGradient = ctx.createLinearGradient(0, canvasHeight * 0.9, 0, canvasHeight);
        stripGradient.addColorStop(0, 'rgba(20, 83, 45, 0.4)'); // More transparent
        stripGradient.addColorStop(1, 'rgba(5, 46, 22, 0.4)'); // More transparent
        ctx.fillStyle = stripGradient;
        ctx.globalAlpha = 0.4; // Reduced from 0.8 to 0.4
        ctx.fillRect(0, canvasHeight * 0.9, canvasWidth, canvasHeight * 0.1);
        ctx.globalAlpha = 1;
        
        // Draw strip text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${Math.round(8 * (canvasWidth / 336))}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('Authorized Membership Card • Tanzania Library Association', canvasWidth * 0.05, canvasHeight * 0.97);
        
        // Convert canvas to PDF and download
        console.log('💾 Converting canvas to PDF...');
        
        // Restore context to remove clipping before creating PDF
        ctx.restore();
        
        // Create a new canvas with rounded corners for PDF
        const roundedCanvas = document.createElement('canvas');
        roundedCanvas.width = canvasWidth;
        roundedCanvas.height = canvasHeight;
        const roundedCtx = roundedCanvas.getContext('2d')!;
        
        // Clear and set transparent background
        roundedCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Create rounded clipping path
        roundedCtx.save();
        roundedCtx.beginPath();
        roundedCtx.roundRect(0, 0, canvasWidth, canvasHeight, 16);
        roundedCtx.clip();
        
        // Draw the original canvas onto the rounded canvas
        roundedCtx.drawImage(canvas, 0, 0);
        roundedCtx.restore();
        
        // Create PDF from rounded canvas
        roundedCanvas.toBlob((blob) => {
          if (blob) {
            // Create a temporary image to get the rounded canvas data
            const img = new Image();
            img.onload = () => {
              // Dynamically import jsPDF
              import('jspdf').then((jsPDF) => {
                const { jsPDF: JsPDF } = jsPDF;
                
                // Create PDF with exact card dimensions (85.6mm × 54mm)
                const pdf = new JsPDF({
                  orientation: 'landscape',
                  unit: 'mm',
                  format: [cardWidthMM, cardHeightMM]
                });
                
                // Add the rounded card image to PDF with transparency support
                const pdfWidth = cardWidthMM;
                const pdfHeight = cardHeightMM;
                pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                
                // Save the PDF
                pdf.save(`membership-card-${membershipStatus?.membership?.membershipNumber || 'member'}.pdf`);
                console.log('🎉 PDF download completed!');
              }).catch((error) => {
                console.error('❌ Error loading jsPDF:', error);
                // Fallback to PNG if jsPDF fails
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `membership-card-${membershipStatus?.membership?.membershipNumber || 'member'}.png`;
                a.click();
                URL.revokeObjectURL(url);
                console.log('🎉 PNG download completed (fallback)');
              });
            };
            img.src = URL.createObjectURL(blob);
          } else {
            console.error('❌ Failed to create image blob');
          }
          setDownloadInProgress(false);
        }, 'image/png', 1.0);
      };
      
      // Wait for images to load and then draw them
      const drawImages = () => {
        // Draw logo image
        if (logoImg.complete) {
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.drawImage(logoImg, -5 * (canvasWidth / 336), -5 * (canvasHeight / 212), 100 * (canvasWidth / 336), 70 * (canvasHeight / 212));
          ctx.restore();
        }
        
        // Draw profile picture as large rectangle covering right side
        if (profileImg.complete && user?.profile?.personalInfo?.profilePicture) {
          ctx.save();
          // Create smaller rectangle covering right side of card
          ctx.beginPath();
          ctx.roundRect(canvasWidth * 0.71, canvasHeight * 0.35, canvasWidth * 0.24, canvasHeight * 0.47, 8);
          ctx.clip();
          ctx.drawImage(profileImg, canvasWidth * 0.71, canvasHeight * 0.35, canvasWidth * 0.24, canvasHeight * 0.47);
          ctx.restore();
          // No border - blends with card background
        } else {
          // Draw profile initial directly on card background (no rectangle)
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.round(24 * (canvasWidth / 336))}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(user?.name?.charAt(0)?.toUpperCase() || 'M', canvasWidth * 0.83, canvasHeight * 0.59);
        }
        
        // Continue with the rest of the card drawing...
        completeCardDrawing();
      };
      
      // Load images and then draw
      logoImg.onload = () => {
        if (profileImg.complete || !user?.profile?.personalInfo?.profilePicture) {
          drawImages();
        }
      };
      
      profileImg.onload = () => {
        if (logoImg.complete) {
          drawImages();
        }
      };
      
      // Handle image load errors
      logoImg.onerror = () => {
        console.log('Logo image failed to load, using fallback');
        drawImages();
      };
      
      profileImg.onerror = () => {
        console.log('Profile image failed to load, using initial');
        drawImages();
      };
      
      // If images are already cached, draw immediately
      if (logoImg.complete && (profileImg.complete || !user?.profile?.personalInfo?.profilePicture)) {
        drawImages();
      }
      
      } catch (error) {
      console.error('❌ Error generating card image:', error);
      alert('Failed to download membership card. Please try again.');
      setDownloadInProgress(false);
    }
  };

  const handlePrint = () => {
    // Prevent multiple prints
    if (printInProgress) {
      console.log('⚠️ Print already in progress, ignoring...');
      return;
    }
    setPrintInProgress(true);
    
    // Create a print-specific version with SVG for better color preservation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      setPrintInProgress(false);
      return;
    }

    const phone = (() => {
      const phone1 = (user?.profile as any)?.phone;
      const contactInfo = (user?.profile as any)?.contact_info;
      let phone2 = null;
      try {
        phone2 = JSON.parse(contactInfo || '{}')?.phone;
      } catch (e) {
        return '+255 XXX XXX XXX';
      }
      return phone1 || phone2 || '+255 XXX XXX XXX';
    })();

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TLA Membership Card</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .card-container {
            width: 336px;
            height: 212px;
            position: relative;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <svg width="336" height="212" xmlns="http://www.w3.org/2000/svg" style="border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.2);">
            <!-- Gradients and patterns -->
            <defs>
              <!-- Main gradient: Gray to dark gray -->
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#2d3e50;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#34495e;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1a252f;stop-opacity:1" />
              </linearGradient>
              
              <!-- Green accent gradient -->
              <linearGradient id="greenAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
              </linearGradient>
              
              <!-- Diagonal stripe pattern -->
              <pattern id="diagonalPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(16, 185, 129, 0.08)" stroke-width="20"/>
              </pattern>
              
              <!-- Semi-transparent overlay for depth -->
              <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(16, 185, 129, 0.1);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgba(16, 185, 129, 0.05);stop-opacity:1" />
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
            
            <!-- TLA Logo and name header -->
            <!-- Logo background - circular with white -->
            <circle cx="36" cy="28" r="20" fill="white" stroke="rgba(16, 185, 129, 0.3)" stroke-width="2"/>
            <text x="36" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#059669" text-anchor="middle" dominant-baseline="middle">TLA</text>
            
            <!-- Organization name -->
            <text x="168" y="32" font-family="Arial" font-size="12" font-weight="900" fill="white" text-anchor="middle">TANZANIA LIBRARY AND</text>
            <text x="168" y="48" font-family="Arial" font-size="12" font-weight="900" fill="white" text-anchor="middle">INFORMATION ASSOCIATION</text>
            <text x="168" y="62" font-family="Arial" font-size="10" fill="#10b981" text-anchor="middle" font-weight="600">(TLA)</text>
            
            <!-- Profile picture with proper fallback -->
            <g>
              <!-- Profile background circle -->
              <circle cx="296" cy="32" r="20" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.4)" stroke-width="2"/>
              <circle cx="296" cy="32" r="19" fill="url(#greenAccent)" stroke="white" stroke-width="1.5"/>
              <!-- Profile initial or image placeholder -->
              <text x="296" y="32" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${user?.name?.charAt(0)?.toUpperCase() || 'M'}</text>
            </g>
            <!-- Member name section - aligned with TLA logo left edge (x=16) -->
            <text x="16" y="75" font-family="Arial, sans-serif" font-size="8" fill="#10b981" font-weight="700" letter-spacing="1">MEMBER NAME</text>
            <text x="16" y="92" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="white">${user?.name?.substring(0, 20) || 'Member Name'}</text>
            
            <!-- Membership number - aligned with TLA logo left edge (x=16) -->
            <g>
              <text x="16" y="120" font-family="Arial, sans-serif" font-size="8" fill="#10b981" font-weight="700" letter-spacing="0.5">MEMBERSHIP No</text>
              <!-- Display membership number as spaced groups -->
              <text x="16" y="138" font-family="monospace" font-size="14" font-weight="bold" fill="white" letter-spacing="2">${(user?.membershipNumber || membershipStatus?.membership?.membershipNumber || 'N/A').substring(0, 16).split('').join(' ')}</text>
            </g>
            
            <!-- Bottom section with details -->
            <g>
              
              <!-- Membership type -->
              <text x="150" y="162" font-family="Arial, sans-serif" font-size="7" fill="#10b981" font-weight="700">TYPE</text>
              <text x="150" y="174" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white">${membershipStatus?.membership?.membershipType?.toUpperCase() || 'PERSONAL'}</text>
              
            </g>
            
            <!-- Bottom accent bar with green -->
            <rect y="192" width="336" height="20" fill="rgba(16, 185, 129, 0.15)"/>
            <text x="16" y="205" font-family="Arial, sans-serif" font-size="8" fill="rgba(255, 255, 255, 0.7)">Authorized Membership Card • Tanzania Library Association</text>
          </svg>
          </svg>
            <!-- Card strip -->
            <rect x="0" y="192" width="336" height="20" fill="url(#stripGradient)"/>
          </svg>
        </div>
        
        <script>
          // Auto print and close
          window.onload = function() {
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Reset the guard when print window closes
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed);
        setPrintInProgress(false);
        console.log('🖨️ Print window closed');
      }
    }, 1000);
    
    // Also reset after 10 seconds as fallback
    setTimeout(() => {
      setPrintInProgress(false);
    }, 10000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TLA Membership Card',
          text: `Check out my Tanzania Library Association membership card! Member #${membershipStatus?.membership?.membershipNumber}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !membershipStatus?.success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Membership Card</h2>
          <p className="text-gray-600 mb-4">{error || 'Unable to load membership information'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!membershipStatus?.canAccessIdCard) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <FiX className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Membership Card Not Available</h2>
          <p className="text-gray-600 mb-4">
            Your membership card is not available because your membership payment is not active.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard/subscribe')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Make Payment
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inline Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the card */
          body * {
            visibility: hidden;
          }
          
          .membership-card-container,
          .membership-card-container * {
            visibility: visible;
          }
          
          .membership-card-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
          }
          
          /* Ensure card maintains exact colors when printed */
          .membership-card svg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .membership-card svg * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .card-text-white {
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-text-green-100 {
            color: #bbf7d0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-logo-bg {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-profile-bg {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-profile-fallback {
            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-strip {
            background: linear-gradient(90deg, #14532d 0%, #052e16 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-shadow {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-pattern {
            opacity: 0.2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-border {
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card-signature-line {
            border-top: 2px solid rgba(255, 255, 255, 0.4) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide buttons and actions when printing */
          .card-actions,
          .card-actions * {
            display: none !important;
          }
          
          /* Ensure proper page setup */
          @page {
            size: auto;
            margin: 0;
          }
          
          @page :left {
            margin: 0;
          }
          
          @page :right {
            margin: 0;
          }
          
          /* High quality printing */
          .membership-card {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
          }
          
          /* Ensure SVG elements print correctly */
          .membership-card svg rect,
          .membership-card svg circle,
          .membership-card svg polygon,
          .membership-card svg text {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Membership Card</h1>
              <button
                onClick={forceRefresh}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Refresh Status
              </button>
            </div>
            <p className="mt-2 text-gray-600">Your official Tanzania Library Association membership card</p>
          </div>

          {/* Membership Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6 membership-card-container">
            <div className="relative">
              {/* Standard Credit Card Size (85.6mm × 53.98mm) */}
              <div className="relative mx-auto membership-card" style={{ width: '336px', height: '212px' }}>
                {/* Card Design - SVG-based to match print version exactly */}
                <svg width="336" height="212" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 rounded-lg shadow-xl overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)' }}>
                  {/* Background with gradient */}
                  <defs>
                    {/* Main gradient: Gray to dark gray */}
                    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#2d3e50', stopOpacity: 1 }} />
                      <stop offset="50%" style={{ stopColor: '#34495e', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#1a252f', stopOpacity: 1 }} />
                    </linearGradient>
                    
                    {/* Green accent gradient */}
                    <linearGradient id="greenAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                    </linearGradient>
                    
                    {/* Diagonal stripe pattern */}
                    <pattern id="diagonalPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="20"/>
                    </pattern>
                    
                    {/* Semi-transparent overlay for depth */}
                    <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'rgba(16, 185, 129, 0.1)', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'rgba(16, 185, 129, 0.05)', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  
                  {/* Main background */}
                  <rect width="336" height="212" fill="url(#bgGradient)" rx="16" ry="16"/>
                  
                  {/* Diagonal pattern overlay */}
                  <rect width="336" height="212" fill="url(#diagonalPattern)" rx="16" ry="16"/>
                  
                  {/* Green accent overlay for depth */}
                  <rect width="336" height="212" fill="url(#overlay)" rx="16" ry="16"/>
                  
                  {/* Large diagonal green stripe (top right) */}
                  <polygon points="200,0 336,0 336,150 150,0" fill="rgba(16, 185, 129, 0.15)"/>
                  
                  {/* Top header bar with green */}
                  <rect width="336" height="50" fill="rgba(16, 185, 129, 0.2)" rx="16" ry="16"/>
                  
                  {/* Logo Image without background */}
                  <image
                    href="/logo (3).png"
                    x="-20"
                    y="-20"
                    width="130"
                    height="130"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  
                  {/* Organization name */}
                  <text x="190" y="30" fontFamily="Arial" fontSize="12" fontWeight="900" fill="white" textAnchor="middle">TANZANIA LIBRARY AND</text>
                  <text x="190" y="50" fontFamily="Arial" fontSize="12" fontWeight="900" fill="white" textAnchor="middle">INFORMATION ASSOCIATION</text>
                  <text x="175" y="70" fontFamily="Arial" fontSize="10" fill="#10b981" textAnchor="middle" fontWeight="600">(TLA)</text>
                  
                  {/* Profile picture with square frame and clipping */}
                  <g>
                    {/* Square profile frame without border */}
                    <rect x="233" y="67" width="90" height="90" fill="none" rx="8" ry="8"/>
                    {user?.profile?.personalInfo?.profilePicture ? (
                      <>
                        <defs>
                          <clipPath id="profileClip">
                            <rect x="233" y="67" width="90" height="90" rx="8" ry="8"/>
                          </clipPath>
                        </defs>
                        <image
                          href={user.profile.personalInfo.profilePicture.startsWith('/uploads/') 
                            ? user.profile.personalInfo.profilePicture 
                            : `/uploads/profile-pictures/${user.profile.personalInfo.profilePicture?.split('/').pop()}`}
                          x="233"
                          y="67"
                          width="90"
                          height="90"
                          clipPath="url(#profileClip)"
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </>
                    ) : (
                      <>
                        {/* Profile initial fallback */}
                        <rect x="233" y="67" width="90" height="90" fill="url(#greenAccent)" rx="8" ry="8"/>
                        <text x="278" y="112" fontFamily="Arial" fontSize="40" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">{user?.name?.charAt(0)?.toUpperCase() || 'M'}</text>
                      </>
                    )}
                  </g>
                  
                  {/* Member name section */}
                  <text x="20" y="95" fontFamily="Arial, sans-serif" fontSize="8" fill="#10b981" fontWeight="700" letterSpacing="1">MEMBER NAME</text>
                  <text x="20" y="115" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="bold" fill="white">{user?.name?.substring(0, 20) || 'Member Name'}</text>
                  
                  {/* Membership number (similar to card number) */}
                  <text x="20" y="130" fontFamily="Arial, sans-serif" fontSize="8" fill="#10b981" fontWeight="700" letterSpacing="0.5">MEMBERSHIP No</text>
                  <text x="20" y="150" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="white" letterSpacing="2">{(user?.membershipNumber || membershipStatus?.membership?.membershipNumber || 'N/A').substring(0, 16)}</text>
                  
                  
                  {/* Membership type and phone number side by side */}
                  <g>
                    {/* Left side - Membership type */}
                    <text x="20" y="170" fontFamily="Arial, sans-serif" fontSize="7" fill="#10b981" fontWeight="700">TYPE</text>
                    <text x="20" y="185" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="white">
                      {membershipStatus?.membership?.membershipType?.toUpperCase() || 'PERSONAL'}
                    </text>
                    
                    {/* Right side - Phone number */}
                    <text x="165" y="170" fontFamily="Arial, sans-serif" fontSize="7" fill="#10b981" fontWeight="700" textAnchor="end">PHONE</text>
                    <text x="200" y="185" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="white" textAnchor="end">
                      {user?.profile?.contactInfo?.phone || 'N/A'}
                    </text>
                  </g>
                  
                  {/* Bottom accent bar with green */}
                  <rect y="192" width="336" height="20" fill="rgba(16, 185, 129, 0.15)"/>
                  <text x="16" y="205" fontFamily="Arial, sans-serif" fontSize="8" fill="rgba(255, 255, 255, 0.7)">Authorized Membership Card • TLA</text>
                </svg>
              </div>

              {/* Card Actions */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center card-actions">
                <button
                  onClick={handleDownload}
                  disabled={downloadInProgress}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiDownload className="mr-2 h-4 w-4" />
                  {downloadInProgress ? 'Downloading...' : 'Download Card'}
                </button>
                
                <button
                  onClick={handlePrint}
                  disabled={printInProgress}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPrinter className="mr-2 h-4 w-4" />
                  {printInProgress ? 'Printing...' : 'Print Card'}
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <FiShare2 className="mr-2 h-4 w-4" />
                  Share Card
                </button>
              </div>
            </div>
          </div>

          {/* Card Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Card Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Membership Details</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Status:</dt>
                    <dd className="font-medium text-green-600">Active</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Member Since:</dt>
                    <dd className="font-medium">
                      {new Date(membershipStatus?.membership?.joinedDate || '').toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Cycle:</dt>
                    <dd className="font-medium">{membershipStatus?.cycle?.year}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Valid Until:</dt>
                    <dd className="font-medium">
                      {membershipStatus?.membership?.expiryDate ? 
                        new Date(membershipStatus.membership.expiryDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 
                        'N/A'
                      }
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Usage Instructions</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Present this card for member benefits at libraries</li>
                  <li>• Use membership number for event registrations</li>
                  <li>• Card is valid until the expiry date shown</li>
                  <li>• Keep card safe and do not share personal details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
