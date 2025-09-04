import { Plugin } from 'obsidian';
import { JournalPluginSettings, DEFAULT_SETTINGS } from './models/types';
import { JournalPluginSettingTab } from './settings/settingsTab';
import { NoteProcessor } from './services/noteProcessor';
import { JournalManager } from './services/journalManager';
import { Scheduler } from './services/scheduler';
import { DateUtils } from './utils/dateUtils';
import { logger, LogLevel } from './utils/logger';

export default class JournalPlugin extends Plugin {
  settings: JournalPluginSettings;
  noteProcessor: NoteProcessor;
  journalManager: JournalManager;
  scheduler: Scheduler;

  async onload() {
    logger.info('Loading Daily Notes to Journal plugin');
    
    try {
      // Load settings
      await this.loadSettings();
      
      // Initialize services
      this.initializeServices();
      
      // Add settings tab
      this.addSettingTab(new JournalPluginSettingTab(this.app, this));
      
      // Add commands
      this.addCommands();
      
      // Start scheduler
      this.scheduler.start();
      
      logger.info('Plugin loaded successfully');
    } catch (error) {
      logger.error('Failed to load plugin:', error);
      throw error;
    }
  }

  async onunload() {
    logger.info('Unloading Daily Notes to Journal plugin');
    
    // Stop scheduler
    if (this.scheduler) {
      this.scheduler.stop();
    }
    
    logger.info('Plugin unloaded');
  }

  private initializeServices(): void {
    // Initialize note processor
    this.noteProcessor = new NoteProcessor(this.app, this.settings);
    
    // Initialize journal manager
    this.journalManager = new JournalManager(this.app, this.settings);
    
    // Initialize scheduler
    this.scheduler = new Scheduler(
      this.app,
      this.settings,
      this.noteProcessor,
      this.journalManager
    );
    
    logger.debug('Services initialized');
  }

  private addCommands(): void {
    // Command to process notes manually
    this.addCommand({
      id: 'process-notes-now',
      name: 'Process daily notes now',
      callback: async () => {
        try {
          logger.info('Manual processing triggered');
          const result = await this.scheduler.processNotes();
          
          if (result.success) {
            this.showNotice(`✅ Processed ${result.processed} notes in ${(result.duration / 1000).toFixed(1)}s`);
          } else {
            this.showNotice(`❌ Processing failed: ${result.errors[0] || 'Unknown error'}`);
          }
        } catch (error) {
          logger.error('Manual processing failed:', error);
          this.showNotice(`❌ Processing failed: ${error.message}`);
        }
      }
    });

    // Command to process only the latest daily note for testing
    this.addCommand({
      id: 'process-latest-note',
      name: 'Process latest daily note (test)',
      callback: async () => {
        try {
          logger.info('Latest note processing triggered for testing');
          const result = await this.scheduler.processLatestNote();
          
          if (result.success && result.processed > 0) {
            this.showNotice(`✅ Processed latest note in ${(result.duration / 1000).toFixed(1)}s`);
          } else if (result.success && result.processed === 0) {
            this.showNotice(`ℹ️ ${result.errors[0] || 'No notes to process'}`);
          } else {
            this.showNotice(`❌ Processing failed: ${result.errors[0] || 'Unknown error'}`);
          }
        } catch (error) {
          logger.error('Latest note processing failed:', error);
          this.showNotice(`❌ Processing failed: ${error.message}`);
        }
      }
    });

    // Command to find and show latest daily note info
    this.addCommand({
      id: 'show-latest-note-info',
      name: 'Show latest daily note info',
      callback: async () => {
        try {
          const latestNote = await this.noteProcessor.findMostRecentDailyNote();
          
          if (!latestNote) {
            this.showNotice('ℹ️ No daily notes found from the past');
            return;
          }

          let message = `📄 Latest Daily Note Found:\n`;
          message += `• File: ${latestNote.file}\n`;
          message += `• Date: ${latestNote.date}\n`;
          message += `• Entries: ${latestNote.entries.length} log entries\n`;
          message += `• Coordinates: ${latestNote.coordinates.length} locations`;
          
          if (latestNote.entries.length > 0) {
            message += `\n\n🔍 Preview:\n${latestNote.entries[0].content.substring(0, 100)}...`;
          }
          
          this.showNotice(message, 8000);
        } catch (error) {
          logger.error('Failed to find latest note:', error);
          this.showNotice(`❌ Failed to find latest note: ${error.message}`);
        }
      }
    });

    // Command to test AI connection
    this.addCommand({
      id: 'test-ai-connection',
      name: 'Test AI connection',
      callback: async () => {
        try {
          const result = await this.scheduler.testAIConnection();
          
          if (result.success) {
            this.showNotice('✅ AI connection successful!');
          } else {
            this.showNotice(`❌ AI connection failed: ${result.error}`);
          }
        } catch (error) {
          logger.error('AI connection test failed:', error);
          this.showNotice(`❌ Test failed: ${error.message}`);
        }
      }
    });

    // Command to show processing status
    this.addCommand({
      id: 'show-processing-status',
      name: 'Show processing status',
      callback: () => {
        const status = this.scheduler.getStatus();
        const stats = this.noteProcessor.getProcessingStats();
        
        let message = `📊 Processing Status:\n`;
        message += `• Scheduler: ${status.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
        message += `• Currently processing: ${status.isProcessing ? 'Yes' : 'No'}\n`;
        message += `• Total processed: ${stats.totalProcessed} notes\n`;
        
        if (status.lastProcessingTime) {
          message += `• Last run: ${status.lastProcessingTime.toLocaleString()}\n`;
        }
        
        if (status.nextProcessingTime) {
          message += `• Next run: ${status.nextProcessingTime.toLocaleString()}\n`;
        }
        
        this.showNotice(message, 8000);
      }
    });

    // Command to reset processing history
    this.addCommand({
      id: 'reset-processing-history',
      name: 'Reset processing history (no-op)',
      callback: async () => {
        // Processing is now dynamic, so this is a no-op
        this.noteProcessor.resetProcessingHistory();
        this.showNotice('ℹ️ Processing is now dynamic - delete journal files to reprocess');
      }
    });

    // Command to validate configuration
    this.addCommand({
      id: 'validate-configuration',
      name: 'Validate configuration',
      callback: async () => {
        const validation = await this.scheduler.validateConfiguration();
        
        if (validation.valid) {
          this.showNotice('✅ Configuration is valid!');
        } else {
          let message = '❌ Configuration errors:\n';
          message += validation.errors.map(e => `• ${e}`).join('\n');
          
          if (validation.warnings.length > 0) {
            message += '\n⚠️ Warnings:\n';
            message += validation.warnings.map(w => `• ${w}`).join('\n');
          }
          
          this.showNotice(message, 10000);
        }
      }
    });

    // Debug command to test filename generation
    this.addCommand({
      id: 'debug-filename-generation',
      name: 'Debug filename generation',
      callback: () => {
        const testDate = new Date('2024-02-17');
        const template = this.settings.journalFileNameFormat;
        
        logger.info('=== Debugging Filename Generation ===');
        logger.info(`Test date: ${testDate.toISOString()}`);
        logger.info(`Template: ${template}`);
        logger.info(`Destination folder: ${this.settings.destinationFolder}`);
        
        const result = DateUtils.generateFilename(testDate, template);
        logger.info(`Generated filename: ${result}`);
        
        const fullPath = `${this.settings.destinationFolder}/${result}`;
        logger.info(`Full path: ${fullPath}`);
        
        this.showNotice(`Debug info logged to console.\nGenerated: ${result}\nFull path: ${fullPath}`, 8000);
      }
    });
  }

  async loadSettings() {
    const loadedSettings = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
    
    logger.debug('Settings loaded');
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update services with new settings
    if (this.noteProcessor) {
      this.noteProcessor.updateSettings(this.settings);
    }
    
    if (this.journalManager) {
      this.journalManager.updateSettings(this.settings);
    }
    
    if (this.scheduler) {
      this.scheduler.updateSettings(this.settings);
    }
    
    logger.debug('Settings saved and services updated');
  }

  private showNotice(message: string, timeout: number = 5000): void {
    // Create a custom notice element for multi-line messages
    const noticeEl = document.createElement('div');
    noticeEl.className = 'notice';
    noticeEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      color: var(--text-normal);
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: var(--shadow-s);
      z-index: 1000;
      max-width: 400px;
      white-space: pre-line;
      font-family: var(--font-interface);
      font-size: var(--font-ui-small);
      line-height: 1.4;
    `;
    
    noticeEl.textContent = message;
    
    document.body.appendChild(noticeEl);
    
    // Auto-remove after timeout
    setTimeout(() => {
      if (noticeEl.parentNode) {
        noticeEl.remove();
      }
    }, timeout);
    
    // Add click to dismiss
    noticeEl.addEventListener('click', () => noticeEl.remove());
  }

  /**
   * Get plugin statistics
   */
  async getPluginStats(): Promise<{
    processed: number;
    journals: number;
    status: string;
    lastRun?: string;
  }> {
    const stats = this.noteProcessor.getProcessingStats();
    const journalStats = await this.journalManager.getJournalStats();
    const status = this.scheduler.getStatus();
    
    return {
      processed: stats.totalProcessed,
      journals: journalStats.totalJournals,
      status: status.isRunning ? 'Running' : 'Stopped',
      lastRun: status.lastProcessingTime?.toISOString()
    };
  }

  /**
   * Process a specific note file
   */
  async processSpecificNote(filePath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return await this.scheduler.processSpecificNote(filePath);
  }

  /**
   * Enable debug logging
   */
  enableDebugLogging(): void {
    logger.setLogLevel(LogLevel.DEBUG);
    logger.info('Debug logging enabled');
  }

  /**
   * Disable debug logging
   */
  disableDebugLogging(): void {
    logger.setLogLevel(LogLevel.INFO);
    logger.info('Debug logging disabled');
  }
}