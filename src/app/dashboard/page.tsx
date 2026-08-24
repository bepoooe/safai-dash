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

  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      // Dynamic import for html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Fetch fresh, full ecosystem data in parallel
      const [
        modelResultsResponse,
        areasData,
        staffData,
        citizenStats
      ] = await Promise.all([
        FirebaseService.fetchModelResults().catch(() => ({ results: recentActivities, totalCount: recentActivities.length, averageConfidence: 0, lastUpdated: new Date().toISOString() })),
        FirebaseService.fetchUniqueAreas().catch(() => []),
        FirebaseService.fetchStaff().catch(() => []),
        FirebaseService.getCitizenStats().catch(() => ({ totalCitizens: 0, pendingCitizens: 0, inProgressCitizens: 0, resolvedCitizens: 0, totalReports: 0, verifiedReports: 0, averageReportsPerCitizen: 0 }))
      ]);

      const allActivities = modelResultsResponse.results.length > 0 ? modelResultsResponse.results : recentActivities;
      const totalDetections = allActivities.length;
      
      const averageConfidence = totalDetections > 0 
        ? allActivities.reduce((sum, result) => sum + result.confidence_score, 0) / totalDetections
        : 0;
      const maxConfidence = totalDetections > 0 
        ? Math.max(...allActivities.map(r => r.confidence_score))
        : 0;
      const minConfidence = totalDetections > 0 
        ? Math.min(...allActivities.map(r => r.confidence_score))
        : 0;
      
      const highRiskCount = allActivities.filter(r => r.confidence_score >= 0.6).length;
      const mediumRiskCount = allActivities.filter(r => r.confidence_score >= 0.4 && r.confidence_score < 0.6).length;
      const lowRiskCount = allActivities.filter(r => r.confidence_score < 0.4).length;

      const overflowScore = totalDetections > 0 
        ? (averageConfidence * 100 * totalDetections) / 100
        : 0;
      
      const now = new Date();
      const oldestDetection = totalDetections > 0 
        ? new Date(allActivities[allActivities.length - 1].timestamp)
        : now;
      const timeDiffHours = Math.max((now.getTime() - oldestDetection.getTime()) / (1000 * 60 * 60), 1);
      const detectionFrequency = (totalDetections / timeDiffHours).toFixed(1);
      
      const latestDetection = totalDetections > 0 ? allActivities[0] : null;
      const latestStatus = latestDetection ? getStatusFromConfidence(latestDetection.confidence_score) : null;

      // Staff metrics
      const totalStaff = staffData.length;
      const activeStaff = staffData.filter(s => s.status === 'Active').length;
      const totalStaffCollections = staffData.reduce((sum, s) => sum + (s.totalCollections || 0), 0);

      // Citizen metrics
      const totalCitizenReports = citizenStats.totalReports || citizenStats.totalCitizens || 0;
      const resolvedCitizenReports = citizenStats.resolvedCitizens || 0;
      const pendingCitizenReports = citizenStats.pendingCitizens || 0;
      const resolutionRate = totalCitizenReports > 0 
        ? ((resolvedCitizenReports / totalCitizenReports) * 100).toFixed(1)
        : '100.0';
      
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

      const reportId = `KMC-SAF-${Date.now().toString().slice(-6)}`;
      
      // Create municipal report HTML
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SafaiSathi Municipal Waste Intelligence Report</title>
          <style>
            @page {
              margin: 12mm 15mm;
              size: A4 portrait;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.4;
              color: #1f1712;
              background: #fff;
              font-size: 11px;
            }
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2.5px solid #964b28;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .org-title {
              font-size: 18px;
              font-weight: 900;
              color: #964b28;
              letter-spacing: -0.5px;
              margin: 0;
              text-transform: uppercase;
            }
            .org-subtitle {
              font-size: 11px;
              font-weight: 700;
              color: #6b5c4e;
              margin-top: 2px;
            }
            .report-meta {
              text-align: right;
              font-size: 10px;
              color: #7a6a58;
            }
            .report-badge {
              display: inline-block;
              background: #964b28;
              color: #fff;
              font-weight: 700;
              font-size: 9px;
              padding: 2px 8px;
              border-radius: 4px;
              margin-bottom: 4px;
            }
            .section {
              margin-bottom: 16px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #241c15;
              border-left: 3.5px solid #964b28;
              padding-left: 8px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }
            .kpi-card {
              background: #fdfbf7;
              border: 1px solid #ded5c5;
              border-radius: 6px;
              padding: 10px;
            }
            .kpi-label {
              font-size: 9px;
              font-weight: 700;
              color: #7a6a58;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kpi-value {
              font-size: 16px;
              font-weight: 900;
              color: #1f1712;
              margin-top: 3px;
            }
            .kpi-sub {
              font-size: 9px;
              color: #8a7a6c;
              margin-top: 2px;
            }
            .primary-location-card {
              background: #fdfaf6;
              border: 1px solid #ded5c5;
              border-left: 4px solid #ba7861;
              padding: 10px 12px;
              border-radius: 6px;
              margin-bottom: 14px;
            }
            .location-title {
              font-size: 11px;
              font-weight: 800;
              color: #8a4220;
              margin-bottom: 4px;
            }
            .location-text {
              font-size: 11px;
              font-weight: 600;
              color: #241c15;
            }
            .coords-row {
              display: flex;
              gap: 16px;
              margin-top: 6px;
              font-size: 10px;
              color: #6b5c4e;
            }
            .coords-row span {
              font-weight: 700;
              color: #1f1712;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 10px;
            }
            th {
              background: #f4ede4;
              color: #4a3b32;
              font-weight: 700;
              text-align: left;
              padding: 6px 8px;
              border: 1px solid #ded5c5;
              font-size: 9px;
              text-transform: uppercase;
            }
            td {
              padding: 6px 8px;
              border: 1px solid #e5dcce;
              color: #241c15;
            }
            tr:nth-child(even) td {
              background: #faf7f2;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 8.5px;
              font-weight: 700;
              text-align: center;
            }
            .badge-high { background: #fee2e2; color: #991b1b; }
            .badge-med { background: #ffedd5; color: #9a3412; }
            .badge-low { background: #fef9c3; color: #854d0e; }
            .badge-clean { background: #dcfce7; color: #166534; }
            .badge-assigned { background: #ede9fe; color: #5b21b6; }
            .recommendations-box {
              background: #fdfaf6;
              border: 1px solid #ded5c5;
              border-radius: 6px;
              padding: 10px 14px;
            }
            .rec-item {
              margin-bottom: 6px;
              padding-left: 14px;
              position: relative;
              font-size: 10px;
              color: #4a3b32;
            }
            .rec-item::before {
              content: "✔";
              position: absolute;
              left: 0;
              color: #964b28;
              font-weight: bold;
              font-size: 9px;
            }
            .footer-sign {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 24px;
              padding-top: 14px;
              border-top: 1px solid #ded5c5;
              page-break-inside: avoid;
            }
            .stamp-box {
              border: 2px dashed #964b28;
              padding: 8px 14px;
              border-radius: 6px;
              text-align: center;
              font-size: 9px;
              font-weight: 800;
              color: #964b28;
              text-transform: uppercase;
            }
            .signature-block {
              text-align: right;
              font-size: 10px;
              color: #6b5c4e;
            }
            .sig-line {
              width: 140px;
              border-bottom: 1px solid #1f1712;
              margin-bottom: 4px;
              margin-left: auto;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="report-badge">OFFICIAL MUNICIPAL REPORT</div>
              <h1 class="org-title">Municipal Corporation of Kolkata</h1>
              <div class="org-subtitle">SafaiSathi Smart Urban Waste Management & Intelligence Division</div>
            </div>
            <div class="report-meta">
              <div><strong>Ref ID:</strong> ${reportId}</div>
              <div><strong>Generated:</strong> ${reportDate} IST</div>
              <div><strong>Classification:</strong> Operational Intelligence</div>
            </div>
          </div>

          <!-- Executive KPI Metrics -->
          <div class="section">
            <div class="section-title">1. Executive Sanitation KPIs</div>
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Total Detections</div>
                <div class="kpi-value">${totalDetections}</div>
                <div class="kpi-sub">${detectionFrequency} detections/hour</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Avg AI Confidence</div>
                <div class="kpi-value">${(averageConfidence * 100).toFixed(1)}%</div>
                <div class="kpi-sub">Range: ${(minConfidence * 100).toFixed(0)}% – ${(maxConfidence * 100).toFixed(0)}%</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">High Risk Hotspots</div>
                <div class="kpi-value" style="color: #991b1b;">${highRiskCount}</div>
                <div class="kpi-sub">${mediumRiskCount} Moderate, ${lowRiskCount} Minor</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Overflow Index</div>
                <div class="kpi-value" style="color: #8a4220;">${overflowScore.toFixed(2)}</div>
                <div class="kpi-sub">Municipal Severity Index</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Workforce Deployed</div>
                <div class="kpi-value">${activeStaff} / ${totalStaff}</div>
                <div class="kpi-sub">${totalStaffCollections.toLocaleString()} Total collections</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Citizen Resolution</div>
                <div class="kpi-value" style="color: #166534;">${resolutionRate}%</div>
                <div class="kpi-sub">${resolvedCitizenReports} of ${totalCitizenReports} reports resolved</div>
              </div>
            </div>
          </div>

          <!-- Location Intelligence Primary Focus -->
          <div class="section">
            <div class="section-title">2. Primary Location Intelligence</div>
            <div class="primary-location-card">
              <div class="location-title">Latest Detected Garbage Hotspot</div>
              <div class="location-text">${latestDetection ? latestDetection.address : 'No active garbage detections recorded in database'}</div>
              ${latestDetection ? `
                <div class="coords-row">
                  <div>Latitude: <span>${latestDetection.latitude.toFixed(6)}° N</span></div>
                  <div>Longitude: <span>${latestDetection.longitude.toFixed(6)}° E</span></div>
                  <div>GPS Accuracy: <span>${typeof latestDetection.accuracy === 'string' ? latestDetection.accuracy : `±${latestDetection.accuracy}m`}</span></div>
                  <div>Status: <span class="badge ${latestStatus?.status.includes('HIGH') ? 'badge-high' : latestStatus?.status.includes('MEDIUM') ? 'badge-med' : 'badge-low'}">${latestStatus?.status || 'ACTIVE'}</span></div>
                </div>
              ` : ''}
            </div>

            <!-- Ward Breakdown Table -->
            ${areasData.length > 0 ? `
              <div style="margin-top: 10px;">
                <div style="font-weight: 700; font-size: 10.5px; color: #4a3b32; margin-bottom: 4px;">Ward & Locality Vulnerability Distribution</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 45%;">Ward / Locality Name</th>
                      <th style="width: 15%; text-align: center;">Incidents</th>
                      <th style="width: 20%; text-align: center;">Risk Level</th>
                      <th style="width: 20%;">Latest Detection</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${areasData.slice(0, 6).map((area) => {
                      const riskBadge = area.count >= 4 ? 'badge-high' : area.count >= 2 ? 'badge-med' : 'badge-low';
                      const riskLabel = area.count >= 4 ? 'HIGH VULNERABILITY' : area.count >= 2 ? 'MODERATE' : 'LOW RISK';
                      return `
                        <tr>
                          <td><strong>${area.area}</strong></td>
                          <td style="text-align: center; font-weight: bold;">${area.count}</td>
                          <td style="text-align: center;"><span class="badge ${riskBadge}">${riskLabel}</span></td>
                          <td>${new Date(area.latestDetection).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>

          <!-- Detection Event Logs -->
          <div class="section">
            <div class="section-title">3. Comprehensive Detection Event Logs</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">ID</th>
                  <th style="width: 36%;">Location Address</th>
                  <th style="width: 20%;">GPS Coordinates</th>
                  <th style="width: 12%; text-align: center;">Confidence</th>
                  <th style="width: 12%; text-align: center;">Status</th>
                  <th style="width: 12%;">Timestamp (IST)</th>
                </tr>
              </thead>
              <tbody>
                ${allActivities.length > 0 ? allActivities.slice(0, 10).map((act, idx) => {
                  const actStatus = getStatusFromConfidence(act.confidence_score);
                  const badgeClass = actStatus.status.includes('HIGH') ? 'badge-high' : actStatus.status.includes('MEDIUM') ? 'badge-med' : 'badge-low';
                  return `
                    <tr>
                      <td style="font-weight: bold;">#${idx + 1}</td>
                      <td>${act.address}</td>
                      <td style="font-family: monospace; font-size: 9px;">${act.latitude.toFixed(5)}°, ${act.longitude.toFixed(5)}°</td>
                      <td style="text-align: center; font-weight: bold;">${(act.confidence_score * 100).toFixed(1)}%</td>
                      <td style="text-align: center;"><span class="badge ${badgeClass}">${actStatus.status.replace(' OVERFLOW', '')}</span></td>
                      <td style="font-size: 9px;">${new Date(act.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 12px; color: #7a6a58;">No detection event logs available.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Municipal Recommendations -->
          <div class="section">
            <div class="section-title">4. Operational Directives & Recommendations</div>
            <div class="recommendations-box">
              ${totalDetections > 0 ? `
                <div class="rec-item">Deploy immediate sanitation team to primary coordinates: <strong>${latestDetection?.address || 'Detected Area'}</strong></div>
                <div class="rec-item">Prioritize <strong>${highRiskCount} high-risk overflow areas</strong> with dedicated compactor truck dispatch within the next 2 hours.</div>
                <div class="rec-item">Maintain workforce allocation: <strong>${activeStaff} active Safai Karmis</strong> assigned across high-density wards.</div>
                <div class="rec-item">Cross-verify resolution with citizen reports (${pendingCitizenReports} pending verifications in progress).</div>
                <div class="rec-item">Synchronize automated database cleanup schedule every 30 seconds for real-time GIS freshness.</div>
              ` : `
                <div class="rec-item">All monitored zones are currently within clean tolerance levels. Continue standard surveillance schedule.</div>
                <div class="rec-item">Maintain routine round-the-clock CCTV AI detection stream active across all municipal wards.</div>
              `}
            </div>
          </div>

          <!-- Official Sign-off & Verification -->
          <div class="footer-sign">
            <div class="stamp-box">
              SAFAISATHI VERIFIED<br>
              <span style="font-size: 8px; font-weight: 500;">Govt of West Bengal / KMC</span>
            </div>
            <div class="signature-block">
              <div class="sig-line"></div>
              <div><strong>Chief Sanitation Officer</strong></div>
              <div>Municipal Solid Waste Management Dept.</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: `SafaiSathi-Municipal-Report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportHTML;
      document.body.appendChild(tempDiv);
      
      await html2pdf().set(opt).from(tempDiv).save();
      
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setExportingPDF(false);
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
                disabled={exportingPDF}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <Download className={`h-4 w-4 ${exportingPDF ? 'animate-bounce' : ''}`} />
                {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
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