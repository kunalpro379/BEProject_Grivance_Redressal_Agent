import axios from 'axios';
import db from '../config/database.js';

class PolicyExtractorService {
  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.deepseekBaseUrl = 'https://api.deepseek.com/v1';
  }

  /**
   * Extract government policies using DeepSeek AI
   */
  async extractPolicies(category = 'all', departmentId = null) {
    try {
      console.log(`🔍 Extracting policies - Category: ${category}, Department: ${departmentId || 'all'}`);

      // Query database for policy documents
      const documents = await this.queryPolicyDocuments(departmentId);
      
      // If no documents in DB, try Pinecone
      if (documents.length === 0) {
        console.log('📄 No documents in database, querying Pinecone...');
        const pineconeDocuments = await this.queryPineconeForPolicies(departmentId);
        
        if (pineconeDocuments.length === 0) {
          return {
            success: false,
            message: 'No policy documents found in database or Pinecone',
            data: { rules: [], policies: [], plans: [], budgets: [] }
          };
        }
        
        console.log(`📄 Found ${pineconeDocuments.length} documents from Pinecone, analyzing with DeepSeek...`);
        const analysis = await this.analyzeWithDeepSeek(pineconeDocuments, category);
        
        return {
          success: true,
          data: analysis,
          metadata: {
            total_documents: pineconeDocuments.length,
            category,
            department_id: departmentId,
            extracted_at: new Date().toISOString(),
            source: 'pinecone'
          }
        };
      }

      console.log(`📄 Found ${documents.length} documents, analyzing with DeepSeek...`);

      // Analyze with DeepSeek AI
      const analysis = await this.analyzeWithDeepSeek(documents, category);

      return {
        success: true,
        data: analysis,
        metadata: {
          total_documents: documents.length,
          category,
          department_id: departmentId,
          extracted_at: new Date().toISOString(),
          source: 'database'
        }
      };

    } catch (error) {
      console.error('Policy extraction error:', error);
      throw error;
    }
  }

  /**
   * Query Pinecone for policy documents
   */
  async queryPineconeForPolicies(departmentId = null) {
    try {
      console.log('🔍 Querying Pinecone for policy documents...');
      
      const { Pinecone } = await import('@pinecone-database/pinecone');
      
      const pineconeApiKey = process.env.PINECONE_API_KEY;
      const pineconeIndexName = process.env.PINECONE_INDEX_NAME || 'igrs1';
      
      if (!pineconeApiKey) {
        console.warn('⚠️  Pinecone API key not configured');
        return [];
      }
      
      console.log(`📊 Using Pinecone index: ${pineconeIndexName}`);
      
      const pc = new Pinecone({
        apiKey: pineconeApiKey
      });
      
      const index = pc.index(pineconeIndexName);
      
      // Query for policy-related documents
      const queries = [
        'government policies regulations rules',
        'budget allocation financial planning',
        'development plans initiatives programs',
        'administrative guidelines procedures'
      ];
      
      const allDocuments = [];
      
      for (const query of queries) {
        try {
          console.log(`🔎 Querying Pinecone: "${query}"`);
          
          // Query without embedding (Pinecone will handle it)
          const queryResults = await index.query({
            topK: 25,
            includeMetadata: true
          });
          
          if (queryResults.matches) {
            console.log(`  ✓ Found ${queryResults.matches.length} matches`);
            
            queryResults.matches.forEach(match => {
              if (match.metadata) {
                allDocuments.push({
                  id: match.id,
                  title: match.metadata.title || 'Untitled Document',
                  content: match.metadata.content || match.metadata.text || '',
                  department_id: match.metadata.department_id,
                  department_name: match.metadata.department_name,
                  metadata: match.metadata,
                  created_at: match.metadata.created_at || new Date().toISOString(),
                  score: match.score
                });
              }
            });
          }
        } catch (queryError) {
          console.warn(`  ✗ Pinecone query failed for "${query}":`, queryError.message);
        }
      }
      
      // Remove duplicates based on ID
      const uniqueDocs = Array.from(
        new Map(allDocuments.map(doc => [doc.id, doc])).values()
      );
      
      console.log(`📊 Retrieved ${uniqueDocs.length} unique documents from Pinecone`);
      return uniqueDocs;
      
    } catch (error) {
      console.error('❌ Pinecone query error:', error.message);
      return [];
    }
  }

  /**
   * Query policy documents from database
   */
  async queryPolicyDocuments(departmentId = null) {
    try {
      // For now, fetch ALL policy documents regardless of department
      // DeepSeek will analyze and categorize them appropriately
      const query = `
        SELECT 
          pd.id,
          pd.title,
          pd.content,
          pd.department_id,
          pd.document_url,
          pd.metadata,
          pd.created_at,
          d.name as department_name
        FROM policydocuments pd
        LEFT JOIN departments d ON pd.department_id = d.id
        WHERE pd.is_active = true
        ORDER BY pd.created_at DESC 
        LIMIT 100
      `;

      console.log('📊 Querying all policy documents from database...');
      const result = await db.query(query);
      console.log(`📄 Found ${result.rows.length} documents in database`);
      
      return result.rows;

    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Analyze documents with DeepSeek AI
   */
  async analyzeWithDeepSeek(documents, category) {
    try {
      // Prepare document summaries (limit to first 30 for token efficiency)
      const docSummaries = documents.slice(0, 30).map((doc, index) => ({
        index,
        id: doc.id,
        title: doc.title || 'Untitled',
        content_preview: (doc.content || '').substring(0, 500),
        department: doc.department_name,
        metadata: doc.metadata,
        created_at: doc.created_at
      }));

      const prompt = `Analyze these government policy documents and extract comprehensive information about ${category}.

Documents:
${JSON.stringify(docSummaries, null, 2)}

Extract and categorize into:
1. RULES & REGULATIONS: Legal rules, compliance requirements, statutory regulations, administrative procedures
2. POLICIES: Government policies, frameworks, guidelines, standards, directives
3. PLANS: Development plans, strategic initiatives, action plans, roadmaps, programs
4. BUDGETS: Financial allocations, budget estimates, expenditure plans, fiscal policies

For each category, provide:
- title: Document title
- summary: Brief summary (max 200 chars)
- key_points: Array of key points (max 5)
- department: Relevant department
- date: Document date if available
- importance: High/Medium/Low
- document_id: Original document ID from the documents array
- category_tags: Array of relevant tags

Return ONLY valid JSON with this structure:
{
  "rules": [{title, summary, key_points, department, date, importance, document_id, category_tags}],
  "policies": [...],
  "plans": [...],
  "budgets": [...],
  "total_analyzed": number,
  "extraction_quality": "high/medium/low",
  "insights": "Brief overall insights about the policy landscape"
}

Be thorough and extract ALL relevant information. If a document fits multiple categories, include it in all relevant ones.`;

      const response = await axios.post(
        `${this.deepseekBaseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are an expert government policy analyst specializing in extracting and categorizing official documents.
You have deep knowledge of:
- Government rules and regulations
- Public policies and frameworks  
- Development plans and initiatives
- Budget allocations and financial planning

Always return valid JSON. Be comprehensive and accurate.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 3000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.deepseekApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Parse JSON from response
      try {
        let jsonText = aiResponse;
        
        // Remove markdown code blocks if present
        if (aiResponse.includes('```json')) {
          jsonText = aiResponse.split('```json')[1].split('```')[0];
        } else if (aiResponse.includes('```')) {
          jsonText = aiResponse.split('```')[1].split('```')[0];
        }

        const analysis = JSON.parse(jsonText.trim());

        // Enrich with full document data
        analysis.rules = this.enrichWithDocumentData(analysis.rules || [], documents);
        analysis.policies = this.enrichWithDocumentData(analysis.policies || [], documents);
        analysis.plans = this.enrichWithDocumentData(analysis.plans || [], documents);
        analysis.budgets = this.enrichWithDocumentData(analysis.budgets || [], documents);

        return analysis;

      } catch (parseError) {
        console.error('Failed to parse DeepSeek response:', parseError);
        console.error('Raw response:', aiResponse);
        
        // Return fallback structure
        return this.createFallbackAnalysis(documents);
      }

    } catch (error) {
      console.error('DeepSeek API error:', error.response?.data || error.message);
      return this.createFallbackAnalysis(documents);
    }
  }

  /**
   * Enrich extracted items with full document data
   */
  enrichWithDocumentData(items, documents) {
    return items.map(item => {
      const docIndex = item.document_id;
      const fullDoc = documents[docIndex];
      
      if (fullDoc) {
        return {
          ...item,
          full_document: {
            id: fullDoc.id,
            title: fullDoc.title,
            content: fullDoc.content,
            document_url: fullDoc.document_url,
            department_id: fullDoc.department_id,
            department_name: fullDoc.department_name,
            created_at: fullDoc.created_at
          }
        };
      }
      
      return item;
    });
  }

  /**
   * Create fallback analysis when AI fails
   */
  createFallbackAnalysis(documents) {
    return {
      rules: [],
      policies: documents.slice(0, 10).map((doc, i) => ({
        title: doc.title,
        summary: (doc.content || '').substring(0, 200),
        department: doc.department_name,
        date: doc.created_at,
        importance: 'Medium',
        document_id: i,
        full_document: doc
      })),
      plans: [],
      budgets: [],
      total_analyzed: documents.length,
      extraction_quality: 'low',
      insights: 'Fallback analysis - AI processing unavailable'
    };
  }

  /**
   * Get policies by department
   */
  async getPoliciesByDepartment(departmentId) {
    return this.extractPolicies('all', departmentId);
  }

  /**
   * Get policies by category
   */
  async getPoliciesByCategory(category) {
    const validCategories = ['rules', 'policies', 'plans', 'budgets', 'all'];
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    
    return this.extractPolicies(category);
  }

  /**
   * Search policies with AI
   */
  async searchPolicies(searchQuery, departmentId = null) {
    try {
      const documents = await this.queryPolicyDocuments(departmentId);
      
      if (documents.length === 0) {
        return { success: false, results: [], message: 'No documents found' };
      }

      // Use DeepSeek to find relevant documents
      const prompt = `Search these government policy documents for: "${searchQuery}"

Documents:
${JSON.stringify(documents.slice(0, 20).map(d => ({
  id: d.id,
  title: d.title,
  content_preview: (d.content || '').substring(0, 300),
  department: d.department_name
})), null, 2)}

Return the most relevant documents as JSON array:
[{
  document_id: "uuid",
  title: "string",
  relevance_score: 0-100,
  relevance_reason: "why this document matches the search",
  key_excerpts: ["relevant text excerpts"]
}]

Return ONLY valid JSON array, ordered by relevance (highest first).`;

      const response = await axios.post(
        `${this.deepseekBaseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a search assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.deepseekApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      let results = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());

      // Enrich with full document data
      results = results.map(result => {
        const fullDoc = documents.find(d => d.id === result.document_id);
        return { ...result, full_document: fullDoc };
      });

      return { success: true, results, query: searchQuery };

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

export default new PolicyExtractorService();
