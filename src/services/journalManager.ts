import { App, TFile } from 'obsidian';
import { JournalPluginSettings, DailyNote, JournalEntry, Coordinate, Sentiment } from '../models/types';
import { DateUtils } from '../utils/dateUtils';
import { FileUtils } from '../utils/fileUtils';
import { CoordinateParser } from '../utils/coordinateParser';
import { logger } from '../utils/logger';

export class JournalManager {
  private app: App;
  private settings: JournalPluginSettings;

  constructor(app: App, settings: JournalPluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Create a journal entry from processed AI content
   */
  async createJournalEntry(
    dailyNote: DailyNote,
    processedContent: string,
    sentiment?: Sentiment
  ): Promise<JournalEntry> {
    logger.debug(`Creating journal entry for date: ${dailyNote.date}`);

    try {
      // Parse the date string as local date (not UTC) to avoid timezone issues
      // dailyNote.date is in format "YYYY-MM-DD"
      const dateParts = dailyNote.date.split('-');
      const date = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]) // day
      );
      logger.debug(`Parsed date: ${date.toISOString()}`);
      logger.debug(`Local date components: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      logger.debug(`Journal filename format: ${this.settings.journalFileNameFormat}`);
      logger.debug(`Destination folder: ${this.settings.destinationFolder}`);
      
      // Generate journal filename
      const journalFileName = DateUtils.generateFilename(date, this.settings.journalFileNameFormat);
      logger.debug(`Generated filename: ${journalFileName}`);
      
      const journalPath = `${this.settings.destinationFolder}/${journalFileName}`;
      logger.debug(`Full journal path: ${journalPath}`);

      // Create journal entry object
      const journalEntry: JournalEntry = {
        title: this.generateTitle(date),
        content: processedContent,
        date: dailyNote.date,
        coordinates: dailyNote.coordinates,
        sourceFile: dailyNote.file,
        sentiment: sentiment
      };

      // Format the journal content with metadata
      const formattedContent = this.formatJournalContent(journalEntry);

      // Ensure destination folder exists
      await FileUtils.ensureFolder(this.app, this.settings.destinationFolder);

      // Create or update the journal file
      if (FileUtils.fileExists(this.app, journalPath)) {
        logger.info(`Updating existing journal entry: ${journalPath}`);
        const existingFile = this.app.vault.getAbstractFileByPath(journalPath) as TFile;
        await FileUtils.updateFile(this.app, existingFile, formattedContent);
      } else {
        logger.info(`Creating new journal entry: ${journalPath}`);
        await FileUtils.createFile(this.app, journalPath, formattedContent);
      }

      logger.logFileOperation('created/updated', journalPath);
      
      return journalEntry;

    } catch (error) {
      logger.error(`Failed to create journal entry for ${dailyNote.date}:`, error);
      throw new Error(`Failed to create journal entry: ${error.message}`);
    }
  }

  /**
   * Format journal content with frontmatter and structure
   */
  private formatJournalContent(journalEntry: JournalEntry): string {
    const frontmatter: Record<string, any> = {
      date: journalEntry.date,
      source: journalEntry.sourceFile,
      created: new Date().toISOString()
    };

    // Add sentiment if provided
    if (journalEntry.sentiment) {
      frontmatter.sentiment = journalEntry.sentiment;
    }

    // Add location information if coordinates exist
    if (journalEntry.coordinates.length > 0) {
      const locationYaml = CoordinateParser.formatCoordinatesForYaml(journalEntry.coordinates);
      if (locationYaml) {
        // Parse the location YAML and add to frontmatter
        if (journalEntry.coordinates.length === 1) {
          frontmatter.location = `[${journalEntry.coordinates[0].lat}, ${journalEntry.coordinates[0].lng}]`;
        } else {
          frontmatter.locations = journalEntry.coordinates.map(coord => 
            `[${coord.lat}, ${coord.lng}]`
          );
        }
      }
    }

    // Format the main content
    let content = journalEntry.content;

    // Ensure proper paragraph spacing
    content = content.replace(/\n{3,}/g, '\n\n');

    // Add title if specified in format
    const finalContent = journalEntry.title ? 
      `# ${journalEntry.title}\n\n${content}` : 
      content;

    return FileUtils.addFrontmatter(finalContent, frontmatter);
  }

  /**
   * Generate a title for the journal entry
   */
  private generateTitle(date: Date): string {
    const dateString = DateUtils.formatDate(date, 'MMMM Do, YYYY');
    return dateString;
  }

  /**
   * Get existing journal entry for a date
   */
  async getExistingJournalEntry(date: Date): Promise<{
    exists: boolean;
    file?: TFile;
    content?: string;
  }> {
    const journalFileName = DateUtils.generateFilename(date, this.settings.journalFileNameFormat);
    const journalPath = `${this.settings.destinationFolder}/${journalFileName}`;

    if (!FileUtils.fileExists(this.app, journalPath)) {
      return { exists: false };
    }

    const file = this.app.vault.getAbstractFileByPath(journalPath) as TFile;
    const content = await FileUtils.readFile(this.app, file);

    return {
      exists: true,
      file,
      content
    };
  }

  /**
   * Backup an existing journal entry before overwriting
   */
  async backupJournalEntry(file: TFile): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${file.path}.backup-${timestamp}`;
    
    const content = await FileUtils.readFile(this.app, file);
    await FileUtils.createFile(this.app, backupPath, content);
    
    logger.info(`Created backup: ${backupPath}`);
    return backupPath;
  }

  /**
   * Validate destination folder and create if needed
   */
  async validateAndCreateDestination(): Promise<{
    valid: boolean;
    error?: string;
    created?: boolean;
  }> {
    try {
      const folder = await FileUtils.ensureFolder(this.app, this.settings.destinationFolder);
      
      return {
        valid: true,
        created: true
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get journal statistics
   */
  async getJournalStats(): Promise<{
    totalJournals: number;
    recentJournals: string[];
  }> {
    try {
      const files = FileUtils.getFilesInFolder(this.app, this.settings.destinationFolder, 'md');
      
      // Sort files by modification time (most recent first)
      const sortedFiles = files
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, 10); // Get 10 most recent

      return {
        totalJournals: files.length,
        recentJournals: sortedFiles.map(f => f.name)
      };
    } catch (error) {
      logger.error('Error getting journal stats:', error);
      return {
        totalJournals: 0,
        recentJournals: []
      };
    }
  }

  /**
   * Preview journal content before creation
   */
  previewJournalContent(
    dailyNote: DailyNote,
    processedContent: string,
    sentiment?: Sentiment
  ): string {
    const date = new Date(dailyNote.date);
    
    const journalEntry: JournalEntry = {
      title: this.generateTitle(date),
      content: processedContent,
      date: dailyNote.date,
      coordinates: dailyNote.coordinates,
      sourceFile: dailyNote.file,
      sentiment: sentiment
    };

    return this.formatJournalContent(journalEntry);
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: JournalPluginSettings): void {
    this.settings = newSettings;
    logger.debug('Updated journal manager settings');
  }

  /**
   * Clean up old journal entries (if needed)
   */
  async cleanupOldJournals(daysToKeep?: number): Promise<number> {
    if (!daysToKeep) {
      return 0;
    }

    try {
      const files = FileUtils.getFilesInFolder(this.app, this.settings.destinationFolder, 'md');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      for (const file of files) {
        if (file.stat.mtime < cutoffDate.getTime()) {
          await this.app.vault.delete(file);
          deletedCount++;
          logger.info(`Deleted old journal: ${file.path}`);
        }
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old journals:', error);
      throw error;
    }
  }
}