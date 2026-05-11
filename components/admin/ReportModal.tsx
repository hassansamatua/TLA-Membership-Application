'use client';

import { useState } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (type: string, startDate: string, endDate: string) => Promise<void>;
}

export default function ReportModal({ isOpen, onClose, onGenerate }: ReportModalProps) {
  const [reportType, setReportType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      setIsGenerating(true);
      await onGenerate(reportType, startDate, endDate);
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Generate Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isGenerating}
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  id="reportType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  disabled={isGenerating}
                  required
                >
                  <option value="all">All Members</option>
                  <option value="active">Active Members</option>
                  <option value="pending">Pending Approval</option>
                  <option value="new">New Members</option>
                  <option value="activity">Member Activity</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isGenerating}
                    min={startDate}
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    'Generating...'
                  ) : (
                    <>
                      <FiDownload className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
