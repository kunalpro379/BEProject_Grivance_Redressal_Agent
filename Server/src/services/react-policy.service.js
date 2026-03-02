import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

/**
 * ReAct Agent for Policy Extraction
 * Uses Reasoning + Acting pattern to iteratively search Pinecone
 * until relevant policy documents are found
 */
class ReactPolicyAgent {
  constructor() {
    // Make Pinecone optional - only initialize if API key is provided
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== 'your-pinecone-api-key-here') {
      try {
        this.pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY,
        });
        this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
        this.enabled = true;
      } catch (error) {
        console.warn('  Pinecone initialization failed:', error.message);
        console.warn('  Policy similarity search will be disabled');
        this.enabled = false;
      }
    } else {
      console.warn('  PINECONE_API_KEY not configured - policy similarity search disabled');
      this.enabled = false;
    }
    this.maxIterations = 10;
    this.minRelevanceScore = 0.5;
  }

  /**
   * Check if Pinecone is available
   */
  isEnabled() {
    return this.enabled === true;
  }

  /**
   * Generate search queries based on department and iteration
   */
  generateSearchQueries(departmentName, iteration) {
    const baseQueries = {
      'Public Works Department': [
        'road construction policy',
        'infrastructure maintenance',
        'public works guidelines',
        'construction standards',
        'road repair procedures'
      ],
      'Water Supply Department': [
        'water supply policy',
        'pipeline maintenance',
        'water quality standards',
        'jal jeevan mission',
        'water distribution'
      ],
      'Water Supply and Sanitation Department': [
        'water supply sanitation policy',
        'water treatment guidelines',
        'sanitation standards',
        'water infrastructure',
        'sewage management'
      ],
      'Sanitation Department': [
        'sanitation policy',
        'waste management',
        'solid waste disposal',
        'cleanliness standards',
        'swachh bharat'
      ],
      'Electrical Department': [
        'street lighting policy',
        'electrical safety',
        'power distribution',
        'LED installation',
        'electrical maintenance'
      ],
      'Health Department': [
        'public health policy',
        'disease prevention',
        'health camp guidelines',
        'vaccination protocols',
        'health standards'
      ],
      'Parks and Gardens': [
        'park maintenance policy',
        'landscaping guidelines',
        'green space regulations',
        'garden development',
        'urban forestry'
      ],
      'Roads Department': [
        'road maintenance policy',
        'highway standards',
        'road construction guidelines',
        'traffic management',
        'road safety'
      ],
      'Garbage Management': [
        'garbage collection policy',
        'waste disposal guidelines',
        'recycling standards',
        'waste segregation',
        'garbage management'
      ],
      'Education Department': [
        'education policy',
        'school guidelines',
        'educational standards',
        'student welfare',
        'education infrastructure'
      ]
    };

    // Get base queries for department
    let queries = baseQueries[departmentName] || [
      `${departmentName} policy`,
      `${departmentName} guidelines`,
      `${departmentName} regulations`,
      `${departmentName} standards`,
      `${departmentName} procedures`
    ];

    // Add iteration-specific variations
    if (iteration > 0) {
      const variations = [
        'government policy',
        'municipal guidelines',
        'department regulations',
        'official standards',
        'administrative procedures',
        'operational guidelines',
        'service delivery standards',
        'quality assurance',
        'compliance requirements',
        'best practices'
      ];
      
      // Add variations based on iteration
      const variationIndex = iteration % variations.length;
      queries = queries.map(q => `${q} ${variations[variationIndex]}`);
    }

    return queries;
  }

  /**
   * Reason about search results and decide next action
   */
  reason(results, iteration, departmentName) {
    console.log(`\n[ReAct Agent] Iteration ${iteration + 1} - Reasoning...`);
    
    if (!results || results.length === 0) {
      console.log(`  Thought: No results found. Need to try different search terms.`);
      return {
        action: 'search',
        reasoning: 'No results found, trying broader search terms',
        shouldContinue: iteration < this.maxIterations - 1
      };
    }

    // Check relevance scores
    const relevantResults = results.filter(r => r.score >= this.minRelevanceScore);
    
    if (relevantResults.length === 0) {
      console.log(`  Thought: Found ${results.length} results but none are relevant (score < ${this.minRelevanceScore})`);
      console.log(`  Action: Try more specific queries`);
      return {
        action: 'search',
        reasoning: 'Results not relevant enough, refining search',
        shouldContinue: iteration < this.maxIterations - 1
      };
    }

    // Check if results contain actual policy content
    const hasContent = relevantResults.some(r => {
      const metadata = r.metadata || {};
      const text = metadata.text || metadata.content || metadata.description || '';
      return text.length > 100; // At least 100 characters
    });

    if (!hasContent) {
      console.log(`  Thought: Found ${relevantResults.length} relevant results but they lack substantial content`);
      console.log(`  Action: Search for more detailed documents`);
      return {
        action: 'search',
        reasoning: 'Results lack substantial content, searching for detailed documents',
        shouldContinue: iteration < this.maxIterations - 1
      };
    }

    console.log(`  Thought: Found ${relevantResults.length} relevant results with good content!`);
    console.log(`  Action: Extract and format policies`);
    return {
      action: 'extract',
      reasoning: 'Found sufficient relevant content',
      shouldContinue: false,
      results: relevantResults
    };
  }

  /**
   * Search Pinecone with a specific query
   */
  async searchPinecone(query, topK = 10) {
    // Check if Pinecone is enabled
    if (!this.isEnabled()) {
      return [];
    }

    try {
      console.log(`  Searching for: "${query}"`);
      
      // Try metadata filter first
      try {
        const results = await this.index.query({
          topK: topK,
          includeMetadata: true,
          filter: {
            $or: [
              { text: { $contains: query.toLowerCase() } },
              { content: { $contains: query.toLowerCase() } },
              { description: { $contains: query.toLowerCase() } },
              { title: { $contains: query.toLowerCase() } }
            ]
          }
        });
        
        if (results.matches && results.matches.length > 0) {
          console.log(`     Found ${results.matches.length} results via metadata filter`);
          return results.matches;
        }
      } catch (filterError) {
        console.log(`     Metadata filter failed, trying namespace search...`);
      }

      // Try namespace search
      try {
        const namespaces = await this.index.describeIndexStats();
        console.log(`    Available namespaces:`, Object.keys(namespaces.namespaces || {}));
        
        // Try each namespace
        for (const ns of Object.keys(namespaces.namespaces || {})) {
          const results = await this.index.namespace(ns).query({
            topK: topK,
            includeMetadata: true
          });
          
          if (results.matches && results.matches.length > 0) {
            console.log(`     Found ${results.matches.length} results in namespace "${ns}"`);
            return results.matches;
          }
        }
      } catch (nsError) {
        console.log(`     Namespace search failed:`, nsError.message);
      }

      // Try listing vectors
      try {
        const listResults = await this.index.listPaginated({ limit: topK });
        if (listResults.vectors && listResults.vectors.length > 0) {
          console.log(`     Found ${listResults.vectors.length} vectors via list`);
          
          // Fetch full vectors with metadata
          const ids = listResults.vectors.map(v => v.id);
          const fetchResults = await this.index.fetch(ids);
          
          if (fetchResults.records) {
            const matches = Object.values(fetchResults.records).map(record => ({
              id: record.id,
              score: 0.8, // Default score for listed vectors
              metadata: record.metadata || {}
            }));
            return matches;
          }
        }
      } catch (listError) {
        console.log(`     List operation failed:`, listError.message);
      }

      return [];
    } catch (error) {
      console.error(`     Search error:`, error.message);
      return [];
    }
  }

  /**
   * Main ReAct loop
   */
  async findPolicies(departmentName) {
    // Check if Pinecone is enabled
    if (!this.isEnabled()) {
      console.warn(`  Pinecone not configured - returning default policy for ${departmentName}`);
      return [];
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[ReAct Agent] Starting policy search for: ${departmentName}`);
    console.log('='.repeat(70));

    let allResults = [];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      console.log(`\n--- Iteration ${iteration + 1}/${this.maxIterations} ---`);

      // Generate queries for this iteration
      const queries = this.generateSearchQueries(departmentName, iteration);
      console.log(`Generated ${queries.length} search queries`);

      // Search with each query
      for (const query of queries) {
        const results = await this.searchPinecone(query);
        if (results.length > 0) {
          allResults.push(...results);
        }
      }

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(allResults.map(r => [r.id, r])).values()
      );

      console.log(`\nTotal unique results so far: ${uniqueResults.length}`);

      // Reason about results
      const decision = this.reason(uniqueResults, iteration, departmentName);
      console.log(`Decision: ${decision.action} - ${decision.reasoning}`);

      if (!decision.shouldContinue) {
        if (decision.action === 'extract') {
          console.log(`\n Success! Found sufficient policy content`);
          return decision.results || uniqueResults;
        }
        break;
      }

      iteration++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n  Completed ${iteration + 1} iterations. Returning best available results.`);
    return allResults;
  }

  /**
   * Convert results to markdown
   */
  convertToMarkdown(departmentName, results) {
    if (!results || results.length === 0) {
      return this.generateDefaultPolicy(departmentName);
    }

    let markdown = `# ${departmentName} - Policies and Guidelines\n\n`;
    markdown += `## Overview\n`;
    markdown += `This document contains the key policies, guidelines, and regulations for ${departmentName}.\n\n`;
    markdown += `*Retrieved from knowledge base on ${new Date().toLocaleDateString('en-IN')}*\n\n`;
    markdown += `---\n\n`;

    // Group by category
    const categorized = {};
    
    results.forEach((result, idx) => {
      const metadata = result.metadata || {};
      const category = metadata.category || metadata.type || metadata.section || 'General Policies';
      
      if (!categorized[category]) {
        categorized[category] = [];
      }
      
      const text = metadata.text || metadata.content || metadata.description || '';
      const title = metadata.title || metadata.name || `Policy ${idx + 1}`;
      const source = metadata.source || metadata.document_name || metadata.file_name || 'Internal Document';
      
      if (text.trim()) {
        categorized[category].push({
          title,
          text: text.trim(),
          source,
          score: result.score || 0
        });
      }
    });

    // Add categorized content
    Object.keys(categorized).sort().forEach(category => {
      markdown += `## ${category}\n\n`;
      
      categorized[category]
        .sort((a, b) => b.score - a.score) // Sort by relevance
        .forEach((item, idx) => {
          markdown += `### ${item.title}\n\n`;
          
          // Format text into paragraphs
          const paragraphs = item.text.split('\n').filter(p => p.trim());
          paragraphs.forEach(para => {
            markdown += `${para.trim()}\n\n`;
          });
          
          markdown += `*Source: ${item.source}* | *Relevance: ${(item.score * 100).toFixed(1)}%*\n\n`;
          markdown += `---\n\n`;
        });
    });

    // Add standard sections
    markdown += `## Compliance and Monitoring\n\n`;
    markdown += `- All policies must be followed strictly\n`;
    markdown += `- Regular audits will be conducted\n`;
    markdown += `- Non-compliance may result in disciplinary action\n`;
    markdown += `- Grievances related to policy violations should be reported immediately\n\n`;
    
    markdown += `## Updates and Amendments\n\n`;
    markdown += `This policy document is subject to periodic review and updates. `;
    markdown += `All department staff must stay informed about the latest policy changes.\n\n`;
    
    markdown += `---\n\n`;
    markdown += `*Document generated by ReAct Policy Agent*\n`;
    markdown += `*Last Updated: ${new Date().toLocaleDateString('en-IN')}*\n`;

    return markdown;
  }

  /**
   * Generate default policy when no data found
   */
  generateDefaultPolicy(departmentName) {
    return `# ${departmentName} - Policies and Guidelines

## Overview
This document outlines the standard operating procedures and guidelines for ${departmentName}.

## Core Responsibilities
- Efficient handling of citizen grievances
- Timely completion of assigned tasks
- Maintaining quality standards in all operations
- Regular reporting and documentation
- Coordination with other departments

## Service Delivery Standards
- Response time: Within 24 hours for urgent matters
- Resolution time: As per SLA guidelines
- Quality assurance: Regular inspections and audits
- Citizen satisfaction: Minimum 80% satisfaction rate

## Operational Guidelines
- Follow all government regulations and circulars
- Maintain proper documentation for all activities
- Use approved vendors and contractors
- Ensure safety protocols are followed
- Regular training and skill development

## Grievance Handling
- Acknowledge all grievances within 24 hours
- Assign to appropriate officer/team
- Regular status updates to citizens
- Escalate unresolved issues as per protocol
- Maintain grievance records

## Quality Control
- Regular inspections of completed work
- Citizen feedback collection
- Performance monitoring and reporting
- Continuous improvement initiatives

## Compliance and Monitoring
- All policies must be followed strictly
- Regular audits will be conducted
- Non-compliance may result in disciplinary action
- Grievances related to policy violations should be reported immediately

## Contact Information
For detailed policies, please contact the department head or refer to official government circulars.

---

*Last Updated: ${new Date().toLocaleDateString('en-IN')}*
`;
  }
}

export default new ReactPolicyAgent();
