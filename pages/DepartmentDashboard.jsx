import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LayoutDashboard, FileText, TrendingUp, Users, Database, BarChart3,
  Clock, CheckCircle, AlertTriangle, Activity, Briefcase, Settings,
  Upload, MessageSquare, FileCheck, Search, Filter, Download, Eye,
  Edit, Plus, X, ChevronRight, Calendar, MapPin, User, Phone, Mail
} from 'lucide-react';
import waterDeptData from '../data/waterDepartmentData.json';
import detailedResourcesData from '../data/detailedResourcesData.json';
import departmentHeadData from '../data/departmentHeadDashboard.json';
import advancedFeaturesData from '../data/advancedFeaturesData.json';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DepartmentDashboard = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState(waterDeptData);
  const [activeResourceTab, setActiveResourceTab] = useState('staff');

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Custom Scrollbar Styles */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }

      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }

      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Map View', icon: MapPin },
    { id: 'grievances', label: 'Grievances', icon: FileText },
    { id: 'cost-tracking', label: 'Cost Tracking', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: Briefcase },
    { id: 'sla-policy', label: 'SLA Policy', icon: Clock },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { id: 'ai-insights', label: 'AI Insights', icon: TrendingUp },
    { id: 'feedback', label: 'Citizen Feedback', icon: MessageSquare },
    { id: 'predictive', label: 'Predictive Maintenance', icon: Settings },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'officers', label: 'Officers', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: FileCheck }
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-slate-100 text-slate-800 border-slate-300',
      'In Progress': 'bg-slate-200 text-slate-900 border-slate-400',
      'Resolved': 'bg-slate-100 text-slate-700 border-slate-300',
      'Overdue': 'bg-slate-200 text-slate-900 border-slate-400'
    };
    return colors[status] || 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Emergency': 'bg-slate-200 text-slate-900 border-slate-400',
      'Urgent': 'bg-slate-200 text-slate-900 border-slate-400',
      'High': 'bg-slate-100 text-slate-800 border-slate-300',
      'Medium': 'bg-slate-100 text-slate-700 border-slate-300',
      'Low': 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return colors[priority] || 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const renderOverview = () => {
    const { grievanceOverview, performanceMetrics, resourceHealth, tenderProjectStatus, departmentHealthScore } = departmentHeadData;

    return (
      <div className="space-y-6">
        {/* Department Health Score - Top Banner */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Department Health Score</h2>
              <p className="text-slate-600 text-sm font-medium">Overall Performance Indicator</p>
            </div>
            <div className="text-center">
              <div className="text-7xl font-bold text-slate-900">{departmentHealthScore.overallScore}</div>
              <div className="text-2xl font-semibold text-slate-500">/ {departmentHealthScore.maxScore}</div>
              <div className="mt-3 bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold text-sm shadow-md">
                {departmentHealthScore.status} • {departmentHealthScore.trend}
              </div>
            </div>
          </div>
        </div>

        {/* Top Section - KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Grievance Overview Cards */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {grievanceOverview.monthlyTrend}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Grievances</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{grievanceOverview.totalGrievances}</p>
            <p className="text-xs text-slate-500 mt-1">This Month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">PENDING</span>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pending</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{grievanceOverview.pendingGrievances}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">RESOLVED</span>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resolved</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{grievanceOverview.resolvedGrievances}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">OVERDUE</span>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Overdue</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{grievanceOverview.overdueGrievances}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8 text-slate-700" />
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">EMERGENCY</span>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Emergency</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{grievanceOverview.emergencyGrievances}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">KPI Score</h3>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-slate-900">{performanceMetrics.kpiScore}%</p>
              <span className="text-sm font-semibold text-slate-600 mb-1">{performanceMetrics.performanceTrend}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Target: {performanceMetrics.kpiTarget}%</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">SLA Compliance</h3>
            <p className="text-4xl font-bold text-slate-900">{performanceMetrics.slaCompliance}%</p>
            <p className="text-xs text-slate-500 mt-2">Within Deadline</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Avg Resolution</h3>
            <p className="text-4xl font-bold text-slate-900">{performanceMetrics.avgResolutionTime}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Citizen Rating</h3>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-slate-900">{performanceMetrics.citizenSatisfaction}</p>
              <span className="text-slate-400 text-2xl">★</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Out of 5.0</p>
          </div>
        </div>

        {/* Resource Health */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-8 shadow-lg">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Resource Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Staff</h4>
                <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                  resourceHealth.staff.status === 'Shortage' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {resourceHealth.staff.status}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {resourceHealth.staff.available} / {resourceHealth.staff.required}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-500"
                  style={{ width: `${resourceHealth.staff.utilizationRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Utilization: {resourceHealth.staff.utilizationRate}%</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Equipment</h4>
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {resourceHealth.equipment.status}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {resourceHealth.equipment.available} / {resourceHealth.equipment.total}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-500"
                  style={{ width: `${resourceHealth.equipment.availabilityPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Available: {resourceHealth.equipment.availabilityPercent}%</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Budget</h4>
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {resourceHealth.budget.status}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                ₹{(resourceHealth.budget.remaining / 10000000).toFixed(1)} Cr
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-500"
                  style={{ width: `${resourceHealth.budget.utilizationPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Used: {resourceHealth.budget.utilizationPercent}%</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Materials</h4>
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {resourceHealth.materials.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xl font-bold text-slate-700">{resourceHealth.materials.adequate}</div>
                  <div className="text-xs text-slate-500">Adequate</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-700">{resourceHealth.materials.lowStock}</div>
                  <div className="text-xs text-slate-500">Low</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-700">{resourceHealth.materials.critical}</div>
                  <div className="text-xs text-slate-500">Critical</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tender & Project Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all text-center">
            <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <div className="text-3xl font-bold text-slate-900">{tenderProjectStatus.activeTenders}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-2">Active Tenders</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all text-center">
            <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <div className="text-3xl font-bold text-slate-900">{tenderProjectStatus.activeProjects}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-2">Active Projects</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all text-center">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-slate-700">{tenderProjectStatus.projectsAtRisk}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-2">Projects at Risk</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-md hover:shadow-lg transition-all text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-slate-700">{tenderProjectStatus.projectsDelayed}</div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-2">Projects Delayed</div>
          </div>
        </div>

        {/* AI Insights - Most Powerful Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-slate-700" />
            <h3 className="text-xl font-bold text-slate-900">AI Insights & Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentHeadData.aiInsights.slice(0, 4).map((insight) => (
              <div key={insight.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                    insight.priority === 'High' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                    insight.priority === 'Medium' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {insight.priority} Priority
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {(insight.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-3">{insight.message}</p>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Recommendation:</p>
                  <p className="text-xs font-medium text-slate-800">{insight.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveTab('ai-insights')}
            className="w-full mt-4 py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
          >
            View All AI Insights
          </button>
        </div>

        {/* Zone Performance Heatmap */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-8 shadow-lg">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Zone Performance Overview</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Resolution Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Avg Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Utilization</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {departmentHeadData.zonePerformance.map((zone) => (
                  <tr key={zone.zone} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{zone.zone}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{zone.activeGrievances}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{zone.resolutionRate}%</div>
                        <div className="w-20 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-slate-700 h-full rounded-full transition-all duration-500"
                            style={{ width: `${zone.resolutionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{zone.avgResolutionTime}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{zone.staffAssigned}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{zone.resourceUtilization}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                        zone.riskLevel === 'High' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                        zone.riskLevel === 'Medium' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {zone.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Risk Monitoring */}
        <div className="bg-white rounded-lg border-2 border-black p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-black" />
            <h3 className="text-lg font-black text-gray-900 uppercase">Critical Alerts & Risks</h3>
          </div>
          <div className="space-y-3">
            {departmentHeadData.alertsRiskMonitoring.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-2 ${
                alert.severity === 'Critical' ? 'bg-red-50 border-red-300' :
                alert.severity === 'High' ? 'bg-orange-50 border-orange-300' :
                'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${
                        alert.severity === 'Critical' ? 'bg-red-100 text-red-900 border-red-300' :
                        alert.severity === 'High' ? 'bg-orange-100 text-orange-900 border-orange-300' :
                        'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-gray-600 uppercase">{alert.type}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">{alert.message}</p>
                    <p className="text-xs font-semibold text-gray-700">Action: {alert.action}</p>
                  </div>
                  <button className="ml-4 px-4 py-2 bg-black text-white rounded font-bold text-xs uppercase hover:bg-gray-800">
                    Take Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-lg border-2 border-black p-6">
          <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Recent Activity Feed</h3>
          <div className="space-y-3">
            {departmentHeadData.recentActivityFeed.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-black transition-all">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.priority === 'Emergency' ? 'bg-red-600' :
                  activity.priority === 'High' ? 'bg-orange-500' :
                  activity.priority === 'Medium' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()} • {activity.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category-wise Visualization */}
        <div className="bg-white rounded-lg border-2 border-black p-6">
          <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Category-wise Grievances</h3>
          <div className="space-y-4">
            {data.analytics.complaintsByCategory.map((cat, idx) => (
              <div 
                key={cat.category}
                className="cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-all border-2 border-transparent hover:border-black"
                onClick={() => {
                  setFilterCategory(cat.category);
                  setActiveTab('grievances');
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-black text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-bold text-gray-900 uppercase">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-black">{cat.count}</span>
                    <span className="text-sm font-bold text-gray-600">{cat.percentage}%</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 border-2 border-gray-300">
                  <div
                    className="bg-black h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency & Urgent Grievances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emergency Grievances */}
          <div className="bg-white rounded-lg border-2 border-black">
            <div className="p-4 border-b-2 border-black bg-red-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-black" />
                <h3 className="text-lg font-black text-black uppercase">Emergency Grievances</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {data.grievances.filter(g => g.priority === 'Emergency').slice(0, 3).map((grievance) => (
                  <div key={grievance.id} className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-black transition-all cursor-pointer bg-white"
                    onClick={() => { setSelectedGrievance(grievance); setActiveTab('grievances'); }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-black">{grievance.id}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                          {grievance.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{grievance.category}</p>
                      <p className="text-xs text-gray-600 mt-1">{grievance.location}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black" />
                  </div>
                ))}
                {data.grievances.filter(g => g.priority === 'Emergency').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm font-semibold">No emergency grievances</p>
                  </div>
                )}
                {data.grievances.filter(g => g.priority === 'Emergency').length > 3 && (
                  <button
                    onClick={() => {
                      setFilterPriority('Emergency');
                      setActiveTab('grievances');
                    }}
                    className="w-full mt-2 py-2 bg-black text-white rounded-lg font-bold uppercase text-sm hover:bg-gray-800 transition-all"
                  >
                    View More ({data.grievances.filter(g => g.priority === 'Emergency').length - 3} more)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Urgent Grievances */}
          <div className="bg-white rounded-lg border-2 border-black">
            <div className="p-4 border-b-2 border-black bg-orange-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-black" />
                <h3 className="text-lg font-black text-black uppercase">Urgent Grievances</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {data.grievances.filter(g => g.priority === 'Urgent').slice(0, 3).map((grievance) => (
                  <div key={grievance.id} className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-black transition-all cursor-pointer bg-white"
                    onClick={() => { setSelectedGrievance(grievance); setActiveTab('grievances'); }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-black">{grievance.id}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                          {grievance.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{grievance.category}</p>
                      <p className="text-xs text-gray-600 mt-1">{grievance.location}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black" />
                  </div>
                ))}
                {data.grievances.filter(g => g.priority === 'Urgent').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm font-semibold">No urgent grievances</p>
                  </div>
                )}
                {data.grievances.filter(g => g.priority === 'Urgent').length > 3 && (
                  <button
                    onClick={() => {
                      setFilterPriority('Urgent');
                      setActiveTab('grievances');
                    }}
                    className="w-full mt-2 py-2 bg-black text-white rounded-lg font-bold uppercase text-sm hover:bg-gray-800 transition-all"
                  >
                    View More ({data.grievances.filter(g => g.priority === 'Urgent').length - 3} more)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 border-2 border-black">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">Avg Resolution Time</h3>
            <p className="text-4xl font-black text-black">{data.dashboardStats.avgResolutionTime}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-2 border-black">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">Performance Score</h3>
            <p className="text-4xl font-black text-black">{data.dashboardStats.performanceScore}%</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-2 border-black">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">SLA Compliance</h3>
            <p className="text-4xl font-black text-black">{data.dashboardStats.slaCompliance}</p>
          </div>
        </div>

        {/* Recent Grievances */}
        <div className="bg-white rounded-lg border-2 border-black">
          <div className="p-4 border-b-2 border-black bg-gray-50">
            <h3 className="text-lg font-black text-gray-900 uppercase">Recent Grievances</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {data.grievances.slice(0, 3).map((grievance) => (
                <div key={grievance.id} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-black transition-all cursor-pointer"
                  onClick={() => { setSelectedGrievance(grievance); setActiveTab('grievances'); }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-900">{grievance.id}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                        {grievance.status}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${getPriorityColor(grievance.priority)}`}>
                        {grievance.priority}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{grievance.category}</p>
                    <p className="text-xs text-gray-500 mt-1">{grievance.location}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('grievances')}
              className="w-full mt-4 py-3 bg-black text-white rounded-lg font-bold uppercase text-sm hover:bg-gray-800 transition-all"
            >
              View More Grievances
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGrievances = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border-2 border-black">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search grievances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none font-medium"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none font-bold"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none font-bold"
          >
            <option value="all">All Categories</option>
            {data.analytics.complaintsByCategory.map(cat => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none font-bold"
          >
            <option value="all">All Priorities</option>
            <option value="Emergency">Emergency</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          {(filterStatus !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterCategory('all');
                setFilterPriority('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-black text-white rounded-lg font-bold uppercase text-sm hover:bg-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Grievances List */}
      <div className="bg-white rounded-lg border-2 border-black overflow-hidden">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Citizen</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Officer</th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-200">
            {data.grievances
              .filter(g => filterStatus === 'all' || g.status === filterStatus)
              .filter(g => filterCategory === 'all' || g.category === filterCategory)
              .filter(g => filterPriority === 'all' || g.priority === filterPriority)
              .filter(g => searchQuery === '' || 
                g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                g.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                g.category.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((grievance) => (
                <tr key={grievance.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{grievance.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{grievance.citizenName}</div>
                    <div className="text-xs text-gray-500">{grievance.citizenPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{grievance.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getPriorityColor(grievance.priority)}`}>
                      {grievance.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{grievance.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(grievance.dateSubmitted).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                      {grievance.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{grievance.assignedOfficer}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedGrievance(grievance)}
                        className="p-2 bg-black text-white rounded hover:bg-gray-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 border-2 border-black text-black rounded hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {data.grievances
          .filter(g => filterStatus === 'all' || g.status === filterStatus)
          .filter(g => filterCategory === 'all' || g.category === filterCategory)
          .filter(g => filterPriority === 'all' || g.priority === filterPriority)
          .filter(g => searchQuery === '' || 
            g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.category.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-bold text-gray-500">No grievances found</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Grievance Detail Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-700">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Grievance Details</h2>
                <p className="text-slate-400 mt-1 text-xs font-semibold">ID: {selectedGrievance.id}</p>
              </div>
              <button 
                onClick={() => setSelectedGrievance(null)} 
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-100px)] bg-white">
              {/* Basic Info - Inline */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Grievance ID</label>
                  <p className="text-xl font-black text-slate-900 mt-1">{selectedGrievance.id}</p>
                </div>
                <span className={`text-xs font-bold px-4 py-2 rounded-lg border ${getStatusColor(selectedGrievance.status)}`}>
                  {selectedGrievance.status}
                </span>
              </div>

              {/* Citizen Info - Clean Grid */}
              <div className="bg-slate-900 rounded-xl p-5 text-white">
                <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Citizen Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Name</p>
                    <p className="font-bold">{selectedGrievance.citizenName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Phone</p>
                    <p className="font-bold">{selectedGrievance.citizenPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Email</p>
                    <p className="font-bold">{selectedGrievance.citizenEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Location</p>
                    <p className="font-bold">{selectedGrievance.location}</p>
                  </div>
                </div>
              </div>

              {/* Description - Simple */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase mb-2">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {selectedGrievance.description}
                </p>
              </div>

              {/* Workflow Timeline - Compact */}
              {selectedGrievance.workflowStages && (
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase mb-4">Workflow Timeline</h3>
                  <div className="space-y-4">
                    {selectedGrievance.workflowStages.map((stage, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        {/* Connector Line */}
                        {idx !== selectedGrievance.workflowStages.length - 1 && (
                          <div 
                            className="absolute left-5 top-12 w-0.5 bg-slate-300" 
                            style={{ height: 'calc(100%)' }}
                          ></div>
                        )}
                        
                        {/* Stage Indicator */}
                        <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md ${
                          stage.status === 'completed' ? 'bg-green-600' :
                          stage.status === 'current' ? 'bg-blue-600 ring-2 ring-blue-200' :
                          'bg-slate-400'
                        }`}>
                          {stage.status === 'completed' ? '✓' : idx + 1}
                        </div>

                        {/* Stage Content - Minimal */}
                        <div className="flex-1 bg-slate-50 rounded-lg p-4 border-l-4 hover:shadow-sm transition-all" style={{
                          borderLeftColor: stage.status === 'completed' ? '#16a34a' : stage.status === 'current' ? '#2563eb' : '#94a3b8'
                        }}>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-sm font-black text-slate-900 uppercase">{stage.stage}</h4>
                              {stage.timestamp && (
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(stage.timestamp).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded ${
                              stage.status === 'completed' ? 'bg-green-600 text-white' :
                              stage.status === 'current' ? 'bg-blue-600 text-white' :
                              'bg-slate-400 text-white'
                            }`}>
                              {stage.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {stage.officer && (
                              <div>
                                <p className="text-slate-500 font-semibold uppercase mb-0.5">Officer</p>
                                <p className="font-bold text-slate-900">{stage.officer}</p>
                              </div>
                            )}

                            {stage.action && stage.action !== 'Pending' && (
                              <div>
                                <p className="text-slate-500 font-semibold uppercase mb-0.5">Action</p>
                                <p className="font-semibold text-slate-800">{stage.action}</p>
                              </div>
                            )}

                            {stage.notes && (
                              <div className="col-span-2">
                                <p className="text-slate-500 font-semibold uppercase mb-0.5">Notes</p>
                                <p className="text-slate-700">{stage.notes}</p>
                              </div>
                            )}

                            {stage.gpsLocation && (
                              <div className="col-span-2">
                                <p className="text-slate-500 font-semibold uppercase mb-0.5">GPS Location</p>
                                <p className="font-mono text-slate-700">
                                  {stage.gpsLocation.lat}, {stage.gpsLocation.lng}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {stage.progressPercentage !== undefined && stage.status === 'current' && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-slate-500 font-semibold uppercase">Progress</p>
                                <p className="text-xs font-black text-blue-600">{stage.progressPercentage}%</p>
                              </div>
                              <div className="w-full bg-slate-300 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${stage.progressPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Attachments */}
                          {stage.attachments && stage.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs text-slate-500 font-semibold uppercase mb-1.5">Attachments</p>
                              <div className="flex flex-wrap gap-1.5">
                                {stage.attachments.map((file, fileIdx) => (
                                  <span key={fileIdx} className="text-xs bg-white px-2 py-1 rounded border border-slate-300 font-semibold text-slate-700">
                                    {file}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold uppercase text-xs hover:bg-slate-800 transition-all shadow-md">
                  Update Status
                </button>
                <button className="flex-1 border-2 border-slate-900 text-slate-900 py-3 rounded-lg font-bold uppercase text-xs hover:bg-slate-50 transition-all">
                  Assign Officer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Complaints by Category */}
      <div className="bg-white rounded-lg p-6 border-2 border-black">
        <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Complaints by Category</h3>
        <div className="space-y-3">
          {data.analytics.complaintsByCategory.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-700">{cat.category}</span>
                <span className="text-sm font-black text-black">{cat.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-gray-300">
                <div
                  className="bg-black h-full rounded-full"
                  style={{ width: `${cat.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complaints by Area */}
      <div className="bg-white rounded-lg p-6 border-2 border-black">
        <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Complaints by Area</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.analytics.complaintsByArea.map((area) => (
            <div key={area.area} className="border-2 border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-600 uppercase">{area.area}</h4>
              <p className="text-3xl font-black text-black mt-2">{area.count}</p>
              <p className="text-xs text-gray-500 mt-1">Resolved: {area.resolved}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Performance */}
      <div className="bg-white rounded-lg p-6 border-2 border-black">
        <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Monthly Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-black uppercase">Month</th>
                <th className="px-4 py-2 text-left text-xs font-black uppercase">Received</th>
                <th className="px-4 py-2 text-left text-xs font-black uppercase">Resolved</th>
                <th className="px-4 py-2 text-left text-xs font-black uppercase">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.analytics.monthlyPerformance.map((month) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold">{month.month}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{month.received}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{month.resolved}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{month.avgTime} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderResources = () => {
    const getStatusColor = (status) => {
      const colors = {
        'Available': 'bg-green-100 text-green-800 border-green-300',
        'Busy': 'bg-orange-100 text-orange-800 border-orange-300',
        'On Leave': 'bg-gray-100 text-gray-800 border-gray-300',
        'On Field': 'bg-blue-100 text-blue-800 border-blue-300',
        'In Use': 'bg-orange-100 text-orange-800 border-orange-300',
        'Under Maintenance': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'Adequate': 'bg-green-100 text-green-800 border-green-300',
        'Low Stock': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'Critical': 'bg-red-100 text-red-800 border-red-300'
      };
      return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    return (
      <div className="space-y-6">
        {/* Resource Tabs */}
        <div className="bg-white rounded-lg border-2 border-black overflow-hidden">
          <div className="flex border-b-2 border-black">
            {[
              { id: 'staff', label: 'Staff Management' },
              { id: 'equipment', label: 'Equipment' },
              { id: 'materials', label: 'Materials' },
              { id: 'contractors', label: 'Contractors' },
              { id: 'zones', label: 'Zone Allocation' },
              { id: 'budget', label: 'Budget Projects' },
              { id: 'requests', label: 'Resource Requests' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveResourceTab(tab.id)}
                className={`flex-1 px-4 py-3 font-bold uppercase text-xs transition-all ${
                  activeResourceTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Staff Management Tab */}
            {activeResourceTab === 'staff' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Staff Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-black">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Staff ID</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Zone</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Workload</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Specialization</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailedResourcesData.staff.map(staff => (
                        <tr key={staff.staffId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-bold text-black">{staff.staffId}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-bold text-gray-900">{staff.name}</div>
                            <div className="text-xs text-gray-500">{staff.contactInfo.phone}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">{staff.role}</td>
                          <td className="px-4 py-3 text-sm">{staff.zone}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(staff.availabilityStatus)}`}>
                              {staff.availabilityStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">{staff.currentWorkload} tasks</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{staff.skillSpecialization}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-bold text-black">{staff.performanceScore}%</div>
                            <div className="text-xs text-gray-500">{staff.avgResolutionTime}d avg</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeResourceTab === 'equipment' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Equipment Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedResourcesData.equipment.map(equip => (
                    <div key={equip.equipmentId} className="border-2 border-black rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-black text-gray-900">{equip.equipmentType}</h4>
                          <p className="text-xs text-gray-500">{equip.equipmentId}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(equip.status)}`}>
                          {equip.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-bold">{equip.assignedLocation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assigned To:</span>
                          <span className="font-semibold">{equip.assignedWorker || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Condition:</span>
                          <span className="font-bold">{equip.condition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Utilization:</span>
                          <span className="font-bold">{equip.utilizationPercentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Maintenance:</span>
                          <span className="font-semibold text-xs">{equip.nextMaintenanceDate}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">{equip.specifications}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeResourceTab === 'materials' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Material Inventory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-black">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Material ID</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Available</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Min Threshold</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Location</th>
                        <th className="px-4 py-2 text-left text-xs font-black uppercase">Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailedResourcesData.materials.map(material => (
                        <tr key={material.materialId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-bold">{material.materialId}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{material.name}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-black text-black">{material.quantityAvailable}</div>
                            <div className="text-xs text-gray-500">{material.unit}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">{material.minimumThreshold} {material.unit}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(material.status)}`}>
                              {material.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{material.location}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{material.supplier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contractors Tab */}
            {activeResourceTab === 'contractors' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Contractor Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedResourcesData.contractors.map(contractor => (
                    <div key={contractor.contractorId} className="border-2 border-black rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-black text-gray-900">{contractor.name}</h4>
                          <p className="text-xs text-gray-500">{contractor.contractorId}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-black">{contractor.performanceScore}%</div>
                          <div className="text-xs text-gray-500">Performance</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contact:</span>
                          <span className="font-semibold">{contractor.contactPerson}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-semibold">{contractor.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Projects:</span>
                          <span className="font-bold">{contractor.assignedProjects}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-bold">{contractor.completedProjects}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Time:</span>
                          <span className="font-semibold">{contractor.avgCompletionTime} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contract Value:</span>
                          <span className="font-bold">₹{(contractor.contractValue / 10000000).toFixed(1)} Cr</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-700">Specialization:</p>
                        <p className="text-xs text-gray-600">{contractor.specialization}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zone Allocation Tab */}
            {activeResourceTab === 'zones' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Zone Resource Allocation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedResourcesData.zoneResourceAllocation.map(zone => (
                    <div key={zone.zone} className="border-2 border-black rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-black text-gray-900">{zone.zone}</h4>
                          <p className="text-xs text-gray-500">{zone.area}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${
                          zone.status === 'Optimal' ? 'bg-green-100 text-green-800 border-green-300' :
                          zone.status === 'Overloaded' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}>
                          {zone.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="text-center border-2 border-gray-200 rounded p-2">
                          <div className="text-2xl font-black text-black">{zone.workers}</div>
                          <div className="text-xs text-gray-600">Workers</div>
                        </div>
                        <div className="text-center border-2 border-gray-200 rounded p-2">
                          <div className="text-2xl font-black text-black">{zone.equipment}</div>
                          <div className="text-xs text-gray-600">Equipment</div>
                        </div>
                        <div className="text-center border-2 border-gray-200 rounded p-2">
                          <div className="text-2xl font-black text-black">{zone.activeGrievances}</div>
                          <div className="text-xs text-gray-600">Active</div>
                        </div>
                        <div className="text-center border-2 border-gray-200 rounded p-2">
                          <div className="text-2xl font-black text-black">{zone.resolvedThisMonth}</div>
                          <div className="text-xs text-gray-600">Resolved</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Resolution:</span>
                          <span className="font-bold">{zone.avgResolutionTime} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Utilization:</span>
                          <span className="font-bold">{zone.utilizationRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget Projects Tab */}
            {activeResourceTab === 'budget' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Budget Projects</h3>
                <div className="space-y-4">
                  {detailedResourcesData.budgetProjects.map(project => (
                    <div key={project.budgetId} className="border-2 border-black rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-black text-gray-900">{project.projectName}</h4>
                          <p className="text-xs text-gray-500">{project.budgetId} • {project.area}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${
                          project.status === 'On Track' ? 'bg-green-100 text-green-800 border-green-300' :
                          'bg-red-100 text-red-800 border-red-300'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">Allocated</p>
                          <p className="text-lg font-black text-black">₹{(project.allocatedAmount / 10000000).toFixed(1)} Cr</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Used</p>
                          <p className="text-lg font-black text-black">₹{(project.usedAmount / 10000000).toFixed(1)} Cr</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Remaining</p>
                          <p className="text-lg font-black text-black">₹{(project.remainingAmount / 10000000).toFixed(1)} Cr</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Utilization</span>
                          <span className="font-bold">{project.utilizationPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-gray-300">
                          <div
                            className="bg-black h-full rounded-full"
                            style={{ width: `${project.utilizationPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Start: {project.startDate}</span>
                        <span>End: {project.expectedEndDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resource Requests Tab */}
            {activeResourceTab === 'requests' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-900 uppercase">Resource Requests</h3>
                <div className="space-y-4">
                  {detailedResourcesData.resourceRequests.map(request => (
                    <div key={request.requestId} className="border-2 border-black rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-black text-gray-900">{request.requestType} Request</h4>
                          <p className="text-xs text-gray-500">{request.requestId} • {request.requestDate}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${
                            request.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' :
                            request.priority === 'Critical' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}>
                            {request.status}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{request.priority} Priority</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Requested by:</span>
                          <span className="font-bold ml-2">{request.requestedBy}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Description:</span>
                          <p className="font-semibold mt-1">{request.description}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Justification:</span>
                          <p className="text-gray-700 mt-1">{request.justification}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Estimated Cost:</span>
                          <span className="font-bold ml-2">₹{(request.estimatedCost / 100000).toFixed(2)} Lakhs</span>
                        </div>
                      </div>
                      {request.status === 'Pending Approval' && (
                        <div className="flex gap-2">
                          <button className="flex-1 bg-black text-white py-2 rounded font-bold uppercase text-xs hover:bg-gray-800">
                            Approve
                          </button>
                          <button className="flex-1 border-2 border-black text-black py-2 rounded font-bold uppercase text-xs hover:bg-gray-50">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderKnowledgeBase = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900 uppercase">Knowledge Base</h2>
        <button className="bg-black text-white px-6 py-3 rounded-lg font-bold uppercase hover:bg-gray-800 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.knowledgeBase.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg p-6 border-2 border-black hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-3">
              <Database className="w-8 h-8 text-black" />
              <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{doc.type}</span>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">{doc.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{doc.uploadDate}</span>
              <span>{doc.fileSize}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-black text-white py-2 rounded font-bold uppercase text-xs hover:bg-gray-800">
                View
              </button>
              <button className="flex-1 border-2 border-black text-black py-2 rounded font-bold uppercase text-xs hover:bg-gray-50">
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOfficers = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900 uppercase">Officers</h2>
        <button className="bg-black text-white px-6 py-3 rounded-lg font-bold uppercase hover:bg-gray-800 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Officer
        </button>
      </div>

      <div className="bg-white rounded-lg border-2 border-black overflow-hidden">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Resolved</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Avg Time</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-200">
            {data.officers.map((officer) => (
              <tr key={officer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-gray-900">{officer.name}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{officer.role}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-600">{officer.email}</div>
                  <div className="text-xs text-gray-500">{officer.phone}</div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-black">{officer.assignedGrievances}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">{officer.resolvedGrievances}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{officer.avgResolutionTime} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAIInsights = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">AI Insights & Recommendations</h2>
      
      <div className="space-y-4">
        {data.aiSuggestions.map((suggestion) => (
          <div key={suggestion.id} className={`bg-white rounded-lg p-6 border-2 ${
            suggestion.priority === 'High' ? 'border-red-500' :
            suggestion.priority === 'Medium' ? 'border-yellow-500' :
            'border-green-500'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-black" />
                <div>
                  <h3 className="text-lg font-black text-gray-900">{suggestion.type}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    suggestion.priority === 'High' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.priority} Priority
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{suggestion.message}</p>
            
            {/* AI Explainability Panel */}
            {advancedFeaturesData.aiExplanations.find(exp => exp.grievanceId === suggestion.grievanceId) && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 mb-3">
                <h4 className="text-sm font-black text-blue-900 uppercase mb-2">AI Explanation</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold text-blue-800 mb-1">Reasons:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {advancedFeaturesData.aiExplanations.find(exp => exp.grievanceId === suggestion.grievanceId).reasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-blue-900">{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Object.entries(advancedFeaturesData.aiExplanations.find(exp => exp.grievanceId === suggestion.grievanceId).dataPoints).map(([key, value]) => (
                      <div key={key} className="bg-white rounded p-2 border border-blue-300">
                        <p className="text-xs font-bold text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-sm font-black text-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase mb-1">Recommended Action</p>
              <p className="text-sm font-semibold text-black">{suggestion.recommendedAction}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="bg-black text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-gray-800">
                Accept
              </button>
              <button className="border-2 border-black text-black px-4 py-2 rounded font-bold uppercase text-xs hover:bg-gray-50">
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Workflow Timeline Render
  const renderWorkflowTracking = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Grievance Workflow Timeline</h2>
      
      {advancedFeaturesData.workflowTimeline.map((workflow) => (
        <div key={workflow.grievanceId} className="bg-white rounded-lg border-2 border-black p-6">
          <h3 className="text-xl font-black text-gray-900 mb-4">Grievance: {workflow.grievanceId}</h3>
          
          <div className="relative">
            {workflow.stages.map((stage, idx) => (
              <div key={idx} className="flex gap-4 mb-6 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white ${
                    stage.status === 'completed' ? 'bg-green-600' :
                    stage.status === 'current' ? 'bg-blue-600' :
                    'bg-gray-300'
                  }`}>
                    {stage.status === 'completed' ? '✓' : idx + 1}
                  </div>
                  {idx < workflow.stages.length - 1 && (
                    <div className={`w-1 h-16 ${
                      stage.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
                
                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-black text-gray-900">{stage.stage}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        stage.status === 'completed' ? 'bg-green-100 text-green-800' :
                        stage.status === 'current' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {stage.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {stage.timestamp && (
                      <p className="text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {new Date(stage.timestamp).toLocaleString()}
                      </p>
                    )}
                    
                    {stage.officer && (
                      <p className="text-sm font-bold text-gray-900 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        {stage.officer}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Action:</strong> {stage.action}
                    </p>
                    
                    {stage.notes && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Notes:</strong> {stage.notes}
                      </p>
                    )}
                    
                    {stage.gpsLocation && (
                      <p className="text-xs text-gray-500">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        GPS: {stage.gpsLocation.lat}, {stage.gpsLocation.lng}
                      </p>
                    )}
                    
                    {stage.progressPercentage && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold">Progress</span>
                          <span className="font-bold">{stage.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-gray-300">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${stage.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {stage.attachments && stage.attachments.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-bold text-gray-600 mb-1">Attachments:</p>
                        <div className="flex gap-2">
                          {stage.attachments.map((att, i) => (
                            <span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded">{att}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Cost Tracking Render
  const renderCostTracking = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Grievance Cost Tracking</h2>
      
      {advancedFeaturesData.costTracking.map((cost) => (
        <div key={cost.grievanceId} className="bg-white rounded-lg border-2 border-black p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-gray-900">Grievance: {cost.grievanceId}</h3>
            <span className={`text-sm font-bold px-3 py-1 rounded ${
              cost.costStatus === 'Within Budget' ? 'bg-green-100 text-green-800' :
              cost.costStatus === 'At Budget Limit' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {cost.costStatus}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <p className="text-xs font-bold text-blue-800 uppercase">Labor Cost</p>
              <p className="text-2xl font-black text-blue-900">₹{cost.laborCost.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <p className="text-xs font-bold text-green-800 uppercase">Material Cost</p>
              <p className="text-2xl font-black text-green-900">₹{cost.materialCost.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <p className="text-xs font-bold text-yellow-800 uppercase">Equipment Cost</p>
              <p className="text-2xl font-black text-yellow-900">₹{cost.equipmentCost.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <p className="text-xs font-bold text-purple-800 uppercase">Transport Cost</p>
              <p className="text-2xl font-black text-purple-900">₹{cost.transportCost.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-black text-white rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black uppercase">Total Cost</p>
              <p className="text-3xl font-black">₹{cost.totalCost.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-black text-gray-900 uppercase mb-3">Cost Breakdown</h4>
            <div className="space-y-2">
              {cost.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border-2 border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">{item.item}</span>
                  <span className="text-sm font-black text-black">₹{item.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Budget Allocated</p>
              <p className="text-xl font-black text-black">₹{cost.budgetAllocated.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Budget Used</p>
              <p className="text-xl font-black text-black">₹{cost.totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded border-2 border-green-200">
              <p className="text-xs font-bold text-green-800 uppercase">Budget Remaining</p>
              <p className="text-xl font-black text-green-900">₹{cost.budgetRemaining.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAuditLogs = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Audit Logs</h2>
      
      <div className="bg-white rounded-lg border-2 border-black overflow-hidden">
        <table className="w-full">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-200">
            {data.auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-bold text-gray-900">{log.actor}</div>
                  <div className="text-xs text-gray-500">{log.actorRole}</div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-black">{log.action}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-600">{log.entity}</div>
                  <div className="text-xs text-gray-500">{log.entityId}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Custom marker icons based on priority
  const createCustomIcon = (priority) => {
    const colors = {
      'Critical': '#DC2626',
      'High': '#EA580C',
      'Medium': '#CA8A04',
      'Low': '#16A34A'
    };
    
    const color = colors[priority] || '#6B7280';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 32px;
            height: 32px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 16px;
          ">📍</div>
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 12px solid ${color};
          "></div>
        </div>
      `,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
      popupAnchor: [0, -44]
    });
  };

  // Component to fit map bounds to markers
  const MapBounds = ({ grievances }) => {
    const map = useMap();
    
    useEffect(() => {
      if (grievances && grievances.length > 0) {
        const bounds = L.latLngBounds(
          grievances.map(g => [g.coordinates.lat, g.coordinates.lng])
        );
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15
        });
      }
    }, [grievances, map]);
    
    return null;
  };

  // SLA Policy Render
  const renderSLAPolicy = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">SLA Policy Engine</h2>
      
      <div className="bg-white rounded-lg border-2 border-black p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">SLA Rules by Priority</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase">SLA Time</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
              {advancedFeaturesData.slaPolicy.map((policy) => (
                <tr key={policy.priority} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold px-3 py-1 rounded ${
                      policy.priority === 'Emergency' ? 'bg-red-600 text-white' :
                      policy.priority === 'Urgent' ? 'bg-orange-500 text-white' :
                      policy.priority === 'High' ? 'bg-yellow-500 text-white' :
                      policy.priority === 'Medium' ? 'bg-blue-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {policy.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lg font-black text-black">{policy.slaHours} hours</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{policy.slaDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-yellow-50 rounded-lg border-2 border-yellow-500 p-6">
        <h3 className="text-lg font-black text-yellow-900 mb-3">SLA Monitoring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border-2 border-yellow-600">
            <p className="text-xs font-bold text-gray-600 uppercase">Near Deadline</p>
            <p className="text-4xl font-black text-yellow-600">{departmentHeadData.slaEscalationMonitoring.nearSLADeadline}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-red-600">
            <p className="text-xs font-bold text-gray-600 uppercase">Overdue</p>
            <p className="text-4xl font-black text-red-600">{departmentHeadData.slaEscalationMonitoring.overdueGrievances}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-green-600">
            <p className="text-xs font-bold text-gray-600 uppercase">Compliance</p>
            <p className="text-4xl font-black text-green-600">{departmentHeadData.slaEscalationMonitoring.slaCompliancePercent}%</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Escalations Render
  const renderEscalations = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Escalation System</h2>
      
      {advancedFeaturesData.escalations.map((escalation) => (
        <div key={escalation.grievanceId} className="bg-white rounded-lg border-2 border-red-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-gray-900">Grievance: {escalation.grievanceId}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold px-3 py-1 rounded bg-red-100 text-red-800">
                Level {escalation.currentLevel}
              </span>
              <span className="text-sm font-bold px-3 py-1 rounded bg-orange-100 text-orange-800">
                Overdue: {escalation.overdueBy}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {escalation.escalationHistory.map((history, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-gray-900">Level {history.level} Escalation</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    history.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                    history.status === 'Escalated Further' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {history.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">Escalated To: {history.escalatedTo}</p>
                <p className="text-sm text-gray-600 mb-1">Time: {new Date(history.escalatedAt).toLocaleString()}</p>
                <p className="text-sm text-gray-700 mb-1"><strong>Reason:</strong> {history.reason}</p>
                <p className="text-sm text-gray-700"><strong>Action Taken:</strong> {history.action}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 bg-red-50 rounded-lg p-4 border-2 border-red-200">
            <p className="text-sm font-bold text-red-900">
              Next Escalation: Level {escalation.nextEscalationLevel} to {escalation.nextEscalationTo} in {escalation.nextEscalationIn}
            </p>
          </div>
        </div>
      ))}
      
      <div className="bg-white rounded-lg border-2 border-black p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Repeat Grievance Detection</h3>
        {advancedFeaturesData.repeatGrievances.map((repeat, idx) => (
          <div key={idx} className="mb-4 last:mb-0 bg-orange-50 rounded-lg p-4 border-2 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-black text-orange-900">{repeat.area}</h4>
              <span className="text-sm font-bold px-3 py-1 rounded bg-orange-600 text-white">
                {repeat.priority} Priority
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900 mb-2">
              {repeat.count} {repeat.category} complaints in {repeat.timeframe}
            </p>
            <p className="text-sm text-gray-700 mb-2">Affected Citizens: {repeat.affectedCitizens}</p>
            <p className="text-sm text-gray-700 mb-2"><strong>Pattern:</strong> {repeat.pattern}</p>
            <div className="bg-white rounded-lg p-3 border-2 border-orange-300 mb-2">
              <p className="text-xs font-bold text-orange-800 uppercase mb-1">AI Recommendation:</p>
              <p className="text-sm font-semibold text-black">{repeat.aiRecommendation}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded p-2 border border-orange-300">
                <p className="text-xs font-bold text-gray-600">Estimated Cost</p>
                <p className="text-lg font-black text-black">{repeat.estimatedCost}</p>
              </div>
              <div className="bg-white rounded p-2 border border-orange-300">
                <p className="text-xs font-bold text-gray-600">Estimated Savings</p>
                <p className="text-lg font-black text-green-600">{repeat.estimatedSavings}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Citizen Feedback Render
  const renderCitizenFeedback = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Citizen Feedback</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-6 border-2 border-black text-center">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Average Rating</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-4xl font-black text-black">{departmentHeadData.citizenFeedbackOverview.averageRating}</p>
            <span className="text-yellow-500 text-3xl">★</span>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6 border-2 border-green-500 text-center">
          <p className="text-xs font-bold text-green-800 uppercase mb-2">Positive</p>
          <p className="text-4xl font-black text-green-600">{departmentHeadData.citizenFeedbackOverview.positiveFeedbackPercent}%</p>
        </div>
        <div className="bg-red-50 rounded-lg p-6 border-2 border-red-500 text-center">
          <p className="text-xs font-bold text-red-800 uppercase mb-2">Negative</p>
          <p className="text-4xl font-black text-red-600">{departmentHeadData.citizenFeedbackOverview.negativeFeedbackPercent}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-500 text-center">
          <p className="text-xs font-bold text-gray-800 uppercase mb-2">Neutral</p>
          <p className="text-4xl font-black text-gray-600">{departmentHeadData.citizenFeedbackOverview.neutralFeedbackPercent}%</p>
        </div>
      </div>
      
      {advancedFeaturesData.citizenFeedback.map((feedback) => (
        <div key={feedback.grievanceId} className={`bg-white rounded-lg border-2 p-6 ${
          feedback.rating >= 4 ? 'border-green-500' :
          feedback.rating >= 3 ? 'border-yellow-500' :
          'border-red-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black text-gray-900">Grievance: {feedback.grievanceId}</h3>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-2xl ${i < feedback.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                ))}
              </div>
              <span className="text-lg font-black text-black">{feedback.rating}/5</span>
            </div>
          </div>
          
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-700 mb-1">Citizen: {feedback.citizenName}</p>
            <p className="text-sm text-gray-600">Submitted: {new Date(feedback.submittedDate).toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 mb-3">
            <p className="text-sm text-gray-900">{feedback.feedbackText}</p>
          </div>
          
          {feedback.additionalComments && (
            <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200 mb-3">
              <p className="text-xs font-bold text-blue-800 uppercase mb-1">Additional Comments:</p>
              <p className="text-sm text-blue-900">{feedback.additionalComments}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold px-3 py-1 rounded ${
              feedback.satisfactionStatus === 'Highly Satisfied' ? 'bg-green-100 text-green-800' :
              feedback.satisfactionStatus === 'Satisfied' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {feedback.satisfactionStatus}
            </span>
            <span className={`text-sm font-bold ${feedback.wouldRecommend ? 'text-green-600' : 'text-red-600'}`}>
              {feedback.wouldRecommend ? '✓ Would Recommend' : '✗ Would Not Recommend'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // Predictive Maintenance Render
  const renderPredictiveMaintenance = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 uppercase">Predictive Maintenance</h2>
      
      {advancedFeaturesData.predictiveMaintenance.map((equipment) => (
        <div key={equipment.equipmentId} className={`bg-white rounded-lg border-2 p-6 ${
          equipment.riskLevel === 'High' ? 'border-red-600' :
          equipment.riskLevel === 'Medium' ? 'border-yellow-500' :
          'border-green-500'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-900">{equipment.equipmentType}</h3>
              <p className="text-sm text-gray-600">{equipment.equipmentId}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded ${
              equipment.riskLevel === 'High' ? 'bg-red-600 text-white' :
              equipment.riskLevel === 'Medium' ? 'bg-yellow-500 text-white' :
              'bg-green-500 text-white'
            }`}>
              {equipment.riskLevel} Risk
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Utilization Rate</p>
              <p className="text-3xl font-black text-black">{equipment.utilizationRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-full rounded-full ${equipment.utilizationRate > 90 ? 'bg-red-600' : 'bg-green-600'}`}
                  style={{ width: `${equipment.utilizationRate}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Last Maintenance</p>
              <p className="text-lg font-black text-black">{equipment.lastMaintenance}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Next Scheduled</p>
              <p className="text-lg font-black text-black">{equipment.nextScheduledMaintenance}</p>
            </div>
          </div>
          
          {equipment.maintenanceOverdue && (
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-500 mb-4">
              <p className="text-sm font-bold text-red-900"> Maintenance Overdue by {equipment.overdueBy}</p>
            </div>
          )}
          
          <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-500 mb-4">
            <p className="text-xs font-bold text-purple-800 uppercase mb-2">AI Prediction:</p>
            <p className="text-sm font-bold text-purple-900 mb-2">{equipment.prediction}</p>
            <p className="text-sm font-semibold text-black">Recommendation: {equipment.aiRecommendation}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
              <p className="text-xs font-bold text-green-800 uppercase">Preventive Cost</p>
              <p className="text-2xl font-black text-green-900">{equipment.preventiveCost}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-500">
              <p className="text-xs font-bold text-red-800 uppercase">Breakdown Cost</p>
              <p className="text-2xl font-black text-red-900">{equipment.breakdownCost}</p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button className="flex-1 bg-black text-white py-3 rounded-lg font-bold uppercase hover:bg-gray-800">
              Schedule Maintenance
            </button>
            <button className="flex-1 border-2 border-black text-black py-3 rounded-lg font-bold uppercase hover:bg-gray-50">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMapView = () => {
    const getPriorityMarkerColor = (priority) => {
      const colors = {
        'Critical': '#DC2626',
        'High': '#EA580C',
        'Medium': '#CA8A04',
        'Low': '#16A34A'
      };
      return colors[priority] || '#6B7280';
    };

    // Calculate center of all grievances - Ambernath center
    const centerLat = 19.1950;
    const centerLng = 73.1900;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 uppercase">Grievance Map - Ambernath Region</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-black">
              <span className="text-xs font-bold text-gray-700 uppercase">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-xs font-semibold">Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-xs font-semibold">High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                <span className="text-xs font-semibold">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-xs font-semibold">Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Map Container */}
        <div className="bg-white rounded-lg border-4 border-black overflow-hidden shadow-xl">
          <div className="relative w-full h-[600px]">
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={13}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBounds grievances={data.grievances} />
              
              {data.grievances.map((grievance) => (
                <Marker
                  key={grievance.id}
                  position={[grievance.coordinates.lat, grievance.coordinates.lng]}
                  icon={createCustomIcon(grievance.priority)}
                >
                  <Popup maxWidth={300}>
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-gray-900">{grievance.id}</span>
                        <span 
                          className="text-xs font-bold px-2 py-1 rounded"
                          style={{ 
                            backgroundColor: getPriorityMarkerColor(grievance.priority) + '20',
                            color: getPriorityMarkerColor(grievance.priority),
                            border: `2px solid ${getPriorityMarkerColor(grievance.priority)}`
                          }}
                        >
                          {grievance.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1">{grievance.category}</h4>
                      <p className="text-xs text-gray-600 mb-2">{grievance.description}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-700">{grievance.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-700">{grievance.citizenName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-700">{grievance.citizenPhone}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                          {grievance.status}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedGrievance(grievance)}
                        className="mt-2 w-full bg-black text-white py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-800"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Grievance List Below Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.grievances.map((grievance) => (
            <div
              key={grievance.id}
              className="bg-white rounded-lg p-4 border-2 border-black hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedGrievance(grievance)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getPriorityMarkerColor(grievance.priority) }}
                  ></div>
                  <span className="text-xs font-bold text-gray-900">{grievance.id}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(grievance.status)}`}>
                  {grievance.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">{grievance.category}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                <MapPin className="w-3 h-3" />
                <span>{grievance.location}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold px-2 py-1 rounded border ${getPriorityColor(grievance.priority)}`}>
                  {grievance.priority}
                </span>
                <span className="text-gray-500">{grievance.citizenName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-amber-50/50 to-yellow-50/60">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg">
                <img src="/logo.png" alt="IGRS Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.departmentInfo.name}</h1>
                <p className="text-sm text-slate-600 font-medium">{data.departmentInfo.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('audit')}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                <FileCheck className="w-5 h-5" />
                Audit Logs
              </button>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{data.departmentInfo.headOfficer}</p>
                <p className="text-xs text-slate-500">Department Head</p>
              </div>
              <button className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Settings className="w-5 h-5 text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-[100px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 font-semibold text-xs whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 bg-slate-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'map' && renderMapView()}
        {activeTab === 'grievances' && renderGrievances()}
        {activeTab === 'workflow' && renderWorkflowTracking()}
        {activeTab === 'cost-tracking' && renderCostTracking()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'resources' && renderResources()}
        {activeTab === 'sla-policy' && renderSLAPolicy()}
        {activeTab === 'escalations' && renderEscalations()}
        {activeTab === 'feedback' && renderCitizenFeedback()}
        {activeTab === 'predictive' && renderPredictiveMaintenance()}
        {activeTab === 'knowledge' && renderKnowledgeBase()}
        {activeTab === 'officers' && renderOfficers()}
        {activeTab === 'ai-insights' && renderAIInsights()}
        {activeTab === 'audit' && renderAuditLogs()}
      </main>
    </div>
  );
};

export default DepartmentDashboard;
