import { AIProvider, Sentiment } from '../../models/types';
import { logger } from '../../utils/logger';

export interface AIServiceResponse {
  content: string;
  sentiment?: Sentiment;
}

export interface AIServiceConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
}

export abstract class AIService {
  protected config: AIServiceConfig;
  protected provider: AIProvider;

  constructor(provider: AIProvider, config: AIServiceConfig) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Process content using the AI service
   */
  abstract processContent(content: string, prompt: string, language?: string): Promise<AIServiceResponse>;

  /**
   * Test if the service is properly configured and accessible
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get the display name for this service
   */
  abstract getDisplayName(): string;

  /**
   * Validate configuration
   */
  abstract validateConfig(): string[];

  /**
   * Get available models from the service endpoint (optional)
   */
  async getAvailableModels?(): Promise<string[]>;

  /**
   * Make HTTP request with error handling and retry logic
   */
  protected async makeHttpRequest(
    url: string,
    options: RequestInit,
    retries: number = 3,
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          logger.debug(`Making request to ${url} (attempt ${attempt}/${retries})`);
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (attempt === retries) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await this.sleep(delay);
            continue;
          }

          return response;
        } catch (error) {
          if (attempt === retries) {
            throw error;
          }
          
          logger.warn(`Request attempt ${attempt} failed:`, error);
          
          // Wait before retry
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
      
      throw new Error('All retry attempts failed');
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Handle common API errors
   */
  protected handleApiError(error: any, context: string): never {
    logger.error(`${this.provider} API error in ${context}:`, error);
    
    if (error.message?.includes('timeout')) {
      throw new Error(`${this.getDisplayName()} request timed out. Please try again.`);
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      throw new Error(`${this.getDisplayName()} authentication failed. Please check your API key.`);
    }
    
    if (error.message?.includes('429')) {
      throw new Error(`${this.getDisplayName()} rate limit exceeded. Please wait before trying again.`);
    }
    
    if (error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503')) {
      throw new Error(`${this.getDisplayName()} server error. Please try again later.`);
    }
    
    throw new Error(`${this.getDisplayName()} error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize and prepare prompt with content
   */
  protected preparePrompt(template: string, content: string, language?: string): string {
    let prompt = template.replace('{content}', content.trim());
    
    if (language && language !== 'auto') {
      prompt += `\n\nPlease write the journal entry in ${language}. Return only the journal content, no introductions or explanations.`;
    } else if (!language) {
      // When language is undefined (auto mode), explicitly instruct to preserve original language
      prompt += `\n\nIMPORTANT: Write the journal entry in the same language as the original content. Do not translate or change the language. Return only the journal content, no introductions or explanations.`;
    }
    
    return prompt;
  }

  /**
   * Parse sentiment and content from AI response
   */
  protected parseSentimentFromResponse(response: string): { content: string; sentiment?: Sentiment } {
    const lines = response.trim().split('\n');
    let content = response.trim();
    let sentiment: Sentiment | undefined;

    // Look for sentiment line at the end
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      const sentimentMatch = line.match(/^SENTIMENT:\s*(Very Happy|Happy|Neutral|Sad|Very Sad)$/i);
      
      if (sentimentMatch) {
        const parsedSentiment = sentimentMatch[1].trim();
        
        // Validate sentiment value
        const validSentiments: Sentiment[] = ['Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad'];
        const normalizedSentiment = validSentiments.find(s => 
          s.toLowerCase() === parsedSentiment.toLowerCase()
        );
        
        if (normalizedSentiment) {
          sentiment = normalizedSentiment;
          // Remove sentiment line from content
          content = lines.slice(0, i).join('\n').trim();
          logger.debug(`Parsed sentiment: ${sentiment}`);
          break;
        } else {
          logger.warn(`Invalid sentiment value parsed: ${parsedSentiment}`);
        }
      }
    }

    if (!sentiment) {
      logger.debug('No sentiment found in response, defaulting to Neutral');
      sentiment = 'Neutral';
    }

    return { content, sentiment };
  }

  /**
   * Validate response content
   */
  protected validateResponse(response: string): string {
    if (!response || response.trim().length === 0) {
      throw new Error('Received empty response from AI service');
    }
    
    // Basic content validation
    const trimmed = response.trim();
    
    if (trimmed.length < 50) {
      logger.warn('Received unusually short response from AI service:', trimmed);
    }
    
    return trimmed;
  }
}