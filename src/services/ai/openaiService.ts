import { AIService, AIServiceConfig, AIServiceResponse } from './aiService';
import { logger } from '../../utils/logger';

export class OpenAIService extends AIService {
  private readonly baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(config: AIServiceConfig) {
    super('openai', config);
  }

  async processContent(content: string, prompt: string, language?: string): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.logAIRequest(this.provider, this.config.model, content.length);
      
      const fullPrompt = this.preparePrompt(prompt, content, language);
      
      const response = await this.makeHttpRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated');
      }

      const generatedContent = data.choices[0].message?.content;
      if (!generatedContent) {
        throw new Error('Empty response from OpenAI');
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
      const response = await this.makeHttpRequest('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      const data = await response.json();
      return data.data && Array.isArray(data.data);
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch available models from OpenAI API
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.makeHttpRequest('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        // Filter to only include relevant models (GPT models)
        const models = data.data
          .filter((model: any) => {
            const id = model.id.toLowerCase();
            return id.includes('gpt') && !id.includes('instruct') && !id.includes('edit');
          })
          .map((model: any) => model.id)
          .sort();

        // If no GPT models found, return static fallback
        return models.length > 0 ? models : OpenAIService.getAvailableModels();
      }
      
      return OpenAIService.getAvailableModels();
    } catch (error) {
      logger.error('Failed to fetch OpenAI models:', error);
      return OpenAIService.getAvailableModels();
    }
  }

  getDisplayName(): string {
    return `OpenAI (${this.config.model})`;
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    
    if (!this.config.apiKey) {
      errors.push('API Key is required for OpenAI');
    }
    
    if (!this.config.model) {
      errors.push('Model is required for OpenAI');
    }
    
    // Validate API key format
    if (this.config.apiKey && !this.config.apiKey.startsWith('sk-')) {
      errors.push('OpenAI API Key should start with "sk-"');
    }
    
    return errors;
  }

  /**
   * Get available models for OpenAI
   */
  static getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }
}