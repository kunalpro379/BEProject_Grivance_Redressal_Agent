import axios from 'axios';

/**
 * AI Service for Citizen Grievance Bot
 * Uses DeepSeek AI to intelligently extract grievance information from natural conversation
 */
class CitizenGrievanceAIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  /**
   * Generate conversational response for citizen grievance submission
   * Intelligently guides the user through the grievance process
   */
  async generateCitizenResponse(userMessage, conversationHistory = [], userContext = {}) {
    try {
      const systemPrompt = `You are an AI assistant helping citizens submit grievances to the government.

DOMAIN: Citizen grievance submission, complaint registration, issue reporting

YOUR ROLE:
1. Help citizens describe their problems in detail
2. Extract key information: problem type, location, urgency, description
3. Guide them naturally through providing necessary details
4. Show empathy and understanding
5. Stay strictly within grievance submission domain

INFORMATION TO COLLECT:
- Problem description (what is the issue?)
- Location details (where is the problem?)
- When did it start?
- How urgent is it?
- Any additional context

STRICT RULES:
- ONLY discuss: grievance submission, complaints, civic issues, government services
- If asked about other topics, politely redirect: "I'm here to help you submit your grievance. Can you tell me about the issue you're facing?"
- DO NOT hallucinate information
- DO NOT provide legal advice
- DO NOT discuss politics or personal matters unrelated to grievances
- Show empathy for citizen's problems
- Ask clarifying questions naturally

CONVERSATION STYLE:
- Empathetic and supportive
- Professional but friendly
- Ask one question at a time
- Acknowledge their concerns
- Guide them naturally toward providing needed information

${userContext.has_location ? 'User has already shared their location.' : 'User needs to share the grievance location.'}
${userContext.has_proof ? 'User has already uploaded proof/image.' : 'User needs to upload proof/image of the issue.'}

Example Conversations:

User: "There's a big pothole on my street"
You: "I understand, potholes can be dangerous. Can you tell me more about the location? Which street or area is this?"

User: "Water supply has been cut for 3 days"
You: "That must be very difficult. I'll help you report this. Can you tell me your exact location or area where the water supply is cut?"

User: "Garbage not collected"
You: "I can help you report this. How long has the garbage not been collected? And which area are you in?"`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
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
          temperature: 0.7,
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
      console.error('[CitizenAI] DeepSeek API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Extract grievance information from conversation
   * Intelligently determines if enough information has been collected
   */
  async extractGrievanceData(conversationHistory) {
    try {
      const conversationText = conversationHistory
        .map(h => `${h.role}: ${h.message}`)
        .join('\n');

      const prompt = `Analyze this conversation between a citizen and a grievance submission assistant. Extract grievance information if sufficient data is available.

Conversation:
${conversationText}

Extract and return ONLY valid JSON with this structure:
{
  "has_sufficient_data": boolean (true if you can identify the problem AND location/area),
  "grievance_text": string or null (detailed description of the problem),
  "problem_type": string or null (e.g., "water supply", "road damage", "garbage", "electricity", "drainage"),
  "location_mentioned": string or null (area/street/landmark mentioned),
  "urgency": string or null ("emergency", "urgent", "normal"),
  "duration": string or null (how long the problem exists),
  "additional_context": string or null (any other relevant details),
  "sentiment": string ("frustrated", "angry", "concerned", "neutral"),
  "needs_clarification": boolean (true if more details needed),
  "suggested_question": string or null (what to ask next if clarification needed)
}

RULES:
- Set has_sufficient_data to true ONLY if you have clear problem description AND location/area
- DO NOT hallucinate or make up information
- Use null for fields not mentioned in conversation
- Extract only what was explicitly stated
- Infer urgency from tone and problem severity
- Keep grievance_text comprehensive but concise (max 500 chars)
- If information is incomplete, set needs_clarification to true and suggest what to ask

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
          max_tokens: 800
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
        console.error('[CitizenAI] Failed to parse extraction response:', aiResponse);
        return { 
          has_sufficient_data: false,
          needs_clarification: true,
          suggested_question: "Can you provide more details about the issue and its location?"
        };
      }

    } catch (error) {
      console.error('[CitizenAI] Extraction Error:', error.response?.data || error.message);
      return { 
        has_sufficient_data: false,
        needs_clarification: true 
      };
    }
  }

  /**
   * Analyze uploaded image/document in context of the grievance
   * Provides intelligent analysis of the proof
   */
  async analyzeGrievanceProof(grievanceContext, imageDescription = '') {
    try {
      const prompt = `You are analyzing proof/evidence for a citizen grievance.

Grievance Context:
${JSON.stringify(grievanceContext, null, 2)}

Image/Document Description: ${imageDescription || 'Photo uploaded by citizen'}

Provide a brief analysis in JSON format:
{
  "proof_quality": string ("excellent", "good", "acceptable", "poor"),
  "proof_relevance": string ("highly relevant", "relevant", "somewhat relevant", "not relevant"),
  "visible_issues": array of strings (what problems are visible),
  "recommendations": array of strings (suggestions for better documentation if needed),
  "confidence": number (0-100, how confident you are this proof supports the grievance)
}

Return ONLY valid JSON, no other text.`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an evidence analysis assistant. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
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
      
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('[CitizenAI] Failed to parse proof analysis:', aiResponse);
        return {
          proof_quality: 'acceptable',
          proof_relevance: 'relevant',
          visible_issues: ['Image uploaded'],
          recommendations: [],
          confidence: 70
        };
      }

    } catch (error) {
      console.error('[CitizenAI] Proof Analysis Error:', error.response?.data || error.message);
      return {
        proof_quality: 'acceptable',
        proof_relevance: 'relevant',
        visible_issues: ['Proof uploaded'],
        recommendations: [],
        confidence: 70
      };
    }
  }

  /**
   * Determine if the conversation is ready for proof upload
   */
  isReadyForProof(extractedData) {
    return extractedData.has_sufficient_data && 
           extractedData.grievance_text && 
           extractedData.grievance_text.length > 20;
  }

  /**
   * Generate a summary message for the citizen before final submission
   */
  generateSubmissionSummary(extractedData, hasLocation, hasProof) {
    const parts = [];
    
    parts.push('📋 Grievance Summary:');
    parts.push('');
    
    if (extractedData.problem_type) {
      parts.push(`Type: ${extractedData.problem_type}`);
    }
    
    if (extractedData.grievance_text) {
      const text = extractedData.grievance_text.substring(0, 200);
      parts.push(`Issue: ${text}${extractedData.grievance_text.length > 200 ? '...' : ''}`);
    }
    
    if (extractedData.location_mentioned) {
      parts.push(`Location: ${extractedData.location_mentioned}`);
    }
    
    if (extractedData.urgency) {
      parts.push(`Urgency: ${extractedData.urgency}`);
    }
    
    parts.push('');
    parts.push(`Location: ${hasLocation ? 'Provided' : 'Not provided'}`);
    parts.push(`Proof: ${hasProof ? 'Uploaded' : 'Not uploaded'}`);
    
    return parts.join('\n');
  }
}

export default new CitizenGrievanceAIService();
