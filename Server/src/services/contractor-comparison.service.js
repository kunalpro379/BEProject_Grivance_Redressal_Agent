import pool from '../config/database.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ContractorComparisonService {
  /**
   * Generate comprehensive comparison report for all contractors
   */
  async generateComparisonReport(departmentId = null, category = null) {
    try {
      console.log('📊 Generating contractor comparison report...');

      // Fetch all contractors with analysis
      const contractors = await this.getContractorsWithAnalysis(departmentId, category);

      if (contractors.length === 0) {
        return {
          success: false,
          message: 'No contractors found for comparison'
        };
      }

      // Generate AI-powered comparative analysis
      const comparison = await this.generateAIComparison(contractors);

      // Calculate rankings
      const rankings = this.calculateRankings(contractors);

      // Generate recommendations
      const recommendations = this.generateRecommendations(contractors, rankings);

      return {
        success: true,
        data: {
          totalContractors: contractors.length,
          contractors: contractors,
          comparison: comparison,
          rankings: rankings,
          recommendations: recommendations,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generating comparison report:', error);
      throw error;
    }
  }

  /**
   * Get contractors with full analysis data
   */
  async getContractorsWithAnalysis(departmentId = null, category = null) {
    let query = `
      SELECT 
        c.*,
        u.full_name as contact_name,
        u.phone as contact_phone,
        u.email as contact_email
      FROM contractors c
      LEFT JOIN users u ON c.user_id = u.telegram_id::text
      WHERE c.verification_status = 'verified'
        AND c.ai_analysis IS NOT NULL
    `;

    const params = [];

    if (category) {
      params.push(category);
      query += ` AND c.category = $${params.length}`;
    }

    query += ` ORDER BY c.analysis_score DESC NULLS LAST`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Generate AI-powered comparative analysis
   */
  async generateAIComparison(contractors) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

      // Prepare contractor summaries for AI
      const contractorSummaries = contractors.map(c => ({
        company_name: c.company_name,
        score: c.analysis_score,
        experience_years: c.experience_years,
        specializations: c.specializations,
        certifications: c.certifications,
        recommendation: c.ai_analysis?.final_recommendation,
        priority: c.ai_analysis?.priority_ranking,
        strengths: c.ai_analysis?.strengths || [],
        weaknesses: c.ai_analysis?.weaknesses || []
      }));

      const prompt = `You are an expert procurement analyst. Compare these contractors and provide insights for selection.

CONTRACTORS:
${JSON.stringify(contractorSummaries, null, 2)}

Provide a comprehensive comparison in JSON format:
{
  "executive_summary": "2-3 sentence overview of the contractor pool",
  "top_performers": [
    {
      "company_name": "...",
      "why": "Reason they stand out"
    }
  ],
  "category_leaders": {
    "experience": "Company name and reason",
    "reliability": "Company name and reason",
    "specialization": "Company name and reason",
    "value_for_money": "Company name and reason"
  },
  "risk_analysis": {
    "low_risk_contractors": ["company1", "company2"],
    "medium_risk_contractors": ["company3"],
    "high_risk_contractors": []
  },
  "selection_criteria": {
    "for_urgent_projects": ["company1", "company2"],
    "for_complex_projects": ["company1"],
    "for_budget_projects": ["company2", "company3"],
    "for_quality_critical": ["company1"]
  },
  "key_insights": [
    "insight1",
    "insight2",
    "insight3"
  ],
  "recommendations": [
    "recommendation1",
    "recommendation2"
  ]
}

Respond with ONLY valid JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up response
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      return JSON.parse(text);

    } catch (error) {
      console.error('Error generating AI comparison:', error);
      
      // Return fallback comparison
      return {
        executive_summary: 'Comparison analysis pending',
        top_performers: contractors.slice(0, 3).map(c => ({
          company_name: c.company_name,
          why: `Score: ${c.analysis_score}/100`
        })),
        category_leaders: {},
        risk_analysis: {
          low_risk_contractors: [],
          medium_risk_contractors: [],
          high_risk_contractors: []
        },
        selection_criteria: {},
        key_insights: ['Manual review recommended'],
        recommendations: ['Review individual contractor profiles']
      };
    }
  }

  /**
   * Calculate rankings across different criteria
   */
  calculateRankings(contractors) {
    return {
      by_score: contractors
        .sort((a, b) => (b.analysis_score || 0) - (a.analysis_score || 0))
        .slice(0, 10)
        .map((c, index) => ({
          rank: index + 1,
          company_name: c.company_name,
          score: c.analysis_score,
          id: c.id
        })),
      
      by_experience: contractors
        .filter(c => c.experience_years)
        .sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0))
        .slice(0, 5)
        .map((c, index) => ({
          rank: index + 1,
          company_name: c.company_name,
          experience_years: c.experience_years,
          id: c.id
        })),
      
      by_priority: contractors
        .filter(c => c.ai_analysis?.priority_ranking)
        .sort((a, b) => {
          const priorityOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
          return (priorityOrder[a.ai_analysis.priority_ranking] || 5) - 
                 (priorityOrder[b.ai_analysis.priority_ranking] || 5);
        })
        .slice(0, 10)
        .map((c, index) => ({
          rank: index + 1,
          company_name: c.company_name,
          priority: c.ai_analysis.priority_ranking,
          score: c.analysis_score,
          id: c.id
        }))
    };
  }

  /**
   * Generate selection recommendations
   */
  generateRecommendations(contractors, rankings) {
    const recommendations = [];

    // Top scorer recommendation
    if (rankings.by_score.length > 0) {
      const top = rankings.by_score[0];
      recommendations.push({
        type: 'top_performer',
        title: 'Highest Rated Contractor',
        contractor: top.company_name,
        score: top.score,
        reason: 'Best overall performance across all evaluation criteria'
      });
    }

    // Most experienced recommendation
    if (rankings.by_experience.length > 0) {
      const experienced = rankings.by_experience[0];
      recommendations.push({
        type: 'most_experienced',
        title: 'Most Experienced',
        contractor: experienced.company_name,
        experience: experienced.experience_years,
        reason: 'Extensive industry experience for complex projects'
      });
    }

    // Priority A contractors
    const priorityA = contractors.filter(c => c.ai_analysis?.priority_ranking === 'A');
    if (priorityA.length > 0) {
      recommendations.push({
        type: 'priority_a',
        title: 'Priority A Contractors',
        contractors: priorityA.map(c => c.company_name),
        count: priorityA.length,
        reason: 'Highest priority contractors suitable for critical projects'
      });
    }

    // Low risk contractors
    const lowRisk = contractors.filter(c => 
      c.ai_analysis?.risk_assessment?.level === 'low'
    );
    if (lowRisk.length > 0) {
      recommendations.push({
        type: 'low_risk',
        title: 'Low Risk Options',
        contractors: lowRisk.slice(0, 5).map(c => c.company_name),
        count: lowRisk.length,
        reason: 'Minimal risk for reliable project execution'
      });
    }

    return recommendations;
  }

  /**
   * Get detailed comparison for specific contractors
   */
  async compareSpecificContractors(contractorIds) {
    try {
      const placeholders = contractorIds.map((_, i) => `$${i + 1}`).join(',');
      
      const result = await pool.query(
        `SELECT 
          c.*,
          u.full_name as contact_name,
          u.phone as contact_phone,
          u.email as contact_email
        FROM contractors c
        LEFT JOIN users u ON c.user_id = u.telegram_id::text
        WHERE c.id IN (${placeholders})
        ORDER BY c.analysis_score DESC NULLS LAST`,
        contractorIds
      );

      const contractors = result.rows;

      // Generate side-by-side comparison
      const comparison = {
        contractors: contractors.map(c => ({
          id: c.id,
          company_name: c.company_name,
          score: c.analysis_score,
          experience: c.experience_years,
          specializations: c.specializations,
          certifications: c.certifications,
          recommendation: c.ai_analysis?.final_recommendation,
          priority: c.ai_analysis?.priority_ranking,
          strengths: c.ai_analysis?.strengths || [],
          weaknesses: c.ai_analysis?.weaknesses || [],
          risk_level: c.ai_analysis?.risk_assessment?.level
        })),
        winner: contractors[0]?.company_name,
        summary: `Based on analysis scores, ${contractors[0]?.company_name} ranks highest with ${contractors[0]?.analysis_score}/100`
      };

      return comparison;

    } catch (error) {
      console.error('Error comparing specific contractors:', error);
      throw error;
    }
  }
}

export default new ContractorComparisonService();
