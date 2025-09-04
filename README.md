# Daily Notes to Journal - Obsidian Plugin

Transform your raw daily note logs into well-written, engaging journal entries using AI. This plugin automatically processes daily notes from the past and creates beautiful journal entries with location data, all while maintaining your personal voice and style.

## Personal Workflow: Voice-to-Journal Pipeline

This plugin was designed around a simple but powerful workflow that transforms casual voice memos into meaningful journal entries:

### 📱 **Capture Throughout the Day**
- Use voice dictation to quickly log moments, thoughts, and experiences
- No need to worry about perfect writing - just capture the essence
- Log entries accumulate naturally in your daily notes as raw, authentic thoughts

### 🎤 **iOS Shortcut Integration**
For seamless voice capture on iOS, you can use this [iOS Shortcut](https://www.icloud.com/shortcuts/f54bdadc71034e08aca3207349a0b624) that:
- Triggers with a simple action button press
- Uses Whispr Flow for enhanced dictation (easily replaceable with built-in iOS dictation)
- Automatically appends entries to your daily note in Obsidian
- Works with any speech-to-text service or manual typing

### 🌙 **End-of-Day Transformation**
When the day ends, the plugin automatically:
- Finds your raw log entries from throughout the day
- Uses AI to transform them into a cohesive, well-written journal entry
- Preserves the emotional context and chronological flow
- Adds sentiment analysis and location data
- Creates a beautiful journal entry you'll want to read years from now

### 💫 **The Result**
Raw voice memos like *"Had coffee, feeling good about the presentation"* become elegant prose that captures not just what happened, but how it felt and why it mattered.

## Features

### 🤖 AI-Powered Transformation
- Converts raw log entries into candid, engaging journal entries
- **Sentiment Analysis**: Automatically analyzes the emotional tone of your day (Very Happy, Happy, Neutral, Sad, Very Sad)
- Maintains your personal voice and writing style
- Preserves chronological flow and emotional context
- Supports multiple AI providers: OpenAI, Google Gemini, and local Ollama

### 📍 Location Handling
- Automatically extracts coordinates from daily notes
- Supports multiple coordinate formats: `[lat, lng]`, `(lat, lng)`, GPS coordinates
- Adds location metadata to journal entries in YAML frontmatter

### ⚙️ Flexible Configuration
- Customizable source and destination folders
- Configurable date formats for daily notes
- Dynamic journal filename templates
- Adjustable processing frequency
- Custom AI prompts for personalized output

### 🔄 Smart Processing
- **Dynamic Processing**: Automatically identifies notes that need processing based on journal file existence
- **Self-Healing**: No complex state management - simply delete journal files to reprocess
- Periodic checks for new daily notes from the past
- Background processing without interrupting your workflow
- Manual processing triggers for immediate results
- **Flexible Reprocessing**: Easy control over what gets reprocessed

### 🌍 Multi-language Support
- Auto-detects language from source notes
- Supports output in multiple languages
- Preserves original language unless specified otherwise

## Installation

### From Obsidian Community Plugins (Recommended)
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "Daily Notes to Journal"
4. Click Install and Enable

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to `{VaultFolder}/.obsidian/plugins/obsidian-journal-plugin/`
3. Reload Obsidian
4. Enable the plugin in Community Plugins settings

### Development Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder

## Setup and Configuration

### 1. Basic Settings

**Source Folder**: Folder containing your daily notes (default: "Daily Notes")
- Type the folder path manually or click the 📁 button to browse existing folders
- Shows validation with file count for existing folders
- Warns if folder doesn't exist (will be created automatically)

**Date Format**: Format used in daily note filenames (default: "YYYY-MM-DD")
**Journal Folder**: Destination folder for journal entries (default: "Journal")
- Includes the same folder browser as Source Folder
- Validates folder existence and shows creation notice

**Journal Filename**: Template for journal filenames (default: "Journal-YYYY-MM-DD.md")

### 2. AI Configuration

Choose your preferred AI provider:

#### OpenAI
- Requires API key from [OpenAI Platform](https://platform.openai.com/)
- **Dynamic Model Loading**: Automatically fetches your available GPT models
- Click the 🔄 button to refresh the model list
- Filters to show only relevant GPT models (excludes instruct/edit variants)

#### Google Gemini
- Requires API key from [Google AI Studio](https://makersuite.google.com/)
- **Dynamic Model Loading**: Fetches available Gemini models from Google's API
- Updates automatically when you enter a valid API key
- Shows latest Gemini Pro and Flash models

#### Ollama (Local)
- Requires [Ollama](https://ollama.ai/) running locally
- **Live Model Detection**: Shows all models installed on your Ollama server
- Refreshes automatically when endpoint is configured
- Perfect for privacy-focused users

### 3. Custom Prompt

Customize the AI prompt to match your preferred writing style:

```
Transform these raw daily log entries into a well-written, engaging journal entry.

Guidelines:
- Write in a candid, personal style with storytelling elements
- Maintain chronological flow of the day's events
- Include emotional context and personal reflections
- Preserve the original language and tone
- Create engaging prose that captures the day's essence
- Keep the same perspective (first person)
- Make it feel authentic and re-readable in the future

Raw entries:
{content}

Create a journal entry that brings these moments to life while staying true to the original experiences and emotions.
```

## Usage

### Daily Note Format

Your daily notes should contain log entries in a simple format:
```markdown
# 2024-01-15

- Had coffee at the local café [40.7128, -74.0060]
- Worked on the presentation for tomorrow's meeting
- Took a walk in Central Park, beautiful weather
- Dinner with Sarah at that new Italian place (43.6532, -79.3832)
- Feeling anxious about the presentation but excited too
```

### Output Format

The plugin will create journal entries like:
```markdown
---
date: 2024-01-15
source: Daily Notes/2024-01-15.md
created: 2024-01-16T10:30:00.000Z
sentiment: Happy
locations:
  - "[40.7128, -74.0060]"
  - "[43.6532, -79.3832]"
---

# January 15th, 2024

The day began with the familiar comfort of my local café, where I savored my morning coffee while watching the city wake up around me. The aroma and warmth provided the perfect backdrop for mentally preparing for what lay ahead.

Back at my desk, I dove deep into finalizing the presentation for tomorrow's meeting. The hours seemed to slip by as I refined each slide, balancing thoroughness with clarity. Despite my focus, I could feel a subtle undercurrent of nervous energy building.

When I needed a break, Central Park called to me. The weather was absolutely beautiful – one of those perfect days that reminds you why you love this city. The fresh air and gentle movement helped clear my mind and reset my perspective.

Evening brought a delightful dinner with Sarah at that new Italian place we'd been wanting to try. The food was exceptional, and our conversation flowed as easily as the wine. It was exactly the kind of evening that makes you appreciate good food and even better company.

As the day winds down, I find myself in that familiar space of mixed emotions – anxious about tomorrow's presentation but genuinely excited about the opportunity to share what I've been working on. Sometimes the best moments come from embracing both the nerves and the anticipation.
```

### Commands

The plugin adds several commands to Obsidian:

- **Process daily notes now**: Manually trigger processing
- **Process latest note (test)**: Process the most recent daily note for testing
- **Test AI connection**: Verify your AI configuration
- **Show processing status**: Display current processing status
- **Reset processing history (no-op)**: Informational - processing is now dynamic
- **Validate configuration**: Check all settings

## Coordinate Formats

The plugin recognizes various coordinate formats:

- `[40.7128, -74.0060]` - Bracket format
- `(40.7128, -74.0060)` - Parentheses format
- `40.7128, -74.0060` - Simple comma-separated
- `40.7128°N, 74.0060°W` - Degrees with direction
- `GPS: 40.7128, -74.0060` - GPS prefix
- `Location: 40.7128, -74.0060` - Location prefix

## Privacy and Security

### Data Handling
- **OpenAI/Gemini**: Content is sent to external APIs for processing
- **Ollama**: All processing happens locally on your machine
- **API Keys**: Stored securely in Obsidian's settings
- **Logs**: No sensitive data is logged

### Security Features
- Input validation and sanitization
- Secure API key storage in Obsidian's vault settings
- No sensitive data in logs or debug output
- Optional local processing with Ollama
- Plugin settings (including API keys) excluded from git tracking

## Troubleshooting

### Common Issues

**No notes are being processed**
- Check that source folder exists and contains markdown files
- Verify date format matches your daily note filenames
- Ensure notes are from past dates (plugin only processes old notes)

**AI processing fails**
- Verify API key is correct and has sufficient credits
- Test connection using the "Test AI connection" command
- Check network connectivity for cloud providers

**Ollama connection issues**
- Ensure Ollama is running (`ollama serve`)
- Verify endpoint URL (default: `http://localhost:11434`)
- Check that the specified model is installed (`ollama pull model-name`)

**Permission errors**
- Ensure Obsidian has write permissions to destination folder
- Check that destination folder path is valid

### Debug Mode

Enable debug logging through the developer console:
```javascript
app.plugins.plugins['obsidian-journal-plugin'].enableDebugLogging();
```

## Development

### Building the Plugin

```bash
# Install dependencies
npm install

# Build for development (with source maps)
npm run dev

# Build for production
npm run build

# Version bump (updates manifest.json and versions.json)
npm run version
```

### Architecture

The plugin follows a modular architecture:

- **Services**: Core business logic (AI processing, file handling, scheduling)
- **Models**: Type definitions and data structures
- **Utils**: Helper functions (date parsing, coordinate extraction, logging)
- **Settings**: Configuration management and UI

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: Report bugs and request features
- Documentation: Check the wiki for detailed guides
- Community: Join discussions in the Obsidian Discord

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

## Support the Project

If you find this plugin helpful, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/contactonu)

Your support helps maintain and improve this plugin. Thank you! 🙏