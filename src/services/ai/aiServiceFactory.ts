import { AIService, AIServiceConfig } from './aiService';
import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';
import { OllamaService } from './ollamaService';
import { AIProvider } from '../../models/types';
import { logger } from '../../utils/logger';

export class AIServiceFactory {
  /**
   * Create an AI service instance based on the provider
   */
  static createService(provider: AIProvider, config: AIServiceConfig): AIService {
    logger.debug(`Creating AI service for provider: ${provider}`);
    
    switch (provider) {
      case 'openai':
        return new OpenAIService(config);
      
      case 'gemini':
        return new GeminiService(config);
      
      case 'ollama':
        return new OllamaService(config);
      
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Get available models for a specific provider (static fallback)
   */
  static getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return OpenAIService.getAvailableModels();
      
      case 'gemini':
        return GeminiService.getAvailableModels();
      
      case 'ollama':
        return OllamaService.getCommonModels();
      
      default:
        return [];
    }
  }

  /**
   * Fetch available models dynamically from the actual service endpoint
   */
  static async fetchAvailableModels(provider: AIProvider, config: AIServiceConfig): Promise<{
    success: boolean;
    models: string[];
    error?: string;
  }> {
    try {
      logger.debug(`Fetching available models for ${provider}`);
      
      const service = this.createService(provider, config);
      
      // Check if the service supports dynamic model fetching
      if ('getAvailableModels' in service && typeof service.getAvailableModels === 'function') {
        const models = await (service as any).getAvailableModels();
        return {
          success: true,
          models: models || []
        };
      }
      
      // Fallback to static models if dynamic fetching is not supported
      const staticModels = this.getAvailableModels(provider);
      return {
        success: true,
        models: staticModels
      };
      
    } catch (error) {
      logger.error(`Failed to fetch models for ${provider}:`, error);
      
      // Return static models as fallback
      const fallbackModels = this.getAvailableModels(provider);
      return {
        success: false,
        models: fallbackModels,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get fallback models when dynamic fetching fails
   */
  static getFallbackModels(provider: AIProvider): string[] {
    return this.getAvailableModels(provider);
  }

  /**
   * Get provider display name
   */
  static getProviderDisplayName(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      
      case 'gemini':
        return 'Google Gemini';
      
      case 'ollama':
        return 'Ollama (Local)';
      
      default:
        return provider;
    }
  }

  /**
   * Get configuration requirements for a provider
   */
  static getProviderRequirements(provider: AIProvider): {
    requiresApiKey: boolean;
    requiresEndpoint: boolean;
    requiresModel: boolean;
    description: string;
  } {
    switch (provider) {
      case 'openai':
        return {
          requiresApiKey: true,
          requiresEndpoint: false,
          requiresModel: true,
          description: 'Requires an OpenAI API key. Sign up at https://platform.openai.com/'
        };
      
      case 'gemini':
        return {
          requiresApiKey: true,
          requiresEndpoint: false,
          requiresModel: true,
          description: 'Requires a Google AI Studio API key. Get one at https://makersuite.google.com/'
        };
      
      case 'ollama':
        return {
          requiresApiKey: false,
          requiresEndpoint: true,
          requiresModel: true,
          description: 'Requires Ollama running locally. Install from https://ollama.ai/'
        };
      
      default:
        return {
          requiresApiKey: false,
          requiresEndpoint: false,
          requiresModel: false,
          description: 'Unknown provider'
        };
    }
  }

  /**
   * Validate configuration for a specific provider
   */
  static validateConfiguration(provider: AIProvider, config: AIServiceConfig): string[] {
    const service = this.createService(provider, config);
    return service.validateConfig();
  }

  /**
   * Test connection for a specific provider configuration
   */
  static async testConnection(provider: AIProvider, config: AIServiceConfig): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const service = this.createService(provider, config);
      const success = await service.testConnection();
      
      return { success };
    } catch (error) {
      logger.error(`Connection test failed for ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all supported providers
   */
  static getSupportedProviders(): AIProvider[] {
    return ['openai', 'gemini', 'ollama'];
  }
}