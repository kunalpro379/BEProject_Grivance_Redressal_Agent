import axios from 'axios';
import pool from '../config/db.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenRouter } from '@openrouter/sdk';

/**
 * Claude-powered ReAct Agent for Policy Retrieval
 * Uses ReAct (Reasoning + Acting) to search entire vector database
 * Keeps searching until comprehensive data is retrieved
 */
class ClaudePolicyAgentService {
  constructor() {
    this.puterApiUrl = 'https://api.puter.com/drivers/call';
    this.maxIterations = 10;
    this.thoughtHistory = [];
    this.pinecone = null;
    this.openRouter = null;
    this.initPinecone();
    this.initOpenRouter();
  }

  async initOpenRouter() {
    try {
      if (process.env.OPENROUTER_API_KEY) {
        this.openRouter = new OpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY,
          defaultHeaders: {
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
            'X-OpenRouter-Title': 'IGRS Portal'
          }
        });
        console.log('OpenRouter initialized for embeddings');
      } else {
        console.warn('⚠️ OPENROUTER_API_KEY not found - embeddings disabled');
      }
    } catch (error) {
      console.error('OpenRouter initialization error:', error);
    }
  }

  async initPinecone() {
    try {
      if (process.env.PINECONE_API_KEY) {
        this.pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY
        });
        console.log('Pinecone initialized for policy retrieval');
      } else {
        console.warn('⚠️ PINECONE_API_KEY not found - vector search disabled');
      }
    } catch (error) {
      console.error('Pinecone initialization error:', error);
    }
  }

  /**
   * Main ReAct loop - search entire vector DB until comprehensive data found
   */
  async retrievePolicies(departmentName, departmentId = null) {
    console.log(`\n🤖 Claude ReAct Agent: Retrieving policies for ${departmentName}`);
    console.log('=' .repeat(80));

    this.thoughtHistory = [];
    let allResults = [];
    let iteration = 0;
    let shouldContinue = true;

    // ReAct Loop: Keep searching until we have comprehensive data
    while (shouldContinue && iteration < this.maxIterations) {
      iteration++;
      console.log(`\n📍 Iteration ${iteration}/${this.maxIterations}`);

      // THINK: Decide what to search for
      const thought = this.generateThought(departmentName, allResults, iteration);
      this.thoughtHistory.push(thought);
      
      console.log(`💭 Reasoning: ${thought.reasoning}`);
      console.log(`🎯 Action: ${thought.action}`);
      console.log(`🔍 Queries: ${thought.queries.join(', ')}`);

      // ACT: Execute the search
      if (thought.action === 'search_vector_db') {
        const results = await this.searchVectorDB(thought.queries, departmentName);
        allResults.push(...results);
        console.log(`Found ${results.length} documents (Total: ${allResults.length})`);
      } else if (thought.action === 'search_database') {
        const results = await this.searchDatabase(thought.queries, departmentName);
        allResults.push(...results);
        console.log(`Found ${results.length} documents (Total: ${allResults.length})`);
      } else if (thought.action === 'search_all_departments') {
        const results = await this.searchAllDepartments(thought.queries);
        allResults.push(...results);
        console.log(`Found ${results.length} documents (Total: ${allResults.length})`);
      } else if (thought.action === 'complete') {
        shouldContinue = false;
        console.log(`Search complete`);
      }

      // OBSERVE: Check if we have enough comprehensive data
      const uniqueResults = this.deduplicateResults(allResults);
      if (uniqueResults.length >= 30 || (uniqueResults.length >= 10 && iteration >= 5)) {
        console.log(`Sufficient data collected (${uniqueResults.length} unique documents)`);
        shouldContinue = false;
      }
    }

    // Remove duplicates
    const uniqueResults = this.deduplicateResults(allResults);
    console.log(`\n Total unique documents: ${uniqueResults.length}`);

    // Generate comprehensive policy document
    console.log(`\n📝 Generating comprehensive policy document...`);
    const policyDocument = await this.generateComprehensiveDocument(
      departmentName,
      uniqueResults
    );

    return {
      success: true,
      department: departmentName,
      totalDocuments: uniqueResults.length,
      iterations: iteration,
      thoughtProcess: this.thoughtHistory.map(t => t.reasoning),
      policyDocument: policyDocument,
      rawResults: uniqueResults
    };
  }

  /**
   * THINK step - Generate reasoning and decide next action
   */
  generateThought(departmentName, currentResults, iteration) {
    const uniqueCount = this.deduplicateResults(currentResults).length;

    // Iteration 1-3: Search Pinecone for ALL government policies and plans
    if (iteration <= 3) {
      return {
        reasoning: `Iteration ${iteration}: Searching Pinecone for government policies, budget, and plans`,
        action: 'search_vector_db',
        queries: [
          `government policy guidelines regulations rules`,
          `budget allocation financial expenditure funding`,
          `government schemes programs initiatives plans`,
          `acts legislation laws statutory provisions`,
          `circulars notifications orders directives`,
          `annual budget economic survey fiscal policy`,
          `five year plan development strategy`,
          `ministry department government initiatives`,
          `public services infrastructure development`,
          `citizen charter service delivery standards`
        ],
        confidence: 0.9
      };
    }

    // Iteration 4-6: Search database for department-specific documents
    if (iteration <= 6) {
      return {
        reasoning: `Iteration ${iteration}: Searching database for ${departmentName} documents`,
        action: 'search_database',
        queries: [
          `${departmentName}`,
          `water supply`,
          `sanitation`,
          `jal jeevan mission`,
          `swachh bharat`,
          `groundwater`,
          `water resources`
        ],
        confidence: 0.8
      };
    }

    // Iteration 7-8: Search all departments as last resort
    if (iteration <= 8 && uniqueCount < 20) {
      return {
        reasoning: `Iteration ${iteration}: Searching across all departments`,
        action: 'search_all_departments',
        queries: [
          `government policy`,
          `public services`,
          `infrastructure`
        ],
        confidence: 0.7
      };
    }

    // Complete if we have enough data
    return {
      reasoning: `Sufficient data collected (${uniqueCount} documents)`,
      action: 'complete',
      queries: [],
      confidence: 1.0
    };
  }

  /**
   * Search Pinecone vector database using OpenRouter for embeddings
   */
  async searchVectorDB(queries, departmentName) {
    const results = [];

    if (!this.pinecone || !process.env.PINECONE_INDEX_NAME) {
      console.log('  ⚠️ Pinecone not configured, skipping vector search');
      return results;
    }

    if (!this.openRouter) {
      console.log('  ⚠️ OpenRouter not configured, skipping vector search');
      return results;
    }

    try {
      const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      
      // Check index stats first
      try {
        const stats = await index.describeIndexStats();
        console.log(`  📊 Pinecone Index Stats:`, {
          totalVectors: stats.totalRecordCount || 0,
          dimension: stats.dimension || 'unknown',
          namespaces: Object.keys(stats.namespaces || {})
        });
        
        if (!stats.totalRecordCount || stats.totalRecordCount === 0) {
          console.log(`  ⚠️ Pinecone index is EMPTY - no vectors found`);
          return results;
        }
      } catch (statsError) {
        console.error(`  ⚠️ Could not get index stats:`, statsError.message);
      }

      for (const query of queries) {
        try {
          // Generate embedding using OpenRouter with text-embedding-ada-002 (1536 dims)
          // But we need to specify dimensions parameter to get 1024 dims
          console.log(`  🔄 Generating embedding for: "${query.substring(0, 50)}..."`);
          const embeddingResponse = await axios.post(
            'https://openrouter.ai/api/v1/embeddings',
            {
              input: query,
              model: 'openai/text-embedding-3-small',
              dimensions: 1024  // Match Pinecone index dimension
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.SITE_URL || 'http://localhost:5173',
                'X-OpenRouter-Title': 'IGRS Portal'
              }
            }
          );

          const embedding = embeddingResponse.data.data[0].embedding;
          console.log(`  ✅ Embedding generated (${embedding.length} dimensions)`);

          // Search Pinecone with the embedding
          console.log(`  🔍 Searching Pinecone index: ${process.env.PINECONE_INDEX_NAME}`);
          const searchResponse = await index.query({
            vector: embedding,
            topK: 20,
            includeMetadata: true
          });

          if (searchResponse.matches && searchResponse.matches.length > 0) {
            console.log(`  📊 Found ${searchResponse.matches.length} matches for "${query}"`);
            searchResponse.matches.forEach(match => {
              console.log(`    - Score: ${match.score.toFixed(3)}, ID: ${match.id}`);
              if (match.metadata) { // No threshold - include all results
                const metadata = match.metadata;
                const title = metadata.title || metadata.file_name || 'Untitled';
                const content = metadata.content || metadata.text || metadata.content_text || metadata.description || '';
                
                results.push({
                  id: match.id,
                  title: title,
                  content: content,
                  description: metadata.description || '',
                  category: metadata.category || 'General',
                  department_id: metadata.department_id,
                  department_name: metadata.department_name || '',
                  created_at: metadata.created_at,
                  source: 'pinecone',
                  query: query,
                  relevance: match.score,
                  file_url: metadata.file_url || '',
                  file_name: metadata.file_name || ''
                });
              }
            });
          } else {
            console.log(`  📊 No matches found for "${query}"`);
          }
        } catch (queryError) {
          console.error(`  ⚠️ Query error for "${query}":`, queryError.message);
        }
      }

      console.log(`  🔍 Pinecone search: ${results.length} results`);
    } catch (error) {
      console.error('  ❌ Pinecone search error:', error.message);
    }

    return results;
  }

  /**
   * Search database (with department filter)
   */
  async searchDatabase(queries, departmentName) {
    const results = [];

    try {
      for (const query of queries) {
        const dbResult = await pool.query(
          `SELECT 
            kb.id,
            kb.title,
            kb.description,
            kb.content_text,
            kb.file_url,
            kb.file_name,
            kb.file_type,
            kb.category,
            kb.department_id,
            kb.created_at,
            d.name as department_name,
            'database' as source
           FROM departmentknowledgebase kb
           LEFT JOIN departments d ON kb.department_id = d.id
           WHERE kb.is_active = true
           AND (
             kb.title ILIKE $1 OR
             kb.description ILIKE $1 OR
             kb.content_text ILIKE $1 OR
             kb.category ILIKE $1 OR
             kb.file_name ILIKE $1 OR
             d.name ILIKE $1
           )
           ORDER BY kb.created_at DESC
           LIMIT 50`,
          [`%${query}%`]
        );

        results.push(...dbResult.rows.map(row => ({
          ...row,
          content: row.content_text || row.description || '',
          query: query,
          relevance: 0.9
        })));
      }

      console.log(`  📚 Database search: ${results.length} results`);
    } catch (error) {
      console.error('  ❌ Database search error:', error.message);
    }

    return results;
  }

  /**
   * Search ALL departments (no filter)
   */
  async searchAllDepartments(queries) {
    const results = [];

    try {
      for (const query of queries) {
        const dbResult = await pool.query(
          `SELECT 
            kb.id,
            kb.title,
            kb.description,
            kb.content_text,
            kb.file_url,
            kb.file_name,
            kb.file_type,
            kb.category,
            kb.department_id,
            kb.created_at,
            d.name as department_name,
            'database_all' as source
           FROM departmentknowledgebase kb
           LEFT JOIN departments d ON kb.department_id = d.id
           WHERE kb.is_active = true
           AND (
             kb.title ILIKE $1 OR
             kb.description ILIKE $1 OR
             kb.content_text ILIKE $1 OR
             kb.category ILIKE $1
           )
           ORDER BY kb.created_at DESC
           LIMIT 100`,
          [`%${query}%`]
        );

        results.push(...dbResult.rows.map(row => ({
          ...row,
          content: row.content_text || row.description || '',
          query: query,
          relevance: 0.85
        })));
      }

      console.log(`  🌐 All departments search: ${results.length} results`);
    } catch (error) {
      console.error('  ❌ All departments search error:', error.message);
    }

    return results;
  }

  /**
   * Remove duplicate results - aggressive deduplication
   */
  deduplicateResults(results) {
    const seen = new Map();
    const unique = [];
    
    results.forEach(result => {
      // Create multiple keys to catch duplicates
      const idKey = result.id ? `id:${result.id}` : null;
      const titleKey = result.title ? `title:${result.title.toLowerCase().trim()}` : null;
      const fileKey = result.file_name ? `file:${result.file_name.toLowerCase().trim()}` : null;
      const urlKey = result.file_url ? `url:${result.file_url}` : null;
      
      // Check if any key already exists
      const isDuplicate = [idKey, titleKey, fileKey, urlKey].some(key => {
        if (!key) return false;
        return seen.has(key);
      });
      
      if (!isDuplicate) {
        // Add all keys to seen map
        [idKey, titleKey, fileKey, urlKey].forEach(key => {
          if (key) seen.set(key, true);
        });
        unique.push(result);
      }
    });
    
    return unique;
  }

  /**
   * Generate comprehensive policy document
   */
  async generateComprehensiveDocument(departmentName, results) {
    // If we have PUTER_API_KEY and results, use Claude
    if (process.env.PUTER_API_KEY && results.length > 5) {
      try {
        return await this.synthesizeWithClaude(departmentName, results);
      } catch (error) {
        console.error('  ⚠️ Claude synthesis failed, using structured generation:', error.message);
      }
    }

    // Fallback: Generate structured document from results
    return this.generateStructuredDocument(departmentName, results);
  }

  /**
   * Synthesize with Claude API
   */
  async synthesizeWithClaude(departmentName, results) {
    // Prepare comprehensive document summaries
    const documentSummaries = results.slice(0, 30).map(r => ({
      title: r.title,
      category: r.category,
      department: r.department_name || 'General',
      content: r.content?.substring(0, 2000) || r.description?.substring(0, 2000) || 'No content available',
      file_name: r.file_name || ''
    }));

    const prompt = `You are an expert government policy analyst. Create a comprehensive, well-formatted policy document for ${departmentName}.

Available Documents (${results.length} total):
${JSON.stringify(documentSummaries, null, 2)}

Create a COMPREHENSIVE, WELL-FORMATTED policy document with proper markdown formatting:

# ${departmentName} - Comprehensive Policies & Guidelines

*Generated: ${new Date().toLocaleDateString('en-IN')}*

---

## 1. Executive Summary
Provide a clear overview of the department's mandate, vision, and key responsibilities.

## 2. Legislative Framework
List all governing acts, laws, and constitutional provisions that apply to this department.

## 3. Government Policies
For EACH policy found in the documents, create a detailed section with:
- **Policy Name**: Full official name
- **Objectives**: Clear goals and purpose
- **Scope**: Coverage and applicability
- **Implementation**: Guidelines and procedures
- **Beneficiaries**: Target groups
- **Timeline**: Key dates and milestones

## 4. Rules & Regulations
Detail statutory regulations, compliance requirements, and enforcement mechanisms.

## 5. Operational Guidelines
Include:
- Standard Operating Procedures (SOPs)
- Service delivery standards
- Quality benchmarks
- Performance metrics

## 6. Government Schemes & Programs
For EACH scheme, provide:
- **Scheme Name**: Official name and code
- **Eligibility**: Who can apply
- **Benefits**: What is provided
- **Application Process**: How to apply
- **Contact**: Where to get help

## 7. Budget & Financial Guidelines
- Budget allocation details
- Expenditure norms
- Financial procedures
- Audit requirements

## 8. Circulars & Notifications
List recent circulars with dates, important notifications, and updates.

## 9. Monitoring & Evaluation
- Performance indicators
- Reporting mechanisms
- Audit procedures
- Quality assurance

## 10. Contact Information
- Department offices and addresses
- Helpline numbers
- Email addresses
- Official websites

---

**IMPORTANT INSTRUCTIONS:**
1. Use proper markdown formatting with headers, bold text, bullet points
2. Make it professional and easy to read
3. Include ALL relevant information from the documents
4. Use official government language
5. Organize information logically
6. Add proper spacing and formatting
7. Make it actionable and useful for citizens and officials
8. DO NOT just list raw data - synthesize it into a coherent document`;

    try {
      console.log('  🤖 Calling Claude API for document synthesis...');
      const response = await axios.post(
        this.puterApiUrl,
        {
          interface: 'puter-chat-completion',
          driver: 'claude',
          method: 'complete',
          args: {
            messages: [{ role: 'user', content: prompt }],
            model: 'claude-sonnet-4-6',
            temperature: 0.3,
            max_tokens: 16000  // Increased for longer output
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PUTER_API_KEY}`
          },
          timeout: 90000  // 90 seconds
        }
      );

      if (response.data?.message?.content?.[0]?.text) {
        console.log('  ✅ Claude synthesis successful');
        return response.data.message.content[0].text;
      }

      throw new Error('Invalid Claude API response');
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Invalid PUTER_API_KEY - Please check your API key');
      }
      console.error('  ❌ Claude synthesis error:', error.message);
      throw error;
    }
  }

  /**
   * Generate structured document from results (fallback)
   */
  generateStructuredDocument(departmentName, results) {
    let doc = `# ${departmentName} - Policies & Guidelines\n\n`;
    doc += `*Generated: ${new Date().toLocaleDateString('en-IN')}*\n\n`;
    doc += `---\n\n`;

    if (results.length === 0) {
      doc += `No policy documents available.\n\n`;
      return doc;
    }

    doc += `## Overview\n\n`;
    doc += `This document contains ${results.length} policy documents, guidelines, and resources for ${departmentName}.\n\n`;
    doc += `---\n\n`;

    // Group by category
    const categories = {};
    results.forEach(result => {
      const cat = result.category || 'General Policies';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(result);
    });

    // Generate content for each category
    Object.keys(categories).sort().forEach((category) => {
      doc += `## ${category}\n\n`;

      categories[category].forEach((item, index) => {
        doc += `### ${index + 1}. ${item.title}\n\n`;
        
        // Add file name if available
        if (item.file_name) {
          doc += `**Source**: ${item.file_name}\n\n`;
        }
        
        // Add department if different
        if (item.department_name && item.department_name !== departmentName) {
          doc += `**Department**: ${item.department_name}\n\n`;
        }
        
        const description = (item.description || '').trim();
        const content = (item.content || item.content_text || '').trim();
        
        // Show description
        if (description && description.length > 10) {
          doc += `**Description**: ${description}\n\n`;
        }

        // Show content if available and substantial
        if (content && content.length > 50) {
          // Clean up content - remove excessive whitespace
          const cleanContent = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
          
          // Limit content length for readability
          const maxLength = 1000;
          if (cleanContent.length > maxLength) {
            doc += `${cleanContent.substring(0, maxLength)}...\n\n`;
            doc += `*[Content truncated for brevity]*\n\n`;
          } else {
            doc += `${cleanContent}\n\n`;
          }
        } else if (!description || description.length <= 10) {
          doc += `*Document available - please refer to source for full details*\n\n`;
        }
        
        // Add file URL if available
        if (item.file_url) {
          doc += `**Access Document**: [View File](${item.file_url})\n\n`;
        }
        
        doc += `---\n\n`;
      });
    });

    doc += `\n## Summary\n\n`;
    doc += `Total Documents: ${results.length}\n\n`;
    doc += `Categories: ${Object.keys(categories).join(', ')}\n\n`;
    doc += `*For detailed information, please refer to individual documents above.*\n\n`;

    return doc;
  }
}

export default new ClaudePolicyAgentService();
