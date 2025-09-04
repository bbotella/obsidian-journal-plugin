import { FileUtils } from '../src/utils/fileUtils';
import { TFile } from 'obsidian';

// Mock Obsidian App and related classes
const mockApp = {
  vault: {
    getAbstractFileByPath: jest.fn(),
    createFolder: jest.fn(),
    create: jest.fn(),
    read: jest.fn(),
    modify: jest.fn()
  }
};

describe('FileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'This is test content for hashing.';
      const hash1 = FileUtils.generateContentHash(content);
      const hash2 = FileUtils.generateContentHash(content);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'Content one';
      const content2 = 'Content two';
      
      const hash1 = FileUtils.generateContentHash(content1);
      const hash2 = FileUtils.generateContentHash(content2);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(32);
      expect(hash2).toHaveLength(32);
    });

    it('should handle empty content', () => {
      const hash = FileUtils.generateContentHash('');
      expect(hash).toHaveLength(32);
      expect(typeof hash).toBe('string');
    });

    it('should handle unicode content', () => {
      const content = 'Content with émojis 🎉 and spëcial chars: áéíóú';
      const hash = FileUtils.generateContentHash(content);
      
      expect(hash).toHaveLength(32);
      expect(typeof hash).toBe('string');
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
title: Test Note
date: 2025-09-02
tags: daily, journal
---

This is the content of the note.`;

      const result = FileUtils.parseFrontmatter(content);
      
      expect(result.frontmatter.title).toBe('Test Note');
      expect(result.frontmatter.date).toBe('2025-09-02');
      expect(result.body).toBe('This is the content of the note.');
    });

    it('should handle content without frontmatter', () => {
      const content = 'This is just regular content without frontmatter.';
      const result = FileUtils.parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

Content after empty frontmatter.`;

      const result = FileUtils.parseFrontmatter(content);
      
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content); // No match, so returns original content
    });

    it('should handle malformed frontmatter gracefully', () => {
      const content = `---
title: Test
invalid yaml: [ broken
---

Content should still be extracted.`;

      const result = FileUtils.parseFrontmatter(content);
      
      // The simple YAML parser can handle some malformed YAML
      expect(result.frontmatter).toEqual({
        'title': 'Test',
        'invalid yaml': '[ broken'
      });
      expect(result.body).toBe('Content should still be extracted.');
    });
  });

  describe('addFrontmatter', () => {
    it('should add frontmatter to content', () => {
      const content = 'This is the main content.';
      const frontmatter = {
        title: 'Test',
        date: '2025-09-02'
      };

      const result = FileUtils.addFrontmatter(content, frontmatter);
      
      expect(result).toContain('---');
      expect(result).toContain('title: "Test"');
      expect(result).toContain('date: "2025-09-02"');
      expect(result).toContain('This is the main content.');
    });

    it('should handle empty frontmatter', () => {
      const content = 'Just content.';
      const result = FileUtils.addFrontmatter(content, {});
      
      expect(result).toBe(content);
    });

    it('should format frontmatter correctly', () => {
      const content = 'Content here.';
      const frontmatter = {
        title: 'My Title',
        published: true,
        count: 42
      };

      const result = FileUtils.addFrontmatter(content, frontmatter);
      
      expect(result).toMatch(/^---\n[\s\S]*\n---\n\nContent here\.$/);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      const mockTFile = new TFile();
      mockTFile.name = 'test.md';
      mockTFile.path = 'test.md';
      mockApp.vault.getAbstractFileByPath.mockReturnValue(mockTFile);
      
      const result = FileUtils.fileExists(mockApp as any, 'test.md');
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
      
      const result = FileUtils.fileExists(mockApp as any, 'nonexistent.md');
      expect(result).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complete frontmatter workflow', () => {
      const originalContent = `---
title: Daily Log
date: 2025-09-02
mood: good
---

Today was a good day.`;

      // Parse frontmatter
      const parsed = FileUtils.parseFrontmatter(originalContent);
      expect(parsed.frontmatter.title).toBe('Daily Log');
      expect(parsed.body).toContain('Today was a good day.');

      // Modify frontmatter
      const modifiedFrontmatter = {
        ...parsed.frontmatter,
        processed: true,
        hash: 'abc123'
      };

      // Add back to content
      const newContent = FileUtils.addFrontmatter(parsed.body.trim(), modifiedFrontmatter);
      expect(newContent).toContain('processed: true');
      expect(newContent).toContain('hash: "abc123"');
      expect(newContent).toContain('Today was a good day.');
    });

    it('should maintain data integrity with hash generation', () => {
      const content1 = 'Test content for hashing';
      const content2 = 'Different test content';
      
      const hash1 = FileUtils.generateContentHash(content1);
      const hash2 = FileUtils.generateContentHash(content2);
      const hash1Again = FileUtils.generateContentHash(content1);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(hash1Again);
      
      // Verify consistency across operations
      const frontmatter = { hash: hash1, content: content1 };
      const withFrontmatter = FileUtils.addFrontmatter(content1, frontmatter);
      const parsed = FileUtils.parseFrontmatter(withFrontmatter);
      
      expect(parsed.frontmatter.hash).toBe(hash1);
      expect(parsed.body.trim()).toBe(content1);
    });
  });
});