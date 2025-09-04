import { Coordinate } from '../models/types';

export class CoordinateParser {
  // Common coordinate patterns
  private static readonly COORDINATE_PATTERNS = [
    // [lat, lng] format
    /\[(-?\d+\.?\d*),\s*(-?\d+\.?\d*)\]/g,
    // (lat, lng) format
    /\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/g,
    // lat, lng format
    /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/g,
    // Decimal degrees with direction
    /(\d+\.?\d*)[°]?\s*([NS])\s*,?\s*(\d+\.?\d*)[°]?\s*([EW])/gi,
    // GPS coordinates
    /GPS:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/gi,
    // Location: format
    /Location:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/gi
  ];

  /**
   * Extract all coordinates from text content
   */
  static extractCoordinates(content: string): Coordinate[] {
    const coordinates: Coordinate[] = [];
    const processedRaws = new Set<string>();

    for (const pattern of this.COORDINATE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const raw = match[0];
        
        // Skip if we've already processed this exact coordinate string
        if (processedRaws.has(raw)) {
          continue;
        }
        
        processedRaws.add(raw);
        
        let lat: number, lng: number;
        
        if (match.length === 3) {
          // Simple lat, lng format
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        } else if (match.length === 5) {
          // Direction-based format
          lat = parseFloat(match[1]);
          lng = parseFloat(match[3]);
          
          // Apply direction
          if (match[2].toUpperCase() === 'S') lat = -lat;
          if (match[4].toUpperCase() === 'W') lng = -lng;
        } else {
          continue;
        }
        
        // Validate coordinate ranges
        if (this.isValidCoordinate(lat, lng)) {
          coordinates.push({
            lat,
            lng,
            raw
          });
        }
      }
    }

    return coordinates;
  }

  /**
   * Remove coordinate strings from content
   */
  static removeCoordinatesFromContent(content: string): string {
    let cleanContent = content;
    
    for (const pattern of this.COORDINATE_PATTERNS) {
      cleanContent = cleanContent.replace(pattern, '').trim();
    }
    
    // Clean up multiple spaces and empty lines
    cleanContent = cleanContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return cleanContent;
  }

  /**
   * Validate if coordinates are within valid ranges
   */
  private static isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Format coordinates for YAML frontmatter
   */
  static formatCoordinatesForYaml(coordinates: Coordinate[]): string {
    if (coordinates.length === 0) {
      return '';
    }

    const locationStrings = coordinates.map(coord => `"[${coord.lat}, ${coord.lng}]"`);
    
    if (locationStrings.length === 1) {
      return `location: ${locationStrings[0]}`;
    } else {
      return `locations:\n${locationStrings.map(loc => `  - ${loc}`).join('\n')}`;
    }
  }

  /**
   * Convert coordinates to a readable format
   */
  static coordinatesToReadableFormat(coordinate: Coordinate): string {
    const latDir = coordinate.lat >= 0 ? 'N' : 'S';
    const lngDir = coordinate.lng >= 0 ? 'E' : 'W';
    
    return `${Math.abs(coordinate.lat)}°${latDir}, ${Math.abs(coordinate.lng)}°${lngDir}`;
  }
}