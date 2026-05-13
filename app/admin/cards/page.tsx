'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import MembershipCard from '@/components/MembershipCard';
import {
  generateBulkMembershipCardsPDF,
  printBulkMembershipCards,
} from '@/lib/membershipCardBulk';
import {
  FiSearch,
  FiDownload,
  FiPrinter,
  FiEye,
  FiRefreshCw,
  FiFilter,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiFileText,
} from 'react-icons/fi';

interface MembershipCardData {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  membershipNumber: string;
  membershipType: string;
  joinDate: string;
  joinedDate: string; // Added to match user API
  expiryDate: string;
  paymentStatus: 'paid' | 'pending' | 'overdue' | 'cancelled';
  membershipStatus: 'active' | 'inactive' | 'expired' | 'suspended';
  status: 'active' | 'inactive' | 'expired' | 'suspended'; // Added to match user API
  amount: number;
  amountPaid: number | string; // Added to match user API
  paymentDate: string | null;
  payment_date: string | null; // Added to match user API
  lastPaymentAmount: number;
  profilePicture?: string | null;
}

export default function AdminCardsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<MembershipCardData[]>([]);
  const [filteredCards, setFilteredCards] = useState<MembershipCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MembershipCardData | null>(null);
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [printInProgress, setPrintInProgress] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }
    if (!isAuthLoading && isAuthenticated && user?.isAdmin) {
      fetchMembershipCards();
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  useEffect(() => {
    filterCards();
  }, [cards, searchTerm, statusFilter]);

  const fetchMembershipCards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/cards', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch membership cards');
      const data = await response.json();
      
      console.log('📋 Admin Cards Frontend Received:', {
        success: data.success,
        totalCards: data.data?.length || 0,
        sampleCards: data.data?.slice(0, 2).map(card => ({
          id: card.id,
          userName: card.userName,
          membershipNumber: card.membershipNumber,
          membershipStatus: card.membershipStatus,
          paymentStatus: card.paymentStatus,
          expiryDate: card.expiryDate
        }))
      });
      
      console.log('🔍 Admin Cards Frontend Debug:', {
        success: data.success,
        totalCards: data.data?.length,
        sampleCard: data.data?.[0],
        sampleCardDates: data.data?.[0] ? {
          joinDate: data.data[0].joinDate,
          joinDateType: typeof data.data[0].joinDate,
          expiryDate: data.data[0].expiryDate,
          expiryDateType: typeof data.data[0].expiryDate,
          paymentDate: data.data[0].paymentDate,
          paymentDateType: typeof data.data[0].paymentDate,
          formattedJoinDate: formatDate(data.data[0].joinDate),
          formattedExpiryDate: formatDate(data.data[0].expiryDate),
          formattedPaymentDate: formatDate(data.data[0].paymentDate)
        } : 'No card data'
      });
      
      setCards(data.data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast.error('Failed to load membership cards');
    } finally {
      setIsLoading(false);
    }
  };

  const filterCards = () => {
    let filtered = cards;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.membershipNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(card => card.membershipStatus === statusFilter);
    }

    setFilteredCards(filtered);
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedCards.length === filteredCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filteredCards.map(card => card.id));
    }
  };

  const handleDownloadCard = async (card: MembershipCardData) => {
    setDownloadInProgress(true);
    try {
      const cardData = `
Membership Card - ${card.membershipNumber}
================================
Name: ${card.userName}
Email: ${card.userEmail}
Membership Type: ${card.membershipType}
Join Date: ${formatDate(card.joinDate)}
Expiry Date: ${formatDate(card.expiryDate)}
Payment Status: ${card.paymentStatus}
Membership Status: ${card.membershipStatus}
Amount: TZS ${card.lastPaymentAmount?.toLocaleString() || 'N/A'}
      `.trim();

      const blob = new Blob([cardData], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `card-${card.membershipNumber}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Card downloaded successfully');
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error('Failed to download card');
    } finally {
      setDownloadInProgress(false);
    }
  };

  const handlePrintCard = (card: MembershipCardData) => {
    setPrintInProgress(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for printing');
        setPrintInProgress(false);
        return;
      }

      const printContent = `
        <html>
          <head>
            <title>Membership Card - ${card.membershipNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .card { 
                border: 2px solid #059669; 
                border-radius: 10px; 
                padding: 30px; 
                max-width: 500px;
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                color: white;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              }
              .card h2 { margin-top: 0; color: #bbf7d0; }
              .card-field { margin: 15px 0; }
              .card-field label { font-weight: bold; color: #bbf7d0; font-size: 12px; }
              .card-field value { display: block; font-size: 16px; }
              .status { 
                display: inline-block; 
                padding: 5px 15px; 
                border-radius: 20px;
                margin-top: 10px;
              }
              .status.active { background: #10b981; color: white; }
              .status.inactive { background: #6b7280; color: white; }
              .status.expired { background: #ef4444; color: white; }
              @media print {
                body { margin: 0; padding: 0; }
                .card { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Tanzania Library Association</h2>
              <h3>Membership Card</h3>
              
              <div class="card-field">
                <label>Card Number:</label>
                <value>${card.membershipNumber}</value>
              </div>
              
              <div class="card-field">
                <label>Member Name:</label>
                <value>${card.userName}</value>
              </div>
              
              <div class="card-field">
                <label>Email:</label>
                <value>${card.userEmail}</value>
              </div>
              
              <div class="card-field">
                <label>Membership Type:</label>
                <value>${card.membershipType}</value>
              </div>
              
              <div class="card-field">
                <label>Join Date:</label>
                <value>${formatDate(card.joinDate)}</value>
              </div>
              
              <div class="card-field">
                <label>Expiry Date:</label>
                <value>${formatDate(card.expiryDate)}</value>
              </div>
              
              <div class="card-field">
                <label>Payment Status:</label>
                <value>${card.paymentStatus.toUpperCase()}</value>
              </div>
              
              <div class="card-field">
                <span class="status ${card.membershipStatus}">
                  ${card.membershipStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Error printing card:', error);
      toast.error('Failed to print card');
    } finally {
      setPrintInProgress(false);
    }
  };

  /**
   * Bulk membership-card PDF export: produces a multi-page PDF where each
   * selected card is rendered using the same template as the per-user
   * download (one card per landscape page). Includes a CSV fallback button
   * (`handleBulkExportCsv`) for spreadsheet-style data export.
   */
  const handleBulkDownload = async () => {
    if (selectedCards.length === 0) {
      toast.warning('Please select at least one card');
      return;
    }

    setDownloadInProgress(true);
    setBulkProgress({ done: 0, total: selectedCards.length });
    try {
      const cardsToDownload = cards.filter((c) => selectedCards.includes(c.id));
      await generateBulkMembershipCardsPDF(
        cardsToDownload.map((c) => ({
          userName: c.userName,
          membershipNumber: c.membershipNumber,
          membershipType: c.membershipType,
          profilePicture: c.profilePicture ?? null,
          userPhone: c.userPhone,
        })),
        {
          onProgress: (p) => setBulkProgress({ done: p.done, total: p.total }),
          fileName: `TLA_Membership_Cards_${new Date().toISOString().split('T')[0]}_x${cardsToDownload.length}.pdf`,
        }
      );
      toast.success(`${cardsToDownload.length} membership card(s) exported to PDF`);
      setSelectedCards([]);
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      toast.error('Failed to generate bulk PDF: ' + (error as Error).message);
    } finally {
      setDownloadInProgress(false);
      setBulkProgress(null);
    }
  };

  const handleBulkExportCsv = () => {
    if (selectedCards.length === 0) {
      toast.warning('Please select at least one card');
      return;
    }
    try {
      const cardsToDownload = cards.filter((c) => selectedCards.includes(c.id));
      const csvContent = [
        ['Membership Number', 'Member Name', 'Email', 'Type', 'Join Date', 'Expiry Date', 'Payment Status', 'Membership Status'],
        ...cardsToDownload.map((c) => [
          c.membershipNumber,
          c.userName,
          c.userEmail,
          c.membershipType,
          formatDate(c.joinDate),
          formatDate(c.expiryDate),
          c.paymentStatus,
          c.membershipStatus,
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `membership-cards-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${cardsToDownload.length} card(s) exported to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleBulkPrint = async () => {
    if (selectedCards.length === 0) {
      toast.warning('Please select at least one card');
      return;
    }

    setPrintInProgress(true);
    setBulkProgress({ done: 0, total: selectedCards.length });
    try {
      const cardsToPrint = cards.filter((c) => selectedCards.includes(c.id));
      await printBulkMembershipCards(
        cardsToPrint.map((c) => ({
          userName: c.userName,
          membershipNumber: c.membershipNumber,
          membershipType: c.membershipType,
          profilePicture: c.profilePicture ?? null,
          userPhone: c.userPhone,
        })),
        {
          onProgress: (p) => setBulkProgress({ done: p.done, total: p.total }),
        }
      );
      toast.success(`${cardsToPrint.length} card(s) sent to print preview`);
    } catch (error) {
      console.error('Error printing cards:', error);
      toast.error('Failed to print cards: ' + (error as Error).message);
    } finally {
      setPrintInProgress(false);
      setBulkProgress(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
  if (!dateString || dateString === 'null' || dateString === '') return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check for invalid dates (like 1899 or invalid date strings)
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      return 'N/A';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return 'N/A';
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <FiCheck className="h-5 w-5 text-emerald-600" />;
      case 'pending':
        return <FiClock className="h-5 w-5 text-yellow-600" />;
      case 'overdue':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FiX className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership Cards Management</h1>
          <p className="text-gray-600 mt-2">View, filter, and manage all user membership cards</p>
        </div>
        <button
          onClick={fetchMembershipCards}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Name, email, or card number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Summary */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Total Cards: {filteredCards.length}</p>
              <p className="text-xs">Selected: {selectedCards.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCards.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {selectedCards.length} card(s) selected
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkDownload}
                disabled={downloadInProgress || printInProgress}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                {downloadInProgress
                  ? bulkProgress
                    ? `Rendering ${bulkProgress.done}/${bulkProgress.total}...`
                    : 'Generating PDF...'
                  : 'Download PDF'}
              </button>
              <button
                onClick={handleBulkExportCsv}
                disabled={downloadInProgress || printInProgress}
                className="inline-flex items-center px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors disabled:opacity-50"
                title="Export selected card metadata as CSV"
              >
                <FiFileText className="mr-2 h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handleBulkPrint}
                disabled={printInProgress || downloadInProgress}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <FiPrinter className="mr-2 h-4 w-4" />
                {printInProgress
                  ? bulkProgress
                    ? `Rendering ${bulkProgress.done}/${bulkProgress.total}...`
                    : 'Preparing print...'
                  : 'Print All'}
              </button>
              <button
                onClick={() => setSelectedCards([])}
                className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                <FiX className="mr-2 h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Membership Cards Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="p-12 text-center">
            <FiAlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No membership cards found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCards.length === filteredCards.length && filteredCards.length > 0}
                      onChange={toggleAllSelection}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCards.includes(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-emerald-600">{card.membershipNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{card.userName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{card.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm">{card.membershipType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm">{formatDate(card.expiryDate)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getPaymentStatusIcon(card.paymentStatus)}
                        <span className="text-sm capitalize">{card.paymentStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(card.membershipStatus)}`}>
                        {card.membershipStatus.charAt(0).toUpperCase() + card.membershipStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCard(card);
                            setShowCardModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Card"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadCard(card)}
                          className="text-emerald-600 hover:text-emerald-900"
                          title="Download Card"
                        >
                          <FiDownload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintCard(card)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Print Card"
                        >
                          <FiPrinter className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {showCardModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Membership Card Details</h2>
              <button
                onClick={() => setShowCardModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Card Preview - using exact same component as user membership card */}
              <div className="mb-8 flex justify-center">
                <MembershipCard
                  userName={selectedCard.userName}
                  membershipNumber={selectedCard.membershipNumber}
                  membershipType={selectedCard.membershipType}
                  profilePicture={selectedCard.profilePicture}
                  userPhone={selectedCard.userPhone}
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Card Information</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Phone</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedCard.userPhone || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Join Date</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(selectedCard.joinDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Expiry Date</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(selectedCard.expiryDate)}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment Information</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Payment Status</dt>
                      <dd className="text-sm font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedCard.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedCard.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCard.paymentStatus.toUpperCase()}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Last Payment Amount</dt>
                      <dd className="text-sm font-medium text-gray-900">TZS {selectedCard.lastPaymentAmount?.toLocaleString() || 'N/A'}</dd>
                    </div>
                    {selectedCard.paymentDate && (
                      <div>
                        <dt className="text-xs text-gray-500 uppercase">Payment Date</dt>
                        <dd className="text-sm font-medium text-gray-900">{formatDate(selectedCard.paymentDate)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex space-x-3 justify-end">
              <button
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadCard(selectedCard);
                  setShowCardModal(false);
                }}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => {
                  handlePrintCard(selectedCard);
                  setShowCardModal(false);
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <FiPrinter className="mr-2 h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
