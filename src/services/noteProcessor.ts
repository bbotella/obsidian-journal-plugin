import { App, TFile } from 'obsidian';
import { JournalPluginSettings, DailyNote, DailyNoteEntry, Coordinate } from '../models/types';
import { DateUtils } from '../utils/dateUtils';
import { FileUtils } from '../utils/fileUtils';
import { CoordinateParser } from '../utils/coordinateParser';
import { logger } from '../utils/logger';

export class NoteProcessor {
  private app: App;
  private settings: JournalPluginSettings;

  constructor(app: App, settings: JournalPluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Find the most recent daily note (excluding today) for testing
   */
  async findMostRecentDailyNote(): Promise<DailyNote | null> {
    logger.debug('Finding most recent daily note for testing');
    
    try {
      // Get all markdown files in the source folder
      const files = FileUtils.getFilesInFolder(this.app, this.settings.sourceFolder, 'md');
      
      let mostRecentNote: { file: TFile, date: Date } | null = null;

      for (const file of files) {
        try {
          // Parse date from filename
          const date = DateUtils.parseDateFromFilename(file.name, this.settings.dateFormat);
          
          if (!date) {
            logger.debug(`Could not parse date from filename: ${file.name}`);
            continue;
          }

          // Only consider notes from the past (before today)
          if (!DateUtils.isBeforeToday(date)) {
            logger.debug(`Skipping future/today note: ${file.name}`);
            continue;
          }

          // Keep track of the most recent past date
          if (!mostRecentNote || date > mostRecentNote.date) {
            mostRecentNote = { file, date };
          }
          
        } catch (error) {
          logger.error(`Error processing file ${file.name}:`, error);
        }
      }

      if (!mostRecentNote) {
        logger.info('No past daily notes found for testing');
        return null;
      }

      logger.info(`Found most recent daily note: ${mostRecentNote.file.name} (${mostRecentNote.date.toDateString()})`);

      // Check if corresponding journal entry already exists
      if (await this.journalEntryExists(mostRecentNote.date)) {
        logger.info(`Journal already exists for date: ${DateUtils.formatDate(mostRecentNote.date, this.settings.dateFormat)}`);
        return null;
      }

      // Parse the note content
      const dailyNote = await this.parseDailyNote(mostRecentNote.file, mostRecentNote.date);
      
      if (dailyNote.entries.length === 0) {
        logger.debug(`No log entries found in: ${mostRecentNote.file.name}`);
        return null;
      }

      return dailyNote;
      
    } catch (error) {
      logger.error('Error finding most recent daily note:', error);
      throw new Error(`Failed to find recent daily note: ${error.message}`);
    }
  }
  async findUnprocessedDailyNotes(): Promise<DailyNote[]> {
    logger.debug('Scanning for unprocessed daily notes');
    
    try {
      // Get all markdown files in the source folder
      const files = FileUtils.getFilesInFolder(this.app, this.settings.sourceFolder, 'md');
      
      const unprocessedNotes: DailyNote[] = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const file of files) {
        try {
          // Parse date from filename
          const date = DateUtils.parseDateFromFilename(file.name, this.settings.dateFormat);
          
          if (!date) {
            logger.debug(`Could not parse date from filename: ${file.name}`);
            skippedCount++;
            continue;
          }

          // Only process notes from the past (before today)
          if (!DateUtils.isBeforeToday(date)) {
            logger.debug(`Skipping future/today note: ${file.name}`);
            skippedCount++;
            continue;
          }

          // Check if corresponding journal entry already exists
          if (await this.journalEntryExists(date)) {
            logger.debug(`Journal already exists for date: ${DateUtils.formatDate(date, this.settings.dateFormat)}`);
            skippedCount++;
            continue;
          }

          // Parse the note content
          const dailyNote = await this.parseDailyNote(file, date);
          
          if (dailyNote.entries.length === 0) {
            logger.debug(`No log entries found in: ${file.name}`);
            skippedCount++;
            continue;
          }

          unprocessedNotes.push(dailyNote);
          processedCount++;
          
        } catch (error) {
          logger.error(`Error processing file ${file.name}:`, error);
          skippedCount++;
        }
      }

      logger.logProcessingStats(processedCount, skippedCount, 0);
      logger.info(`Found ${unprocessedNotes.length} daily notes to process`);
      
      return unprocessedNotes;
      
    } catch (error) {
      logger.error('Error scanning for daily notes:', error);
      throw new Error(`Failed to scan daily notes: ${error.message}`);
    }
  }

  /**
   * Parse a daily note file into structured data
   */
  private async parseDailyNote(file: TFile, date: Date): Promise<DailyNote> {
    const content = await FileUtils.readFile(this.app, file);
    const entries = this.parseLogEntries(content);
    const coordinates = CoordinateParser.extractCoordinates(content);

    return {
      file: file.path,
      date: DateUtils.formatDate(date, 'YYYY-MM-DD'),
      entries,
      coordinates
    };
  }

  /**
   * Parse log entries from note content
   */
  private parseLogEntries(content: string): DailyNoteEntry[] {
    const entries: DailyNoteEntry[] = [];
    
    // Remove frontmatter
    const { body } = FileUtils.parseFrontmatter(content);
    
    // Split content into lines and process each line
    const lines = body.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines, headers, and markdown formatting
      if (!trimmedLine || 
          trimmedLine.startsWith('#') || 
          trimmedLine.startsWith('---') ||
          trimmedLine.startsWith('<!--') ||
          trimmedLine.length < 5) {
        continue;
      }

      // Clean up markdown formatting (bullets, checkboxes, etc.)
      let cleanLine = trimmedLine
        .replace(/^[-*+]\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbered lists
        .replace(/^- \[[x\s]\]\s*/, '') // Remove checkboxes
        .replace(/^\[\s*\]\s*/, '') // Remove empty checkboxes
        .replace(/^\[x\]\s*/, '') // Remove checked boxes
        .trim();

      if (cleanLine.length < 5) {
        continue;
      }

      // Extract coordinates from this line
      const lineCoordinates = CoordinateParser.extractCoordinates(cleanLine);
      
      // Remove coordinates from content for cleaner processing
      const cleanContent = CoordinateParser.removeCoordinatesFromContent(cleanLine);
      
      if (cleanContent.trim().length > 0) {
        entries.push({
          content: cleanContent.trim(),
          coordinates: lineCoordinates.length > 0 ? lineCoordinates[0] : undefined
        });
      }
    }

    return entries;
  }

  /**
   * Check if a journal entry already exists for the given date
   */
  private async journalEntryExists(date: Date): Promise<boolean> {
    const journalFileName = DateUtils.generateFilename(date, this.settings.journalFileNameFormat);
    const journalPath = `${this.settings.destinationFolder}/${journalFileName}`;
    
    return FileUtils.fileExists(this.app, journalPath);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalProcessed: number;
    lastProcessingTime?: Date;
  } {
    // Since we no longer track processed notes, return dynamic stats
    // This could be enhanced to count actual journal files if needed
    return {
      totalProcessed: 0, // We no longer track this
      // We could add a lastProcessingTime field to settings if needed
    };
  }

  /**
   * Reset processing history (for debugging/testing)
   * Note: This is now a no-op since we use dynamic checking
   */
  resetProcessingHistory(): void {
    logger.info('Reset processing history (no-op - using dynamic checking)');
  }

  /**
   * Update settings (when settings change)
   */
  updateSettings(newSettings: JournalPluginSettings): void {
    this.settings = newSettings;
    logger.debug('Updated note processor settings');
  }

  /**
   * Validate that the source folder exists and is accessible
   */
  async validateSourceFolder(): Promise<{
    valid: boolean;
    error?: string;
    fileCount?: number;
  }> {
    try {
      const files = FileUtils.getFilesInFolder(this.app, this.settings.sourceFolder, 'md');
      
      return {
        valid: true,
        fileCount: files.length
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}