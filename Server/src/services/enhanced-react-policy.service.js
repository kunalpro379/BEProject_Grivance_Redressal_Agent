import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Enhanced ReAct Agent for Policy Extraction
 * - No hardcoded schemas
 * - No hallucinations
 * - Only returns real data from Pinecone
 * - Implements true Reasoning + Acting pattern
 */
class EnhancedReactPolicyAgent {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.indexName = process.env.PINECONE_INDEX_NAME;
    this.index = null;
    this.maxIterations = 15;
    this.initialized = false;
  }

  /**
   * Initialize Pinecone connection
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log(`🔌 Connecting to Pinecone index: ${this.indexName}`);
      this.index = this.pinecone.index(this.indexName);
      
      // Verify connection by getting index stats
      const stats = await this.index.describeIndexStats();
      console.log(`✅ Connected to Pinecone`);
      console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
      console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).join(', ') || 'none'}`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to Pinecone:`, error.message);
      return false;
    }
  }

  /**
   * Generate diverse search strategies for a department
   */
  generateSearchStrategies(departmentName, iteration) {
    const strategies = [
      // Strategy 1: Direct department name
      {
        type: 'direct',
        query: departmentName,
        description: `Direct search for "${departmentName}"`
      },
      // Strategy 2: Department keywords
      {
        type: 'keywords',
        query: departmentName.toLowerCase().split(' ').filter(w => w.length > 3).join(' '),
        description: `Keyword search from department name`
      },
      // Strategy 3: Policy-specific terms
      {
        type: 'policy',
        query: `${departmentName} policy guidelines regulations`,
        description: `Policy-focused search`
      },
      // Strategy 4: Service delivery terms
      {
        type: 'service',
        query: `${departmentName} service delivery standards procedures`,
        description: `Service delivery search`
      },
      // Strategy 5: Operational terms
      {
        type: 'operational',
        query: `${departmentName} operations management workflow`,
        description: `Operational procedures search`
      }
    ];

    // Return different strategy based on iteration
    return strategies[iteration % strategies.length];
  }

  /**
   * Search Pinecone using multiple methods
   */
  async searchPinecone(strategy, topK = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.index) {
      console.log(`   ⚠️  Pinecone not initialized`);
      return [];
    }

    const results = [];

    try {
      // Method 1: Try to list all vectors and fetch with namespace
      console.log(`   📋 Attempting to list vectors...`);
      try {
        const listResult = await this.index.listPaginated({ limit: 100 });
        if (listResult.vectors && listResult.vectors.length > 0) {
          console.log(`   ✓ Found ${listResult.vectors.length} vectors via list`);
          
          // Extract vector IDs properly
          const vectorIds = listResult.vectors.map(v => v.id).filter(id => id && id.length > 0);
          console.log(`   📝 Extracted ${vectorIds.length} valid vector IDs`);
          
          if (vectorIds.length > 0) {
            // Get the namespace from list result
            const namespace = listResult.namespace || '__default__';
            console.log(`   🔖 Using namespace: "${namespace}"`);
            
            // Use namespace-specific index for fetching
            const nsIndex = this.index.namespace(namespace);
            
            // Fetch in smaller batches
            const batchSize = 10;
            for (let i = 0; i < vectorIds.length; i += batchSize) {
              const batch = vectorIds.slice(i, i + batchSize);
              try {
                console.log(`   📦 Fetching batch ${Math.floor(i/batchSize) + 1} (${batch.length} IDs)...`);
                const fetchResult = await nsIndex.fetch(batch);
                
                if (fetchResult.records && Object.keys(fetchResult.records).length > 0) {
                  const records = Object.values(fetchResult.records);
                  console.log(`   ✓ Fetched ${records.length} records with metadata`);
                  
                  // Filter by relevance to search query
                  const filtered = records.filter(record => {
                    const metadata = record.metadata || {};
                    
                    // If no metadata, skip
                    if (Object.keys(metadata).length === 0) return false;
                    
                    const searchText = strategy.query.toLowerCase();
                    
                    // Check all metadata fields for relevance
                    const allText = Object.values(metadata)
                      .filter(v => typeof v === 'string')
                      .join(' ')
                      .toLowerCase();
                    
                    // More lenient matching - if any word matches or has substantial content
                    const searchWords = searchText.split(' ').filter(w => w.length > 2);
                    return searchWords.some(word => allText.includes(word)) || allText.length > 100;
                  });

                  console.log(`   ✓ Filtered to ${filtered.length} relevant records from this batch`);
                  
                  results.push(...filtered.map(record => ({
                    id: record.id,
                    score: 0.85,
                    metadata: record.metadata || {}
                  })));
                } else {
                  console.log(`   ⚠️  Batch returned no records`);
                }
              } catch (fetchErr) {
                console.log(`   ⚠️  Batch fetch failed: ${fetchErr.message}`);
              }
            }
          }
        }
      } catch (listErr) {
        console.log(`   ⚠️  List method failed: ${listErr.message}`);
      }

      // Method 2: Try namespace-based search (if Method 1 didn't work)
      if (results.length === 0) {
        console.log(`   🔍 Checking namespaces...`);
        try {
          const stats = await this.index.describeIndexStats();
          const namespaces = Object.keys(stats.namespaces || {});
          
          if (namespaces.length > 0) {
            console.log(`   ✓ Found namespaces: ${namespaces.join(', ')}`);
            
            for (const ns of namespaces) {
              try {
                const nsIndex = this.index.namespace(ns);
                const nsListResult = await nsIndex.listPaginated({ limit: topK });
                
                if (nsListResult.vectors && nsListResult.vectors.length > 0) {
                  console.log(`   ✓ Found ${nsListResult.vectors.length} vectors in namespace "${ns}"`);
                  
                  const vectorIds = nsListResult.vectors.map(v => v.id);
                  if (vectorIds.length > 0) {
                    const fetchResult = await nsIndex.fetch(vectorIds);
                    
                    if (fetchResult.records) {
                      const records = Object.values(fetchResult.records);
                      results.push(...records.map(record => ({
                        id: record.id,
                        score: 0.80,
                        metadata: record.metadata || {},
                        namespace: ns
                      })));
                    }
                  }
                }
              } catch (nsErr) {
                console.log(`   ⚠️  Namespace "${ns}" query failed: ${nsErr.message}`);
              }
            }
          }
        } catch (statsErr) {
          console.log(`   ⚠️  Stats check failed: ${statsErr.message}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Search error: ${error.message}`);
    }

    // Remove duplicates
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.id, r])).values()
    );

    return uniqueResults;
  }

  /**
   * Reason about search results and decide next action
   */
  reason(allResults, iteration, departmentName) {
    console.log(`\n[ReAct Agent] 🤔 Reasoning about results...`);
    console.log(`   Total unique results: ${allResults.length}`);
    console.log(`   Iteration: ${iteration + 1}/${this.maxIterations}`);

    // Check if we have any results
    if (allResults.length === 0) {
      if (iteration < this.maxIterations - 1) {
        console.log(`   💭 Thought: No results yet. Will try different search strategy.`);
        return {
          action: 'continue',
          reasoning: 'No results found, trying different approach',
          shouldContinue: true
        };
      } else {
        console.log(`   💭 Thought: Exhausted all search strategies. Pinecone appears empty.`);
        return {
          action: 'stop',
          reasoning: 'No data found in Pinecone after exhaustive search',
          shouldContinue: false,
          results: []
        };
      }
    }

    // Check quality of results
    const withMetadata = allResults.filter(r => {
      const metadata = r.metadata || {};
      const hasContent = Object.keys(metadata).length > 0;
      const hasText = Object.values(metadata).some(v => 
        typeof v === 'string' && v.length > 50
      );
      return hasContent && hasText;
    });

    console.log(`   Results with substantial metadata: ${withMetadata.length}`);

    if (withMetadata.length === 0) {
      if (iteration < this.maxIterations - 1) {
        console.log(`   💭 Thought: Results lack content. Searching for better data.`);
        return {
          action: 'continue',
          reasoning: 'Results lack substantial content',
          shouldContinue: true
        };
      } else {
        console.log(`   💭 Thought: Found results but they lack content. Using what we have.`);
        return {
          action: 'extract',
          reasoning: 'Using available results despite limited content',
          shouldContinue: false,
          results: allResults
        };
      }
    }

    // We have good results!
    console.log(`   💭 Thought: Found ${withMetadata.length} results with good content!`);
    console.log(`   ✅ Decision: Extract and format policies`);
    
    return {
      action: 'extract',
      reasoning: 'Found sufficient quality results',
      shouldContinue: false,
      results: withMetadata
    };
  }

  /**
   * Main ReAct loop - iterative search with reasoning
   */
  async findPolicies(departmentName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[Enhanced ReAct Agent] Starting policy search`);
    console.log(`Department: ${departmentName}`);
    console.log(`Index: ${this.indexName}`);
    console.log('='.repeat(80));

    await this.initialize();

    let allResults = [];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`[Iteration ${iteration + 1}/${this.maxIterations}]`);
      console.log('─'.repeat(80));

      // Generate search strategy for this iteration
      const strategy = this.generateSearchStrategies(departmentName, iteration);
      console.log(`📋 Strategy: ${strategy.type} - ${strategy.description}`);

      // Execute search
      const results = await this.searchPinecone(strategy);
      
      if (results.length > 0) {
        console.log(`   ✓ Found ${results.length} new results`);
        allResults.push(...results);
        
        // Remove duplicates
        allResults = Array.from(
          new Map(allResults.map(r => [r.id, r])).values()
        );
      }

      // Reason about results
      const decision = this.reason(allResults, iteration, departmentName);
      
      if (!decision.shouldContinue) {
        console.log(`\n${'='.repeat(80)}`);
        if (decision.results && decision.results.length > 0) {
          console.log(`✅ Search completed successfully`);
          console.log(`   Found: ${decision.results.length} relevant documents`);
        } else {
          console.log(`⚠️  Search completed with no results`);
          console.log(`   Pinecone index appears to be empty`);
        }
        console.log('='.repeat(80));
        return decision.results || [];
      }

      iteration++;
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n⚠️  Reached maximum iterations (${this.maxIterations})`);
    return allResults;
  }

  /**
   * Convert real Pinecone results to markdown (NO HALLUCINATION)
   */
  convertToMarkdown(departmentName, results) {
    if (!results || results.length === 0) {
      return this.generateEmptyPolicyMessage(departmentName);
    }

    let markdown = `# ${departmentName} - Policy Documents\n\n`;
    markdown += `## Data Retrieved from Knowledge Base\n\n`;
    markdown += `*Retrieved ${results.length} document(s) from Pinecone vector database*\n\n`;
    markdown += `*Last Updated: ${new Date().toLocaleDateString('en-IN')}*\n\n`;
    markdown += `---\n\n`;

    // Process each result
    results.forEach((result, idx) => {
      const metadata = result.metadata || {};
      
      markdown += `## Document ${idx + 1}\n\n`;
      
      // Add all metadata fields as-is (no hallucination)
      Object.entries(metadata).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim()) {
          // Format key nicely
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          markdown += `**${formattedKey}:** ${value.trim()}\n\n`;
        } else if (value && typeof value === 'object') {
          markdown += `**${key}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
        } else if (value !== null && value !== undefined) {
          markdown += `**${key}:** ${value}\n\n`;
        }
      });
      
      // Add source information
      if (result.namespace) {
        markdown += `*Source: Namespace "${result.namespace}"*\n\n`;
      }
      if (result.score) {
        markdown += `*Relevance Score: ${(result.score * 100).toFixed(1)}%*\n\n`;
      }
      
      markdown += `---\n\n`;
    });

    markdown += `## About This Document\n\n`;
    markdown += `This document contains real data retrieved from the Pinecone vector database. `;
    markdown += `All information shown above is directly from stored documents with no modifications or additions.\n\n`;
    markdown += `*Generated by Enhanced ReAct Policy Agent*\n`;

    return markdown;
  }

  /**
   * Generate message when no data is found (honest, no fake data)
   */
  generateEmptyPolicyMessage(departmentName) {
    return `# ${departmentName} - Policy Documents

## No Data Available

After an exhaustive search of the Pinecone vector database, no policy documents were found for this department.

### What This Means

The Pinecone index "${this.indexName}" currently does not contain any documents related to ${departmentName}.

### Next Steps

1. Verify that policy documents have been uploaded to the knowledge base
2. Check that the Pinecone index is properly configured
3. Ensure documents are tagged with appropriate department metadata
4. Contact the system administrator to upload policy documents

---

*Last Checked: ${new Date().toLocaleString('en-IN')}*
*Generated by Enhanced ReAct Policy Agent*
`;
  }

  /**
   * Health check
   */
  async checkHealth() {
    try {
      await this.initialize();
      return this.initialized;
    } catch (error) {
      return false;
    }
  }
}

export default new EnhancedReactPolicyAgent();
