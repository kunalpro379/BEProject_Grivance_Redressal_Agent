import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Policy as PolicyIcon,
  AccountBalance as PlanIcon,
  AttachMoney as BudgetIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function GovernmentPolicies() {
  const { user } = useAuth();
  const departmentId = user?.department_id;
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [policiesData, setPoliciesData] = useState({
    rules: [],
    policies: [],
    plans: [],
    budgets: []
  });
  const [stats, setStats] = useState(null);
  const [extractionMetadata, setExtractionMetadata] = useState(null);

  useEffect(() => {
    if (departmentId) {
      loadPolicies();
      loadStats();
    }
  }, [departmentId]);

  const loadPolicies = async (category = 'all') => {
    if (!departmentId) {
      setError('Department ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      console.log(`🔍 Fetching policies from PINECONE for department: ${departmentId}`);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/government-policies/extract`,
        {
          params: { 
            department_id: departmentId
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('📥 Policies response:', response.data);

      if (response.data.success) {
        // The response now contains policyDocument (markdown)
        const data = response.data.data;
        
        // Store the markdown document
        setPoliciesData({
          policyDocument: data.policyDocument,
          totalDocuments: data.totalDocuments,
          source: data.source,
          department: data.department
        });
        setExtractionMetadata(response.data.metadata);
      } else {
        setError(response.data.message || 'Failed to load policies');
      }
    } catch (err) {
      console.error('Load policies error:', err);
      setError(err.response?.data?.message || 'Failed to load policies from Pinecone');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!departmentId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/government-policies/stats`,
        {
          params: { department_id: departmentId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadPolicies();
    loadStats();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !departmentId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/government-policies/search`,
        { 
          query: searchQuery,
          department_id: departmentId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Convert search results to policy format
        const searchResults = response.data.results.map(r => ({
          title: r.title,
          summary: r.relevance_reason,
          key_points: r.key_excerpts || [],
          importance: r.relevance_score > 80 ? 'High' : r.relevance_score > 50 ? 'Medium' : 'Low',
          full_document: r.full_document
        }));

        setPoliciesData({
          rules: [],
          policies: searchResults,
          plans: [],
          budgets: []
        });
        setActiveTab(2); // Switch to policies tab
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderPolicyCard = (item, index) => (
    <Accordion key={index} sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {item.title}
          </Typography>
          <Chip
            label={item.importance || 'Medium'}
            color={
              item.importance === 'High' ? 'error' :
              item.importance === 'Low' ? 'default' : 'warning'
            }
            size="small"
          />
          {item.department && (
            <Chip label={item.department} size="small" variant="outlined" />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {item.summary}
          </Typography>

          {item.key_points && item.key_points.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Key Points:
              </Typography>
              <ul>
                {item.key_points.map((point, i) => (
                  <li key={i}>
                    <Typography variant="body2">{point}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {item.category_tags && item.category_tags.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {item.category_tags.map((tag, i) => (
                <Chip key={i} label={tag} size="small" />
              ))}
            </Box>
          )}

          {item.date && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Date: {new Date(item.date).toLocaleDateString()}
            </Typography>
          )}

          {item.full_document && item.full_document.file_url && (
            <Button
              startIcon={<DownloadIcon />}
              size="small"
              sx={{ mt: 2 }}
              href={item.full_document.file_url}
              target="_blank"
            >
              View Full Document
            </Button>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    // Check if we have markdown document from Pinecone
    if (policiesData.policyDocument) {
      return (
        <Paper sx={{ p: 4, mt: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {policiesData.department || 'Department'} - Policies & Guidelines
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Source: {policiesData.source === 'pinecone' ? 'Pinecone Government Index (igrs1)' : policiesData.source}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Documents: {policiesData.totalDocuments || 0}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                const blob = new Blob([policiesData.policyDocument], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${policiesData.department || 'policies'}_${new Date().toISOString().split('T')[0]}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download MD
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Box 
            sx={{ 
              '& h1': { fontSize: '2rem', fontWeight: 'bold', mt: 3, mb: 2 },
              '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mt: 3, mb: 2 },
              '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mt: 2, mb: 1 },
              '& p': { mb: 2, lineHeight: 1.7 },
              '& ul, & ol': { mb: 2, pl: 3 },
              '& li': { mb: 1 },
              '& blockquote': { 
                borderLeft: '4px solid #1976d2', 
                pl: 2, 
                py: 1, 
                my: 2, 
                bgcolor: '#f5f5f5',
                fontStyle: 'italic'
              },
              '& code': { 
                bgcolor: '#f5f5f5', 
                p: 0.5, 
                borderRadius: 1,
                fontFamily: 'monospace'
              },
              '& hr': { my: 3, border: 'none', borderTop: '1px solid #e0e0e0' }
            }}
          >
            {/* Render markdown as formatted text */}
            {policiesData.policyDocument.split('\n').map((line, index) => {
              // Headers
              if (line.startsWith('# ')) {
                return <Typography key={index} variant="h1">{line.substring(2)}</Typography>;
              }
              if (line.startsWith('## ')) {
                return <Typography key={index} variant="h2">{line.substring(3)}</Typography>;
              }
              if (line.startsWith('### ')) {
                return <Typography key={index} variant="h3">{line.substring(4)}</Typography>;
              }
              // Blockquote
              if (line.startsWith('> ')) {
                return (
                  <Box key={index} component="blockquote" sx={{ borderLeft: '4px solid #1976d2', pl: 2, py: 1, my: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">{line.substring(2)}</Typography>
                  </Box>
                );
              }
              // Horizontal rule
              if (line.trim() === '---') {
                return <Divider key={index} sx={{ my: 3 }} />;
              }
              // List items
              if (line.trim().startsWith('- ')) {
                return (
                  <Typography key={index} component="li" variant="body1" sx={{ ml: 3 }}>
                    {line.trim().substring(2)}
                  </Typography>
                );
              }
              // Bold text (simple **text** pattern)
              if (line.includes('**')) {
                const parts = line.split('**');
                return (
                  <Typography key={index} variant="body1" paragraph>
                    {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                  </Typography>
                );
              }
              // Regular paragraph
              if (line.trim()) {
                return <Typography key={index} variant="body1" paragraph>{line}</Typography>;
              }
              // Empty line
              return <Box key={index} sx={{ height: 8 }} />;
            })}
          </Box>
        </Paper>
      );
    }

    // Fallback for old format (shouldn't happen with Pinecone-only)
    const tabData = [
      { key: 'all', items: [...(policiesData.rules || []), ...(policiesData.policies || []), ...(policiesData.plans || []), ...(policiesData.budgets || [])] },
      { key: 'rules', items: policiesData.rules || [] },
      { key: 'policies', items: policiesData.policies || [] },
      { key: 'plans', items: policiesData.plans || [] },
      { key: 'budgets', items: policiesData.budgets || [] }
    ];

    const currentData = tabData[activeTab];

    if (currentData.items.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No policies found. Click "Reload Policies" to fetch from Pinecone Government Index.
        </Alert>
      );
    }

    return (
      <Box sx={{ mt: 3 }}>
        {currentData.items.map((item, index) => renderPolicyCard(item, index))}
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Government Policies & Regulations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          AI-powered extraction of government rules, policies, plans, and budgets using DeepSeek
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="primary" />
                  <Typography variant="h6">{stats.total_documents}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Documents
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="error" />
                  <Typography variant="h6">{stats.rules_count}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Rules
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PolicyIcon color="success" />
                  <Typography variant="h6">{stats.policies_count}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Policies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlanIcon color="info" />
                  <Typography variant="h6">{stats.plans_count}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Plans
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BudgetIcon color="warning" />
                  <Typography variant="h6">{stats.budgets_count}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Budgets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search policies using AI (e.g., 'traffic regulations', 'education budget')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            Search
          </Button>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* Extraction Metadata */}
      {extractionMetadata && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          Extracted {extractionMetadata.total_documents} documents in {extractionMetadata.elapsed_time_seconds}s
          {extractionMetadata.extracted_at && ` • Last updated: ${new Date(extractionMetadata.extracted_at).toLocaleString()}`}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" icon={<DescriptionIcon />} iconPosition="start" />
          <Tab label="Rules" icon={<DescriptionIcon />} iconPosition="start" />
          <Tab label="Policies" icon={<PolicyIcon />} iconPosition="start" />
          <Tab label="Plans" icon={<PlanIcon />} iconPosition="start" />
          <Tab label="Budgets" icon={<BudgetIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {renderTabContent()}
        </Box>
      </Paper>
    </Container>
  );
}

export default GovernmentPolicies;
