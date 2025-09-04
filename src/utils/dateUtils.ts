import { moment } from 'obsidian';

export class DateUtils {
  /**
   * Parse date from filename using the specified format
   */
  static parseDateFromFilename(filename: string, format: string): Date | null {
    try {
      // Remove file extension
      const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
      
      // Use moment to parse the date
      const parsedDate = moment(nameWithoutExtension, format);
      
      if (parsedDate.isValid()) {
        return parsedDate.toDate();
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date from filename:', error);
      return null;
    }
  }

  /**
   * Format date using the specified format
   */
  static formatDate(date: Date, format: string): string {
    return moment(date).format(format);
  }

  /**
   * Check if a date is before today
   */
  static isBeforeToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate < today;
  }

  /**
   * Generate filename from date and format template
   */
  static generateFilename(date: Date, template: string): string {
    // Simple and reliable approach: manually replace the common date format tokens
    let result = template;
    
    // Get date components directly from Date object to avoid moment.js interpretation issues
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // Month and day names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Replace date format tokens with actual values
    const replacements: Record<string, string> = {
      'YYYY': year.toString(),
      'YY': year.toString().slice(-2),
      'MMMM': monthNames[month - 1],
      'MMM': monthNamesShort[month - 1],
      'MM': month.toString().padStart(2, '0'),
      'DD': day.toString().padStart(2, '0'),
      'HH': hours.toString().padStart(2, '0'),
      'hh': (hours % 12 || 12).toString().padStart(2, '0'),
      'mm': minutes.toString().padStart(2, '0'),
      'ss': seconds.toString().padStart(2, '0'),
      'dddd': dayNames[date.getDay()],
      'ddd': dayNamesShort[date.getDay()],
      // Only include single letter tokens that are unlikely to appear in literal text
      'M': month.toString(),
      'D': day.toString(),
      'H': hours.toString(),
      'h': (hours % 12 || 12).toString()
      // Removed 'A', 'a' tokens as they conflict with literal text like "Journal" and "amazing"
    };
    
    // Sort by length (longest first) to avoid partial replacements
    const sortedTokens = Object.keys(replacements).sort((a, b) => b.length - a.length);
    
    for (const token of sortedTokens) {
      result = result.replace(new RegExp(token, 'g'), replacements[token]);
    }
    
    // Sanitize the filename to remove invalid characters
    result = this.sanitizeFilename(result);
    
    return result;
  }

  /**
   * Sanitize filename to ensure it's valid for the file system
   */
  static sanitizeFilename(filename: string): string {
    // Replace invalid characters with safe alternatives
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/^\.+/, '')            // Remove leading dots
      .replace(/\.+$/, '.md')         // Ensure proper extension
      .trim();
  }

  /**
   * Extract date formats from common patterns
   */
  static inferDateFormat(filename: string): string | null {
    const commonFormats = [
      'YYYY-MM-DD',
      'YYYY_MM_DD',
      'DD-MM-YYYY',
      'MM-DD-YYYY',
      'YYYYMMDD',
      'DD.MM.YYYY',
      'MM.DD.YYYY'
    ];

    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
    
    for (const format of commonFormats) {
      const parsed = moment(nameWithoutExtension, format);
      if (parsed.isValid()) {
        return format;
      }
    }
    
    return null;
  }
}