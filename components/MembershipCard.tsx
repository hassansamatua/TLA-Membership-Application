"use client";

import { FiUser, FiDownload, FiPrinter } from 'react-icons/fi';
import { useState } from 'react';
import { generateMembershipCardPDF, printMembershipCard, MembershipCardData } from '@/lib/membershipCardPDF';
import { generateMembershipCardPDFNative, generateMembershipCardPDFFallback } from '@/lib/membershipCardPDFAlternative';
import { generateMembershipCardPDFPerfect, printMembershipCardPerfect } from '@/lib/membershipCardPDFPerfect';
import { generateMembershipCardPDFExact, generateMembershipCardPDFDirect, printMembershipCardExact, printMembershipCardDirect } from '@/lib/membershipCardPDFExact';
import { generateMembershipCardPDFFromTemplate, printMembershipCardFromTemplate } from '@/lib/membershipCardTemplate';
import { generateMembershipCardPDFDirect as generateDirectPDF, printMembershipCardDirect as printDirectPDF } from '@/lib/membershipCardDirect';

interface MembershipCardProps {
  userName: string;
  membershipNumber: string;
  membershipType: string;
  profilePicture?: string | null;
  userPhone?: string;
  className?: string;
  showActions?: boolean; // New prop to show/hide action buttons
}

export default function MembershipCard({ 
  userName, 
  membershipNumber, 
  membershipType, 
  profilePicture,
  userPhone,
  className = "",
  showActions = true 
}: MembershipCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const cardData: MembershipCardData = {
    userName,
    membershipNumber,
    membershipType,
    profilePicture,
    userPhone
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      
      // Try the DIRECT capture method first (captures actual displayed element)
      try {
        await generateDirectPDF(cardData);
        return;
      } catch (directError) {
        console.warn('Direct capture method failed, trying template method:', directError);
      }
      
      // Try the template-based method (base image + data overlay)
      try {
        await generateMembershipCardPDFFromTemplate(cardData);
        return;
      } catch (templateError) {
        console.warn('Template method failed, trying exact clone:', templateError);
      }
      
      // Try the exact clone method (literally copies the displayed card)
      try {
        await generateMembershipCardPDFExact(cardData);
        return;
      } catch (exactError) {
        console.warn('Exact clone method failed, trying direct capture:', exactError);
      }
      
      // Try the direct capture method (captures the actual displayed element)
      try {
        await generateMembershipCardPDFDirect(cardData);
        return;
      } catch (directError) {
        console.warn('Direct capture method failed, trying perfect method:', directError);
      }
      
      // Try the perfect method (recreates exact SVG)
      try {
        await generateMembershipCardPDFPerfect(cardData);
        return;
      } catch (perfectError) {
        console.warn('Perfect method failed, trying original SVG:', perfectError);
      }
      
      // Try the original SVG method
      try {
        await generateMembershipCardPDF(cardData);
        return;
      } catch (svgError) {
        console.warn('SVG method failed, trying fallback:', svgError);
      }
      
      // Try the HTML fallback method
      try {
        await generateMembershipCardPDFFallback(cardData);
        return;
      } catch (fallbackError) {
        console.warn('Fallback method failed, trying native PDF:', fallbackError);
      }
      
      // Finally try the native PDF method
      try {
        await generateMembershipCardPDFNative(cardData);
        return;
      } catch (nativeError) {
        console.error('All PDF generation methods failed:', nativeError);
        throw new Error('Unable to generate PDF. Please try again or contact support.');
      }
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      
      // Try the direct print method first
      try {
        await printDirectPDF(cardData);
        return;
      } catch (directError) {
        console.warn('Direct print method failed, trying template print:', directError);
      }
      
      // Try the template print method first
      try {
        await printMembershipCardFromTemplate(cardData);
        return;
      } catch (templateError) {
        console.warn('Template print method failed, trying exact print:', templateError);
      }
      
      // Try the exact print method
      try {
        await printMembershipCardExact(cardData);
        return;
      } catch (exactError) {
        console.warn('Exact print method failed, trying direct print:', exactError);
      }
      
      // Try the direct print method
      try {
        await printMembershipCardDirect(cardData);
        return;
      } catch (directError) {
        console.warn('Direct print method failed, trying perfect print:', directError);
      }
      
      // Try the perfect print method
      try {
        await printMembershipCardPerfect(cardData);
        return;
      } catch (perfectError) {
        console.warn('Perfect print method failed, trying original:', perfectError);
      }
      
      // Try the original print method
      try {
        await printMembershipCard(cardData);
        return;
      } catch (printError) {
        console.error('All print methods failed:', printError);
        throw new Error('Unable to print card. Please try again or contact support.');
      }
      
    } catch (error) {
      console.error('Error printing card:', error);
      alert('Failed to print card. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`membership-card ${className}`}>
      <div className="relative w-[336px] h-[212px]" id="membership-card-element">
        {/* Card Design - SVG-based to match print version exactly */}
      <svg width="336" height="212" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 rounded-lg shadow-xl overflow-hidden">
        {/* Background with gradient */}
        <defs>
          {/* Main gradient: Gray to dark gray */}
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d3e50" stopOpacity="1" />
            <stop offset="50%" stopColor="#34495e" stopOpacity="1" />
            <stop offset="100%" stopColor="#1a252f" stopOpacity="1" />
          </linearGradient>
          
          {/* Green accent gradient */}
          <linearGradient id="greenAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </linearGradient>
          
          {/* Diagonal stripe pattern */}
          <pattern id="diagonalPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="20"/>
          </pattern>
          
          {/* Semi-transparent overlay for depth */}
          <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.1)" stopOpacity="1" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.05)" stopOpacity="1" />
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
          href="/logo.png"
          x="9"
          y="4"
          width="70"
          height="70"
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
          {profilePicture ? (
            <>
              <defs>
                <clipPath id="profileClip">
                  <rect x="233" y="67" width="90" height="90" rx="8" ry="8"/>
                </clipPath>
              </defs>
              <image
                href={profilePicture || undefined}
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
              <text x="278" y="112" fontFamily="Arial" fontSize="40" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">{userName?.charAt(0)?.toUpperCase() || 'M'}</text>
            </>
          )}
        </g>
        
        {/* Member name section */}
        <text x="20" y="95" fontFamily="Arial, sans-serif" fontSize="8" fill="#10b981" fontWeight="700" letterSpacing="1">MEMBER NAME</text>
        <text x="20" y="115" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="bold" fill="white">{userName?.substring(0, 20) || 'Member Name'}</text>
        
        {/* Membership number (similar to card number) */}
        <text x="20" y="130" fontFamily="Arial, sans-serif" fontSize="8" fill="#10b981" fontWeight="700" letterSpacing="0.5">MEMBERSHIP No</text>
        <text x="20" y="150" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="white" letterSpacing="2">{(membershipNumber || 'N/A').substring(0, 16)}</text>
        
        
        {/* Membership type and phone number side by side */}
        <g>
          {/* Left side - Membership type */}
          <text x="20" y="170" fontFamily="Arial, sans-serif" fontSize="7" fill="#10b981" fontWeight="700">TYPE</text>
          <text x="20" y="185" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="white">
            {(membershipType || 'Personal').toUpperCase()}
          </text>
          
          {/* Right side - Phone number (if provided) */}
          {userPhone && (
            <>
              <text x="165" y="170" fontFamily="Arial, sans-serif" fontSize="7" fill="#10b981" fontWeight="700" textAnchor="end">PHONE</text>
              <text x="201" y="185" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold" fill="white" textAnchor="end">
                {userPhone?.substring(0, 25) || 'N/A'}
              </text>
            </>
          )}
        </g>
        
        {/* Bottom accent bar with green */}
        <rect y="192" width="336" height="20" fill="rgba(16, 185, 129, 0.15)"/>
        <text x="16" y="205" fontFamily="Arial, sans-serif" fontSize="8" fill="rgba(255, 255, 255, 0.7)">Authorized Membership Card • TLA</text>
      </svg>
    </div>

    {/* Action Buttons */}
    {showActions && (
      <div className="mt-4 flex gap-3 justify-center">
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiDownload className="w-4 h-4" />
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
        
        <button
          onClick={handlePrint}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPrinter className="w-4 h-4" />
          {isGenerating ? 'Preparing...' : 'Print Card'}
        </button>
      </div>
    )}
  </div>
  );
}
