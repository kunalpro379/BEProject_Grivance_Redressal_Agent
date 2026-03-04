import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';

/**
 * Image-Query Validation Service
 * Validates if the provided image matches the grievance query using Puter AI API.
 * Uses Puter's OpenAI-compatible endpoint for vision analysis
 */
class ImageValidatorService {
    constructor() {
        this.authToken = process.env.PUTER_AUTH_TOKEN;
        
        if (!this.authToken) {
            console.error('[ImageValidator] WARNING: PUTER_AUTH_TOKEN not configured');
            this.client = null;
        } else {
            // Use Puter's OpenAI-compatible endpoint (like autonomous-ai-agent.service.js)
            this.client = new OpenAI({
                baseURL: 'https://api.puter.com/puterai/openai/v1/',
                apiKey: this.authToken,
            });
            console.log('[ImageValidator] Initialized with Puter.js OpenAI endpoint');
        }
        this.model = 'gpt-4o'; // Vision model for Puter OpenAI endpoint
    }

    /**
     * Validate if image content actually matches the grievance query
     * @param {string} imagePathOrUrl - Local path or URL to the image
     * @param {string} query - The grievance text/query
     * @returns {Promise<Object>} Validation result with is_valid, score, reasoning
     */
    async validateImageQueryMatch(imagePathOrUrl, query) {
        if (!this.client) {
            return {
                is_valid: false,
                validation_score: 0.0,
                reasoning: 'Image validation service not configured. PUTER_AUTH_TOKEN missing.',
                mismatches: ['Configuration error'],
                confidence: 'error',
                image_shows: 'Service unavailable'
            };
        }

        try {
            // Convert image to base64 data URL
            let imageDataUrl;
            
            if (imagePathOrUrl.startsWith('http')) {
                // Download from URL and convert
                const response = await axios.get(imagePathOrUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                const base64 = Buffer.from(response.data).toString('base64');
                imageDataUrl = `data:image/jpeg;base64,${base64}`;
            } else {
                // Read from local file
                const imageBuffer = fs.readFileSync(imagePathOrUrl);
                const base64 = imageBuffer.toString('base64');
                imageDataUrl = `data:image/jpeg;base64,${base64}`;
            }

            // Validation prompt
            const prompt = `You are a government grievance validation system. Your task is to validate if the provided image matches the citizen's complaint.

CITIZEN'S COMPLAINT:
${query}

VALIDATION TASK:
1. Analyze the image content carefully
2. Check if the image provides visual evidence for the complaint
3. Identify any mismatches or inconsistencies
4. Provide a validation score (0.0 to 1.0)

SCORING GUIDELINES:
- 0.9-1.0: Perfect match, image clearly shows the issue described
- 0.7-0.89: Good match, image supports the complaint with minor differences
- 0.5-0.69: Partial match, some elements match but concerns exist
- 0.3-0.49: Poor match, significant mismatches
- 0.0-0.29: No match, image unrelated to complaint

Return ONLY a valid JSON object with this structure:
{
    "is_valid": true/false,
    "validation_score": 0.85,
    "reasoning": "Detailed explanation of why image matches or doesn't match",
    "mismatches": ["list of any inconsistencies found"],
    "confidence": "high/medium/low",
    "image_shows": "Brief description of what the image actually shows"
}

IMPORTANT: 
- is_valid should be true if validation_score >= 0.5
- Be STRICT in validation - if the image doesn't match the complaint, fail it
- Consider that citizens may not be professional photographers
- But if the image shows something completely different, reject it`;

            // Call Puter AI with vision using OpenAI-compatible endpoint
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: { url: imageDataUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 1000  // Increased for detailed analysis
            });

            const rawContent = response.choices[0]?.message?.content || '';
            console.log('[ImageValidator] Raw AI response:', rawContent.substring(0, 200));

            // Parse JSON response
            let result;
            try {
                result = JSON.parse(rawContent);
            } catch (parseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[1]);
                } else {
                    const simpleMatch = rawContent.match(/\{[\s\S]*\}/);
                    if (simpleMatch) {
                        result = JSON.parse(simpleMatch[0]);
                    } else {
                        throw new Error('Could not parse validation response');
                    }
                }
            }

            // Ensure required fields
            result.is_valid = result.is_valid ?? (result.validation_score >= 0.5);
            result.mismatches = result.mismatches || [];
            result.confidence = result.confidence || 'medium';
            result.validation_score = result.validation_score ?? 0.5;

            console.log('[ImageValidator] Validation Result:', {
                is_valid: result.is_valid,
                score: result.validation_score,
                confidence: result.confidence
            });

            return result;

        } catch (error) {
            console.error('[ImageValidator] Validation Error:', error.message);
            
            // On error, REJECT the submission - we can't validate without working API
            return {
                is_valid: false,
                validation_score: 0.0,
                reasoning: `Image validation failed: ${error.message}. Please try again or contact support if issue persists.`,
                mismatches: [`Technical error: ${error.message}`],
                confidence: 'error',
                image_shows: 'Validation system error - unable to analyze image'
            };
        }
    }

    /**
     * Quick validation - just returns true/false
     */
    async isValidProof(imagePathOrUrl, query) {
        const result = await this.validateImageQueryMatch(imagePathOrUrl, query);
        return result.is_valid && result.validation_score >= 0.5;
    }
}

// Export singleton instance
const imageValidatorService = new ImageValidatorService();
export default imageValidatorService;
