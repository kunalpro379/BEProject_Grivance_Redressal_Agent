import axios from 'axios';
import pool from '../config/db.js';

class CommentsAnalysisService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  /**
   * Analyze all comments for a specific grievance
   */
  async analyzeGrievanceComments(grievanceId) {
    try {
      console.log(` Analyzing comments for grievance: ${grievanceId}`);

      // Fetch grievance details
      const grievanceResult = await pool.query(
        `SELECT g.*, u.full_name as citizen_name
         FROM usergrievance g
         LEFT JOIN users u ON u.id = g.user_id
         WHERE g.id = $1`,
        [grievanceId]
      );

      if (grievanceResult.rows.length === 0) {
        throw new Error('Grievance not found');
      }

      const grievance = grievanceResult.rows[0];

      // Fetch all comments for this grievance
      const commentsResult = await pool.query(
        `SELECT 
          gc.*,
          u.full_name as commenter_name,
          u.role as commenter_role,
          EXTRACT(EPOCH FROM (gc.created_at - LAG(gc.created_at) OVER (ORDER BY gc.created_at))) / 3600 as response_time_hours
         FROM grievancecomments gc
         LEFT JOIN users u ON u.id = gc.user_id
         WHERE gc.grievance_id = $1
         ORDER BY gc.created_at ASC`,
        [grievanceId]
      );

      const comments = commentsResult.rows;

      if (comments.length === 0) {
        return {
          success: false,
          message: 'No comments found for this grievance'
        };
      }

      // Calculate basic metrics
      const totalComments = comments.length;
      const citizenComments = comments.filter(c => 
        c.commenter_role === 'citizen' || c.commenter_role === 'user'
      ).length;
      const officerComments = comments.filter(c => 
        c.commenter_role === 'department_officer' || 
        c.commenter_role === 'department_head' ||
        c.commenter_role === 'field_worker'
      ).length;
      const internalComments = comments.filter(c => c.is_internal === true).length;

      // Calculate average response time (excluding first comment)
      const responseTimes = comments
        .filter(c => c.response_time_hours !== null)
        .map(c => parseFloat(c.response_time_hours));
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Prepare data for AI analysis
      const commentsForAI = comments.map((c, idx) => ({
        index: idx + 1,
        timestamp: c.created_at,
        commenter: c.commenter_name || 'Unknown',
        role: c.commenter_role || 'unknown',
        isInternal: c.is_internal,
        comment: c.comment,
        responseTimeHours: c.response_time_hours
      }));

      // Call DeepSeek AI for analysis
      const aiAnalysis = await this.performAIAnalysis(grievance, commentsForAI);

      // Store analysis in database
      const analysisResult = await pool.query(
        `INSERT INTO grievance_comments_analysis (
          grievance_id,
          total_comments,
          citizen_comments,
          officer_comments,
          internal_comments,
          overall_sentiment,
          sentiment_score,
          positive_percentage,
          negative_percentage,
          neutral_percentage,
          key_themes,
          recurring_issues,
          citizen_concerns,
          officer_responses,
          response_time_avg,
          communication_quality,
          escalation_indicators,
          executive_summary,
          detailed_analysis,
          recommendations,
          action_items,
          confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          grievanceId,
          totalComments,
          citizenComments,
          officerComments,
          internalComments,
          aiAnalysis.overall_sentiment || 'neutral',
          aiAnalysis.sentiment_score || 0,
          aiAnalysis.positive_percentage || 0,
          aiAnalysis.negative_percentage || 0,
          aiAnalysis.neutral_percentage || 0,
          JSON.stringify(aiAnalysis.key_themes || []),
          JSON.stringify(aiAnalysis.recurring_issues || []),
          JSON.stringify(aiAnalysis.citizen_concerns || []),
          JSON.stringify(aiAnalysis.officer_responses || []),
          avgResponseTime,
          aiAnalysis.communication_quality || 'fair',
          JSON.stringify(aiAnalysis.escalation_indicators || []),
          aiAnalysis.executive_summary || '',
          aiAnalysis.detailed_analysis || '',
          JSON.stringify(aiAnalysis.recommendations || []),
          JSON.stringify(aiAnalysis.action_items || []),
          aiAnalysis.confidence_score || 0.8
        ]
      );

      // Update grievance with latest analysis reference
      await pool.query(
        `UPDATE usergrievance 
         SET latest_comments_analysis_id = $1 
         WHERE id = $2`,
        [analysisResult.rows[0].id, grievanceId]
      );

      console.log(` Analysis completed for grievance: ${grievanceId}`);

      return {
        success: true,
        data: analysisResult.rows[0]
      };

    } catch (error) {
      console.error(' Comments analysis error:', error);
      throw error;
    }
  }

  /**
   * Perform AI analysis using DeepSeek
   */
  async performAIAnalysis(grievance, comments) {
    const prompt = `You are an expert government grievance analyst. Analyze the conversation thread for this citizen grievance.

**Grievance Details:**
- ID: ${grievance.grievance_id}
- Title: ${grievance.title || 'N/A'}
- Category: ${typeof grievance.category === 'object' ? grievance.category.primary : grievance.category}
- Status: ${grievance.status}
- Priority: ${grievance.priority}
- Citizen: ${grievance.citizen_name || 'N/A'}

**Comments Thread (${comments.length} comments):**
${JSON.stringify(comments, null, 2)}

Analyze this conversation and provide a comprehensive JSON response with:

1. **overall_sentiment**: Overall sentiment (positive/negative/neutral/mixed)
2. **sentiment_score**: Numeric score from -1.0 (very negative) to 1.0 (very positive)
3. **positive_percentage**: Percentage of positive sentiment (0-100)
4. **negative_percentage**: Percentage of negative sentiment (0-100)
5. **neutral_percentage**: Percentage of neutral sentiment (0-100)
6. **key_themes**: Array of 3-5 main themes discussed (strings)
7. **recurring_issues**: Array of recurring problems mentioned (strings)
8. **citizen_concerns**: Array of main citizen concerns (strings)
9. **officer_responses**: Array summarizing officer response patterns (strings)
10. **communication_quality**: Quality assessment (excellent/good/fair/poor)
11. **escalation_indicators**: Array of signs indicating escalation risk (strings)
12. **executive_summary**: Brief 2-3 sentence summary of the conversation
13. **detailed_analysis**: Detailed paragraph analyzing the communication pattern
14. **recommendations**: Array of 3-5 specific recommendations for improvement
15. **action_items**: Array of 3-5 immediate action items
16. **confidence_score**: Your confidence in this analysis (0.0 to 1.0)

**Analysis Guidelines:**
- Focus on communication effectiveness
- Identify citizen satisfaction indicators
- Detect frustration or escalation signs
- Evaluate officer responsiveness
- Suggest improvements

Return ONLY valid JSON, no markdown or extra text.`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert government grievance analyst. Always respond with valid JSON only.'
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
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Parse JSON from response
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        // Return basic analysis if parsing fails
        return {
          overall_sentiment: 'neutral',
          sentiment_score: 0,
          positive_percentage: 33,
          negative_percentage: 33,
          neutral_percentage: 34,
          key_themes: ['Communication ongoing'],
          recurring_issues: [],
          citizen_concerns: [],
          officer_responses: [],
          communication_quality: 'fair',
          escalation_indicators: [],
          executive_summary: 'Analysis completed with limited AI insights.',
          detailed_analysis: 'AI analysis was unable to provide detailed insights.',
          recommendations: ['Review comments manually for detailed insights'],
          action_items: ['Follow up with citizen'],
          confidence_score: 0.5
        };
      }

    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get analysis for a specific grievance
   */
  async getGrievanceAnalysis(grievanceId) {
    try {
      const result = await pool.query(
        `SELECT * FROM grievance_comments_analysis 
         WHERE grievance_id = $1 
         ORDER BY analysis_date DESC 
         LIMIT 1`,
        [grievanceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  }

  /**
   * Batch analyze comments for multiple grievances
   */
  async batchAnalyzeGrievances(grievanceIds) {
    const results = [];
    
    for (const grievanceId of grievanceIds) {
      try {
        const result = await this.analyzeGrievanceComments(grievanceId);
        results.push({
          grievanceId,
          success: result.success,
          data: result.data
        });
      } catch (error) {
        results.push({
          grievanceId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get grievances that need comment analysis
   */
  async getGrievancesNeedingAnalysis(departmentId = null, limit = 50) {
    try {
      let query = `
        SELECT DISTINCT g.id, g.grievance_id, g.title, COUNT(gc.id) as comment_count
        FROM usergrievance g
        INNER JOIN grievancecomments gc ON gc.grievance_id = g.id
        LEFT JOIN grievance_comments_analysis gca ON gca.grievance_id = g.id
        WHERE gca.id IS NULL
      `;

      const params = [];
      
      if (departmentId) {
        params.push(departmentId);
        query += ` AND g.department_id = $1`;
      }

      query += `
        GROUP BY g.id, g.grievance_id, g.title
        HAVING COUNT(gc.id) >= 2
        ORDER BY COUNT(gc.id) DESC
        LIMIT $${params.length + 1}
      `;

      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching grievances needing analysis:', error);
      throw error;
    }
  }
}

export default new CommentsAnalysisService();
