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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function GovernmentPolicies() {
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
    loadPolicies();
    loadStats();
  }, []);

  const loadPolicies = async (category = 'all') => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/government-policies/extract`,
        {
          params: { category },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setPoliciesData(response.data.data);
        setExtractionMetadata(response.data.metadata);
      } else {
        setError(response.data.message || 'Failed to load policies');
      }
    } catch (err) {
      console.error('Load policies error:', err);
      setError(err.response?.data?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/government-policies/stats`,
        {
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
    const categories = ['all', 'rules', 'policies', 'plans', 'budgets'];
    loadPolicies(categories[activeTab]);
    loadStats();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/government-policies/search`,
        { query: searchQuery },
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
    const tabData = [
      { key: 'all', items: [...policiesData.rules, ...policiesData.policies, ...policiesData.plans, ...policiesData.budgets] },
      { key: 'rules', items: policiesData.rules },
      { key: 'policies', items: policiesData.policies },
      { key: 'plans', items: policiesData.plans },
      { key: 'budgets', items: policiesData.budgets }
    ];

    const currentData = tabData[activeTab];

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (currentData.items.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {currentData.key === 'all' ? 'policies' : currentData.key} found. Click refresh to extract from database.
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
