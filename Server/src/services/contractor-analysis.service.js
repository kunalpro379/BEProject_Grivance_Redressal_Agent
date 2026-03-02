import pool from '../config/database.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ContractorAnalysisService {
  /**
   * Analyze contractor documents and profile using Gemini AI
   */
  async analyzeContractor(contractorId) {
    try {
      console.log(`🔍 Analyzing contractor: ${contractorId}`);

      // Fetch contractor data
      const contractor = await this.getContractorData(contractorId);
      
      if (!contractor) {
        throw new Error('Contractor not found');
      }

      // Extract text from documents if available
      const documentTexts = await this.extractDocumentTexts(contractor.document_urls || []);

      // Prepare data for AI analysis
      const analysisInput = {
        company_name: contractor.company_name,
        license_number: contractor.license_number,
        gst: contractor.gst,
        category: contractor.category,
        experience_years: contractor.experience_years,
        specializations: contractor.specializations || [],
        past_projects: contractor.past_projects || [],
        certifications: contractor.certifications || [],
        document_texts: documentTexts
      };

      // Generate AI analysis
      const aiAnalysis = await this.generateAIAnalysis(analysisInput);

      // Calculate overall score
      const analysisScore = this.calculateScore(aiAnalysis);

      // Save analysis to database
      await this.saveAnalysis(contractorId, aiAnalysis, analysisScore);

      console.log(`✅ Contractor analysis complete. Score: ${analysisScore}/100`);

      return {
        contractor_id: contractorId,
        analysis: aiAnalysis,
        score: analysisScore
      };

    } catch (error) {
      console.error('❌ Error analyzing contractor:', error);
      throw error;
    }
  }

  /**
   * Get contractor data from database
   */
  async getContractorData(contractorId) {
    const result = await pool.query(
      'SELECT * FROM contractors WHERE id = $1',
      [contractorId]
    );
    return result.rows[0];
  }

  /**
   * Extract text from document URLs (placeholder - would need OCR/PDF parsing)
   */
  async extractDocumentTexts(documentUrls) {
    // For now, return document URLs as metadata
    // In production, you'd use OCR or PDF parsing services
    return documentUrls.map(url => ({
      url,
      type: this.getDocumentType(url),
      note: 'Document available for review'
    }));
  }

  /**
   * Determine document type from URL
   */
  getDocumentType(url) {
    if (url.includes('license')) return 'license';
    if (url.includes('gst')) return 'gst_certificate';
    if (url.includes('certificate')) return 'certification';
    if (url.includes('project')) return 'project_proof';
    return 'other';
  }

  /**
   * Generate AI analysis using Gemini
   */
  async generateAIAnalysis(contractorData) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

      const prompt = `You are an expert contractor evaluation analyst for government projects. Analyze the following contractor profile and provide a comprehensive assessment.

CONTRACTOR PROFILE:
Company Name: ${contractorData.company_name}
License Number: ${contractorData.license_number}
GST: ${contractorData.gst || 'Not provided'}
Category: ${contractorData.category}
Experience: ${contractorData.experience_years || 'Not specified'} years
Specializations: ${contractorData.specializations.join(', ') || 'None specified'}
Past Projects: ${JSON.stringify(contractorData.past_projects, null, 2)}
Certifications: ${contractorData.certifications.join(', ') || 'None'}
Documents: ${contractorData.document_texts.length} documents submitted

Provide a detailed analysis in JSON format with the following structure:
{
  "overall_assessment": "Brief 2-3 sentence summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "experience_evaluation": {
    "score": 0-100,
    "comments": "Detailed evaluation of experience"
  },
  "documentation_quality": {
    "score": 0-100,
    "comments": "Assessment of submitted documents"
  },
  "specialization_match": {
    "score": 0-100,
    "comments": "How well specializations match government needs"
  },
  "reliability_indicators": {
    "score": 0-100,
    "factors": ["factor1", "factor2"]
  },
  "risk_assessment": {
    "level": "low|medium|high",
    "concerns": ["concern1", "concern2"]
  },
  "recommendations": {
    "suitable_for": ["project_type1", "project_type2"],
    "not_suitable_for": ["project_type1"],
    "conditions": ["condition1", "condition2"]
  },
  "verification_checklist": {
    "license_valid": true|false,
    "gst_registered": true|false,
    "experience_verified": true|false,
    "documents_complete": true|false
  },
  "final_recommendation": "hire|conditional_hire|reject",
  "priority_ranking": "A|B|C|D"
}

Respond with ONLY valid JSON, no markdown formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up response
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const analysis = JSON.parse(text);
      return analysis;

    } catch (error) {
      console.error('Error generating AI analysis:', error);
      
      // Return fallback analysis
      return {
        overall_assessment: 'Analysis pending - manual review required',
        strengths: ['Registered contractor'],
        weaknesses: ['Insufficient data for automated analysis'],
        experience_evaluation: { score: 50, comments: 'Requires manual verification' },
        documentation_quality: { score: 50, comments: 'Documents submitted' },
        specialization_match: { score: 50, comments: 'Category: ' + contractorData.category },
        reliability_indicators: { score: 50, factors: ['New registration'] },
        risk_assessment: { level: 'medium', concerns: ['Limited automated analysis'] },
        recommendations: {
          suitable_for: [contractorData.category],
          not_suitable_for: [],
          conditions: ['Manual verification required']
        },
        verification_checklist: {
          license_valid: !!contractorData.license_number,
          gst_registered: !!contractorData.gst,
          experience_verified: false,
          documents_complete: (contractorData.document_texts?.length || 0) > 0
        },
        final_recommendation: 'conditional_hire',
        priority_ranking: 'C'
      };
    }
  }

  /**
   * Calculate overall score from AI analysis
   */
  calculateScore(analysis) {
    try {
      const weights = {
        experience_evaluation: 0.25,
        documentation_quality: 0.20,
        specialization_match: 0.25,
        reliability_indicators: 0.30
      };

      let totalScore = 0;
      
      totalScore += (analysis.experience_evaluation?.score || 50) * weights.experience_evaluation;
      totalScore += (analysis.documentation_quality?.score || 50) * weights.documentation_quality;
      totalScore += (analysis.specialization_match?.score || 50) * weights.specialization_match;
      totalScore += (analysis.reliability_indicators?.score || 50) * weights.reliability_indicators;

      // Apply risk penalty
      if (analysis.risk_assessment?.level === 'high') {
        totalScore *= 0.8;
      } else if (analysis.risk_assessment?.level === 'medium') {
        totalScore *= 0.9;
      }

      return Math.round(totalScore * 100) / 100;

    } catch (error) {
      console.error('Error calculating score:', error);
      return 50; // Default score
    }
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(contractorId, analysis, score) {
    await pool.query(
      `UPDATE contractors 
       SET ai_analysis = $1, 
           analysis_score = $2, 
           analyzed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(analysis), score, contractorId]
    );
  }

  /**
   * Get all contractors with analysis for a department
   */
  async getContractorsForDepartment(departmentId, category = null) {
    let query = `
      SELECT 
        c.*,
        u.full_name,
        u.phone,
        u.email
      FROM contractors c
      LEFT JOIN users u ON c.user_id = u.telegram_id::text
      WHERE c.verification_status = 'verified'
    `;

    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND c.category = $${params.length}`;
    }

    query += ` ORDER BY c.analysis_score DESC NULLS LAST, c.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Analyze all pending contractors
   */
  async analyzeAllPending() {
    try {
      const result = await pool.query(
        `SELECT id FROM contractors 
         WHERE verification_status = 'pending_review' 
         AND ai_analysis IS NULL`
      );

      console.log(`📊 Found ${result.rows.length} contractors to analyze`);

      const analyses = [];
      for (const row of result.rows) {
        try {
          const analysis = await this.analyzeContractor(row.id);
          analyses.push(analysis);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to analyze contractor ${row.id}:`, error.message);
        }
      }

      return analyses;

    } catch (error) {
      console.error('Error analyzing pending contractors:', error);
      throw error;
    }
  }

  /**
   * Compare contractors for selection
   */
  async compareContractors(contractorIds) {
    const contractors = await Promise.all(
      contractorIds.map(id => this.getContractorData(id))
    );

    return contractors
      .filter(c => c)
      .sort((a, b) => (b.analysis_score || 0) - (a.analysis_score || 0))
      .map(c => ({
        id: c.id,
        company_name: c.company_name,
        score: c.analysis_score,
        recommendation: c.ai_analysis?.final_recommendation,
        priority: c.ai_analysis?.priority_ranking,
        strengths: c.ai_analysis?.strengths || [],
        weaknesses: c.ai_analysis?.weaknesses || []
      }));
  }
}

export default new ContractorAnalysisService();
