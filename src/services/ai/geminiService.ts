import { AIService, AIServiceConfig, AIServiceResponse } from './aiService';
import { logger } from '../../utils/logger';

export class GeminiService extends AIService {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(config: AIServiceConfig) {
    super('gemini', config);
  }

  async processContent(content: string, prompt: string, language?: string): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.logAIRequest(this.provider, this.config.model, content.length);
      
      const fullPrompt = this.preparePrompt(prompt, content, language);
      
      const url = `${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            stopSequences: []
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated from Gemini');
      }

      const candidate = data.candidates[0];
      
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Content was blocked by Gemini safety filters');
      }
      
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty response from Gemini');
      }

      const generatedContent = candidate.content.parts[0].text;
      if (!generatedContent) {
        throw new Error('No text content in Gemini response');
      }

      const validatedResponse = this.validateResponse(generatedContent);
      const result = this.parseSentimentFromResponse(validatedResponse);
      const duration = Date.now() - startTime;
      
      logger.logAIResponse(this.provider, result.content.length, duration);
      
      return result;
    } catch (error) {
      this.handleApiError(error, 'processContent');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}?key=${this.config.apiKey}`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'GET'
      });

      const data = await response.json();
      return data.models && Array.isArray(data.models);
    } catch (error) {
      logger.error('Gemini connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch available models from Gemini API
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}?key=${this.config.apiKey}`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        // Filter to only include generation models
        const models = data.models
          .filter((model: any) => {
            const name = model.name.toLowerCase();
            return name.includes('gemini') && 
                   (name.includes('generatecontent') || name.includes('models/gemini'));
          })
          .map((model: any) => {
            // Extract model name from the full path (e.g., "models/gemini-pro" -> "gemini-pro")
            const parts = model.name.split('/');
            return parts[parts.length - 1];
          })
          .filter((name: string) => name && !name.includes(':'))
          .sort();

        // If no Gemini models found, return static fallback
        return models.length > 0 ? models : GeminiService.getAvailableModels();
      }
      
      return GeminiService.getAvailableModels();
    } catch (error) {
      logger.error('Failed to fetch Gemini models:', error);
      return GeminiService.getAvailableModels();
    }
  }

  getDisplayName(): string {
    return `Google Gemini (${this.config.model})`;
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    
    if (!this.config.apiKey) {
      errors.push('API Key is required for Google Gemini');
    }
    
    if (!this.config.model) {
      errors.push('Model is required for Google Gemini');
    }
    
    // Validate API key format (Gemini keys are typically longer)
    if (this.config.apiKey && this.config.apiKey.length < 30) {
      errors.push('Google Gemini API Key appears to be invalid');
    }
    
    return errors;
  }

  /**
   * Get available models for Gemini
   */
  static getAvailableModels(): string[] {
    return [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-pro-1.5'
    ];
  }
}