'use client';

import { 
  MapPin, 
  Activity,
  Calendar,
  CheckCircle,
  Truck,
  Recycle,
  AlertTriangle,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import LocationIntelligence from '@/components/LocationIntelligence';
import { FirebaseService } from '@/services/firebaseService';
import { ModelResult } from '@/types/garbage-detection';


// Helper function to get status from confidence score
const getStatusFromConfidence = (confidence: number): { status: string; color: string; bgColor: string; borderColor: string } => {
  const confidencePercent = confidence * 100;
  
  if (confidencePercent >= 80) {
    return { 
      status: 'HIGH OVERFLOW', 
      color: 'text-red-800', 
      bgColor: 'bg-red-100',
      borderColor: 'border-red-500'
    };
  }
  if (confidencePercent >= 60) {
    return { 
      status: 'MEDIUM-HIGH OVERFLOW', 
      color: 'text-orange-800', 
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-500'
    };
  }
  if (confidencePercent >= 40) {
    return { 
      status: 'MEDIUM OVERFLOW', 
      color: 'text-amber-800', 
      bgColor: 'bg-amber-100',
      borderColor: 'border-amber-500'
    };
  }
  if (confidencePercent >= 20) {
    return { 
      status: 'LOW OVERFLOW', 
      color: 'text-lime-800', 
      bgColor: 'bg-lime-100',
      borderColor: 'border-lime-500'
    };
  }
  return { 
    status: 'VERY LOW OVERFLOW', 
    color: 'text-green-800', 
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500'
  };
};

// Helper function to format time ago
const formatTimeAgo = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'Unknown time';
  }
};

export default function DashboardPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  
  // State for real data
  const [recentActivities, setRecentActivities] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  
  // Pagination state for Recent Detection Events
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 2;
  
  // Fetch real data from Firebase
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        setLoading(true);
        const response = await FirebaseService.fetchModelResults();
        setRecentActivities(response.results);
      } catch (err) {
        setError('Failed to fetch recent activities');
        console.error('Error fetching recent activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivities();
  }, []);
  
  // Calculate pagination
  const totalPages = Math.ceil(recentActivities.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = recentActivities.slice(startIndex, endIndex);
  const highRiskEvents = recentActivities.filter((activity) => activity.confidence_score >= 0.6).length;
  const averageConfidencePercent = recentActivities.length > 0
    ? ((recentActivities.reduce((sum, item) => sum + item.confidence_score, 0) / recentActivities.length) * 100).toFixed(1)
    : '0.0';
  
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleExportPDF = async () => {
    try {
      // Dynamic import for html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Calculate real statistics from Firebase data
      const totalDetections = recentActivities.length;
      const averageConfidence = totalDetections > 0 
        ? recentActivities.reduce((sum, result) => sum + result.confidence_score, 0) / totalDetections
        : 0;
      const maxConfidence = totalDetections > 0 
        ? Math.max(...recentActivities.map(r => r.confidence_score))
        : 0;
      const minConfidence = totalDetections > 0 
        ? Math.min(...recentActivities.map(r => r.confidence_score))
        : 0;
      
      // Calculate overflow score (simplified calculation)
      const overflowScore = totalDetections > 0 
        ? (averageConfidence * 100 * totalDetections) / 100
        : 0;
      
      // Calculate detection frequency (detections per hour based on time range)
      const now = new Date();
      const oldestDetection = totalDetections > 0 
        ? new Date(recentActivities[recentActivities.length - 1].timestamp)
        : now;
      const timeDiffHours = (now.getTime() - oldestDetection.getTime()) / (1000 * 60 * 60);
      const detectionFrequency = timeDiffHours > 0 ? (totalDetections / timeDiffHours).toFixed(1) : '0';
      
      // Get latest detection location
      const latestDetection = totalDetections > 0 ? recentActivities[0] : null;
      const latestStatus = latestDetection ? getStatusFromConfidence(latestDetection.confidence_score) : null;
      
      // Format timestamp for report
      const reportDate = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Create municipal report HTML
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Municipal Garbage Overflow Detection Report</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .municipality-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              color: #666;
              margin-bottom: 10px;
            }
            .report-date {
              font-size: 14px;
              color: #888;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #2563eb;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-item {
              background: #f8fafc;
              padding: 15px;
              border-left: 4px solid #2563eb;
              border-radius: 4px;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
            }
            .location-info {
              background: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .location-address {
              font-weight: bold;
              margin-bottom: 10px;
              color: #1e40af;
            }
            .coordinates {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-top: 10px;
            }
            .coord-item {
              font-size: 14px;
            }
            .coord-label {
              color: #666;
            }
            .coord-value {
              font-weight: bold;
              font-family: monospace;
            }
            .detection-events {
              margin-top: 20px;
            }
            .event-item {
              background: #f9fafb;
              padding: 15px;
              margin-bottom: 10px;
              border-radius: 6px;
              border-left: 4px solid #10b981;
            }
            .event-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
            }
            .event-id {
              font-weight: bold;
              color: #1f2937;
            }
            .event-confidence {
              font-weight: bold;
              color: #059669;
            }
            .event-timestamp {
              font-size: 12px;
              color: #6b7280;
            }
            .event-address {
              font-size: 12px;
              color: #6b7280;
              margin-top: 5px;
            }
            .recommendations {
              background: #fef3c7;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #f59e0b;
            }
            .recommendation-item {
              margin-bottom: 10px;
              padding-left: 20px;
              position: relative;
            }
            .recommendation-item::before {
              content: "•";
              position: absolute;
              left: 0;
              color: #f59e0b;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .official-stamp {
              margin-top: 30px;
              text-align: right;
            }
            .stamp-box {
              display: inline-block;
              border: 2px solid #2563eb;
              padding: 10px 20px;
              border-radius: 4px;
              font-size: 12px;
              color: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="municipality-name">MUNICIPAL CORPORATION OF KOLKATA</div>
            <div class="report-title">GARBAGE OVERFLOW DETECTION REPORT</div>
            <div class="report-date">Report Generated: ${reportDate} IST</div>
          </div>

          <div class="section">
            <div class="section-title">EXECUTIVE SUMMARY</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Detections</div>
                <div class="summary-value">${totalDetections}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Average Confidence</div>
                <div class="summary-value">${(averageConfidence * 100).toFixed(1)}%</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Overflow Score</div>
                <div class="summary-value">${overflowScore.toFixed(2)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Detection Frequency</div>
                <div class="summary-value">${detectionFrequency}/hour</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">LOCATION INTELLIGENCE</div>
            <div class="location-info">
              <div class="location-address">Latest Detection Location</div>
              <div>${latestDetection ? latestDetection.address : 'No detections available'}</div>
              ${latestDetection ? `
              <div class="coordinates">
                <div class="coord-item">
                  <span class="coord-label">Latitude:</span>
                  <span class="coord-value">${latestDetection.latitude.toFixed(6)}°</span>
                </div>
                <div class="coord-item">
                  <span class="coord-label">Longitude:</span>
                  <span class="coord-value">${latestDetection.longitude.toFixed(6)}°</span>
                </div>
                <div class="coord-item">
                  <span class="coord-label">GPS Accuracy:</span>
                  <span class="coord-value">${typeof latestDetection.accuracy === 'string' ? latestDetection.accuracy : `±${latestDetection.accuracy}m`}</span>
                </div>
                <div class="coord-item">
                  <span class="coord-label">Status:</span>
                  <span class="coord-value">${latestStatus ? latestStatus.status : 'UNKNOWN'}</span>
                </div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">DETECTION EVENTS</div>
            <div class="detection-events">
              ${recentActivities.length > 0 ? recentActivities.map((detection, index) => `
                <div class="event-item">
                  <div class="event-header">
                    <div class="event-id">Detection #${index + 1}</div>
                    <div class="event-confidence">${(detection.confidence_score * 100).toFixed(1)}%</div>
                  </div>
                  <div class="event-timestamp">Timestamp: ${new Date(detection.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                  <div class="event-address">Location: ${detection.address}</div>
                </div>
              `).join('') : '<div class="event-item"><div class="event-timestamp">No detection events found</div></div>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">RECOMMENDATIONS</div>
            <div class="recommendations">
              ${totalDetections > 0 ? `
                <div class="recommendation-item">Schedule immediate collection for detected overflow areas</div>
                <div class="recommendation-item">Monitor confidence trends - current range: ${(minConfidence * 100).toFixed(1)}% to ${(maxConfidence * 100).toFixed(1)}%</div>
                <div class="recommendation-item">Include detected locations in regular collection schedule</div>
                <div class="recommendation-item">Update municipal waste management database with ${totalDetections} new detection point${totalDetections > 1 ? 's' : ''}</div>
                ${averageConfidence > 0.6 ? '<div class="recommendation-item">High confidence detections require immediate attention</div>' : ''}
                ${totalDetections > 5 ? '<div class="recommendation-item">Consider increasing collection frequency due to high detection count</div>' : ''}
              ` : `
                <div class="recommendation-item">No detections found - continue regular monitoring</div>
                <div class="recommendation-item">Review detection system if no alerts received recently</div>
                <div class="recommendation-item">Maintain current collection schedule</div>
              `}
            </div>
          </div>

          <div class="official-stamp">
            <div class="stamp-box">
              OFFICIAL REPORT<br>
              Municipal Corporation of Kolkata<br>
              Waste Management Department
            </div>
          </div>

          <div class="footer">
            <p>This report is generated automatically by the Municipal Garbage Overflow Detection System</p>
            <p>For queries contact: waste-management@kolkata.gov.in | Phone: +91-33-XXXX-XXXX</p>
          </div>
        </body>
        </html>
      `;
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Municipal-Garbage-Report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      
      // Create a temporary element with the report HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportHTML;
      document.body.appendChild(tempDiv);
      
      await html2pdf().set(opt).from(tempDiv).save();
      
      // Clean up
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Page header */}
      <div className="rounded-2xl border border-[#ded5c5] bg-white/95 px-4 py-4 sm:px-6 sm:py-5 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1f1712]">Garbage Overflow Detection Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-[#6b5c4e]">
          Monitor garbage overflow detection and track waste management performance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#964b28]">Total Detections</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#1f1712]">{recentActivities.length}</p>
        </div>
        <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#594d3b]">Avg Confidence</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#1f1712]">{averageConfidencePercent}%</p>
        </div>
        <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#ba7861]">High Risk Events</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#1f1712]">{highRiskEvents}</p>
        </div>
        <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Report Pages</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-[#1f1712]">{Math.max(totalPages, 1)}</p>
        </div>
      </div>

      {/* Official Detection Report */}
      <div ref={reportRef} className="overflow-hidden rounded-2xl border border-[#ded5c5] bg-white/95 shadow-lg shadow-[#964b28]/5">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-[#8a4220] to-[#ba7861] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-white flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-white leading-tight">Garbage Overflow Detection Report</h2>
                <p className="text-xs sm:text-sm text-amber-100 mt-0.5 truncate">Generated on {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button 
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Location Intelligence */}
          <LocationIntelligence className="mb-6 sm:mb-8" />

          {/* Detection Analytics */}
          <div className="mb-6 sm:mb-8">
            <h3 className="mb-4 flex items-center text-base sm:text-lg font-bold text-[#1f1712]">
              <Activity className="mr-2 h-5 w-5 text-[#964b28] flex-shrink-0" />
              Detection Analytics
            </h3>
            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h4 className="font-bold text-[#1f1712]">Recent Detection Events</h4>
                  <div className="flex items-center space-x-2 text-sm font-medium text-[#7a6a58]">
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                            <div className="flex-1">
                              <div className="h-4 bg-[#e8e2d4] rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-[#e8e2d4] rounded w-1/2"></div>
                            </div>
                            <div className="text-right ml-3">
                              <div className="h-4 bg-[#e8e2d4] rounded w-16 mb-1"></div>
                              <div className="h-3 bg-[#e8e2d4] rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : _error ? (
                    <div className="py-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-700">{_error}</p>
                    </div>
                  ) : currentEvents.length === 0 ? (
                    <div className="py-4 text-center">
                      <CheckCircle className="h-8 w-8 text-[#9c8e7e] mx-auto mb-2" />
                      <p className="text-sm font-medium text-[#7a6a58]">No detection events found</p>
                    </div>
                  ) : (
                    currentEvents.map((activity, index) => {
                      const status = getStatusFromConfidence(activity.confidence_score);
                      const globalIndex = startIndex + index;
                      return (
                        <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-[#ded5c5] bg-white p-3 shadow-sm gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1f1712] break-words">
                              Detection #{globalIndex + 1} - {activity.address}
                            </p>
                            <p className="text-xs font-medium text-[#7a6a58]">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                          <div className="flex sm:flex-col sm:text-right items-center sm:items-end gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-[#1f1712]">
                              {(activity.confidence_score * 100).toFixed(1)}%
                            </span>
                            <p className={`rounded-full px-2 py-1 text-xs font-semibold ${status.color} ${status.bgColor}`}>
                              {status.status}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-[#ded5c5] pt-4 gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center rounded-lg border border-[#ded5c5] bg-white px-2.5 py-2 text-sm font-semibold text-[#4a3b32] hover:bg-[#fdfbf7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </button>
                    
                    <div className="flex items-center space-x-1 overflow-x-auto">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-semibold rounded-lg flex-shrink-0 ${
                            currentPage === page
                              ? 'bg-[#964b28] text-white'
                              : 'text-[#594d3b] hover:bg-[#f5ede2]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center rounded-lg border border-[#ded5c5] bg-white px-2.5 py-2 text-sm font-semibold text-[#4a3b32] hover:bg-[#fdfbf7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border border-[#ded4c5] bg-[#ded8c4]/50 p-4 sm:p-6">
            <h3 className="mb-4 flex items-center text-base sm:text-lg font-bold text-[#1f1712]">
              <AlertTriangle className="mr-2 h-5 w-5 text-[#964b28] flex-shrink-0" />
              Recommendations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-[#964b28] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#1f1712]">Schedule Collection</p>
                  <p className="text-sm text-[#4f4236]">Plan immediate collection for the detected overflow area</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-[#964b28] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#1f1712]">Monitor Confidence Trend</p>
                  <p className="text-sm text-[#4f4236]">Confidence increased from 32.92% to 46.97% - continue monitoring</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-[#964b28] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#1f1712]">Update Collection Routes</p>
                  <p className="text-sm text-[#4f4236]">Include this location in regular collection schedule</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="rounded-2xl border border-[#ded5c5] bg-white/95 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">Recent Detection Activities</h3>
          <Calendar className="h-5 w-5 text-[#9c8e7e] flex-shrink-0" />
        </div>
        <div className="flow-root">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="relative flex space-x-3">
                    <div className="h-8 w-8 bg-[#e8e2d4] rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-[#e8e2d4] rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-[#e8e2d4] rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : _error ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="font-medium text-red-700">{_error}</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-[#9c8e7e] mx-auto mb-4" />
              <p className="font-medium text-[#7a6a58]">No recent activities found</p>
            </div>
          ) : (
            <ul className="-mb-8">
              {recentActivities.slice(0, 4).map((activity, activityIdx) => {
                const status = getStatusFromConfidence(activity.confidence_score);
                const getIcon = () => {
                  if (status.status.includes('HIGH')) return AlertTriangle;
                  if (status.status.includes('MEDIUM')) return Activity;
                  return CheckCircle;
                };
                const Icon = getIcon();
                
                return (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== Math.min(recentActivities.length - 1, 3) ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-[#e8e2d4]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div className="flex-shrink-0">
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              status.color
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-sm text-[#4f4236] break-words">
                              <span className="font-bold text-[#1f1712]">
                                {activity.address}
                              </span>{' '}
                              Garbage overflow detected
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-[#7a6a58]">
                                Confidence: {(activity.confidence_score * 100).toFixed(1)}%
                              </span>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.color} ${status.bgColor}`}>
                                {status.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-sm font-semibold text-[#7a6a58] whitespace-nowrap">
                            {formatTimeAgo(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-[#ded5c5] bg-white/95 p-4 sm:p-6 shadow-sm">
        <h3 className="mb-4 text-base sm:text-lg font-bold text-[#1f1712]">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button className="group relative rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-6 transition hover:-translate-y-0.5 hover:border-[#964b28] hover:shadow-md focus-within:ring-2 focus-within:ring-[#964b28] focus-within:ring-offset-2 text-left">
            <div className="flex sm:block items-center gap-4">
              <span className="inline-flex rounded-lg bg-[#f0e2d8] p-3 text-[#964b28] ring-4 ring-white flex-shrink-0">
                <Truck className="h-6 w-6" />
              </span>
              <div className="sm:mt-8">
                <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Schedule Collection
                </h3>
                <p className="mt-1 text-sm font-medium text-[#6b5c4e]">
                  Plan collection for overflow areas
                </p>
              </div>
            </div>
          </button>

          <button className="group relative rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-6 transition hover:-translate-y-0.5 hover:border-[#964b28] hover:shadow-md focus-within:ring-2 focus-within:ring-[#964b28] focus-within:ring-offset-2 text-left">
            <div className="flex sm:block items-center gap-4">
              <span className="inline-flex rounded-lg bg-[#e8e2d4] p-3 text-[#594d3b] ring-4 ring-white flex-shrink-0">
                <Recycle className="h-6 w-6" />
              </span>
              <div className="sm:mt-8">
                <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Detection Report
                </h3>
                <p className="mt-1 text-sm font-medium text-[#6b5c4e]">
                  Generate overflow detection report
                </p>
              </div>
            </div>
          </button>

          <button className="group relative rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-6 transition hover:-translate-y-0.5 hover:border-[#964b28] hover:shadow-md focus-within:ring-2 focus-within:ring-[#964b28] focus-within:ring-offset-2 text-left">
            <div className="flex sm:block items-center gap-4">
              <span className="inline-flex rounded-lg bg-[#f0e2d8] p-3 text-[#964b28] ring-4 ring-white flex-shrink-0">
                <MapPin className="h-6 w-6" />
              </span>
              <div className="sm:mt-8">
                <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">
                  <span className="absolute inset-0" aria-hidden="true" />
                  View Heatmap
                </h3>
                <p className="mt-1 text-sm font-medium text-[#6b5c4e]">
                  Check overflow locations on map
                </p>
              </div>
            </div>
          </button>

          <button className="group relative rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-4 sm:p-6 transition hover:-translate-y-0.5 hover:border-[#964b28] hover:shadow-md focus-within:ring-2 focus-within:ring-[#964b28] focus-within:ring-offset-2 text-left">
            <div className="flex sm:block items-center gap-4">
              <span className="inline-flex rounded-lg bg-[#eddcd2] p-3 text-[#ba7861] ring-4 ring-white flex-shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div className="sm:mt-8">
                <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Alert Management
                </h3>
                <p className="mt-1 text-sm font-medium text-[#6b5c4e]">
                  Manage overflow alerts
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}