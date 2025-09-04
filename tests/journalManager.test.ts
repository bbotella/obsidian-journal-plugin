import { JournalManager } from '../src/services/journalManager';
import { JournalPluginSettings, DailyNote, JournalEntry } from '../src/models/types';
import { DateUtils } from '../src/utils/dateUtils';
import { FileUtils } from '../src/utils/fileUtils';
import { CoordinateParser } from '../src/utils/coordinateParser';
import { TFile } from 'obsidian';

// Mock dependencies
jest.mock('../src/utils/dateUtils');
jest.mock('../src/utils/fileUtils');
jest.mock('../src/utils/coordinateParser');

// Mock Obsidian
const mockVault = {
  getAbstractFileByPath: jest.fn(),
  delete: jest.fn()
};

const mockApp = {
  vault: mockVault
};

describe('JournalManager', () => {
  let manager: JournalManager;
  let mockSettings: JournalPluginSettings;

  // Mock implementations
  const MockDateUtils = DateUtils as jest.Mocked<typeof DateUtils>;
  const MockFileUtils = FileUtils as jest.Mocked<typeof FileUtils>;
  const MockCoordinateParser = CoordinateParser as jest.Mocked<typeof CoordinateParser>;

  beforeEach(() => {
    mockSettings = {
      sourceFolder: 'Daily Notes',
      dateFormat: 'YYYY-MM-DD',
      destinationFolder: 'Journal',
      journalFileNameFormat: 'Journal-YYYY-MM-DD.md',
      aiProvider: 'openai',
      aiConfig: {
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4'
      },
      outputLanguage: 'auto',
      checkFrequency: 60,
      customPrompt: 'Transform this content'
    };

    manager = new JournalManager(mockApp as any, mockSettings);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createJournalEntry', () => {
    it('should create a new journal entry successfully', async () => {
      const dailyNote: DailyNote = {
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [
          { content: 'Had breakfast and went to work' },
          { content: 'Finished the project presentation' }
        ],
        coordinates: [
          { lat: 40.7128, lng: -74.0060 }
        ]
      };

      const processedContent = 'Today was a productive day with great achievements.';

      // Mock dependencies
      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockDateUtils.formatDate.mockReturnValue('September 2nd, 2025');
      MockFileUtils.fileExists.mockReturnValue(false);
      MockFileUtils.ensureFolder.mockResolvedValue(undefined);
      MockFileUtils.createFile.mockResolvedValue(undefined);
      MockFileUtils.addFrontmatter.mockReturnValue('---\ndate: 2025-09-02\n---\n\n# September 2nd, 2025\n\nToday was a productive day with great achievements.');
      MockCoordinateParser.formatCoordinatesForYaml.mockReturnValue('location yaml');

      const result = await manager.createJournalEntry(dailyNote, processedContent);

      expect(result).toEqual({
        title: 'September 2nd, 2025',
        content: processedContent,
        date: '2025-09-02',
        coordinates: dailyNote.coordinates,
        sourceFile: 'Daily Notes/2025-09-02.md'
      });

      expect(MockFileUtils.ensureFolder).toHaveBeenCalledWith(mockApp, 'Journal');
      expect(MockFileUtils.createFile).toHaveBeenCalledWith(
        mockApp,
        'Journal/Journal-2025-09-02.md',
        expect.stringContaining('Today was a productive day')
      );
    });

    it('should update existing journal entry', async () => {
      const dailyNote: DailyNote = {
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [{ content: 'Updated content' }],
        coordinates: []
      };

      const processedContent = 'Updated journal content.';
      const mockFile = new TFile();
      mockFile.path = 'Journal/Journal-2025-09-02.md';

      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockDateUtils.formatDate.mockReturnValue('September 2nd, 2025');
      MockFileUtils.fileExists.mockReturnValue(true);
      MockFileUtils.ensureFolder.mockResolvedValue(undefined);
      MockFileUtils.updateFile.mockResolvedValue(undefined);
      MockFileUtils.addFrontmatter.mockReturnValue('---\ndate: 2025-09-02\n---\n\nUpdated journal content.');
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

      const result = await manager.createJournalEntry(dailyNote, processedContent);

      expect(result.content).toBe(processedContent);
      expect(MockFileUtils.updateFile).toHaveBeenCalledWith(
        mockApp,
        mockFile,
        expect.stringContaining('Updated journal content')
      );
    });

    it('should handle coordinates in frontmatter correctly', async () => {
      const dailyNote: DailyNote = {
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [{ content: 'Content with location' }],
        coordinates: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 39.9526, lng: -75.1652 }
        ]
      };

      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockDateUtils.formatDate.mockReturnValue('September 2nd, 2025');
      MockFileUtils.fileExists.mockReturnValue(false);
      MockFileUtils.ensureFolder.mockResolvedValue(undefined);
      MockFileUtils.createFile.mockResolvedValue(undefined);
      MockFileUtils.addFrontmatter.mockImplementation((content, frontmatter) => {
        // Verify coordinates are processed correctly - handle floating point precision
        expect(frontmatter.locations).toEqual([
          '[40.7128, -74.006]',   // Note: JavaScript may truncate trailing zeros
          '[39.9526, -75.1652]'
        ]);
        return '---\nformatted\n---\n' + content;
      });

      await manager.createJournalEntry(dailyNote, 'Content');

      expect(MockFileUtils.addFrontmatter).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const dailyNote: DailyNote = {
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [{ content: 'Content' }],
        coordinates: []  // No coordinates to avoid assertion conflicts
      };

      // Clear any previous mock implementations
      MockFileUtils.addFrontmatter.mockReset();
      
      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockFileUtils.ensureFolder.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.createJournalEntry(dailyNote, 'Content'))
        .rejects.toThrow('Failed to create journal entry: Permission denied');
    });
  });

  describe('getExistingJournalEntry', () => {
    it('should return existing journal entry', async () => {
      const date = new Date('2025-09-02');
      const mockFile = new TFile();
      mockFile.path = 'Journal/Journal-2025-09-02.md';

      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockFileUtils.fileExists.mockReturnValue(true);
      MockFileUtils.readFile.mockResolvedValue('Journal content');
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

      const result = await manager.getExistingJournalEntry(date);

      expect(result).toEqual({
        exists: true,
        file: mockFile,
        content: 'Journal content'
      });
    });

    it('should return non-existing result when file not found', async () => {
      const date = new Date('2025-09-02');

      MockDateUtils.generateFilename.mockReturnValue('Journal-2025-09-02.md');
      MockFileUtils.fileExists.mockReturnValue(false);

      const result = await manager.getExistingJournalEntry(date);

      expect(result).toEqual({ exists: false });
    });
  });

  describe('backupJournalEntry', () => {
    it('should create backup of journal entry', async () => {
      const mockFile = new TFile();
      mockFile.path = 'Journal/Journal-2025-09-02.md';

      MockFileUtils.readFile.mockResolvedValue('Original content');
      MockFileUtils.createFile.mockResolvedValue(undefined);

      const backupPath = await manager.backupJournalEntry(mockFile);

      expect(backupPath).toMatch(/\.backup-/);
      expect(MockFileUtils.createFile).toHaveBeenCalledWith(
        mockApp,
        expect.stringMatching(/\.backup-/),
        'Original content'
      );
    });
  });

  describe('validateAndCreateDestination', () => {
    it('should create destination folder successfully', async () => {
      MockFileUtils.ensureFolder.mockResolvedValue(undefined);

      const result = await manager.validateAndCreateDestination();

      expect(result).toEqual({
        valid: true,
        created: true
      });
      expect(MockFileUtils.ensureFolder).toHaveBeenCalledWith(mockApp, 'Journal');
    });

    it('should handle creation errors', async () => {
      MockFileUtils.ensureFolder.mockRejectedValue(new Error('Permission denied'));

      const result = await manager.validateAndCreateDestination();

      expect(result).toEqual({
        valid: false,
        error: 'Permission denied'
      });
    });
  });

  describe('getJournalStats', () => {
    it('should return journal statistics', async () => {
      const mockFile1 = new TFile();
      mockFile1.name = 'Journal-2025-09-02.md';
      mockFile1.stat = { mtime: 1693670400000 } as any;
      
      const mockFile2 = new TFile();
      mockFile2.name = 'Journal-2025-09-01.md';
      mockFile2.stat = { mtime: 1693584000000 } as any;

      const mockFiles = [mockFile1, mockFile2];

      MockFileUtils.getFilesInFolder.mockReturnValue(mockFiles);

      const result = await manager.getJournalStats();

      expect(result).toEqual({
        totalJournals: 2,
        recentJournals: ['Journal-2025-09-02.md', 'Journal-2025-09-01.md']
      });
    });

    it('should handle empty folder', async () => {
      MockFileUtils.getFilesInFolder.mockReturnValue([]);

      const result = await manager.getJournalStats();

      expect(result).toEqual({
        totalJournals: 0,
        recentJournals: []
      });
    });

    it('should handle errors gracefully', async () => {
      MockFileUtils.getFilesInFolder.mockImplementation(() => {
        throw new Error('Folder not found');
      });

      const result = await manager.getJournalStats();

      expect(result).toEqual({
        totalJournals: 0,
        recentJournals: []
      });
    });
  });

  describe('previewJournalContent', () => {
    it('should generate preview content', () => {
      const dailyNote: DailyNote = {
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [{ content: 'Sample content' }],
        coordinates: []
      };

      MockDateUtils.formatDate.mockReturnValue('September 2nd, 2025');
      MockFileUtils.addFrontmatter.mockReturnValue('---\ndate: 2025-09-02\n---\n\n# September 2nd, 2025\n\nPreview content');

      const result = manager.previewJournalContent(dailyNote, 'Preview content');

      expect(result).toContain('Preview content');
      expect(MockFileUtils.addFrontmatter).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings', () => {
      const newSettings = {
        ...mockSettings,
        destinationFolder: 'New Journal Folder'
      };

      expect(() => manager.updateSettings(newSettings)).not.toThrow();
    });
  });

  describe('cleanupOldJournals', () => {
    it('should delete old journal entries', async () => {
      const oldDate = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
      const recentDate = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago

      const mockOldFile = new TFile();
      mockOldFile.name = 'old-journal.md';
      mockOldFile.path = 'Journal/old-journal.md';
      mockOldFile.stat = { mtime: oldDate } as any;
      
      const mockRecentFile = new TFile();
      mockRecentFile.name = 'recent-journal.md';
      mockRecentFile.path = 'Journal/recent-journal.md';
      mockRecentFile.stat = { mtime: recentDate } as any;

      const mockFiles = [mockOldFile, mockRecentFile];

      MockFileUtils.getFilesInFolder.mockReturnValue(mockFiles);
      mockVault.delete.mockResolvedValue(undefined);

      const result = await manager.cleanupOldJournals(7); // Keep 7 days

      expect(result).toBe(1); // Only one old file deleted
      expect(mockVault.delete).toHaveBeenCalledWith(mockOldFile);
      expect(mockVault.delete).not.toHaveBeenCalledWith(mockRecentFile);
    });

    it('should return 0 when no daysToKeep specified', async () => {
      const result = await manager.cleanupOldJournals();

      expect(result).toBe(0);
      expect(MockFileUtils.getFilesInFolder).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      MockFileUtils.getFilesInFolder.mockImplementation(() => {
        throw new Error('Folder access error');
      });

      await expect(manager.cleanupOldJournals(7)).rejects.toThrow('Folder access error');
    });
  });
});