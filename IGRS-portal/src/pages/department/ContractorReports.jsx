import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  TrendingUp,
  FileCheck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ContractorReports() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [expandedContractor, setExpandedContractor] = useState(null);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/contractor-reports/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setContractors(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching contractors:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load contractor reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/contractor-reports/search`,
        { query: searchQuery, limit: 20 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (err) {
      console.error('Error searching reports:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to search reports');
      }
    } finally {
      setSearching(false);
    }
  };

  const toggleExpand = (contractorId) => {
    setExpandedContractor(expandedContractor === contractorId ? null : contractorId);
  };

  const getStatusColor = (status) => {
    // Handle boolean status (is_active)
    if (typeof status === 'boolean') {
      return status 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800';
    }
    
    // Handle string status
    const colors = {
      'verified': 'bg-green-100 text-green-800',
      'pending_review': 'bg-yellow-100 text-yellow-800',
      'collecting': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'true': 'bg-green-100 text-green-800',
      'false': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    // Handle boolean status (is_active)
    if (typeof status === 'boolean') {
      return status ? 'ACTIVE' : 'INACTIVE';
    }
    
    // Handle string status
    if (typeof status === 'string') {
      return status.replace('_', ' ').toUpperCase();
    }
    
    return 'UNKNOWN';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900"> Contractor Reports</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            ×
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Semantic Search</h2>
        <p className="text-sm text-gray-600 mb-4">
          Search reports using natural language (powered by AI embeddings)
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 'road construction projects with delays' or 'water supply progress'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
            {searchResults.map((result) => (
              <div key={result.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{result.project_name}</h4>
                    <p className="text-sm text-gray-600">
                      {result.company_name} • Contract: {result.contract_id}
                    </p>
                    <p className="text-sm mt-2">{result.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {result.progress_percentage}%
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contractors List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">All Contractors ({contractors.length})</h2>

        <div className="space-y-4">
          {contractors.map((contractor) => (
            <div key={contractor.contractor_id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-start flex-1">
                    <Building2 className="w-10 h-10 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{contractor.company_name}</h3>
                      <p className="text-sm text-gray-600">
                        License: {contractor.license_number} • Category: {contractor.category}
                      </p>
                      
                      <div className="flex gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4" />
                          <span>{contractor.total_reports || 0} Reports</span>
                        </div>
                        {contractor.avg_progress && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4" />
                            <span>Avg Progress: {Math.round(contractor.avg_progress)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contractor.verification_status)}`}>
                      {getStatusLabel(contractor.verification_status)}
                    </span>
                    {contractor.last_report_date && (
                      <p className="text-xs text-gray-500">
                        Last Report: {new Date(contractor.last_report_date).toLocaleDateString()}
                      </p>
                    )}
                    {contractor.recent_reports && contractor.recent_reports.length > 0 && (
                      <button
                        onClick={() => toggleExpand(contractor.contractor_id)}
                        className="mt-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedContractor === contractor.contractor_id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Reports */}
                {expandedContractor === contractor.contractor_id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold mb-4">Recent Reports</h4>
                    <div className="space-y-4">
                      {contractor.recent_reports?.slice(0, 5).map((report) => (
                        <div key={report.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-semibold text-lg">{report.project_name}</h5>
                              <p className="text-sm text-gray-600 mb-2">
                                Contract: {report.contract_id}
                              </p>
                              <p className="text-sm">{report.description}</p>
                              
                              {/* Display extracted text from PDFs */}
                              {report.extracted_texts && report.extracted_texts.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-sm font-semibold text-blue-900 mb-2">
                                    📄 Extracted Document Content:
                                  </p>
                                  {report.extracted_texts.map((text, idx) => (
                                    text && (
                                      <div key={idx} className="mt-2">
                                        <p className="text-xs font-semibold text-blue-700">
                                          Document {idx + 1}:
                                        </p>
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                          {text.substring(0, 500)}
                                          {text.length > 500 && '...'}
                                        </p>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}

                              {/* Document links */}
                              {report.document_urls && report.document_urls.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-600 mb-2">Attached Documents:</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {report.document_urls.map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                                      >
                                        <FileCheck className="w-4 h-4" />
                                        Document {idx + 1}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-gray-500 mt-3">
                                Submitted: {new Date(report.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-2xl font-bold text-blue-600">
                                {report.progress_percentage}%
                              </p>
                              <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${report.progress_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {contractors.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No contractor reports yet
            </h3>
            <p className="text-gray-500">
              Reports will appear here once contractors submit them via Telegram
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
