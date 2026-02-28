import { useState, useEffect } from 'react';
import { Upload, Link as LinkIcon, Trash2, FileText, Globe, Clock, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import knowledgeBaseService from '../../services/knowledgeBaseService';

const KnowledgeBaseManagement = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showURLModal, setShowURLModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadEntries();
  }, [filter]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await knowledgeBaseService.getAll(params);
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUploadPDF = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      await knowledgeBaseService.uploadPDF(selectedFile);
      setShowUploadModal(false);
      setSelectedFile(null);
      loadEntries();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleAddURL = async () => {
    if (!url) return;

    try {
      setUploading(true);
      await knowledgeBaseService.addURL(url, description);
      setShowURLModal(false);
      setUrl('');
      setDescription('');
      loadEntries();
    } catch (error) {
      console.error('Failed to add URL:', error);
      alert('Failed to add URL');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await knowledgeBaseService.delete(id);
      loadEntries();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete entry');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      processing: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };
    const badge = badges[status] || badges.processing;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">KNOWLEDGE BASE</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage PDFs and URLs for AI processing</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition flex items-center gap-2 font-bold text-sm"
          >
            <Upload className="w-4 h-4" />
            UPLOAD PDF
          </button>
          <button
            onClick={() => setShowURLModal(true)}
            className="px-5 py-2.5 border-2 border-black text-black rounded-md hover:bg-gray-50 transition flex items-center gap-2 font-bold text-sm"
          >
            <LinkIcon className="w-4 h-4" />
            ADD URL
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        {['all', 'processing', 'completed', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-bold text-sm uppercase transition ${
              filter === status
                ? 'border-b-2 border-black text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Entries Table */}
      {entries.length > 0 ? (
        <div className="bg-white border-2 border-black rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Name/URL</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide">Uploaded</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {entry.file_type === 'pdf' ? (
                      <FileText className="w-5 h-5 text-red-600" />
                    ) : (
                      <Globe className="w-5 h-5 text-blue-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 text-sm truncate max-w-md">
                      {entry.file_name}
                    </div>
                    {entry.file_type === 'url' && (
                      <a
                        href={entry.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Visit URL
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(entry.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">
                      {entry.uploaded_by_name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-md p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-black text-gray-700 uppercase">No Entries Found</h3>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            Upload PDFs or add URLs to build your knowledge base
          </p>
        </div>
      )}

      {/* Upload PDF Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border-2 border-black">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Upload PDF</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  SELECT PDF FILE
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUploadPDF}
                  disabled={!selectedFile || uploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-sm"
                >
                  {uploading ? 'UPLOADING...' : 'UPLOAD'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-black text-black rounded-md hover:bg-gray-50 font-bold text-sm"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add URL Modal */}
      {showURLModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border-2 border-black">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Add URL</h2>
              <button
                onClick={() => setShowURLModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  DESCRIPTION (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the content"
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddURL}
                  disabled={!url || uploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-sm"
                >
                  {uploading ? 'ADDING...' : 'ADD URL'}
                </button>
                <button
                  onClick={() => setShowURLModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-black text-black rounded-md hover:bg-gray-50 font-bold text-sm"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManagement;
