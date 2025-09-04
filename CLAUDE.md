# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build (TypeScript check + esbuild)
npm run build

# Run all tests
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/noteProcessor.test.ts

# Version management (updates manifest.json and versions.json)
npm run version
```

### Obsidian Plugin Development
```bash
# Copy built files to test vault (manual step)
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/obsidian-journal-plugin/

# Enable debug logging in Obsidian console
app.plugins.plugins['obsidian-journal-plugin'].enableDebugLogging();
```

## Architecture Overview

### Core Plugin Flow
The plugin transforms daily notes into AI-generated journal entries with sentiment analysis and location extraction. It uses a **dynamic processing system** - no state tracking, simply checks if journal files exist.

**Processing Pipeline:**
1. **Scheduler** → triggers periodic processing
2. **NoteProcessor** → finds daily notes without corresponding journal entries
3. **AIService** → transforms content + extracts sentiment
4. **JournalManager** → creates journal files with YAML frontmatter

### Service Layer Architecture

**Main Plugin (`src/main.ts`)**
- Entry point that initializes all services
- Manages plugin lifecycle and Obsidian API integration
- Handles command registration and settings tab

**Core Services:**
- **NoteProcessor** (`services/noteProcessor.ts`) - Core business logic for finding and processing daily notes
- **JournalManager** (`services/journalManager.ts`) - Handles journal file creation and YAML frontmatter
- **Scheduler** (`services/scheduler.ts`) - Manages background processing intervals
- **AIService** family (`services/ai/`) - Pluggable AI provider system

### AI Provider System
**Factory Pattern Implementation:**
- `AIServiceFactory` - Creates appropriate AI service based on settings
- `AIService` (abstract base) - Defines common interface and sentiment parsing
- Provider implementations: `OpenAIService`, `GeminiService`, `OllamaService`

**Key AI Features:**
- **Dynamic Model Loading** - Fetches available models from each provider's API
- **Sentiment Parsing** - Extracts sentiment from AI response using regex patterns
- **Response Format** - Returns `{content: string, sentiment?: Sentiment}` objects

### Dynamic Processing System
**No State Management:**
- Replaced complex hash-based tracking with simple file existence checks
- `journalEntryExists(date)` determines if processing is needed
- Self-healing: delete journal files to reprocess
- Flexible reprocessing without state corruption

### Data Flow Architecture

**Settings Management:**
- `JournalPluginSettings` interface defines all configuration options
- Settings persist in Obsidian's plugin data system
- `SettingsTab` provides UI with folder browser and model selection

**Content Processing:**
1. Parse daily note dates from filenames using configurable `dateFormat`
2. Extract coordinates using `CoordinateParser` (supports multiple formats)
3. Transform content through AI service with custom prompts
4. Generate journal entries with YAML frontmatter including sentiment and locations

### Testing Architecture
**Comprehensive Test Suite (154 tests):**
- Jest with jsdom environment for Obsidian API mocking
- Mock implementations in `tests/__mocks__/obsidian.ts`
- Coverage reporting configured for all source files
- Service-level unit tests with dependency injection

### Key Integration Points

**Obsidian API Usage:**
- `TFile` and `TFolder` for vault file system operations
- `Plugin` base class for lifecycle management
- Settings API for configuration persistence
- Command registration for user interactions

**File System Patterns:**
- Date-based filename parsing with moment.js
- YAML frontmatter manipulation for metadata
- Folder validation with automatic creation
- Coordinate extraction from multiple text formats

**Error Handling:**
- Centralized logging through `logger` utility
- Graceful AI service failures with fallback responses
- Comprehensive input validation for file operations
- Debug mode support for troubleshooting

## Important Implementation Details

### Sentiment Analysis Integration
The AI prompt includes specific instructions to output sentiment analysis. The `parseSentimentFromResponse()` method extracts sentiment from the last line of AI responses using the format `SENTIMENT: [emotion]`.

### Coordinate Extraction
`CoordinateParser` supports various formats: `[lat, lng]`, `(lat, lng)`, `GPS: lat, lng`, etc. Coordinates are stored as strings in YAML frontmatter arrays.

### Processing Logic
Only processes daily notes from past dates (excludes today) and skips notes that already have corresponding journal entries. This prevents duplicate processing and allows for easy reprocessing by deleting journal files.

### AI Provider Configuration
Each AI service implements dynamic model loading - fetching available models from the provider's API rather than hardcoding model lists. This ensures compatibility with new models without code updates.