'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Download, BarChart3, Users, TrendingUp, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { AssignmentService } from '@/services/assignmentService';
import { FirebaseService } from '@/services/firebaseService';
import { HeatmapProcessingService } from '@/services/heatmapProcessingService';
import { ModelResult } from '@/types/garbage-detection';
import html2pdf from 'html2pdf.js';

interface ReportData {
  performanceReport: {
    totalDetections: number;
    resolvedDetections: number;
    pendingDetections: number;
    averageResolutionTime: number;
    staffEfficiency: number;
    citizenSatisfaction: number;
    monthlyTrend: Array<{
      month: string;
      detections: number;
      resolved: number;
    }>;
  };
  staffReport: {
    totalStaff: number;
    activeStaff: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageWorkload: number;
    topPerformers: Array<{
      name: string;
      completedWork: number;
      rating: number;
    }>;
    staffStats: Array<{
      name: string;
      assignedWork: number;
      completedWork: number;
      pendingWork: number;
      efficiency: number;
    }>;
  };
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple services
      const [
        assignmentStats,
        staffData,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        heatmapData,
        modelResults
      ] = await Promise.all([
        AssignmentService.getAssignmentStats(),
        AssignmentService.getStaffWithAssignedWork(),
        HeatmapProcessingService.getProcessedHeatmapData(),
        FirebaseService.fetchModelResults()
      ]);

      // Calculate performance metrics
      const totalDetections = modelResults.results.length;
      const resolvedDetections = modelResults.results.filter(r => r.status === 'CLEAN').length;
      const pendingDetections = modelResults.results.filter(r => r.status === 'LOW_OVERFLOW' || r.status === 'HIGH_OVERFLOW').length;
      
      // Calculate monthly trends (last 6 months)
      const monthlyTrend = calculateMonthlyTrend(modelResults.results);
      
      // Calculate staff metrics
      const totalStaff = staffData.length;
      const activeStaff = staffData.filter(s => s.status === 'Active').length;
      const totalAssignments = assignmentStats.totalAssignments;
      const completedAssignments = assignmentStats.completedAssignments;
      const pendingAssignments = assignmentStats.pendingAssignments;
      
      // Calculate top performers
      const topPerformers = staffData
        .sort((a, b) => (b.completedWork || 0) - (a.completedWork || 0))
        .slice(0, 5)
        .map(staff => ({
          name: staff.name,
          completedWork: staff.completedWork || 0,
          rating: staff.rating
        }));

      // Calculate staff efficiency stats
      const staffStats = staffData.map(staff => ({
        name: staff.name,
        assignedWork: staff.totalAssignedWork || 0,
        completedWork: staff.completedWork || 0,
        pendingWork: staff.pendingWork || 0,
        efficiency: (staff.totalAssignedWork || 0) > 0 ? ((staff.completedWork || 0) / (staff.totalAssignedWork || 0)) * 100 : 0
      }));

      const performanceReport = {
        totalDetections,
        resolvedDetections,
        pendingDetections,
        averageResolutionTime: calculateAverageResolutionTime(modelResults.results),
        staffEfficiency: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
        citizenSatisfaction: 85, // Placeholder - would come from citizen feedback
        monthlyTrend
      };

      const staffReport = {
        totalStaff,
        activeStaff,
        totalAssignments,
        completedAssignments,
        pendingAssignments,
        averageWorkload: totalStaff > 0 ? totalAssignments / totalStaff : 0,
        topPerformers,
        staffStats
      };

      setReportData({
        performanceReport,
        staffReport
      });

    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const calculateMonthlyTrend = (results: ModelResult[]) => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthResults = results.filter(result => {
        const resultDate = new Date(result.timestamp);
        return resultDate.getMonth() === date.getMonth() && 
               resultDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        detections: monthResults.length,
        resolved: monthResults.filter(r => r.status === 'resolved').length
      });
    }
    
    return months;
  };

  const calculateAverageResolutionTime = (results: ModelResult[]) => {
    // For now, return a placeholder since we don't have resolution timestamps
    // In a real implementation, you'd track when detections were marked as resolved
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _results = results;
    return 2; // Placeholder: 2 hours average
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setGeneratingPDF(true);
      
      // Hide images before PDF generation
      const images = reportRef.current.querySelectorAll('img');
      images.forEach((img: HTMLImageElement) => {
        img.style.display = 'none';
      });
      
      const opt = {
        margin: 1,
        filename: `municipality-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(reportRef.current).save();
      
      // Show images again after PDF generation
      images.forEach((img: HTMLImageElement) => {
        img.style.display = '';
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Municipality Reports</h1>
            <p className="text-gray-600 mt-1">Performance and staff management reports</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating reports...</h3>
            <p className="text-gray-500">Please wait while we compile the latest data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Municipality Reports</h1>
            <p className="text-gray-600 mt-1">Performance and staff management reports</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setError(null)}
                  className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Municipality Reports</h1>
          <p className="text-gray-600 mt-1">
            Performance and staff management reports - {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadReportData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportPDF}
            disabled={generatingPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Download className={`h-4 w-4 mr-2 ${generatingPDF ? 'animate-pulse' : ''}`} />
            {generatingPDF ? 'Generating PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white shadow-sm border border-gray-200 rounded-lg p-8">
        {/* Report Header */}
        <div className="text-center mb-8 border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Municipality Performance Report</h2>
          <p className="text-gray-600">Generated on {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        {/* Performance Report Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-6 w-6 text-indigo-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Performance Overview</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Detections</p>
                  <p className="text-2xl font-bold text-blue-900">{reportData.performanceReport.totalDetections}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-900">{reportData.performanceReport.resolvedDetections}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{reportData.performanceReport.pendingDetections}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Efficiency Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff Efficiency</span>
                  <span className="font-semibold">{reportData.performanceReport.staffEfficiency.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Resolution Time</span>
                  <span className="font-semibold">{reportData.performanceReport.averageResolutionTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Citizen Satisfaction</span>
                  <span className="font-semibold">{reportData.performanceReport.citizenSatisfaction}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Trend</h4>
              <div className="space-y-2">
                {reportData.performanceReport.monthlyTrend.map((month, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{month.month}</span>
                    <span className="font-medium">{month.detections} detections, {month.resolved} resolved</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Staff Report Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <Users className="h-6 w-6 text-indigo-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Staff Management Report</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Staff</p>
                  <p className="text-2xl font-bold text-blue-900">{reportData.staffReport.totalStaff}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Active Staff</p>
                  <p className="text-2xl font-bold text-green-900">{reportData.staffReport.activeStaff}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Total Assignments</p>
                  <p className="text-2xl font-bold text-purple-900">{reportData.staffReport.totalAssignments}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-600">Avg Workload</p>
                  <p className="text-2xl font-bold text-orange-900">{reportData.staffReport.averageWorkload.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h4>
            <div className="space-y-3">
              {reportData.staffReport.topPerformers.map((performer, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 mr-2">#{index + 1}</span>
                    <span className="font-medium">{performer.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{performer.completedWork} completed</span>
                    <span className="text-sm font-medium text-yellow-600">★ {performer.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Statistics Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-medium text-gray-900">Staff Performance Details</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.staffReport.staffStats.map((staff, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staff.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.assignedWork}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.completedWork}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.pendingWork}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          staff.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                          staff.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {staff.efficiency.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>This report was automatically generated by the SafaiSathi Municipal Dashboard</p>
          <p>For questions or support, contact the municipal IT department</p>
        </div>
      </div>
    </div>
  );
}
