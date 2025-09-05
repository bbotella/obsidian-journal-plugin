import { AIService, AIServiceConfig, AIServiceResponse } from './aiService';
import { logger } from '../../utils/logger';

export class OllamaService extends AIService {
  private readonly defaultEndpoint = 'http://localhost:11434';

  constructor(config: AIServiceConfig) {
    super('ollama', config);
    
    // Set default endpoint if not provided
    if (!this.config.endpoint) {
      this.config.endpoint = this.defaultEndpoint;
    }
  }

  async processContent(content: string, prompt: string, language?: string): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.logAIRequest(this.provider, this.config.model, content.length);
      
      const fullPrompt = this.preparePrompt(prompt, content, language);
      
      const url = `${this.config.endpoint}/api/generate`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: 4000
          }
        })
      }, 3, 60000); // Longer timeout for local models

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Empty response from Ollama');
      }

      const validatedResponse = this.validateResponse(data.response);
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
      const url = `${this.config.endpoint}/api/tags`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'GET'
      }, 1, 5000); // Quick timeout for connectivity test

      const data = await response.json();
      return data.models && Array.isArray(data.models);
    } catch (error) {
      logger.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch available models from Ollama server
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const url = `${this.config.endpoint}/api/tags`;
      
      const response = await this.makeHttpRequest(url, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        return data.models
          .map((model: any) => model.name)
          .filter((name: string) => name && name.trim())
          .sort();
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to fetch Ollama models:', error);
      return OllamaService.getCommonModels();
    }
  }

  getDisplayName(): string {
    return `Ollama (${this.config.model})`;
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    
    if (!this.config.model) {
      errors.push('Model is required for Ollama');
    }
    
    if (!this.config.endpoint) {
      errors.push('Endpoint is required for Ollama');
    }
    
    // Validate endpoint format
    if (this.config.endpoint) {
      try {
        new URL(this.config.endpoint);
      } catch {
        errors.push('Invalid endpoint URL for Ollama');
      }
    }
    
    return errors;
  }

  /**
   * Get common Ollama models
   */
  static getCommonModels(): string[] {
    return [
      'llama2',
      'llama2:13b',
      'llama2:70b',
      'mistral',
      'mixtral',
      'codellama',
      'gemma',
      'qwen',
      'phi'
    ];
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.some(model => model.includes(modelName));
    } catch {
      return false;
    }
  }

  /**
   * Pull a model if it's not available
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const url = `${this.config.endpoint}/api/pull`;
      
      await this.makeHttpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      }, 1, 300000); // 5 minute timeout for model pulling
      
      logger.info(`Successfully pulled Ollama model: ${modelName}`);
    } catch (error) {
      logger.error(`Failed to pull Ollama model ${modelName}:`, error);
      throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
    }
  }
}