import { App } from 'obsidian';
import { JournalPluginSettings } from '../models/types';
import { NoteProcessor } from './noteProcessor';
import { JournalManager } from './journalManager';
import { AIServiceFactory } from './ai/aiServiceFactory';
import { logger } from '../utils/logger';

export interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: string[];
  duration: number;
}

export class Scheduler {
  private app: App;
  private settings: JournalPluginSettings;
  private noteProcessor: NoteProcessor;
  private journalManager: JournalManager;
  private intervalId: number | null = null;
  private isProcessing = false;
  private lastProcessingTime: Date | null = null;

  constructor(
    app: App,
    settings: JournalPluginSettings,
    noteProcessor: NoteProcessor,
    journalManager: JournalManager
  ) {
    this.app = app;
    this.settings = settings;
    this.noteProcessor = noteProcessor;
    this.journalManager = journalManager;
  }

  /**
   * Start the periodic processing
   */
  start(): void {
    this.stop(); // Stop any existing interval
    
    if (this.settings.checkFrequency <= 0) {
      logger.warn('Invalid check frequency, scheduling disabled');
      return;
    }

    const intervalMs = this.settings.checkFrequency * 60 * 1000; // Convert minutes to milliseconds
    
    logger.info(`Starting scheduler with ${this.settings.checkFrequency} minute intervals`);
    
    this.intervalId = window.setInterval(() => {
      this.processNotes();
    }, intervalMs);

    // Run initial processing after a short delay
    setTimeout(() => {
      this.processNotes();
    }, 5000); // 5 second delay to allow plugin to fully initialize
  }

  /**
   * Stop the periodic processing
   */
  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Process the most recent daily note for testing purposes
   */
  async processLatestNote(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      logger.warn('Processing already in progress, skipping');
      return {
        success: false,
        processed: 0,
        errors: ['Processing already in progress'],
        duration: 0
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      logger.info('Starting latest note processing for testing');

      // Find the most recent daily note
      const mostRecentNote = await this.noteProcessor.findMostRecentDailyNote();
      
      if (!mostRecentNote) {
        logger.info('No recent daily note found to process');
        return {
          success: true,
          processed: 0,
          errors: ['No recent daily note found'],
          duration: Date.now() - startTime
        };
      }

      logger.info(`Processing latest note: ${mostRecentNote.file}`);

      // Create AI service
      const aiService = AIServiceFactory.createService(this.settings.aiProvider, this.settings.aiConfig);

      // Prepare content for AI processing
      const logContent = this.prepareContentForAI(mostRecentNote);
      
      if (!logContent.trim()) {
        logger.warn(`No content to process in: ${mostRecentNote.file}`);
        return {
          success: false,
          processed: 0,
          errors: ['No processable content found in the note'],
          duration: Date.now() - startTime
        };
      }

      // Process with AI
      const aiResponse = await aiService.processContent(
        logContent,
        this.settings.customPrompt,
        this.settings.outputLanguage === 'auto' ? undefined : this.settings.outputLanguage
      );

      // Create journal entry
      await this.journalManager.createJournalEntry(mostRecentNote, aiResponse.content, aiResponse.sentiment);

      // No need to mark as processed - we use dynamic checking now

      this.lastProcessingTime = new Date();
      
      const duration = Date.now() - startTime;
      const result: ProcessingResult = {
        success: true,
        processed: 1,
        errors: [],
        duration
      };

      logger.info(`Successfully processed latest note: ${mostRecentNote.file}`);
      logger.logProcessingStats(1, 0, 0);
      
      return result;

    } catch (error) {
      const errorMessage = `Latest note processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMessage, error);
      
      return {
        success: false,
        processed: 0,
        errors: [errorMessage, ...errors],
        duration: Date.now() - startTime
      };
    } finally {
      this.isProcessing = false;
    }
  }
  async processNotes(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      logger.warn('Processing already in progress, skipping');
      return {
        success: false,
        processed: 0,
        errors: ['Processing already in progress'],
        duration: 0
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    let processedCount = 0;
    const errors: string[] = [];

    try {
      logger.info('Starting note processing cycle');

      // Find unprocessed daily notes
      const unprocessedNotes = await this.noteProcessor.findUnprocessedDailyNotes();
      
      if (unprocessedNotes.length === 0) {
        logger.info('No notes to process');
        return {
          success: true,
          processed: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      logger.info(`Found ${unprocessedNotes.length} notes to process`);

      // Create AI service
      const aiService = AIServiceFactory.createService(this.settings.aiProvider, this.settings.aiConfig);

      // Process each note
      for (const dailyNote of unprocessedNotes) {
        try {
          logger.debug(`Processing note: ${dailyNote.file}`);

          // Prepare content for AI processing
          const logContent = this.prepareContentForAI(dailyNote);
          
          if (!logContent.trim()) {
            logger.warn(`No content to process in: ${dailyNote.file}`);
            continue;
          }

          // Process with AI
          const aiResponse = await aiService.processContent(
            logContent,
            this.settings.customPrompt,
            this.settings.outputLanguage === 'auto' ? undefined : this.settings.outputLanguage
          );

          // Create journal entry
          await this.journalManager.createJournalEntry(dailyNote, aiResponse.content, aiResponse.sentiment);

          // No need to mark as processed - we use dynamic checking now

          processedCount++;
          logger.info(`Successfully processed: ${dailyNote.file}`);

        } catch (error) {
          const errorMessage = `Failed to process ${dailyNote.file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(errorMessage, error);
          errors.push(errorMessage);
        }
      }

      this.lastProcessingTime = new Date();
      
      const duration = Date.now() - startTime;
      const result: ProcessingResult = {
        success: errors.length === 0,
        processed: processedCount,
        errors,
        duration
      };

      logger.logProcessingStats(processedCount, unprocessedNotes.length - processedCount, errors.length);
      
      return result;

    } catch (error) {
      const errorMessage = `Processing cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMessage, error);
      
      return {
        success: false,
        processed: processedCount,
        errors: [errorMessage, ...errors],
        duration: Date.now() - startTime
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Prepare daily note content for AI processing
   */
  private prepareContentForAI(dailyNote: any): string {
    const entries = dailyNote.entries || [];
    
    if (entries.length === 0) {
      return '';
    }

    // Join all log entries with newlines
    const logEntries = entries.map((entry: any) => entry.content).join('\n');
    
    return logEntries.trim();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    lastProcessingTime: Date | null;
    nextProcessingTime: Date | null;
  } {
    let nextProcessingTime: Date | null = null;
    
    if (this.intervalId !== null && this.lastProcessingTime) {
      nextProcessingTime = new Date(
        this.lastProcessingTime.getTime() + (this.settings.checkFrequency * 60 * 1000)
      );
    }

    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      lastProcessingTime: this.lastProcessingTime,
      nextProcessingTime
    };
  }

  /**
   * Update settings and restart if needed
   */
  updateSettings(newSettings: JournalPluginSettings): void {
    const wasRunning = this.intervalId !== null;
    const frequencyChanged = this.settings.checkFrequency !== newSettings.checkFrequency;
    
    this.settings = newSettings;
    this.noteProcessor.updateSettings(newSettings);
    this.journalManager.updateSettings(newSettings);

    // Restart scheduler if frequency changed
    if (wasRunning && frequencyChanged) {
      logger.info('Restarting scheduler due to frequency change');
      this.start();
    }
  }

  /**
   * Test AI service connection
   */
  async testAIConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await AIServiceFactory.testConnection(this.settings.aiProvider, this.settings.aiConfig);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate all configurations
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate AI configuration
    const aiErrors = AIServiceFactory.validateConfiguration(this.settings.aiProvider, this.settings.aiConfig);
    errors.push(...aiErrors);

    // Validate source folder
    const sourceValidation = await this.noteProcessor.validateSourceFolder();
    if (!sourceValidation.valid) {
      errors.push(`Source folder error: ${sourceValidation.error}`);
    } else if (sourceValidation.fileCount === 0) {
      warnings.push('Source folder contains no markdown files');
    }

    // Validate destination folder
    const destValidation = await this.journalManager.validateAndCreateDestination();
    if (!destValidation.valid) {
      errors.push(`Destination folder error: ${destValidation.error}`);
    }

    // Validate frequency
    if (this.settings.checkFrequency <= 0) {
      errors.push('Check frequency must be greater than 0');
    }

    // Validate prompt
    if (!this.settings.customPrompt.trim()) {
      warnings.push('Custom prompt is empty, using default behavior');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Force processing of a specific note by deleting its journal counterpart
   */
  async processSpecificNote(filePath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // With dynamic checking, we'd need to delete the corresponding journal file
      // to force reprocessing. For now, just run the processing cycle as-is.
      // The user could manually delete the journal file if they want to reprocess.
      
      // Run processing cycle
      const result = await this.processNotes();
      
      return {
        success: result.success && result.processed > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}