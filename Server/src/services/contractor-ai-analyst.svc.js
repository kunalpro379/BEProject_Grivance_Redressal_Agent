import pool from '../config/db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import deepseekAI from './deepseek-ai.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ContractorAIAnalyst {
  /**
   * Generate comprehensive contractor analysis with recommendations
   */
  async analyzeContractorsForProject(projectType, budget, urgency = 'normal') {
    try {
      console.log(` Analyzing contractors for project: ${projectType}`);

      // Fetch all verified contractors
      const contractors = await this.getAllContractors();

      if (contractors.length === 0) {
        return {
          success: false,
          message: 'No contractors available for analysis'
        };
      }

      // Generate comprehensive AI analysis
      const analysis = await this.generateComprehensiveAnalysis(
        contractors,
        projectType,
        budget,
        urgency
      );

      return {
        success: true,
        data: {
          projectType,
          budget,
          urgency,
          totalContractors: contractors.length,
          analysis,
          contractors: contractors.map(c => this.formatContractorSummary(c)),
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error analyzing contractors:', error);
      throw error;
    }
  }

  /**
   * Get all contractors with full details
   */
  async getAllContractors() {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT pr.id) as total_projects,
        COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.id END) as completed_projects,
        AVG(CASE WHEN pr.status = 'completed' THEN pr.quality_rating END) as avg_rating,
        SUM(CASE WHEN pr.status = 'active' THEN 1 ELSE 0 END) as active_projects
      FROM contractors c
      LEFT JOIN project_reports pr ON pr.contractor_id = c.id
      WHERE c.verification_status = 'verified'
      GROUP BY c.id
      ORDER BY c.analysis_score DESC NULLS LAST, c.created_at DESC
    `);

    return result.rows;
  }

  /**
   * Generate comprehensive AI analysis using Gemini
   */
  async generateComprehensiveAnalysis(contractors, projectType, budget, urgency) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const contractorData = contractors.map(c => ({
        id: c.id,
        company: c.company_name,
        license: c.license_number,
        category: c.category,
        experience: c.experience_years || 0,
        specializations: c.specializations || [],
        score: c.analysis_score || 0,
        totalProjects: parseInt(c.total_projects) || 0,
        completedProjects: parseInt(c.completed_projects) || 0,
        activeProjects: parseInt(c.active_projects) || 0,
        avgRating: parseFloat(c.avg_rating) || 0,
        successRate: c.total_projects > 0 
          ? ((c.completed_projects / c.total_projects) * 100).toFixed(1)
          : 0,
        resources: {
          workers: c.workers_count || 0,
          vehicles: c.vehicles_count || 0,
          equipment: c.equipment_count || 0
        },
        contractValue: c.contract_value || 0,
        riskLevel: c.ai_analysis?.risk_assessment?.level || 'unknown',
        strengths: c.ai_analysis?.strengths || [],
        weaknesses: c.ai_analysis?.weaknesses || []
      }));

      const prompt = `You are an expert government procurement analyst. Analyze these contractors for a project and provide detailed recommendations.

PROJECT REQUIREMENTS:
- Type: ${projectType}
- Budget: ₹${budget}
- Urgency: ${urgency}

AVAILABLE CONTRACTORS:
${JSON.stringify(contractorData, null, 2)}

Provide a comprehensive analysis in JSON format:
{
  "topRecommendation": {
    "contractorId": "id",
    "company": "name",
    "score": 0-100,
    "whyBest": "Detailed 3-4 sentence explanation of why this contractor is the best choice",
    "keyStrengths": ["strength1", "strength2", "strength3"],
    "potentialConcerns": ["concern1", "concern2"],
    "estimatedSuccess": "95%",
    "recommendedFor": "Specific project aspects they excel at"
  },
  "alternativeOptions": [
    {
      "contractorId": "id",
      "company": "name",
      "score": 0-100,
      "reason": "Why they're a good alternative",
      "bestFor": "What scenarios they're ideal for"
    }
  ],
  "detailedComparison": {
    "byExperience": {
      "leader": "company name",
      "analysis": "Why they lead in experience"
    },
    "byReliability": {
      "leader": "company name",
      "analysis": "Why they're most reliable"
    },
    "byResources": {
      "leader": "company name",
      "analysis": "Why they have best resources"
    },
    "byValue": {
      "leader": "company name",
      "analysis": "Why they offer best value"
    }
  },
  "riskAnalysis": {
    "lowestRisk": ["company1", "company2"],
    "moderateRisk": ["company3"],
    "concerns": ["Overall risk concern1", "concern2"]
  },
  "performanceMetrics": {
    "highestSuccessRate": {
      "company": "name",
      "rate": "96.8%",
      "projects": 32
    },
    "mostExperienced": {
      "company": "name",
      "years": 15,
      "projects": 45
    },
    "bestRated": {
      "company": "name",
      "rating": 4.8,
      "reviews": 28
    }
  },
  "budgetFit": {
    "withinBudget": ["company1", "company2"],
    "slightlyOver": ["company3"],
    "analysis": "Budget compatibility analysis"
  },
  "timelineAssessment": {
    "fastestDelivery": {
      "company": "name",
      "avgDays": 27,
      "reason": "Why they're fastest"
    },
    "urgencyMatch": ["companies suitable for urgent projects"]
  },
  "keyInsights": [
    "Critical insight 1 about the contractor pool",
    "Critical insight 2 about selection criteria",
    "Critical insight 3 about project success factors"
  ],
  "finalRecommendation": "Detailed 4-5 sentence recommendation on which contractor to select and why, including specific action items",
  "selectionCriteria": {
    "mustHave": ["criteria1", "criteria2"],
    "niceToHave": ["criteria3", "criteria4"],
    "dealBreakers": ["criteria5"]
  }
}

Be specific, data-driven, and provide actionable insights. Respond with ONLY valid JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up response
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      return JSON.parse(text);

    } catch (error) {
      console.error('Error generating comprehensive analysis:', error);
      
      // Fallback to basic analysis
      return this.generateBasicAnalysis(contractors, projectType, budget);
    }
  }

  /**
   * Generate basic analysis as fallback
   */
  generateBasicAnalysis(contractors, projectType, budget) {
    const sorted = contractors.sort((a, b) => 
      (b.analysis_score || 0) - (a.analysis_score || 0)
    );

    const top = sorted[0];

    return {
      topRecommendation: {
        contractorId: top.id,
        company: top.company_name,
        score: top.analysis_score || 0,
        whyBest: `Highest rated contractor with score of ${top.analysis_score}/100. Has completed ${top.completed_projects} projects with ${top.successRate}% success rate.`,
        keyStrengths: top.ai_analysis?.strengths || ['Verified contractor', 'Good track record'],
        potentialConcerns: top.ai_analysis?.weaknesses || ['Standard monitoring required'],
        estimatedSuccess: `${top.successRate || 90}%`,
        recommendedFor: projectType
      },
      alternativeOptions: sorted.slice(1, 4).map(c => ({
        contractorId: c.id,
        company: c.company_name,
        score: c.analysis_score || 0,
        reason: `Score: ${c.analysis_score}/100, ${c.completed_projects} completed projects`,
        bestFor: c.category
      })),
      keyInsights: [
        `${contractors.length} verified contractors available`,
        `Top contractor has ${top.successRate}% success rate`,
        `Average experience: ${Math.round(contractors.reduce((sum, c) => sum + (c.experience_years || 0), 0) / contractors.length)} years`
      ],
      finalRecommendation: `Recommend ${top.company_name} based on highest overall score and proven track record.`
    };
  }

  /**
   * Format contractor summary for display
   */
  formatContractorSummary(contractor) {
    const successRate = contractor.total_projects > 0
      ? ((contractor.completed_projects / contractor.total_projects) * 100).toFixed(1)
      : 0;

    return {
      id: contractor.id,
      company: contractor.company_name,
      license: contractor.license_number,
      category: contractor.category,
      score: contractor.analysis_score || 0,
      performance: {
        totalProjects: parseInt(contractor.total_projects) || 0,
        completed: parseInt(contractor.completed_projects) || 0,
        active: parseInt(contractor.active_projects) || 0,
        successRate: `${successRate}%`,
        avgRating: parseFloat(contractor.avg_rating) || 0
      },
      resources: {
        workers: contractor.workers_count || 0,
        vehicles: contractor.vehicles_count || 0,
        equipment: contractor.equipment_count || 0
      },
      experience: contractor.experience_years || 0,
      specializations: contractor.specializations || [],
      contractValue: contractor.contract_value || 0,
      riskLevel: contractor.ai_analysis?.risk_assessment?.level || 'unknown',
      recommendation: contractor.ai_analysis?.final_recommendation || 'pending',
      priority: contractor.ai_analysis?.priority_ranking || 'C'
    };
  }

  /**
   * Generate Telegram-friendly analysis message
   */
  async generateTelegramAnalysis(projectType, budget, urgency = 'normal') {
    try {
      const result = await this.analyzeContractorsForProject(projectType, budget, urgency);

      if (!result.success) {
        return result.message;
      }

      const { analysis, contractors, totalContractors } = result.data;
      const top = analysis.topRecommendation;

      let message = `📊 *CONTRACTOR ANALYSIS REPORT*\n\n`;
      message += `🎯 *Project Type:* ${projectType}\n`;
      message += `💰 *Budget:* ₹${budget}\n`;
      message += `⏱️ *Urgency:* ${urgency}\n`;
      message += `👥 *Total Contractors:* ${totalContractors}\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🏆 *TOP RECOMMENDATION*\n\n`;
      message += `*${top.company}*\n`;
      message += `📈 Score: ${top.score}/100\n`;
      message += ` Success Rate: ${top.estimatedSuccess}\n\n`;

      message += `*Why This Contractor?*\n${top.whyBest}\n\n`;

      message += `*Key Strengths:*\n`;
      top.keyStrengths.forEach((s, i) => {
        message += `${i + 1}. ${s}\n`;
      });

      if (top.potentialConcerns && top.potentialConcerns.length > 0) {
        message += `\n⚠️ *Points to Monitor:*\n`;
        top.potentialConcerns.forEach((c, i) => {
          message += `${i + 1}. ${c}\n`;
        });
      }

      message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (analysis.alternativeOptions && analysis.alternativeOptions.length > 0) {
        message += `🔄 *ALTERNATIVE OPTIONS*\n\n`;
        analysis.alternativeOptions.slice(0, 3).forEach((alt, i) => {
          message += `${i + 1}. *${alt.company}*\n`;
          message += `   Score: ${alt.score}/100\n`;
          message += `   ${alt.reason}\n\n`;
        });
      }

      if (analysis.performanceMetrics) {
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `📊 *PERFORMANCE LEADERS*\n\n`;

        if (analysis.performanceMetrics.highestSuccessRate) {
          const hsr = analysis.performanceMetrics.highestSuccessRate;
          message += `🎯 *Best Success Rate:* ${hsr.company}\n`;
          message += `   ${hsr.rate} (${hsr.projects} projects)\n\n`;
        }

        if (analysis.performanceMetrics.mostExperienced) {
          const me = analysis.performanceMetrics.mostExperienced;
          message += `⭐ *Most Experienced:* ${me.company}\n`;
          message += `   ${me.years} years (${me.projects} projects)\n\n`;
        }
      }

      if (analysis.keyInsights && analysis.keyInsights.length > 0) {
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `💡 *KEY INSIGHTS*\n\n`;
        analysis.keyInsights.forEach((insight, i) => {
          message += `${i + 1}. ${insight}\n`;
        });
      }

      message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `📝 *FINAL RECOMMENDATION*\n\n`;
      message += `${analysis.finalRecommendation}\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `📅 Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;

      return message;

    } catch (error) {
      console.error('Error generating Telegram analysis:', error);
      return '❌ Error generating analysis. Please try again.';
    }
  }

  /**
   * Delete contractor
   */
  async deleteContractor(contractorId) {
    try {
      // Check if contractor has active projects
      const activeCheck = await pool.query(
        `SELECT COUNT(*) as count FROM project_reports 
         WHERE contractor_id = $1 AND status = 'active'`,
        [contractorId]
      );

      if (parseInt(activeCheck.rows[0].count) > 0) {
        return {
          success: false,
          message: 'Cannot delete contractor with active projects'
        };
      }

      // Delete contractor
      await pool.query('DELETE FROM contractors WHERE id = $1', [contractorId]);

      return {
        success: true,
        message: 'Contractor deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting contractor:', error);
      throw error;
    }
  }
}

export default new ContractorAIAnalyst();
