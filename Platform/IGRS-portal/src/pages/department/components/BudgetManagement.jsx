import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, FileText,
  Download, Upload, CheckCircle, XCircle, Clock, Users, Wrench,
  Package, Truck, Building, PieChart, BarChart3, Calendar,
  Filter, Search, Eye, Edit, Trash2, Plus, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import axios from 'axios';

const BudgetManagement = ({ depId }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [budgetOverview, setBudgetOverview] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [usageBreakdown, setUsageBreakdown] = useState([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);
  const [documents, setDocuments] = useState([]);
  
  // New Allocation Modal State
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [submittingAllocation, setSubmittingAllocation] = useState(false);
  
  // Helper function to get current financial year
  const getInitialFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let fyStart, fyEnd;
    if (currentMonth >= 3) {
      fyStart = currentYear;
      fyEnd = currentYear + 1;
    } else {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    return `${fyStart}-${String(fyEnd).slice(-2)}`;
  };

  const [allocationForm, setAllocationForm] = useState({
    allocation_id: '',
    allocation_amount: '',
    allocation_date: new Date().toISOString().split('T')[0],
    financial_year: getInitialFinancialYear(),
    scheme_name: '',
    allocation_purpose: '',
    allocated_by: '',
    approval_authority: '',
    budget_type: 'Operational',
    budget_source: 'State Government',
    remarks: ''
  });

  const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`;

  useEffect(() => {
    if (depId) {
      loadBudgetData();
    }
  }, [depId, activeSection]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Load data based on active section
      if (activeSection === 'overview') {
        const res = await axios.get(`${API_BASE}/budget/${depId}/overview`, config);
        setBudgetOverview(res.data.data);
      } else if (activeSection === 'allocations') {
        const res = await axios.get(`${API_BASE}/budget/${depId}/allocations`, config);
        setAllocations(res.data.data);
      } else if (activeSection === 'usage') {
        const res = await axios.get(`${API_BASE}/budget/${depId}/usage-breakdown`, config);
        setUsageBreakdown(res.data.data);
      } else if (activeSection === 'analytics') {
        const [catRes, trendRes, effRes] = await Promise.all([
          axios.get(`${API_BASE}/budget/${depId}/category-analytics`, config),
          axios.get(`${API_BASE}/budget/${depId}/monthly-trend`, config),
          axios.get(`${API_BASE}/budget/${depId}/efficiency-metrics`, config)
        ]);
        setCategoryAnalytics(catRes.data.data);
        setMonthlyTrend(trendRes.data.data);
        setEfficiencyMetrics(effRes.data.data);
      } else if (activeSection === 'documents') {
        const res = await axios.get(`${API_BASE}/budget/${depId}/documents`, config);
        setDocuments(res.data.data || []);
      } else if (activeSection === 'alerts') {
        const res = await axios.get(`${API_BASE}/budget/${depId}/alerts`, config);
        setAlerts(res.data.data || []);
      }

      // Don't load alerts automatically anymore - only in alerts tab

    } catch (error) {
      console.error('Error loading budget data:', error);
      // Set empty arrays on error to prevent undefined errors
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    const num = parseFloat(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)} K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const generateAllocationId = () => {
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Determine financial year (April to March)
    let fyStart, fyEnd;
    if (currentMonth >= 3) { // April (3) onwards
      fyStart = currentYear;
      fyEnd = currentYear + 1;
    } else { // January to March
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    
    // Generate 3 random alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomSuffix = '';
    for (let i = 0; i < 3; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Format: BUDGET-YYYY-YY-XXX
    return `BUDGET-${fyStart}-${String(fyEnd).slice(-2)}-${randomSuffix}`;
  };

  const getCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Determine financial year (April to March)
    let fyStart, fyEnd;
    if (currentMonth >= 3) { // April (3) onwards
      fyStart = currentYear;
      fyEnd = currentYear + 1;
    } else { // January to March
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    
    // Format: YYYY-YY
    return `${fyStart}-${String(fyEnd).slice(-2)}`;
  };

  const handleAllocationFormChange = (field, value) => {
    setAllocationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitAllocation = async () => {
    try {
      // Validation
      if (!allocationForm.allocation_amount) {
        alert('Please enter the allocation amount');
        return;
      }

      setSubmittingAllocation(true);
      const token = localStorage.getItem('accessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Generate allocation ID if not already set, and ensure financial year is set
      const allocationData = {
        ...allocationForm,
        allocation_id: allocationForm.allocation_id || generateAllocationId(),
        financial_year: allocationForm.financial_year || getCurrentFinancialYear()
      };

      await axios.post(`${API_BASE}/budget/${depId}/allocations`, allocationData, config);

      // Reset form and close modal
      setAllocationForm({
        allocation_id: '',
        allocation_amount: '',
        allocation_date: new Date().toISOString().split('T')[0],
        financial_year: getCurrentFinancialYear(),
        scheme_name: '',
        allocation_purpose: '',
        allocated_by: '',
        approval_authority: '',
        budget_type: 'Operational',
        budget_source: 'State Government',
        remarks: ''
      });
      setShowAllocationModal(false);
      
      // Reload allocations
      loadBudgetData();
      alert('Budget allocation created successfully!');
    } catch (error) {
      console.error('Error creating allocation:', error);
      alert('Failed to create allocation. Please try again.');
    } finally {
      setSubmittingAllocation(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Budget Overview', icon: DollarSign },
    { id: 'allocations', label: 'Allocations', icon: FileText },
    { id: 'usage', label: 'Usage Breakdown', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'documents', label: 'Documents', icon: Upload },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  // =====================================================
  // SECTION 1: BUDGET OVERVIEW
  // =====================================================
  const renderOverview = () => {
    if (!budgetOverview) return <div className="text-center py-12">Loading...</div>;

    const {
      totalBudgetAllocated,
      budgetUsed,
      budgetRemaining,
      budgetUtilization,
      grievancesFunded,
      grievancesResolved,
      avgCostPerGrievance,
      currentFinancialYear,
      emergencyReserveBudget,
      costDistribution
    } = budgetOverview;

    return (
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1a1a1a] to-[#000000] rounded-2xl p-6 text-white shadow-xl border-2 border-[#D4AF37]"
          >
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-10 h-10 text-[#D4AF37]" />
              <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="text-sm font-semibold opacity-90 mb-1">Total Budget Allocated</h3>
            <p className="text-3xl font-bold">{formatCurrency(totalBudgetAllocated)}</p>
            <p className="text-xs opacity-75 mt-2">FY {currentFinancialYear}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-xl border-2 border-[#D4AF37]"
          >
            <div className="flex items-center justify-between mb-3">
              <TrendingDown className="w-10 h-10 text-[#D4AF37]" />
              <span className="text-2xl font-bold text-gray-900">{budgetUtilization.toFixed(1)}%</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Budget Used</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(budgetUsed)}</p>
            <div className="mt-3 bg-[#FFF8F0] rounded-full h-2">
              <div
                className="bg-[#D4AF37] rounded-full h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, budgetUtilization)}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#FFF8F0] rounded-2xl p-6 shadow-xl border-2 border-[#D4AF37]"
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-10 h-10 text-[#D4AF37]" />
              <ArrowUpRight className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Budget Remaining</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(budgetRemaining)}</p>
            <p className="text-xs text-gray-600 mt-2">{(100 - budgetUtilization).toFixed(1)}% Available</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-2xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-10 h-10 opacity-90" />
              <span className="text-lg font-bold">{grievancesFunded}</span>
            </div>
            <h3 className="text-sm font-semibold opacity-90 mb-1">Grievances Funded</h3>
            <p className="text-2xl font-bold">{grievancesResolved} Resolved</p>
            <p className="text-xs opacity-75 mt-2">Avg: {formatCurrency(avgCostPerGrievance)}</p>
          </motion.div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
              Emergency Reserve Budget
            </h3>
            <p className="text-4xl font-bold text-gray-900">{formatCurrency(emergencyReserveBudget)}</p>
            <p className="text-sm text-gray-600 mt-2">20% of total allocation reserved for emergencies</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              Current Financial Year
            </h3>
            <p className="text-4xl font-bold text-gray-900">{currentFinancialYear}</p>
            <p className="text-sm text-gray-600 mt-2">April {currentFinancialYear.split('-')[0]} - March {currentFinancialYear.split('-')[1]}</p>
          </div>
        </div>

        {/* Cost Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[#D4AF37]" />
            Budget Usage by Category
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#FFF8F0] rounded-xl p-5 border-2 border-[#F5E6D3]">
              <Users className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Labor Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(costDistribution.labor)}</p>
            </div>
            <div className="bg-[#FFF8F0] rounded-xl p-5 border-2 border-[#F5E6D3]">
              <Package className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Material Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(costDistribution.material)}</p>
            </div>
            <div className="bg-[#FFF8F0] rounded-xl p-5 border-2 border-[#F5E6D3]">
              <Wrench className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Equipment Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(costDistribution.equipment)}</p>
            </div>
            <div className="bg-[#FFF8F0] rounded-xl p-5 border-2 border-[#F5E6D3]">
              <Truck className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Transport Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(costDistribution.transport)}</p>
            </div>
            <div className="bg-[#FFF8F0] rounded-xl p-5 border-2 border-[#F5E6D3]">
              <Building className="w-8 h-8 text-[#D4AF37] mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Contractor Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(costDistribution.contractor)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // SECTION 2: BUDGET ALLOCATIONS
  // =====================================================
  const renderAllocations = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Budget Allocations</h2>
          <button 
            onClick={() => setShowAllocationModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Allocation
          </button>
        </div>

        {/* New Allocation Modal */}
        {showAllocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Create New Budget Allocation</h3>
                <button 
                  onClick={() => setShowAllocationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Allocation ID <span className="text-gray-500 text-xs">(Auto-generated)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allocationForm.allocation_id || generateAllocationId()}
                        readOnly
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => handleAllocationFormChange('allocation_id', generateAllocationId())}
                        className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#C5A028] transition-colors flex items-center gap-2"
                        title="Generate new ID"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={allocationForm.allocation_amount}
                      onChange={(e) => handleAllocationFormChange('allocation_amount', e.target.value)}
                      placeholder="e.g., 5000000"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Allocation Date
                    </label>
                    <input
                      type="date"
                      value={allocationForm.allocation_date}
                      onChange={(e) => handleAllocationFormChange('allocation_date', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Financial Year <span className="text-gray-500 text-xs">(Auto-detected)</span>
                    </label>
                    <input
                      type="text"
                      value={allocationForm.financial_year}
                      readOnly
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Budget Type
                    </label>
                    <select
                      value={allocationForm.budget_type}
                      onChange={(e) => handleAllocationFormChange('budget_type', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="Operational">Operational</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Infrastructure">Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Budget Source
                    </label>
                    <select
                      value={allocationForm.budget_source}
                      onChange={(e) => handleAllocationFormChange('budget_source', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="State Government">State Government</option>
                      <option value="Central Government">Central Government</option>
                      <option value="Municipal Corporation">Municipal Corporation</option>
                      <option value="Special Grant">Special Grant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Scheme Name
                  </label>
                  <input
                    type="text"
                    value={allocationForm.scheme_name}
                    onChange={(e) => handleAllocationFormChange('scheme_name', e.target.value)}
                    placeholder="e.g., Smart City Mission"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Allocation Purpose
                  </label>
                  <textarea
                    value={allocationForm.allocation_purpose}
                    onChange={(e) => handleAllocationFormChange('allocation_purpose', e.target.value)}
                    placeholder="Describe the purpose of this allocation..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Allocated By
                    </label>
                    <input
                      type="text"
                      value={allocationForm.allocated_by}
                      onChange={(e) => handleAllocationFormChange('allocated_by', e.target.value)}
                      placeholder="e.g., Finance Department"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Approval Authority
                    </label>
                    <input
                      type="text"
                      value={allocationForm.approval_authority}
                      onChange={(e) => handleAllocationFormChange('approval_authority', e.target.value)}
                      placeholder="e.g., Municipal Commissioner"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={allocationForm.remarks}
                    onChange={(e) => handleAllocationFormChange('remarks', e.target.value)}
                    placeholder="Additional notes or remarks..."
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmitAllocation}
                  disabled={submittingAllocation}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingAllocation ? 'Creating...' : 'Create Allocation'}
                </button>
                <button
                  onClick={() => setShowAllocationModal(false)}
                  disabled={submittingAllocation}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border-2 border-[#F5E6D3] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Allocation ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">FY</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Scheme</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                      No budget allocations found. Create your first allocation.
                    </td>
                  </tr>
                ) : (
                  allocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-[#FFF8F0] transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{allocation.allocation_id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#D4AF37]">{formatCurrency(allocation.allocation_amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(allocation.allocation_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{allocation.financial_year}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{allocation.scheme_name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#FFF8F0] border border-[#D4AF37] text-gray-900 text-xs font-semibold rounded-full">
                          {allocation.budget_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{allocation.budget_source}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          allocation.status === 'Active' ? 'bg-[#D4AF37] text-white' :
                          allocation.status === 'Exhausted' ? 'bg-black text-white' :
                          'bg-gray-200 text-gray-900'
                        }`}>
                          {allocation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {allocation.document_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-[#FFF8F0] rounded-lg transition-colors">
                            <Eye className="w-4 h-4 text-[#D4AF37]" />
                          </button>
                          <button className="p-2 hover:bg-[#FFF8F0] rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-gray-900" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // SECTION 3: USAGE BREAKDOWN
  // =====================================================
  const renderUsageBreakdown = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Budget Usage Breakdown</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search grievances..."
                className="pl-10 pr-4 py-2 border-2 border-[#F5E6D3] rounded-xl focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <button className="px-4 py-2 border-2 border-[#F5E6D3] rounded-xl hover:bg-[#FFF8F0] transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {usageBreakdown.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-[#F5E6D3]">
              <FileText className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Budget Usage Data</h3>
              <p className="text-gray-600">Budget usage will appear here once grievances are funded</p>
            </div>
          ) : (
            usageBreakdown.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3] hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{item.grievance_display_id}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.grievance_status === 'resolved' ? 'bg-[#D4AF37] text-white' :
                        item.grievance_status === 'in_progress' ? 'bg-[#FFF8F0] border-2 border-[#D4AF37] text-gray-900' :
                        'bg-gray-200 text-gray-900'
                      }`}>
                        {item.grievance_status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'within_budget' ? 'bg-[#D4AF37] text-white' :
                        item.status === 'near_limit' ? 'bg-[#FFF8F0] border-2 border-[#D4AF37] text-gray-900' :
                        'bg-black text-white'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{item.grievance_title || item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.total_cost)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Cost</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Labor</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.labor_cost)}</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Material</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.material_cost)}</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Equipment</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.equipment_cost)}</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Transport</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.transport_cost)}</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Contractor</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.contractor_cost)}</p>
                  </div>
                  <div className="bg-[#FFF8F0] rounded-lg p-3 border border-[#F5E6D3]">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Documents</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {item.document_count || 0}
                    </p>
                  </div>
                </div>

                {item.budget_allocated && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Budget: {formatCurrency(item.budget_allocated)}</span>
                      <span className="text-gray-600">Used: {formatCurrency(item.budget_used)}</span>
                      <span className="font-semibold text-[#D4AF37]">Remaining: {formatCurrency(item.budget_remaining)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // SECTION 4: ANALYTICS
  // =====================================================
  const renderAnalytics = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Budget Analytics</h2>
        
        {/* Category Analytics */}
        {categoryAnalytics && categoryAnalytics.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Category-wise Budget Usage</h3>
            <div className="space-y-3">
              {categoryAnalytics.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{cat.category || cat.grievance_type}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-600">Count: {cat.count || cat.grievance_count}</span>
                      <span className="text-sm text-gray-600">Avg: {formatCurrency(cat.avg_cost)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#D4AF37]">{formatCurrency(cat.total_cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {monthlyTrend && monthlyTrend.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Budget Trend</h3>
            <div className="space-y-3">
              {monthlyTrend.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
                  <div>
                    <p className="font-semibold text-gray-900">{month.month}</p>
                    <p className="text-sm text-gray-600">{month.grievance_count || month.count} grievances</p>
                  </div>
                  <p className="text-lg font-bold text-[#D4AF37]">{formatCurrency(month.budget_used || month.used)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efficiency Metrics */}
        {efficiencyMetrics && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3]">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Efficiency Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
                <p className="text-sm text-gray-600 mb-1">Total Grievances</p>
                <p className="text-2xl font-bold text-gray-900">{efficiencyMetrics.overallMetrics?.totalGrievances || 0}</p>
              </div>
              <div className="p-4 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
                <p className="text-sm text-gray-600 mb-1">Resolution Rate</p>
                <p className="text-2xl font-bold text-[#D4AF37]">{efficiencyMetrics.overallMetrics?.resolutionRate || 0}%</p>
              </div>
              <div className="p-4 bg-[#FFF8F0] rounded-xl border border-[#F5E6D3]">
                <p className="text-sm text-gray-600 mb-1">Avg Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(efficiencyMetrics.overallMetrics?.avgCostPerGrievance || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state if no data */}
        {(!categoryAnalytics || categoryAnalytics.length === 0) && 
         (!monthlyTrend || monthlyTrend.length === 0) && 
         !efficiencyMetrics && (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-[#F5E6D3]">
            <BarChart3 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Analytics Data Available</h3>
            <p className="text-gray-600">Analytics will appear here once budget usage data is recorded</p>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // SECTION 5: DOCUMENTS
  // =====================================================
  const renderDocuments = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Budget Documents</h2>
          <button className="px-6 py-3 bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Document
          </button>
        </div>

        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3] hover:shadow-xl transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-[#FFF8F0] rounded-xl border-2 border-[#D4AF37]">
                      <FileText className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{doc.document_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-[#FFF8F0] border border-[#D4AF37] rounded-full font-semibold">
                          {doc.document_type}
                        </span>
                        <span>{(doc.file_size / 1024).toFixed(2)} KB</span>
                        <span>{new Date(doc.upload_date || doc.created_at).toLocaleDateString()}</span>
                      </div>
                      {doc.uploaded_by_name && (
                        <p className="text-sm text-gray-500 mt-2">Uploaded by: {doc.uploaded_by_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#FFF8F0] rounded-lg transition-colors">
                      <Eye className="w-5 h-5 text-[#D4AF37]" />
                    </button>
                    <button className="p-2 hover:bg-[#FFF8F0] rounded-lg transition-colors">
                      <Download className="w-5 h-5 text-gray-900" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-[#F5E6D3]">
            <Upload className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Documents Uploaded</h3>
            <p className="text-gray-600 mb-6">Upload budget allocation documents, invoices, and receipts</p>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // SECTION 6: ALERTS
  // =====================================================
  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-[#F5E6D3]">
          <CheckCircle className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Alerts</h3>
          <p className="text-gray-600">All budget metrics are within normal parameters</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Budget Alerts</h2>
          <span className="px-4 py-2 bg-[#FFF8F0] border-2 border-[#D4AF37] text-gray-900 font-bold rounded-xl">
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#F5E6D3] hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    alert.severity === 'Critical' ? 'bg-black text-white' :
                    alert.severity === 'High' ? 'bg-[#D4AF37] text-white' :
                    alert.severity === 'Medium' ? 'bg-[#FFF8F0] border-2 border-[#D4AF37]' :
                    'bg-gray-100'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        alert.severity === 'Critical' ? 'bg-black text-white' :
                        alert.severity === 'High' ? 'bg-[#D4AF37] text-white' :
                        alert.severity === 'Medium' ? 'bg-[#FFF8F0] border-2 border-[#D4AF37] text-gray-900' :
                        'bg-gray-200 text-gray-900'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-gray-600">{alert.description}</p>
                    {alert.created_at && (
                      <p className="text-sm text-gray-500 mt-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white font-semibold rounded-lg hover:shadow-lg transition-all whitespace-nowrap">
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="bg-white rounded-2xl p-2 shadow-lg border-2 border-[#F5E6D3]">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-[#1a1a1a] to-[#000000] text-white shadow-lg'
                    : 'text-gray-700 hover:bg-[#FFF8F0]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-[#F5E6D3]">
          <div className="animate-spin w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading budget data...</p>
        </div>
      ) : (
        <>
          {activeSection === 'overview' && renderOverview()}
          {activeSection === 'allocations' && renderAllocations()}
          {activeSection === 'usage' && renderUsageBreakdown()}
          {activeSection === 'analytics' && renderAnalytics()}
          {activeSection === 'documents' && renderDocuments()}
          {activeSection === 'alerts' && renderAlerts()}
        </>
      )}
    </div>
  );
};

export default BudgetManagement;
