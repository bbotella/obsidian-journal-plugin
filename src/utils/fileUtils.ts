import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { createHash } from 'crypto';

export class FileUtils {
  
  /**
   * Get or create a folder
   */
  static async ensureFolder(app: App, folderPath: string): Promise<TFolder> {
    const normalizedPath = normalizePath(folderPath);
    
    let folder = app.vault.getAbstractFileByPath(normalizedPath);
    
    if (!folder) {
      await app.vault.createFolder(normalizedPath);
      folder = app.vault.getAbstractFileByPath(normalizedPath);
    }
    
    if (!(folder instanceof TFolder)) {
      throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
    }
    
    return folder;
  }

  /**
   * Get all files in a folder with optional extension filter
   */
  static getFilesInFolder(app: App, folderPath: string, extension?: string): TFile[] {
    const normalizedPath = normalizePath(folderPath);
    const folder = app.vault.getAbstractFileByPath(normalizedPath);
    
    if (!(folder instanceof TFolder)) {
      return [];
    }
    
    const files: TFile[] = [];
    
    const collectFiles = (currentFolder: TFolder) => {
      for (const child of currentFolder.children) {
        if (child instanceof TFile) {
          if (!extension || child.extension === extension) {
            files.push(child);
          }
        } else if (child instanceof TFolder) {
          collectFiles(child);
        }
      }
    };
    
    collectFiles(folder);
    return files;
  }

  /**
   * Check if a file exists
   */
  static fileExists(app: App, filePath: string): boolean {
    const normalizedPath = normalizePath(filePath);
    const file = app.vault.getAbstractFileByPath(normalizedPath);
    return file instanceof TFile;
  }

  /**
   * Create a file with content
   */
  static async createFile(app: App, filePath: string, content: string): Promise<TFile> {
    const normalizedPath = normalizePath(filePath);
    
    // Ensure parent folder exists
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (parentPath) {
      await this.ensureFolder(app, parentPath);
    }
    
    return await app.vault.create(normalizedPath, content);
  }

  /**
   * Read file content
   */
  static async readFile(app: App, file: TFile): Promise<string> {
    return await app.vault.read(file);
  }

  /**
   * Update file content
   */
  static async updateFile(app: App, file: TFile, content: string): Promise<void> {
    await app.vault.modify(file, content);
  }

  /**
   * Generate a hash for content to detect changes
   */
  static generateContentHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Parse frontmatter from markdown content
   */
  static parseFrontmatter(content: string): { frontmatter: Record<string, any>, body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { frontmatter: {}, body: content };
    }
    
    try {
      const frontmatter = this.parseYaml(match[1]);
      return { frontmatter, body: match[2] };
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return { frontmatter: {}, body: content };
    }
  }

  /**
   * Add frontmatter to content
   */
  static addFrontmatter(content: string, frontmatter: Record<string, any>): string {
    if (Object.keys(frontmatter).length === 0) {
      return content;
    }
    
    const yamlString = this.stringifyYaml(frontmatter);
    return `---\n${yamlString}\n---\n\n${content}`;
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private static parseYaml(yamlString: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yamlString.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      // Simple value parsing
      if (value.startsWith('"') && value.endsWith('"')) {
        result[key] = value.slice(1, -1);
      } else if (value === 'true') {
        result[key] = true;
      } else if (value === 'false') {
        result[key] = false;
      } else if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Simple YAML stringifier for frontmatter
   */
  private static stringifyYaml(obj: Record<string, any>): string {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${typeof item === 'string' ? `"${item}"` : item}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Sanitize filename to ensure it's valid for the file system
   */
  static sanitizeFilename(filename: string): string {
    // Replace invalid characters with underscores
    return filename.replace(/[<>:"/\\|?*]/g, '_');
  }
}