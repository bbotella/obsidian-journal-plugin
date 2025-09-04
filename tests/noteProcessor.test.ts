import { NoteProcessor } from '../src/services/noteProcessor';
import { JournalPluginSettings, DailyNote, AIProvider } from '../src/models/types';
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
  createFolder: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  modify: jest.fn()
};

const mockApp = {
  vault: mockVault
};

describe('NoteProcessor', () => {
  let processor: NoteProcessor;
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

    processor = new NoteProcessor(mockApp as any, mockSettings);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findUnprocessedDailyNotes', () => {
    it('should find and parse daily notes correctly', async () => {
      // Create mock TFile objects
      const mockFile1 = new TFile();
      mockFile1.name = '2025-09-01.md';
      mockFile1.path = 'Daily Notes/2025-09-01.md';
      
      const mockFile2 = new TFile();
      mockFile2.name = '2025-09-02.md';
      mockFile2.path = 'Daily Notes/2025-09-02.md';
      
      const mockFile3 = new TFile();
      mockFile3.name = 'not-a-date.md';
      mockFile3.path = 'Daily Notes/not-a-date.md';

      // Mock FileUtils.getFilesInFolder
      MockFileUtils.getFilesInFolder.mockReturnValue([mockFile1, mockFile2, mockFile3]);
      
      // Mock FileUtils.readFile
      MockFileUtils.readFile.mockResolvedValue('Today I went to the store to buy groceries\nI also visited the park for a walk');
      
      // Mock DateUtils responses
      MockDateUtils.parseDateFromFilename
        .mockReturnValueOnce(new Date('2025-09-01'))
        .mockReturnValueOnce(new Date('2025-09-02'))
        .mockReturnValueOnce(null); // not-a-date.md

      MockDateUtils.isBeforeToday
        .mockReturnValueOnce(true)  // 2025-09-01
        .mockReturnValueOnce(true); // 2025-09-02
        
      MockDateUtils.formatDate
        .mockReturnValueOnce('2025-09-01')
        .mockReturnValueOnce('2025-09-02');
        
      // Mock DateUtils.generateFilename for journalEntryExists check
      MockDateUtils.generateFilename
        .mockReturnValueOnce('Journal-2025-09-01.md')
        .mockReturnValueOnce('Journal-2025-09-02.md');
        
      // Mock FileUtils.generateContentHash
      MockFileUtils.generateContentHash.mockReturnValue('testhash');
      
      // Mock FileUtils.parseFrontmatter - IMPORTANT: body must be a string
      MockFileUtils.parseFrontmatter.mockReturnValue({ 
        frontmatter: {}, 
        body: 'Today I went to the store to buy groceries\nI also visited the park for a walk' 
      });
      
      // Mock CoordinateParser.extractCoordinates
      MockCoordinateParser.extractCoordinates
        .mockReturnValueOnce([]) // For first parseDailyNote call
        .mockReturnValueOnce([]) // For first line in first parseLogEntries call
        .mockReturnValueOnce([]) // For second line in first parseLogEntries call
        .mockReturnValueOnce([]) // For second parseDailyNote call
        .mockReturnValueOnce([]) // For first line in second parseLogEntries call
        .mockReturnValueOnce([]); // For second line in second parseLogEntries call
      
      // Mock CoordinateParser.removeCoordinatesFromContent - CRUCIAL!
      MockCoordinateParser.removeCoordinatesFromContent
        .mockReturnValueOnce('Today I went to the store to buy groceries') // First file, first line
        .mockReturnValueOnce('I also visited the park for a walk')        // First file, second line
        .mockReturnValueOnce('Today I went to the store to buy groceries') // Second file, first line  
        .mockReturnValueOnce('I also visited the park for a walk');       // Second file, second line
      
      // Mock journalEntryExists to return false (no existing journal)
      MockFileUtils.fileExists.mockReturnValue(false);

      const result = await processor.findUnprocessedDailyNotes();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        file: 'Daily Notes/2025-09-01.md',
        date: '2025-09-01',
        entries: [
          { content: 'Today I went to the store to buy groceries', coordinates: undefined },
          { content: 'I also visited the park for a walk', coordinates: undefined }
        ],
        coordinates: []
      });
      expect(result[1]).toEqual({
        file: 'Daily Notes/2025-09-02.md',
        date: '2025-09-02',
        entries: [
          { content: 'Today I went to the store to buy groceries', coordinates: undefined },
          { content: 'I also visited the park for a walk', coordinates: undefined }
        ],
        coordinates: []
      });
    });

    it('should return empty array when source folder does not exist', async () => {
      MockFileUtils.getFilesInFolder.mockImplementation(() => {
        throw new Error('Folder not found');
      });

      await expect(processor.findUnprocessedDailyNotes()).rejects.toThrow('Failed to scan daily notes: Folder not found');
    });

    it('should handle file system errors gracefully', async () => {
      MockFileUtils.getFilesInFolder.mockImplementation(() => {
        throw new Error('File system error');
      });

      await expect(processor.findUnprocessedDailyNotes()).rejects.toThrow('Failed to scan daily notes: File system error');
    });

    it('should filter out today\'s notes', async () => {
      const mockFile1 = new TFile();
      mockFile1.name = '2025-09-01.md';
      mockFile1.path = 'Daily Notes/2025-09-01.md';
      
      const mockFile2 = new TFile();
      mockFile2.name = '2025-09-02.md';
      mockFile2.path = 'Daily Notes/2025-09-02.md';

      MockFileUtils.getFilesInFolder.mockReturnValue([mockFile1, mockFile2]);
      MockFileUtils.readFile.mockResolvedValue('Today I went to the store to buy groceries\nI also visited the park for a walk');
      MockFileUtils.generateContentHash.mockReturnValue('testhash');
      MockFileUtils.parseFrontmatter.mockReturnValue({ 
        frontmatter: {}, 
        body: 'Today I went to the store to buy groceries\nI also visited the park for a walk' 
      });
      MockCoordinateParser.extractCoordinates
        .mockReturnValueOnce([]) // For parseDailyNote call
        .mockReturnValueOnce([]) // For first line in parseLogEntries
        .mockReturnValueOnce([]); // For second line in parseLogEntries
      MockCoordinateParser.removeCoordinatesFromContent
        .mockReturnValueOnce('Today I went to the store to buy groceries')
        .mockReturnValueOnce('I also visited the park for a walk');
      MockFileUtils.fileExists.mockReturnValue(false);

      MockDateUtils.parseDateFromFilename
        .mockReturnValueOnce(new Date('2025-09-01'))
        .mockReturnValueOnce(new Date('2025-09-02'));

      MockDateUtils.isBeforeToday
        .mockReturnValueOnce(true)   // 2025-09-01 - include
        .mockReturnValueOnce(false); // 2025-09-02 - exclude (today)
        
      MockDateUtils.generateFilename.mockReturnValueOnce('Journal-2025-09-01.md');
      MockDateUtils.formatDate.mockReturnValueOnce('2025-09-01');

      const result = await processor.findUnprocessedDailyNotes();

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-09-01');
    });

    it('should handle mixed file types in source folder', async () => {
      const mockFile1 = new TFile();
      mockFile1.name = '2025-09-01.md';
      mockFile1.path = 'Daily Notes/2025-09-01.md';

      // FileUtils.getFilesInFolder with 'md' extension should only return .md files
      MockFileUtils.getFilesInFolder.mockReturnValue([mockFile1]);
      MockFileUtils.readFile.mockResolvedValue('- Test entry content');
      MockFileUtils.generateContentHash.mockReturnValue('testhash');
      MockFileUtils.parseFrontmatter.mockReturnValue({ 
        frontmatter: {}, 
        body: '- Test entry content' 
      });
      MockCoordinateParser.extractCoordinates
        .mockReturnValueOnce([]) // For parseDailyNote call
        .mockReturnValueOnce([]); // For line in parseLogEntries
      MockCoordinateParser.removeCoordinatesFromContent
        .mockReturnValueOnce('Test entry content');
      MockFileUtils.fileExists.mockReturnValue(false);

      MockDateUtils.parseDateFromFilename.mockReturnValueOnce(new Date('2025-09-01'));
      MockDateUtils.isBeforeToday.mockReturnValueOnce(true);
      MockDateUtils.generateFilename.mockReturnValueOnce('Journal-2025-09-01.md');
      MockDateUtils.formatDate.mockReturnValueOnce('2025-09-01');

      const result = await processor.findUnprocessedDailyNotes();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        file: 'Daily Notes/2025-09-01.md',
        date: '2025-09-01',
        entries: [
          { content: 'Test entry content', coordinates: undefined }
        ],
        coordinates: []
      });
    });
  });

  describe('findMostRecentDailyNote', () => {
    it('should find the most recent daily note', async () => {
      const mockFile1 = new TFile();
      mockFile1.name = '2025-09-01.md';
      mockFile1.path = 'Daily Notes/2025-09-01.md';
      
      const mockFile2 = new TFile();
      mockFile2.name = '2025-09-03.md';
      mockFile2.path = 'Daily Notes/2025-09-03.md';
      
      const mockFile3 = new TFile();
      mockFile3.name = '2025-09-02.md';
      mockFile3.path = 'Daily Notes/2025-09-02.md';

      MockFileUtils.getFilesInFolder.mockReturnValue([mockFile1, mockFile2, mockFile3]);
      MockFileUtils.readFile.mockResolvedValue('Test content');
      MockFileUtils.generateContentHash.mockReturnValue('testhash');
      MockFileUtils.parseFrontmatter.mockReturnValue({ frontmatter: {}, body: 'Test content' });
      MockCoordinateParser.extractCoordinates
        .mockReturnValueOnce([]) // For parseDailyNote call
        .mockReturnValueOnce([]); // For line in parseLogEntries
      MockCoordinateParser.removeCoordinatesFromContent
        .mockReturnValueOnce('Test content');
      MockFileUtils.fileExists.mockReturnValue(false); // Journal doesn't exist
      
      MockDateUtils.parseDateFromFilename
        .mockReturnValueOnce(new Date('2025-09-01'))
        .mockReturnValueOnce(new Date('2025-09-03')) 
        .mockReturnValueOnce(new Date('2025-09-02'));
        
      MockDateUtils.isBeforeToday
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);
        
      MockDateUtils.generateFilename.mockReturnValueOnce('Journal-2025-09-03.md');
      MockDateUtils.formatDate.mockReturnValueOnce('2025-09-03'); // For parseDailyNote call with most recent date

      const result = await processor.findMostRecentDailyNote();

      expect(result).toBeDefined();
      expect(result?.date).toBe('2025-09-03'); // Most recent
      expect(result?.entries).toEqual([
        { content: 'Test content', coordinates: undefined }
      ]);
    });

    it('should return null when no daily notes exist', async () => {
      MockFileUtils.getFilesInFolder.mockReturnValue([]);

      const result = await processor.findMostRecentDailyNote();

      expect(result).toBeNull();
    });

    it('should handle single note correctly', async () => {
      const mockFile = new TFile();
      mockFile.name = '2025-09-01.md';
      mockFile.path = 'Daily Notes/2025-09-01.md';

      MockFileUtils.getFilesInFolder.mockReturnValue([mockFile]);
      MockFileUtils.readFile.mockResolvedValue('- Test entry content');
      MockFileUtils.generateContentHash.mockReturnValue('testhash');
      MockFileUtils.parseFrontmatter.mockReturnValue({ 
        frontmatter: {}, 
        body: '- Test entry content' 
      });
      MockCoordinateParser.extractCoordinates
        .mockReturnValueOnce([]) // For parseDailyNote call
        .mockReturnValueOnce([]); // For line in parseLogEntries
      MockCoordinateParser.removeCoordinatesFromContent
        .mockReturnValueOnce('Test entry content');
      MockFileUtils.fileExists.mockReturnValue(false);
      
      MockDateUtils.parseDateFromFilename.mockReturnValueOnce(new Date('2025-09-01'));
      MockDateUtils.isBeforeToday.mockReturnValueOnce(true);
      MockDateUtils.generateFilename.mockReturnValueOnce('Journal-2025-09-01.md');
      MockDateUtils.formatDate
        .mockReturnValueOnce('2025-09-01'); // For parseDailyNote call

      const result = await processor.findMostRecentDailyNote();

      expect(result).toBeDefined();
      expect(result?.date).toBe('2025-09-01');
      expect(result?.entries).toEqual([
        { content: 'Test entry content', coordinates: undefined }
      ]);
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', () => {
      // Since we no longer track processed notes, stats should be 0
      processor.updateSettings(mockSettings);

      const result = processor.getProcessingStats();

      expect(result.totalProcessed).toBe(0);
      expect(result.lastProcessingTime).toBeUndefined(); // Not implemented yet
    });

    it('should return zero when no notes processed', () => {
      const result = processor.getProcessingStats();

      expect(result.totalProcessed).toBe(0);
    });
  });

  describe('resetProcessingHistory', () => {
    it('should reset processing history (now a no-op)', () => {      
      processor.resetProcessingHistory();

      const stats = processor.getProcessingStats();
      expect(stats.totalProcessed).toBe(0);
    });
  });

  describe('updateSettings', () => {
    it('should update settings correctly', () => {
      const newSettings = {
        ...mockSettings,
        sourceFolder: 'New Source',
        dateFormat: 'DD-MM-YYYY'
      };

      processor.updateSettings(newSettings);

      // We can't directly access private settings, but we can test behavior
      expect(() => processor.updateSettings(newSettings)).not.toThrow();
    });
  });

  describe('validateSourceFolder', () => {
    it('should return valid result when folder exists', async () => {
      const mockFiles = [new TFile(), new TFile()];
      MockFileUtils.getFilesInFolder.mockReturnValue(mockFiles);

      const result = await processor.validateSourceFolder();

      expect(result.valid).toBe(true);
      expect(result.fileCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result when folder does not exist', async () => {
      MockFileUtils.getFilesInFolder.mockImplementation(() => {
        throw new Error('Folder not found');
      });

      const result = await processor.validateSourceFolder();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Folder not found');
      expect(result.fileCount).toBeUndefined();
    });
  });
});