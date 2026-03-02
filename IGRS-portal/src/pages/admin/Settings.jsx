import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Key, FileText, AlertCircle, CheckCircle, Sparkles, Lock, Shield } from 'lucide-react';
import settingsService from '../../services/settingsService';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState({});
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  
  // Research Prompt state
  const [researchPrompt, setResearchPrompt] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [keysData, promptData] = await Promise.all([
        settingsService.getApiKeys(),
        settingsService.getResearchPrompt()
      ]);
      
      setApiKeys(keysData.data || {});
      setResearchPrompt(promptData.data?.prompt || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddApiKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      showMessage('Please enter both key name and value', 'error');
      return;
    }

    setApiKeys(prev => ({
      ...prev,
      [newKeyName.trim()]: newKeyValue.trim()
    }));

    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleRemoveApiKey = (keyName) => {
    const updated = { ...apiKeys };
    delete updated[keyName];
    setApiKeys(updated);
  };

  const handleSaveApiKeys = async () => {
    try {
      setSaving(true);
      await settingsService.updateApiKeys(apiKeys);
      showMessage('API keys saved successfully', 'success');
      await loadSettings(); // Reload to get masked values
    } catch (err) {
      console.error('Failed to save API keys:', err);
      showMessage('Failed to save API keys', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResearchPrompt = async () => {
    try {
      setSaving(true);
      await settingsService.updateResearchPrompt(researchPrompt);
      showMessage('Research prompt saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save research prompt:', err);
      showMessage('Failed to save research prompt', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-black rounded-2xl shadow-2xl p-8 border border-gray-800">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-[#FFF8F0] rounded-xl">
            <Shield className="h-8 w-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">System Settings</h1>
            <p className="text-gray-400 mt-1">Configure API keys and AI research prompts</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`rounded-xl p-4 flex items-center gap-3 shadow-lg border-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-900 border-green-300' 
            : 'bg-red-50 text-red-900 border-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-black to-gray-900 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF8F0] rounded-lg">
              <Key className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">API Keys</h2>
              <p className="text-gray-300 text-sm">Manage external service credentials</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#FFF8F0]">
          {/* Existing Keys */}
          <div className="space-y-3 mb-6">
            {Object.entries(apiKeys).length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No API keys configured</p>
                <p className="text-gray-400 text-sm mt-1">Add your first API key below</p>
              </div>
            ) : (
              Object.entries(apiKeys).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-1">{key}</p>
                    <p className="text-sm text-gray-600 font-mono bg-gray-100 px-3 py-1 rounded-lg inline-block">{value}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveApiKey(key)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border-2 border-transparent hover:border-red-200"
                    title="Remove key"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Key */}
          <div className="border-t-2 border-gray-300 pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New API Key
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input
                type="text"
                placeholder="Key Name (e.g., OPENAI_API_KEY)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all font-medium"
              />
              <input
                type="text"
                placeholder="Key Value"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddApiKey}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                Add Key
              </button>
              <button
                onClick={handleSaveApiKeys}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save All Keys'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Research Prompt Section */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-black p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF8F0] rounded-lg">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Research Agent Prompt</h2>
              <p className="text-gray-300 text-sm">Configure internet research behavior</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#FFF8F0]">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">About Research Agent</p>
                <p>This prompt is used by the research agent to fetch relevant data from the internet when analyzing grievances. It guides how the agent searches for and processes external information.</p>
              </div>
            </div>
          </div>

          <textarea
            value={researchPrompt}
            onChange={(e) => setResearchPrompt(e.target.value)}
            placeholder="Enter the complete research agent prompt here...&#10;&#10;Example:&#10;You are a research agent tasked with finding relevant information from the internet about grievances. Search for similar cases, government policies, and solutions. Provide comprehensive analysis with sources."
            rows={12}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black font-mono text-sm bg-white shadow-inner transition-all"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveResearchPrompt}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Research Prompt'}
            </button>
            <p className="text-sm text-gray-600">
              This prompt guides the AI agent when fetching data from the internet
            </p>
          </div>
        </div>
      </div>

      {/* Premium Info Box */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="p-2 bg-amber-100 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-700" />
            </div>
          </div>
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-2 text-base">Important Security Notes</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>API keys are stored securely and masked after saving</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Changes take effect immediately after saving</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Only administrators can access and modify these settings</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
