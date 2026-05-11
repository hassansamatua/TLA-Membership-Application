"use client";

import { useState } from 'react';
import MembershipCard from '@/components/MembershipCard';

export default function TestMembershipCard() {
  const [showCard, setShowCard] = useState(true);

  // Sample data for testing
  const sampleUserData = {
    userName: "Hassan Samatua",
    membershipNumber: "TLA2670492",
    membershipType: "Professional",
    profilePicture: "/uploads/profile-pictures/user_25.jpg", // Test with actual profile picture
    userPhone: "+255 712 345 678"
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TLA Membership Card Test</h1>
          <p className="text-gray-600 mb-8">
            Test the membership card download and print functionality. The card below can be downloaded as PDF or printed directly.
          </p>

          <div className="space-y-8">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Instructions:</h2>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>Download PDF:</strong> Click the blue "Download PDF" button to save the card as a high-quality PDF file</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>Print Card:</strong> Click the green "Print Card" button to open the print dialog and print directly</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>Quality:</strong> Both PDF and print versions maintain the exact design and colors as displayed</span>
                </li>
              </ul>
            </div>

            {/* Test Data Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Test Data:</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{sampleUserData.userName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Membership No:</span>
                  <span className="ml-2 text-gray-900">{sampleUserData.membershipNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-900">{sampleUserData.membershipType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-900">{sampleUserData.userPhone}</span>
                </div>
              </div>
            </div>

            {/* Membership Card */}
            <div className="flex justify-center">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 text-center">Membership Card</h2>
                {showCard && (
                  <MembershipCard
                    userName={sampleUserData.userName}
                    membershipNumber={sampleUserData.membershipNumber}
                    membershipType={sampleUserData.membershipType}
                    profilePicture={sampleUserData.profilePicture}
                    userPhone={sampleUserData.userPhone}
                    showActions={true}
                  />
                )}
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-900 mb-3">Technical Details:</h2>
              <div className="space-y-2 text-yellow-800 text-sm">
                <p><strong>PDF Generation:</strong> Uses html2canvas + jsPDF for high-quality rendering</p>
                <p><strong>Print Optimization:</strong> CSS print media queries ensure proper formatting</p>
                <p><strong>Card Dimensions:</strong> 336px × 212px (maintains aspect ratio for printing)</p>
                <p><strong>Color Accuracy:</strong> Print color adjustment ensures exact color matching</p>
                <p><strong>File Naming:</strong> TLA_Membership_Card_[Number]_[Date].pdf</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCard(!showCard)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showCard ? 'Hide Card' : 'Show Card'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
