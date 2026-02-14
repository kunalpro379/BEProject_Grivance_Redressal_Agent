import { vectorService } from '../services/vector.service.js';

export const findSimilarGrievances = async (req, res) => {
  try {
    const { embedding, threshold = 0.7, limit = 10 } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    const similar = await vectorService.findSimilarGrievances(embedding, threshold, limit);

    res.json({
      count: similar.length,
      grievances: similar,
    });
  } catch (error) {
    console.error('Find similar grievances error:', error);
    res.status(500).json({ error: 'Failed to find similar grievances' });
  }
};

export const findSimilarResolved = async (req, res) => {
  try {
    const { embedding, limit = 5 } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    const resolved = await vectorService.findSimilarResolvedCases(embedding, limit);

    res.json({
      count: resolved.length,
      cases: resolved,
    });
  } catch (error) {
    console.error('Find similar resolved error:', error);
    res.status(500).json({ error: 'Failed to find similar resolved cases' });
  }
};

export const findRelevantPolicies = async (req, res) => {
  try {
    const { embedding, department_id, limit = 5 } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    const policies = await vectorService.findRelevantPolicies(embedding, department_id, limit);

    res.json({
      count: policies.length,
      policies,
    });
  } catch (error) {
    console.error('Find relevant policies error:', error);
    res.status(500).json({ error: 'Failed to find relevant policies' });
  }
};

export const findRelevantFAQs = async (req, res) => {
  try {
    const { embedding, limit = 3 } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    const faqs = await vectorService.findRelevantFAQs(embedding, limit);

    res.json({
      count: faqs.length,
      faqs,
    });
  } catch (error) {
    console.error('Find relevant FAQs error:', error);
    res.status(500).json({ error: 'Failed to find relevant FAQs' });
  }
};

export const getDepartmentClusters = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { threshold = 0.8 } = req.query;

    const clusters = await vectorService.getDepartmentClusters(departmentId, threshold);

    res.json({
      department_id: departmentId,
      cluster_count: clusters.length,
      clusters,
    });
  } catch (error) {
    console.error('Get department clusters error:', error);
    res.status(500).json({ error: 'Failed to get department clusters' });
  }
};

export const storeEmbedding = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { embedding, metadata } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    await vectorService.storeGrievanceEmbedding(grievanceId, embedding, metadata);

    res.json({
      message: 'Embedding stored successfully',
      grievance_id: grievanceId,
    });
  } catch (error) {
    console.error('Store embedding error:', error);
    res.status(500).json({ error: 'Failed to store embedding' });
  }
};

export const addPolicy = async (req, res) => {
  try {
    const { title, content, department_id, document_url, embedding, metadata } = req.body;

    if (!title || !content || !embedding) {
      return res.status(400).json({ error: 'Title, content, and embedding required' });
    }

    const policy = await vectorService.addPolicyDocument({
      title,
      content,
      department_id,
      document_url,
      embedding,
      metadata,
    });

    res.status(201).json({
      message: 'Policy document added successfully',
      policy,
    });
  } catch (error) {
    console.error('Add policy error:', error);
    res.status(500).json({ error: 'Failed to add policy document' });
  }
};

export const addFAQ = async (req, res) => {
  try {
    const { question, answer, category, department_id, embedding } = req.body;

    if (!question || !answer || !embedding) {
      return res.status(400).json({ error: 'Question, answer, and embedding required' });
    }

    const faq = await vectorService.addFAQ({
      question,
      answer,
      category,
      department_id,
      embedding,
    });

    res.status(201).json({
      message: 'FAQ added successfully',
      faq,
    });
  } catch (error) {
    console.error('Add FAQ error:', error);
    res.status(500).json({ error: 'Failed to add FAQ' });
  }
};

export const searchGrievances = async (req, res) => {
  try {
    const { embedding, filters = {} } = req.body;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ error: 'Valid embedding array required' });
    }

    const results = await vectorService.searchGrievances(embedding, filters);

    res.json({
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Search grievances error:', error);
    res.status(500).json({ error: 'Failed to search grievances' });
  }
};

export const getUnprocessedGrievances = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const grievances = await vectorService.getGrievancesWithoutEmbeddings(limit);

    res.json({
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error('Get unprocessed grievances error:', error);
    res.status(500).json({ error: 'Failed to get unprocessed grievances' });
  }
};

export const batchUpdateEmbeddings = async (req, res) => {
  try {
    const { embeddings } = req.body;

    if (!Array.isArray(embeddings)) {
      return res.status(400).json({ error: 'Embeddings array required' });
    }

    const result = await vectorService.batchUpdateEmbeddings(embeddings);

    res.json({
      message: 'Embeddings updated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Batch update embeddings error:', error);
    res.status(500).json({ error: 'Failed to update embeddings' });
  }
};
