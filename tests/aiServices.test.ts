import { AIService, AIServiceConfig, AIServiceResponse } from '../src/services/ai/aiService';
import { OpenAIService } from '../src/services/ai/openaiService';
import { GeminiService } from '../src/services/ai/geminiService';
import { OllamaService } from '../src/services/ai/ollamaService';
import { AIServiceFactory } from '../src/services/ai/aiServiceFactory';
import { AIProvider } from '../src/models/types';

// Mock fetch globally
global.fetch = jest.fn();

// Test implementation of AIService for testing base functionality
class TestAIService extends AIService {
  constructor(provider: AIProvider, config: AIServiceConfig) {
    super(provider, config);
  }

  async processContent(content: string, prompt: string, language?: string): Promise<AIServiceResponse> {
    // Simple test implementation that returns the prepared prompt
    const preparedPrompt = this.preparePrompt(prompt, content, language);
    return this.parseSentimentFromResponse(preparedPrompt + '\n\nSENTIMENT: Neutral');
  }

  async testConnection(): Promise<boolean> {
    return this.config.apiKey ? true : false;
  }

  getDisplayName(): string {
    return `Test Service (${this.config.model})`;
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    if (!this.config.model) {
      errors.push('Model is required');
    }
    return errors;
  }

  // Expose protected method for testing
  public testPreparePrompt(template: string, content: string, language?: string): string {
    return this.preparePrompt(template, content, language);
  }
}

describe('AIService Base Class', () => {
  let service: TestAIService;
  const mockConfig: AIServiceConfig = {
    apiKey: 'test-key',
    model: 'test-model'
  };

  beforeEach(() => {
    service = new TestAIService('openai', mockConfig);
  });

  describe('preparePrompt', () => {
    it('should replace content placeholder in template', () => {
      const template = 'Process this: {content}';
      const content = 'Daily log entry';
      
      const result = service.testPreparePrompt(template, content);
      
      expect(result).toContain('Process this: Daily log entry');
    });

    it('should add language instruction when language is specified', () => {
      const template = 'Process: {content}';
      const content = 'Entry';
      
      const result = service.testPreparePrompt(template, content, 'spanish');
      
      expect(result).toContain('write the journal entry in spanish');
    });

    it('should not add language instruction when language is auto', () => {
      const template = 'Process: {content}';
      const content = 'Entry';
      
      const result = service.testPreparePrompt(template, content, 'auto');
      
      // When language is 'auto', no additional language instruction is added
      expect(result).toBe('Process: Entry');
    });

    it('should add auto language preservation instruction when language is undefined', () => {
      const template = 'Process: {content}';
      const content = 'Entry';
      
      const result = service.testPreparePrompt(template, content, undefined);
      
      expect(result).toContain('same language as the original content');
    });

    it('should handle empty content', () => {
      const template = 'Process: {content}';
      
      const result = service.testPreparePrompt(template, '');
      
      expect(result).toContain('Process:');
    });
  });

  describe('validateConfig', () => {
    it('should validate configuration', () => {
      const errors = service.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid configuration', () => {
      const invalidService = new TestAIService('openai', { model: '' });
      const errors = invalidService.validateConfig();
      expect(errors).toContain('Model is required');
    });
  });

  describe('testConnection', () => {
    it('should return true when API key is present', async () => {
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      const serviceWithoutKey = new TestAIService('openai', { model: 'test-model' });
      const result = await serviceWithoutKey.testConnection();
      expect(result).toBe(false);
    });
  });
});

describe('OpenAIService', () => {
  let service: OpenAIService;
  const mockConfig: AIServiceConfig = {
    apiKey: 'sk-test-key',
    model: 'gpt-3.5-turbo'
  };

  beforeEach(() => {
    service = new OpenAIService(mockConfig);
    jest.clearAllMocks();
  });

  describe('processContent', () => {
    it('should process content and return response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Generated journal entry'
              }
            }
          ]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.processContent('Daily log content', 'Transform this: {content}');
      
      expect(result.content).toBe('Generated journal entry');
      expect(result.sentiment).toBe('Neutral');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(service.processContent('content', 'prompt')).rejects.toThrow('server error. Please try again later');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 'gpt-3.5-turbo' }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const errors = service.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should return errors for missing API key', () => {
      const invalidService = new OpenAIService({ model: 'gpt-3.5-turbo' });
      const errors = invalidService.validateConfig();
      expect(errors).toContain('API Key is required for OpenAI');
    });

    it('should return errors for invalid API key format', () => {
      const invalidService = new OpenAIService({ apiKey: 'invalid-key', model: 'gpt-3.5-turbo' });
      const errors = invalidService.validateConfig();
      expect(errors).toContain('OpenAI API Key should start with "sk-"');
    });
  });

  describe('getDisplayName', () => {
    it('should return correct display name', () => {
      expect(service.getDisplayName()).toBe('OpenAI (gpt-3.5-turbo)');
    });
  });
});

describe('GeminiService', () => {
  let service: GeminiService;
  const mockConfig: AIServiceConfig = {
    apiKey: 'test-gemini-key-with-sufficient-length-to-pass-validation',
    model: 'gemini-pro'
  };

  beforeEach(() => {
    service = new GeminiService(mockConfig);
    jest.clearAllMocks();
  });

  describe('processContent', () => {
    it('should process content successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Generated Gemini response'
                  }
                ]
              }
            }
          ]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.processContent('Daily log content', 'Transform this: {content}');
      
      expect(result.content).toBe('Generated Gemini response');
      expect(result.sentiment).toBe('Neutral');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const errors = service.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should return errors for missing API key', () => {
      const invalidService = new GeminiService({ model: 'gemini-pro' });
      const errors = invalidService.validateConfig();
      expect(errors).toContain('API Key is required for Google Gemini');
    });
  });
});

describe('OllamaService', () => {
  let service: OllamaService;
  const mockConfig: AIServiceConfig = {
    endpoint: 'http://localhost:11434',
    model: 'llama2'
  };

  beforeEach(() => {
    service = new OllamaService(mockConfig);
    jest.clearAllMocks();
  });

  describe('processContent', () => {
    it('should process content successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          response: 'Generated Ollama response'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.processContent('Daily log content', 'Transform this: {content}');
      
      expect(result.content).toBe('Generated Ollama response');
      expect(result.sentiment).toBe('Neutral');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const errors = service.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should use default endpoint when none provided', () => {
      const serviceWithoutEndpoint = new OllamaService({ model: 'llama2' });
      const errors = serviceWithoutEndpoint.validateConfig();
      // Should not error because default endpoint is set
      expect(errors).toEqual([]);
    });
  });
});

describe('AIServiceFactory', () => {
  const mockConfig: AIServiceConfig = {
    apiKey: 'test-key',
    model: 'test-model'
  };

  describe('createService', () => {
    it('should create OpenAI service', () => {
      const service = AIServiceFactory.createService('openai', mockConfig);
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should create Gemini service', () => {
      const service = AIServiceFactory.createService('gemini', mockConfig);
      expect(service).toBeInstanceOf(GeminiService);
    });

    it('should create Ollama service', () => {
      const service = AIServiceFactory.createService('ollama', mockConfig);
      expect(service).toBeInstanceOf(OllamaService);
    });

    it('should throw error for unknown provider', () => {
      expect(() => AIServiceFactory.createService('unknown' as AIProvider, mockConfig))
        .toThrow('Unsupported AI provider: unknown');
    });
  });

  describe('getAvailableModels', () => {
    it('should return static models for OpenAI', () => {
      const models = AIServiceFactory.getAvailableModels('openai');
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gpt-4');
    });

    it('should return empty array for unknown provider', () => {
      const models = AIServiceFactory.getAvailableModels('unknown' as AIProvider);
      expect(models).toEqual([]);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = AIServiceFactory.getSupportedProviders();
      expect(providers).toEqual(['openai', 'gemini', 'ollama']);
    });
  });
});