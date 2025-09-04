import { Logger, LogLevel, logger } from '../src/utils/logger';

// Mock console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

beforeAll(() => {
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default INFO level
    logger.setLogLevel(LogLevel.INFO);
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(logger);
    });
  });

  describe('log levels', () => {
    it('should log info messages by default', () => {
      logger.info('Test info message');
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Test info message');
    });

    it('should log warning messages by default', () => {
      logger.warn('Test warning message');
      expect(console.warn).toHaveBeenCalledWith('[Journal Plugin] [WARN]', 'Test warning message');
    });

    it('should log error messages by default', () => {
      logger.error('Test error message');
      expect(console.error).toHaveBeenCalledWith('[Journal Plugin] [ERROR]', 'Test error message', undefined);
    });

    it('should not log debug messages by default', () => {
      logger.debug('Test debug message - should not appear');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should log debug messages when debug level is set', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Test debug message - should appear');
      expect(console.debug).toHaveBeenCalledWith('[Journal Plugin] [DEBUG]', 'Test debug message - should appear');
    });
  });

  describe('log level filtering', () => {
    it('should respect DEBUG log level', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should respect INFO log level', () => {
      logger.setLogLevel(LogLevel.INFO);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should respect WARN log level', () => {
      logger.setLogLevel(LogLevel.WARN);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should respect ERROR log level', () => {
      logger.setLogLevel(LogLevel.ERROR);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should format simple messages', () => {
      logger.info('Simple string message');
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Simple string message');
    });

    it('should handle multiple arguments', () => {
      logger.info('Message with', 'multiple', 'arguments');
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Message with', 'multiple', 'arguments');
    });

    it('should handle object arguments', () => {
      const testObject = { key: 'value', number: 42 };
      logger.info('Object message:', testObject);
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Object message:', testObject);
    });

    it('should handle error objects', () => {
      const testError = new Error('Test error');
      logger.error('Error occurred:', testError);
      expect(console.error).toHaveBeenCalledWith('[Journal Plugin] [ERROR]', 'Error occurred:', testError);
    });

    it('should handle null and undefined', () => {
      logger.info('Null value:', null);
      logger.info('Undefined value:', undefined);
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Null value:', null);
      expect(console.info).toHaveBeenCalledWith('[Journal Plugin] [INFO]', 'Undefined value:', undefined);
    });
  });

  describe('specialized logging methods', () => {
    beforeEach(() => {
      logger.setLogLevel(LogLevel.DEBUG);
    });

    it('should log AI requests', () => {
      logger.logAIRequest('openai', 'gpt-3.5-turbo', 150);
      expect(console.debug).toHaveBeenCalledWith(
        '[Journal Plugin] [DEBUG]',
        'AI Request: openai/gpt-3.5-turbo, input length: 150 chars'
      );
    });

    it('should log AI responses', () => {
      logger.logAIResponse('openai', 250, 1500);
      expect(console.debug).toHaveBeenCalledWith(
        '[Journal Plugin] [DEBUG]',
        'AI Response: openai, output length: 250 chars, duration: 1500ms'
      );
    });

    it('should log file operations', () => {
      logger.logFileOperation('created', '/path/to/file.md');
      expect(console.debug).toHaveBeenCalledWith(
        '[Journal Plugin] [DEBUG]',
        'File created: /path/to/file.md'
      );
    });

    it('should log processing statistics', () => {
      logger.logProcessingStats(5, 2, 1);
      expect(console.info).toHaveBeenCalledWith(
        '[Journal Plugin] [INFO]',
        'Processing complete: 5 processed, 2 skipped, 1 errors'
      );
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle typical plugin workflow logging', () => {
      logger.setLogLevel(LogLevel.DEBUG);

      // Simulate a typical workflow
      logger.info('Starting daily note processing');
      logger.debug('Found 5 daily notes to process');
      logger.info('Processing note: 2025-09-01.md');
      logger.warn('Note already processed, skipping');
      logger.info('Processing note: 2025-09-02.md');
      logger.error('AI service unavailable, retrying...');
      logger.info('Processing completed successfully');

      expect(console.info).toHaveBeenCalledTimes(4);
      expect(console.debug).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should respect log level changes during runtime', () => {
      // Start with INFO level
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Should not appear');
      logger.info('Should appear');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledTimes(1);

      // Change to DEBUG level
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Should now appear');
      logger.info('Should still appear');

      expect(console.debug).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(2);

      // Change back to INFO level
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Should not appear again');
      logger.info('Should still appear');

      expect(console.debug).toHaveBeenCalledTimes(1); // No new debug calls
      expect(console.info).toHaveBeenCalledTimes(3);
    });
  });
});