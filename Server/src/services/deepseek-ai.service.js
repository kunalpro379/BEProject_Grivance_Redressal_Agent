import axios from 'axios';

class DeepSeekAIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  /**
   * Analyze contractor report PDF text using DeepSeek AI
   */
  async analyzeContractorReport(pdfText, conversationContext = '') {
    try {
      const prompt = `You are an expert construction project analyst. Analyze this contractor report and extract key information.

${conversationContext ? `Conversation Context:\n${conversationContext}\n\n` : ''}

Report Content:
${pdfText}

Provide a detailed JSON analysis with:
1. project_name: Extract or infer the project name
2. contract_id: Extract contract/project ID if mentioned
3. progress_percentage: Estimate completion percentage (0-100)
4. description: Summarize the work completed
5. challenges: List any challenges or issues mentioned
6. next_steps: Identify planned next steps
7. quality_score: Rate report quality (0-100)
8. completeness: Rate information completeness (0-100)
9. sentiment: Overall sentiment (positive/neutral/negative)
10. risk_factors: Array of identified risks
11. recommendations: Array of recommendations
12. key_insights: Array of key insights
13. materials_used: List of materials mentioned
14. timeline_info: Any timeline or deadline information

Return ONLY valid JSON, no markdown or extra text.`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert construction project analyst. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      // Try to parse JSON from response
      try {
        // Remove markdown code blocks if present
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', aiResponse);
        // Return a structured response with raw text
        return {
          raw_analysis: aiResponse,
          quality_score: 70,
          completeness: 70,
          sentiment: 'neutral',
          key_insights: ['AI analysis completed'],
          recommendations: ['Review the report manually for details']
        };
      }

    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate conversational response for contractor - stays in domain
   */
  async generateContractorResponse(userMessage, conversationHistory = []) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant helping contractors register with the government department and submit project progress reports.

DOMAIN: Contractor registration, project progress reporting, work updates from field workers

YOUR ROLE:
1. Help contractors register by collecting: company name, license number, contact details, specialization
2. Help contractors submit progress reports: project name, progress %, work completed, challenges
3. Extract information from natural conversation
4. Stay strictly within contractor registration and progress reporting domain

STRICT RULES:
- ONLY discuss: contractor registration, company details, project progress, work updates, field worker reports
- If asked about other topics, politely say: "I can only help with contractor registration and progress reporting."
- DO NOT hallucinate information
- DO NOT provide legal, financial, or technical advice
- DO NOT discuss politics, personal matters, or unrelated topics
- Ask clarifying questions to get accurate information

CONVERSATION STYLE:
- Friendly and professional
- Ask one question at a time
- Acknowledge what they share
- Guide them naturally toward providing needed information

Example Conversations:

Registration:
User: "I want to register my company"
You: "Great! I can help you register. What's your company name?"

Progress Report:
User: "We completed 50% of the road work"
You: "Excellent progress! Which project is this for? And what specific work was completed?"`
        },
        ...conversationHistory.map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.message
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages,
          temperature: 0.5,
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Extract report data from conversation history
   */
  async extractReportDataFromConversation(conversationHistory) {
    try {
      const conversationText = conversationHistory
        .map(h => `${h.role}: ${h.message}`)
        .join('\n');

      const prompt = `Analyze this conversation between a contractor and an AI assistant. Extract project report information if sufficient data is available.

Conversation:
${conversationText}

Extract and return ONLY valid JSON with this structure:
{
  "has_sufficient_data": boolean (true if you can identify project name AND at least one other field),
  "project_name": string or null,
  "contract_id": string or null,
  "progress_percentage": number (0-100) or null,
  "description": string or null (summary of work completed),
  "challenges": string or null,
  "next_steps": string or null
}

RULES:
- Set has_sufficient_data to true ONLY if you found project name AND at least one other meaningful field
- DO NOT hallucinate or make up information
- Use null for fields not mentioned in conversation
- Extract only what was explicitly stated
- If progress mentioned as "half done", "50%", "halfway" → use 50
- Keep descriptions concise (max 200 chars)

Return ONLY the JSON, no other text.`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a data extraction assistant. Return only valid JSON, no markdown, no explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      // Try to parse JSON
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse extraction response:', aiResponse);
        return { has_sufficient_data: false };
      }

    } catch (error) {
      console.error('DeepSeek Extraction Error:', error.response?.data || error.message);
      return { has_sufficient_data: false };
    }
  }
}

export default new DeepSeekAIService();
