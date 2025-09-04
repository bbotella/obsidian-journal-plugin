# Changelog

All notable changes to the Daily Notes to Journal plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-XX

### Added
- Initial release of Daily Notes to Journal plugin
- AI-powered transformation of daily note logs into journal entries
- Support for multiple AI providers with **dynamic model fetching**:
  - OpenAI (automatically detects available GPT models from your account)
  - Google Gemini (fetches latest Gemini models from Google's API)
  - Ollama (live detection of locally installed models)
- **Real-time model refresh** with 🔄 button for instant updates
- **Smart model filtering** to show only relevant models for each provider
- Automatic coordinate extraction and formatting
- Configurable source and destination folders with **folder autocompletion**
- **Interactive folder browser** with search and file count display
- **Real-time folder validation** with visual feedback
- Customizable date formats and filename templates
- Automated periodic processing with configurable frequency
- Custom AI prompts for personalized output
- Multi-language support with auto-detection
- Comprehensive settings UI with validation
- Manual processing commands
- Processing status and statistics
- Debug logging and error handling
- Backup creation for existing journal entries

### Features
- **Smart Processing**: Only processes daily notes from the past
- **Duplicate Prevention**: Tracks processed notes to avoid reprocessing
- **Location Handling**: Extracts coordinates in multiple formats
- **Flexible Configuration**: Extensive customization options
- **Privacy Options**: Local processing with Ollama for complete privacy
- **Robust Error Handling**: Graceful degradation and detailed error reporting
- **Performance Optimized**: Background processing with minimal UI impact

### Commands Added
- `Process daily notes now`: Manual processing trigger
- `Test AI connection`: Verify AI configuration
- `Show processing status`: Display current status and statistics
- `Reset processing history`: Clear processed notes history
- `Validate configuration`: Check all settings for errors

### Configuration Options
- Source folder for daily notes
- Date format for parsing filenames
- Destination folder for journal entries
- Journal filename format template
- AI provider selection and configuration
- Output language preference
- Processing frequency (5 minutes to 24 hours)
- Custom AI prompt template
- Debug logging controls